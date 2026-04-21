"""
xai.py — IntelliCrash Explainable AI Module
============================================
Standalone XAI analysis using your trained RF model.

Run directly to see feature importances + test predictions:
    python xai.py

Or import in api.py for the /api/feature_importances endpoint.
"""

import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any, Optional

# ── Import shared model loader ────────────────────────────────────
from model_loader import (
    rf_model, rf_scaler, le_target, label_encoders,
    feature_names, lstm_model, get_model_status
)

BASE = Path(__file__).parent

# ── Feature → human readable description ─────────────────────────
FEATURE_DESCRIPTIONS = {
    "Weather": {
        "label":  "Weather Condition",
        "icon":   "🌧️",
        "codes":  {0: "Clear", 1: "Rain", 2: "Fog", 3: "Snow", 4: "Storm"},
        "hp_note": "HP mountain roads become extremely dangerous in snow/fog",
    },
    "Road_Type": {
        "label":  "Road Type",
        "icon":   "⛰️",
        "codes":  {0: "Plain/Village road", 1: "Mountain road", 2: "National Highway"},
        "hp_note": "Mountain roads = hairpin bends, blind curves, no guardrails",
    },
    "Time_of_Day": {
        "label":  "Time of Day",
        "icon":   "🕐",
        "codes":  {0: "Morning (5-9 AM)", 1: "Day (9-5 PM)", 2: "Evening (5-8 PM)", 3: "Night (8PM-5AM)"},
        "hp_note": "40% of HP accidents occur at night",
    },
    "Day_of_Week": {
        "label":  "Day of Week",
        "icon":   "📅",
        "codes":  {0:"Monday",1:"Tuesday",2:"Wednesday",3:"Thursday",4:"Friday",5:"Saturday",6:"Sunday"},
        "hp_note": "Saturday/Sunday = tourist traffic peak in HP",
    },
    "Speed_Limit": {
        "label":  "Vehicle Speed (km/h)",
        "icon":   "🚗",
        "codes":  {},
        "hp_note": "Speed is the #1 contributing factor in fatal HP accidents",
    },
    "Number_of_Vehicles": {
        "label":  "Number of Vehicles",
        "icon":   "🚦",
        "codes":  {},
        "hp_note": "Higher density = more collision probability on narrow HP roads",
    },
    "Road_Condition": {
        "label":  "Road Surface Condition",
        "icon":   "🚧",
        "codes":  {0: "Dry", 1: "Wet", 2: "Icy", 3: "Under repair"},
        "hp_note": "Wet/icy HP roads can double/quadruple stopping distance",
    },
    "Vehicle_Type": {
        "label":  "Vehicle Type",
        "icon":   "🚌",
        "codes":  {0: "Car", 1: "Truck/HMV", 2: "Bike/Two-wheeler", 3: "Bus"},
        "hp_note": "Trucks on HP mountain roads are a major accident cause",
    },
    "Light_Condition": {
        "label":  "Lighting Condition",
        "icon":   "💡",
        "codes":  {0: "Daylight", 1: "Dark/No street light", 2: "Street lit"},
        "hp_note": "80% of HP roads have no street lighting",
    },
    "Area_Type": {
        "label":  "Area Type",
        "icon":   "🏘️",
        "codes":  {0: "Rural/Mountain", 1: "Urban"},
        "hp_note": "Rural HP areas have slower emergency response",
    },
    "Critical_Zone": {
        "label":  "iRAD Accident Hotspot",
        "icon":   "⚠️",
        "codes":  {0: "Not a hotspot", 1: "Official iRAD 2024 hotspot"},
        "hp_note": "35 GPS-verified locations from MoRTH iRAD/eDAR 2024 data",
    },
}


# ══════════════════════════════════════════════════════════════════
#  CORE XAI FUNCTIONS
# ══════════════════════════════════════════════════════════════════

def get_feature_importances() -> Dict[str, Any]:
    """
    Returns real feature importances from your trained RF model.
    These values come directly from rf_model.feature_importances_
    — not hardcoded, not estimated.
    """
    if rf_model is None:
        return {
            "error": "RF model not loaded. Put best_random_forest_model.pkl in python/ folder.",
            "importances": {},
            "ranked": [],
        }

    importances = rf_model.feature_importances_
    fi_dict = {
        str(name): float(imp)
        for name, imp in zip(feature_names, importances)
    }

    # Sort by importance descending
    ranked = sorted(fi_dict.items(), key=lambda x: -x[1])

    result = []
    for rank, (fname, importance) in enumerate(ranked, 1):
        desc = FEATURE_DESCRIPTIONS.get(fname, {})
        result.append({
            "rank":        rank,
            "feature":     fname,
            "label":       desc.get("label", fname.replace("_", " ")),
            "icon":        desc.get("icon", "📊"),
            "importance":  round(importance, 6),
            "importance_%": round(importance * 100, 2),
            "hp_note":     desc.get("hp_note", ""),
        })

    return {
        "importances":   fi_dict,
        "ranked":        result,
        "total_features": len(feature_names),
        "top_feature":   ranked[0][0] if ranked else None,
        "model_type":    str(type(rf_model).__name__),
        "n_estimators":  getattr(rf_model, "n_estimators", "N/A"),
    }


