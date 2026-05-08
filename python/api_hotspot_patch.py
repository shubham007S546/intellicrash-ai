"""
api_hotspot_patch.py — IntelliCrash Backend Hotspot ML Routes
=============================================================
ADD THESE ROUTES to your existing api.py.

Changes from old api.py:
  ✅ /api/hotspots/ml         — All 38 iRAD hotspots with ML-predicted risk
  ✅ /api/hotspots/risk/{id}  — Individual hotspot ML risk prediction
  ✅ /api/hotspots/model/info — Model metadata (accuracy, datasets, features)
  ✅ /api/hotspots/distribution — Risk distribution by district
  ✅ OLD /api/hotspots/dynamic  — UPDATED to include ML scores
  ✅ HP_HOTSPOT_STATIC in api.py REPLACED with hotspot_model.IRAD_HOTSPOT_DEFINITIONS

INSTALLATION:
1. Copy hotspot_model.py to your python/ folder
2. Run: python train_hotspot_model.py  (generates .pkl files)
3. Add the import and routes below to api.py

─────────────────────────────────────────────────────────────────

STEP 1 — Add this import at the top of api.py (after existing imports):

    from hotspot_model import (
        score_all_hotspots,
        predict_hotspot,
        get_hotspot_metadata,
        get_risk_distribution,
        IRAD_HOTSPOT_DEFINITIONS,
    )

─────────────────────────────────────────────────────────────────

STEP 2 — Replace the HP_HOTSPOT_STATIC definition in api.py with:

    # HP_HOTSPOT_STATIC is now ML-driven via hotspot_model.py
    # For backward compat (Navigation.jsx still uses this list):
    HP_HOTSPOT_STATIC = [
        (lat, lon, name, district, acc, fat)
        for lat, lon, name, district, acc, fat, road, terrain
        in IRAD_HOTSPOT_DEFINITIONS
    ]

─────────────────────────────────────────────────────────────────

STEP 3 — Add these new routes to api.py:
"""

# ── PASTE THESE ROUTES INTO api.py ────────────────────────────────

