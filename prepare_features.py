import math
from cricbuzz_client import safe_get, get_playing11, get_venue_stats

def name_hash_rating(name):
    s = sum(ord(c) for c in name) % 300
    return 1400 + s

def prepare_features_from_match_json(match_json):
    print("[DEBUG] Full match_json received:", match_json)
    team1 = match_json.get('team1', {}).get('teamname', 'TeamA')
    team2 = match_json.get('team2', {}).get('teamname', 'TeamB')
    team1_id = match_json.get('team1', {}).get('teamid')
    team2_id = match_json.get('team2', {}).get('teamid')
    match_id = match_json.get('match_id') or match_json.get('matchId') or match_json.get('id') or match_json.get('matchid')

    # Try to fetch playing XI for both teams if IDs are available
    playing11_team1 = None
    playing11_team2 = None
    def extract_squad_features(playing11):
        # Returns a dict of squad-based features
        features = {
            'num_batsmen': 0,
            'num_allrounders': 0,
            'num_bowlers': 0,
            'num_wicketkeepers': 0,
            'has_captain': 0,
            'squad_size': 0
        }
        if not playing11 or 'player' not in playing11:
            return features

        # Find the "playing XI" category
        playing_xi = []
        for group in playing11['player']:
            if group.get('category', '').lower() == 'playing xi':
                playing_xi = group.get('player', [])
                break

        features['squad_size'] = len(playing_xi)
        for p in playing_xi:
            role = (p.get('role') or '').lower()
            if 'batsman' in role:
                features['num_batsmen'] += 1
            if 'allrounder' in role:  # This will match both "Batting Allrounder" and "Bowling Allrounder"
                features['num_allrounders'] += 1
            if 'bowler' in role:
                features['num_bowlers'] += 1
            if 'keeper' in role or p.get('keeper'):
                features['num_wicketkeepers'] += 1
            if p.get('captain'):
                features['has_captain'] = 1
        return features

    if match_id and team1_id:
        try:
            playing11_team1 = get_playing11(match_id, team1_id)
            print(f"[DEBUG] Playing XI for {team1} (ID {team1_id}):", playing11_team1)
        except Exception as e:
            print(f"[DEBUG] Could not fetch playing XI for {team1}: {e}")
    if match_id and team2_id:
        try:
            playing11_team2 = get_playing11(match_id, team2_id)
            # print(f"[DEBUG] Playing XI for {team2} (ID {team2_id}):", playing11_team2)
        except Exception as e:
            print(f"[DEBUG] Could not fetch playing XI for {team2}: {e}")

    # Extract squad-based features for both teams
    team1_squad_feats = extract_squad_features(playing11_team1)
    team2_squad_feats = extract_squad_features(playing11_team2)
    venueinfo = match_json.get('venueinfo') or match_json.get('venueInfo') or {}
    venue = venueinfo.get('ground', 'Unknown')
    venue_id = venueinfo.get('id', None)

    toss_status = match_json.get('tossstatus', '')
    toss_winner_team1 = 1 if team1 in toss_status else 0
    toss_winner_team2 = 1 if team2 in toss_status else 0

    # If you have overs info, extract it; otherwise, set to 0.0
    overs_val = 0.0

    team1_rating = name_hash_rating(team1)
    team2_rating = name_hash_rating(team2)
    rating_diff = team1_rating - team2_rating
    venue_adv_team1 = 25 if team1.lower() in venue.lower() else 0
    venue_adv_team2 = 25 if team2.lower() in venue.lower() else 0
    net_venue_adv = venue_adv_team1 - venue_adv_team2

    features = {
        'teamA_rating': float(team1_rating),
        'teamB_rating': float(team2_rating),
        'rating_diff': float(rating_diff),
        'venue_adv_team1': float(venue_adv_team1),
        'venue_adv_team2': float(venue_adv_team2),
        'net_venue_adv': float(net_venue_adv),
        'toss_winner_team1': toss_winner_team1,
        'toss_winner_team2': toss_winner_team2,
        'overs': overs_val,
        # Team 1 squad features
        'team1_num_batsmen': team1_squad_feats['num_batsmen'],
        'team1_num_allrounders': team1_squad_feats['num_allrounders'],
        'team1_num_bowlers': team1_squad_feats['num_bowlers'],
        'team1_num_wicketkeepers': team1_squad_feats['num_wicketkeepers'],
        'team1_has_captain': team1_squad_feats['has_captain'],
        'team1_squad_size': team1_squad_feats['squad_size'],
        # Team 2 squad features
        'team2_num_batsmen': team2_squad_feats['num_batsmen'],
        'team2_num_allrounders': team2_squad_feats['num_allrounders'],
        'team2_num_bowlers': team2_squad_feats['num_bowlers'],
        'team2_num_wicketkeepers': team2_squad_feats['num_wicketkeepers'],
        'team2_has_captain': team2_squad_feats['has_captain'],
        'team2_squad_size': team2_squad_feats['squad_size'],
    }

    # Venue record feature engineering
    features['team1_venue_winrate'] = 0.5
    features['team2_venue_winrate'] = 0.5
    features['venue_winrate_diff'] = 0.0

    if venue_id:
        try:
            venue_stats = get_venue_stats(venue_id)
            # Adjust the following lines based on the actual structure of venue_stats
            team1_name = match_json['team1']['teamname'] if isinstance(match_json['team1'], dict) else match_json['team1']
            team2_name = match_json['team2']['teamname'] if isinstance(match_json['team2'], dict) else match_json['team2']
            # Example: Suppose venue_stats['teamStats'] is a dict keyed by team name
            team1_stats = venue_stats.get('teamStats', {}).get(team1_name, {})
            team2_stats = venue_stats.get('teamStats', {}).get(team2_name, {})
            features['team1_venue_winrate'] = team1_stats.get('winRate', 0.5)
            features['team2_venue_winrate'] = team2_stats.get('winRate', 0.5)
            features['venue_winrate_diff'] = features['team1_venue_winrate'] - features['team2_venue_winrate']
        except Exception as e:
            print(f"[DEBUG] Could not fetch or parse venue stats: {e}")

    # print("[DEBUG] Features extracted from match_json:", features)
    return features
