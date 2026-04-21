"""
model_loader.py — IntelliCrash ML Model Loader  (FIXED v4.3.1)
===============================================
Loads all .pkl and .h5 files from the python/ folder.
Shared across api.py and xai.py.

Files needed in python/ folder:
  best_random_forest_model.pkl
  feature_scaler.pkl
  target_encoder.pkl
  label_encoders.pkl
  feature_names.pkl
  intellicrash_lstm_model.h5  (optional)

FIXES:
  - Never raises on missing files; sets model to None with clear warning
  - get_model_status() always returns a complete dict
  - Fallback dummy scaler so api.py never crashes on transform()
  - Logs exact missing file paths for easy debugging
"""

import joblib
import logging
import warnings
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Any

warnings.filterwarnings("ignore")
logger = logging.getLogger("intellicrash")

BASE = Path(__file__).parent

# ── TensorFlow (optional — for LSTM) ─────────────────────────────────────────
TF_OK = False
try:
    from tensorflow.keras.models import load_model as keras_load
    TF_OK = True
    logger.info("TensorFlow available for LSTM")
except ImportError:
    logger.info("TensorFlow not installed — LSTM disabled (RF-only mode is fine)")


# ── Dummy scaler: used when feature_scaler.pkl is missing ────────────────────
class _IdentityScaler:
    """Pass-through scaler so RF prediction never crashes on missing scaler."""
    def transform(self, X):
        return np.array(X, dtype=np.float64)
    def fit_transform(self, X):
        return self.transform(X)


# ── Default feature list (matches training dataset) ──────────────────────────
_DEFAULT_FEATURES = [
    "Weather", "Road_Type", "Time_of_Day", "Day_of_Week",
    "Speed_Limit", "Number_of_Vehicles", "Road_Condition",
    "Vehicle_Type", "Light_Condition", "Area_Type", "Critical_Zone",
]

# ── Load Random Forest + supporting .pkl files ───────────────────────────────
rf_model        = None
rf_scaler       = _IdentityScaler()   # safe default
le_target       = None
label_encoders: Dict = {}
feature_names:  List = list(_DEFAULT_FEATURES)

_PKL_FILES = {
    "rf_model":       "best_random_forest_model.pkl",
    "rf_scaler":      "feature_scaler.pkl",
    "le_target":      "target_encoder.pkl",
    "label_encoders": "label_encoders.pkl",
    "feature_names":  "feature_names.pkl",
}

_missing_files = []
_load_errors   = []

for _key, _fname in _PKL_FILES.items():
    _fpath = BASE / _fname
    if not _fpath.exists():
        _missing_files.append(_fname)
        logger.warning(f"MISSING: {_fpath}")
        continue
    try:
        _obj = joblib.load(_fpath)
        if   _key == "rf_model":       rf_model       = _obj
        elif _key == "rf_scaler":      rf_scaler      = _obj
        elif _key == "le_target":      le_target      = _obj
        elif _key == "label_encoders": label_encoders = _obj
        elif _key == "feature_names":  feature_names  = list(_obj)
        logger.info(f"Loaded: {_fname}")
    except Exception as _e:
        _load_errors.append(f"{_fname}: {_e}")
        logger.error(f"Load error [{_fname}]: {_e}")

if rf_model is not None:
    try:
        _classes = list(rf_model.classes_)
        logger.info(f"RF ready — features={len(feature_names)}, classes={_classes}")
        logger.info(f"Feature names: {feature_names}")
    except Exception as _e:
        logger.warning(f"RF classes read error: {_e}")
else:
    logger.warning(
        "RF model NOT loaded. Predictions will use rule-based fallback.\n"
        f"  Missing files : {_missing_files}\n"
        f"  Load errors   : {_load_errors}\n"
        f"  Expected path : {BASE / 'best_random_forest_model.pkl'}"
    )


# ── Load LSTM (optional) ──────────────────────────────────────────────────────
lstm_model = None
lstm_path  = BASE / "intellicrash_lstm_model.h5"

if lstm_path.exists():
    if TF_OK:
        try:
            lstm_model = keras_load(str(lstm_path))
            logger.info("LSTM loaded successfully")
        except Exception as _e:
            logger.warning(f"LSTM load error: {_e}")
    else:
        logger.warning(
            "LSTM file found but TensorFlow is not installed.\n"
            "  Run: pip install tensorflow-cpu"
        )
else:
    logger.info("No LSTM file — RF-only mode (this is fine)")


# ── Public status helper ──────────────────────────────────────────────────────
def get_model_status() -> Dict:
    """Return a complete status dict — never raises, never returns partial data."""
    rf_classes: List = []
    try:
        if rf_model is not None:
            rf_classes = [int(c) for c in rf_model.classes_]
    except Exception:
        pass

    return {
        "rf_loaded":        rf_model is not None,
        "lstm_loaded":      lstm_model is not None,
        "tf_installed":     TF_OK,
        "feature_count":    len(feature_names),
        "feature_names":    feature_names,
        "rf_classes":       rf_classes,
        "scaler_loaded":    not isinstance(rf_scaler, _IdentityScaler),
        "encoders_loaded":  len(label_encoders) > 0,
        "missing_files":    _missing_files,
        "load_errors":      _load_errors,
    }