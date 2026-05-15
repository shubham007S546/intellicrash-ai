import requests
import json

url = "http://127.0.0.1:8001/api/predict"
data = {
    "weather": "0",
    "roadType": "1",
    "timeOfDay": "1",
    "speed": 60
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
