/**
 * services/gamification.js — IntelliCrash Unified Points Store v4
 * ─────────────────────────────────────────────────────────────────
 * ✅ Per-user isolation — different users get different points
 * ✅ User identified by email (from Supabase auth) or fallback to "ic_default_user"
 * ✅ Single source of truth for Navigation.jsx and Rewards.jsx
 * ✅ Migration from old flat keys (ic_gm, ic_gm_v3, ic_gamification_v2)
 */

export const GM_VERSION = "ic_gm_v4";

export const GM_DEFAULTS = {
  points:              0,
  totalEarned:         0,
  trips:               0,
  reports:             0,
  driverScores:        [],
  badges:              [],
  streak:              0,
  lastCheckin:         null,
  redemptions:         [],
  completedChallenges: [],
  userEmail:           "",
  userName:            "Driver",
};

// ── User key helpers ──────────────────────────────────────────────

/**
 * Returns the storage key for the current user.
 * Key format: ic_gm_v4__<sanitised_email>
 * Falls back to ic_gm_v4__default if no email found.
 */
export function getUserKey(email) {
  const id = (email || _detectEmail() || "default")
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, "_")
    .slice(0, 80);
  return `${GM_VERSION}__${id}`;
}

function _detectEmail() {
  // Try common auth storage patterns used by Supabase
  try {
    // Supabase stores session under sb-<project>-auth-token
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.includes("auth-token")) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          const email =
            parsed?.user?.email ||
            parsed?.currentSession?.user?.email;
          if (email) return email;
        }
      }
    }
    // Legacy ic_user key
    const legacy = localStorage.getItem("ic_user");
    if (legacy) {
      const p = JSON.parse(legacy);
      return p?.email || null;
    }
  } catch {}
  return null;
}

// ── Load / Save ───────────────────────────────────────────────────

export function loadGM(email) {
  const key = getUserKey(email);
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...GM_DEFAULTS, ...JSON.parse(raw) };

    // ── Migration: pull from old flat keys (once, then delete) ──
    const oldKeys = ["ic_gm_v3", "ic_gm", "ic_gamification_v2"];
    for (const old of oldKeys) {
      const oldRaw = localStorage.getItem(old);
      if (oldRaw) {
        try {
          const parsed = JSON.parse(oldRaw);
          const merged = { ...GM_DEFAULTS, ...parsed };
          saveGM(merged, email);          // save under new per-user key
          // don't delete old keys — other devices may still need migration
          return merged;
        } catch {}
      }
    }
  } catch {}
  return { ...GM_DEFAULTS };
}

export function saveGM(gm, email) {
  const key = getUserKey(email);
  try {
    localStorage.setItem(key, JSON.stringify(gm));
    // keep legacy "ic_gm" in sync so api.js backward compat still works
    localStorage.setItem("ic_gm", JSON.stringify(gm));
  } catch {}
}

// ── Resolve current user email (async, from Supabase) ─────────────

export async function resolveUserEmail() {
  try {
    const { supabase } = await import("../services/supabase");
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.email || null;
  } catch {}
  return _detectEmail();
}

// ── Point operations ──────────────────────────────────────────────

/**
 * Award points for a completed trip.
 * riskScore: 0–100  (lower = safer = more points)
 * Returns { gm, pts, driverScore }
 */
export function awardTripPoints(riskScore, _unused, email) {
  const gm  = loadGM(email);
  const pts = riskScore < 40 ? 50 : 30;
  const ds  = Math.max(0, 100 - (riskScore > 70 ? 25 : riskScore > 40 ? 10 : 0));
  const next = {
    ...gm,
    points:       gm.points + pts,
    totalEarned:  gm.totalEarned + pts,
    trips:        gm.trips + 1,
    driverScores: [ds, ...(gm.driverScores || [])].slice(0, 50),
  };
  saveGM(next, email);
  return { gm: next, pts, driverScore: ds };
}

/**
 * Award points for filing an incident report.
 */
export function awardReportPoints(email) {
  const gm  = loadGM(email);
  const pts = 20;
  const next = {
    ...gm,
    points:      gm.points + pts,
    totalEarned: gm.totalEarned + pts,
    reports:     (gm.reports || 0) + 1,
  };
  saveGM(next, email);
  return { gm: next, pts };
}

/**
 * Award arbitrary points (reviews, check-ins, badges).
 */
export function awardPoints(pts, _reason, email) {
  const gm  = loadGM(email);
  const next = {
    ...gm,
    points:      gm.points + pts,
    totalEarned: gm.totalEarned + pts,
  };
  saveGM(next, email);
  return next;
}

