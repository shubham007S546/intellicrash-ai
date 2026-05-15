import requests
import json

url = "http://127.0.0.1:8000/api/predict"
payload = {
    "weather": "0",
    "roadType": "1",
    "timeOfDay": "1",
    "speed": 60
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
