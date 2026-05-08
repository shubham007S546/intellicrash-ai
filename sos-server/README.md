# 🚨 SafeSignal SOS — IntelliCrash v7

Emergency SOS backend with **Ambulance Priority Queue**, SMS, WhatsApp & Email alerts.

---

## 🚀 Quick Start

```bash
cd sos-server
npm install
node server.js
```

Open browser → `http://localhost:3001/api/health`

---

## 🌐 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/health` | Server status + channel check |
| `GET`  | `/api/test` | Fire test alerts to all admin channels |
| `GET`  | `/api/test-wa` | Test WhatsApp only |
| `POST` | `/api/sos` | Trigger emergency SOS |
| `GET`  | `/api/ambulance/status` | Full ambulance queue state |
| `POST` | `/api/ambulance/release` | Mark ambulance as returned |
| `POST` | `/api/ambulance/dispatch` | Manual ambulance dispatch |
| `GET`  | `/api/nearby` | Nearest hospitals |
| `GET`  | `/api/logs` | SOS event log |
| `POST` | `/api/send-sms` | Manual SMS |
| `POST` | `/api/send-whatsapp` | Manual WhatsApp |
| `POST` | `/api/send-email` | Manual Email |

---

## 🚑 Ambulance Priority System

### How It Works

The system manages **5 ambulances** as a resource pool with intelligent triage:

```
SOS Received → Calculate Priority Score (0–200)
                    ↓
           Ambulance Available?
          YES ────────────────→ DISPATCH immediately
          NO                         ↓
                    Priority > Lowest Active - 20?
                    YES → PREEMPT lowest, dispatch here, re-queue old
                    NO  → QUEUE sorted by priority
```

### Priority Formula
```
Priority = riskScore (0–100) + severityWeight (0–100) + autoCrashBonus (0–30)

Severity weights:
  FATAL    = 100
  CRITICAL = 90
  HIGH     = 80
  SERIOUS  = 70
  MEDIUM   = 50
  MINOR    = 30
  LOW      = 20
```

### Example Scenarios

**Scenario A — All free:**
- Victim A: HIGH, risk=80 → Priority=160 → **DISPATCHED immediately, ETA 8min**

**Scenario B — All busy:**
- All 5 ambulances out  
- Victim B: MEDIUM, risk=40 → Priority=90 → **QUEUED #1**
- Victim C: FATAL, risk=95 → Priority=195 → **PREEMPTS lowest active dispatch**

**Scenario C — Queue ordering:**
```
Queue (sorted by priority):
  #1 FATAL risk=90   → priority=190  ← gets ambulance first
  #2 HIGH  risk=75   → priority=155
  #3 MEDIUM risk=50  → priority=100
```

---

## 📱 POST /api/sos — Full Example

```json
POST http://localhost:3001/api/sos
Content-Type: application/json

{
  "lat": 31.1048,
  "lon": 77.1734,
  "userName": "Shubham",
  "severity": "HIGH",
  "riskScore": 85,
  "speed": 72,
  "isAutoCrash": true,
  "message": "Vehicle crashed on NH-3 near Mandi",
  "mapsLink": "https://maps.google.com/?q=31.1048,77.1734",
  "contacts": [
    { "phone": "919015162007", "email": "shubhamabhi004@gmail.com" }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "queued": true,
  "hospitals": [...],
  "alertCount": 1,
  "ambulance": {
    "dispatched": true,
    "dispatch": {
      "dispatchId": "AMB-1",
      "etaMinutes": 7,
      "priority": 195,
      "status": "DISPATCHED"
    }
  },
  "queueStatus": {
    "available": 4,
    "total": 5,
    "pending": 0,
    "active": 1
  }
}
```

---

## 🔄 POST /api/ambulance/release

When ambulance returns from job:

```json
POST /api/ambulance/release
{ "dispatchId": "AMB-1" }
```

This automatically dispatches the next highest priority victim from the queue.

---

## 🔧 WhatsApp Fix Notes

Infobip requires:
- `Authorization: App YOUR_API_KEY` (not `Bearer`)
- `from` and `to` as **digits only** (no `+` prefix)
- Endpoint: `/whatsapp/1/message/text`

Test it: `GET http://localhost:3001/api/test-wa`

---

## 📁 File Structure

```
sos-server/
├── server.js        ← Main server (all logic here)
├── .env             ← Your API keys (never commit this!)
├── package.json
├── README.md
└── build/           ← React frontend build (if deployed)
```

---

## ⚙️ Environment Variables

| Key | Description |
|-----|-------------|
| `TWILIO_SID` | Twilio Account SID |
| `TWILIO_TOKEN` | Twilio Auth Token |
| `TWILIO_FROM` | Twilio phone number |
| `INFOBIP_API_KEY` | Infobip API key |
| `INFOBIP_BASE_URL` | Infobip base URL (e.g. `https://xyz.api.infobip.com`) |
| `INFOBIP_FROM_NUMBER` | WhatsApp sender number (digits only) |
| `GMAIL_USER` | Gmail address |
| `GMAIL_PASS` | Gmail App Password |
| `ADMIN_PHONE` | Admin fallback SMS number |
| `ADMIN_WHATSAPP` | Admin fallback WA number |
| `ADMIN_EMAIL` | Admin fallback email |
| `PORT` | Server port (default 3001) |
