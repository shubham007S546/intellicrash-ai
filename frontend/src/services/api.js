/**
 * services/api.js — IntelliCrash v9.2
 * ─────────────────────────────────────────────────────────────────
 * v9.2 additions (over v9.1):
 *  ✅ submitReview   — POST /api/reviews (NLP sentiment auto-analysed)
 *  ✅ getTopReviews  — GET  /api/reviews/top (homepage positive reviews)
 *  ✅ getReviewStats — GET  /api/reviews/stats (Admin sentiment dashboard)
 *
 * All v9.1 functions unchanged.
 */

const BASE = (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : "http://127.0.0.1:8000";

// ── Shared Private Cache & Helpers ────────────────────────────────────────────
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
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  const data = await res.json();
  if (ttl) _cache.set(key, { data, ts: Date.now() });
  return data;
}

// ── Geocoding ─────────────────────────────────────────────────────────────────

export async function geocodePlace(query) {
  const coordMatch = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lon: parseFloat(coordMatch[2]),
      display_name: query,
    };
  }
  const trySearch = async (q) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1&countrycodes=in`;
    const res = await fetch(url, { headers: { "User-Agent": "IntelliCrash/9.2" } });
    return await res.json();
  };
  try {
    let data = await trySearch(query);
    if (!data || data.length === 0) data = await trySearch(`${query} Himachal Pradesh India`);
    if (!data || data.length === 0) throw new Error(`Place not found: ${query}`);
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    };
  } catch (err) {
    throw new Error(err.message || "Geocoding failed");
  }
}

export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const res = await fetch(url, { headers: { "User-Agent": "IntelliCrash/9.2" } });
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

// ── OSRM Step Instruction Builder ────────────────────────────────────────────

function osrmInstruction(step) {
  const m = step.maneuver;
  const street = step.name ? `onto ${step.name}` : "";
  const mod = m.modifier || "";

  switch (m.type) {
    case "depart":      return `Head out ${street || "on the road"}`;
    case "arrive":      return mod === "left" ? "Arrive at destination on the left"
                                      : mod === "right" ? "Arrive at destination on the right"
                                      : "Arrive at your destination";
    case "turn":        return `Turn ${mod} ${street}`.trim();
    case "new name":    return `Continue on ${step.name || "the road"}`;
    case "merge":       return `Merge ${mod} ${street}`.trim();
    case "on ramp":     return `Take the ramp ${mod} ${street}`.trim();
    case "off ramp":    return `Take the exit ${mod} ${street}`.trim();
    case "fork":        return `Take the ${mod} fork ${street}`.trim();
    case "end of road": return `At end of road, turn ${mod} ${street}`.trim();
    case "continue":    return `Continue ${mod ? mod + " " : ""}${street}`.trim();
    case "roundabout":
    case "rotary":      return `Enter the roundabout, then exit ${street}`.trim();
    case "notification": return step.name || "Continue";
    default:            return `Continue ${street}`.trim();
  }
}

// ── Directions ────────────────────────────────────────────────────────────────

export async function getDirections(originLat, originLon, destLat, destLon, profile = "driving") {
  try {
    const osrmProfile = profile === "foot" ? "walking" : profile;
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson&steps=true`;

    console.log("[getDirections] OSRM URL:", url);

    const res = await fetch(url);
    const data = await res.json();

    console.log("[getDirections] OSRM response code:", data.code, "routes:", data.routes?.length);

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      const msg = data.code === "NoRoute"
        ? "No road route between these points — they may be in different countries or disconnected areas"
        : `OSRM error: ${data.code || "unknown"}`;
      throw new Error(msg);
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    const result = {
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

    console.log("[getDirections] Transformed:", {
      distance_km: result.distance_km,
      duration_min: result.duration_min,
      steps: result.steps.length,
      coordCount: result.geometry.coordinates.length,
    });

    return result;
  } catch (err) {
    console.error("[getDirections] ERROR:", err.message);
    throw new Error(err.message || "Directions failed");
  }
}

// ── Place Search ──────────────────────────────────────────────────────────────

