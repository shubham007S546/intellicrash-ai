"""
Debug script to test the contact form endpoint
"""
import sys
import time

# Wait for API to start
print("⏳ Waiting for API to start (checking port 8000)...")
for attempt in range(30):  # Try for 30 seconds
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = s.connect_ex(('127.0.0.1', 8000))
        s.close()
        if result == 0:
            print("✅ API is running!")
            break
    except:
        pass
    time.sleep(1)
    if attempt == 29:
        print("❌ API did not start within 30 seconds")
        sys.exit(1)

# Test the endpoint
import requests
import json

print("\n📤 Testing contact form endpoint...")
try:
    response = requests.post(
        'http://127.0.0.1:8000/api/contact-form',
        json={
            'name': 'Test User',
            'email': 'test@gmail.com',
            'message': 'This is a test message for the contact form'
        },
        timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print("\n✅ Contact form endpoint is working!")
    else:
        print(f"\n❌ Endpoint returned {response.status_code}")
except requests.exceptions.ConnectionError:
    print("❌ Cannot connect to API on http://127.0.0.1:8000")
except Exception as e:
    print(f"❌ Error: {e}")
