import math
from cricbuzz_client import safe_get

def name_hash_rating(name):
    s = sum(ord(c) for c in name) % 300
    return 1400 + s

def prepare_features_from_match_json(match_json):
    print("[DEBUG] Full match_json received:", match_json)
    team1 = match_json.get('team1', {}).get('teamname', 'TeamA')
    team2 = match_json.get('team2', {}).get('teamname', 'TeamB')
    venue = match_json.get('venueinfo', {}).get('ground', 'Unknown')

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
    }
    print("[DEBUG] Features extracted from match_json:", features)
    return features
