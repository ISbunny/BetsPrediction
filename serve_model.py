# --- Imports and setup ---
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from cricbuzz_client import get_upcoming_matches, get_match_center, get_series_info, ScoreCard
from prepare_features import prepare_features_from_match_json
import random
import logging

load_dotenv()
print(os.getenv('RAPIDAPI_KEY'))
MODEL_PATH = os.getenv('MODEL_PATH', 'models/gbt_ensemble.pkl')
FANTASY_MODEL_PATH = os.getenv('FANTASY_MODEL_PATH', 'models/fantasy_regressor.pkl')  # <-- Add this
VIG = float(os.getenv('VIG', '0.05'))

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("serve_model")

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

# Load fantasy model
FANTASY_MODEL_PATH = os.getenv('FANTASY_MODEL_PATH', 'models/fantasy_regressor.pkl')
if not os.path.exists(FANTASY_MODEL_PATH):
    raise RuntimeError(f"Fantasy model not found at {FANTASY_MODEL_PATH}. Train and save fantasy_regressor.pkl first.")

fantasy_model_obj = joblib.load(FANTASY_MODEL_PATH)
FANTASY_MODEL = fantasy_model_obj['model']
FANTASY_FEATURE_COLS = fantasy_model_obj['feature_columns']

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
    venue_record: Optional[dict] = None  # <-- Added
    venue_record_used_in_model: bool = False  # <-- Added

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

# --- Fantasy Feature Extraction ---
def extract_features_from_scorecard(scorecard, window=6):
    """
    Extract features from the scorecard for the fantasy regression model.
    You must match this with your training feature engineering!
    """
    # Example: Adjust according to your training features
    innings = scorecard.get('innings', [{}])[0]
    runs = innings.get('runs', 0)
    wickets = innings.get('wickets', 0)
    overs = float(innings.get('overs', 0))
    run_rate = innings.get('runRate', 0)
    # Add more features as per your training
    features = {
        'current_runs': runs,
        'current_wickets': wickets,
        'current_overs': overs,
        'current_run_rate': run_rate,
        # ...add more as needed...
    }
    # Fill missing features with 0
    for c in FANTASY_FEATURE_COLS:
        if c not in features:
            features[c] = 0.0
    X = pd.DataFrame([features])[FANTASY_FEATURE_COLS].fillna(0)
    return X

# --- API Endpoints ---
@app.get('/predict/{match_id}', response_model=PredictResp)
def predict(
    match_id: str,
    market_odds: Optional[float] = Query(None, description="Market odds for team1"),
    market_odds2: Optional[float] = Query(None, description="Market odds for team2")
):
    print("Predict endpoint called!")  # Add this line
    logger.info(f"Received prediction request for match_id={match_id}, market_odds={market_odds}, market_odds2={market_odds2}")
    try:
        match_json = get_match_center(match_id)
        logger.info(f"Fetched match_json for match_id={match_id}: {str(match_json)[:500]}")  # Log first 500 chars
    except Exception as e:
        logger.error(f"Failed fetching match data for match_id={match_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed fetching match data: {e}")

    features = prepare_features_from_match_json(match_json)
    logger.info(f"Prepared features: {features}")
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
    venue_features = {k: v for k, v in model_features.items() if 'venue' in k}
    logger.info(f"Venue-related features used in model: {venue_features}")
    if any(v != 0 for v in venue_features.values()):
        logger.info("Venue record IS influencing the model prediction for this match.")
    else:
        logger.info("Venue record is NOT influencing the model prediction for this match.")
    logger.info(f"Model features: {model_features}")

    prob = predict_proba_from_features(model_features)
    logger.info(f"Predicted probability for team1: {prob}")
    fair_odds = 1.0/prob if prob>0 else None
    other = 1.0 - prob
    sum_probs = prob + other
    scale = (1.0 + VIG)/sum_probs

    if market_odds is None:
        market_odds = 1.0 / min(max(prob * (1 + VIG + random.uniform(-0.01, 0.03)), 0.01), 0.99)
        logger.info(f"Simulated market_odds for team1: {market_odds}")
    if market_odds2 is None:
        market_odds2 = 1.0 / min(max(other * (1 + VIG + random.uniform(-0.01, 0.03)), 0.01), 0.99)
        logger.info(f"Simulated market_odds for team2: {market_odds2}")

    ev = prob * (market_odds - 1) - (1 - prob) * 1 if market_odds else None
    b = market_odds - 1 if market_odds else 0
    p = prob
    q = 1 - p
    kelly = (b*p - q)/b if b>0 else 0.0
    kelly_fraction = max(0.0, kelly) * 0.25

    prob2 = other
    fair_odds2 = 1.0/prob2 if prob2>0 else None
    ev2 = prob2 * (market_odds2 - 1) - (1 - prob2) * 1 if market_odds2 else None
    b2 = market_odds2 - 1 if market_odds2 else 0
    p2 = prob2
    q2 = 1 - p2
    kelly2 = (b2*p2 - q2)/b2 if b2>0 else 0.0
    kelly_fraction2 = max(0.0, kelly2) * 0.25 if market_odds2 else None

    logger.info(f"EV for team1: {ev}, Kelly fraction: {kelly_fraction}")
    logger.info(f"EV for team2: {ev2}, Kelly fraction 2: {kelly_fraction2}")

    team1 = (match_json.get('team1') or {}).get('teamName') or match_json.get('team1', {}).get('teamname', '')
    team2 = (match_json.get('team2') or {}).get('teamName') or match_json.get('team2', {}).get('teamname', '')
    venue = (match_json.get('venueinfo') or {}).get('ground') if isinstance(match_json.get('venueinfo'), dict) else match_json.get('venueinfo', 'Unknown')
    tossWinner = match_json.get('tossstatus', None)

    venue_record = None
    if 'venueinfo' in match_json and isinstance(match_json['venueinfo'], dict):
        venue_record = match_json['venueinfo'].get('record', None)

    venue_record_used_in_model = True if 'venue_adv_team1' in model_features or 'venue_adv_team2' in model_features else False

    response = {
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
        'kelly_fraction_2': round(kelly_fraction2, 4) if kelly_fraction2 is not None else 0.0,
        'venue_record': venue_record,
        'venue_record_used_in_model': venue_record_used_in_model
    }
    logger.info(f"Response: {response}")
    return response

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

@app.get('/fantasy/score_projection/{match_id}')
def score_projection(match_id: str, window: int = 6):
    scorecard = get_match_center(match_id)
    print("Scorecard fetched:", scorecard)  # Debug print
    print(f"[DEBUG] Type of scorecard: {type(scorecard)}")
    # Extract features for the latest over
    innings = scorecard.get("scorecard", [])[0]
    overs_list = innings.get("overs", [])
    if not overs_list:
        raise HTTPException(status_code=400, detail="No overs data found")
    over = overs_list[-1]
    current_runs = sum(o.get("runs", 0) for o in overs_list)
    wickets = over.get("wickets", 0)
    over_num = over.get("ovr", 0)
    rr = current_runs / over_num if over_num > 0 else 0
    phase = "powerplay" if over_num <= 6 else "middle" if over_num <= 15 else "death"
    features = {
        "current_runs": current_runs,
        "current_wickets": wickets,
        "current_overs": over_num,
        "current_run_rate": rr,
        "phase": phase
    }
    # Ensure feature order matches fantasy model training
    X = pd.DataFrame([features])[FANTASY_FEATURE_COLS]
    pred = float(FANTASY_MODEL.predict(X)[0])
    return {"projected_runs_next_N_overs": round(pred, 2)}

