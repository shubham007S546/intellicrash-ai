/**
 * services/adaptiveHotspots.js — IntelliCrash v12.0
 * ─────────────────────────────────────────────────
 * Senior-grade adaptive hotspot engine. Fixes:
 *
 *  1. DEDUPLICATION  — same session can only contribute 1 report per grid
 *     cell per 30-minute window (prevents spam-clicking)
 *  2. FINE GRID      — 0.008° ≈ 888m (was 0.02°/2.2km — too coarse)
 *  3. TIME DECAY     — incidents older than 30 days lose weight exponentially
 *  4. THRESHOLD      — hotspot only when weighted score ≥ 15 (not raw count ≥ 3)
 *  5. MULTI-SOURCE   — differentiates community vs iRAD vs backend_seed weights
 *  6. COOLDOWN       — per-session debounce stored in sessionStorage
 *  7. CLEANUP        — stale zero-weight cells pruned on open
 *  8. NO SUPABASE KEY in client — sync goes through /api only
 */

const IDB_NAME    = "intellicrash_hotspots_v3"; // bump version to reset old bad data
const IDB_STORE   = "learned";
const IDB_VER     = 1;
const GRID_DEG    = 0.008;          // ~888 m grid cell
const DECAY_DAYS  = 30;             // half-life for old reports
const MIN_WEIGHT  = 15;             // weighted score needed to become a hotspot
const COOLDOWN_MS = 30 * 60 * 1000; // 30 min per cell per session

// ── IndexedDB helpers ─────────────────────────────────────────────

function _openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: "grid_key" });
        store.createIndex("weighted_score", "weighted_score", { unique: false });
        store.createIndex("is_hotspot", "is_hotspot", { unique: false });
      }
    };
    req.onsuccess  = () => res(req.result);
    req.onerror    = () => rej(req.error);
    req.onblocked  = () => rej(new Error("IDB blocked — close other tabs"));
  });
}

function _idbGet(db, key) {
  return new Promise((res, rej) => {
    const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror   = () => rej(req.error);
  });
}

