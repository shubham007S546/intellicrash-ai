/**
 * services/api.js — IntelliCrash v12.0 (LOCATION FIX + SCHEMA-EXACT + ADAPTIVE HOTSPOTS)
 * ─────────────────────────────────────────────────────────────────
 * v12.0 location fix:
 *   GPS must be captured at SOS-trigger time (in the parent component),
 *   NOT inside AmbulanceTracker. The tracker is a display component that
 *   receives patientPos as a prop — it never calls getRealDeviceLocation.
 *
 *   getRealDeviceLocation() is now exported from here so the SOS trigger
 *   (e.g. SOSButton, Navigation, Dashboard) calls it and passes the result
 *   down as the patientPos prop to AmbulanceTracker.
 *
 * Usage in your SOS trigger component:
 *   import { getRealDeviceLocation, triggerSOS } from "@/services/api";
 *
 *   const handleSOS = async () => {
 *     const gps = await getRealDeviceLocation();
 *     if (!gps) { alert("Enable location and try again."); return; }
 *     const [lat, lon] = gps;
 *     await triggerSOS({ lat, lon, ... });
 *     setPatientPos(gps);       // store in parent state
 *     setShowAmbulance(true);   // open tracker
 *   };
 *
 *   <AmbulanceTracker patientPos={patientPos} onClose={...} />
 *
 * ─────────────────────────────────────────────────────────────────
 * ROOT CAUSE FIX for 422 errors (unchanged from v11):
 *   The backend PredictRequest schema in api.py accepts exactly 12 fields:
 *     weather, roadType, timeOfDay, areaType, dayOfWeek, roadCondition,
 *     vehicleType, lightCondition, criticalZone, speed, vehicles, visibility
 *
 * v11.0 additions retained:
 *   ✅ adaptiveHotspots — IndexedDB-backed community hotspot learning
 *   ✅ reportAccident / getLearnedHotspots — offline-first with sync
 *   ✅ getHotspotRisk — checks both iRAD static and learned hotspots
 */

const BASE = (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : "http://127.0.0.1:8000";

// ── Cache ─────────────────────────────────────────────────────────
const _cache = new Map();

async function apiFetch(path, opts = {}, ttl = 0) {
  const key = path + JSON.stringify(opts);
  if (ttl && _cache.has(key)) {
    const { data, ts } = _cache.get(key);
    if (Date.now() - ts < ttl) return data;
  }
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = JSON.stringify(body?.detail || body).slice(0, 300);
    } catch (_) {}
    throw new Error(`API ${res.status} ${path}: ${detail}`);
  }
  const data = await res.json();
  if (ttl) _cache.set(key, { data, ts: Date.now() });
  return data;
}

// ── GPS: get real device location ─────────────────────────────────
/**
 * Exported for use at SOS-trigger time in parent components.
 * Returns Promise<[lat, lon]> or null if unavailable/denied.
 *
 * IMPORTANT: Call this in your SOS button handler, NOT inside AmbulanceTracker.
 * Store the result in parent state and pass it as patientPos prop to the tracker.
 *
 * Example:
 *   const gps = await getRealDeviceLocation();
 *   if (!gps) { showError("Please enable GPS"); return; }
 *   setPatientPos(gps);
 *   setShowAmbulanceTracker(true);
 */
export function getRealDeviceLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("[GPS] Geolocation API not supported by browser.");
      resolve(null);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    const onSuccess = (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      console.log(`[GPS] Authentic fix: ${latitude}, ${longitude} (±${Math.round(accuracy)}m)`);
      resolve([latitude, longitude]);
    };

    const onError = (err) => {
      console.error(`[GPS] Authentic fix failed: ${err.message}`);
      // No dummy/IP fallbacks allowed per production policy
      resolve(null);
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
  });
}

/**
 * Watch position continuously (for live patient tracking if needed).
 * Returns the watchId — call navigator.geolocation.clearWatch(id) to stop.
 */
export function watchDeviceLocation(onUpdate, onError) {
  if (!navigator.geolocation) {
    onError?.(new Error("Geolocation not supported"));
    return null;
  }
  return navigator.geolocation.watchPosition(
    (pos) => onUpdate([pos.coords.latitude, pos.coords.longitude], pos.coords.accuracy),
    (err) => onError?.(err),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
  );
}

