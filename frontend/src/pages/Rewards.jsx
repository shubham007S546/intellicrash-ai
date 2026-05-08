/**
 * Rewards.jsx — IntelliCrash v12.0 FINAL
 * ─────────────────────────────────────────────────────────────────
 * ✅ Points read from services/gamification.js (unified store)
 * ✅ Same key as Navigation.jsx → points earned in nav instantly show here
 * ✅ Real user isolated via Supabase email (ic_gm_v4__<email>)
 * ✅ EmailJS live — coupon sent to shubhamabhi004@gmail.com
 * ✅ Badge engine from real driver scores (driverScores[])
 * ✅ Daily check-in streak, XP float, confetti, level-up
 * ✅ Redemption history per user
 * ✅ Light theme matching Navigation v11.2
 * ✅ No dummy data — all from real Supabase login
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, LinearProgress, Chip, Snackbar, Alert } from "@mui/material";

// ── Unified gamification store (same as Navigation.jsx uses) ─────
import {
  loadGM, saveGM,
  awardPoints,
  doCheckin,
  checkAndUnlockBadges,
  deductPoints,
  resolveUserEmail,
  getUserKey,
  BADGES as GM_BADGES,
} from "../services/gamification";

// ─── EmailJS (confirmed keys) ────────────────────────────────────
const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// ─── Design tokens — light, matches Navigation light theme ───────
const T = {
  bg:        "#f0f4ff",
  card:      "#ffffff",
  cardAlt:   "#f7f9ff",
  border:    "#e3eaf5",
  borderStr: "#c8d4e8",
  text:      "#1a1a2e",
  textSub:   "#6b7a99",
  textMute:  "#aab2c8",
  orange:    "#f97316",
  orangeL:   "#fff7ed",
  red:       "#ea4335",
  green:     "#34a853",
  greenL:    "#f0fdf4",
  blue:      "#1a73e8",
  blueL:     "#eff6ff",
  purple:    "#7c3aed",
  purpleL:   "#f5f3ff",
  amber:     "#f9ab00",
  amberL:    "#fffbeb",
  shadow:    "0 1px 4px rgba(26,26,46,0.08), 0 4px 16px rgba(26,26,46,0.06)",
  shadowLg:  "0 8px 32px rgba(26,26,46,0.14)",
};

// ─── Extended badge list for Rewards UI ──────────────────────────
// Merges gamification.js BADGES with extra display-only badges
const ALL_BADGES = [
  ...GM_BADGES,
  { id:"night_owl",   icon:"🌙", label:"Night Owl",    desc:"Complete a night trip safely",    req:1,   type:"night",   pts:40,  rarity:"uncommon" },
  { id:"hp_explorer", icon:"🏔️", label:"HP Explorer",  desc:"Visit 3 different HP districts",  req:3,   type:"district",pts:120, rarity:"rare"     },
  { id:"lifesaver",   icon:"💚", label:"Lifesaver",    desc:"Report a severe accident",         req:1,   type:"special", pts:150, rarity:"epic"     },
];

const RARITY = {
  common:    { bg:"#f3f4f6", color:"#6b7280", border:"#e5e7eb" },
  uncommon:  { bg:T.blueL,   color:T.blue,    border:"#bfdbfe" },
  rare:      { bg:T.purpleL, color:T.purple,  border:"#ddd6fe" },
  epic:      { bg:"#fff7ed", color:"#c2410c", border:"#fed7aa" },
  legendary: { bg:"#fefce8", color:"#854d0e", border:"#fef08a" },
};

// ─── Rewards catalogue ────────────────────────────────────────────
const CATALOGUE = [
  { id:"fuel_50",    icon:"⛽", label:"₹50 Fuel Voucher",       cost:200, category:"fuel",     partner:"HP Petrol Pumps",    available:true  },
  { id:"toll_free",  icon:"🛣️", label:"1 Toll-Free Pass",       cost:150, category:"toll",     partner:"HPRIDC",             available:true  },
  { id:"food_100",   icon:"🍽️", label:"₹100 Dhaba Credit",      cost:350, category:"food",     partner:"HP Tourism Dhabas",  available:true  },
  { id:"fuel_100",   icon:"⛽", label:"₹100 Fuel Voucher",      cost:380, category:"fuel",     partner:"Indian Oil / HP",    available:true  },
  { id:"ins_month",  icon:"🛡️", label:"1 Month Road Cover",     cost:500, category:"insurance",partner:"HP Motor Insurance", available:false },
  { id:"sticker",    icon:"🏅", label:"Safe Driver Sticker",    cost:75,  category:"merch",    partner:"IntelliCrash",       available:true  },
  { id:"hotel_10",   icon:"🏨", label:"10% Hotel Discount",     cost:400, category:"travel",   partner:"HP Tourism Board",   available:true  },
  { id:"food_200",   icon:"🥘", label:"₹200 Restaurant Credit", cost:650, category:"food",     partner:"Zomato HP Partner",  available:false },
  { id:"toll_month", icon:"🛣️", label:"Month Toll Pass",        cost:800, category:"toll",     partner:"HPRIDC",             available:false },
];

// ─── Level thresholds ─────────────────────────────────────────────
const LEVELS = [
  { level:1, name:"Learner",   min:0,    icon:"🌱", color:T.green  },
  { level:2, name:"Driver",    min:100,  icon:"🚗", color:T.blue   },
  { level:3, name:"Navigator", min:300,  icon:"🧭", color:T.purple },
  { level:4, name:"Guardian",  min:600,  icon:"🛡️", color:T.orange },
  { level:5, name:"Road Hero", min:1000, icon:"🏆", color:T.amber  },
  { level:6, name:"HP Legend", min:2000, icon:"⭐", color:"#7c2d12"},
];

function getLevel(pts) {
  let cur = LEVELS[0];
  for (const l of LEVELS) { if (pts >= l.min) cur = l; }
  const nxt  = LEVELS.find(l => l.min > pts);
  const prog = nxt ? ((pts - cur.min) / (nxt.min - cur.min)) * 100 : 100;
  return { cur, nxt, prog: Math.min(100, prog) };
}

function genCoupon(id) {
  const chars  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const prefix = id.toUpperCase().slice(0, 4).replace(/[^A-Z]/g, "X");
  const rand   = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `IC-${prefix}-${rand}`;
}

// ─── EmailJS ──────────────────────────────────────────────────────
async function sendCouponEmail({ toEmail, toName, rewardLabel, couponCode, pointsUsed, partnerName }) {
  if (!window.emailjs) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    window.emailjs.init(EMAILJS_PUBLIC_KEY);
  }
  return window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email:     toEmail,
    to_name:      toName || "Driver",
    reward_label: rewardLabel,
    coupon_code:  couponCode,
    points_used:  pointsUsed,
    partner_name: partnerName,
    app_name:     "IntelliCrash HP",
    redeem_date:  new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" }),
    support_url:  "https://intellicrash.in/support",
  });
}

// ─── Confetti ─────────────────────────────────────────────────────
function spawnConfetti() {
  const colors = [T.orange, T.green, T.blue, T.purple, T.amber, T.red];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement("div");
    el.style.cssText = `position:fixed;width:8px;height:8px;border-radius:2px;
      background:${colors[i % colors.length]};left:${Math.random()*100}vw;top:-10px;
      opacity:1;z-index:9999;pointer-events:none;
      animation:icConf ${1.5+Math.random()}s ease-in forwards;
      animation-delay:${Math.random()*0.5}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
  if (!document.getElementById("ic-conf-style")) {
    const s = document.createElement("style");
    s.id = "ic-conf-style";
    s.textContent = `@keyframes icConf{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`;
    document.head.appendChild(s);
  }
}

// ─── Card component ───────────────────────────────────────────────
function Card({ children, sx, highlighted }) {
  return (
    <Box sx={{
      background: T.card, border: `1px solid ${highlighted ? T.orange : T.border}`,
      borderRadius:"16px", p:2.5,
      boxShadow: highlighted ? `0 0 0 3px ${T.orangeL}, ${T.shadow}` : T.shadow,
      transition:"all 0.2s", ...sx,
    }}>{children}</Box>
  );
}

function SLabel({ children, accent }) {
  return (
    <Typography sx={{ fontSize:10, fontWeight:800, letterSpacing:1.5,
      color: accent ? T.orange : T.textMute, textTransform:"uppercase",
      mb:1.5, fontFamily:"'DM Mono', monospace" }}>
      {children}
    </Typography>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function Rewards() {
  const navigate = useNavigate();

  // ── User state ─────────────────────────────────────────────────
  const [userEmail, setUserEmail] = useState(null);
  const [userName,  setUserName]  = useState("Driver");
  const [authReady, setAuthReady] = useState(false);

  // ── GM state — loaded from unified store ───────────────────────
  const [gm, setGMState] = useState(null);

  // ── UI state ───────────────────────────────────────────────────
  const [tab,        setTab]        = useState("overview");
  const [toast,      setToast]      = useState({ open:false, msg:"", type:"success" });
  const [emailModal, setEmailModal] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [sending,    setSending]    = useState(false);
  const [newBadge,   setNewBadge]   = useState(null);
  const [xpPop,      setXpPop]      = useState(null);
  const [prevLevel,  setPrevLevel]  = useState(null);

  // ── Resolve user email from Supabase ────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const email = await resolveUserEmail();
        if (email) {
          setUserEmail(email);
          setUserName(email.split("@")[0]);
        }
      } catch {}
      setAuthReady(true);
    })();
  }, []);

  // ── Load GM from unified store once auth is ready ──────────────
  useEffect(() => {
    if (!authReady) return;
    const data = loadGM(userEmail);
    setGMState(data);
    setEmailInput(data.userEmail || userEmail || "shubhamabhi004@gmail.com");
  }, [authReady, userEmail]);

  // ── Poll for updates every 3s (so nav points appear instantly) ─
  useEffect(() => {
    if (!authReady) return;
    const id = setInterval(() => {
      const fresh = loadGM(userEmail);
      setGMState(prev => {
        // Only update if points actually changed
        if (!prev || fresh.points !== prev.points || fresh.trips !== prev.trips) {
          return fresh;
        }
        return prev;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [authReady, userEmail]);

  // ── Save gm helper ─────────────────────────────────────────────
  const persistGM = useCallback((next) => {
    saveGM(next, userEmail);
    setGMState(next);
  }, [userEmail]);

  // ── Badge check on gm changes ──────────────────────────────────
  useEffect(() => {
    if (!gm) return;
    const { gm: withBadges, newBadges } = checkAndUnlockBadges(gm, userEmail);
    if (newBadges.length) {
      persistGM(withBadges);
      newBadges.forEach((b, i) => setTimeout(() => setNewBadge(b), i * 900));
    }
  }, [gm?.trips, gm?.points, gm?.streak, gm?.reports]);

  // ── Level-up detection ─────────────────────────────────────────
  useEffect(() => {
    if (!gm) return;
    const lvl = getLevel(gm.points);
    if (prevLevel && lvl.cur.level > prevLevel.level) {
      spawnConfetti();
      showToast(`🎉 Level up! You're now ${lvl.cur.name}!`, "success");
    }
    setPrevLevel(lvl.cur);
  }, [gm?.points]);

  function showToast(msg, type = "success") {
    setToast({ open:true, msg, type });
  }

  function showXP(pts) {
    setXpPop(pts);
    setTimeout(() => setXpPop(null), 1600);
  }

  // ── Daily check-in ─────────────────────────────────────────────
  function handleCheckin() {
    const result = doCheckin(userEmail);
    if (result.alreadyDone) {
      showToast("Already checked in today! Return tomorrow 🌅", "info");
      return;
    }
    const { gm: next, pts, newStreak } = result;
    const { gm: withBadges, newBadges } = checkAndUnlockBadges(next, userEmail);
    persistGM(withBadges);
    if (newBadges.length) newBadges.forEach((b, i) => setTimeout(() => setNewBadge(b), i * 900));
    showXP(pts);
    showToast(`🔥 Day ${newStreak} streak! +${pts} pts`, "success");
    if (newStreak >= 7) spawnConfetti();
  }

  // ── Redeem flow ────────────────────────────────────────────────
  function initiateRedeem(reward) {
    if (!reward.available) { showToast("⏳ Coming soon!", "warning"); return; }
    if (!gm || gm.points < reward.cost) {
      showToast(`Need ${reward.cost - (gm?.points || 0)} more points`, "error"); return;
    }
    setEmailInput(gm.userEmail || userEmail || "shubhamabhi004@gmail.com");
    setEmailModal(reward);
  }

  async function confirmRedeem() {
    if (!emailModal || !gm) return;
    const email = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Enter a valid email address", "error"); return;
    }
    setSending(true);
    const coupon = genCoupon(emailModal.id);
    const redemption = {
      id: Date.now(), rewardId: emailModal.id, rewardLabel: emailModal.label,
      coupon, email, partner: emailModal.partner,
      pointsSpent: emailModal.cost, date: new Date().toISOString(),
    };
    try {
      await sendCouponEmail({
        toEmail: email,
        toName:  userName,
        rewardLabel: emailModal.label,
        couponCode:  coupon,
        pointsUsed:  emailModal.cost,
        partnerName: emailModal.partner,
      });
      const next = deductPoints(emailModal.cost, { ...redemption, emailFailed: false }, userEmail);
      if (next) { persistGM({ ...next, userEmail: email }); }
      showToast(`✅ Coupon ${coupon} sent to ${email}!`, "success");
      spawnConfetti();
    } catch {
      const next = deductPoints(emailModal.cost, { ...redemption, emailFailed: true }, userEmail);
      if (next) persistGM(next);
      showToast(`Coupon: ${coupon} — email failed, copy this!`, "warning");
    }
    setSending(false);
    setEmailModal(null);
  }

  // ─── Guard ─────────────────────────────────────────────────────
  if (!authReady || !gm) {
    return (
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"center",
        height:"calc(100vh - 58px)", background:T.bg, flexDirection:"column", gap:2 }}>
        <Box sx={{ width:44, height:44, border:"3px solid #e3eaf5",
          borderTop:`3px solid ${T.orange}`, borderRadius:"50%",
          animation:"spin 0.8s linear infinite",
          "@keyframes spin":{to:{transform:"rotate(360deg)"}} }}/>
        <Typography sx={{ fontSize:13, color:T.textSub }}>Loading your rewards…</Typography>
      </Box>
    );
  }

  // ─── Derived values ────────────────────────────────────────────
  const lvl       = getLevel(gm.points);
  const checkedIn = gm.lastCheckin === new Date().toISOString().slice(0,10);
  const avgScore  = gm.driverScores?.length
    ? Math.round(gm.driverScores.reduce((a,b) => a+b,0) / gm.driverScores.length) : 0;

  const isEarned = (badge) => {
    const set = new Set(gm.badges || []);
    if (set.has(badge.id)) return true;
    if (badge.type==="trips"   ) return (gm.trips||0)        >= badge.req;
    if (badge.type==="points"  ) return (gm.points||0)       >= badge.req;
    if (badge.type==="totalpts") return (gm.totalEarned||0)  >= badge.req;
    if (badge.type==="reports" ) return (gm.reports||0)      >= badge.req;
    if (badge.type==="score"   ) return avgScore              >= badge.req;
    if (badge.type==="streak"  ) return (gm.streak||0)       >= badge.req;
    return false;
  };

  const earnedCount = ALL_BADGES.filter(isEarned).length;

  const TABS = [
    { id:"overview", label:"Overview", icon:"📊" },
    { id:"badges",   label:"Badges",   icon:"🎖️"  },
    { id:"redeem",   label:"Redeem",   icon:"🎁"  },
    { id:"history",  label:"History",  icon:"🧾"  },
  ];

  return (
    <Box sx={{ background:T.bg, minHeight:"calc(100vh - 58px)",
      fontFamily:"'DM Sans', sans-serif", pb:10, position:"relative" }}>

      {/* Bg gradient */}
      <Box sx={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        backgroundImage:`radial-gradient(circle at 15% 15%, rgba(249,115,22,0.05) 0%, transparent 50%),
                         radial-gradient(circle at 85% 85%, rgba(26,115,232,0.04) 0%, transparent 50%)` }}/>

      {/* XP float */}
      {xpPop && (
        <Box sx={{ position:"fixed", top:"22%", left:"50%", transform:"translateX(-50%)",
          zIndex:9999, pointerEvents:"none",
          animation:"xpF 1.6s ease-out forwards",
          "@keyframes xpF":{"0%":{opacity:1,transform:"translateX(-50%) translateY(0)"},"100%":{opacity:0,transform:"translateX(-50%) translateY(-60px)"}} }}>
          <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:34, color:T.orange }}>
            +{xpPop} XP
          </Typography>
        </Box>
      )}

      {/* Badge unlock modal */}
      {newBadge && (
        <Box sx={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(26,26,46,0.45)",
          backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setNewBadge(null)}>
          <Box sx={{ background:"#fff", borderRadius:"24px", p:4, textAlign:"center",
            boxShadow:T.shadowLg, maxWidth:320, mx:2,
            animation:"bIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards",
            "@keyframes bIn":{"0%":{opacity:0,transform:"scale(0.4)"},"100%":{opacity:1,transform:"scale(1)"}} }}>
            <Typography sx={{ fontSize:72, mb:1 }}>{newBadge.icon}</Typography>
            <Chip label={newBadge.rarity?.toUpperCase() || "BADGE"} size="small" sx={{
              mb:1.5, fontWeight:800, fontSize:10,
              background:RARITY[newBadge.rarity]?.bg || "#f3f4f6",
              color:RARITY[newBadge.rarity]?.color || "#666",
              border:`1px solid ${RARITY[newBadge.rarity]?.border || "#e5e7eb"}`,
            }}/>
            <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:22, mb:0.5 }}>
              Badge Unlocked!
            </Typography>
            <Typography sx={{ fontWeight:700, fontSize:16, color:T.orange, mb:0.5 }}>{newBadge.label}</Typography>
            <Typography sx={{ fontSize:13, color:T.textSub, mb:2 }}>{newBadge.desc}</Typography>
            <Typography sx={{ fontWeight:800, fontSize:14, color:T.green }}>+{newBadge.pts} pts!</Typography>
          </Box>
        </Box>
      )}

      {/* Email / redeem modal */}
      {emailModal && (
        <Box sx={{ position:"fixed", inset:0, zIndex:8000, background:"rgba(26,26,46,0.4)",
          backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Box sx={{ background:"#fff", borderRadius:"20px", p:3.5,
            boxShadow:T.shadowLg, maxWidth:380, width:"100%", mx:2 }}>
            <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:20, mb:0.5 }}>
              {emailModal.icon} Redeem {emailModal.label}
            </Typography>
            <Typography sx={{ fontSize:12, color:T.textSub, mb:2.5 }}>
              Your coupon code will be sent to your email instantly.
            </Typography>
            <Typography sx={{ fontSize:12, fontWeight:600, color:T.text, mb:0.5 }}>Email address</Typography>
            <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
              placeholder="your@email.com"
              style={{ width:"100%", padding:"10px 14px", borderRadius:10,
                border:`1.5px solid ${T.borderStr}`, fontSize:14, outline:"none",
                fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box", background:"#f7f9ff" }}/>
            <Box sx={{ background:T.orangeL, border:`1px solid rgba(249,115,22,0.2)`, borderRadius:10, p:1.5, my:2 }}>
              {[["Cost", `${emailModal.cost} pts`], ["After", `${(gm.points||0) - emailModal.cost} pts`], ["Partner", emailModal.partner]].map(([k,v]) => (
                <Box key={k} sx={{ display:"flex", justifyContent:"space-between" }}>
                  <Typography sx={{ fontSize:13, color:T.textSub }}>{k}</Typography>
                  <Typography sx={{ fontSize:13, fontWeight:700 }}>{v}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display:"flex", gap:1.5 }}>
              <button onClick={() => setEmailModal(null)} style={{ flex:1, padding:"11px",
                border:`1.5px solid ${T.border}`, borderRadius:12, background:"#fff",
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:14 }}>
                Cancel
              </button>
              <button onClick={confirmRedeem} disabled={sending} style={{ flex:2, padding:"11px",
                border:"none", borderRadius:12,
                background: sending ? "#ccc" : "linear-gradient(135deg,#f97316,#ea4335)",
                color:"#fff", fontWeight:800, fontSize:14,
                cursor: sending ? "wait" : "pointer", fontFamily:"'DM Sans',sans-serif",
                boxShadow: sending ? "none" : "0 4px 16px rgba(249,115,22,0.4)" }}>
                {sending ? "Sending…" : "✉️ Send Coupon"}
              </button>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <Box sx={{ background:"#fff", borderBottom:`1px solid ${T.border}`,
        px:{xs:2,md:4}, py:3, position:"relative", zIndex:1,
        boxShadow:"0 1px 0 rgba(26,26,46,0.06)" }}>
        <Box sx={{ maxWidth:960, mx:"auto", display:"flex", justifyContent:"space-between",
          alignItems:"flex-start", flexWrap:"wrap", gap:2 }}>
          <Box>
            <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900,
              fontSize:{xs:20,md:26}, color:T.text, letterSpacing:"-0.5px" }}>
              🏆 Rewards & Achievements
            </Typography>
            <Typography sx={{ fontSize:13, color:T.textSub, mt:0.3 }}>
              {userEmail
                ? `Logged in as ${userName} · ${userEmail}`
                : "Drive safely on HP roads · Earn points · Unlock real rewards"}
            </Typography>
          </Box>
          <Box sx={{ display:"flex", alignItems:"center", gap:1.5,
            background:T.orangeL, border:`1.5px solid rgba(249,115,22,0.25)`,
            borderRadius:"14px", px:2.5, py:1.5 }}>
            <Typography sx={{ fontSize:28 }}>{lvl.cur.icon}</Typography>
            <Box>
              <Typography sx={{ fontSize:10, color:T.textSub, fontWeight:700, letterSpacing:1 }}>
                LEVEL {lvl.cur.level}
              </Typography>
              <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:15, color:lvl.cur.color }}>
                {lvl.cur.name}
              </Typography>
            </Box>
            <Box sx={{ ml:1.5, pl:1.5, borderLeft:`1px solid rgba(249,115,22,0.2)` }}>
              <Typography sx={{ fontSize:10, color:T.textSub, fontWeight:700 }}>STREAK</Typography>
              <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:17, color:"#ea4335" }}>
                🔥 {gm.streak || 0}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth:960, mx:"auto", px:{xs:2,md:4}, pt:3, position:"relative", zIndex:1 }}>

        {/* ── Stats ─────────────────────────────────────────────── */}
        <Box sx={{ display:"grid", gridTemplateColumns:{xs:"repeat(2,1fr)",sm:"repeat(4,1fr)"}, gap:1.5, mb:3 }}>
          {[
            { icon:"⚡", label:"Total Points",  value:gm.points||0,         color:T.orange, bg:T.orangeL },
            { icon:"🗺️", label:"Real Trips",    value:gm.trips||0,           color:T.blue,   bg:T.blueL   },
            { icon:"🏅", label:"Badges",        value:`${earnedCount}/${ALL_BADGES.length}`, color:T.purple, bg:T.purpleL },
            { icon:"🛡️", label:"Avg Score",     value:avgScore || "—",       color:T.green,  bg:T.greenL  },
          ].map(s => (
            <Box key={s.label} sx={{ background:s.bg, border:`1px solid ${T.border}`,
              borderRadius:"14px", p:2, textAlign:"center", boxShadow:T.shadow }}>
              <Typography sx={{ fontSize:22, mb:0.5 }}>{s.icon}</Typography>
              <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:26, color:s.color, lineHeight:1 }}>
                {s.value}
              </Typography>
              <Typography sx={{ fontSize:11, color:T.textSub, mt:0.3, fontWeight:500 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>

        {/* ── Level progress ────────────────────────────────────── */}
        <Card sx={{ mb:3 }}>
          <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2 }}>
            <Box sx={{ display:"flex", alignItems:"center", gap:1.5 }}>
              <Typography sx={{ fontSize:26 }}>{lvl.cur.icon}</Typography>
              <Box>
                <Typography sx={{ fontWeight:800, fontSize:15, color:T.text }}>
                  Level {lvl.cur.level} — {lvl.cur.name}
                </Typography>
                <Typography sx={{ fontSize:12, color:T.textSub }}>
                  {gm.points||0} / {lvl.nxt?.min || "∞"} pts · {gm.totalEarned||0} lifetime earned
                </Typography>
              </Box>
            </Box>
            {lvl.nxt && (
              <Box sx={{ textAlign:"right" }}>
                <Typography sx={{ fontSize:10, color:T.textSub, fontWeight:600 }}>Next</Typography>
                <Typography sx={{ fontSize:13, fontWeight:800, color:lvl.nxt.color }}>
                  {lvl.nxt.icon} {lvl.nxt.name}
                </Typography>
              </Box>
            )}
          </Box>
          <LinearProgress variant="determinate" value={lvl.prog} sx={{
            height:12, borderRadius:6, background:"rgba(26,26,46,0.06)",
            "& .MuiLinearProgress-bar":{
              background:`linear-gradient(90deg,${lvl.cur.color},${lvl.nxt?.color||lvl.cur.color})`,
              borderRadius:6, transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)" } }}/>
          {lvl.nxt && (
            <Typography sx={{ fontSize:11, color:T.textSub, mt:0.8, textAlign:"right" }}>
              {Math.max(0,(lvl.nxt.min||0)-(gm.points||0))} pts to {lvl.nxt.name}
            </Typography>
          )}
        </Card>

        {/* ── Live sync notice ──────────────────────────────────── */}
        <Box sx={{ mb:2.5, px:2, py:1.2, background:T.blueL,
          border:`1px solid rgba(26,115,232,0.2)`, borderRadius:"12px",
          display:"flex", alignItems:"center", gap:1.5 }}>
          <Box sx={{ width:7, height:7, borderRadius:"50%", background:T.blue, flexShrink:0,
            animation:"liveBlink 2s infinite",
            "@keyframes liveBlink":{"0%,100%":{opacity:1},"50%":{opacity:0.3}} }}/>
          <Typography sx={{ fontSize:12, color:T.blue, fontWeight:600 }}>
            Points sync live from Navigation · Drive a trip and they appear here instantly
          </Typography>
        </Box>

        {/* ── Daily check-in ────────────────────────────────────── */}
        <Box sx={{ mb:3, p:2.5, borderRadius:"16px",
          background: checkedIn ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "linear-gradient(135deg,#fff7ed,#ffedd5)",
          border:`1.5px solid ${checkedIn ? "rgba(52,168,83,0.25)" : "rgba(249,115,22,0.25)"}`,
          display:"flex", alignItems:"center", gap:2, flexWrap:"wrap" }}>
          <Box sx={{ flex:1 }}>
            <Typography sx={{ fontWeight:800, fontSize:15, color: checkedIn ? T.green : T.orange }}>
              {checkedIn ? "✅ Checked in today!" : "📅 Daily Check-In"}
            </Typography>
            <Typography sx={{ fontSize:12, color:T.textSub, mt:0.2 }}>
              {checkedIn
                ? `🔥 ${gm.streak}-day streak! Return tomorrow for bonus pts.`
                : `Streak: 🔥 ${gm.streak||0} days. Check in to earn points!`}
            </Typography>
          </Box>
          <button onClick={handleCheckin} disabled={checkedIn}
            style={{ padding:"10px 22px", border:"none", borderRadius:24,
              background: checkedIn ? "#d1fae5" : "linear-gradient(135deg,#f97316,#ea4335)",
              color: checkedIn ? T.green : "#fff", fontWeight:800, fontSize:13,
              cursor: checkedIn ? "default" : "pointer",
              fontFamily:"'DM Sans',sans-serif",
              boxShadow: checkedIn ? "none" : "0 4px 14px rgba(249,115,22,0.4)" }}>
            {checkedIn ? "✓ Done" : "+10 pts Check In"}
          </button>
        </Box>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <Box sx={{ display:"flex", gap:1, mb:3, background:"#fff", borderRadius:"14px",
          p:0.75, border:`1px solid ${T.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:"9px 4px", borderRadius:10, border:"none",
              background: tab===t.id ? T.orange : "transparent",
              color: tab===t.id ? "#fff" : T.textSub,
              fontWeight: tab===t.id ? 800 : 500, fontSize:13,
              cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
              boxShadow: tab===t.id ? "0 2px 8px rgba(249,115,22,0.35)" : "none" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </Box>

        {/* ══ OVERVIEW ════════════════════════════════════════════ */}
        {tab==="overview" && (
          <Box sx={{ display:"grid", gridTemplateColumns:{xs:"1fr",md:"1fr 1fr"}, gap:2 }}>

            {/* Trip summary from real gm data */}
            <Card>
              <SLabel>Your Real Driving Stats</SLabel>
              {!gm.trips ? (
                <Box sx={{ textAlign:"center", py:3 }}>
                  <Typography sx={{ fontSize:32, mb:1 }}>🗺️</Typography>
                  <Typography sx={{ fontSize:13, color:T.textSub, mb:1.5 }}>
                    No trips yet — start navigating!
                  </Typography>
                  <button onClick={() => navigate("/navigation")} style={{
                    padding:"9px 20px", border:"none", borderRadius:20,
                    background:"linear-gradient(135deg,#f97316,#ea4335)",
                    color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer",
                    fontFamily:"'DM Sans',sans-serif" }}>
                    🧭 Start Navigation →
                  </button>
                </Box>
              ) : (
                <Box>
                  {[
                    ["Trips Driven",  gm.trips,                   T.orange ],
                    ["Avg Score",     `${avgScore}/100`,            T.green  ],
                    ["Points Earned", gm.totalEarned||0,           T.orange ],
                    ["Reports Filed", gm.reports||0,               T.red    ],
                  ].map(([label, val, color]) => (
                    <Box key={label} sx={{ display:"flex", justifyContent:"space-between",
                      py:1, borderBottom:`1px solid ${T.border}` }}>
                      <Typography sx={{ fontSize:13, color:T.textSub }}>{label}</Typography>
                      <Typography sx={{ fontSize:13, fontWeight:700, color }}>{val}</Typography>
                    </Box>
                  ))}

                  {/* Recent driver scores */}
                  {gm.driverScores?.length > 0 && (
                    <>
                      <Typography sx={{ fontSize:10, fontWeight:700, color:T.textMute,
                        mt:1.5, mb:1, letterSpacing:0.8, textTransform:"uppercase" }}>
                        Recent Scores
                      </Typography>
                      <Box sx={{ display:"flex", gap:0.8, flexWrap:"wrap" }}>
                        {gm.driverScores.slice(0,6).map((score, i) => (
                          <Chip key={i} label={`${score}/100`} size="small" sx={{
                            height:22, fontSize:11, fontWeight:700,
                            background: score>=80 ? "rgba(52,168,83,0.12)" : "rgba(249,115,22,0.12)",
                            color: score>=80 ? T.green : T.orange,
                            border:`1px solid ${score>=80 ? "rgba(52,168,83,0.3)" : "rgba(249,115,22,0.3)"}` }}/>
                        ))}
                      </Box>
                    </>
                  )}

                  <button onClick={() => navigate("/navigation")} style={{
                    width:"100%", padding:"10px", marginTop:14, border:"none", borderRadius:20,
                    background:"linear-gradient(135deg,#f97316,#ea4335)",
                    color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer",
                    fontFamily:"'DM Sans',sans-serif",
                    boxShadow:"0 4px 16px rgba(249,115,22,0.4)" }}>
                    🧭 Start New Trip
                  </button>
                </Box>
              )}
            </Card>

            {/* How to earn */}
            <Card>
              <SLabel accent>How to Earn Points</SLabel>
              {[
                { icon:"🛡️", action:"Safe trip (score ≥ 80)",  pts:"+50" },
                { icon:"🚗", action:"Complete any trip",        pts:"+30" },
                { icon:"📡", action:"File incident report",     pts:"+20" },
                { icon:"📅", action:"Daily check-in",          pts:"+10" },
                { icon:"🔥", action:"7-day streak bonus",       pts:"+25" },
                { icon:"🎖️", action:"Unlock a badge",          pts:"varies" },
              ].map(({ icon, action, pts }) => (
                <Box key={action} sx={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", py:1.1, borderBottom:`1px solid ${T.border}` }}>
                  <Box sx={{ display:"flex", alignItems:"center", gap:1.5 }}>
                    <Typography sx={{ fontSize:18, width:24, textAlign:"center" }}>{icon}</Typography>
                    <Typography sx={{ fontSize:13, color:T.text }}>{action}</Typography>
                  </Box>
                  <Typography sx={{ fontSize:13, fontWeight:800, color:T.orange }}>{pts}</Typography>
                </Box>
              ))}
              <Box sx={{ mt:2, p:1.5, background:T.blueL, border:`1px solid rgba(26,115,232,0.2)`,
                borderRadius:"10px" }}>
                <Typography sx={{ fontSize:11, color:T.blue, fontWeight:700, mb:0.3 }}>
                  💡 Real-time sync
                </Typography>
                <Typography sx={{ fontSize:11, color:T.textSub, lineHeight:1.6 }}>
                  Points earned in Navigation appear here automatically
                  (same storage key: <code style={{fontSize:10}}>ic_gm_v4__{userEmail || "..."}</code>).
                </Typography>
              </Box>
            </Card>
          </Box>
        )}

        {/* ══ BADGES ══════════════════════════════════════════════ */}
        {tab==="badges" && (
          <Box>
            <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2 }}>
              <Typography sx={{ fontWeight:800, fontSize:15, color:T.text }}>
                {earnedCount} / {ALL_BADGES.length} earned
              </Typography>
              <Box sx={{ display:"flex", gap:0.75, flexWrap:"wrap" }}>
                {Object.entries(RARITY).map(([r,c]) => (
                  <Chip key={r} label={r} size="small" sx={{ height:20, fontSize:9, fontWeight:700,
                    background:c.bg, color:c.color, border:`1px solid ${c.border}` }}/>
                ))}
              </Box>
            </Box>
            <Box sx={{ display:"grid", gridTemplateColumns:{xs:"1fr 1fr",sm:"repeat(3,1fr)",md:"repeat(5,1fr)"}, gap:1.5 }}>
              {ALL_BADGES.map(badge => {
                const earned = isEarned(badge);
                const rc = RARITY[badge.rarity] || RARITY.common;
                return (
                  <Box key={badge.id} sx={{ background: earned ? rc.bg : "#fafaf8",
                    border:`1.5px solid ${earned ? rc.border : T.border}`,
                    borderRadius:"14px", p:2, textAlign:"center", opacity: earned ? 1 : 0.45,
                    transition:"all 0.2s",
                    "&:hover":{ transform: earned ? "translateY(-2px)" : "none" } }}>
                    <Typography sx={{ fontSize:32, mb:0.8 }}>{badge.icon}</Typography>
                    <Chip label={badge.rarity || "common"} size="small" sx={{
                      mb:0.8, height:18, fontSize:8, fontWeight:800,
                      background:rc.bg, color:rc.color, border:`1px solid ${rc.border}` }}/>
                    <Typography sx={{ fontSize:12, fontWeight:800,
                      color: earned ? rc.color : T.textSub, mb:0.3 }}>
                      {badge.label}
                    </Typography>
                    <Typography sx={{ fontSize:10, color:T.textMute, lineHeight:1.4, mb:0.8 }}>
                      {badge.desc}
                    </Typography>
                    <Typography sx={{ fontSize:10, fontWeight:700, color:T.green }}>
                      +{badge.pts} pts
                    </Typography>
                    {earned && (
                      <Chip label="✓ Earned" size="small" sx={{ mt:0.8, height:18, fontSize:9,
                        fontWeight:800, background:"#dcfce7", color:T.green, border:"1px solid #bbf7d0" }}/>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* ══ REDEEM ══════════════════════════════════════════════ */}
        {tab==="redeem" && (
          <Box>
            <Box sx={{ display:"flex", alignItems:"center", gap:2, mb:3, p:2,
              background:T.orangeL, border:`1px solid rgba(249,115,22,0.2)`, borderRadius:"14px" }}>
              <Box>
                <Typography sx={{ fontSize:11, color:T.textSub, fontWeight:600 }}>AVAILABLE BALANCE</Typography>
                <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:28,
                  color:T.orange, lineHeight:1 }}>
                  {gm.points||0} pts
                </Typography>
              </Box>
              <Typography sx={{ fontSize:12, color:T.textSub, flex:1 }}>
                Real points from your driving sessions. Coupons sent to your email instantly. Points never expire.
              </Typography>
            </Box>

            <Box sx={{ display:"grid", gridTemplateColumns:{xs:"1fr",sm:"repeat(2,1fr)",md:"repeat(3,1fr)"}, gap:1.5 }}>
              {CATALOGUE.map(reward => {
                const canAfford = (gm.points||0) >= reward.cost;
                return (
                  <Card key={reward.id} highlighted={canAfford && reward.available}
                    sx={{ opacity: reward.available ? 1 : 0.65 }}>
                    <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", mb:1.5 }}>
                      <Box sx={{ width:48, height:48, borderRadius:"12px",
                        background: canAfford ? T.orangeL : T.cardAlt,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>
                        {reward.icon}
                      </Box>
                      <Box sx={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:0.5 }}>
                        {!reward.available && (
                          <Chip label="Coming Soon" size="small" sx={{ height:18, fontSize:8,
                            fontWeight:700, background:"#f3f4f6", color:T.textSub }}/>
                        )}
                        <Chip label={reward.category} size="small" sx={{ height:18, fontSize:8,
                          fontWeight:700, background:T.blueL, color:T.blue }}/>
                      </Box>
                    </Box>
                    <Typography sx={{ fontWeight:800, fontSize:14, color:T.text, mb:0.3 }}>
                      {reward.label}
                    </Typography>
                    <Typography sx={{ fontSize:11, color:T.textSub, mb:1.5 }}>{reward.partner}</Typography>
                    <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <Box>
                        <Typography sx={{ fontWeight:900, fontSize:16,
                          color: canAfford ? T.orange : T.textMute }}>
                          {reward.cost} pts
                        </Typography>
                        {!canAfford && reward.available && (
                          <Typography sx={{ fontSize:10, color:T.red, fontWeight:600 }}>
                            Need {reward.cost - (gm.points||0)} more
                          </Typography>
                        )}
                      </Box>
                      <button onClick={() => initiateRedeem(reward)}
                        disabled={!canAfford || !reward.available}
                        style={{ padding:"8px 18px", border:"none", borderRadius:24,
                          background: canAfford && reward.available
                            ? "linear-gradient(135deg,#f97316,#ea4335)" : "#f3f4f6",
                          color: canAfford && reward.available ? "#fff" : T.textMute,
                          fontWeight:800, fontSize:12,
                          cursor: canAfford && reward.available ? "pointer" : "not-allowed",
                          fontFamily:"'DM Sans',sans-serif",
                          boxShadow: canAfford && reward.available ? "0 3px 12px rgba(249,115,22,0.4)" : "none" }}>
                        {reward.available ? "Redeem →" : "Soon"}
                      </button>
                    </Box>
                  </Card>
                );
              })}
            </Box>

            <Typography sx={{ fontSize:11, color:T.textMute, textAlign:"center", mt:2.5, lineHeight:1.8 }}>
              🔐 Verified by IntelliCrash HP · ✉️ Coupons sent instantly · 📞 support@intellicrash.in
            </Typography>
          </Box>
        )}

        {/* ══ HISTORY ════════════════════════════════════════════ */}
        {tab==="history" && (
          <Box>
            <SLabel>Redemption History</SLabel>
            {!(gm.redemptions?.length) ? (
              <Card sx={{ textAlign:"center", py:4 }}>
                <Typography sx={{ fontSize:40, mb:1.5 }}>🎁</Typography>
                <Typography sx={{ fontWeight:700, fontSize:15, color:T.text, mb:0.5 }}>
                  No redemptions yet
                </Typography>
                <Typography sx={{ fontSize:13, color:T.textSub }}>
                  Earn points and redeem your first reward!
                </Typography>
              </Card>
            ) : (
              <Box sx={{ display:"flex", flexDirection:"column", gap:1.5 }}>
                {gm.redemptions.map(r => (
                  <Card key={r.id}>
                    <Box sx={{ display:"flex", justifyContent:"space-between",
                      alignItems:"flex-start", flexWrap:"wrap", gap:1 }}>
                      <Box>
                        <Typography sx={{ fontWeight:800, fontSize:14, color:T.text }}>{r.rewardLabel}</Typography>
                        <Typography sx={{ fontSize:12, color:T.textSub }}>{r.partner}</Typography>
                        <Typography sx={{ fontSize:11, color:T.textMute, mt:0.3 }}>
                          {new Date(r.date).toLocaleDateString("en-IN",
                            {day:"numeric",month:"long",year:"numeric"})} · {r.email}
                        </Typography>
                        {r.emailFailed && (
                          <Typography sx={{ fontSize:11, color:T.red, fontWeight:600, mt:0.3 }}>
                            ⚠️ Email failed — contact support
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign:"right" }}>
                        <Box sx={{ px:2, py:0.75, background:T.greenL,
                          border:"1px solid #bbf7d0", borderRadius:"8px",
                          display:"inline-block", mb:0.5 }}>
                          <Typography sx={{ fontFamily:"'DM Mono',monospace", fontWeight:800,
                            fontSize:13, color:T.green, letterSpacing:1 }}>
                            {r.coupon}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize:11, color:T.orange, fontWeight:700 }}>
                          −{r.pointsSpent} pts
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* ── CTA ──────────────────────────────────────────────── */}
        <Box sx={{ mt:4, p:3, textAlign:"center",
          background:"linear-gradient(135deg,#fff7ed,#fff)",
          border:`1.5px solid rgba(249,115,22,0.2)`, borderRadius:"20px", boxShadow:T.shadow }}>
          <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:18,
            color:T.text, mb:0.5 }}>
            Keep earning — drive safely 🛡️
          </Typography>
          <Typography sx={{ fontSize:13, color:T.textSub, mb:2.5 }}>
            Every real trip on HP roads earns you points based on your driver score.
          </Typography>
          <button onClick={() => navigate("/navigation")} style={{
            padding:"13px 32px", border:"none", borderRadius:28,
            background:"linear-gradient(135deg,#f97316,#ea4335)",
            color:"#fff", fontWeight:900, fontSize:15, cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif", boxShadow:"0 6px 24px rgba(249,115,22,0.45)" }}>
            🧭 Start Navigating
          </button>
        </Box>
      </Box>

      {/* Toast */}
      <Snackbar open={toast.open} autoHideDuration={4500}
        onClose={() => setToast(t => ({...t,open:false}))}
        anchorOrigin={{ vertical:"bottom", horizontal:"center" }}>
        <Alert severity={toast.type} onClose={() => setToast(t => ({...t,open:false}))}
          sx={{ fontWeight:600, borderRadius:"12px", boxShadow:T.shadowLg }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}