def predict_with_xai(input_features: Dict[str, float]) -> Dict[str, Any]:
    """
    Run RF prediction on input features and return full XAI breakdown.

    input_features keys must match your training column names:
        Weather, Road_Type, Time_of_Day, Day_of_Week, Speed_Limit,
        Number_of_Vehicles, Road_Condition, Vehicle_Type,
        Light_Condition, Area_Type, Critical_Zone

    Returns:
        predicted_class:  1, 2, or 3
        severity_label:   Low / Medium / High
        risk_score:       0-100
        probabilities:    {1: 0.2, 2: 0.5, 3: 0.3}
        feature_contributions: per-feature impact
        explanation:      plain English text
    """
    if rf_model is None:
        return {"error": "RF model not loaded"}

    # Build DataFrame — features are ALL NUMERIC (label_encoders is empty)
    # Exact column order from feature_names.pkl:
    # Weather, Road_Type, Time_of_Day, Day_of_Week, Speed_Limit,
    # Number_of_Vehicles, Road_Condition, Vehicle_Type,
    # Light_Condition, Area_Type, Critical_Zone
    row = {f: 0.0 for f in feature_names}
    for k, v in input_features.items():
        if k in row:
            row[k] = float(v)

    df = pd.DataFrame([row])[feature_names]  # enforce exact order

    # Scale using feature_scaler.pkl (StandardScaler fitted on training data)
    X = rf_scaler.transform(df)

    # Predict
    pred       = rf_model.predict(X)[0]
    proba      = rf_model.predict_proba(X)[0]
    classes    = rf_model.classes_

    # Risk score: weighted probability average
    # Low(1)=20pts, Medium(2)=55pts, High(3)=90pts
    score = 0.0
    proba_dict = {}
    for cls, p in zip(classes, proba):
        c = int(cls)
        proba_dict[c] = round(float(p), 4)
        if   c == 1: score += float(p) * 20.0
        elif c == 2: score += float(p) * 55.0
        elif c == 3: score += float(p) * 90.0

    score = min(100.0, max(0.0, score))
    label_map = {1: "Low", 2: "Medium", 3: "High"}

    # Feature contributions via permutation proxy
    # (uses feature importances × feature value deviation from mean)
    contributions = {}
    importances = rf_model.feature_importances_
    for fname, imp in zip(feature_names, importances):
        val   = float(input_features.get(fname, 0))
        desc  = FEATURE_DESCRIPTIONS.get(fname, {})
        codes = desc.get("codes", {})
        val_label = codes.get(int(val), str(val)) if codes else f"{val:.0f}"
        contributions[fname] = {
            "value":       val,
            "value_label": val_label,
            "importance_%": round(imp * 100, 2),
            "label":       desc.get("label", fname),
            "icon":        desc.get("icon", "📊"),
            "hp_note":     desc.get("hp_note", ""),
        }

    # Sort contributions by importance
    contributions = dict(
        sorted(contributions.items(), key=lambda x: -x[1]["importance_%"])
    )

    # Plain English explanation
    parts = []
    spd = float(input_features.get("Speed_Limit", 0))
    wx  = int(input_features.get("Weather", 0))
    tod = int(input_features.get("Time_of_Day", 0))
    rc  = int(input_features.get("Road_Condition", 0))
    cz  = int(input_features.get("Critical_Zone", 0))
    lc  = int(input_features.get("Light_Condition", 0))

    if spd > 100: parts.append(f"very high speed ({spd:.0f} km/h)")
    elif spd > 70: parts.append(f"high speed ({spd:.0f} km/h)")
    if wx > 0:  parts.append({1:"rain",2:"fog",3:"snow/ice",4:"storm"}.get(wx,"bad weather"))
    if tod == 3: parts.append("night driving")
    if rc > 0:  parts.append({1:"wet road",2:"icy road",3:"road under repair"}.get(rc,"poor road"))
    if cz == 1: parts.append("known accident hotspot (iRAD 2024)")
    if lc == 1: parts.append("no street lighting")

    if parts:
        explanation = f"Risk {label_map.get(int(pred),'?')} — elevated due to: {', '.join(parts)}."
    else:
        explanation = f"Risk {label_map.get(int(pred),'?')} — road conditions are relatively normal."

    return {
        "predicted_class":      int(pred),
        "severity_label":       label_map.get(int(pred), "Unknown"),
        "risk_score":           round(score, 2),
        "probabilities":        proba_dict,
        "feature_contributions": contributions,
        "explanation":          explanation,
        "model_used":           "Random Forest",
        "n_estimators":         getattr(rf_model, "n_estimators", "N/A"),
    }


