import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss, roc_auc_score, brier_score_loss
import lightgbm as lgb
from data_gen import generate_synthetic

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

def prepare_features(df):
    df = df.copy()
    # Add normalized rating diff if not present
    if 'rating_diff_norm' not in df.columns:
        df['rating_diff_norm'] = df['rating_diff'] / 400.0
    # Fill missing columns with 0 if not present
    squad_cols = [
        'team1_num_batsmen', 'team1_num_allrounders', 'team1_num_bowlers', 'team1_num_wicketkeepers', 'team1_has_captain', 'team1_squad_size',
        'team2_num_batsmen', 'team2_num_allrounders', 'team2_num_bowlers', 'team2_num_wicketkeepers', 'team2_has_captain', 'team2_squad_size'
    ]
    base_cols = [
        'teamA_rating', 'teamB_rating', 'rating_diff', 'rating_diff_norm',
        'venue_adv_team1', 'venue_adv_team2', 'net_venue_adv',
        'toss_winner_team1', 'toss_winner_team2', 'overs'
    ]
    for col in base_cols + squad_cols:
        if col not in df.columns:
            df[col] = 0
    X = df[base_cols + squad_cols].fillna(0)
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

    joblib.dump({'models': models, 'platt': lr, 'feature_columns': list(X.columns)}, f"{MODEL_DIR}/gbt_ensemble.pkl")
    print(f"Saved model to {MODEL_DIR}/gbt_ensemble.pkl")

if __name__ == "__main__":
    df = generate_synthetic(8000)
    train_and_save(df)
