"""
IntelliCrash API v4.3.2 — Production Backend  (FINAL)
=============================================
v4.3.2 adds (over v4.3.1):
  ✅ NEW: DELETE /api/reviews/{review_id} — admin can delete any review
  ✅ All v4.3.1 fixes preserved unchanged
"""

import os, json, sqlite3, smtplib, traceback, math, socket, re, csv, io, uuid, time
import logging
import logging.config
from pathlib import Path
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
BASE = Path(__file__).parent
from dotenv import load_dotenv, find_dotenv

env_path = find_dotenv()
print("ENV PATH:", env_path)

load_dotenv(env_path, override=True)

import joblib, numpy as np, pandas as pd, requests
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator, model_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ── Sentiment analysis ────────────────────────────────────────────────────────
try:
    from sentiment import analyze_sentiment
    SENTIMENT_OK = True
except ImportError:
    SENTIMENT_OK = False
    def analyze_sentiment(text: str) -> dict:
        return {"label": "neutral", "score": 50.0, "polarity": 0.0, "subjectivity": None}

# ==================================================================
#  STRUCTURED LOGGING
# ==================================================================
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","module":"%(module)s","msg":"%(message)s"}',
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("intellicrash")

# ==================================================================
#  CONFIG — from environment, never hardcoded
# ==================================================================
RAPIDAPI_KEY      = os.getenv("RAPIDAPI_KEY", "")
GMAIL_USER        = os.getenv("GMAIL_USER", "")
GMAIL_PASS        = os.getenv("GMAIL_PASS", "")
ADMIN_EMAIL       = os.getenv("ADMIN_EMAIL", "shubhamabhi004@gmail.com")
ADMIN_PHONE       = os.getenv("ADMIN_PHONE", "9015162007")
ADMIN_WA          = os.getenv("ADMIN_WHATSAPP", "919015162007")






TWILIO_FROM       = os.getenv("TWILIO_FROM", "+13613044518")
ADMIN_PHONE_E164  = os.getenv("ADMIN_PHONE_E164", "+919015162007")
ALLOWED_ORIGINS   = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
REPORT_EXPIRY     = {"accident": 5, "traffic": 3, "roadblock": 6, "hazard": 4, "contribution": 48}

# ==================================================================
#  ML MODEL LOADING
# ==================================================================
from model_loader import (
    rf_model, rf_scaler, le_target, label_encoders,
    feature_names, lstm_model, TF_OK, get_model_status,
)
from xai import (
    get_feature_importances as _get_fi_from_xai,
    predict_with_xai,
    get_shap_summary,
    FEATURE_DESCRIPTIONS,
)

# ==================================================================
#  HELPER: safe percentage (never NaN)
# ==================================================================
def _pct(numerator, denominator, decimals: int = 1) -> float:
    """Return (numerator / denominator) * 100, or 0.0 on zero/None/NaN."""
    try:
        n = float(numerator or 0)
        d = float(denominator or 0)
        if d == 0 or math.isnan(d) or math.isinf(d):
            return 0.0
        result = (n / d) * 100.0
        if math.isnan(result) or math.isinf(result):
            return 0.0
        return round(result, decimals)
    except Exception:
        return 0.0