NEW_ROUTES_CODE = '''

# ══════════════════════════════════════════════════════════════════
# HOTSPOT ML ROUTES — Multi-Dataset Model
# Trained on: iRAD HP + Kaggle US + UK STATS19 + NRSC/BMTPC + OSM
# ══════════════════════════════════════════════════════════════════

@app.get("/api/hotspots/ml", tags=["Hotspots"])
def get_ml_hotspots():
    """
    All 38 iRAD HP hotspots with ML-predicted risk scores.
    Risk levels computed by RandomForest trained on 14,456 samples
    from 5 international accident datasets.
    """
    try:
        hotspots = score_all_hotspots()
        return {
            "hotspots": hotspots,
            "count":    len(hotspots),
            "model":    "RandomForest_MultiDataset_v2",
            "datasets": [
                "iRAD HP 2021-26 (official)",
                "Kaggle US-Accidents (Moosavi et al.)",
                "UK STATS19 Road Safety",
                "HP NRSC/BMTPC terrain data",
                "OpenStreetMap infrastructure hazards",
            ],
            "accuracy": get_hotspot_metadata().get("accuracy"),
        }
    except Exception as e:
        logger.error(f"ML hotspots error: {e}")
        raise HTTPException(500, str(e))


@app.post("/api/hotspots/predict", tags=["Hotspots"])
@limiter.limit("60/minute")
def predict_single_hotspot(request: Request, body: dict):
    """
    Predict risk for any lat/lon using the trained ML model.
    Body: { lat, lon, terrain?, road?, accidents?, fatalities?, elevation_m? }
    """
    try:
        result = predict_hotspot(
            lat=float(body.get("lat", 31.1)),
            lon=float(body.get("lon", 77.2)),
            terrain=str(body.get("terrain", "mountain")),
            road=str(body.get("road", "SH")),
            accidents=int(body.get("accidents", 10)),
            fatalities=int(body.get("fatalities", 3)),
            elevation_m=body.get("elevation_m"),
        )
        return result
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/api/hotspots/model/info", tags=["Hotspots"])
def hotspot_model_info():
    """Training metadata: accuracy, F1, datasets, feature importances."""
    return get_hotspot_metadata()


@app.get("/api/hotspots/distribution", tags=["Hotspots"])
def hotspot_risk_distribution():
    """Risk distribution across all HP districts."""
    return get_risk_distribution()


@app.get("/api/hotspots/dynamic", tags=["Analytics"])
def dynamic_hotspots_v2():
    """
    UPDATED: Returns ML-scored iRAD hotspots + community-reported learned hotspots.
    Replaces the old version that used hardcoded HIGH/MEDIUM labels.
    """
    conn = get_db()
    learned = conn.execute(
        "SELECT lat,lon,grid_key,report_count,avg_severity,last_updated,source "
        "FROM hotspot_learning WHERE report_count>=2 "
        "ORDER BY avg_severity DESC, report_count DESC LIMIT 30"
    ).fetchall()
    recent = conn.execute(
        "SELECT lat,lon,COUNT(*) as cnt, "
        "AVG(CASE severity WHEN 'severe' THEN 3 WHEN 'moderate' THEN 2 ELSE 1 END) as avg_sev "
        "FROM community_reports "
        "WHERE timestamp>? AND status='active' "
        "GROUP BY ROUND(lat,2), ROUND(lon,2) HAVING cnt>=1",
        ((datetime.now() - timedelta(hours=24)).isoformat(),)
    ).fetchall()
    conn.close()

    # ML-scored iRAD hotspots
    ml_hotspots = score_all_hotspots()
    result = []
    for h in ml_hotspots:
        result.append({
            "lat":         h["lat"],
            "lon":         h["lon"],
            "name":        h["name"],
            "district":    h["district"],
            "count":       h["accidents"],
            "killed":      h["killed"],
            "avg_severity":h["risk_level"] + 1,  # 1-3 scale
            "risk":        h["risk"],
            "risk_score":  h["risk_score"],
            "source":      "irad_ml_" + "_".join(h.get("datasets", ["irad"])[:2]),
            "type":        "irad_ml",
            "color":       h["color"],
            "model_used":  h.get("model_used", "rf"),
        })

    # Community-learned hotspots
    for r in learned:
        risk_ml = predict_hotspot(r["lat"], r["lon"], accidents=r["report_count"])
        result.append({
            "lat":         r["lat"],
            "lon":         r["lon"],
            "count":       r["report_count"],
            "avg_severity":r["avg_severity"],
            "risk":        risk_ml["risk_label"],
            "risk_score":  risk_ml["risk_score"],
            "source":      r["source"],
            "type":        "community_learned",
            "color":       risk_ml["color"],
        })

    # Recent reports
    for r in recent:
        result.append({
            "lat":         r["lat"],
            "lon":         r["lon"],
            "count":       r["cnt"],
            "avg_severity":r["avg_sev"],
            "risk":        "HIGH" if r["avg_sev"] >= 2.5 else "MEDIUM",
            "risk_score":  r["avg_sev"] * 30,
            "type":        "recent_24h",
            "color":       "#ef4444" if r["avg_sev"] >= 2.5 else "#f59e0b",
        })

    return {"hotspots": result, "count": len(result), "ml_scored": len(ml_hotspots)}

'''

if __name__ == "__main__":
    print("=" * 60)
    print("  HOTSPOT ROUTES PATCH — Instructions")
    print("=" * 60)
    print()
    print("1. Copy to python/ folder:")
    print("   - hotspot_model.py")
    print("   - hotspot_rf_model.pkl")
    print("   - hotspot_scaler.pkl")
    print("   - hotspot_encoder.pkl")
    print("   - hotspot_feature_names.pkl")
    print("   - hotspot_metadata.json")
    print()
    print("2. Add to api.py (top of file, after existing imports):")
    print("   from hotspot_model import (")
    print("       score_all_hotspots, predict_hotspot,")
    print("       get_hotspot_metadata, get_risk_distribution,")
    print("       IRAD_HOTSPOT_DEFINITIONS,")
    print("   )")
    print()
    print("3. Replace HP_HOTSPOT_STATIC in api.py:")
    print("   HP_HOTSPOT_STATIC = [")
    print("       (lat, lon, name, district, acc, fat)")
    print("       for lat,lon,name,district,acc,fat,road,terrain")
    print("       in IRAD_HOTSPOT_DEFINITIONS")
    print("   ]")
    print()
    print("4. Replace /api/hotspots/dynamic route in api.py")
    print("   with the new version from this patch.")
    print()
    print("5. Add new routes:")
    print("   /api/hotspots/ml")
    print("   /api/hotspots/predict")
    print("   /api/hotspots/model/info")
    print("   /api/hotspots/distribution")
    print()
    print("Routes code saved in NEW_ROUTES_CODE variable.")
    print("=" * 60)

    # Save routes to a separate file for easy copy-paste
    with open("hotspot_routes.py", "w", encoding="utf-8", errors="ignore") as f:
        f.write("# Paste these routes into api.py\n")
        f.write("# Required import: from hotspot_model import score_all_hotspots, predict_hotspot, get_hotspot_metadata, get_risk_distribution\n\n")
        f.write(NEW_ROUTES_CODE)
    print("\n Routes saved to hotspot_routes.py")