/**
 * Deduct points for a redemption.
 * Returns updated gm or null if insufficient points.
 */
export function deductPoints(pts, redemption, email) {
  const gm = loadGM(email);
  if (gm.points < pts) return null;
  const next = {
    ...gm,
    points:      gm.points - pts,
    redemptions: [redemption, ...(gm.redemptions || [])],
  };
  saveGM(next, email);
  return next;
}

/**
 * Daily check-in.
 */
export function doCheckin(email) {
  const gm        = loadGM(email);
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  if (gm.lastCheckin === today) return { gm, pts: 0, alreadyDone: true };

  const newStreak = gm.lastCheckin === yesterday ? (gm.streak || 0) + 1 : 1;
  const pts       = newStreak >= 7 ? 25 : newStreak >= 3 ? 15 : 10;
  const next      = {
    ...gm,
    points:              gm.points + pts,
    totalEarned:         gm.totalEarned + pts,
    streak:              newStreak,
    lastCheckin:         today,
    completedChallenges: [
      ...(gm.completedChallenges || []),
      `checkin_${today}`,
    ],
  };
  saveGM(next, email);
  return { gm: next, pts, newStreak, alreadyDone: false };
}

// ── Badge engine ──────────────────────────────────────────────────

export const BADGES = [
  { id: "first_trip",   icon: "🚗", label: "First Journey",  req: 1,    type: "trips",    pts: 25,  rarity: "common"   },
  { id: "ten_trips",    icon: "🗺️", label: "Road Explorer",  req: 10,   type: "trips",    pts: 75,  rarity: "uncommon" },
  { id: "fifty_trips",  icon: "🏁", label: "Road Veteran",   req: 50,   type: "trips",    pts: 200, rarity: "rare"     },
  { id: "safe_driver",  icon: "🛡️", label: "Safe Driver",    req: 80,   type: "score",    pts: 100, rarity: "uncommon" },
  { id: "elite_driver", icon: "💎", label: "Elite Driver",   req: 95,   type: "score",    pts: 300, rarity: "epic"     },
  { id: "reporter",     icon: "📡", label: "Road Guardian",  req: 3,    type: "reports",  pts: 60,  rarity: "common"   },
  { id: "century",      icon: "💯", label: "Century Club",   req: 100,  type: "points",   pts: 50,  rarity: "common"   },
  { id: "streak_7",     icon: "🔥", label: "Week Warrior",   req: 7,    type: "streak",   pts: 100, rarity: "rare"     },
  { id: "streak_30",    icon: "⚡", label: "Month Master",   req: 30,   type: "streak",   pts: 400, rarity: "legendary"},
  { id: "points_500",   icon: "🥈", label: "Silver Earner",  req: 500,  type: "totalpts", pts: 50,  rarity: "uncommon" },
  { id: "points_1000",  icon: "🥇", label: "Gold Earner",    req: 1000, type: "totalpts", pts: 100, rarity: "rare"     },
];

export function checkAndUnlockBadges(gm, email) {
  const avgScore = gm.driverScores?.length
    ? gm.driverScores.reduce((a, b) => a + b, 0) / gm.driverScores.length
    : 0;

  const earned    = new Set(gm.badges || []);
  const newBadges = [];

  for (const badge of BADGES) {
    if (earned.has(badge.id)) continue;
    let unlocked = false;
    if (badge.type === "trips"   ) unlocked = (gm.trips        || 0) >= badge.req;
    if (badge.type === "points"  ) unlocked = (gm.points       || 0) >= badge.req;
    if (badge.type === "totalpts") unlocked = (gm.totalEarned  || 0) >= badge.req;
    if (badge.type === "reports" ) unlocked = (gm.reports      || 0) >= badge.req;
    if (badge.type === "score"   ) unlocked = avgScore            >= badge.req;
    if (badge.type === "streak"  ) unlocked = (gm.streak       || 0) >= badge.req;
    if (unlocked) newBadges.push(badge);
  }

  if (!newBadges.length) return { gm, newBadges: [] };

  const bonusPts = newBadges.reduce((s, b) => s + b.pts, 0);
  const next = {
    ...gm,
    badges:      [...(gm.badges || []), ...newBadges.map(b => b.id)],
    points:      gm.points + bonusPts,
    totalEarned: gm.totalEarned + bonusPts,
  };
  saveGM(next, email);
  return { gm: next, newBadges };
}

/**
 * List all user keys stored in localStorage.
 * Useful for a "switch account" or debug view.
 */
export function listAllUserKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(GM_VERSION + "__")) keys.push(k);
    }
  } catch {}
  return keys;
}