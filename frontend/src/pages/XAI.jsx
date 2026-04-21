/**
 * ExplainableAI.jsx — XAI Dashboard (Light Theme + Animations)
 * Route: /xai
 *
 * Design: Crisp light · Lexend + Fira Code typography
 * Soft blue/teal/amber palette · staggered reveals · animated bars
 * Glassmorphic cards · live scenario tester · iRAD insights
 */
import { useState, useEffect, useRef } from "react";
import {
  Box, Container, Typography, Grid, Chip, Stack,
  LinearProgress, Tabs, Tab, Tooltip,
} from "@mui/material";

/* ─── Global styles injected once ─────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap');

  :root {
    --bg:       #f4f7ff;
    --bg2:      #eef2ff;
    --surface:  #ffffff;
    --border:   #e2e8f8;
    --border-hi:#c7d2fe;
    --blue:     #3b5bdb;
    --blue-lt:  #dbeafe;
    --teal:     #0ea5e9;
    --teal-lt:  #e0f7ff;
    --amber:    #f59e0b;
    --amber-lt: #fef3c7;
    --red:      #ef4444;
    --red-lt:   #fee2e2;
    --green:    #10b981;
    --green-lt: #d1fae5;
    --purple:   #8b5cf6;
    --purple-lt:#ede9fe;
    --text:     #1e293b;
    --muted:    #64748b;
    --radius:   16px;
    --shadow:   0 4px 24px rgba(59,91,219,.08);
    --shadow-hi:0 8px 40px rgba(59,91,219,.16);
  }

  @keyframes fadeUp     { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
  @keyframes slideRight { from{width:0} to{width:var(--bar-w)} }
  @keyframes pulse-dot  { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:.6} }
  @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes shimmer    { from{background-position:-200% center} to{background-position:200% center} }
  @keyframes orbit      { from{transform:rotate(0deg) translateX(28px) rotate(0deg)} to{transform:rotate(360deg) translateX(28px) rotate(-360deg)} }
  @keyframes countUp    { from{opacity:0;transform:scale(.7)} to{opacity:1;transform:scale(1)} }
  @keyframes borderGlow { 0%,100%{box-shadow:0 0 0 0 rgba(59,91,219,.25)} 50%{box-shadow:0 0 0 6px rgba(59,91,219,0)} }
  @keyframes spin       { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

  .xai-root * { box-sizing:border-box; font-family:'Lexend',sans-serif; }
  .xai-root { background:var(--bg); min-height:calc(100vh - 58px); }

  .card {
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:var(--radius);
    box-shadow:var(--shadow);
    transition:box-shadow .25s, transform .25s, border-color .25s;
    overflow:hidden;
  }
  .card:hover { box-shadow:var(--shadow-hi); transform:translateY(-2px); border-color:var(--border-hi); }

  .card-header {
    padding:20px 22px 14px;
    border-bottom:1px solid var(--border);
    display:flex; align-items:center; justify-content:space-between;
  }
  .card-body { padding:20px 22px; }

  .fade-up { animation:fadeUp .55s cubic-bezier(.22,1,.36,1) both; }

  .bar-track {
    height:8px; border-radius:4px;
    background:#eef2ff; overflow:hidden;
    position:relative;
  }
  .bar-fill {
    height:100%; border-radius:4px;
    width:0;
    transition:width 1.2s cubic-bezier(.22,1,.36,1);
    position:relative;
  }
  .bar-fill::after {
    content:''; position:absolute; right:0; top:0;
    width:12px; height:100%;
    background:rgba(255,255,255,.5);
    border-radius:4px;
    animation:shimmer 2s linear infinite;
  }

  .factor-card {
    border-radius:14px;
    border:1px solid var(--border);
    padding:16px;
    transition:all .22s;
    background:var(--surface);
    cursor:default;
    position:relative;
    overflow:hidden;
  }
  .factor-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:3px;
    border-radius:14px 14px 0 0;
    opacity:0; transition:opacity .22s;
  }
  .factor-card:hover { box-shadow:0 6px 28px rgba(59,91,219,.1); transform:translateY(-2px); border-color:var(--border-hi); }
  .factor-card:hover::before { opacity:1; }

  .scenario-btn {
    border:1.5px solid var(--border);
    background:var(--surface);
    border-radius:30px;
    padding:8px 16px;
    cursor:pointer;
    font-family:'Lexend',sans-serif;
    font-size:12px;
    font-weight:500;
    color:var(--text);
    transition:all .18s;
    display:inline-flex; align-items:center; gap:6px;
  }
  .scenario-btn:hover { border-color:var(--blue); color:var(--blue); background:var(--blue-lt); transform:scale(1.03); }
  .scenario-btn.active { border-color:var(--blue); background:var(--blue); color:#fff; box-shadow:0 4px 16px rgba(59,91,219,.3); }

  .risk-badge {
    display:inline-flex; align-items:center; gap:5px;
    padding:3px 10px; border-radius:20px;
    font-size:11px; font-weight:600;
    font-family:'Fira Code',monospace;
  }
  .risk-badge .dot { width:6px; height:6px; border-radius:50%; animation:pulse-dot 1.8s ease-in-out infinite; }

  .insight-card {
    padding:16px;
    border-radius:12px;
    border:1px solid var(--border);
    background:var(--surface);
    transition:all .2s;
  }
  .insight-card:hover { border-color:var(--border-hi); box-shadow:0 4px 16px rgba(59,91,219,.08); }

  .pill-tag {
    display:inline-block; padding:2px 8px; border-radius:10px;
    font-size:10px; font-weight:600; font-family:'Fira Code',monospace;
    letter-spacing:.3px; margin-top:6px;
  }

  .mono { font-family:'Fira Code',monospace; }
  .label-sm { font-size:10px; font-weight:600; letter-spacing:.8px; text-transform:uppercase; color:var(--muted); }

  .header-pill {
    padding:4px 12px; border-radius:20px;
    font-size:11px; font-weight:600;
    background:var(--blue-lt); color:var(--blue);
    border:1px solid var(--border-hi);
    display:flex; align-items:center; gap:5px;
  }

  .live-result {
    padding:20px 24px;
    border-radius:14px;
    border:2px solid;
    margin-top:16px;
    animation:fadeUp .4s ease;
    position:relative; overflow:hidden;
  }
  .live-result::after {
    content:'';
    position:absolute; top:-30px; right:-30px;
    width:100px; height:100px; border-radius:50%;
    opacity:.07;
  }

  .xai-tabs .MuiTab-root { font-family:'Lexend',sans-serif; font-weight:600; text-transform:none; font-size:13px; }
  .xai-tabs .Mui-selected  { color:var(--blue) !important; }
  .xai-tabs .MuiTabs-indicator { background:var(--blue); height:2.5px; border-radius:2px; }
`;

/* ─── Data ─────────────────────────────────────────────────────────────────── */
const FEATURES = [
  { label:"Speed",           pct:15.9, color:"#ef4444", icon:"🚀" },
  { label:"Day of Week",     pct:14.6, color:"#f59e0b", icon:"📅" },
  { label:"Traffic Density", pct:13.0, color:"#3b5bdb", icon:"🚦" },
  { label:"Weather",         pct:10.2, color:"#0ea5e9", icon:"🌧️" },
  { label:"Road Surface",    pct:9.5,  color:"#8b5cf6", icon:"🛣️" },
  { label:"Road Type",       pct:8.7,  color:"#10b981", icon:"🏔️" },
  { label:"Time of Day",     pct:8.6,  color:"#f59e0b", icon:"🕐" },
  { label:"Vehicle Type",    pct:7.1,  color:"#3b5bdb", icon:"🚗" },
  { label:"Lighting",        pct:5.1,  color:"#0ea5e9", icon:"💡" },
  { label:"iRAD Hotspot",    pct:4.5,  color:"#ef4444", icon:"⚠️" },
  { label:"Area Type",       pct:2.8,  color:"#10b981", icon:"🏘️" },
];

