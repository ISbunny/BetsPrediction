import numpy as np
import pandas as pd

def generate_synthetic(n_matches=5000, seed=42):
    np.random.seed(seed)
    rows = []
    for i in range(n_matches):
        teamA_rating = np.random.normal(1500, 100)
        teamB_rating = np.random.normal(1500, 100)
        rating_diff = teamA_rating - teamB_rating
        # Venue advantage for each team
        venue_adv_team1 = np.random.choice([0, 25], p=[0.7, 0.3])
        venue_adv_team2 = np.random.choice([0, 25], p=[0.7, 0.3])
        net_venue_adv = venue_adv_team1 - venue_adv_team2
        # Toss winner
        toss_winner_team1 = np.random.choice([0, 1], p=[0.5, 0.5])
        toss_winner_team2 = 1 - toss_winner_team1
        # Overs (simulate T20, ODI, Test)
        overs = np.random.choice([20.0, 50.0, 90.0], p=[0.5, 0.4, 0.1])
        # True probability with all effects
        total_effect = rating_diff + net_venue_adv + (toss_winner_team1 - toss_winner_team2) * 10 + (overs - 20) * 0.5
        true_prob = 1 / (1 + 10 ** (-total_effect / 400))
        result = np.random.binomial(1, true_prob)
        rows.append({
            'teamA_rating': teamA_rating,
            'teamB_rating': teamB_rating,
            'rating_diff': rating_diff,
            'venue_adv_team1': venue_adv_team1,
            'venue_adv_team2': venue_adv_team2,
            'net_venue_adv': net_venue_adv,
            'toss_winner_team1': toss_winner_team1,
            'toss_winner_team2': toss_winner_team2,
            'overs': overs,
            'true_prob': true_prob,
            'target': result
        })
    df = pd.DataFrame(rows)
    return df

if __name__ == '__main__':
    df = generate_synthetic(5000)
    df.to_csv('models/synthetic_matches.csv', index=False)
    print('Saved synthetic matches')
