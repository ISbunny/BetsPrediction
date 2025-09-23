import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss, roc_auc_score, brier_score_loss
import lightgbm as lgb
from data_gen import generate_synthetic
from cricbuzz_client import ScoreCard, extract_fantasy_samples

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

FEATURE_COLS = [
    'teamA_rating', 'teamB_rating', 'rating_diff', 'venue_adv_team1', 'venue_adv_team2',
    'net_venue_adv', 'toss_winner_team1', 'toss_winner_team2', 'overs',
    'team1_num_batsmen', 'team1_num_allrounders', 'team1_num_bowlers', 'team1_num_wicketkeepers',
    'team1_has_captain', 'team1_squad_size', 'team2_num_batsmen', 'team2_num_allrounders',
    'team2_num_bowlers', 'team2_num_wicketkeepers', 'team2_has_captain', 'team2_squad_size',
    'team1_venue_winrate', 'team2_venue_winrate', 'venue_winrate_diff'
]

def prepare_features(df):
    df = df.copy()
    # Add normalized rating diff if not present
    if 'rating_diff_norm' not in df.columns:
        df['rating_diff_norm'] = df['rating_diff'] / 400.0
    # Fill missing columns with 0 if not present
    for col in FEATURE_COLS + ['rating_diff_norm']:
        if col not in df.columns:
            df[col] = 0
    X = df[FEATURE_COLS + ['rating_diff_norm']].fillna(0)
    y = df['target']
    print("[DEBUG] Training features sample:")
    print(X.head())
    print("[DEBUG] Training targets sample:")
    print(y.head())
    return X, y

def train_and_save(df):
    X, y = prepare_features(df)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    params = dict(objective='binary', metric='binary_logloss',
        learning_rate=0.05, num_leaves=64, max_depth=7,
        min_data_in_leaf=40, feature_fraction=0.8, bagging_fraction=0.8,
        bagging_freq=5, seed=42, n_jobs=-1)

    oof = np.zeros(len(X))
    models = []
    for fold, (tr_idx, val_idx) in enumerate(skf.split(X, y)):
        X_tr, X_val = X.iloc[tr_idx], X.iloc[val_idx]
        y_tr, y_val = y.iloc[tr_idx], y.iloc[val_idx]
        dtrain = lgb.Dataset(X_tr, label=y_tr)
        dval = lgb.Dataset(X_val, label=y_val, reference=dtrain)
        bst = lgb.train(
            params, dtrain, num_boost_round=1000, valid_sets=[dtrain, dval],
            callbacks=[lgb.early_stopping(50), lgb.log_evaluation(0)]
        )
        models.append(bst)
        preds = bst.predict(X_val, num_iteration=bst.best_iteration)
        print(f"[DEBUG] Fold {fold} validation predictions sample:")
        print(preds[:5])
        oof[val_idx] = preds

    print("OOF LogLoss:", log_loss(y, oof))
    print("OOF AUC:", roc_auc_score(y, oof))
    print("OOF Brier:", brier_score_loss(y, oof))

    lr = LogisticRegression()
    lr.fit(oof.reshape(-1,1), y)

    # Save the model and feature columns
    joblib.dump({'models': models, 'platt': lr, 'feature_columns': list(X.columns)}, f"{MODEL_DIR}/gbt_ensemble.pkl")
    print(f"Saved model to {MODEL_DIR}/gbt_ensemble.pkl")

def train_fantasy_regressor(fantasy_samples):
    df = pd.DataFrame(fantasy_samples)
    print("[DEBUG] Fantasy DataFrame columns:", df.columns.tolist())
    print("[DEBUG] Fantasy DataFrame head:\n", df.head())
    feature_columns = ['current_runs', 'current_wickets', 'current_overs', 'current_run_rate', 'phase']
    X = df[feature_columns]
    y = df['target_runs_next_N']

    model = lgb.LGBMRegressor()
    model.fit(X, y)

    joblib.dump({'model': model, 'feature_columns': feature_columns}, 'models/fantasy_regressor.pkl')
    print(f"Saved fantasy regressor model to models/fantasy_regressor.pkl")

if __name__ == "__main__":
    df = generate_synthetic(8000)
    train_and_save(df)

    # Real match IDs for training the fantasy regressor
    match_ids = [
        # Add your real match IDs here, e.g.:
        # "12345", "23456", ...
        "130102"
    ]

    fantasy_samples = []
    for match_id in match_ids:
        try:
            scorecard = ScoreCard(match_id)
            print(f"[DEBUG] Scorecard for match {match_id}:\n", scorecard)  # <-- Add this line
            samples = extract_fantasy_samples(scorecard, window=6)
            if not samples:
                print(f"[WARNING] No fantasy samples extracted for match {match_id}")
            fantasy_samples.extend(samples)
            print(f"[DEBUG] Added {len(samples)} samples from match {match_id}")
        except Exception as e:
            print(f"[ERROR] Could not process match {match_id}: {e}")

    print("[DEBUG] First fantasy sample:", fantasy_samples[0] if fantasy_samples else "No samples")

    # Now train the fantasy regressor
    train_fantasy_regressor(fantasy_samples)