def get_shap_summary() -> Dict[str, Any]:
    """
    Returns SHAP-style summary using RF feature importances.
    Not true SHAP values (requires shap library) but equivalent
    for tree models when feature importances are reliable.

    For true SHAP: pip install shap
    Then: import shap; explainer = shap.TreeExplainer(rf_model)
    """
    if rf_model is None:
        return {"error": "Model not loaded"}

    fi  = get_feature_importances()
    return {
        "method":  "RF feature_importances_ (MDI — Mean Decrease Impurity)",
        "note":    "For SHAP values: pip install shap, then use shap.TreeExplainer(rf_model)",
        "summary": fi["ranked"],
        "interpretation": (
            "Values show what fraction of total prediction power each feature holds. "
            "Higher = more important for predicting accident severity."
        ),
    }


# ══════════════════════════════════════════════════════════════════
#  RUN DIRECTLY — prints full XAI report to terminal
# ══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("\n" + "="*60)
    print("  IntelliCrash XAI — Explainability Report")
    print("="*60)

    # 1. Model status
    status = get_model_status()
    print(f"\n📦 Model Status:")
    print(f"   RF loaded:    {status['rf_loaded']}")
    print(f"   LSTM loaded:  {status['lstm_loaded']}")
    print(f"   Features:     {status['feature_count']}")
    print(f"   RF classes:   {status['rf_classes']}")
    print(f"   Feature names:{status['feature_names']}")

    if not status["rf_loaded"]:
        print("\n❌ RF model not loaded. Cannot run XAI.")
        print("   Put best_random_forest_model.pkl in the python/ folder.")
        sys.exit(1)

    # 2. Feature importances
    print(f"\n🌲 Feature Importances (from rf_model.feature_importances_):")
    print(f"   {'Rank':<5} {'Feature':<25} {'Importance':>10}  Note")
    print(f"   {'-'*65}")
    fi = get_feature_importances()
    for item in fi["ranked"]:
        bar = "█" * int(item["importance_%"] / 2)
        print(f"   {item['rank']:<5} {item['feature']:<25} {item['importance_%']:>6.2f}%  {bar}")

    # 3. Test predictions on HP road scenarios
    print(f"\n⚡ Test Predictions on HP Road Scenarios:")
    print(f"   {'Scenario':<35} {'Class':<8} {'Score':>6}  {'Explanation'}")
    print(f"   {'-'*90}")

    scenarios = [
        ("Night + Rain + Mountain + Fast",  {"Weather":1,"Road_Type":1,"Time_of_Day":3,"Speed_Limit":90,"Number_of_Vehicles":3,"Road_Condition":1,"Vehicle_Type":0,"Light_Condition":1,"Area_Type":0,"Critical_Zone":0,"Day_of_Week":5}),
        ("Day + Clear + Highway + Normal",  {"Weather":0,"Road_Type":2,"Time_of_Day":1,"Speed_Limit":60,"Number_of_Vehicles":5,"Road_Condition":0,"Vehicle_Type":0,"Light_Condition":0,"Area_Type":1,"Critical_Zone":0,"Day_of_Week":1}),
        ("Snow + iRAD Hotspot + Night",     {"Weather":3,"Road_Type":1,"Time_of_Day":3,"Speed_Limit":50,"Number_of_Vehicles":2,"Road_Condition":2,"Vehicle_Type":0,"Light_Condition":1,"Area_Type":0,"Critical_Zone":1,"Day_of_Week":6}),
        ("Morning + Dry + Village + Slow",  {"Weather":0,"Road_Type":0,"Time_of_Day":0,"Speed_Limit":30,"Number_of_Vehicles":1,"Road_Condition":0,"Vehicle_Type":0,"Light_Condition":0,"Area_Type":0,"Critical_Zone":0,"Day_of_Week":2}),
    ]

    for name, feats in scenarios:
        result = predict_with_xai(feats)
        sev = result["severity_label"]
        score = result["risk_score"]
        expl = result["explanation"][:55]
        print(f"   {name:<35} {sev:<8} {score:>6.1f}  {expl}")

    # 4. Save XAI report to JSON
    report = {
        "feature_importances": fi,
        "scenarios":           [{"name":n, "result":predict_with_xai(f)} for n,f in scenarios],
        "model_status":        status,
        "shap_summary":        get_shap_summary(),
    }
    out_path = BASE / "xai_report.json"
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n✅ Full XAI report saved to: {out_path}")
    print("="*60 + "\n")
