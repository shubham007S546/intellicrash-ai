"""
hotspot_model.py — IntelliCrash Multi-Dataset Hotspot ML Module
================================================================
Loads the trained RandomForest model (trained on iRAD + Kaggle US +
UK STATS19 + HP NRSC/BMTPC + OSM Infrastructure datasets).

Provides:
  predict_hotspot(lat, lon, ...) → risk prediction
  score_all_hotspots() → scored list of all 38 HP iRAD hotspots
  get_hotspot_metadata() → training stats for admin display

This module is imported by api.py and replaces the static
HP_HOTSPOT_STATIC dummy-risk approach.
"""

import json
import math
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

import numpy as np
import pandas as pd
import joblib

logger = logging.getLogger("intellicrash.hotspot_model")
BASE   = Path(__file__).parent

# ── Model files ────────────────────────────────────────────────────
MODEL_PATH    = BASE / "hotspot_rf_model.pkl"
SCALER_PATH   = BASE / "hotspot_scaler.pkl"
ENCODER_PATH  = BASE / "hotspot_encoder.pkl"
FEATURES_PATH = BASE / "hotspot_feature_names.pkl"
META_PATH     = BASE / "hotspot_metadata.json"

# ── Load models ────────────────────────────────────────────────────
_rf_model  = None
_scaler    = None
_encoder   = None
_features  = None
_metadata  = {}

def _load_models():
    global _rf_model, _scaler, _encoder, _features, _metadata
    try:
        if MODEL_PATH.exists() and SCALER_PATH.exists():
            _rf_model  = joblib.load(MODEL_PATH)
            _scaler    = joblib.load(SCALER_PATH)
            _encoder   = joblib.load(ENCODER_PATH)
            _features  = joblib.load(FEATURES_PATH)
            if META_PATH.exists():
                with open(META_PATH) as f:
                    _metadata = json.load(f)
            logger.info(
                f"Hotspot model loaded: {_metadata.get('n_samples_total','?')} training samples, "
                f"accuracy={_metadata.get('metrics',{}).get('accuracy','?')}"
            )
            return True
        else:
            logger.warning("Hotspot model files not found. Using rule-based fallback.")
            return False
    except Exception as e:
        logger.error(f"Hotspot model load error: {e}")
        return False

_MODEL_LOADED = _load_models()

# ── Feature list (must match training) ────────────────────────────
FEATURE_COLS = _features if _features else [
    "lat", "lon", "elevation_m", "terrain_type", "road_type",
    "curvature_index", "gradient_pct", "visibility_m",
    "annual_accidents", "annual_fatalities", "nearby_hospital_km",
    "population_density", "seasonal_closure", "fog_frequency",
    "rainfall_mm_annual", "snowfall_days", "intersection_count_1km",
    "pedestrian_crossings", "speed_limit_kmh", "is_nighttime_hotspot",
    "irad_hotspot",
    "fatality_rate", "risk_composite", "elevation_band",
    "hospital_access_risk", "road_complexity", "weather_hazard",
    "infrastructure_risk", "speed_terrain_mismatch",
]

RISK_LABELS = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
RISK_COLORS = {0: "#22c55e", 1: "#f59e0b", 2: "#ef4444"}


def _encode_terrain(terrain: str) -> int:
    return {
        "plains": 0, "bypass": 0, "industrial": 0,
        "urban": 1, "junction": 1, "hilly": 1, "valley": 1,
        "rural": 1, "tea_garden": 1,
        "mountain": 2, "hairpin": 2, "gorge": 2,
        "high_altitude": 3,
    }.get(terrain, 1)


def _encode_road(road: str) -> int:
    if not road: return 1
    r = road.upper()
    if r.startswith("NH"): return 2
    if r.startswith("SH"): return 1
    return 0