const FACTORS = [
  { icon:"🚀", label:"Speed",          pct:"16%", color:"#ef4444", bgColor:"#fee2e2",
    desc:"Higher speed = more kinetic energy = worse crash outcomes. Risk rises steeply above 80km/h on mountain roads.",
    tag:"Physics: KE = ½v²", tagColor:"#ef4444" },
  { icon:"🌧️", label:"Weather",        pct:"10%", color:"#0ea5e9", bgColor:"#e0f7ff",
    desc:"Rain/snow/fog reduces visibility, road friction, and reaction time. Snow increases stopping distance 4×.",
    tag:"HP: 14% accidents in rain", tagColor:"#0ea5e9" },
  { icon:"🕐", label:"Time of Day",    pct:"9%",  color:"#f59e0b", bgColor:"#fef3c7",
    desc:"Night driving reduces visibility 80%. Fatigue peaks 2–4 AM. Most HP accidents occur 6–9 PM.",
    tag:"iRAD: Night = 3× risk", tagColor:"#f59e0b" },
  { icon:"🏔️", label:"Road Type",      pct:"3%",  color:"#10b981", bgColor:"#d1fae5",
    desc:"HP mountain roads have hairpin bends, blind curves, no guardrails, and sudden weather changes.",
    tag:"iRAD: Mountain = highest", tagColor:"#10b981" },
  { icon:"💡", label:"Lighting",       pct:"2%",  color:"#6366f1", bgColor:"#ede9fe",
    desc:"No street lighting on most HP mountain roads. Darkness combined with fog is extremely dangerous.",
    tag:"80% HP roads unlit", tagColor:"#6366f1" },
  { icon:"🛣️", label:"Road Surface",   pct:"2%",  color:"#8b5cf6", bgColor:"#ede9fe",
    desc:"Wet surface doubles stopping distance. Icy surface quadruples it. HP roads flood/erode in monsoon.",
    tag:"Monsoon > 25% worse", tagColor:"#8b5cf6" },
  { icon:"📡", label:"iRAD Hotspot",   pct:"4%",  color:"#ef4444", bgColor:"#fee2e2",
    desc:"Official MoRTH accident hotspot from iRAD 2024. Locations where multiple fatal accidents have occurred.",
    tag:"35 official HP spots", tagColor:"#ef4444" },
  { icon:"🚦", label:"Traffic Density",pct:"13%", color:"#3b5bdb", bgColor:"#dbeafe",
    desc:"More vehicles means more collision possibilities, merging conflicts, and chain-reaction crash risk.",
    tag:"Peak = 8–10 PM", tagColor:"#3b5bdb" },
  { icon:"🏘️", label:"Area Type",      pct:"3%",  color:"#10b981", bgColor:"#d1fae5",
    desc:"Rural HP areas have less emergency response coverage. Urban areas have more pedestrian conflict.",
    tag:"Rural = slower response", tagColor:"#10b981" },
  { icon:"📅", label:"Day of Week",    pct:"15%", color:"#f59e0b", bgColor:"#fef3c7",
    desc:"Weekends see more tourist traffic on HP roads, especially Saturdays. Holidays = 40% more accidents.",
    tag:"iRAD: Sat/Sun peaks", tagColor:"#f59e0b" },
  { icon:"👁️", label:"Visibility",     pct:"—",   color:"#6366f1", bgColor:"#ede9fe",
    desc:"Fog/rain reduces visibility to <100m on HP passes. Forces emergency braking. Main cause of pile-ups.",
    tag:"Rohtang: Fog zone", tagColor:"#6366f1" },
];

