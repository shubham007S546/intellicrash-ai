/**
 * TripHistory.jsx — Light Theme + Animations + Rewards with Point Deduction
 * Route: /trips
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, Grid, Stack, Button,
  LinearProgress, Tabs, Tab, Badge, Snackbar, Alert,
} from "@mui/material";
import { getSessions, initGM } from "../services/api";
/* ─── Helpers ────────────────────────────────────────────────────────────── */
const RC = s => s >= 67 ? "#ef4444" : s >= 34 ? "#f59e0b" : "#10b981";
const RB = s => s >= 67 ? "#fee2e2" : s >= 34 ? "#fef3c7" : "#d1fae5";
const RL = s => s >= 67 ? "HIGH"    : s >= 34 ? "MEDIUM"  : "SAFE";
const fmt = n => n < 10 ? `0${n}` : `${n}`;

/* ─── Global CSS ─────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap');
  :root {
    --bg:#f4f7ff; --surface:#ffffff; --border:#e2e8f8; --border-hi:#c7d2fe;
    --blue:#3b5bdb; --blue-lt:#dbeafe; --teal:#0ea5e9; --teal-lt:#e0f7ff;
    --green:#10b981; --green-lt:#d1fae5; --amber:#f59e0b; --amber-lt:#fef3c7;
    --red:#ef4444; --red-lt:#fee2e2; --purple:#8b5cf6; --purple-lt:#ede9fe;
    --pink:#ec4899; --pink-lt:#fce7f3; --orange:#f97316; --orange-lt:#ffedd5;
    --cyan:#06b6d4; --cyan-lt:#cffafe; --indigo:#6366f1; --indigo-lt:#e0e7ff;
    --text:#1e293b; --muted:#64748b;
    --shadow:0 4px 24px rgba(59,91,219,.08); --shadow-hi:0 8px 40px rgba(59,91,219,.18);
    --radius:16px;
  }
  @keyframes fadeUp    {from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes float     {0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes shimmer   {from{background-position:-200% center}to{background-position:200% center}}
  @keyframes pulse-dot {0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.5}}
  @keyframes pop       {0%{transform:scale(1)}40%{transform:scale(1.1)}100%{transform:scale(1)}}
  @keyframes countUp   {from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes confetti  {0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(-70px) rotate(480deg);opacity:0}}
  @keyframes slideIn   {from{width:0}to{width:var(--w)}}

  .th * {box-sizing:border-box;font-family:'Lexend',sans-serif;}
  .th  {background:var(--bg);min-height:calc(100vh - 58px);}

  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
    box-shadow:var(--shadow);overflow:hidden;transition:box-shadow .25s,transform .25s,border-color .25s;}
  .card:hover{box-shadow:var(--shadow-hi);transform:translateY(-2px);border-color:var(--border-hi);}

  .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
    padding:18px 12px;text-align:center;transition:all .25s;position:relative;overflow:hidden;}
  .stat-card:hover{box-shadow:var(--shadow-hi);transform:translateY(-3px);border-color:var(--border-hi);}

  .th-tabs .MuiTab-root{font-family:'Lexend',sans-serif;font-weight:600;text-transform:none;font-size:13px;color:var(--muted);}
  .th-tabs .Mui-selected{color:var(--blue) !important;}
  .th-tabs .MuiTabs-indicator{background:var(--blue);height:2.5px;border-radius:2px;}

  .badge-tile{padding:14px 12px;border-radius:14px;border:1px solid var(--border);background:var(--surface);
    transition:all .22s;position:relative;overflow:hidden;}
  .badge-tile.earned{border-color:#c7d2fe;background:linear-gradient(135deg,#f0f4ff,#e8f0fe);
    box-shadow:0 4px 16px rgba(59,91,219,.1);}
  .badge-tile.earned:hover{transform:scale(1.04);box-shadow:0 8px 28px rgba(59,91,219,.18);}

  .trip-row{transition:background .15s;}
  .trip-row:hover{background:#f0f4ff !important;}

  .coupon{background:var(--surface);border-radius:var(--radius);overflow:visible;
    position:relative;transition:all .25s;border:1px solid var(--border);}
  .coupon:hover:not(.redeemed){box-shadow:var(--shadow-hi);transform:translateY(-3px);}
  .coupon.redeemed{opacity:.6;}
  .cn{position:absolute;width:20px;height:20px;border-radius:50%;background:var(--bg);
    top:50%;transform:translateY(-50%);border:1px solid var(--border);}
  .cn.L{left:-10px;} .cn.R{right:-10px;}

  .redeem-btn{background:linear-gradient(135deg,#3b5bdb,#0ea5e9);background-size:200% auto;
    animation:shimmer 3s linear infinite;border:none;cursor:pointer;color:#fff;font-weight:700;
    border-radius:30px;padding:8px 20px;font-family:'Lexend',sans-serif;font-size:12px;
    transition:transform .15s,box-shadow .15s;box-shadow:0 4px 14px rgba(59,91,219,.3);}
  .redeem-btn:hover{transform:scale(1.05);box-shadow:0 6px 20px rgba(59,91,219,.4);}
  .redeem-btn:disabled{background:linear-gradient(135deg,#e2e8f8,#cbd5e1);animation:none;
    cursor:not-allowed;box-shadow:none;transform:none;color:#94a3b8;}

  .fade-up{animation:fadeUp .55s cubic-bezier(.22,1,.36,1) both;}
  .mono{font-family:'Fira Code',monospace;}
  .earn-row{display:flex;justify-content:space-between;align-items:center;
    padding:9px 0;border-bottom:1px solid #f1f5f9;}
  .earn-row:last-child{border-bottom:none;}

  .score-ring{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;font-family:'Fira Code',monospace;font-weight:700;
    font-size:12px;border:2px solid;flex-shrink:0;}

  .tier-track{height:10px;border-radius:5px;background:#e2e8f8;overflow:hidden;}
  .tier-fill{height:100%;border-radius:5px;transition:width 1.2s cubic-bezier(.22,1,.36,1);}

  .confetti-p{position:absolute;width:8px;height:8px;border-radius:2px;
    pointer-events:none;animation:confetti .9s ease forwards;}

  .pts-anim{animation:countUp .4s ease;}
`;

/* ─── Sparkline ──────────────────────────────────────────────────────────── */
function SparkLine({ scores }) {
  if (!scores || scores.length < 2) return null;
  const pts = scores.slice(0, 20).reverse();
  const W = 320, H = 80;
  const coords = pts.map((s, i) => ({ x: (i / (pts.length - 1)) * W, y: H - (s / 100) * H }));
  const line  = coords.map(p => `${p.x},${p.y}`).join(" ");
  const area  = [...coords.map(p => `${p.x},${p.y}`), `${W},${H}`, `0,${H}`].join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:H }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b5bdb" stopOpacity=".15"/>
          <stop offset="100%" stopColor="#3b5bdb" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sg2)" />
      <polyline points={line} fill="none" stroke="#3b5bdb" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"/>
      {coords.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={RC(100 - pts[i])} stroke="#fff" strokeWidth="2"/>
      ))}
    </svg>
  );
}

