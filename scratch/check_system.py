import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def check_endpoint(name, path, method="GET", payload=None):
    url = f"{BASE_URL}{path}"
    print(f"--- Checking {name} ({url}) ---")
    try:
        if method == "GET":
            resp = requests.get(url, timeout=5)
        else:
            resp = requests.post(url, json=payload, timeout=5)
        
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print("Response:", json.dumps(data, indent=2)[:500], "..." if len(json.dumps(data)) > 500 else "")
            return True
        else:
            print("Error Response:", resp.text)
            return False
    except Exception as e:
        print(f"Connection Error: {e}")
        return False

endpoints = [
    ("Health", "/api/health", "GET"),
    ("Model Status", "/api/models/status", "GET"),
    ("Predict", "/api/predict", "POST", {
        "weather": "0", "roadType": "1", "timeOfDay": "1", "speed": 60, "areaType": "0"
    }),
    ("SOS Config", "/api/sos/config", "GET"),
]

for name, path, method, *payload in endpoints:
    check_endpoint(name, path, method, payload[0] if payload else None)
    print("\n")
