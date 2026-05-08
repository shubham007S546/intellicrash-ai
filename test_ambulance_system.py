#!/usr/bin/env python3
"""
test_ambulance_system.py - Test script for Ambulance Tracking System
Run: python test_ambulance_system.py
"""

import requests
import json
import time
from datetime import datetime

API_BASE = "http://localhost:8000"

# Colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"

def print_test(name, passed, message=""):
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"{status} | {name}")
    if message:
        print(f"       {message}")

def test_ambulance_system():
    print(f"\n{BOLD}{BLUE}╔══════════════════════════════════════════════╗{RESET}")
    print(f"{BOLD}{BLUE}║  Ambulance Tracking System — Test Suite      ║{RESET}")
    print(f"{BOLD}{BLUE}╚══════════════════════════════════════════════╝{RESET}\n")
    
    tests_passed = 0
    tests_total = 0
    
    # TEST 1: Trigger SOS
    print(f"{BOLD}Test 1: Trigger SOS Request{RESET}")
    tests_total += 1
    try:
        sos_payload = {
            "user_name": "Test User",
            "lat": 31.1048,
            "lon": 77.1734,
            "address": "Test Location, Shimla",
            "speed": 60.5,
            "weather": "0",
            "roadType": "1",
            "timeOfDay": "1",
            "areaType": "0",
            "vehicles": 2.0,
            "message": "Test SOS for Ambulance System"
        }
        
        resp = requests.post(f"{API_BASE}/api/sos", json=sos_payload, timeout=10)
        resp_data = resp.json()
        
        if resp.status_code == 200 and resp_data.get("request_id"):
            request_id = resp_data["request_id"]
            print_test(
                "SOS POST /api/sos",
                True,
                f"Request ID: {YELLOW}{request_id}{RESET}"
            )
            tests_passed += 1
            
            # Save request_id for next tests
            with open(".ambulance_test_id", "w") as f:
                f.write(request_id)
        else:
            print_test("SOS POST /api/sos", False, f"Status: {resp.status_code}")
    except Exception as e:
        print_test("SOS POST /api/sos", False, str(e))
    
    # TEST 2: Load request_id from file
    try:
        with open(".ambulance_test_id", "r") as f:
            request_id = f.read().strip()
    except:
        print(f"{RED}Error: Could not load request_id from file{RESET}")
        print(f"Make sure Test 1 passed first!")
        return
    
    time.sleep(1)
    
    # TEST 3: Get initial tracking (should be empty)
    print(f"\n{BOLD}Test 2: Get Initial Tracking (Empty){RESET}")
    tests_total += 1
    try:
        resp = requests.get(f"{API_BASE}/api/sos/ambulance/track/{request_id}", timeout=10)
        resp_data = resp.json()
        
        if resp_data.get("status") == "no_tracking":
            print_test(
                "GET /api/sos/ambulance/track/{id}",
                True,
                "No tracking data yet (expected)"
            )
            tests_passed += 1
        else:
            print_test(
                "GET /api/sos/ambulance/track/{id}",
                False,
                f"Got: {resp_data.get('status')}"
            )
    except Exception as e:
        print_test("GET /api/sos/ambulance/track/{id}", False, str(e))
    
    # TEST 4: Send ambulance location update
    print(f"\n{BOLD}Test 3: Send Ambulance Location Update{RESET}")
    tests_total += 1
    try:
        ambulance_payload = {
            "sos_request_id": request_id,
            "lat": 31.1050,
            "lon": 77.1740,
            "status": "en_route",
            "speed": 55.0,
            "eta_minutes": 8
        }
        
        resp = requests.post(
            f"{API_BASE}/api/sos/ambulance/update",
            json=ambulance_payload,
            timeout=10
        )
        resp_data = resp.json()
        
        if resp.status_code == 200 and resp_data.get("status") == "updated":
            print_test(
                "POST /api/sos/ambulance/update",
                True,
                f"Distance: {YELLOW}{resp_data.get('distance_km')} km{RESET}, "
                f"ETA: {YELLOW}{resp_data.get('eta_minutes')} min{RESET}"
            )
            tests_passed += 1
        else:
            print_test("POST /api/sos/ambulance/update", False, f"Status: {resp.status_code}")
    except Exception as e:
        print_test("POST /api/sos/ambulance/update", False, str(e))
    
    time.sleep(1)
    
    # TEST 5: Get tracking data
    print(f"\n{BOLD}Test 4: Get Ambulance Tracking Data{RESET}")
    tests_total += 1
    try:
        resp = requests.get(f"{API_BASE}/api/sos/ambulance/track/{request_id}", timeout=10)
        resp_data = resp.json()
        
        if resp_data.get("status") == "tracked":
            ambulance = resp_data.get("ambulance", {})
            print_test(
                "GET /api/sos/ambulance/track/{id}",
                True,
                f"Ambulance @ {YELLOW}{ambulance.get('lat')}, {ambulance.get('lon')}{RESET}"
            )
            print(f"       Distance: {YELLOW}{resp_data.get('distance_km')} km{RESET}")
            print(f"       ETA: {YELLOW}{resp_data.get('eta_minutes')} min{RESET}")
            print(f"       Status: {YELLOW}{resp_data.get('ambulance_status')}{RESET}")
            print(f"       Speed: {YELLOW}{ambulance.get('speed')} km/h{RESET}")
            tests_passed += 1
        else:
            print_test("GET /api/sos/ambulance/track/{id}", False, f"Got: {resp_data.get('status')}")
    except Exception as e:
        print_test("GET /api/sos/ambulance/track/{id}", False, str(e))
    
    # TEST 6: Calculate ETA
    print(f"\n{BOLD}Test 5: Calculate ETA{RESET}")
    tests_total += 1
    try:
        resp = requests.get(
            f"{API_BASE}/api/sos/ambulance/eta",
            params={
                "ambulance_lat": 31.1050,
                "ambulance_lon": 77.1740,
                "patient_lat": 31.1048,
                "patient_lon": 77.1734,
                "avg_speed": 60.0
            },
            timeout=10
        )
        resp_data = resp.json()
        
        if resp.status_code == 200:
            print_test(
                "GET /api/sos/ambulance/eta",
                True,
                f"Distance: {YELLOW}{resp_data.get('distance_km')} km{RESET}, "
                f"ETA: {YELLOW}{resp_data.get('eta_minutes')} min{RESET}"
            )
            tests_passed += 1
        else:
            print_test("GET /api/sos/ambulance/eta", False, f"Status: {resp.status_code}")
    except Exception as e:
        print_test("GET /api/sos/ambulance/eta", False, str(e))
    
    # TEST 7: Update ambulance status to "arrived"
    print(f"\n{BOLD}Test 6: Update Ambulance Status to Arrived{RESET}")
    tests_total += 1
    try:
        ambulance_payload = {
            "sos_request_id": request_id,
            "lat": 31.1048,
            "lon": 77.1734,
            "status": "arrived",
            "speed": 0.0,
            "eta_minutes": 0
        }
        
        resp = requests.post(
            f"{API_BASE}/api/sos/ambulance/update",
            json=ambulance_payload,
            timeout=10
        )
        resp_data = resp.json()
        
        if resp.status_code == 200:
            print_test(
                "POST /api/sos/ambulance/update (arrived)",
                True,
                f"Status: {YELLOW}arrived{RESET}"
            )
            tests_passed += 1
        else:
            print_test("POST /api/sos/ambulance/update (arrived)", False, f"Status: {resp.status_code}")
    except Exception as e:
        print_test("POST /api/sos/ambulance/update (arrived)", False, str(e))
    
    # TEST 8: Verify arrived status
    print(f"\n{BOLD}Test 7: Verify Ambulance Arrival Status{RESET}")
    tests_total += 1
    try:
        resp = requests.get(f"{API_BASE}/api/sos/ambulance/track/{request_id}", timeout=10)
        resp_data = resp.json()
        
        if resp_data.get("ambulance_status") == "arrived":
            print_test(
                "Verify ambulance_status = arrived",
                True,
                f"Status: {YELLOW}arrived{RESET}"
            )
            tests_passed += 1
        else:
            print_test(
                "Verify ambulance_status = arrived",
                False,
                f"Got: {resp_data.get('ambulance_status')}"
            )
    except Exception as e:
        print_test("Verify ambulance_status = arrived", False, str(e))
    
    # SUMMARY
    print(f"\n{BOLD}{BLUE}╔══════════════════════════════════════════════╗{RESET}")
    print(f"{BOLD}{BLUE}║  Test Summary{RESET}")
    print(f"{BOLD}{BLUE}╚══════════════════════════════════════════════╝{RESET}")
    print(f"Passed: {GREEN}{tests_passed}/{tests_total}{RESET}")
    
    if tests_passed == tests_total:
        print(f"\n{GREEN}{BOLD}✓ All tests passed!{RESET}")
        print(f"Ambulance tracking system is {GREEN}operational{RESET}.")
    else:
        print(f"\n{YELLOW}{BOLD}⚠ Some tests failed{RESET}")
        print(f"Check the output above for details.")
    
    print()

if __name__ == "__main__":
    try:
        test_ambulance_system()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrupted by user{RESET}")
    except Exception as e:
        print(f"\n{RED}Unexpected error: {e}{RESET}")