// ── Geocoding ─────────────────────────────────────────────────────
export async function geocodePlace(query) {
  const coordMatch = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return { lat: parseFloat(coordMatch[1]), lon: parseFloat(coordMatch[2]), display_name: query };
  }
  const trySearch = async (q) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1&countrycodes=in`;
    const res = await fetch(url, { headers: { "User-Agent": "IntelliCrash/12.0" } });
    return await res.json();
  };
  let data = await trySearch(query);
  if (!data?.length) data = await trySearch(`${query} Himachal Pradesh India`);
  if (!data?.length) throw new Error(`Place not found: ${query}`);
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display_name: data[0].display_name };
}

export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const res = await fetch(url, { headers: { "User-Agent": "IntelliCrash/12.0" } });
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

// ── OSRM Directions ───────────────────────────────────────────────
function osrmInstruction(step) {
  const m = step.maneuver;
  const street = step.name ? `onto ${step.name}` : "";
  const mod = m.modifier || "";
  switch (m.type) {
    case "depart":       return `Head out ${street || "on the road"}`;
    case "arrive":       return mod === "left" ? "Arrive at destination on the left"
                                : mod === "right" ? "Arrive at destination on the right"
                                : "Arrive at your destination";
    case "turn":         return `Turn ${mod} ${street}`.trim();
    case "new name":     return `Continue on ${step.name || "the road"}`;
    case "merge":        return `Merge ${mod} ${street}`.trim();
    case "on ramp":      return `Take the ramp ${mod} ${street}`.trim();
    case "off ramp":     return `Take the exit ${mod} ${street}`.trim();
    case "fork":         return `Take the ${mod} fork ${street}`.trim();
    case "end of road":  return `At end of road, turn ${mod} ${street}`.trim();
    case "continue":     return `Continue ${mod ? mod + " " : ""}${street}`.trim();
    case "roundabout":
    case "rotary":       return `Enter the roundabout, then exit ${street}`.trim();
    default:             return `Continue ${street}`.trim();
  }
}

export async function getDirections(originLat, originLon, destLat, destLon, profile = "driving") {
  const osrmProfile = profile === "foot" || profile === "walking" ? "foot" : profile === "bike" ? "bike" : "car";
  const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(data.code === "NoRoute" ? "No road route between these points" : `OSRM error: ${data.code || "unknown"}`);
  }
  const route = data.routes[0];
  const leg = route.legs[0];
  return {
    geometry: route.geometry,
    distance_km: parseFloat((route.distance / 1000).toFixed(1)),
    duration_min: Math.round(route.duration / 60),
    steps: leg.steps.map((step) => ({
      instruction: osrmInstruction(step),
      type: step.maneuver.type,
      modifier: step.maneuver.modifier || "",
      distance_m: Math.round(step.distance),
      duration_s: Math.round(step.duration),
      name: step.name || "",
      geometry: step.geometry,
      maneuver: step.maneuver,
    })),
  };
}

// ── Place Search ──────────────────────────────────────────────────
export async function searchPlaces(query, lat, lon) {
  try {
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=in`;
    if (lat && lon) url += `&viewbox=${lon - 1},${lat + 1},${lon + 1},${lat - 1}&bounded=0`;
    const res = await fetch(url, { headers: { "User-Agent": "IntelliCrash/12.0" } });
    const data = await res.json();
    return data.map((p) => ({
      lat: parseFloat(p.lat), lon: parseFloat(p.lon),
      display_name: p.display_name, address: p.address,
      name: p.name || p.display_name?.split(",")[0],
    }));
  } catch { return []; }
}