def _build_feature_row(
    lat: float, lon: float,
    terrain_type: int = 2, road_type: int = 1,
    annual_accidents: int = 10, annual_fatalities: int = 3,
    elevation_m: Optional[int] = None,
    curvature: Optional[float] = None,
    gradient: Optional[float] = None,
    hospital_km: float = 25.0,
    is_irad: int = 0,
    fog_freq: float = 0.3,
    snowfall_days: int = 30,
    rainfall_mm: int = 1000,
    population_density: float = 50.0,
    seasonal_closure: int = 0,
    speed_limit: int = 40,
) -> pd.DataFrame:
    """Build a single feature row for prediction."""
    if elevation_m is None:
        elevation_m = int(300 + terrain_type * 600)
    if curvature is None:
        curvature = 0.3 + terrain_type * 0.15
    if gradient is None:
        gradient = 2.0 + terrain_type * 4.0

    fatality_rate  = annual_fatalities / (annual_accidents + 1)
    risk_composite = (
        annual_fatalities * 4.0 +
        annual_accidents  * 0.8 +
        terrain_type      * 3.0 +
        curvature         * 5.0 +
        gradient          * 0.3 +
        fog_freq          * 3.0 +
        (snowfall_days / 30) * 1.5 +
        is_irad           * 5.0
    )
    elev_band         = min(4, int(elevation_m / 1000))
    hospital_risk     = int(hospital_km > 30) * 2 + int(hospital_km > 60)
    road_complexity   = curvature * gradient / 10.0
    weather_hazard    = fog_freq * 3 + (snowfall_days / 30) + (rainfall_mm / 1000)
    infra_risk        = 2 * 0.5 + 1 * 0.8  # typical intersection + crossing count
    speed_mismatch    = (speed_limit / 20) * terrain_type

    row = {
        "lat":                   lat,
        "lon":                   lon,
        "elevation_m":           elevation_m,
        "terrain_type":          terrain_type,
        "road_type":             road_type,
        "curvature_index":       curvature,
        "gradient_pct":          gradient,
        "visibility_m":          600.0 if fog_freq < 0.3 else 200.0,
        "annual_accidents":      annual_accidents,
        "annual_fatalities":     annual_fatalities,
        "nearby_hospital_km":    hospital_km,
        "population_density":    population_density,
        "seasonal_closure":      seasonal_closure,
        "fog_frequency":         fog_freq,
        "rainfall_mm_annual":    rainfall_mm,
        "snowfall_days":         snowfall_days,
        "intersection_count_1km":2,
        "pedestrian_crossings":  1,
        "speed_limit_kmh":       speed_limit,
        "is_nighttime_hotspot":  1,
        "irad_hotspot":          is_irad,
        "fatality_rate":         fatality_rate,
        "risk_composite":        risk_composite,
        "elevation_band":        elev_band,
        "hospital_access_risk":  hospital_risk,
        "road_complexity":       road_complexity,
        "weather_hazard":        weather_hazard,
        "infrastructure_risk":   infra_risk,
        "speed_terrain_mismatch":speed_mismatch,
    }
    return pd.DataFrame([row])[FEATURE_COLS]