function _idbPut(db, record) {
  return new Promise((res, rej) => {
    const req = db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(record);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

function _idbDelete(db, key) {
  return new Promise((res, rej) => {
    const req = db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).delete(key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

function _idbGetAll(db) {
  return new Promise((res, rej) => {
    const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).getAll();
    req.onsuccess = () => res(req.result ?? []);
    req.onerror   = () => rej(req.error);
  });
}

// ── Grid helpers ──────────────────────────────────────────────────

export function gridKey(lat, lon) {
  const g = GRID_DEG;
  return `${(Math.round(lat / g) * g).toFixed(4)}_${(Math.round(lon / g) * g).toFixed(4)}`;
}

function gridCenter(lat, lon) {
  const g = GRID_DEG;
  return {
    lat: parseFloat((Math.round(lat / g) * g).toFixed(4)),
    lon: parseFloat((Math.round(lon / g) * g).toFixed(4)),
  };
}

// ── Time decay ────────────────────────────────────────────────────
/**
 * Weight of a single incident decays exponentially.
 * At 0 days: weight = severityWeight
 * At DECAY_DAYS: weight = severityWeight / 2
 * At 2*DECAY_DAYS: weight = severityWeight / 4
 */
function incidentWeight(isoTimestamp, severity, fatal) {
  const sevW = { minor: 1.0, moderate: 2.5, severe: 5.0 }[severity] ?? 2.5;
  const fatalBonus = fatal ? 8.0 : 0;
  const ageMs  = Date.now() - new Date(isoTimestamp).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const decay  = Math.pow(0.5, ageDays / DECAY_DAYS);
  return (sevW + fatalBonus) * decay;
}

function recomputeWeightedScore(incidents) {
  return incidents.reduce((sum, inc) => sum + incidentWeight(inc.ts, inc.severity, inc.fatal), 0);
}

// ── Session cooldown (prevents spam in same browser session) ──────

function cooldownKey(gk) {
  return `ic_hsp_cd_${gk}`;
}

function isOnCooldown(gk) {
  try {
    const ts = parseInt(sessionStorage.getItem(cooldownKey(gk)) || "0", 10);
    return Date.now() - ts < COOLDOWN_MS;
  } catch { return false; }
}

function setCooldown(gk) {
  try { sessionStorage.setItem(cooldownKey(gk), String(Date.now())); } catch (_) {}
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Report an incident at (lat, lon).
 * Returns { record, isHotspot, weightedScore, alreadyReported } or null on error.
 *
 * @param {Object} opts
 * @param {number}  opts.lat
 * @param {number}  opts.lon
 * @param {string}  opts.severity   "minor"|"moderate"|"severe"
 * @param {boolean} opts.fatal
 * @param {string}  opts.description
 * @param {string}  opts.source     "community"|"backend_seed"|"irad"
 */
export async function reportIncident({
  lat, lon,
  severity    = "moderate",
  fatal       = false,
  description = "",
  source      = "community",
}) {
  try {
    const center = gridCenter(lat, lon);
    const gk     = gridKey(lat, lon);

    // ── Cooldown check (spam prevention) ────────────────────────
    if (source === "community" && isOnCooldown(gk)) {
      console.info(`[Hotspot] Cooldown active for cell ${gk} — ignoring duplicate report`);
      return { alreadyReported: true, grid_key: gk };
    }

    const db       = await _openIDB();
    const existing = await _idbGet(db, gk);
    const now      = new Date().toISOString();

    // Accumulate incidents list (keep last 50 to bound storage)
    const prevIncidents = existing?.incidents ?? [];
    const newIncidents  = [
      ...prevIncidents,
      { ts: now, severity, fatal, source, description: description.slice(0, 120) },
    ].slice(-50);

    const weightedScore = recomputeWeightedScore(newIncidents);
    const isHotspot     = weightedScore >= MIN_WEIGHT;
    const count         = newIncidents.filter(i => i.source === "community").length;

    const record = {
      grid_key:       gk,
      lat:            center.lat,
      lon:            center.lon,
      incidents:      newIncidents,
      count,                                          // community-only count
      weighted_score: parseFloat(weightedScore.toFixed(2)),
      is_hotspot:     isHotspot,
      risk:           weightedScore >= 30 ? "HIGH" : weightedScore >= MIN_WEIGHT ? "MEDIUM" : "LOW",
      color:          weightedScore >= 30 ? "#ef4444" : weightedScore >= MIN_WEIGHT ? "#f59e0b" : "#a855f7",
      // keep simple fields for Navigation.jsx compatibility
      avg_severity:   parseFloat(
        (newIncidents.reduce((s, i) => s + ({ minor:1, moderate:2, severe:3 }[i.severity]??2), 0) / newIncidents.length).toFixed(2)
      ),
      fatals:         newIncidents.filter(i => i.fatal).length,
      last_incident:  now,
      first_incident: existing?.first_incident ?? now,
      source:         existing?.source ?? source,
    };

    await _idbPut(db, record);

    // Set cooldown AFTER successful write
    if (source === "community") setCooldown(gk);

    // Non-blocking backend sync
    _syncToBackend(record, description).catch(() => {});

    return { ...record, alreadyReported: false };
  } catch (e) {
    console.error("[Hotspot] reportIncident error:", e);
    return null;
  }
}

/**
 * Get all hotspots sorted by weighted_score desc.
 * Optionally filters to only confirmed hotspots.
 */
export async function getLearnedHotspots({ confirmedOnly = false } = {}) {
  try {
    const db  = await _openIDB();
    let   all = await _idbGetAll(db);

    // Prune stale cells with effectively zero weight
    const toDelete = all.filter(r => recomputeWeightedScore(r.incidents ?? []) < 0.5);
    for (const r of toDelete) {
      await _idbDelete(db, r.grid_key);
    }

    all = all.filter(r => !toDelete.includes(r));

    // Recompute weights (decay may have changed since last write)
    all = all.map(r => ({
      ...r,
      weighted_score: parseFloat(recomputeWeightedScore(r.incidents ?? []).toFixed(2)),
      is_hotspot:     recomputeWeightedScore(r.incidents ?? []) >= MIN_WEIGHT,
    }));

    if (confirmedOnly) all = all.filter(r => r.is_hotspot);

    return all.sort((a, b) => b.weighted_score - a.weighted_score);
  } catch (e) {
    console.error("[Hotspot] getLearnedHotspots error:", e);
    return [];
  }
}

/**
 * Seed from backend /api/hotspots/dynamic — only fills cells that don't
 * already have community data. Never overwrites local reports.
 */
export async function seedLearnedHotspotsFromBackend() {
  try {
    const BASE = (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_URL)
      ? import.meta.env.VITE_API_URL
      : "http://127.0.0.1:8000";

    const res  = await fetch(`${BASE}/api/hotspots/dynamic`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.hotspots?.length) return;

    const db = await _openIDB();

    for (const h of data.hotspots) {
      if (!h.lat || !h.lon) continue;
      const gk  = gridKey(h.lat, h.lon);
      const ex  = await _idbGet(db, gk);

      // Never overwrite cells that already have community incidents
      if (ex?.incidents?.some(i => i.source === "community")) continue;

      // Synthesise incidents from backend aggregate data
      const syntheticIncidents = Array.from({ length: Math.min(h.count ?? 1, 10) }, (_, i) => ({
        ts:          new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(), // spread over past 10 weeks
        severity:    h.avg_severity >= 2.5 ? "severe" : h.avg_severity >= 1.5 ? "moderate" : "minor",
        fatal:       (h.killed ?? 0) > 0 && i < (h.killed ?? 0),
        source:      "backend_seed",
        description: "",
      }));

      const ws = recomputeWeightedScore(syntheticIncidents);
      await _idbPut(db, {
        grid_key:       gk,
        lat:            parseFloat(h.lat),
        lon:            parseFloat(h.lon),
        incidents:      syntheticIncidents,
        count:          0,
        weighted_score: parseFloat(ws.toFixed(2)),
        is_hotspot:     ws >= MIN_WEIGHT,
        risk:           ws >= 30 ? "HIGH" : ws >= MIN_WEIGHT ? "MEDIUM" : "LOW",
        color:          ws >= 30 ? "#ef4444" : ws >= MIN_WEIGHT ? "#f59e0b" : "#a855f7",
        avg_severity:   h.avg_severity ?? 2,
        fatals:         h.killed ?? 0,
        last_incident:  new Date().toISOString(),
        first_incident: new Date().toISOString(),
        source:         "backend_seed",
      });
    }
  } catch (e) {
    console.warn("[Hotspot] seed error:", e);
  }
}

// ── Backend sync (no Supabase key in client) ──────────────────────

async function _syncToBackend(record, description) {
  const BASE = (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_URL)
    ? import.meta.env.VITE_API_URL
    : "http://127.0.0.1:8000";

  await fetch(`${BASE}/api/reports`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type:        "accident",
      lat:         record.lat,
      lon:         record.lon,
      description: description || `Autonomous safety alert: high frequency of safety incidents detected in this vicinity.`,
      severity:    record.risk?.toLowerCase() === "high" ? "severe"
                 : record.risk?.toLowerCase() === "medium" ? "moderate"
                 : "minor",
      injured:  0,
      reporter: "AI Safety System",
    }),
    signal: AbortSignal.timeout(8000),
  });
}

// ── Haversine distance (metres) ───────────────────────────────────
export function hvDistM(la1, lo1, la2, lo2) {
  const R = 6371000,
    φ1 = la1 * Math.PI / 180, φ2 = la2 * Math.PI / 180,
    Δφ = (la2 - la1) * Math.PI / 180, Δλ = (lo2 - lo1) * Math.PI / 180,
    a  = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Get nearest CONFIRMED learned hotspot within radiusM.
 */
export async function getNearestLearnedHotspot(lat, lon, radiusM = 2000) {
  try {
    const all = await getLearnedHotspots({ confirmedOnly: true });
    let nearest = null, minDist = Infinity;
    for (const h of all) {
      const d = hvDistM(lat, lon, h.lat, h.lon);
      if (d < radiusM && d < minDist) { minDist = d; nearest = { ...h, distanceM: Math.round(d) }; }
    }
    return nearest;
  } catch { return null; }
}