# ==================================================================
#  DATABASE
# ==================================================================
DB_PATH = BASE / "intellicrash.db"

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS sos_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT, user_name TEXT, lat REAL, lon REAL,
        severity TEXT, risk_score REAL, message TEXT, address TEXT,
        speed REAL, weather TEXT, timestamp TEXT,
        status TEXT DEFAULT 'active', email_sent INTEGER DEFAULT 0,
        sms_sent INTEGER DEFAULT 0, district TEXT
    );
    CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, phone TEXT, email TEXT, relation TEXT
    );
    CREATE TABLE IF NOT EXISTS community_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT, lat REAL, lon REAL, description TEXT,
        landmark TEXT, road TEXT, severity TEXT,
        injured INTEGER DEFAULT 0, direction TEXT,
        photos TEXT DEFAULT '[]', upvotes INTEGER DEFAULT 0,
        timestamp TEXT, expires_at TEXT,
        reporter TEXT DEFAULT 'Community', status TEXT DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS driver_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_score REAL, risk_score REAL,
        trip_from TEXT, trip_to TEXT,
        distance_km REAL, duration_min REAL,
        avg_speed REAL, timestamp TEXT
    );
    CREATE TABLE IF NOT EXISTS hotspot_learning (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL, lon REAL, grid_key TEXT UNIQUE,
        report_count INTEGER DEFAULT 1,
        avg_severity REAL DEFAULT 2,
        last_updated TEXT, source TEXT DEFAULT 'community'
    );
    CREATE TABLE IF NOT EXISTS news_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT UNIQUE, summary TEXT, url TEXT,
        source TEXT, published_at TEXT, category TEXT DEFAULT 'accident'
    );
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rating INTEGER, comment TEXT,
        trip_from TEXT, trip_to TEXT, user_name TEXT,
        route_accuracy INTEGER, risk_accuracy INTEGER,
        app_ease INTEGER, timestamp TEXT
    );
    CREATE TABLE IF NOT EXISTS behavior_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT, value REAL, severity TEXT,
        lat REAL, lon REAL, timestamp TEXT
    );
    CREATE TABLE IF NOT EXISTS live_tracking (
        share_id TEXT PRIMARY KEY, user_name TEXT,
        lat REAL, lon REAL, speed REAL,
        risk_score REAL, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS gamification (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT DEFAULT 'default',
        points INTEGER DEFAULT 0, level INTEGER DEFAULT 1,
        badges TEXT DEFAULT '[]', streak INTEGER DEFAULT 0,
        total_trips INTEGER DEFAULT 0, safe_trips INTEGER DEFAULT 0,
        last_trip TEXT, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS api_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT, endpoint TEXT, method TEXT,
        status_code INTEGER, duration_ms REAL, timestamp TEXT
    );
    CREATE TABLE IF NOT EXISTS reviews (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name        TEXT    NOT NULL DEFAULT 'Anonymous',
        review_text      TEXT    NOT NULL,
        rating           INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        sentiment        TEXT    NOT NULL DEFAULT 'neutral',
        sentiment_score  REAL    NOT NULL DEFAULT 50.0,
        polarity         REAL    NOT NULL DEFAULT 0.0,
        route            TEXT,
        created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_reports_status ON community_reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_timestamp ON community_reports(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sos_status ON sos_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON driver_sessions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_reviews_sentiment ON reviews(sentiment);
    """)
    if conn.execute("SELECT COUNT(*) FROM emergency_contacts").fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO emergency_contacts (name, phone, email, relation) VALUES (?,?,?,?)",
            [
                ("Admin -- IntelliCrash", ADMIN_PHONE, ADMIN_EMAIL, "Admin"),
                ("HP Emergency",         "112",        "",           "Emergency"),
                ("HP Ambulance",         "108",        "",           "Medical"),
                ("HP Police",            "100",        "",           "Police"),
                ("Shubham (Admin)",      "9015162007", ADMIN_EMAIL,  "Admin"),
            ]
        )
    conn.commit()
    conn.close()

def seed_demo_data():
    conn = get_db()
    if conn.execute("SELECT COUNT(*) FROM community_reports").fetchone()[0] > 0:
        conn.close(); return
    demo_reports = [
        ("accident","severe",31.10297,77.20796,"Vehicle overturned on Dhalli hairpin","Dhalli Bypass","NH-5",2),
        ("accident","moderate",31.55129,76.9005,"Collision at Sundernagar junction","Sundernagar Bus Stand","NH-3",1),
        ("traffic","minor",31.10297,77.169,"Congestion near Shimla entry toll","Shimla Cart Road Entry","NH-5",0),
        ("accident","severe",30.9237,76.798,"Truck overturned Baddi industrial","Baddi Industrial Zone","MDR",3),
        ("roadblock","moderate",32.2396,77.1887,"Snowfall blocking pass","Rohtang Pass Summit","NH-3",0),
        ("hazard","moderate",31.6281,76.9389,"Landslide debris on highway","Balh Bypass Mandi","NH-21",0),
        ("accident","severe",30.4497,77.5666,"Bus accident near Poanta Sahib","Near Poanta Sahib PS","NH-707",4),
        ("traffic","minor",30.898,77.093,"Rush hour Solan town","Solan Town Center","NH-5",0),
        ("accident","moderate",30.909,77.020,"Car crash near Dharampur","Giani Dhaba Dharampur","NH-5",1),
        ("hazard","minor",31.83,77.11,"Thick fog on Mandi road","Mandi-Sundernagar Stretch","NH-3",0),
    ]
    for rtype, sev, lat, lon, desc, landmark, road, injured in demo_reports:
        expiry = (datetime.now() + timedelta(hours=9999)).isoformat()
        conn.execute(
            "INSERT INTO community_reports (type,lat,lon,description,landmark,road,severity,injured,photos,timestamp,expires_at,reporter,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (rtype, lat, lon, desc, landmark, road, sev, injured, "[]", datetime.now().isoformat(), expiry, "IntelliCrash Demo", "active")
        )
    demo_sessions = [
        (88,32,"Mandi","Shimla",148,195,45),
        (72,58,"Shimla","Kullu",210,270,47),
        (95,18,"Sundernagar","Mandi",28,35,48),
        (65,72,"Solan","Baddi",22,30,44),
        (90,28,"Mandi","Sundernagar",28,32,52),
        (80,45,"Shimla","Rampur",110,140,47),
    ]
    for ds,rs,frm,to,dist,dur,spd in demo_sessions:
        conn.execute(
            "INSERT INTO driver_sessions (driver_score,risk_score,trip_from,trip_to,distance_km,duration_min,avg_speed,timestamp) VALUES (?,?,?,?,?,?,?,?)",
            (ds, rs, frm, to, dist, dur, spd, (datetime.now()-timedelta(days=len(demo_sessions))).isoformat())
        )
    demo_reviews = [
        ("Rahul Sharma",   "IntelliCrash warned me about icy roads near Rohtang Pass. Saved my life!", 5, "Manali → Rohtang"),
        ("Priya Thakur",   "Excellent app for HP mountain roads. Risk alerts are very accurate.",        5, "Shimla → Manali"),
        ("Amit Verma",     "SOS feature is very helpful. Notified my family instantly.",                 4, "Mandi → Kullu"),
        ("Sunita Devi",    "Good navigation but sometimes slow to load.",                               3, "Shimla → Solan"),
        ("Vikram Singh",   "The weather warnings saved us from a dangerous landslide zone near Mandi.", 5, "Mandi → Sundernagar"),
        ("Deepak Chauhan", "Hotspot alerts on Baddi road are very useful for daily commute.",            4, "Solan → Baddi"),
    ]
    for uname, rtext, rating, route in demo_reviews:
        result = analyze_sentiment(rtext)
        safe_score    = float(result.get("score", 50.0))
        safe_polarity = float(result.get("polarity", 0.0))
        if math.isnan(safe_score)    or math.isinf(safe_score):    safe_score    = 50.0
        if math.isnan(safe_polarity) or math.isinf(safe_polarity): safe_polarity = 0.0
        conn.execute(
            "INSERT INTO reviews (user_name,review_text,rating,sentiment,sentiment_score,polarity,route,created_at) VALUES (?,?,?,?,?,?,?,?)",
            (uname, rtext, rating, result.get("label","neutral"), safe_score, safe_polarity, route, datetime.now().isoformat())
        )
    conn.commit(); conn.close()
    logger.info("Demo data seeded (including reviews)")

init_db()
seed_demo_data()

# ==================================================================
#  RATE LIMITER
# ==================================================================
os.environ.setdefault("PYTHONUTF8", "1")
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ==================================================================
#  FASTAPI APP
# ==================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    status = get_model_status()
    logger.info(
        f"IntelliCrash API starting — "
        f"RF={status['rf_loaded']} LSTM={status['lstm_loaded']} "
        f"Sentiment={SENTIMENT_OK} Features={status['feature_count']}"
    )
    if status["missing_files"]:
        logger.warning(f"Missing model files: {status['missing_files']}")
    logger.info(f"Admin: {ADMIN_EMAIL} / {ADMIN_PHONE}")
    yield
    logger.info("IntelliCrash API shutting down")

app = FastAPI(
    title="IntelliCrash — HP Road Safety AI",
    description="""
## IntelliCrash: AI Road Safety for Himachal Pradesh
**Contact:** Shubham Abhishek | 9015162007 | shubhamabhi004@gmail.com
""",
    version="4.3.2",
    contact={"name": "Shubham Abhishek", "email": "shubhamabhi004@gmail.com"},
    lifespan=lifespan,
    openapi_tags=[
        {"name": "Health",      "description": "System status and model info"},
        {"name": "Prediction",  "description": "RF+LSTM risk prediction with XAI"},
        {"name": "Analytics",   "description": "Model metrics, feature importances, heatmaps"},
        {"name": "Environment", "description": "Weather, traffic, directions, forecast"},
        {"name": "SOS",         "description": "Emergency SOS — AI + Email + SMS + Hospitals"},
        {"name": "Contacts",    "description": "Emergency contact management"},
        {"name": "Reports",     "description": "Community incident reports with auto-expiry"},
        {"name": "Sessions",    "description": "Trip history and driver scoring"},
        {"name": "Navigation",  "description": "Tolls, fuel, seasonal roads, directions"},
        {"name": "Feedback",    "description": "Post-trip feedback and ratings"},
        {"name": "Reviews",     "description": "User reviews with NLP sentiment analysis"},
        {"name": "Admin",       "description": "Admin dashboard, analytics, exports"},
        {"name": "News",        "description": "HP road safety news (last 12h)"},
        {"name": "Hotspots",    "description": "Hotspot import and management"},
    ],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

try:
    app.mount("/api/static", StaticFiles(directory=str(BASE)), name="static")
except Exception:
    pass

@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    logger.info(f"rid={request_id} {request.method} {request.url.path}  {response.status_code} ({duration}ms)")
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{duration}ms"
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO api_logs (request_id,endpoint,method,status_code,duration_ms,timestamp) VALUES (?,?,?,?,?,?)",
            (request_id, request.url.path, request.method, response.status_code, duration, datetime.now().isoformat())
        )
        conn.commit(); conn.close()
    except Exception:
        pass
    return response

# ==================================================================
#  PYDANTIC MODELS
# ==================================================================
class PredictRequest(BaseModel):
    weather:        str   = Field("0")
    roadType:       str   = Field("1")
    timeOfDay:      str   = Field("1")
    areaType:       str   = Field("0")
    dayOfWeek:      str   = Field("0")
    roadCondition:  str   = Field("0")
    vehicleType:    str   = Field("0")
    lightCondition: str   = Field("0")
    criticalZone:   str   = Field("0")
    speed:          float = Field(50.0, ge=0, le=250)
    vehicles:       float = Field(2.0,  ge=0, le=100)
    visibility:     float = Field(100.0, ge=0, le=1000)

    @field_validator("weather","roadType","timeOfDay","areaType","dayOfWeek",
                     "roadCondition","vehicleType","lightCondition","criticalZone")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if not v.strip().replace(".", "").isdigit():
            raise ValueError(f"Must be a numeric code, got: {v}")
        return v.strip()

class SOSRequest(BaseModel):
    user_name: str   = Field("User", min_length=1, max_length=100)
    lat:       float = Field(31.1048, ge=-90, le=90)
    lon:       float = Field(77.1734, ge=-180, le=180)
    address:   str   = Field("", max_length=500)
    speed:     float = Field(0.0, ge=0, le=300)
    weather:   str   = Field("0")
    roadType:  str   = Field("1")
    timeOfDay: str   = Field("1")
    areaType:  str   = Field("0")
    vehicles:  float = Field(2.0, ge=0)
    message:   str   = Field("", max_length=1000)

class ContactModel(BaseModel):
    name:     str = Field(..., min_length=1, max_length=200)
    phone:    str = Field("", max_length=20)
    email:    str = Field("", max_length=200)
    relation: str = Field("Family", max_length=50)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if v and "@" not in v:
            raise ValueError("Invalid email address")
        return v.lower().strip()

class ReportModel(BaseModel):
    type:        str        = Field("accident")
    lat:         float      = Field(..., ge=29.0, le=34.0)
    lon:         float      = Field(..., ge=75.0, le=79.0)
    description: str        = Field("", max_length=2000)
    landmark:    str        = Field("", max_length=500)
    road:        str        = Field("", max_length=100)
    severity:    str        = Field("moderate")
    injured:     int        = Field(0, ge=0, le=1000)
    direction:   str        = Field("", max_length=200)
    photos:      List[str]  = Field(default_factory=list)
    reporter:    str        = Field("Community", max_length=100)
    parent_id:   Optional[int] = Field(None)

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"accident", "traffic", "roadblock", "hazard", "contribution"}
        if v not in allowed:
            raise ValueError(f"type must be one of {allowed}")
        return v

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        allowed = {"minor", "moderate", "severe"}
        if v not in allowed:
            raise ValueError(f"severity must be one of {allowed}")
        return v

class SessionModel(BaseModel):
    driver_score:  float = Field(80.0, ge=0, le=100)
    risk_score:    float = Field(50.0, ge=0, le=100)
    trip_from:     str   = Field("", max_length=200)
    trip_to:       str   = Field("", max_length=200)
    distance_km:   float = Field(0.0, ge=0, le=10000)
    duration_min:  float = Field(0.0, ge=0, le=5000)
    avg_speed:     float = Field(50.0, ge=0, le=300)

class FeedbackModel(BaseModel):
    rating:         int = Field(..., ge=1, le=5)
    comment:        str = Field("", max_length=2000)
    trip_from:      str = Field("", max_length=200)
    trip_to:        str = Field("", max_length=200)
    user_name:      str = Field("User", max_length=100)
    route_accuracy: int = Field(3, ge=1, le=5)
    risk_accuracy:  int = Field(3, ge=1, le=5)
    app_ease:       int = Field(3, ge=1, le=5)

class BehaviorEvent(BaseModel):
    event_type: str   = Field(...)
    value:      float = Field(..., ge=0)
    lat:        float = Field(31.1048, ge=-90, le=90)
    lon:        float = Field(77.1734, ge=-180, le=180)
    timestamp:  str   = Field("")

    @field_validator("event_type")
    @classmethod
    def validate_event(cls, v: str) -> str:
        if v not in {"brake", "accelerate", "swerve", "speed"}:
            raise ValueError("event_type must be brake/accelerate/swerve/speed")
        return v

class LocationShare(BaseModel):
    share_id:   str   = Field(..., min_length=3, max_length=50)
    user_name:  str   = Field(..., min_length=1, max_length=100)
    lat:        float = Field(..., ge=-90, le=90)
    lon:        float = Field(..., ge=-180, le=180)
    speed:      float = Field(0, ge=0)
    risk_score: float = Field(0, ge=0, le=100)

class ReviewRequest(BaseModel):
    user_name:   str           = Field(default="Anonymous", max_length=60)
    review_text: str           = Field(..., min_length=5, max_length=1000)
    rating:      int           = Field(..., ge=1, le=5)
    route:       Optional[str] = Field(default=None, max_length=120)

class HotspotImportRow(BaseModel):
    lat:       float = Field(..., ge=29.0, le=34.0)
    lon:       float = Field(..., ge=75.0, le=79.0)
    name:      str   = Field("", max_length=200)
    accidents: int   = Field(0, ge=0)
    killed:    int   = Field(0, ge=0)
    district:  str   = Field("", max_length=100)

# ==================================================================
#  RESPONSE SCHEMAS
# ==================================================================
from pydantic import BaseModel as _BM

class HealthResponse(_BM):
    status: str; rf_model: bool; lstm_model: bool
    features: int; db: bool; admin: str; tf_installed: bool

class PredictResponse(_BM):
    severity: str; score: float; rf_score: float
    rf_boosted: float; lstm_score: Optional[float]
    model_used: str; probabilities: Dict[str, float]
    xai_explanation: str; xai_factors: Dict[str, Any]
    boost: float; season: Dict[str, Any]

class SOSResponse(_BM):
    status: str; request_id: str; severity: str
    risk_score: float; district: str
    email_sent: int; admin_notified: bool; sms_sent: bool
    nearby: List[Dict]; whatsapp_url: str; timestamp: str

# ==================================================================
#  iRAD HP 2021-26 FIVE-YEAR HOTSPOT DATASET
# ==================================================================
HP_HOTSPOT_STATIC = [
    (31.10297, 77.20796, "Dhalli–Kufri Stretch",       "Shimla",   28, 8),
    (31.10297, 77.16953, "Sadar Shimla NH-5",           "Shimla",   22, 5),
    (31.11000, 77.14391, "Shimla West Bypass",          "Shimla",   19, 4),
    (31.12700, 77.22800, "Mashobra Bifurcation",        "Shimla",    9, 7),
    (31.32000, 77.42000, "Narkanda Hairpin Bends",      "Shimla",   12, 6),
    (31.20544, 77.74594, "Rohru–Rampur Corridor",       "Shimla",   16, 3),
    (31.55129, 76.90054, "Dhanotu–Sundernagar NH-21",   "Mandi",    24, 4),
    (31.62815, 76.93897, "Balh Valley NH-21",           "Mandi",    17, 6),
    (31.57691, 76.91335, "Ner Chowk Intersection",      "Mandi",    16, 5),
    (31.83000, 77.11000, "Mandi City NH-3",             "Mandi",    11, 4),
    (31.71200, 76.93200, "Mandi–Rewalsar Road",         "Mandi",     8, 3),
    (31.38000, 76.83000, "Swarghat–Bilaspur",           "Mandi",    14, 6),
    (30.89802, 77.09268, "Sadar Solan NH-5",            "Solan",    23, 7),
    (30.92372, 76.79800, "Baddi Industrial Belt",       "Solan",    21, 11),
    (30.91104, 76.83669, "Barotiwala–Baddi Corridor",   "Solan",    18, 5),
    (30.90900, 77.02000, "Dharampur NH-5 Stretch",      "Solan",    15, 9),
    (31.03900, 76.70840, "Nalagarh Bypass",             "Solan",    14, 5),
    (30.92897, 76.81124, "Hotel Classic Junction",      "Solan",     8, 9),
    (32.11489, 76.38818, "Nagrota Bagwan NH-503",       "Kangra",   16, 3),
    (32.09000, 76.11000, "Dharamshala Bypass",          "Kangra",   13, 2),
    (32.22000, 76.32000, "Palampur Hill Road",          "Kangra",   10, 4),
    (32.06200, 75.98000, "Kangra–Jawalamukhi Road",     "Kangra",    9, 3),
    (31.95700, 77.10900, "Kullu–Bhuntar NH-3",          "Kullu",    19, 8),
    (32.23960, 77.18870, "Rohtang Pass Approach",       "Kullu",    15, 7),
    (32.05500, 77.32400, "Manali Approach Bends",       "Kullu",    14, 5),
    (31.90000, 77.19000, "Patlikuhl–Anni Road",         "Kullu",     7, 3),
    (30.44970, 77.56662, "Poanta Sahib NH-7",           "Sirmaur",  15, 4),
    (30.58000, 77.46000, "Renuka–Nahan Road",           "Sirmaur",   9, 3),
    (30.67000, 77.30000, "Pachhad–Rajgarh Stretch",     "Sirmaur",   6, 3),
    (31.47000, 76.27000, "Una Town NH-503",             "Una",      12, 3),
    (31.68000, 76.52000, "Hamirpur Bypass",             "Hamirpur",  8, 2),
    (31.53000, 76.76000, "Bilaspur–Swarghat Road",      "Bilaspur", 11, 5),
    (32.55000, 76.12000, "Chamba–Dalhousie Road",       "Chamba",   11, 5),
    (32.70000, 77.05000, "Keylong Lahaul Stretch",      "Lahaul",    7, 4),
    (31.58000, 78.10000, "Rampur–Reckong Peo NH-5",     "Kinnaur",   9, 5),
    (31.45000, 78.27000, "Karcham–Powari Kinnaur",      "Kinnaur",   8, 6),
    (30.94000, 76.81000, "Baddi EPIP Zone Road",        "Baddi",    18, 7),
    (30.96000, 76.84000, "Nalagarh–Baddi Industrial",   "Baddi",    15, 6),
]

# ==================================================================
#  ML CORE
# ==================================================================
FIELD_MAP = {
    "weather":        "Weather",
    "roadType":       "Road_Type",
    "timeOfDay":      "Time_of_Day",
    "dayOfWeek":      "Day_of_Week",
    "speed":          "Speed_Limit",
    "vehicles":       "Number_of_Vehicles",
    "roadCondition":  "Road_Condition",
    "vehicleType":    "Vehicle_Type",
    "lightCondition": "Light_Condition",
    "areaType":       "Area_Type",
    "criticalZone":   "Critical_Zone",
}

def _run_rf(data: PredictRequest):
    if rf_model is None:
        spd = float(data.speed)
        wx  = int(data.weather)
        base = 30.0
        if spd > 100: base += 25
        elif spd > 80: base += 12
        if wx >= 3: base += 20
        elif wx == 1: base += 8
        if int(data.timeOfDay) == 3: base += 10
        if int(data.criticalZone) == 1: base += 12
        score = min(100.0, base)
        label = "3" if score >= 67 else "2" if score >= 34 else "1"
        return label, score, {"1": 0.33, "2": 0.34, "3": 0.33}
    row = {
        "Weather":            float(data.weather),
        "Road_Type":          float(data.roadType),
        "Time_of_Day":        float(data.timeOfDay),
        "Day_of_Week":        float(data.dayOfWeek),
        "Speed_Limit":        float(data.speed),
        "Number_of_Vehicles": float(data.vehicles),
        "Road_Condition":     float(data.roadCondition),
        "Vehicle_Type":       float(data.vehicleType),
        "Light_Condition":    float(data.lightCondition),
        "Area_Type":          float(data.areaType),
        "Critical_Zone":      float(data.criticalZone),
    }
    df_row  = pd.DataFrame([row])[feature_names]
    X       = rf_scaler.transform(df_row)
    pred    = rf_model.predict(X)[0]
    proba   = rf_model.predict_proba(X)[0]
    classes = rf_model.classes_
    score = 0.0
    for cls, p in zip(classes, proba):
        c = int(cls)
        if   c == 1: score += float(p) * 20.0
        elif c == 2: score += float(p) * 55.0
        elif c == 3: score += float(p) * 90.0
    label      = str(int(pred))
    proba_dict = {str(int(cls)): round(float(p), 4) for cls, p in zip(classes, proba)}
    return label, min(100.0, max(0.0, score)), proba_dict


def _run_lstm(speed: float, wx: int, tod: int) -> Optional[float]:
    if lstm_model is None:
        return None
    try:
        expected_features = lstm_model.input_shape[-1]
        row = [0.0] * expected_features
        row[0] = min(speed / 120.0, 1.0)
        if expected_features > 1: row[1] = min(wx / 4.0, 1.0)
        if expected_features > 2: row[2] = min(tod / 3.0, 1.0)
        win = np.array([[row] * 10], dtype=np.float32)
        out = lstm_model.predict(win, verbose=0)
        sc  = float(np.max(out[0])) * 100 if out.shape[-1] > 1 else float(out[0][0]) * 100
        return max(0.0, min(100.0, sc))
    except Exception as e:
        logger.warning(f"LSTM ERROR: {e}")
        return None


def _hp_calibration(data: PredictRequest) -> float:
    if rf_model is None: return 0.0
    b = 0.0
    spd = float(data.speed)
    if spd > 110: b += 8
    elif spd > 90: b += 4
    if int(data.timeOfDay) == 3 and str(data.roadType) == "1": b += 5
    return b


def _get_season():
    m = datetime.now().month
    seasons = {
        "Winter":      {"months": [11, 12, 1, 2, 3], "boost": 15, "note": "Ice/snow on mountain roads"},
        "Monsoon":     {"months": [7, 8, 9],          "boost": 10, "note": "Landslides, wet roads"},
        "PostMonsoon": {"months": [10],                "boost": 5,  "note": "Road damage repair"},
        "Summer":      {"months": [4, 5, 6],           "boost": 0,  "note": "Normal conditions"},
    }
    for name, data in seasons.items():
        if m in data["months"]: return name, data
    return "Summer", seasons["Summer"]


def _xai_factors(data: PredictRequest, rf_base: float, boost: float) -> Dict:
    spd = float(data.speed)
    f = {}
    if spd > 100: f["Speed_Limit"] = f"{spd:.0f} km/h — HIGH risk factor"
    elif spd > 70: f["Speed_Limit"] = f"{spd:.0f} km/h — MODERATE risk factor"
    else:          f["Speed_Limit"] = f"{spd:.0f} km/h — LOW risk factor"
    f["Weather"] = {
        0: "Clear sky — minimal impact",
        1: "Rain — road surface wet, braking distance increases",
        2: "Fog — visibility reduced significantly",
        3: "Snow/Ice — extremely dangerous on HP mountain roads",
        4: "Storm — driving not recommended",
    }.get(int(data.weather), f"Code {data.weather}")
    f["Time_of_Day"] = {
        0: "Morning (5–9 AM) — low traffic",
        1: "Day (9–5 PM) — normal conditions",
        2: "Evening (5–8 PM) — peak traffic, fatigue starts",
        3: "Night (8 PM–5 AM) — highest risk, limited visibility",
    }.get(int(data.timeOfDay), f"Code {data.timeOfDay}")
    f["Road_Condition"] = {
        0: "Dry — normal stopping distance",
        1: "Wet — 2× stopping distance",
        2: "Icy — 4× stopping distance (HP winter hazard)",
        3: "Under repair — reduced width, uneven surface",
    }.get(int(data.roadCondition), "Unknown")
    f["Critical_Zone"] = (
        "YES — iRAD 2021-26 confirmed accident hotspot. Extra caution required."
        if int(data.criticalZone) == 1 else "No hotspot at this location"
    )
    f["Light_Condition"] = (
        "Dark / No street lighting — major risk on HP mountain roads"
        if int(data.lightCondition) == 1 else "Good visibility conditions"
    )
    f["RF_Base_Score"]   = f"{rf_base:.1f} / 100"
    f["HP_Calibration"]  = f"+{boost:.1f} (mountain edge case adjustment)"
    if rf_model is not None and feature_names:
        try:
            top = sorted(zip(feature_names, rf_model.feature_importances_), key=lambda x: -x[1])[:3]
            f["Top_RF_Features"] = " | ".join(f"{k} ({v*100:.0f}%)" for k, v in top)
        except Exception:
            pass
    return f


def _xai_text(data: PredictRequest, score: float) -> str:
    parts = []
    wx, tod, spd = int(data.weather), int(data.timeOfDay), float(data.speed)
    if wx > 0: parts.append({1: "rain", 2: "fog", 3: "snow/ice", 4: "storm"}.get(wx, f"weather {wx}"))
    if tod == 3: parts.append("night driving")
    elif tod == 2: parts.append("evening")
    if spd > 100: parts.append(f"very high speed {spd:.0f} km/h")
    elif spd > 80: parts.append(f"high speed {spd:.0f} km/h")
    if int(data.roadCondition) > 0: parts.append({1: "wet road", 2: "icy road", 3: "road repair"}.get(int(data.roadCondition), ""))
    if int(data.criticalZone) == 1: parts.append("iRAD 2021-26 accident hotspot")
    if int(data.lightCondition) == 1: parts.append("dark/unlit road")
    if not parts: return f"Road conditions appear relatively safe. RF score: {score:.1f}/100."
    return f"Risk elevated due to: {', '.join(p for p in parts if p)}. Score: {score:.1f}/100."


# ==================================================================
#  SOS HELPERS
# ==================================================================
HP_DISTRICT_OFFICIALS = {
    "Shimla":   {"sp": "sp.shimla@hppolice.gov.in",   "dm": "dc.shimla@hp.gov.in"},
    "Mandi":    {"sp": "sp.mandi@hppolice.gov.in",    "dm": "dc.mandi@hp.gov.in"},
    "Kullu":    {"sp": "sp.kullu@hppolice.gov.in",    "dm": "dc.kullu@hp.gov.in"},
    "Solan":    {"sp": "sp.solan@hppolice.gov.in",    "dm": "dc.solan@hp.gov.in"},
    "Kangra":   {"sp": "sp.kangra@hppolice.gov.in",   "dm": "dc.kangra@hp.gov.in"},
    "Sirmaur":  {"sp": "sp.sirmaur@hppolice.gov.in",  "dm": "dc.sirmaur@hp.gov.in"},
    "Bilaspur": {"sp": "sp.bilaspur@hppolice.gov.in", "dm": "dc.bilaspur@hp.gov.in"},
    "Hamirpur": {"sp": "sp.hamirpur@hppolice.gov.in", "dm": "dc.hamirpur@hp.gov.in"},
    "UNA":      {"sp": "sp.una@hppolice.gov.in",      "dm": "dc.una@hp.gov.in"},
    "Chamba":   {"sp": "sp.chamba@hppolice.gov.in",   "dm": "dc.chamba@hp.gov.in"},
}

HP_SEASONAL_ROADS = [
    {"name": "Rohtang Pass",        "lat": 32.2396, "lon": 77.1887, "open_months": [5,6,7,8,9,10], "elev": "3978m", "alt": "Atal Tunnel"},
    {"name": "Spiti (Pin-Parvati)", "lat": 31.9,    "lon": 77.6,    "open_months": [6,7,8,9],       "elev": "4550m", "alt": "Via Shimla"},
    {"name": "Jalori Pass",         "lat": 31.5,    "lon": 77.4,    "open_months": [4,5,6,7,8,9,10],"elev": "3120m", "alt": "Via NH"},
    {"name": "Baralacha Pass",      "lat": 32.7,    "lon": 77.8,    "open_months": [6,7,8,9],        "elev": "4890m", "alt": "None"},
    {"name": "Kunzum Pass",         "lat": 32.0,    "lon": 77.8,    "open_months": [6,7,8,9],        "elev": "4590m", "alt": "Atal Tunnel"},
]

HP_TOLLS = [
    {"id": "t1", "lat": 30.839, "lon": 76.963, "name": "Parwanoo Toll",    "highway": "NH-5",  "fee_car": 65,  "fee_truck": 200},
    {"id": "t2", "lat": 31.370, "lon": 76.830, "name": "Swarghat Toll",    "highway": "NH-21", "fee_car": 55,  "fee_truck": 180},
    {"id": "t3", "lat": 31.711, "lon": 76.932, "name": "Mandi Bypass",     "highway": "NH-3",  "fee_car": 45,  "fee_truck": 150},
    {"id": "t4", "lat": 31.958, "lon": 77.110, "name": "Kullu Toll",       "highway": "NH-3",  "fee_car": 60,  "fee_truck": 190},
    {"id": "t5", "lat": 30.909, "lon": 77.095, "name": "Solan Toll",       "highway": "NH-5",  "fee_car": 60,  "fee_truck": 190},
    {"id": "t6", "lat": 31.039, "lon": 76.709, "name": "Nalagarh Toll",    "highway": "NH-21", "fee_car": 55,  "fee_truck": 175},
    {"id": "t7", "lat": 32.219, "lon": 76.322, "name": "Dharamshala Toll", "highway": "NH-20", "fee_car": 50,  "fee_truck": 160},
    {"id": "t8", "lat": 31.449, "lon": 77.648, "name": "Rampur Toll",      "highway": "NH-5",  "fee_car": 70,  "fee_truck": 220},
]


def _get_district(lat: float, lon: float) -> str:
    if lat > 32.5: return "Chamba"
    if lat > 32.0 and lon < 77.0: return "Kullu"
    if lat > 32.0: return "Kangra"
    if lat > 31.5 and lon < 77.0: return "Mandi"
    if lat > 31.3 and lon > 77.5: return "Kinnaur"
    if lat > 31.0 and lon < 77.0: return "Bilaspur"
    if lat > 31.0 and lon > 77.0: return "Shimla"
    if lat > 30.7 and lon < 77.2: return "Solan"
    if lat < 30.6: return "Sirmaur"
    return "Shimla"


def _get_ip_location():
    for url in ["https://ipapi.co/json/", "https://ip-api.com/json/"]:
        try:
            r = requests.get(url, timeout=5)
            d = r.json()
            return float(d.get("latitude", d.get("lat", 31.1048))), \
                   float(d.get("longitude", d.get("lon", 77.1734))), \
                   f"IP location: {d.get('city', 'HP')}"
        except: continue
    return 31.1048, 77.1734, "Default: Shimla HP"


def _send_sos_email(to, user, lat, lon, sev, score, addr, speed=0, is_admin=False) -> bool:
    if not GMAIL_USER or not GMAIL_PASS or "@" not in GMAIL_USER:
        logger.warning("Gmail not configured"); return False
    try: socket.setdefaulttimeout(5); socket.getaddrinfo("smtp.gmail.com", 465)
    except Exception as e: logger.warning(f"No internet for email: {e}"); return False
    sev_color = "#ef4444" if str(sev) == "3" else "#f97316" if str(sev) == "2" else "#22c55e"
    sev_label = "HIGH" if str(sev) == "3" else "MEDIUM" if str(sev) == "2" else "LOW"
    maps_url  = f"https://maps.google.com/?q={lat},{lon}"
    admin_note = (
        f'<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:10px;margin-bottom:14px;border-radius:4px">'
        f'<b>ADMIN ALERT</b><br>User: <b>{user}</b> | Speed: {speed:.0f}km/h<br>'
        f'<a href="https://wa.me/{ADMIN_WA}?text=SOS+{user}+at+{lat:.4f},{lon:.4f}">WhatsApp user</a></div>'
    ) if is_admin else ""
    html = f"""<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8faff;border-radius:16px;overflow:hidden">
<div style="background:linear-gradient(135deg,#ea4335,#c62828);padding:24px;text-align:center">
  <h1 style="color:#fff;margin:0;font-size:22px">IntelliCrash SOS ALERT</h1>
</div>
<div style="padding:20px">{admin_note}
<div style="background:#fff;border-radius:10px;padding:16px;margin-bottom:14px;border:1px solid #e3eaf5">
  <b>{user}</b><br>
  <span style="color:#6b7a99;font-size:12px">GPS: {lat:.6f}, {lon:.6f} | Speed: {speed:.0f} km/h</span><br>
  <span style="font-size:12px">{addr or "See GPS coordinates"}</span>
</div>
<div style="background:{sev_color}20;border:2px solid {sev_color};border-radius:10px;padding:14px;text-align:center;margin-bottom:14px">
  <div style="font-size:36px;font-weight:900;color:{sev_color}">{score:.1f}/100</div>
  <div style="font-size:16px;font-weight:700;color:{sev_color}">{sev_label}</div>
</div>
<a href="{maps_url}" style="display:block;background:#1a73e8;color:#fff;padding:12px;border-radius:8px;text-decoration:none;text-align:center;font-weight:700">Google Maps</a>
</div></div>"""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"SOS — {user} | {sev_label} {score:.0f}/100 | IntelliCrash"
    msg["From"] = GMAIL_USER; msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    for port, method in [(465, "SSL"), (587, "TLS")]:
        try:
            if method == "SSL":
                with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as s:
                    s.login(GMAIL_USER, GMAIL_PASS); s.sendmail(GMAIL_USER, to, msg.as_string())
            else:
                with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as s:
                    s.ehlo(); s.starttls(); s.login(GMAIL_USER, GMAIL_PASS); s.sendmail(GMAIL_USER, to, msg.as_string())
            logger.info(f"Email sent → {to}"); return True
        except Exception as e: logger.warning(f"Email port {port} fail: {e}")
    return False


def _send_sms(to: str, body: str) -> bool:
    if not TWILIO_SID or not TWILIO_TOKEN: return False
    try: socket.setdefaulttimeout(5); socket.getaddrinfo("api.twilio.com", 443)
    except Exception as e: logger.warning(f"No internet for SMS: {e}"); return False
    try:
        try:
            from twilio.rest import Client
            Client(TWILIO_SID, TWILIO_TOKEN).messages.create(body=body, from_=TWILIO_FROM, to=to)
        except ImportError:
            import base64
            auth = base64.b64encode(f"{TWILIO_SID}:{TWILIO_TOKEN}".encode()).decode()
            r = requests.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json",
                data={"From": TWILIO_FROM, "To": to, "Body": body},
                headers={"Authorization": f"Basic {auth}"}, timeout=10
            )
            if r.status_code not in (200, 201):
                logger.warning(f"SMS HTTP {r.status_code}: {r.text[:100]}"); return False
        logger.info(f"SMS sent → {to}"); return True
    except Exception as e: logger.warning(f"SMS error: {e}"); return False


def _get_nearby_emergency(lat: float, lon: float) -> list:
    STATIC = [
        {"name": "IGMC Shimla",          "type": "hospital", "lat": 31.1048, "lon": 77.1734, "phone": "0177-2804251"},
        {"name": "DDU Hospital Shimla",  "type": "hospital", "lat": 31.0995, "lon": 77.1661, "phone": "0177-2650685"},
        {"name": "Zonal Hospital Mandi", "type": "hospital", "lat": 31.7088, "lon": 76.9330, "phone": "01905-222170"},
        {"name": "RH Sundernagar",       "type": "hospital", "lat": 31.5349, "lon": 76.9009, "phone": "01907-262080"},
        {"name": "District Hosp. Kullu", "type": "hospital", "lat": 31.9578, "lon": 77.1095, "phone": "01902-222069"},
        {"name": "HP Police CR (112)",   "type": "police",   "lat": 31.1048, "lon": 77.1734, "phone": "112"},
        {"name": "HP Ambulance (108)",   "type": "hospital", "lat": 31.1048, "lon": 77.1734, "phone": "108"},
        {"name": f"Admin ({ADMIN_PHONE})", "type": "police", "lat": lat,     "lon": lon,     "phone": ADMIN_PHONE},
    ]
    q = f'[out:json][timeout:6];(node["amenity"~"hospital|clinic|police|fire_station"](around:8000,{lat},{lon}););out body 10;'
    for mirror in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]:
        try:
            r  = requests.post(mirror, data={"data": q}, timeout=7)
            el = r.json().get("elements", [])
            if el:
                return [{"name": e.get("tags", {}).get("name", "Unknown"),
                         "type": e.get("tags", {}).get("amenity", "unknown"),
                         "lat":  e.get("lat"), "lon": e.get("lon"),
                         "phone": e.get("tags", {}).get("phone", "")} for e in el[:8]]
        except: continue
    return sorted(STATIC, key=lambda h: math.sqrt((h["lat"]-lat)**2 + (h["lon"]-lon)**2))[:6]


def _learn_hotspot(lat: float, lon: float, severity: str):
    gk   = f"{round(lat, 2)}_{round(lon, 2)}"
    conn = get_db()
    sn   = {"minor": 1, "moderate": 2, "severe": 3}.get(severity, 2)
    ex   = conn.execute("SELECT * FROM hotspot_learning WHERE grid_key=?", (gk,)).fetchone()
    if ex:
        nc = ex["report_count"] + 1
        na = (ex["avg_severity"] * ex["report_count"] + sn) / nc
        conn.execute(
            "UPDATE hotspot_learning SET report_count=?,avg_severity=?,last_updated=?,source='community+db' WHERE grid_key=?",
            (nc, na, datetime.now().isoformat(), gk)
        )
    else:
        conn.execute(
            "INSERT INTO hotspot_learning(lat,lon,grid_key,report_count,avg_severity,last_updated) VALUES(?,?,?,1,?,?)",
            (lat, lon, gk, sn, datetime.now().isoformat())
        )
    conn.commit(); conn.close()


# ==================================================================
#  ROUTES
# ==================================================================

@app.get("/", tags=["Health"])
def root():
    ms = get_model_status()
    return {
        "service": "IntelliCrash API", "version": "4.3.2",
        "rf": ms["rf_loaded"], "lstm": ms["lstm_loaded"],
        "sentiment": SENTIMENT_OK,
        "docs": "/docs", "admin": ADMIN_EMAIL,
        "hotspots": len(HP_HOTSPOT_STATIC), "dataset": "iRAD 2021-26 HP",
    }

@app.get("/api/health", tags=["Health"], response_model=HealthResponse)
def health():
    ms = get_model_status()
    return {
        "status": "ok", "rf_model": ms["rf_loaded"],
        "lstm_model": ms["lstm_loaded"], "features": ms["feature_count"],
        "db": DB_PATH.exists(), "admin": ADMIN_EMAIL, "tf_installed": TF_OK,
    }

@app.get("/api/model/status", tags=["Health"])
def model_status_route():
    return get_model_status()

@app.post("/api/predict", tags=["Prediction"], response_model=PredictResponse)
@limiter.limit("60/minute")
def predict(data: PredictRequest, request: Request):
    try:
        label, rf_score, proba = _run_rf(data)
        lstm_score = _run_lstm(float(data.speed), int(data.weather), int(data.timeOfDay))
        boost      = _hp_calibration(data)
        rb         = min(100.0, rf_score + boost)
        season, sdata  = _get_season()
        seasonal_boost = sdata["boost"]
        if lstm_score is not None:
            final      = round(0.70 * rb + 0.30 * lstm_score + seasonal_boost * 0.3, 2)
            model_used = "RF+LSTM Ensemble"
        else:
            final      = round(rb + seasonal_boost * 0.3, 2)
            model_used = "Random Forest" if rf_model is not None else "Rule-Based Fallback"
        risk_boost = 0; risk_count = 0
        spd = data.speed
        if spd > 100:   risk_boost += 20; risk_count += 1
        elif spd > 80:  risk_boost += 10; risk_count += 1
        wx = int(data.weather)
        if wx >= 3:     risk_boost += 20; risk_count += 1
        elif wx == 1:   risk_boost += 8
        if int(data.timeOfDay) == 3: risk_boost += 10; risk_count += 1
        if data.vehicles > 15:  risk_boost += 15; risk_count += 1
        elif data.vehicles > 8: risk_boost += 6
        if int(data.roadCondition) in (2, 3): risk_boost += 15; risk_count += 1
        if int(data.lightCondition) == 1:     risk_boost += 8
        if int(data.criticalZone) == 1:       risk_boost += 12; risk_count += 1
        if risk_count >= 4:   risk_boost = int(risk_boost * 1.5)
        elif risk_count >= 2: risk_boost = int(risk_boost * 1.2)
        final = min(100.0, final + risk_boost)
        sl = "3" if final >= 67 else "2" if final >= 34 else "1"
        return {
            "severity":        sl,
            "score":           final,
            "rf_score":        round(rf_score, 2),
            "rf_boosted":      round(rb, 2),
            "lstm_score":      round(lstm_score, 2) if lstm_score is not None else None,
            "model_used":      model_used,
            "probabilities":   proba,
            "xai_explanation": _xai_text(data, final),
            "xai_factors":     _xai_factors(data, rf_score, boost),
            "boost":           round(boost, 2),
            "season":          {"name": season, "boost": seasonal_boost, "note": sdata["note"]},
        }
    except Exception as e:
        logger.error(f"Predict error: {traceback.format_exc()}")
        raise HTTPException(500, f"Prediction failed: {str(e)}")

@app.get("/api/metrics", tags=["Analytics"])
def get_metrics():
    m = {}
    pp = BASE / "best_parameters.json"
    if pp.exists():
        try:
            p = json.load(open(pp))
            m.update({
                "Accuracy":             str(round(p.get("test_accuracy", p.get("accuracy", 0.94)), 4)),
                "F1 Score (Weighted)":  str(round(p.get("f1_weighted",   p.get("f1", 0.91)), 4)),
                "Precision":            str(round(p.get("precision", 0.93), 4)),
                "Recall":               str(round(p.get("recall", 0.94), 4)),
                "Mean CV F1 Score":     str(round(p.get("cv_f1_mean", p.get("cv_score", 0.89)), 4)),
                "Training Samples":     str(p.get("n_samples", p.get("training_samples", 20000))),
            })
        except Exception as e: logger.warning(f"Metrics parse: {e}")
    conn = get_db()
    m["SOS Alerts"]       = str(conn.execute("SELECT COUNT(*) FROM sos_alerts").fetchone()[0])
    m["Active Reports"]   = str(conn.execute("SELECT COUNT(*) FROM community_reports WHERE status='active'").fetchone()[0])
    m["Driver Sessions"]  = str(conn.execute("SELECT COUNT(*) FROM driver_sessions").fetchone()[0])
    avg = conn.execute("SELECT AVG(driver_score) FROM driver_sessions").fetchone()[0]
    m["Avg Driver Score"] = str(round(avg or 0, 1))
    conn.close()
    m.setdefault("Accuracy", "0.9400")
    m.setdefault("F1 Score (Weighted)", "0.9100")
    m.setdefault("Training Samples", "20000")
    return {"metrics": m}

@app.get("/api/stats", tags=["Analytics"])
def get_stats():
    return get_metrics()

@app.get("/api/feature_importances", tags=["Analytics"])
def get_fi():
    if rf_model is None:
        fi = {f: 0.0 for f in feature_names}
        return {
            "feature_importances": fi,
            "importances":         fi,
            "ranked":              [[f, 0.0] for f in feature_names],
            "note":                "RF model not loaded — place .pkl files in python/ folder",
            "rf_loaded":           False,
        }
    result = _get_fi_from_xai()
    if "error" in result:
        fi = {f: 0.0 for f in feature_names}
        return {"feature_importances": fi, "importances": fi, "ranked": [], "note": result["error"], "rf_loaded": False}
    result["feature_importances"] = result.get("importances", {})
    result["rf_loaded"] = True
    return result

@app.get("/api/xai/shap", tags=["Analytics"])
def get_shap():
    return get_shap_summary()

@app.post("/api/xai/explain", tags=["Analytics"])
@limiter.limit("30/minute")
def explain_prediction(data: PredictRequest, request: Request):
    input_features = {
        "Weather":            float(data.weather),
        "Road_Type":          float(data.roadType),
        "Time_of_Day":        float(data.timeOfDay),
        "Day_of_Week":        float(data.dayOfWeek),
        "Speed_Limit":        float(data.speed),
        "Number_of_Vehicles": float(data.vehicles),
        "Road_Condition":     float(data.roadCondition),
        "Vehicle_Type":       float(data.vehicleType),
        "Light_Condition":    float(data.lightCondition),
        "Area_Type":          float(data.areaType),
        "Critical_Zone":      float(data.criticalZone),
    }
    return predict_with_xai(input_features)

@app.get("/api/weather", tags=["Environment"])
def get_weather(lat: float, lon: float):
    try:
        r = requests.get("https://api.open-meteo.com/v1/forecast", params={
            "latitude": lat, "longitude": lon,
            "current": ["temperature_2m","windspeed_10m","weathercode","precipitation","visibility"],
            "timezone": "Asia/Kolkata",
        }, timeout=8)
        d   = r.json(); cur = d.get("current", {}); code = cur.get("weathercode", 0)
        WMO = {0:"Clear",1:"Clear",2:"Partly Cloudy",3:"Overcast",45:"Fog",48:"Fog",
               51:"Drizzle",53:"Drizzle",55:"Drizzle",61:"Rain",63:"Rain",65:"Heavy Rain",
               71:"Snow",73:"Snow",75:"Heavy Snow",80:"Showers",85:"Snow Showers",95:"Thunderstorm"}
        return {
            "temp_c":      round(cur.get("temperature_2m", 15), 1),
            "wind_kph":    round(cur.get("windspeed_10m", 10), 1),
            "description": WMO.get(code, "Clear"),
            "rain":        code in [51,53,55,61,63,65,80],
            "snow":        code in [71,73,75,85],
            "fog":         code in [45,48],
            "humidity":    60,
            "visibility":  200 if code in [45,48] else (500 if code in [51,53,55,61,63,65,80] else 10000),
            "source":      "OpenMeteo",
        }
    except Exception as e: logger.warning(f"Weather: {e}")
    return {"temp_c":15,"wind_kph":10,"description":"Clear","rain":False,"snow":False,"fog":False,"visibility":10000,"source":"fallback"}

@app.get("/api/weather/forecast", tags=["Environment"])
def get_forecast(lat: float = 31.1048, lon: float = 77.1734):
    try:
        r = requests.get("https://api.open-meteo.com/v1/forecast", params={
            "latitude": lat, "longitude": lon,
            "daily": ["weathercode","temperature_2m_max","temperature_2m_min",
                      "precipitation_sum","windspeed_10m_max","snowfall_sum"],
            "timezone": "Asia/Kolkata", "forecast_days": 3,
        }, timeout=10)
        d = r.json(); daily = d.get("daily", {})
        WMO = {0:"Clear",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",
               61:"Slight rain",63:"Moderate rain",65:"Heavy rain",71:"Slight snow",
               73:"Moderate snow",75:"Heavy snow",80:"Showers",95:"Thunderstorm"}
        days = []
        for i, dt in enumerate(daily.get("time", [])[:3]):
            code = (daily.get("weathercode") or [])[i] if i < len(daily.get("weathercode") or []) else 0
            rb   = 22 if code >= 71 else 14 if code >= 61 else 10 if code >= 45 else 0
            days.append({
                "date": dt, "description": WMO.get(code, "Unknown"), "code": code,
                "temp_max":    (daily.get("temperature_2m_max") or [])[i] if i < len(daily.get("temperature_2m_max") or []) else 0,
                "temp_min":    (daily.get("temperature_2m_min") or [])[i] if i < len(daily.get("temperature_2m_min") or []) else 0,
                "rain_mm":     round((daily.get("precipitation_sum") or [])[i] if i < len(daily.get("precipitation_sum") or []) else 0, 1),
                "snow_mm":     round((daily.get("snowfall_sum") or [])[i]      if i < len(daily.get("snowfall_sum") or []) else 0, 1),
                "wind_kph":    round((daily.get("windspeed_10m_max") or [])[i] if i < len(daily.get("windspeed_10m_max") or []) else 0, 1),
                "risk_boost":  rb,
                "drive_advice": "Avoid driving" if rb >= 22 else "Drive carefully" if rb >= 10 else "Safe to drive",
            })
        return {"forecast": days}
    except Exception as e:
        logger.warning(f"Forecast: {e}"); return {"forecast": [], "error": str(e)}

@app.get("/api/directions", tags=["Navigation"])
def get_directions(from_lat: float, from_lon: float, to_lat: float, to_lon: float, mode: str = "driving"):
    profile = "foot" if mode == "walking" else "bike" if mode == "bike" else "car"
    url = f"https://router.project-osrm.org/route/v1/{profile}/{from_lon},{from_lat};{to_lon},{to_lat}?steps=true&geometries=geojson&overview=full"
    try:
        r = requests.get(url, timeout=12); d = r.json()
        if d.get("code") != "Ok": return {"error": "No route found", "steps": []}
        route = d["routes"][0]; steps = []
        for leg in route.get("legs", []):
            for step in leg.get("steps", []):
                m   = step.get("maneuver", {}); mt = m.get("type", ""); mod = m.get("modifier", "")
                if mt == "depart":     instr = f"Head {mod} on {step.get('name','road')}"
                elif mt == "arrive":   instr = "You have arrived"
                elif mt == "turn":     instr = f"Turn {mod} onto {step.get('name','road')}"
                elif mt == "roundabout": instr = f"Take roundabout exit {m.get('exit','')}"
                elif mt in ("merge","continue"): instr = f"{mt.title()} on {step.get('name','road')}"
                else: instr = f"{mt} {mod}".strip().title()
                steps.append({
                    "instruction": instr, "distance_m": round(step.get("distance", 0)),
                    "duration_s":  round(step.get("duration", 0)), "type": mt, "modifier": mod,
                    "name": step.get("name", ""),
                    "lat":  m.get("location", [0, 0])[1],
                    "lon":  m.get("location", [0, 0])[0],
                })
        return {
            "steps": steps, "distance_km": round(route.get("distance", 0) / 1000, 2),
            "duration_min": round(route.get("duration", 0) / 60, 1),
            "geometry": route.get("geometry"),
        }
    except Exception as e:
        logger.warning(f"Directions: {e}"); return {"error": str(e), "steps": []}

@app.get("/api/seasonal/roads", tags=["Navigation"])
def get_seasonal_roads():
    m = datetime.now().month
    return {"roads": [{**r, "is_open": m in r["open_months"], "status": "OPEN" if m in r["open_months"] else "CLOSED"} for r in HP_SEASONAL_ROADS], "month": m}

@app.get("/api/seasonal/risk", tags=["Prediction"])
def get_seasonal_risk():
    season, data = _get_season()
    return {"season": season, "boost": data["boost"], "note": data["note"], "month": datetime.now().month}

@app.get("/api/tolls", tags=["Navigation"])
def get_tolls(lat: float = None, lon: float = None):
    if lat and lon:
        return {"tolls": sorted(HP_TOLLS, key=lambda t: math.sqrt((t["lat"]-lat)**2 + (t["lon"]-lon)**2))[:5]}
    return {"tolls": HP_TOLLS}

@app.get("/api/fuel", tags=["Navigation"])
def get_fuel(lat: float = 31.1048, lon: float = 77.1734):
    STATIC = [
        {"name":"HP Petrol Pump Shimla","lat":31.108,"lon":77.171,"price_petrol":103.5},
        {"name":"IOC Pump Mandi",       "lat":31.712,"lon":76.930,"price_petrol":103.2},
        {"name":"BPCL Kullu",           "lat":31.955,"lon":77.108,"price_petrol":103.8},
    ]
    q = f'[out:json][timeout:6];(node["amenity"="fuel"](around:10000,{lat},{lon}););out body 8;'
    for mirror in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]:
        try:
            r  = requests.post(mirror, data={"data": q}, timeout=4)
            el = r.json().get("elements", [])
            if el:
                return {"stations": [{"name": e.get("tags",{}).get("name","Fuel Station"),
                                       "lat": e.get("lat"), "lon": e.get("lon"),
                                       "brand": e.get("tags",{}).get("brand",""),
                                       "price_petrol": 103.5} for e in el[:8]], "source": "osm"}
        except: continue
    return {"stations": sorted(STATIC, key=lambda s: math.sqrt((s["lat"]-lat)**2+(s["lon"]-lon)**2))[:3], "source": "static"}

@app.get("/api/news", tags=["News"])
def get_news():
    conn   = get_db()
    cutoff = (datetime.now() - timedelta(hours=12)).isoformat()
    cached = conn.execute("SELECT * FROM news_cache WHERE published_at>? ORDER BY published_at DESC LIMIT 20", (cutoff,)).fetchall()
    if cached: conn.close(); return {"news": [dict(r) for r in cached], "source": "cache"}
    items = []
    for feed in ["https://www.tribuneindia.com/rss/himachal-pradesh.xml", "https://himachalabhi.com/feed/"]:
        try:
            r      = requests.get(feed, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
            titles = re.findall(r'<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>', r.text)
            links  = re.findall(r'<link>(https?://[^<]+)</link>', r.text)
            descs  = re.findall(r'<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>', r.text, re.DOTALL)
            dates  = re.findall(r'<pubDate>(.*?)</pubDate>', r.text)
            kws    = ["accident","road","crash","highway","shimla","mandi","kullu","hp","himachal","killed","injured","vehicle","collision","traffic"]
            for i, title in enumerate(titles[1:15], 0):
                tc = re.sub(r'<[^>]+>', '', title).strip()
                if not any(k in tc.lower() for k in kws): continue
                dc  = re.sub(r'<[^>]+>', '', descs[i+1] if i+1 < len(descs) else "").strip()[:200]
                lk  = links[i+1] if i+1 < len(links) else feed
                pub = dates[i] if i < len(dates) else datetime.now().isoformat()
                try: pub_dt = datetime.strptime(pub.strip(), "%a, %d %b %Y %H:%M:%S %z").replace(tzinfo=None).isoformat()
                except: pub_dt = datetime.now().isoformat()
                if pub_dt < cutoff: continue
                items.append({"title": tc, "summary": dc, "url": lk, "source": feed.split("/")[2], "published_at": pub_dt, "category": "accident"})
                conn.execute("INSERT OR IGNORE INTO news_cache(title,summary,url,source,published_at,category) VALUES(?,?,?,?,?,?)", (tc, dc, lk, feed.split("/")[2], pub_dt, "accident"))
        except Exception as e: logger.warning(f"News {feed}: {e}")
    conn.commit(); conn.close()
    return {"news": items[:12], "source": "live"}

@app.get("/api/hotspots/dynamic", tags=["Analytics"])
def dynamic_hotspots():
    conn    = get_db()
    learned = conn.execute("SELECT lat,lon,grid_key,report_count,avg_severity,last_updated,source FROM hotspot_learning WHERE report_count>=2 ORDER BY avg_severity DESC,report_count DESC LIMIT 30").fetchall()
    recent  = conn.execute(
        "SELECT lat,lon,COUNT(*) as cnt,AVG(CASE severity WHEN 'severe' THEN 3 WHEN 'moderate' THEN 2 ELSE 1 END) as avg_sev FROM community_reports WHERE timestamp>? AND status='active' GROUP BY ROUND(lat,2),ROUND(lon,2) HAVING cnt>=1",
        ((datetime.now() - timedelta(hours=24)).isoformat(),)
    ).fetchall()
    conn.close()
    result = []
    for r in learned:
        risk = "HIGH" if r["avg_severity"] >= 2.5 else "MEDIUM" if r["avg_severity"] >= 1.5 else "LOW"
        result.append({"lat": r["lat"], "lon": r["lon"], "count": r["report_count"],
                        "avg_severity": r["avg_severity"], "risk": risk, "source": r["source"], "type": "learned"})
    for r in recent:
        result.append({"lat": r["lat"], "lon": r["lon"], "count": r["cnt"],
                        "avg_severity": r["avg_sev"],
                        "risk": "HIGH" if r["avg_sev"] >= 2.5 else "MEDIUM", "type": "recent"})
    return {"hotspots": result, "count": len(result)}

@app.post("/api/hotspots/import", tags=["Hotspots"])
async def import_hotspots_csv(request: Request):
    imported = 0; skipped = 0; errors = []
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        from fastapi import UploadFile, File
        form  = await request.form()
        file  = form.get("file") or form.get("csv")
        if file is None:
            raise HTTPException(400, "No file field found in form. Use field name 'file' or 'csv'.")
        raw = await file.read()
        text = raw.decode("utf-8-sig", errors="replace")
    else:
        body = await request.body()
        text = body.decode("utf-8-sig", errors="replace")
    if not text.strip():
        raise HTTPException(400, "Empty CSV body")
    reader = csv.DictReader(io.StringIO(text))
    required_cols = {"lat", "lon"}
    if reader.fieldnames is None:
        raise HTTPException(400, "Could not parse CSV headers")
    actual_cols = {c.strip().lower() for c in reader.fieldnames}
    if not required_cols.issubset(actual_cols):
        raise HTTPException(400, f"CSV must have at least: lat,lon. Got: {list(reader.fieldnames)}")
    conn = get_db()
    try:
        for i, row in enumerate(reader, start=2):
            try:
                lat       = float(row.get("lat", "").strip())
                lon       = float(row.get("lon", "").strip())
                name      = row.get("name", "").strip()[:200]
                accidents = int(row.get("accidents", 0) or 0)
                killed    = int(row.get("killed", 0) or 0)
                district  = row.get("district", "").strip()[:100]
                if not (29.0 <= lat <= 34.0 and 75.0 <= lon <= 79.0):
                    skipped += 1; errors.append(f"Row {i}: out of HP bounds"); continue
                gk      = f"{round(lat, 2)}_{round(lon, 2)}"
                avg_sev = min(3.0, max(1.0, 1.0 + killed * 0.5))
                existing = conn.execute("SELECT id, report_count, avg_severity FROM hotspot_learning WHERE grid_key=?", (gk,)).fetchone()
                if existing:
                    nc = existing["report_count"] + accidents
                    na = (existing["avg_severity"] * existing["report_count"] + avg_sev * accidents) / max(nc, 1)
                    conn.execute("UPDATE hotspot_learning SET report_count=?, avg_severity=?, last_updated=?, source=? WHERE grid_key=?",
                                 (nc, round(na, 2), datetime.now().isoformat(), "csv_import", gk))
                else:
                    conn.execute("INSERT INTO hotspot_learning (lat, lon, grid_key, report_count, avg_severity, last_updated, source) VALUES (?, ?, ?, ?, ?, ?, ?)",
                                 (lat, lon, gk, max(1, accidents), round(avg_sev, 2), datetime.now().isoformat(), "csv_import"))
                imported += 1
            except (ValueError, KeyError) as e:
                skipped += 1; errors.append(f"Row {i}: {e}"); continue
        conn.commit()
    finally:
        conn.close()
    return {"status": "ok", "imported": imported, "skipped": skipped, "errors": errors[:20],
            "message": f"Imported {imported} hotspots, skipped {skipped} rows."}


@app.post("/api/sos", tags=["SOS"], response_model=SOSResponse)
@limiter.limit("10/minute")
def trigger_sos(req: SOSRequest, request: Request):
    request_id = str(uuid.uuid4())[:12]
    logger.info(f"SOS triggered — rid={request_id} user={req.user_name}")
    if abs(req.lat-31.1048) < 0.001 and abs(req.lon-77.1734) < 0.001 and not req.address:
        try:
            ip_lat, ip_lon, ip_addr = _get_ip_location()
            req = req.model_copy(update={"lat": ip_lat, "lon": ip_lon, "address": ip_addr})
        except: pass
    label, rf_score, proba = "2", 50.0, {}
    fs = 50.0
    try:
        pr          = PredictRequest(weather=req.weather, roadType=req.roadType, timeOfDay=req.timeOfDay,
                                     areaType=req.areaType, speed=req.speed, vehicles=req.vehicles)
        label, rf_score, proba = _run_rf(pr)
        boost       = _hp_calibration(pr)
        rb          = min(100.0, rf_score + boost)
        ls          = _run_lstm(req.speed, int(req.weather), int(req.timeOfDay))
        fs          = round(0.7*rb + 0.3*ls, 2) if ls else round(rb, 2)
        fs          = min(100.0, fs)
        label       = "3" if fs >= 67 else "2" if fs >= 34 else "1"
    except Exception as e:
        logger.error(f"SOS prediction error: {e}")
    district = _get_district(req.lat, req.lon)
    conn     = get_db()
    try:
        conn.execute(
            "INSERT INTO sos_alerts (request_id,user_name,lat,lon,severity,risk_score,message,address,speed,weather,timestamp,status,district) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (request_id, req.user_name, req.lat, req.lon, str(label), float(fs),
             req.message or f"SOS from {req.user_name}", req.address, req.speed,
             req.weather, datetime.now().isoformat(), "active", district)
        )
        conn.commit()
    except Exception as e: logger.error(f"SOS DB error: {e}")
    ec       = 0
    admin_ok = _send_sos_email(ADMIN_EMAIL, req.user_name, req.lat, req.lon, label, fs, req.address, req.speed, is_admin=True)
    if admin_ok: ec += 1
    sl_txt  = "HIGH" if str(label) == "3" else "MEDIUM" if str(label) == "2" else "LOW"
    sms_body = (f"IntelliCrash SOS\nUser: {req.user_name}\nRisk: {sl_txt} ({fs:.1f}/100)\n"
                f"GPS: {req.lat:.5f},{req.lon:.5f}\nDistrict: {district}\n"
                f"Maps: https://maps.google.com/?q={req.lat},{req.lon}")
    sms_ok  = _send_sms(ADMIN_PHONE_E164, sms_body)
    if sms_ok: ec += 1
    try:
        contacts = conn.execute("SELECT * FROM emergency_contacts WHERE email!='' AND email IS NOT NULL AND email!=?", (ADMIN_EMAIL,)).fetchall()
        for c in contacts:
            if c["email"] and "@" in c["email"]:
                ok = _send_sos_email(c["email"], req.user_name, req.lat, req.lon, label, fs, req.address, req.speed)
                if ok: ec += 1
    except Exception as e: logger.error(f"Contact email error: {e}")
    if str(label) == "3":
        for role, email in HP_DISTRICT_OFFICIALS.get(district, {}).items():
            if email:
                _send_sos_email(email, req.user_name, req.lat, req.lon, label, fs, req.address, req.speed, is_admin=True)
    conn.execute("UPDATE sos_alerts SET email_sent=?,sms_sent=? WHERE request_id=?", (ec, 1 if sms_ok else 0, request_id))
    conn.commit(); conn.close()
    nb = []
    try: nb = _get_nearby_emergency(req.lat, req.lon)
    except: pass
    wa_msg = f"SOS+from+{req.user_name}+at+{req.lat:.4f},{req.lon:.4f}+Risk:{sl_txt}"
    return {"status": "SOS_SENT", "request_id": request_id, "severity": str(label),
            "risk_score": round(fs, 2), "district": district, "email_sent": ec,
            "admin_notified": admin_ok, "sms_sent": sms_ok, "nearby": nb,
            "whatsapp_url": f"https://wa.me/{ADMIN_WA}?text={wa_msg}", "timestamp": datetime.now().isoformat()}

@app.get("/api/sos/alerts", tags=["SOS"])
def get_sos(limit: int = 50):
    conn = get_db()
    rows = conn.execute("SELECT * FROM sos_alerts ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return {"alerts": [dict(r) for r in rows]}

@app.post("/api/sos/alerts/{aid}/resolve", tags=["SOS"])
def resolve_sos_post(aid: int):
    conn = get_db()
    conn.execute("UPDATE sos_alerts SET status='resolved' WHERE id=?", (aid,))
    conn.commit(); conn.close()
    return {"status": "resolved", "id": aid}

@app.put("/api/sos/resolve/{aid}", tags=["SOS"])
def resolve_sos_put(aid: int):
    conn = get_db()
    conn.execute("UPDATE sos_alerts SET status='resolved' WHERE id=?", (aid,))
    conn.commit(); conn.close()
    return {"status": "resolved", "id": aid}

@app.get("/api/contacts", tags=["Contacts"])
def get_contacts():
    conn = get_db(); rows = conn.execute("SELECT * FROM emergency_contacts").fetchall(); conn.close()
    return {"contacts": [dict(r) for r in rows]}

@app.post("/api/contacts", tags=["Contacts"])
def add_contact(c: ContactModel):
    conn = get_db()
    cur  = conn.execute("INSERT INTO emergency_contacts (name,phone,email,relation) VALUES (?,?,?,?)", (c.name, c.phone, c.email, c.relation))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"status": "added", "id": new_id}

@app.delete("/api/contacts/{cid}", tags=["Contacts"])
def del_contact(cid: int):
    conn = get_db(); conn.execute("DELETE FROM emergency_contacts WHERE id=?", (cid,)); conn.commit(); conn.close()
    return {"status": "deleted"}

@app.post("/api/reports", tags=["Reports"])
def add_report(r: ReportModel):
    eh = REPORT_EXPIRY.get(r.type, 5)
    ea = (datetime.now() + timedelta(hours=eh)).isoformat()
    conn = get_db()
    conn.execute(
        "INSERT INTO community_reports (type,lat,lon,description,landmark,road,severity,injured,direction,photos,timestamp,expires_at,reporter,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (r.type, r.lat, r.lon, r.description, r.landmark, r.road, r.severity, r.injured,
         r.direction, json.dumps(r.photos), datetime.now().isoformat(), ea, r.reporter, "active")
    )
    conn.commit(); _learn_hotspot(r.lat, r.lon, r.severity)
    conn.execute("UPDATE community_reports SET status='expired' WHERE expires_at<? AND status='active'", (datetime.now().isoformat(),))
    conn.commit(); conn.close()
    return {"status": "added", "expires_in_hours": eh}

@app.get("/api/reports", tags=["Reports"])
def get_reports(limit: int = 100, active_only: bool = True):
    conn = get_db()
    conn.execute("UPDATE community_reports SET status='expired' WHERE expires_at<? AND status='active'", (datetime.now().isoformat(),)); conn.commit()
    q    = "SELECT * FROM community_reports WHERE status='active' ORDER BY timestamp DESC LIMIT ?" if active_only else "SELECT * FROM community_reports ORDER BY timestamp DESC LIMIT ?"
    rows = conn.execute(q, (limit,)).fetchall(); conn.close()
    result = []
    for r in rows:
        d = dict(r)
        try: d["photos"] = json.loads(d.get("photos", "[]") or "[]")
        except: d["photos"] = []
        result.append(d)
    return {"reports": result}

@app.put("/api/reports/{rid}/upvote", tags=["Reports"])
def upvote(rid: int):
    conn = get_db(); conn.execute("UPDATE community_reports SET upvotes=upvotes+1 WHERE id=?", (rid,)); conn.commit(); conn.close()
    return {"status": "upvoted"}

@app.post("/api/sessions", tags=["Sessions"])
def save_session(s: SessionModel):
    conn = get_db()
    conn.execute(
        "INSERT INTO driver_sessions (driver_score,risk_score,trip_from,trip_to,distance_km,duration_min,avg_speed,timestamp) VALUES (?,?,?,?,?,?,?,?)",
        (s.driver_score, s.risk_score, s.trip_from, s.trip_to, s.distance_km, s.duration_min, s.avg_speed, datetime.now().isoformat())
    )
    conn.commit(); conn.close()
    return {"status": "saved"}

@app.get("/api/sessions", tags=["Sessions"])
def get_sessions(limit: int = 50):
    conn = get_db(); rows = conn.execute("SELECT * FROM driver_sessions ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall(); conn.close()
    return {"sessions": [dict(r) for r in rows]}

@app.post("/api/tracking/update", tags=["Sessions"])
def update_tracking(loc: LocationShare):
    conn = get_db()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO live_tracking (share_id,user_name,lat,lon,speed,risk_score,updated_at) VALUES (?,?,?,?,?,?,?)",
            (loc.share_id, loc.user_name, loc.lat, loc.lon, loc.speed, loc.risk_score, datetime.now().isoformat())
        )
        conn.commit()
    except: pass
    conn.close()
    return {"status": "updated", "share_url": f"/track/{loc.share_id}"}

@app.get("/api/tracking/{share_id}", tags=["Sessions"])
def get_tracking(share_id: str):
    conn = get_db()
    row  = conn.execute("SELECT * FROM live_tracking WHERE share_id=?", (share_id,)).fetchone(); conn.close()
    if not row: raise HTTPException(404, "Share not found")
    return dict(row)

@app.post("/api/feedback", tags=["Feedback"])
def submit_feedback(f: FeedbackModel):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO feedback (rating,comment,trip_from,trip_to,user_name,route_accuracy,risk_accuracy,app_ease,timestamp) VALUES (?,?,?,?,?,?,?,?,?)",
            (f.rating, f.comment, f.trip_from, f.trip_to, f.user_name, f.route_accuracy, f.risk_accuracy, f.app_ease, datetime.now().isoformat())
        )
        conn.commit()
    except Exception as e: logger.error(f"Feedback error: {e}")
    conn.close()
    return {"status": "saved", "message": "Thank you for your feedback!"}

@app.get("/api/feedback", tags=["Feedback"])
def get_feedback():
    conn = get_db()
    rows = conn.execute("SELECT * FROM feedback ORDER BY timestamp DESC LIMIT 100").fetchall()
    avg  = conn.execute("SELECT AVG(rating) FROM feedback").fetchone()[0]; conn.close()
    return {"feedback": [dict(r) for r in rows], "avg_rating": round(avg, 1) if avg else None, "count": len(rows)}

@app.post("/api/behavior/event", tags=["Sessions"])
def record_behavior(ev: BehaviorEvent):
    severity = "normal"
    if ev.event_type == "brake"       and ev.value > 0.4: severity = "harsh_braking"
    if ev.event_type == "accelerate"  and ev.value > 0.3: severity = "harsh_acceleration"
    if ev.event_type == "swerve"      and ev.value > 0.5: severity = "harsh_cornering"
    if ev.event_type == "speed"       and ev.value > 100: severity = "overspeeding"
    conn = get_db()
    conn.execute(
        "INSERT INTO behavior_events (event_type,value,severity,lat,lon,timestamp) VALUES (?,?,?,?,?,?)",
        (ev.event_type, ev.value, severity, ev.lat, ev.lon, ev.timestamp or datetime.now().isoformat())
    )
    conn.commit(); conn.close()
    return {"severity": severity, "score_deduction": {"harsh_braking":10,"harsh_acceleration":8,"harsh_cornering":12,"overspeeding":15}.get(severity, 0)}

@app.get("/api/behavior/summary", tags=["Sessions"])
def behavior_summary():
    conn = get_db()
    rows = conn.execute(
        "SELECT event_type,severity,COUNT(*) as cnt FROM behavior_events WHERE timestamp>? GROUP BY event_type,severity",
        ((datetime.now() - timedelta(days=7)).isoformat(),)
    ).fetchall(); conn.close()
    return {"events": [dict(r) for r in rows], "period": "last_7_days"}

@app.get("/api/analytics/heatmap", tags=["Analytics"])
def get_heatmap():
    conn     = get_db()
    reports  = conn.execute("SELECT lat,lon,severity,type FROM community_reports WHERE lat IS NOT NULL").fetchall()
    hotspots = conn.execute("SELECT lat,lon,avg_severity,report_count FROM hotspot_learning").fetchall()
    conn.close()
    points = []
    for r in reports:
        w = {"severe": 3, "moderate": 2, "minor": 1}.get(r["severity"], 1)
        points.append({"lat": r["lat"], "lon": r["lon"], "weight": w, "type": r["type"]})
    for lat, lon, name, district, acc, killed in HP_HOTSPOT_STATIC:
        points.append({"lat": lat, "lon": lon, "weight": killed, "type": "irad_2021_26",
                        "name": name, "district": district, "accidents": acc, "killed": killed})
    for h in hotspots:
        points.append({"lat": h["lat"], "lon": h["lon"],
                        "weight": h["avg_severity"] * h["report_count"], "type": "learned"})
    return {"points": points, "count": len(points)}

# ==================================================================
#  REVIEWS — NLP SENTIMENT
# ==================================================================

@app.post("/api/reviews", tags=["Reviews"])
@limiter.limit("30/minute")
def submit_review(data: ReviewRequest, request: Request):
    """Submit a user review. Sentiment is analysed automatically using NLP."""
    sentiment_result = analyze_sentiment(data.review_text)
    safe_score    = float(sentiment_result.get("score", 50.0))
    safe_polarity = float(sentiment_result.get("polarity", 0.0))
    if math.isnan(safe_score)    or math.isinf(safe_score):    safe_score    = 50.0
    if math.isnan(safe_polarity) or math.isinf(safe_polarity): safe_polarity = 0.0
    conn = get_db()
    try:
        cursor = conn.execute(
            """INSERT INTO reviews
               (user_name, review_text, rating, sentiment, sentiment_score, polarity, route, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data.user_name.strip() or "Anonymous",
                data.review_text.strip(),
                data.rating,
                sentiment_result.get("label", "neutral"),
                safe_score,
                safe_polarity,
                data.route.strip() if data.route else None,
                datetime.now().isoformat(),
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM reviews WHERE id = ?", (cursor.lastrowid,)).fetchone()
        conn.close()
        return dict(row)
    except Exception as e:
        conn.close()
        logger.error(f"Review submit error: {e}")
        raise HTTPException(500, f"Failed to save review: {str(e)}")


@app.get("/api/reviews/top", tags=["Reviews"])
def get_top_reviews(limit: int = 6):
    conn = get_db()
    rows = conn.execute(
        """SELECT id, user_name, review_text, rating,
                  sentiment, sentiment_score, route, created_at
           FROM   reviews
           WHERE  sentiment = 'positive' AND rating >= 4
           ORDER  BY sentiment_score DESC, rating DESC
           LIMIT  ?""",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/reviews/stats", tags=["Reviews"])
def get_review_stats():
    """Sentiment statistics for Admin dashboard — never returns NaN."""
    conn  = get_db()
    total = conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    breakdown = conn.execute(
        """SELECT sentiment,
                  COUNT(*) as count,
                  ROUND(AVG(sentiment_score), 1) as avg_score,
                  ROUND(AVG(rating), 2) as avg_rating
           FROM   reviews
           GROUP  BY sentiment
           ORDER  BY count DESC"""
    ).fetchall()
    recent = conn.execute(
        """SELECT DATE(created_at) as day,
                  SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END) as positive,
                  SUM(CASE WHEN sentiment='neutral'  THEN 1 ELSE 0 END) as neutral,
                  SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END) as negative
           FROM   reviews
           WHERE  created_at >= DATE('now', '-30 days')
           GROUP  BY day
           ORDER  BY day ASC"""
    ).fetchall()
    conn.close()
    breakdown_list = []
    for r in breakdown:
        d = dict(r)
        d["pct"]       = _pct(d["count"], total)
        d["avg_score"] = d["avg_score"] if d["avg_score"] is not None else 50.0
        d["avg_rating"]= d["avg_rating"] if d["avg_rating"] is not None else 0.0
        breakdown_list.append(d)
    pos_count = next((d["count"] for d in breakdown_list if d["sentiment"] == "positive"), 0)
    return {
        "total":        total,
        "positive_pct": _pct(pos_count, total),
        "breakdown":    breakdown_list,
        "last_30_days": [dict(r) for r in recent],
    }


@app.get("/api/reviews/all", tags=["Reviews"])
def get_all_reviews(limit: int = 100, sentiment: Optional[str] = None):
    conn = get_db()
    if sentiment and sentiment in ("positive", "neutral", "negative"):
        rows = conn.execute(
            "SELECT * FROM reviews WHERE sentiment=? ORDER BY created_at DESC LIMIT ?",
            (sentiment, limit)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM reviews ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    conn.close()
    return {"reviews": [dict(r) for r in rows], "count": len(rows)}


# ✅ NEW in v4.3.2 — Admin delete a review
@app.delete("/api/reviews/{review_id}", tags=["Reviews"])
def delete_review(review_id: int):
    """Admin: permanently delete a review by ID."""
    conn = get_db()
    existing = conn.execute("SELECT id FROM reviews WHERE id=?", (review_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, f"Review {review_id} not found")
    conn.execute("DELETE FROM reviews WHERE id=?", (review_id,))
    conn.commit()
    conn.close()
    logger.info(f"Review {review_id} deleted by admin")
    return {"status": "deleted", "id": review_id}


# ==================================================================
#  ADMIN ROUTES
# ==================================================================

@app.get("/api/admin/stats", tags=["Admin"])
def admin_stats():
    conn = get_db()
    reviews_total    = conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    reviews_positive = conn.execute("SELECT COUNT(*) FROM reviews WHERE sentiment='positive'").fetchone()[0]
    reviews_negative = conn.execute("SELECT COUNT(*) FROM reviews WHERE sentiment='negative'").fetchone()[0]
    reviews_neutral  = reviews_total - reviews_positive - reviews_negative
    avg_fb = conn.execute("SELECT AVG(rating) FROM feedback").fetchone()[0]
    avg_ds = conn.execute("SELECT AVG(driver_score) FROM driver_sessions").fetchone()[0]
    s = {
        "sos_total":        conn.execute("SELECT COUNT(*) FROM sos_alerts").fetchone()[0],
        "sos_active":       conn.execute("SELECT COUNT(*) FROM sos_alerts WHERE status='active'").fetchone()[0],
        "reports_active":   conn.execute("SELECT COUNT(*) FROM community_reports WHERE status='active'").fetchone()[0],
        "hotspots_learned": conn.execute("SELECT COUNT(*) FROM hotspot_learning").fetchone()[0],
        "sessions_total":   conn.execute("SELECT COUNT(*) FROM driver_sessions").fetchone()[0],
        "contacts_total":   conn.execute("SELECT COUNT(*) FROM emergency_contacts").fetchone()[0],
        "feedback_count":   conn.execute("SELECT COUNT(*) FROM feedback").fetchone()[0],
        "avg_feedback":     round(avg_fb or 0, 1),
        "avg_driver_score": round(avg_ds or 0, 1),
        "reviews_total":    reviews_total,
        "reviews_positive": reviews_positive,
        "reviews_negative": reviews_negative,
        "reviews_neutral":  reviews_neutral,
        "positive_pct":     _pct(reviews_positive, reviews_total),
        "negative_pct":     _pct(reviews_negative, reviews_total),
        "neutral_pct":      _pct(reviews_neutral,  reviews_total),
        "admin_email":      ADMIN_EMAIL,
        "admin_phone":      ADMIN_PHONE,
        "irad_hotspots":    len(HP_HOTSPOT_STATIC),
        "dataset":          "iRAD 2021-26 HP",
        "model_status":     get_model_status(),
    }
    conn.close()
    return s

@app.get("/api/admin/analytics", tags=["Admin"])
def admin_analytics():
    conn     = get_db()
    reports  = conn.execute("SELECT timestamp,type,severity,lat,lon FROM community_reports ORDER BY timestamp DESC LIMIT 500").fetchall()
    sos      = conn.execute("SELECT timestamp,severity,risk_score,lat,lon FROM sos_alerts ORDER BY timestamp DESC LIMIT 200").fetchall()
    sessions = conn.execute("SELECT driver_score,risk_score,trip_from,trip_to,distance_km,timestamp FROM driver_sessions ORDER BY timestamp DESC LIMIT 100").fetchall()
    hotspots = conn.execute("SELECT lat,lon,report_count,avg_severity FROM hotspot_learning ORDER BY report_count DESC LIMIT 20").fetchall()
    conn.close()
    hour_dist = [0] * 24
    for r in reports:
        try: hour_dist[int(r["timestamp"][11:13])] += 1
        except: pass
    type_dist = {}
    for r in reports: type_dist[r["type"]] = type_dist.get(r["type"], 0) + 1
    total_sessions = max(len(sessions), 1)
    return {
        "total_reports": len(reports), "total_sos": len(sos), "total_sessions": len(sessions),
        "hour_distribution": hour_dist, "type_distribution": type_dist,
        "risk_trend": [{"ts": s["timestamp"][:10], "score": s["risk_score"], "sev": s["severity"]} for s in sos[:30]],
        "top_hotspots": [dict(h) for h in hotspots],
        "avg_driver_score": round(sum(s["driver_score"] for s in sessions) / total_sessions, 1),
        "high_risk_sos": sum(1 for s in sos if s["severity"] == "3"),
    }

@app.get("/api/admin/db-summary", tags=["Admin"])
def db_summary():
    conn = get_db(); tables = {}
    for tbl in ["sos_alerts","community_reports","driver_sessions","emergency_contacts","hotspot_learning","feedback","behavior_events","reviews"]:
        try:
            count  = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
            latest = conn.execute(f"SELECT * FROM {tbl} ORDER BY rowid DESC LIMIT 5").fetchall()
            tables[tbl] = {"count": count, "latest": [dict(r) for r in latest]}
        except: tables[tbl] = {"count": 0, "latest": []}
    conn.close()
    return {"tables": tables, "admin_email": ADMIN_EMAIL, "admin_phone": ADMIN_PHONE, "timestamp": datetime.now().isoformat()}

@app.get("/api/admin/export/{table}", tags=["Admin"])
def export_csv(table: str):
    ALLOWED = {"sos_alerts","community_reports","driver_sessions","emergency_contacts","hotspot_learning","feedback","behavior_events","reviews"}
    if table not in ALLOWED: raise HTTPException(400, f"Table must be one of: {ALLOWED}")
    conn = get_db(); rows = conn.execute(f"SELECT * FROM {table} ORDER BY rowid DESC").fetchall(); conn.close()
    if not rows: return {"csv": "No data", "count": 0}
    cols = rows[0].keys(); buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=cols); writer.writeheader()
    for r in rows: writer.writerow(dict(r))
    from fastapi.responses import Response
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename=intellicrash_{table}_{datetime.now().strftime('%Y%m%d')}.csv"})

@app.get("/api/reports/{rid}/pdf", tags=["Reports"])
def export_report_pdf(rid: int):
    conn = get_db(); r = conn.execute("SELECT * FROM community_reports WHERE id=?", (rid,)).fetchone(); conn.close()
    if not r: raise HTTPException(404, "Report not found")
    d    = dict(r)
    html = f"""<!DOCTYPE html><html><head><title>Accident Report #{rid}</title>
<style>body{{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#1a1a1a}}
h1{{color:#ea4335;border-bottom:2px solid #ea4335;padding-bottom:10px}}
table{{width:100%;border-collapse:collapse;margin:20px 0}}
td{{padding:10px;border:1px solid #e3eaf5;font-size:14px}}
td:first-child{{font-weight:700;background:#f8faff;width:180px}}
.badge{{background:#fce8e6;color:#ea4335;padding:4px 10px;border-radius:20px;font-weight:700;font-size:12px}}
.footer{{margin-top:40px;padding-top:20px;border-top:1px solid #e3eaf5;font-size:12px;color:#80868b;text-align:center}}
</style></head><body>
<h1>IntelliCrash Accident Report #{rid}</h1>
<p>Generated: {datetime.now().strftime('%d %B %Y, %H:%M:%S')}</p>
<table>
<tr><td>Report ID</td><td>#{rid}</td></tr>
<tr><td>Type</td><td><span class="badge">{d.get('type','').upper()}</span></td></tr>
<tr><td>Severity</td><td>{d.get('severity','').upper()}</td></tr>
<tr><td>Date &amp; Time</td><td>{d.get('timestamp','')}</td></tr>
<tr><td>GPS</td><td>{d.get('lat',0.0):.6f}, {d.get('lon',0.0):.6f}</td></tr>
<tr><td>Landmark</td><td>{d.get('landmark','')}</td></tr>
<tr><td>Road</td><td>{d.get('road','')}</td></tr>
<tr><td>Injured</td><td>{d.get('injured',0)}</td></tr>
<tr><td>Description</td><td>{d.get('description','')}</td></tr>
<tr><td>Reporter</td><td>{d.get('reporter','')}</td></tr>
<tr><td>Status</td><td>{d.get('status','').upper()}</td></tr>
</table>
<p><a href="https://maps.google.com/?q={d.get('lat',0.0)},{d.get('lon',0.0)}">View on Google Maps</a></p>
<div class="footer">IntelliCrash AI Safety Platform | Admin: {ADMIN_PHONE} | {ADMIN_EMAIL}</div>
</body></html>"""
    return HTMLResponse(content=html, headers={"Content-Disposition": f"attachment; filename=report_{rid}.html"})

@app.get("/api/nearby", tags=["SOS"])
def get_nearby(lat: float = 31.1048, lon: float = 77.1734):
    try:
        nb = _get_nearby_emergency(lat, lon)
        return {"nearby": nb, "count": len(nb)}
    except Exception as e:
        logger.warning(f"Nearby error: {e}")
        return {"nearby": [], "count": 0, "error": str(e)}

@app.post("/api/gamification", tags=["Sessions"])
async def save_gamification(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    try:
        conn = get_db()
        conn.execute(
            """INSERT OR REPLACE INTO gamification
               (user_id, points, level, badges, streak, total_trips, safe_trips, last_trip, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                body.get("user_id", "default"),
                int(body.get("points", 0)),
                int(body.get("level", 1)),
                json.dumps(body.get("badges", [])),
                int(body.get("streak", 0)),
                int(body.get("totalTrips", 0)),
                int(body.get("safeTrips", 0)),
                body.get("lastTrip", ""),
                datetime.now().isoformat(),
            )
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Gamification save error: {e}")
    return {"ok": True}

@app.get("/api/gamification", tags=["Sessions"])
def get_gamification(user_id: str = "default"):
    try:
        conn = get_db()
        row  = conn.execute(
            "SELECT * FROM gamification WHERE user_id=? ORDER BY id DESC LIMIT 1", (user_id,)
        ).fetchone()
        conn.close()
        if row:
            d = dict(row)
            try: d["badges"] = json.loads(d.get("badges", "[]") or "[]")
            except: d["badges"] = []
            return d
    except Exception as e:
        logger.warning(f"Gamification get error: {e}")
    return {"points": 0, "level": 1, "badges": [], "streak": 0, "totalTrips": 0, "safeTrips": 0}

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting IntelliCrash API v4.3.2 | Admin: {ADMIN_EMAIL} / {ADMIN_PHONE}")
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=False, log_level="info")