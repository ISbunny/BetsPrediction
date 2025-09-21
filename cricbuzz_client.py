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
