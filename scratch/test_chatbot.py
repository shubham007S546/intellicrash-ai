import requests
import uuid

BASE_URL = "http://127.0.0.1:8000/api"
session_id = f"test-{uuid.uuid4().hex[:8]}"

def test_chat():
    print(f"Testing Chat with session_id: {session_id}")
    payload = {
        "message": "What are the most dangerous roads in Shimla?",
        "session_id": session_id
    }
    try:
        r = requests.post(f"{BASE_URL}/chat", json=payload, timeout=15)
        print(f"Status: {r.status_code}")
        if r.ok:
            data = r.json()
            print(f"AI Response: {data['response']}")
        else:
            print(f"Error: {r.text}")
    except Exception as e:
        print(f"Request failed: {e}")

def test_history():
    print("\nTesting History...")
    try:
        r = requests.get(f"{BASE_URL}/chat/history", params={"session_id": session_id}, timeout=10)
        print(f"Status: {r.status_code}")
        if r.ok:
            data = r.json()
            print(f"History count: {len(data['history'])}")
            for msg in data['history']:
                print(f"[{msg['role']}]: {msg['content'][:50]}...")
        else:
            print(f"Error: {r.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_chat()
    test_history()
