import requests
from .config import AMADEUS_URL, AMADEUS_KEY, AMADEUS_SECRET

def get_amadeus_access_token() -> str:
    if not AMADEUS_KEY or not AMADEUS_SECRET:
        print("ERROR: Amadeus API Key or Secret is missing")
        raise ValueError("Amadeus API Key and Secret must be set in .env and valid")
    
    url = f"{AMADEUS_URL}/v1/security/oauth2/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    payload = {
        "grant_type": "client_credentials",
        "client_id": AMADEUS_KEY,
        "client_secret": AMADEUS_SECRET
    }
    
    try:
        r = requests.post(url, headers=headers, data=payload, timeout=30)
        r.raise_for_status()
        return r.json()["access_token"]
    except requests.RequestException as e:
        print(f"ERROR: Amadeus token request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text[:500]}")
        raise