const SCENARIOS = [
  {
    id:"night_rain_mountain",
    label:"Night Rain Mountain", emojis:"🌙🌧️🏔️",
    risk:82, level:"HIGH",
    factors:["Speed 65 km/h","Mountain road","9 PM","Heavy rain","No lighting"],
    topFactor:"Weather × Night synergy compounds risk exponentially",
    color:"#ef4444", bg:"#fee2e2",
  },
  {
    id:"clear_day_highway",
    label:"Clear Day Highway", emojis:"☀️🛣️",
    risk:18, level:"LOW",
    factors:["Speed 60 km/h","NH highway","2 PM","Clear sky","Good lighting"],
    topFactor:"Optimal conditions — low speed, good visibility, safe road type",
    color:"#10b981", bg:"#d1fae5",
  },
  {
    id:"snow_critical",
    label:"Snow Critical Zone", emojis:"❄️⚠️",
    risk:91, level:"CRITICAL",
    factors:["Speed 45 km/h","Rohtang Pass","8 AM","Heavy snow","iRAD hotspot"],
    topFactor:"iRAD-designated hotspot + snow = 4× stopping distance",
    color:"#ef4444", bg:"#fee2e2",
  },
  {
    id:"safe_rural_morning",
    label:"Safe Rural Morning", emojis:"🌄🏘️",
    risk:24, level:"LOW",
    factors:["Speed 40 km/h","Rural road","9 AM","Partly cloudy","Daylight"],
    topFactor:"Low speed + daylight offset rural road disadvantage",
    color:"#10b981", bg:"#d1fae5",
  },
  {
    id:"fog_shimla_evening",
    label:"Fog Shimla Evening", emojis:"🌫️🌆",
    risk:67, level:"MEDIUM",
    factors:["Speed 35 km/h","Shimla bypass","6 PM","Dense fog","Streetlights"],
    topFactor:"Fog cuts visibility to <80m — main cause of pile-ups on SH",
    color:"#f59e0b", bg:"#fef3c7",
  },
];

