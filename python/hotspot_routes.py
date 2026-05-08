# Paste these routes into api.py
# Required import: from hotspot_model import score_all_hotspots, predict_hotspot, get_hotspot_metadata, get_risk_distribution



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