/* ─── Animated Bar ───────────────────────────────────────────────────────── */
function AnimBar({ pct, color, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => { if (ref.current) ref.current.style.width = `${pct}%`; }, delay + 300);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="tier-track">
      <div ref={ref} className="tier-fill" style={{ width:0, background:`linear-gradient(90deg,${color},${color}bb)`, boxShadow:`0 0 8px ${color}55` }}/>
    </div>
  );
}

/* ─── Tiers ──────────────────────────────────────────────────────────────── */
const TIERS = [
  { label:"Bronze",   min:0,    color:"#cd7f32", icon:"🥉" },
  { label:"Silver",   min:500,  color:"#94a3b8", icon:"🥈" },
  { label:"Gold",     min:1500, color:"#f59e0b", icon:"🥇" },
  { label:"Platinum", min:3000, color:"#8b5cf6", icon:"💎" },
  { label:"Diamond",  min:6000, color:"#06b6d4", icon:"💠" },
];

/* ─── Points Meter ───────────────────────────────────────────────────────── */
function PointsMeter({ points }) {
  const tier = [...TIERS].reverse().find(t => points >= t.min) || TIERS[0];
  const next = TIERS[TIERS.indexOf(tier) + 1];
  const pct  = next ? Math.min(100, ((points - tier.min) / (next.min - tier.min)) * 100) : 100;
  return (
    <div style={{ padding:20, borderRadius:14, border:"1px solid var(--border)",
      background:"linear-gradient(135deg,#f8faff,#f0f4ff)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:.8, textTransform:"uppercase", color:"var(--muted)", marginBottom:4 }}>Current Tier</div>
          <div style={{ fontFamily:"'Lexend',sans-serif", fontWeight:800, fontSize:22, color:tier.color }}>
            {tier.icon} {tier.label}
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div className="mono pts-anim" style={{ fontWeight:700, fontSize:30, color:"var(--blue)", lineHeight:1 }}>
            {points.toLocaleString()}
          </div>
          <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600 }}>IntelliCrash Points</div>
        </div>
      </div>
      <AnimBar pct={pct} color={tier.color}/>
      {next && (
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
          <span style={{ fontSize:10, color:"var(--muted)" }}>{tier.icon} {tier.label}</span>
          <span style={{ fontSize:10, color:"var(--muted)" }}>
            {(next.min - points).toLocaleString()} pts to {next.icon} {next.label}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Rewards Data (12 coupons) ──────────────────────────────────────────── */
const REWARDS = [
  { id:"R1",  title:"₹150 Fuel Cashback",        brand:"BPCL",         discount:"₹150",    code:"SAFE150FUEL", pts:500,  expiry:"30 Apr 2026", icon:"⛽", color:"#f59e0b", bg:"#fef3c7", desc:"Valid at all BPCL pumps on min ₹1000 fill" },
  { id:"R2",  title:"20% Off Car Service",        brand:"GoMechanic",   discount:"20% OFF", code:"GMSAFE20",   pts:350,  expiry:"15 May 2026", icon:"🔧", color:"#0ea5e9", bg:"#e0f7ff", desc:"On any periodic service package above ₹2500" },
  { id:"R3",  title:"Free Tyre Rotation",         brand:"Apollo Tyres", discount:"FREE",    code:"APOLLO2026", pts:200,  expiry:"20 Apr 2026", icon:"🛞", color:"#10b981", bg:"#d1fae5", desc:"Free rotation + balancing at Apollo centres" },
  { id:"R4",  title:"₹500 Insurance Waiver",      brand:"Bajaj Allianz",discount:"₹500",    code:"DRVSAFE500", pts:800,  expiry:"30 Jun 2026", icon:"🛡️", color:"#8b5cf6", bg:"#ede9fe", desc:"On renewal of existing motor insurance policy" },
  { id:"R5",  title:"Free Premium Car Wash",      brand:"Myles",        discount:"1 FREE",  code:"MYLWASH",    pts:150,  expiry:"10 Apr 2026", icon:"🚿", color:"#ec4899", bg:"#fce7f3", desc:"One complimentary premium wash at Myles" },
  { id:"R6",  title:"15% FASTag Recharge",        brand:"Paytm",        discount:"15% OFF", code:"FT15SAFE",   pts:250,  expiry:"31 May 2026", icon:"🏷️", color:"#f97316", bg:"#ffedd5", desc:"On FASTag recharge above ₹500 via Paytm" },
  { id:"R7",  title:"₹200 Ola Ride Credit",       brand:"Ola",          discount:"₹200",    code:"OLA200DRV",  pts:400,  expiry:"25 May 2026", icon:"🚕", color:"#06b6d4", bg:"#cffafe", desc:"Applicable on 2 Ola rides of ₹100 each" },
  { id:"R8",  title:"Free Helmet Safety Check",   brand:"Studds",       discount:"FREE",    code:"STUDDS26",   pts:100,  expiry:"30 Jun 2026", icon:"🪖", color:"#6366f1", bg:"#e0e7ff", desc:"Safety inspection at authorised Studds outlets" },
  { id:"R9",  title:"₹300 Amazon Pay Balance",    brand:"Amazon Pay",   discount:"₹300",    code:"AMZPAY300",  pts:900,  expiry:"15 Jun 2026", icon:"🛒", color:"#f59e0b", bg:"#fef3c7", desc:"Credited as Amazon Pay balance directly" },
  { id:"R10", title:"1-Month GPS Premium",        brand:"MapmyIndia",   discount:"1 MONTH", code:"MMIGPS1M",   pts:600,  expiry:"30 Jun 2026", icon:"📡", color:"#10b981", bg:"#d1fae5", desc:"MapmyIndia Move premium subscription" },
  { id:"R11", title:"10% Off Dashcam",            brand:"70mai",        discount:"10% OFF", code:"70MAI10",    pts:450,  expiry:"31 May 2026", icon:"📷", color:"#8b5cf6", bg:"#ede9fe", desc:"On 70mai dashcam at official 70mai store" },
  { id:"R12", title:"₹100 PetrolPump Wallet",     brand:"PetrolPump.in",discount:"₹100",    code:"PP100SAFE",  pts:180,  expiry:"20 Apr 2026", icon:"💳", color:"#ec4899", bg:"#fce7f3", desc:"Usable at partner fuel stations across HP" },
];

/* ─── Confetti ───────────────────────────────────────────────────────────── */
function Confetti({ active }) {
  if (!active) return null;
  const COLORS = ["#3b5bdb","#10b981","#f59e0b","#ec4899","#06b6d4","#8b5cf6"];
  return (
    <div style={{ position:"absolute", top:0, left:"50%", pointerEvents:"none", zIndex:20 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="confetti-p" style={{
          background: COLORS[i % COLORS.length],
          left: `${(i - 5) * 16}px`,
          animationDelay: `${i * 55}ms`,
        }}/>
      ))}
    </div>
  );
}

/* ─── Coupon Card ────────────────────────────────────────────────────────── */
function CouponCard({ reward, points, onRedeem }) {
  const canRedeem = points >= reward.pts;
  const [redeemed, setRedeemed] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [burst,    setBurst]    = useState(false);

  const handleRedeem = () => {
    if (!canRedeem || redeemed) return;
    setRedeemed(true);
    setBurst(true);
    onRedeem(reward);
    setTimeout(() => setBurst(false), 1000);
  };
  const handleCopy = () => {
    navigator.clipboard?.writeText(reward.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`coupon ${redeemed ? "redeemed" : ""}`}
      style={{ borderColor: redeemed ? "#e2e8f8" : `${reward.color}44` }}>
      <div className="cn L"/><div className="cn R"/>
      <div style={{ height:3, background:`linear-gradient(90deg,${reward.color},${reward.color}33)` }}/>

      <div style={{ display:"flex", gap:14, padding:"16px 22px", alignItems:"flex-start", position:"relative" }}>
        <Confetti active={burst}/>
        {/* icon */}
        <div style={{ width:52, height:52, borderRadius:14, flexShrink:0, background:reward.bg,
          border:`1.5px solid ${reward.color}33`, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:23, animation:"float 3s ease-in-out infinite" }}>
          {reward.icon}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13.5, color:"var(--text)", lineHeight:1.2 }}>{reward.title}</div>
              <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>{reward.brand}</div>
            </div>
            <div className="mono" style={{ fontWeight:700, fontSize:15, color:reward.color, whiteSpace:"nowrap",
              background:reward.bg, padding:"3px 10px", borderRadius:10, border:`1px solid ${reward.color}22` }}>
              {reward.discount}
            </div>
          </div>

          <div style={{ fontSize:11.5, color:"var(--muted)", marginTop:7, lineHeight:1.5 }}>{reward.desc}</div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {redeemed ? (
                <div style={{ display:"flex", alignItems:"center", gap:7, background:reward.bg,
                  border:`1px solid ${reward.color}44`, borderRadius:20, padding:"4px 14px" }}>
                  <span className="mono" style={{ fontSize:11, color:reward.color, fontWeight:600 }}>{reward.code}</span>
                  <button onClick={handleCopy} style={{ background:"none", border:"none", cursor:"pointer",
                    color: copied ? reward.color : "var(--muted)", fontSize:14, padding:0, lineHeight:1 }}
                    title="Copy">
                    {copied ? "✓" : "⎘"}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ fontSize:15 }}>⭐</span>
                    <span className="mono" style={{ fontWeight:700, fontSize:12,
                      color: canRedeem ? "#f59e0b" : "var(--muted)" }}>
                      {reward.pts.toLocaleString()} pts
                    </span>
                  </div>
                  <span style={{ fontSize:10, color:"var(--muted)" }}>Exp: {reward.expiry}</span>
                </>
              )}
            </div>

            {redeemed ? (
              <div style={{ display:"flex", alignItems:"center", gap:5, background:"#d1fae5",
                border:"1px solid #6ee7b7", borderRadius:20, padding:"4px 14px" }}>
                <span style={{ fontSize:11, color:"#059669", fontWeight:700, animation:"pop .4s ease" }}>✓ Redeemed!</span>
              </div>
            ) : (
              <button className="redeem-btn" onClick={handleRedeem} disabled={!canRedeem}
                style={!canRedeem ? { background:"linear-gradient(135deg,#e2e8f8,#cbd5e1)",
                  animation:"none", color:"#94a3b8", boxShadow:"none" } : {}}>
                {canRedeem ? "🎁 Redeem Now" : `Need ${(reward.pts - points).toLocaleString()} more pts`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function TripHistory() {
  const nav = useNavigate();
  const [sessions,  setSessions] = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [tab,       setTab]      = useState(0);
  const [points,    setPoints]   = useState(2230);
  const [toast,     setToast]    = useState(null);
  const gm = initGM();

  useEffect(() => {
    getSessions()
      .then(d => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => setLoading(false));
    setPoints(gm.points || 2230);
    if (!document.getElementById("th-lc")) {
      const s = document.createElement("style");
      s.id = "th-lc"; s.innerHTML = GLOBAL_CSS;
      document.head.appendChild(s);
    }
  }, []);

  const avgScore     = sessions.length ? Math.round(sessions.reduce((a, s) => a + (s.driver_score || 0), 0) / sessions.length) : 0;
  const totalKm      = sessions.reduce((a, s) => a + (s.distance_km || 0), 0);
  const totalMin     = sessions.reduce((a, s) => a + (s.duration_min || 0), 0);
  const highRisk     = sessions.filter(s => s.risk_score >= 67).length;
  const driverScores = sessions.map(s => s.driver_score || 0);

  const STATS = [
    { icon:"🚗", label:"Total Trips",      value: sessions.length,                                           color:"#3b5bdb" },
    { icon:"📏", label:"Total Distance",   value: `${totalKm.toFixed(1)} km`,                               color:"#10b981" },
    { icon:"⏱️", label:"Drive Time",       value: `${Math.round(totalMin/60)}h ${fmt(Math.round(totalMin%60))}m`, color:"#f59e0b" },
    { icon:"🏅", label:"Avg Score",        value: avgScore,                                                   color: RC(100-avgScore) },
    { icon:"⚠️", label:"High Risk",        value: highRisk,                                                   color:"#ef4444" },
    { icon:"⭐", label:"Points",           value: points.toLocaleString(),                                    color:"#f59e0b" },
  ];

  const BADGES = [
    ["🚀","First Trip",    sessions.length>=1,                      "Complete your first trip"],
    ["🛡️","Safe Driver",   highRisk===0&&sessions.length>=5,        "5+ trips, all low risk"],
    ["🗺️","Explorer",      sessions.length>=10,                     "Complete 10 trips"],
    ["🌙","Night Owl",     (gm.badges||[]).includes("night_owl"),   "Drive safely at night"],
    ["📡","Road Reporter", (gm.reports||0)>=3,                      "Report 3+ incidents"],
    ["⚡","Speed Demon",   sessions.some(s=>s.avg_speed>80),        "Avg speed over 80 km/h"],
    ["💯","Perfect Score", Math.max(...driverScores,0)>=95,         "Get 95+ driver score"],
    ["🏆","Road Master",   sessions.length>=25&&highRisk===0,       "25 trips, all safe"],
  ];

  const handleRedeem = (reward) => {
    setPoints(p => Math.max(0, p - reward.pts));
    setToast({ msg:`🎉 "${reward.title}" redeemed! Code copied: ${reward.code}`, type:"success" });
  };

  return (
    <div className="th">
      {/* ── Header ── */}
      <div style={{ background:"linear-gradient(135deg,#3b5bdb 0%,#0ea5e9 55%,#6366f1 100%)",
        padding:"26px 24px", position:"relative", overflow:"hidden" }}>
        {[90,150,210].map((sz,i) => (
          <div key={i} style={{ position:"absolute", top:-30, right:-30, width:sz, height:sz,
            borderRadius:"50%", border:`1px solid rgba(255,255,255,${.18-i*.05})`, pointerEvents:"none" }}/>
        ))}
        <Container maxWidth="lg" style={{ position:"relative" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:46, height:46, borderRadius:14, background:"rgba(255,255,255,.2)",
                backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:22, animation:"float 3s ease-in-out infinite" }}>🚗</div>
              <div>
                <div style={{ fontFamily:"'Lexend',sans-serif", fontWeight:800, fontSize:26, color:"#fff", letterSpacing:"-.5px" }}>
                  Trip History
                </div>
                <div style={{ color:"rgba(255,255,255,.75)", fontSize:12 }}>
                  All navigated trips · Score analysis · Rewards centre
                </div>
              </div>
            </div>
            <button onClick={()=>nav("/navigation")} style={{ background:"rgba(255,255,255,.2)",
              backdropFilter:"blur(8px)", border:"1.5px solid rgba(255,255,255,.35)", color:"#fff",
              borderRadius:30, padding:"10px 22px", fontFamily:"'Lexend',sans-serif",
              fontWeight:700, fontSize:13, cursor:"pointer", transition:"all .18s" }}
              onMouseEnter={e=>{e.target.style.background="rgba(255,255,255,.35)";}}
              onMouseLeave={e=>{e.target.style.background="rgba(255,255,255,.2)";}}>
              + New Trip
            </button>
          </div>
        </Container>
      </div>

      <Container maxWidth="lg" style={{ padding:"24px 16px" }}>

        {/* ── Stat cards ── */}
        <Grid container spacing={2} sx={{ mb:3 }}>
          {STATS.map((s,i) => (
            <Grid item xs={6} sm={4} md={2} key={s.label}>
              <div className="stat-card fade-up" style={{ animationDelay:`${i*60}ms` }}>
                <div style={{ height:3, background:`linear-gradient(90deg,${s.color},${s.color}44)`,
                  borderRadius:2, marginBottom:10 }}/>
                <div style={{ fontSize:24 }}>{s.icon}</div>
                <div className="mono" style={{ fontWeight:700, fontSize:20, color:s.color, lineHeight:1.1, margin:"6px 0 3px" }}>
                  {s.value}
                </div>
                <div style={{ fontSize:10, fontWeight:600, letterSpacing:.7, textTransform:"uppercase", color:"var(--muted)" }}>
                  {s.label}
                </div>
              </div>
            </Grid>
          ))}
        </Grid>

        {/* ── Tabs ── */}
        <div className="th-tabs" style={{ borderBottom:"2px solid var(--border)", marginBottom:24 }}>
          <Tabs value={tab} onChange={(_,v)=>setTab(v)} variant="scrollable">
            <Tab label="📊 Analytics & Trips"/>
            <Tab label={
              <Badge badgeContent={REWARDS.length} color="primary"
                sx={{ "& .MuiBadge-badge":{ fontSize:9, minWidth:16, height:16 } }}>
                <span style={{ paddingRight:10 }}>🎁 Rewards Centre</span>
              </Badge>
            }/>
          </Tabs>
        </div>

        {/* ══ TAB 0: ANALYTICS ══ */}
        {tab === 0 && (
          <Grid container spacing={3}>
            {/* Score trend */}
            <Grid item xs={12} md={5}>
              <div className="card fade-up">
                <div style={{ padding:"18px 22px 12px", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"var(--text)" }}>📈 Driver Score Trend</div>
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:3 }}>
                    Last {Math.min(driverScores.length,20)} trips · Higher = safer
                  </div>
                </div>
                <div style={{ padding:"18px 22px" }}>
                  {driverScores.length >= 2 ? (
                    <>
                      <SparkLine scores={driverScores}/>
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:16 }}>
                        {[["Latest",driverScores[0],RC(100-driverScores[0])],
                          ["Average",avgScore,"#3b5bdb"],
                          ["Best",Math.max(...driverScores),"#10b981"]].map(([l,v,c])=>(
                          <div key={l} style={{ textAlign:"center" }}>
                            <div style={{ fontSize:10, fontWeight:600, letterSpacing:.7, textTransform:"uppercase", color:"var(--muted)" }}>{l}</div>
                            <div className="mono" style={{ fontWeight:800, fontSize:26, color:c, lineHeight:1.1 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign:"center", padding:"32px 0" }}>
                      <div style={{ fontSize:40, marginBottom:8 }}>🗺️</div>
                      <div style={{ color:"var(--muted)", fontSize:13 }}>Complete trips to see your trend</div>
                    </div>
                  )}
                </div>
              </div>
            </Grid>

            {/* Badges */}
            <Grid item xs={12} md={7}>
              <div className="card fade-up" style={{ animationDelay:"80ms", height:"100%" }}>
                <div style={{ padding:"18px 22px 12px", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"var(--text)" }}>🏅 Achievements</div>
                </div>
                <div style={{ padding:"18px 22px" }}>
                  <Grid container spacing={1.5}>
                    {BADGES.map(([icon,label,earned,desc])=>(
                      <Grid item xs={6} sm={4} key={label}>
                        <div className={`badge-tile ${earned?"earned":""}`}>
                          {earned && (
                            <div style={{ position:"absolute", top:8, right:8, width:18, height:18,
                              borderRadius:"50%", background:"linear-gradient(135deg,#3b5bdb,#0ea5e9)",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:10, color:"#fff", fontWeight:700 }}>✓</div>
                          )}
                          <div style={{ fontSize:22, marginBottom:5 }}>{icon}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:earned?"#3b5bdb":"var(--muted)" }}>{label}</div>
                          <div style={{ fontSize:10.5, color:"var(--muted)", lineHeight:1.4, marginTop:2 }}>{desc}</div>
                        </div>
                      </Grid>
                    ))}
                  </Grid>
                </div>
              </div>
            </Grid>

            {/* Trip Table */}
            <Grid item xs={12}>
              <div className="card fade-up" style={{ animationDelay:"140ms" }}>
                <div style={{ padding:"18px 22px 12px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"var(--text)" }}>
                    📋 All Trips <span style={{ color:"var(--muted)", fontWeight:400, fontSize:13 }}>({sessions.length})</span>
                  </div>
                </div>
                <div style={{ padding:"18px 22px" }}>
                  {loading ? (
                    <LinearProgress sx={{ borderRadius:4, bgcolor:"#e2e8f8", "& .MuiLinearProgress-bar":{ background:"linear-gradient(90deg,#3b5bdb,#0ea5e9)" } }}/>
                  ) : sessions.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"48px 0" }}>
                      <div style={{ fontSize:44, marginBottom:12 }}>🗺️</div>
                      <div style={{ color:"var(--muted)", marginBottom:16, fontFamily:"'Lexend',sans-serif" }}>
                        No trips yet. Start navigating to build your history.
                      </div>
                      <button className="redeem-btn" onClick={()=>nav("/navigation")}>Start Navigating</button>
                    </div>
                  ) : (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"'Lexend',sans-serif" }}>
                        <thead>
                          <tr style={{ borderBottom:"2px solid var(--border)" }}>
                            {["#","Route","Date","Distance","Duration","Avg Speed","Driver Score","Risk",""].map(h=>(
                              <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"var(--muted)",
                                fontSize:10, fontWeight:700, letterSpacing:.8, textTransform:"uppercase", whiteSpace:"nowrap" }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map((s,i)=>(
                            <tr key={s.id||i} className="trip-row" style={{ borderBottom:"1px solid #f1f5f9" }}>
                              <td style={{ padding:"11px 10px", color:"var(--muted)", fontFamily:"'Fira Code',monospace", fontSize:11 }}>
                                {sessions.length-i}
                              </td>
                              <td style={{ padding:"11px 10px", maxWidth:200 }}>
                                <div style={{ fontWeight:600, fontSize:12.5, color:"var(--text)",
                                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                  {s.trip_from||"—"} → {s.trip_to||"—"}
                                </div>
                              </td>
                              <td style={{ padding:"11px 10px", color:"var(--muted)", fontSize:11, whiteSpace:"nowrap" }}>
                                {s.timestamp?.slice(0,16).replace("T"," ")||"—"}
                              </td>
                              <td style={{ padding:"11px 10px", color:"var(--text)" }}>{s.distance_km?.toFixed(1)||"0"} km</td>
                              <td style={{ padding:"11px 10px", color:"var(--text)" }}>{s.duration_min?.toFixed(0)||"0"} min</td>
                              <td style={{ padding:"11px 10px", color:"var(--text)" }}>{s.avg_speed?.toFixed(0)||"0"} km/h</td>
                              <td style={{ padding:"11px 10px" }}>
                                <div className="score-ring" style={{
                                  borderColor:RC(100-(s.driver_score||0)),
                                  color:RC(100-(s.driver_score||0)),
                                  background:RB(100-(s.driver_score||0)) }}>
                                  {Math.round(s.driver_score||0)}
                                </div>
                              </td>
                              <td style={{ padding:"11px 10px" }}>
                                <span className="mono" style={{ background:RB(s.risk_score||0), color:RC(s.risk_score||0),
                                  border:`1px solid ${RC(s.risk_score||0)}44`, borderRadius:20,
                                  padding:"3px 10px", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>
                                  {s.risk_score?.toFixed(0)||"?"} · {RL(s.risk_score||0)}
                                </span>
                              </td>
                              <td style={{ padding:"11px 10px" }}>
                                {s.trip_from&&s.trip_to&&(
                                  <button onClick={()=>window.open(`/navigation?from=${encodeURIComponent(s.trip_from||"")}&to=${encodeURIComponent(s.trip_to||"")}`, "_self")}
                                    style={{ background:"var(--blue-lt)", border:"1px solid var(--border-hi)",
                                      color:"var(--blue)", borderRadius:20, padding:"3px 12px",
                                      fontSize:10, fontWeight:700, cursor:"pointer",
                                      fontFamily:"'Lexend',sans-serif", transition:"all .15s" }}
                                    onMouseEnter={e=>{e.target.style.background="#c7d2fe";}}
                                    onMouseLeave={e=>{e.target.style.background="var(--blue-lt)";}}>
                                    Replay ↗
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </Grid>
          </Grid>
        )}

        {/* ══ TAB 1: REWARDS ══ */}
        {tab === 1 && (
          <Grid container spacing={3}>
            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <PointsMeter points={points}/>

                {/* How to earn */}
                <div className="card" style={{ padding:20 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>🎯 How to Earn Points</div>
                  {[
                    ["🚗","Complete a trip",          "+10", "#3b5bdb"],
                    ["🛡️","Low risk trip",             "+15", "#10b981"],
                    ["💯","Driver score ≥ 90",         "+25", "#f59e0b"],
                    ["📡","Report road incident",      "+20", "#0ea5e9"],
                    ["🌙","Safe night drive",          "+30", "#8b5cf6"],
                    ["🏆","10-trip safe streak",       "+100","#ef4444"],
                    ["🌟","Perfect score (100)",       "+50", "#f59e0b"],
                    ["📅","Weekend safe drive",        "+20", "#ec4899"],
                    ["🗺️","10th trip milestone",       "+75", "#3b5bdb"],
                    ["⭐","Refer a friend",            "+200","#10b981"],
                  ].map(([icon,label,pts,color])=>(
                    <div className="earn-row" key={label}>
                      <span style={{ fontSize:12, color:"var(--text)", display:"flex", alignItems:"center", gap:7 }}>
                        <span>{icon}</span>{label}
                      </span>
                      <span className="mono" style={{ fontSize:12, fontWeight:700, color }}>
                        {pts} pts
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tier perks */}
                <div style={{ padding:18, borderRadius:14,
                  background:"linear-gradient(135deg,#eff6ff,#dbeafe)", border:"1px solid #bfdbfe" }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#1d4ed8", marginBottom:8 }}>🏅 Tier Perks</div>
                  {TIERS.map(t=>(
                    <div key={t.label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                      <span style={{ fontSize:16 }}>{t.icon}</span>
                      <span style={{ fontSize:11, color:"var(--text)", fontWeight:600 }}>{t.label}</span>
                      <span style={{ fontSize:10, color:"var(--muted)", marginLeft:"auto" }}>
                        {t.min.toLocaleString()}+ pts
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pro tip */}
                <div style={{ padding:18, borderRadius:14,
                  background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1px solid #bbf7d0" }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#166534", marginBottom:6 }}>💡 Pro Tip</div>
                  <div style={{ fontSize:12, color:"#15803d", lineHeight:1.65 }}>
                    Maintain Driver Score ≥ 90 for <strong>5 consecutive trips</strong> to unlock
                    the <strong>Gold Streak</strong> — earn <strong>2× points</strong> for a full week!
                  </div>
                </div>
              </Stack>
            </Grid>

            {/* Reward cards */}
            <Grid item xs={12} md={8}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:16, color:"var(--text)" }}>
                  🎁 Available Rewards <span style={{ fontSize:12, fontWeight:400, color:"var(--muted)" }}>({REWARDS.length} offers)</span>
                </div>
                <div style={{ fontSize:12, color:"var(--muted)" }}>
                  Balance:{" "}
                  <span className="mono" style={{ fontWeight:700, color:"#f59e0b" }}>{points.toLocaleString()} pts</span>
                </div>
              </div>

              <Stack spacing={2}>
                {REWARDS.map((r,i)=>(
                  <div key={r.id} className="fade-up" style={{ animationDelay:`${i*45}ms` }}>
                    <CouponCard reward={r} points={points} onRedeem={handleRedeem}/>
                  </div>
                ))}
              </Stack>

              <div style={{ marginTop:20, padding:18, borderRadius:14,
                border:"1.5px dashed var(--border)", textAlign:"center", background:"#fafbff" }}>
                <div style={{ fontSize:13, color:"var(--muted)" }}>
                  🔒 Exclusive partner deals unlock at{" "}
                  <strong style={{ color:"#f59e0b" }}>Gold</strong> &{" "}
                  <strong style={{ color:"#8b5cf6" }}>Platinum</strong> tiers.
                  Keep driving safely to level up!
                </div>
              </div>
            </Grid>
          </Grid>
        )}
      </Container>

      {/* Toast */}
      <Snackbar open={!!toast} autoHideDuration={4500} onClose={()=>setToast(null)}
        anchorOrigin={{ vertical:"bottom", horizontal:"center" }}>
        <Alert severity={toast?.type||"info"} onClose={()=>setToast(null)}
          sx={{ fontFamily:"'Lexend',sans-serif", fontWeight:600, borderRadius:3, boxShadow:"0 8px 32px rgba(0,0,0,.15)" }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </div>
  );
}