const INSIGHTS = [
  { title:"Shimla district tops accidents", val:"319 accidents in 2024", color:"#ef4444" },
  { title:"Night is deadliest time",        val:"~40% HP accidents at night", color:"#f59e0b" },
  { title:"Dhalli worst single spot",       val:"21 accidents, 6 killed in 1.4×1.2 km", color:"#ef4444" },
  { title:"Baddi highest fatality rate",    val:"10 killed in 19 accidents", color:"#8b5cf6" },
  { title:"Monsoon +25% risk",             val:"July–September peak season", color:"#0ea5e9" },
  { title:"Speed >100 km/h on mountains",  val:"Major cause of fatal accidents", color:"#ef4444" },
];

/* ─── Animated progress bar ─────────────────────────────────────────────────── */
function AnimBar({ pct, color, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => {
      if (ref.current) ref.current.style.width = `${pct}%`;
    }, delay + 200);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="bar-track">
      <div ref={ref} className="bar-fill" style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
    </div>
  );
}

/* ─── Live Scenario Result ──────────────────────────────────────────────────── */
function ScenarioResult({ scenario }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    setDisplayed(0);
    let start = null;
    const target = scenario.risk;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 900, 1);
      setDisplayed(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [scenario]);

  return (
    <div className="live-result" style={{ borderColor: scenario.color, background: scenario.bg }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
        <div>
          <div className="label-sm" style={{ marginBottom:4 }}>ML Prediction Result</div>
          <Typography sx={{ fontFamily:"'Lexend',sans-serif", fontWeight:700, fontSize:20, color:"var(--text)" }}>
            {scenario.emojis} {scenario.label}
          </Typography>
        </div>
        <div style={{ textAlign:"center" }}>
          <div className="mono" style={{ fontSize:48, fontWeight:700, color:scenario.color, lineHeight:1, animation:"countUp .5s ease" }}>
            {displayed}
          </div>
          <div className="label-sm">Risk Score</div>
        </div>
      </div>
      <div style={{ marginTop:12 }}>
        <div className="bar-track" style={{ height:10 }}>
          <div className="bar-fill" style={{ width:`${scenario.risk}%`, background:`linear-gradient(90deg,${scenario.color}88,${scenario.color})`, transition:"width 1s ease" }} />
        </div>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
        {scenario.factors.map(f => (
          <span key={f} style={{ padding:"3px 10px", borderRadius:20, background:"rgba(255,255,255,.7)", fontSize:11, fontWeight:500, border:"1px solid rgba(0,0,0,.08)" }}>{f}</span>
        ))}
      </div>
      <div style={{ marginTop:10, padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.6)", borderLeft:`3px solid ${scenario.color}` }}>
        <Typography sx={{ fontSize:12, color:"var(--text)", fontStyle:"italic" }}>💡 {scenario.topFactor}</Typography>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function ExplainableAI() {
  const [barsVisible, setBarsVisible] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!document.getElementById("xai-styles")) {
      const s = document.createElement("style");
      s.id = "xai-styles"; s.innerHTML = GLOBAL_CSS;
      document.head.appendChild(s);
    }
    const t = setTimeout(() => setBarsVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="xai-root">
      {/* ── Header ── */}
      <div style={{
        background:"linear-gradient(135deg, #3b5bdb 0%, #0ea5e9 60%, #6366f1 100%)",
        padding:"28px 24px", position:"relative", overflow:"hidden",
      }}>
        {/* decorative rings */}
        {[80,130,180].map((size,i) => (
          <div key={i} style={{
            position:"absolute", top:-20, right:-20,
            width:size, height:size, borderRadius:"50%",
            border:`1px solid rgba(255,255,255,${.15 - i*.04})`,
            pointerEvents:"none",
          }} />
        ))}
        <Container maxWidth="lg" style={{ position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
            <div style={{
              width:40, height:40, borderRadius:12,
              background:"rgba(255,255,255,.2)", backdropFilter:"blur(8px)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
              animation:"float 3s ease-in-out infinite",
            }}>🔍</div>
            <div>
              <Typography sx={{ fontFamily:"'Lexend',sans-serif", fontWeight:800, fontSize:{xs:22,md:28}, color:"#fff", letterSpacing:"-.5px" }}>
                Explainable AI <span style={{ opacity:.7, fontSize:18 }}>(XAI)</span>
              </Typography>
              <Typography sx={{ color:"rgba(255,255,255,.75)", fontSize:13, fontFamily:"'Lexend',sans-serif" }}>
                Why every prediction is transparent — no black box. Feature importances from your actual .pkl model.
              </Typography>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
            {["Random Forest Model","11 Features","iRAD 2024 Data","HP Mountain Roads"].map(t => (
              <span key={t} style={{ padding:"4px 12px", borderRadius:20, background:"rgba(255,255,255,.18)", backdropFilter:"blur(8px)", fontSize:11, fontWeight:600, color:"#fff", border:"1px solid rgba(255,255,255,.25)", fontFamily:"'Lexend',sans-serif" }}>
                {t}
              </span>
            ))}
          </div>
        </Container>
      </div>

      <Container maxWidth="lg" style={{ padding:"24px 16px" }}>
        <Grid container spacing={3}>

          {/* ── Feature Importances ── */}
          <Grid item xs={12} md={4}>
            <div className="card fade-up" style={{ animationDelay:"0ms" }}>
              <div className="card-header">
                <div>
                  <Typography sx={{ fontFamily:"'Lexend',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)" }}>
                    🌲 Feature Importances
                  </Typography>
                  <Typography sx={{ fontSize:11, color:"var(--muted)", mt:.3, fontFamily:"'Lexend',sans-serif" }}>
                    Real values from your trained Random Forest
                  </Typography>
                </div>
                <span className="header-pill">From your .pkl 🌲</span>
              </div>
              <div className="card-body">
                <Stack spacing={1.8}>
                  {FEATURES.map((f, i) => (
                    <div key={f.label} className="fade-up" style={{ animationDelay:`${i * 50 + 100}ms` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                        <span style={{ fontSize:13, fontWeight:500, color:"var(--text)", fontFamily:"'Lexend',sans-serif", display:"flex", alignItems:"center", gap:6 }}>
                          <span>{f.icon}</span>{f.label}
                        </span>
                        <span className="mono" style={{ fontSize:12, fontWeight:600, color:f.color }}>{f.pct}%</span>
                      </div>
                      <AnimBar pct={(f.pct / 16) * 100} color={f.color} delay={i * 60} />
                    </div>
                  ))}
                </Stack>
              </div>
            </div>
          </Grid>

          {/* ── Right column ── */}
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>

              {/* What each factor means */}
              <div className="card fade-up" style={{ animationDelay:"80ms" }}>
                <div className="card-header">
                  <Typography sx={{ fontFamily:"'Lexend',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)" }}>
                    📖 What Each Factor Means for HP Roads
                  </Typography>
                </div>
                <div className="card-body">
                  <Grid container spacing={1.5}>
                    {FACTORS.map((f, i) => (
                      <Grid item xs={12} sm={6} key={f.label}>
                        <div
                          className="factor-card fade-up"
                          style={{ animationDelay:`${i * 60 + 150}ms` }}
                        >
                          {/* top accent */}
                          <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${f.color},${f.color}44)`, borderRadius:"14px 14px 0 0" }} />
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:6 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                              <span style={{
                                width:32, height:32, borderRadius:9, background:f.bgColor,
                                display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0,
                              }}>{f.icon}</span>
                              <Typography sx={{ fontFamily:"'Lexend',sans-serif", fontWeight:700, fontSize:13, color:"var(--text)" }}>
                                {f.label}
                              </Typography>
                            </div>
                            <span className="mono" style={{ fontSize:12, fontWeight:700, color:f.color, background:f.bgColor, padding:"2px 8px", borderRadius:20 }}>
                              {f.pct}
                            </span>
                          </div>
                          <Typography sx={{ fontSize:11.5, color:"var(--muted)", lineHeight:1.55, fontFamily:"'Lexend',sans-serif" }}>
                            {f.desc}
                          </Typography>
                          <span className="pill-tag" style={{ background:f.bgColor, color:f.color }}>
                            {f.tag}
                          </span>
                        </div>
                      </Grid>
                    ))}
                  </Grid>
                </div>
              </div>

              {/* Live Scenario Tester */}
              <div className="card fade-up" style={{ animationDelay:"160ms" }}>
                <div className="card-header">
                  <div>
                    <Typography sx={{ fontFamily:"'Lexend',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)" }}>
                      ⚡ Live Scenario Tester
                    </Typography>
                    <Typography sx={{ fontSize:11, color:"var(--muted)", mt:.3, fontFamily:"'Lexend',sans-serif" }}>
                      Runs real ML prediction on preset HP road conditions
                    </Typography>
                  </div>
                  {activeScenario && (
                    <span style={{
                      padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700,
                      background: activeScenario.bg, color: activeScenario.color,
                      border:`1px solid ${activeScenario.color}44`,
                      fontFamily:"'Fira Code',monospace",
                      display:"flex", alignItems:"center", gap:6,
                    }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:activeScenario.color, animation:"pulse-dot 1.5s infinite" }} />
                      {activeScenario.level}
                    </span>
                  )}
                </div>
                <div className="card-body">
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {SCENARIOS.map(sc => (
                      <button
                        key={sc.id}
                        className={`scenario-btn ${activeScenario?.id === sc.id ? "active" : ""}`}
                        onClick={() => setActiveScenario(sc)}
                      >
                        {sc.emojis} {sc.label}
                      </button>
                    ))}
                  </div>
                  {activeScenario ? (
                    <ScenarioResult key={activeScenario.id} scenario={activeScenario} />
                  ) : (
                    <div style={{ textAlign:"center", padding:"32px 0", color:"var(--muted)", fontFamily:"'Lexend',sans-serif", fontSize:13 }}>
                      <div style={{ fontSize:36, marginBottom:8 }}>🧪</div>
                      Select a scenario above to run the ML prediction
                    </div>
                  )}
                </div>
              </div>

              {/* iRAD Insights */}
              <div className="card fade-up" style={{ animationDelay:"220ms" }}>
                <div className="card-header">
                  <Typography sx={{ fontFamily:"'Lexend',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)" }}>
                    💛 HP Road Safety Insights (iRAD 2024)
                  </Typography>
                  <span className="header-pill" style={{ background:"#fef3c7", color:"#b45309", borderColor:"#fde68a" }}>
                    Official Data
                  </span>
                </div>
                <div className="card-body">
                  <Grid container spacing={1.5}>
                    {INSIGHTS.map((ins, i) => (
                      <Grid item xs={12} sm={6} key={ins.title}>
                        <div className={`insight-card fade-up`} style={{ animationDelay:`${i * 60 + 200}ms` }}>
                          <div style={{ height:2, background:`linear-gradient(90deg,${ins.color},${ins.color}33)`, borderRadius:1, marginBottom:10 }} />
                          <Typography sx={{ fontFamily:"'Lexend',sans-serif", fontWeight:600, fontSize:12.5, color:"var(--text)", mb:.4 }}>
                            {ins.title}
                          </Typography>
                          <Typography sx={{ fontFamily:"'Fira Code',monospace", fontSize:11.5, fontWeight:600, color:ins.color }}>
                            {ins.val}
                          </Typography>
                        </div>
                      </Grid>
                    ))}
                  </Grid>
                </div>
              </div>

            </Stack>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
}