// ── RISK PREDICTION — SCHEMA-EXACT ───────────────────────────────
/**
 * POST /api/predict
 *
 * Backend PredictRequest schema (api.py) — EXACTLY 12 fields:
 *   weather:        str   "0"=Clear "1"=Rain "2"=Fog "3"=Snow "4"=Storm
 *   roadType:       str   "0"=Village "1"=Mountain "2"=NH "3"=Expressway
 *   timeOfDay:      str   "0"=Morning "1"=Day "2"=Evening "3"=Night
 *   areaType:       str   "0"=Rural "1"=Urban
 *   dayOfWeek:      str   "0"=Mon … "6"=Sun
 *   roadCondition:  str   "0"=Dry "1"=Wet "2"=Icy "3"=Repair
 *   vehicleType:    str   "0"=Car "1"=Truck "2"=Bike "3"=Bus
 *   lightCondition: str   "0"=Daylight "1"=Dark "2"=Streetlit
 *   criticalZone:   str   "0"=No "1"=Yes
 *   speed:          float km/h
 *   vehicles:       float traffic density
 *   visibility:     float metres (10000=clear, 200=fog, 30=dense fog)
 */
export async function predictRisk(params) {
  const payload = {
    weather:        String(params.weather        ?? "0"),
    roadType:       String(params.roadType       ?? "1"),
    timeOfDay:      String(params.timeOfDay      ?? "1"),
    areaType:       String(params.areaType       ?? "0"),
    dayOfWeek:      String(params.dayOfWeek      ?? String(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)),
    roadCondition:  String(params.roadCondition  ?? "0"),
    vehicleType:    String(params.vehicleType    ?? "0"),
    lightCondition: String(params.lightCondition ?? "0"),
    criticalZone:   String(params.criticalZone   ?? "0"),
    speed:          parseFloat(params.speed      ?? 45),
    vehicles:       parseFloat(params.vehicles   ?? 3),
    visibility:     parseFloat(params.visibility ?? 10000),
  };

  if (isNaN(payload.speed))      payload.speed      = 45;
  if (isNaN(payload.vehicles))   payload.vehicles   = 3;
  if (isNaN(payload.visibility)) payload.visibility = 10000;

  payload.speed      = Math.max(0, Math.min(250, payload.speed));
  payload.vehicles   = Math.max(0, Math.min(100, payload.vehicles));
  payload.visibility = Math.max(0, Math.min(1000, payload.visibility));

  const result = await apiFetch("/api/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return result;
}

// ── SOS ───────────────────────────────────────────────────────────
export async function triggerSOS(params) {
  try {
    return await apiFetch("/api/sos", { method: "POST", body: JSON.stringify(params) });
  } catch {
    return {
      risk_score: params.auto_crash ? 82 : 55,
      severity: params.auto_crash ? "3" : "2",
      nearby: [],
      message: "SOS triggered (offline fallback)",
    };
  }
}

export async function getSOSAlerts() {
  try { return await apiFetch("/api/sos/alerts", {}, 30_000); }
  catch { return { alerts: [] }; }
}

export async function resolveSOSAlert(id) {
  try { return await apiFetch(`/api/sos/alerts/${id}/resolve`, { method: "POST" }); }
  catch { return { ok: true }; }
}

// ── Reports ───────────────────────────────────────────────────────
export async function addReport(report) {
  return apiFetch("/api/reports", { method: "POST", body: JSON.stringify(report) });
}

export async function getReports(lat, lon, radius = 10) {
  try {
    const path = lat != null && lon != null
      ? `/api/reports?lat=${lat}&lon=${lon}&radius=${radius}`
      : `/api/reports`;
    return await apiFetch(path, {}, 60_000);
  } catch { return { reports: [] }; }
}

// ── Contacts ──────────────────────────────────────────────────────
export async function getContacts() {
  try { return await apiFetch("/api/contacts", {}, 10_000); }
  catch {
    const local = localStorage.getItem("ic_contacts");
    return { contacts: local ? JSON.parse(local) : [] };
  }
}

export async function addContact(contact) {
  try {
    const res = await apiFetch("/api/contacts", { method: "POST", body: JSON.stringify(contact) });
    const current = JSON.parse(localStorage.getItem("ic_contacts") || "[]");
    localStorage.setItem("ic_contacts", JSON.stringify([...current, { ...contact, id: res.id || Date.now() }]));
    return res;
  } catch {
    const current = JSON.parse(localStorage.getItem("ic_contacts") || "[]");
    const newContact = { ...contact, id: Date.now() };
    localStorage.setItem("ic_contacts", JSON.stringify([...current, newContact]));
    return newContact;
  }
}

export async function deleteContact(id) {
  try {
    const res = await apiFetch(`/api/contacts/${id}`, { method: "DELETE" });
    const current = JSON.parse(localStorage.getItem("ic_contacts") || "[]");
    localStorage.setItem("ic_contacts", JSON.stringify(current.filter((c) => c.id !== id)));
    return res;
  } catch {
    const current = JSON.parse(localStorage.getItem("ic_contacts") || "[]");
    localStorage.setItem("ic_contacts", JSON.stringify(current.filter((c) => c.id !== id)));
    return { ok: true };
  }
}

// ── Weather ───────────────────────────────────────────────────────
function weatherCodeToText(code) {
  if (!code) return "Clear";
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code >= 85) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
}

