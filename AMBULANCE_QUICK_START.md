# 🚑 Ambulance Tracking — Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Verify Configuration ✅
Check that `.env` has ambulance phone:
```bash
cat python/.env | grep AMBULANCE
# Output should show:
# AMBULANCE_PHONE=9015162007
# AMBULANCE_PHONE_E164=+919015162007
```

**Already Done!** ✅

### Step 2: Start Backend
```bash
cd python
python api.py
# Should start on http://localhost:8000
```

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
# Should start on http://localhost:5173
```

---

## 🧪 Test in 1 Minute

```bash
# Terminal 1: Start API
python python/api.py

# Terminal 2: Run test
python test_ambulance_system.py

# Expected output:
# ✓ PASS | SOS POST /api/sos
# ✓ PASS | GET /api/sos/ambulance/track/{id}
# ✓ PASS | POST /api/sos/ambulance/update
# ✓ PASS | Ambulance arrival verified
# ✓ All tests passed!
```

---

## 📱 Test in App

### Method 1: Trigger SOS Button
1. Open app: `http://localhost:5173`
2. Enter your name
3. Tap 🆘 **SOS** button
4. **Check your phone for SMS:**
   ```
   🚨 EMERGENCY SOS 🚨
   Patient: [your name]
   Risk: HIGH
   Location: [your location]
   📍 GPS: [coordinates]
   ```
5. Watch tracking card appear with:
   - Distance: X km
   - ETA: Y minutes
   - Ambulance location
   - Status indicator

### Method 2: Simulate Ambulance (curl)
```bash
# Get request_id from SOS response, then:

curl -X POST http://localhost:8000/api/sos/ambulance/update \
  -H "Content-Type: application/json" \
  -d '{
    "sos_request_id": "[REQUEST_ID]",
    "lat": 31.1050,
    "lon": 77.1740,
    "status": "en_route",
    "speed": 55.0,
    "eta_minutes": 5
  }'

# Watch tracking card update in real-time!
```

---

## 📊 What You Get

| Feature | Status |
|---------|--------|
| SOS sends SMS to ambulance | ✅ |
| Real-time location tracking | ✅ |
| Live ETA countdown | ✅ |
| Distance display | ✅ |
| Speed indicator | ✅ |
| Status tracking | ✅ |
| Call ambulance button | ✅ |
| View on map button | ✅ |
| Offline support | ✅ |

---

## 🔧 Configuration

### Change Ambulance Number
Edit `python/.env`:
```env
AMBULANCE_PHONE=9876543210           # Your new number
AMBULANCE_PHONE_E164=+919876543210  # E.164 format
```

Then restart API:
```bash
python python/api.py
```

### Change Polling Interval
In `frontend/src/pages/SOS.jsx`, find:
```javascript
ambulanceTrackingInterval.current=setInterval(pollAmbulance,3000);
                                                             ↑
                                                    3000 ms = 3 seconds
```

Change to:
```javascript
ambulanceTrackingInterval.current=setInterval(pollAmbulance,5000); // 5 seconds
```

---

## 📋 Key Files

| File | Purpose |
|------|---------|
| `AMBULANCE_SYSTEM.md` | Full technical documentation |
| `AMBULANCE_IMPLEMENTATION_SUMMARY.md` | Complete overview |
| `test_ambulance_system.py` | Automated tests |
| `python/api.py` | Backend endpoints & SMS |
| `frontend/src/pages/SOS.jsx` | Frontend UI & polling |

---

## 🆘 Troubleshooting

### SMS Not Received?
```bash
1. Check AMBULANCE_PHONE_E164 in .env
2. Verify phone format: +919015162007
3. Check Twilio credits
4. Look at API logs for errors
```

### Tracking Not Updating?
```bash
1. Check browser console (F12)
2. Verify SOS was sent (SMS received)
3. Check request_id from SOS response
4. Try manual curl test above
```

### No GPS Data?
```bash
1. Allow location permission in browser
2. Try HTTPS (production only)
3. Clear browser cache
4. Check GPS signal (indoor limitations)
```

---

## 🎯 What Happens

```
User Taps SOS
    ↓
SMS → Ambulance ("🚨 EMERGENCY at 31.1048, 77.1734")
SMS → Contacts
Email → Admin
    ↓
Frontend gets request_id
    ↓
Starts polling ambulance location (every 3s)
    ↓
Tracking card appears:
  📍 GPS: 31.1050, 77.1740
  ⏱️ ETA: 8 minutes
  🛣️ Distance: 2.45 km
  ⚡ Speed: 55 km/h
    ↓
Real-time updates as ambulance moves
    ↓
Status changes to "arrived"
Toast: "🚑 Ambulance has arrived!"
```

---

## ✅ Checklist

- [ ] Started API: `python python/api.py`
- [ ] Started Frontend: `npm run dev`
- [ ] Tested SOS button
- [ ] Received SMS on phone
- [ ] Saw tracking card appear
- [ ] Simulated ambulance update
- [ ] Watched live updates
- [ ] Verified "View on Map" works
- [ ] Tried "Call Ambulance" button
- [ ] Ran `test_ambulance_system.py`

---

## 🚀 You're Ready!

The ambulance tracking system is **fully operational**. 

**Next Steps:**
1. Test everything above
2. Adjust ambulance phone number in .env
3. Deploy to production
4. Set up real ambulance driver app

---

**Version**: 1.0  
**Date**: 2026-04-29  
**Status**: ✅ Ready to Use
