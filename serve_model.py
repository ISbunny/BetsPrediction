
# --- Imports and setup ---
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from cricbuzz_client import get_upcoming_matches, get_match_center, get_series_info
from prepare_features import prepare_features_from_match_json
import random

load_dotenv()
print(os.getenv('RAPIDAPI_KEY'))
MODEL_PATH = os.getenv('MODEL_PATH', 'models/gbt_ensemble.pkl')
VIG = float(os.getenv('VIG', '0.05'))

app = FastAPI(title="Cricket Odds Predictor (Cricbuzz)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Model not found at {MODEL_PATH}. Run train_model.py first to create model.")

model_obj = joblib.load(MODEL_PATH)
MODELS = model_obj['models']
PLATT = model_obj['platt']
FEATURE_COLS = model_obj['feature_columns']

# --- Pydantic response model ---
class PredictResp(BaseModel):
    team1: str
    team2: str
    venue: str
    tossWinner: str = None
    model_prob: float
    fair_odds: float
    market_odds: float
    ev_for_1: float
    kelly_fraction: float
    team2_prob: Optional[float] = None
    team2_fair_odds: Optional[float] = None
    market_odds2: Optional[float] = None
    ev_for_1_2: Optional[float] = None
    kelly_fraction_2: Optional[float] = None

# --- Utility function ---
def predict_proba_from_features(features):
    X = pd.DataFrame([features])
    for c in FEATURE_COLS:
        if c not in X.columns:
            X[c] = 0.0
    X = X[FEATURE_COLS].fillna(0)
    preds = np.mean([m.predict(X, num_iteration=m.best_iteration) for m in MODELS], axis=0)
    prob = float(PLATT.predict_proba(preds.reshape(-1,1))[:,1][0])
    return prob

# --- API Endpoints ---
@app.get('/predict/{match_id}', response_model=PredictResp)
def predict(match_id: str):
    try:
        match_json = get_match_center(match_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed fetching match data: {e}")

    features = prepare_features_from_match_json(match_json)
    features['rating_diff_norm'] = features.get('rating_diff', 0.0)/400.0
    model_features = {
        'teamA_rating': features.get('teamA_rating', 1500.0),
        'teamB_rating': features.get('teamB_rating', 1500.0),
        'rating_diff': features.get('rating_diff', 0.0),
        'rating_diff_norm': features.get('rating_diff_norm', 0.0),
        'venue_adv_team1': features.get('venue_adv_team1', 0.0),
        'venue_adv_team2': features.get('venue_adv_team2', 0.0),
        'net_venue_adv': features.get('net_venue_adv', 0.0),
        'toss_winner_team1': features.get('toss_winner_team1', 0),
        'toss_winner_team2': features.get('toss_winner_team2', 0),
        'overs': features.get('overs', 0.0)
    }

    prob = predict_proba_from_features(model_features)
    fair_odds = 1.0/prob if prob>0 else None
    other = 1.0 - prob
    sum_probs = prob + other
    scale = (1.0 + VIG)/sum_probs
    # Simulate market odds
    market_odds = 1.0 / min(max(prob * (1 + VIG + random.uniform(-0.01, 0.03)), 0.01), 0.99)
    market_odds2 = 1.0 / min(max(other * (1 + VIG + random.uniform(-0.01, 0.03)), 0.01), 0.99)

    ev = prob * (market_odds - 1) - (1 - prob) * 1 if market_odds else None
    b = market_odds - 1 if market_odds else 0
    p = prob
    q = 1 - p
    kelly = (b*p - q)/b if b>0 else 0.0
    kelly_fraction = max(0.0, kelly) * 0.25

    # Team2 calculations
    prob2 = other
    fair_odds2 = 1.0/prob2 if prob2>0 else None
    ev2 = prob2 * (market_odds2 - 1) - (1 - prob2) * 1 if market_odds2 else None
    b2 = market_odds2 - 1 if market_odds2 else 0
    p2 = prob2
    q2 = 1 - p2
    kelly2 = (b2*p2 - q2)/b2 if b2>0 else 0.0
    kelly_fraction2 = max(0.0, kelly2) * 0.25 if market_odds2 else None

    team1 = (match_json.get('team1') or {}).get('name') if isinstance(match_json.get('team1'), dict) else match_json.get('team1', 'Team1')
    team2 = (match_json.get('team2') or {}).get('name') if isinstance(match_json.get('team2'), dict) else match_json.get('team2', 'Team2')
    venue = (match_json.get('venue') or {}).get('ground') if isinstance(match_json.get('venue'), dict) else match_json.get('venue', 'Unknown')
    tossWinner = match_json.get('tossWinner', None)

    return {
        'team1': str(team1) if team1 is not None else "",
        'team2': str(team2) if team2 is not None else "",
        'venue': str(venue) if venue is not None else "",
        'tossWinner': str(tossWinner) if tossWinner is not None else "",
        'model_prob': prob,
        'fair_odds': round(fair_odds, 3) if fair_odds else None,
        'market_odds': round(market_odds, 3) if market_odds else None,
        'ev_for_1': round(ev, 4) if ev is not None else None,
        'kelly_fraction': round(kelly_fraction, 4),
        'team2_prob': prob2,
        'team2_fair_odds': round(fair_odds2, 3) if fair_odds2 else None,
        'market_odds2': round(market_odds2, 3) if market_odds2 else None,
        'ev_for_1_2': round(ev2, 4) if ev2 is not None else None,
        'kelly_fraction_2': round(kelly_fraction2, 4) if kelly_fraction2 is not None else None
    }

@app.get('/series/{series_id}')
def series_info(series_id: str):
    try:
        data = get_series_info(series_id)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/matches/upcoming')
def upcoming():
    try:
        data = get_upcoming_matches()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