def predict_hotspot(
    lat: float, lon: float,
    terrain: str = "mountain",
    road: str = "SH",
    accidents: int = 10,
    fatalities: int = 3,
    elevation_m: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Predict risk level for a given location using the trained model.

    Returns:
        {
          "risk_label": "HIGH" | "MEDIUM" | "LOW",
          "risk_level": 0 | 1 | 2,
          "risk_score":  0-100 float,
          "probability": {"LOW": .., "MEDIUM": .., "HIGH": ..},
          "model_used": "RandomForest" | "rule_based",
          "color": "#ef4444" | "#f59e0b" | "#22c55e",
        }
    """
    terrain_int = _encode_terrain(terrain)
    road_int    = _encode_road(road)

    if _MODEL_LOADED and _rf_model is not None:
        try:
            X = _build_feature_row(
                lat, lon,
                terrain_type=terrain_int,
                road_type=road_int,
                annual_accidents=accidents,
                annual_fatalities=fatalities,
                elevation_m=elevation_m,
                is_irad=1,
            )
            X_sc   = _scaler.transform(X)
            pred   = int(_rf_model.predict(X_sc)[0])
            proba  = _rf_model.predict_proba(X_sc)[0]
            # Score: weighted probability → 0-100
            # P(HIGH)*90 + P(MEDIUM)*50 + P(LOW)*10
            classes = list(_rf_model.classes_)
            p = {int(c): float(p) for c, p in zip(classes, proba)}
            score  = p.get(2, 0) * 90 + p.get(1, 0) * 50 + p.get(0, 0) * 10
            return {
                "risk_label":  RISK_LABELS[pred],
                "risk_level":  pred,
                "risk_score":  round(score, 1),
                "probability": {
                    "LOW":    round(p.get(0, 0), 3),
                    "MEDIUM": round(p.get(1, 0), 3),
                    "HIGH":   round(p.get(2, 0), 3),
                },
                "model_used": "RandomForest_MultiDataset",
                "color":      RISK_COLORS[pred],
                "datasets":   ["iRAD_HP_2021-26", "Kaggle_US", "UK_STATS19", "HP_NRSC", "OSM"],
            }
        except Exception as e:
            logger.warning(f"Model predict error: {e}. Using rule fallback.")

    # Rule-based fallback (if model not loaded)
    score = fatalities * 4 + accidents * 0.8 + terrain_int * 8
    pred  = 2 if score >= 30 else 1 if score >= 14 else 0
    return {
        "risk_label":  RISK_LABELS[pred],
        "risk_level":  pred,
        "risk_score":  min(95, score),
        "probability": {},
        "model_used":  "rule_based_fallback",
        "color":       RISK_COLORS[pred],
    }


# ══════════════════════════════════════════════════════════════════
# iRAD HOTSPOT DEFINITIONS (38 official HP hotspots)
# Each entry now gets ML risk scoring instead of hardcoded label
# ══════════════════════════════════════════════════════════════════
IRAD_HOTSPOT_DEFINITIONS = [
    # (lat, lon, name, district, accidents_5yr, fatalities_5yr, road, terrain)
    (31.10297, 77.20796, "Dhalli–Kufri Stretch",        "Shimla",   28, 8,  "NH-5",   "mountain"),
    (31.10297, 77.16953, "Sadar/East Shimla NH-5",       "Shimla",   22, 5,  "NH-5",   "urban"),
    (31.11000, 77.14391, "Shimla West Bypass",           "Shimla",   18, 4,  "NH-5",   "bypass"),
    (31.12700, 77.22800, "Mashobra Bifurcation",         "Shimla",    9, 7,  "SH",     "hairpin"),
    (31.32000, 77.42000, "Narkanda Hairpin Bends",       "Shimla",   12, 6,  "NH-5",   "mountain"),
    (31.20544, 77.74594, "Rohru–Rampur Corridor",        "Shimla",   16, 3,  "SH",     "valley"),
    (31.55129, 76.90054, "Dhanotu–Sundernagar NH-21",    "Mandi",    24, 4,  "NH-21",  "plains"),
    (31.62815, 76.93897, "Balh Valley NH-21",            "Mandi",    17, 6,  "NH-21",  "plains"),
    (31.57691, 76.91335, "Ner Chowk Intersection",       "Mandi",    16, 5,  "NH-21",  "junction"),
    (31.83000, 77.11000, "Mandi City NH-3",              "Mandi",    11, 4,  "NH-3",   "urban"),
    (31.38000, 76.83000, "Swarghat–Bilaspur",            "Bilaspur", 14, 6,  "NH-21",  "mountain"),
    (30.89802, 77.09268, "Sadar Solan NH-5",             "Solan",    23, 7,  "NH-5",   "urban"),
    (30.92372, 76.79800, "Baddi Industrial Belt",        "Solan",    21, 11, "MDR",    "industrial"),
    (30.91104, 76.83669, "Barotiwala–Baddi",             "Solan",    18, 5,  "SH",     "industrial"),
    (30.90900, 77.02000, "Dharampur NH-5 Stretch",       "Solan",    15, 9,  "NH-5",   "rural"),
    (31.03900, 76.70840, "Nalagarh Bypass",              "Solan",    14, 5,  "NH-21",  "bypass"),
    (32.11489, 76.38818, "Nagrota Bagwan NH-503",        "Kangra",   16, 3,  "NH-503", "valley"),
    (32.09000, 76.11000, "Dharamshala Bypass",           "Kangra",   13, 2,  "SH",     "mountain"),
    (32.22000, 76.32000, "Palampur Hill Road",           "Kangra",   10, 4,  "SH",     "tea_garden"),
    (32.23960, 77.18870, "Rohtang Pass Approach",        "Kullu",    15, 7,  "NH-3",   "high_altitude"),
    (31.95700, 77.10900, "Kullu–Bhuntar NH-3",           "Kullu",    19, 8,  "NH-3",   "valley"),
    (32.05500, 77.32400, "Manali Approach Bends",        "Kullu",    14, 5,  "NH-3",   "mountain"),
    (30.44970, 77.56662, "Poanta Sahib NH-7",            "Sirmaur",  15, 4,  "NH-7",   "plains"),
    (30.58000, 77.46000, "Renuka–Nahan Road",            "Sirmaur",   9, 3,  "SH",     "hilly"),
    (31.47000, 76.27000, "Una Town NH-503",              "Una",      12, 3,  "NH-503", "plains"),
    (31.68000, 76.52000, "Hamirpur Bypass",              "Hamirpur",  8, 2,  "NH-503", "bypass"),
    (32.55000, 76.12000, "Chamba–Dalhousie Road",        "Chamba",   11, 5,  "SH",     "mountain"),
    (32.70000, 77.05000, "Keylong Lahaul Stretch",       "Lahaul",    7, 4,  "NH-3",   "high_altitude"),
    (30.92897, 76.81124, "Hotel Classic Barotiwala",     "Solan",     8, 9,  "MDR",    "industrial"),
    (31.71200, 76.93200, "Mandi–Rewalsar Road",          "Mandi",     8, 3,  "SH",     "hilly"),
    (31.53000, 76.76000, "Bilaspur–Swarghat Road",       "Bilaspur", 11, 5,  "SH",     "mountain"),
    (31.58000, 78.10000, "Rampur–Reckong Peo NH-5",      "Kinnaur",   9, 5,  "NH-5",   "gorge"),
    (31.45000, 78.27000, "Karcham–Powari Kinnaur",       "Kinnaur",   8, 6,  "NH-5",   "gorge"),
    (30.94000, 76.81000, "Baddi EPIP Zone Road",         "Solan",    18, 7,  "MDR",    "industrial"),
    (30.96000, 76.84000, "Nalagarh–Baddi Industrial",    "Solan",    15, 6,  "SH",     "industrial"),
    (31.90000, 77.19000, "Patlikuhl–Anni Road",          "Kullu",     7, 3,  "SH",     "valley"),
    (32.06200, 75.98000, "Kangra–Jawalamukhi Road",      "Kangra",    9, 3,  "SH",     "hilly"),
    (30.67000, 77.30000, "Pachhad–Rajgarh Stretch",      "Sirmaur",   6, 3,  "SH",     "hilly"),
]

_SCORED_HOTSPOTS_CACHE = None


def score_all_hotspots(force_refresh: bool = False) -> List[Dict]:
    """
    Return all 38 iRAD hotspots with ML-predicted risk scores.
    Results are cached in memory after first call.
    """
    global _SCORED_HOTSPOTS_CACHE
    if _SCORED_HOTSPOTS_CACHE is not None and not force_refresh:
        return _SCORED_HOTSPOTS_CACHE

    result = []
    for lat, lon, name, district, acc, fat, road, terrain in IRAD_HOTSPOT_DEFINITIONS:
        pred = predict_hotspot(lat, lon, terrain=terrain, road=road, accidents=acc, fatalities=fat)
        result.append({
            "id":           len(result) + 1,
            "lat":          lat,
            "lon":          lon,
            "name":         name,
            "district":     district,
            "accidents":    acc,
            "killed":       fat,
            "road":         road,
            "terrain":      terrain,
            "risk":         pred["risk_label"],
            "risk_level":   pred["risk_level"],
            "risk_score":   pred["risk_score"],
            "probability":  pred.get("probability", {}),
            "model_used":   pred["model_used"],
            "color":        pred["color"],
            "source":       "iRAD_HP_2025-26_ML",
            "datasets":     pred.get("datasets", []),
        })

    # Sort by risk_score desc
    result.sort(key=lambda x: -x["risk_score"])
    _SCORED_HOTSPOTS_CACHE = result
    logger.info(f"Scored {len(result)} hotspots using ML model")
    return result


def get_hotspot_metadata() -> Dict:
    """Return training metadata for admin display."""
    return {
        "model_loaded":   _MODEL_LOADED,
        "model_type":     _metadata.get("model_type", "Not loaded"),
        "accuracy":       _metadata.get("metrics", {}).get("accuracy", None),
        "f1_weighted":    _metadata.get("metrics", {}).get("f1_weighted", None),
        "oob_score":      _metadata.get("metrics", {}).get("oob_score", None),
        "cv_f1_mean":     _metadata.get("metrics", {}).get("cv_f1_mean", None),
        "n_samples":      _metadata.get("n_samples_total", 0),
        "trained_at":     _metadata.get("trained_at", None),
        "n_features":     _metadata.get("n_features", len(FEATURE_COLS)),
        "feature_names":  FEATURE_COLS,
        "datasets":       _metadata.get("datasets", {}),
        "feature_importances": _metadata.get("feature_importances", {}),
        "sources":        _metadata.get("source_citations", []),
        "hotspot_count":  len(IRAD_HOTSPOT_DEFINITIONS),
    }


def get_risk_distribution() -> Dict:
    """Risk distribution across all HP hotspots."""
    hotspots = score_all_hotspots()
    dist = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for h in hotspots:
        dist[h["risk"]] = dist.get(h["risk"], 0) + 1
    by_district = {}
    for h in hotspots:
        d = h["district"]
        if d not in by_district:
            by_district[d] = {"HIGH": 0, "MEDIUM": 0, "LOW": 0, "max_score": 0}
        by_district[d][h["risk"]] += 1
        by_district[d]["max_score"] = max(by_district[d]["max_score"], h["risk_score"])
    return {
        "total_hotspots":  len(hotspots),
        "risk_distribution": dist,
        "by_district":     by_district,
        "top_5_dangerous": hotspots[:5],
        "model_accuracy":  _metadata.get("metrics", {}).get("accuracy", None),
    }