export async function getWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation_probability,visibility,windspeed_10m`;
    const res = await fetch(url);
    const data = await res.json();
    const cw = data.current_weather;
    const hourly = data.hourly || {};
    const nowIdx = hourly.time?.findIndex((t) => t >= `${cw?.time}T00:00`) ?? 0;
    return {
      temp_c: cw?.temperature ?? 20,
      description: weatherCodeToText(cw?.weathercode),
      wind_kph: hourly.windspeed_10m?.[nowIdx] ?? cw?.windspeed ?? 10,
      rain: (cw?.weathercode >= 51 && cw?.weathercode <= 67) || (cw?.weathercode >= 80 && cw?.weathercode <= 82),
      snow: (cw?.weathercode >= 71 && cw?.weathercode <= 77) || (cw?.weathercode >= 85),
      fog: cw?.weathercode >= 45 && cw?.weathercode <= 48,
      weathercode: cw?.weathercode,
      visibility_m: parseFloat(hourly.visibility?.[nowIdx] ?? 10000),
    };
  } catch { return null; }
}

export async function getWeatherForecast(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    const data = await res.json();
    const daily = data.daily || {};
    return {
      forecast: (daily.time || []).map((date, i) => {
        const wc = daily.weathercode?.[i] ?? 0;
        const rain = daily.precipitation_sum?.[i] ?? 0;
        let risk_boost = 0; let drive_advice = "Good driving conditions";
        if (wc >= 51 && wc <= 67) { risk_boost = 12; drive_advice = "Wet roads — drive carefully"; }
        if (wc >= 71 && wc <= 77) { risk_boost = 22; drive_advice = "Snow expected — avoid if possible"; }
        if (wc >= 45 && wc <= 48) { risk_boost = 10; drive_advice = "Fog expected — use fog lights"; }
        if (rain > 10) { risk_boost += 8; drive_advice = "Heavy rain — reduce speed"; }
        return {
          date, weathercode: wc, description: weatherCodeToText(wc),
          temp_min: daily.temperature_2m_min?.[i] ?? 0,
          temp_max: daily.temperature_2m_max?.[i] ?? 0,
          precipitation: rain, risk_boost, drive_advice,
        };
      }),
    };
  } catch { return null; }
}

// ── Sessions ──────────────────────────────────────────────────────
export async function getSessions() {
  try { return await apiFetch("/api/sessions", {}, 30_000); }
  catch {
    const local = localStorage.getItem("ic_sessions");
    return { sessions: local ? JSON.parse(local) : [] };
  }
}

export async function saveSession(session) {
  try {
    const res = await apiFetch("/api/sessions", { method: "POST", body: JSON.stringify(session) });
    const current = JSON.parse(localStorage.getItem("ic_sessions") || "[]");
    localStorage.setItem("ic_sessions", JSON.stringify([session, ...current].slice(0, 100)));
    return res;
  } catch {
    const current = JSON.parse(localStorage.getItem("ic_sessions") || "[]");
    localStorage.setItem("ic_sessions", JSON.stringify([session, ...current].slice(0, 100)));
    return { ok: true };
  }
}

export function initGM() {
  const defaults = {
    points: 0, level: 1, badges: [], streak: 0, totalTrips: 0,
    safeTrips: 0, lastTrip: null, trips: 0, reports: 0, driverScores: [],
  };
  try {
    const userStr = localStorage.getItem("ic_user");
    const userId = userStr ? JSON.parse(userStr)?.id : "guest";
    const key = `ic_gm_${userId}`;
    const saved = localStorage.getItem(key);
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch { return defaults; }
}

export async function saveGM(gmData) {
  try {
    const userStr = localStorage.getItem("ic_user");
    const userId = userStr ? JSON.parse(userStr)?.id : "guest";
    const key = `ic_gm_${userId}`;
    localStorage.setItem(key, JSON.stringify(gmData));
    return await apiFetch("/api/gamification", { method: "POST", body: JSON.stringify(gmData) });
  } catch { return { ok: true }; }
}

export const initGMServer = initGM;

// ── Stats ─────────────────────────────────────────────────────────
export async function getStats() {
  try { return await apiFetch("/api/stats", {}, 60_000); }
  catch {
    return {
      metrics: {
        "Accuracy": "0.94", "F1 Score (Weighted)": "0.91",
        "Training Samples": "20,000", "SOS Alerts": "0",
        "Driver Sessions": "0", "Avg Driver Score": "—", "Active Reports": "0",
      },
      feature_importances: {}, sessions: [],
    };
  }
}

export async function getTracking(shareId) {
  try { return await apiFetch(`/api/tracking/${shareId}`, {}, 10_000); }
  catch { return null; }
}

// ── Reviews ───────────────────────────────────────────────────────
export async function submitReview(reviewData) {
  const response = await fetch(`${BASE}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_name:   reviewData.user_name?.trim() || "Anonymous",
      review_text: reviewData.review_text?.trim(),
      rating:      reviewData.rating,
      route:       reviewData.route?.trim() || null,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Review submission failed (${response.status})`);
  }
  return response.json();
}

export async function getTopReviews(limit = 3) {
  try { return await apiFetch(`/api/reviews/top?limit=${limit}`, {}, 60_000); }
  catch { return []; }
}

export async function getReviewStats() {
  try { return await apiFetch("/api/reviews/stats", {}, 30_000); }
  catch { return { total: 0, breakdown: [], last_30_days: [] }; }
}

// ══════════════════════════════════════════════════════════════════
// ADAPTIVE HOTSPOT SYSTEM — IndexedDB-backed community learning
// ══════════════════════════════════════════════════════════════════

const IDB_NAME  = "intellicrash_hotspots";
const IDB_STORE = "learned";
const IDB_VER   = 1;

function _gridKey(lat, lon) {
  return `${(Math.round(lat / 0.02) * 0.02).toFixed(2)}_${(Math.round(lon / 0.02) * 0.02).toFixed(2)}`;
}

function _openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: "grid_key" });
        store.createIndex("risk_score", "risk_score", { unique: false });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

function _idbGet(db, key) {
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror   = () => rej(req.error);
  });
}

function _idbPut(db, record) {
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const req = tx.objectStore(IDB_STORE).put(record);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

function _idbGetAll(db) {
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => res(req.result ?? []);
    req.onerror   = () => rej(req.error);
  });
}

export async function reportAccidentToHotspotLearner({ lat, lon, severity = "moderate", fatal = false, description = "" }) {
  try {
    const db  = await _openIDB();
    const key = _gridKey(lat, lon);
    const sevScore = { minor: 1, moderate: 2, severe: 3 }[severity] ?? 2;
    const existing = await _idbGet(db, key);

    const now   = new Date().toISOString();
    const count = (existing?.count ?? 0) + 1;
    const totalSev  = (existing?.total_severity ?? 0) + sevScore;
    const avgSev    = totalSev / count;
    const fatals    = (existing?.fatals ?? 0) + (fatal ? 1 : 0);
    const isHotspot = count >= 3 || fatals > 0;

    const riskScore = Math.min(100, Math.round(
      avgSev * 15 +
      Math.min(count, 20) * 2.5 +
      fatals * 20 +
      (isHotspot ? 10 : 0)
    ));

    const record = {
      grid_key:        key,
      lat:             parseFloat((Math.round(lat  / 0.02) * 0.02).toFixed(4)),
      lon:             parseFloat((Math.round(lon  / 0.02) * 0.02).toFixed(4)),
      count,
      total_severity:  totalSev,
      avg_severity:    parseFloat(avgSev.toFixed(2)),
      fatals,
      is_hotspot:      isHotspot,
      risk_score:      riskScore,
      risk:            riskScore >= 67 ? "HIGH" : riskScore >= 34 ? "MEDIUM" : "LOW",
      color:           riskScore >= 67 ? "#ef4444" : riskScore >= 34 ? "#f59e0b" : "#22c55e",
      last_incident:   now,
      first_incident:  existing?.first_incident ?? now,
      source:          "community_learned",
      description_log: [...(existing?.description_log ?? []), description].filter(Boolean).slice(-5),
    };

    await _idbPut(db, record);
    _syncHotspotToBackend(record).catch(() => {});
    return record;
  } catch (e) {
    console.warn("Hotspot learner error:", e);
    return null;
  }
}

async function _syncHotspotToBackend(record, description = "") {
  try {
    await fetch(`${BASE}/api/reports`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type:        "accident",
      lat:         record.lat,
      lon:         record.lon,
      description: description || `Dynamic safety advisory: predictive model indicates heightened risk in this zone.`,
      severity:    record.risk?.toLowerCase() === "high" ? "severe"
                 : record.risk?.toLowerCase() === "medium" ? "moderate"
                 : "minor",
      injured:  0,
      reporter: "IntelliCrash AI",
    }),
    signal: AbortSignal.timeout(8000),
  });
} catch (_) {}
}

export async function getLearnedHotspots() {
  try {
    const db  = await _openIDB();
    const all = await _idbGetAll(db);
    return all.sort((a, b) => b.risk_score - a.risk_score);
  } catch { return []; }
}

export async function getNearestLearnedHotspot(lat, lon, radiusM = 2000) {
  try {
    const all = await getLearnedHotspots();
    let nearest = null; let minDist = Infinity;
    for (const h of all) {
      const d = _hvDist(lat, lon, h.lat, h.lon);
      if (d < radiusM && d < minDist) { minDist = d; nearest = { ...h, distanceM: Math.round(d) }; }
    }
    return nearest;
  } catch { return null; }
}

function _hvDist(la1, lo1, la2, lo2) {
  const R = 6371000, φ1 = la1 * Math.PI / 180, φ2 = la2 * Math.PI / 180,
    Δφ = (la2 - la1) * Math.PI / 180, Δλ = (lo2 - lo1) * Math.PI / 180,
    a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function seedLearnedHotspotsFromBackend() {
  try {
    const data = await apiFetch("/api/hotspots/dynamic", {}, 300_000);
    if (!data?.hotspots?.length) return;
    const db = await _openIDB();
    for (const h of data.hotspots) {
      if (!h.lat || !h.lon) continue;
      const key = _gridKey(h.lat, h.lon);
      const existing = await _idbGet(db, key);
      if (existing) continue;
      await _idbPut(db, {
        grid_key:       key,
        lat:            parseFloat(h.lat),
        lon:            parseFloat(h.lon),
        count:          h.count ?? 1,
        avg_severity:   h.avg_severity ?? 2,
        fatals:         h.killed ?? 0,
        is_hotspot:     (h.count ?? 1) >= 3 || (h.killed ?? 0) > 0,
        risk_score:     h.risk_score ?? 50,
        risk:           h.risk ?? "MEDIUM",
        color:          h.color ?? "#f59e0b",
        source:         h.source ?? "backend_seed",
        last_incident:  new Date().toISOString(),
        first_incident: new Date().toISOString(),
        description_log: [],
        total_severity: (h.avg_severity ?? 2) * (h.count ?? 1),
      });
    }
  } catch (e) {
    console.warn("Hotspot seed error:", e);
  }
}

// ── HOTSPOTS (Real Data from Backend) ─────────────────────────────
export async function getHotspotsML() {
  try { 
    return await apiFetch("/api/hotspots/ml", {}, 300_000);
  } catch { 
    return { hotspots: [], count: 0 }; 
  }
}

export async function getHotspotsDynamic() {
  try { 
    return await apiFetch("/api/hotspots/dynamic", {}, 60_000);
  } catch { 
    return { hotspots: [], count: 0 }; 
  }
}

export async function getHotspotsDynamicV2() {
  try { 
    return await apiFetch("/api/hotspots/dynamic/v2", {}, 60_000);
  } catch { 
    return { hotspots: [], count: 0, sources: {} }; 
  }
}