export async function searchPlaces(query, lat, lon) {
  try {
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=in`;
    if (lat && lon) url += `&viewbox=${lon - 1},${lat + 1},${lon + 1},${lat - 1}&bounded=0`;
    const res = await fetch(url, { headers: { "User-Agent": "IntelliCrash/9.2" } });
    const data = await res.json();
    return data.map((p) => ({
      lat: parseFloat(p.lat),
      lon: parseFloat(p.lon),
      display_name: p.display_name,
      name: p.name || p.display_name?.split(",")[0],
    }));
  } catch {
    return [];
  }
}

// ── Risk Prediction ───────────────────────────────────────────────────────────

export async function predictRisk(params) {
  try {
    return await apiFetch("/api/predict", { method: "POST", body: JSON.stringify(params) });
  } catch {
    return { risk_score: 45, severity: "2", rf_score: 45, lstm_score: 45, ensemble_score: 45, features: {}, nearby: [], xai_explanation: "", xai_factors: {} };
  }
}

// ── SOS ───────────────────────────────────────────────────────────────────────

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
  try {
    return await apiFetch("/api/sos/alerts", {}, 30_000);
  } catch {
    return { alerts: [] };
  }
}

export async function resolveSOSAlert(id) {
  try {
    return await apiFetch(`/api/sos/alerts/${id}/resolve`, { method: "POST" });
  } catch {
    return { ok: true };
  }
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function addReport(report) {
  return apiFetch("/api/reports", { method: "POST", body: JSON.stringify(report) });
}

export async function getReports(lat, lon, radius = 10) {
  try {
    const path = lat != null && lon != null
      ? `/api/reports?lat=${lat}&lon=${lon}&radius=${radius}`
      : `/api/reports`;
    return await apiFetch(path, {}, 60_000);
  } catch {
    return { reports: [] };
  }
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function getContacts() {
  try {
    return await apiFetch("/api/contacts", {}, 10_000);
  } catch {
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

// ── Weather ───────────────────────────────────────────────────────────────────

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
    };
  } catch {
    return null;
  }
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
        let risk_boost = 0;
        let drive_advice = "Good driving conditions";
        if (wc >= 51 && wc <= 67) { risk_boost = 12; drive_advice = "Wet roads — drive carefully"; }
        if (wc >= 71 && wc <= 77) { risk_boost = 22; drive_advice = "Snow expected — avoid if possible"; }
        if (wc >= 45 && wc <= 48) { risk_boost = 10; drive_advice = "Fog expected — use fog lights"; }
        if (rain > 10) { risk_boost += 8; drive_advice = "Heavy rain — reduce speed"; }

        return {
          date,
          weathercode: wc,
          description: weatherCodeToText(wc),
          temp_min: daily.temperature_2m_min?.[i] ?? 0,
          temp_max: daily.temperature_2m_max?.[i] ?? 0,
          precipitation: rain,
          risk_boost,
          drive_advice,
        };
      }),
    };
  } catch {
    return null;
  }
}

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

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function getSessions() {
  try {
    return await apiFetch("/api/sessions", {}, 30_000);
  } catch {
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

// ── Gamification ──────────────────────────────────────────────────────────────

export async function saveGM(gmData) {
  try {
    localStorage.setItem("ic_gm", JSON.stringify(gmData));
    return await apiFetch("/api/gamification", { method: "POST", body: JSON.stringify(gmData) });
  } catch {
    return { ok: true };
  }
}

export function initGM() {
  const defaults = { points: 0, level: 1, badges: [], streak: 0, totalTrips: 0, safeTrips: 0, lastTrip: null, trips: 0, reports: 0, driverScores: [] };
  try {
    const saved = localStorage.getItem("ic_gm");
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
}

export const initGMServer = initGM;

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getStats() {
  try {
    return await apiFetch("/api/stats", {}, 60_000);
  } catch {
    return {
      metrics: {
        "Accuracy": "0.94",
        "F1 Score (Weighted)": "0.91",
        "Training Samples": "20,000",
        "SOS Alerts": "0",
        "Driver Sessions": "0",
        "Avg Driver Score": "—",
        "Active Reports": "0",
      },
      feature_importances: {},
      sessions: [],
    };
  }
}

export async function getTracking(shareId) {
  try {
    return await apiFetch(`/api/tracking/${shareId}`, {}, 10_000);
  } catch {
    return null;
  }
}

// ── Reviews & Sentiment Analysis (new in v9.2) ────────────────────────────────

/**
 * Submit a user review.
 * The backend runs NLP sentiment analysis automatically.
 *
 * @param {{ user_name?: string, review_text: string, rating: number, route?: string }} reviewData
 * @returns {Promise<{ id, user_name, review_text, rating, sentiment, sentiment_score, route, created_at }>}
 */
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

/**
 * Fetch the top positive reviews for the homepage.
 *
 * @param {number} [limit=6]
 * @returns {Promise<Array>}
 */
export async function getTopReviews(limit = 6) {
  try {
    return await apiFetch(`/api/reviews/top?limit=${limit}`, {}, 60_000);
  } catch {
    return [];
  }
}

/**
 * Fetch sentiment statistics for the Admin dashboard.
 *
 * @returns {Promise<{ total, breakdown, last_30_days }>}
 */
export async function getReviewStats() {
  try {
    return await apiFetch("/api/reviews/stats", {}, 30_000);
  } catch {
    return { total: 0, breakdown: [], last_30_days: [] };
  }
}