import os
import requests
from urllib.parse import urlencode

BASE = "https://cricbuzz-cricket.p.rapidapi.com"

def get_playing11(match_id, team_id):
    """Fetch playing XI for a team in a match from Cricbuzz API."""
    RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
    RAPIDAPI_HOST = os.getenv('RAPIDAPI_HOST', 'cricbuzz-cricket.p.rapidapi.com')
    HEADERS = {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
    }
    url = f"{BASE}/mcenter/v1/{match_id}/team/{team_id}"
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()
def get_venue_stats(venue_id):
    RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
    RAPIDAPI_HOST = os.getenv('RAPIDAPI_HOST', 'cricbuzz-cricket.p.rapidapi.com')
    HEADERS = {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
    }
    url = f"{BASE}/stats/v1/venue/{venue_id}"
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()
def ScoreCard(match_id):
    RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
    RAPIDAPI_HOST = os.getenv('RAPIDAPI_HOST', 'cricbuzz-cricket.p.rapidapi.com')
    HEADERS = {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
    }
    url = f"{BASE}/mcenter/v1/{match_id}/scard"
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    try:
        return resp.json()
    except Exception as e:
        print("[ERROR] Could not parse JSON:", e)
        print("[ERROR] Response text:", resp.text)
        raise
def get_upcoming_matches():
    RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
    RAPIDAPI_HOST = os.getenv('RAPIDAPI_HOST', 'cricbuzz-cricket.p.rapidapi.com')
    HEADERS = {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
    }
    url = f"{BASE}/matches/v1/live"
    print("HEADERS:", HEADERS)
    print("URL:", url)
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()

def get_match_center(match_id):
    RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
    RAPIDAPI_HOST = os.getenv('RAPIDAPI_HOST', 'cricbuzz-cricket.p.rapidapi.com')
    HEADERS = {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
    }
    url = f"{BASE}/mcenter/v1/{match_id}"
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()
def get_series_info(series_id):
    RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
    RAPIDAPI_HOST = os.getenv('RAPIDAPI_HOST', 'cricbuzz-cricket.p.rapidapi.com')
    HEADERS = {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
    }
    url = f"{BASE}/series/v1/{series_id}"
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()
def safe_get(d, path, default=None):
    cur = d
    for p in path.split("."):
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        else:
            return default
    return cur
def extract_fantasy_samples(match_json, window=6):
    data = []
    innings_list = match_json.get("scorecard", [])
    if not innings_list:
        print("[DEBUG] No innings_list found in match_json")
        return []
    innings = innings_list[0]
    overs_list = innings.get("overs", [])
    if not overs_list:
        print("[DEBUG] No overs_list found in innings. Only summary data available.")
        return []
    # Build a list of cumulative runs at each over
    cumulative_runs = []
    for over in overs_list:
        runs = over.get("runs", 0)
        if cumulative_runs:
            cumulative_runs.append(cumulative_runs[-1] + runs)
        else:
            cumulative_runs.append(runs)
    total_overs = len(overs_list)
    for i, over in enumerate(overs_list):
        # Only create a sample if there are enough overs left for the window
        if i + window < total_overs:
            current_runs = cumulative_runs[i]
            runs_next_window = cumulative_runs[i + window] - current_runs
            wickets = over.get("wickets", 0)
            over_num = over.get("ovr", 0)
            rr = current_runs / over_num if over_num > 0 else 0
            feat = {
                "current_runs": current_runs,
                "current_wickets": wickets,
                "current_overs": over_num,
                "current_run_rate": rr,
                "phase": "powerplay" if over_num <= 6 else "middle" if over_num <= 15 else "death",
                "target_runs_next_N": runs_next_window
            }
            data.append(feat)
    print("[DEBUG] extract_fantasy_samples: returning type", type(data))
    return data
