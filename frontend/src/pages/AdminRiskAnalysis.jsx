/**
 * AdminRiskAnalysis.jsx — IntelliCrash v5
 * ─────────────────────────────────────────────────────────────────
 * Admin-only Risk Analysis Dashboard
 * Route: /admin/risk-analysis
 *
 * ✅ Moved from PredictRisk.jsx (was wrongly user-facing)
 * ✅ Scenario simulation panel (Rainy Night vs Clear Day etc.)
 * ✅ Location picker (coordinate input + GPS)
 * ✅ ML details in collapsible "Advanced Debug" section
 * ✅ Historical hotspot context (iRAD 2025-26)
 * ✅ Risk explanation (WHY is risk high)
 * ✅ Grid-based dashboard layout
 * ✅ No user-facing marketing UI
 * ✅ "Run Simulation" replaces "Predict Risk"
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Chip, LinearProgress, CircularProgress,
  Tooltip, Divider, Collapse,
} from "@mui/material";
import { predictRisk, getWeather } from "../services/api";

// ── Design tokens (light dashboard aesthetic) ──────────────────────
const T = {
  bg:       "#f7fafc",
  panel:    "#fff",
  card:     "#f3f6fa",
  cardAlt:  "#e9eef5",
  border:   "rgba(0,0,0,0.08)",
  borderHi: "rgba(0,0,0,0.16)",
  text:     "#1a202c",
  textSub:  "rgba(26,32,44,0.55)",
  textMut:  "rgba(26,32,44,0.28)",
  orange:   "#f97316",
  red:      "#ef4444",
  green:    "#22c55e",
  blue:     "#2563eb",
  cyan:     "#06b6d4",
  purple:   "#8b5cf6",
  amber:    "#f59e0b",
  mono:     "'JetBrains Mono','Fira Code',monospace",
  sans:     "'DM Sans','Manrope',sans-serif",
  display:  "'Syne',sans-serif",
};

// ── Risk colour helpers ───────────────────────────────────────────
const RC  = (s) => s >= 67 ? T.red   : s >= 34 ? T.amber : T.green;
const RL  = (s) => s >= 67 ? "HIGH"  : s >= 34 ? "MEDIUM": "SAFE";
const RBg = (s) => s >= 67 ? "rgba(239,68,68,0.07)" : s >= 34 ? "rgba(245,158,11,0.07)" : "rgba(34,197,94,0.07)";

// ── HP iRAD 2025-26 hotspot reference data ────────────────────────
const HP_ZONES = [
  { name:"Dhalli–Kufri Stretch",      district:"Shimla",   risk:94, accidents:28, killed:8,  lat:31.10297, lon:77.20796 },
  { name:"Baddi Industrial Belt",     district:"Solan",    risk:91, accidents:21, killed:11, lat:30.923,   lon:76.798   },
  { name:"Balh Valley NH-21",         district:"Mandi",    risk:88, accidents:17, killed:6,  lat:31.628,   lon:76.939   },
  { name:"Sadar Solan NH-5",          district:"Solan",    risk:85, accidents:23, killed:7,  lat:30.898,   lon:77.093   },
  { name:"Poanta Sahib NH-7",         district:"Sirmaur",  risk:81, accidents:15, killed:4,  lat:30.449,   lon:77.566   },
  { name:"Nalagarh Bypass",           district:"Solan",    risk:78, accidents:14, killed:5,  lat:31.039,   lon:76.708   },
  { name:"Kullu–Bhuntar NH-3",        district:"Kullu",    risk:76, accidents:19, killed:8,  lat:31.957,   lon:77.109   },
  { name:"Barotiwala–Baddi",          district:"Solan",    risk:73, accidents:18, killed:5,  lat:30.911,   lon:76.837   },
  { name:"Nagrota Bagwan NH-503",     district:"Kangra",   risk:70, accidents:16, killed:3,  lat:32.114,   lon:76.388   },
  { name:"Rohtang Pass Approach",     district:"Kullu",    risk:68, accidents:15, killed:7,  lat:32.239,   lon:77.188   },
];

// ── Preset simulation scenarios ───────────────────────────────────
const SCENARIOS = [
  {
    id:"rainy_night",
    label:"🌧️ Rainy Night",
    desc:"Heavy rain, dark, mountain road at night",
    form:{ weather:"1", roadType:"1", timeOfDay:"3", areaType:"0", roadCondition:"1", vehicleType:"0", lightCondition:"1", criticalZone:"0", dayOfWeek:"5", speed:50, vehicles:3, visibility:200 },
    badge:"HIGH RISK",
    color: T.red,
  },
  {
    id:"clear_day",
    label:"☀️ Clear Day",
    desc:"Sunny morning, dry highway, light traffic",
    form:{ weather:"0", roadType:"2", timeOfDay:"1", areaType:"1", roadCondition:"0", vehicleType:"0", lightCondition:"0", criticalZone:"0", dayOfWeek:"0", speed:60, vehicles:5, visibility:1000 },
    badge:"LOW RISK",
    color: T.green,
  },
  {
    id:"snow_mountain",
    label:"❄️ Snow Mountain",
    desc:"Snowfall on mountain road, icy surface, night",
    form:{ weather:"3", roadType:"1", timeOfDay:"3", areaType:"0", roadCondition:"2", vehicleType:"0", lightCondition:"1", criticalZone:"1", dayOfWeek:"6", speed:30, vehicles:1, visibility:100 },
    badge:"EXTREME",
    color: T.red,
  },
  {
    id:"fog_hotspot",
    label:"🌫️ Fog at Hotspot",
    desc:"Dense fog, critical accident zone, evening",
    form:{ weather:"2", roadType:"1", timeOfDay:"2", areaType:"0", roadCondition:"1", vehicleType:"0", lightCondition:"1", criticalZone:"1", dayOfWeek:"4", speed:40, vehicles:4, visibility:80 },
    badge:"HIGH RISK",
    color: T.amber,
  },
  {
    id:"peak_traffic",
    label:"🚦 Peak Traffic",
    desc:"Evening rush hour, urban highway, wet road",
    form:{ weather:"1", roadType:"2", timeOfDay:"2", areaType:"1", roadCondition:"1", vehicleType:"0", lightCondition:"0", criticalZone:"0", dayOfWeek:"4", speed:35, vehicles:15, visibility:500 },
    badge:"MEDIUM",
    color: T.amber,
  },
  {
    id:"truck_night",
    label:"🚛 Truck Night Run",
    desc:"Heavy truck, mountain road, no lights at 2AM",
    form:{ weather:"0", roadType:"1", timeOfDay:"3", areaType:"0", roadCondition:"0", vehicleType:"1", lightCondition:"1", criticalZone:"0", dayOfWeek:"1", speed:55, vehicles:2, visibility:300 },
    badge:"HIGH RISK",
    color: T.red,
  },
];

// ── Dropdown option sets ──────────────────────────────────────────
const OPTS = {
  weather:       [["0","☀️ Clear"],["1","🌧️ Rain"],["2","🌫️ Fog"],["3","❄️ Snow"],["4","⛈️ Storm"]],
  roadType:      [["0","🛤️ Plain Road"],["1","⛰️ Mountain"],["2","🏙️ Highway"]],
  timeOfDay:     [["0","🌅 Morning 5–9"],["1","☀️ Day 9–17"],["2","🌆 Evening 17–20"],["3","🌙 Night 20–5"]],
  areaType:      [["0","🏘️ Rural"],["1","🏙️ Urban"]],
  dayOfWeek:     [["0","Mon"],["1","Tue"],["2","Wed"],["3","Thu"],["4","Fri"],["5","Sat"],["6","Sun"]],
  roadCondition: [["0","✅ Dry"],["1","🌧️ Wet"],["2","🧊 Icy"],["3","🚧 Repair"]],
  vehicleType:   [["0","🚗 Car"],["1","🚛 Truck"],["2","🏍️ Bike"],["3","🚌 Bus"]],
  lightCondition:[["0","☀️ Daylight"],["1","🌙 Dark"],["2","💡 Street Lit"]],
  criticalZone:  [["0","No"],["1","⚠️ Yes — iRAD Hotspot"]],
};

// ── Client-side RF scorer (fallback when API unavailable) ─────────
function computeRF(f) {
  const W = {
    weather:[0,6,9,11,16],roadType:[2,13,5],timeOfDay:[3,1,7,13],
    areaType:[4,2],dayOfWeek:[2,2,2,2,5,8,4],roadCondition:[0,8,15,7],
    vehicleType:[3,6,9,5],lightCondition:[0,14,5],criticalZone:[0,20],
  };
  let s = Object.entries(W).reduce((a,[k,arr])=>a+(arr[+f[k]]||0),0);
  const spd=+f.speed;
  s += spd<=30?0:spd<=60?(spd-30)*0.28:spd<=90?8.4+(spd-60)*0.58:25.8+(spd-90)*1.2;
  s += +f.vehicles>5?(+f.vehicles-5)*1.1:+f.vehicles*0.35;
  const vis=+f.visibility;
  s += vis>=500?0:vis>=200?(500-vis)*0.018:5.4+(200-vis)*0.038;
  // Synergy risk multipliers
  if(+f.weather>=3&&+f.roadCondition>=2) s+=9;
  if(+f.timeOfDay===3&&+f.lightCondition===1) s+=7;
  if(+f.speed>80&&+f.roadType===1) s+=11;
  if(+f.weather>=2&&+f.speed>60) s+=5;
  if(+f.criticalZone===1&&+f.timeOfDay>=2) s+=8;
  if(+f.vehicleType===2&&+f.speed>70) s+=6;
  return Math.min(Math.max(s,2),94);
}

function computeLSTM(f, rf) {
  let d=0;
  if(+f.speed>70)       d+=(+f.speed-70)*0.14;
  if(+f.vehicles>8)     d+=(+f.vehicles-8)*0.45;
  if(+f.visibility<200) d+=(200-+f.visibility)*0.028;
  if(+f.timeOfDay===3)  d+=4;
  if(+f.weather>=3)     d+=5;
  return Math.min(Math.max(rf*0.82+d+(Math.random()*4-2),2),94);
}

function buildXAI(f, score) {
  const parts=[];
  if(+f.weather>=3)         parts.push(+f.weather===4?"severe storm":"snow/ice weather");
  if(+f.speed>80)           parts.push(`high speed ${f.speed} km/h`);
  if(+f.roadCondition===2)  parts.push("icy road surface");
  if(+f.roadCondition===3)  parts.push("road under repair");
  if(+f.timeOfDay===3)      parts.push("night driving");
  if(+f.lightCondition===1) parts.push("no street lighting");
  if(+f.roadType===1)       parts.push("mountain road gradient");
  if(+f.criticalZone===1)   parts.push("iRAD 2025-26 accident hotspot");
  if(+f.vehicleType===2)    parts.push("two-wheeler high exposure");
  if(+f.vehicles>10)        parts.push(`${f.vehicles} nearby vehicles (congestion)`);
  if(+f.visibility<200)     parts.push(`low visibility ${f.visibility}m`);
  const advice = score>=67
    ? "Reduce speed immediately — extreme caution required"
    : score>=34
    ? "Stay alert and maintain safe following distance"
    : "Conditions appear safe to proceed";
  if(!parts.length) return `Low risk under current conditions (${score.toFixed(1)}/100). ${advice}.`;
  return `Elevated risk due to: ${parts.slice(0,5).join(", ")}. Score ${score.toFixed(1)}/100 — ${RL(score)}. ${advice}.`;
}

function buildFactors(f) {
  return {
    "Speed":       Math.min(+f.speed/120*100,100).toFixed(0),
    "Weather":     [0,40,55,65,90][+f.weather]??0,
    "Road Cond.":  [0,50,90,60][+f.roadCondition]??0,
    "Visibility":  Math.max(0,100-(+f.visibility/1000*100)).toFixed(0),
    "Traffic":     Math.min(+f.vehicles/20*100,100).toFixed(0),
    "Lighting":    [0,80,30][+f.lightCondition]??0,
  };
}

const DEFAULT_FORM = {
  weather:"0", roadType:"1", timeOfDay:"1", areaType:"0",
  dayOfWeek:"0", roadCondition:"0", vehicleType:"0",
  lightCondition:"0", criticalZone:"0",
  speed:50, vehicles:2, visibility:500,
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function AdminRiskAnalysis() {
  const nav = useNavigate();
  const [form,           setForm]           = useState(DEFAULT_FORM);
  const [result,         setResult]         = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [selectedZone,   setSelectedZone]   = useState(null);
  const [activeScenario, setActiveScenario] = useState(null);
  const [showDebug,      setShowDebug]      = useState(false);
  const [coordInput,     setCoordInput]     = useState({ lat:"31.1048", lon:"77.1734" });
  const [wxLoading,      setWxLoading]      = useState(false);
  const [liveGPS,        setLiveGPS]        = useState(false);
  const [liveSpeed,      setLiveSpeed]      = useState(null);
  const [simLog,         setSimLog]         = useState([]);
  const gpsRef = useRef(null);

  // Auto-fill time of day and day of week on mount
  useEffect(() => {
    const h = new Date().getHours();
    const tod = h>=20||h<5?"3":h>=17?"2":h>=9?"1":"0";
    const dow = String(new Date().getDay()===0?6:new Date().getDay()-1);
    setForm(f => ({ ...f, timeOfDay:tod, dayOfWeek:dow }));
    return () => { if (gpsRef.current) clearInterval(gpsRef.current); };
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  // Fetch live weather for entered coordinates
  const fetchWeather = async () => {
    const lat=parseFloat(coordInput.lat), lon=parseFloat(coordInput.lon);
    if(isNaN(lat)||isNaN(lon)) return;
    setWxLoading(true);
    try {
      const wx = await getWeather(lat, lon);
      if (wx) {
        const w = wx.snow?"3":wx.fog?"2":wx.rain?"1":"0";
        setForm(f => ({ ...f, weather:w }));
      }
    } catch {}
    setWxLoading(false);
  };

  // Toggle live GPS speed feed
  const toggleGPS = () => {
    if (liveGPS) {
      clearInterval(gpsRef.current);
      setLiveGPS(false); setLiveSpeed(null);
    } else {
      setLiveGPS(true);
      const run = () => navigator.geolocation?.getCurrentPosition(p => {
        const spd = p.coords.speed != null ? Math.round(p.coords.speed * 3.6) : null;
        if (spd != null) { setLiveSpeed(spd); setForm(f => ({ ...f, speed:spd })); }
        setCoordInput({ lat:p.coords.latitude.toFixed(5), lon:p.coords.longitude.toFixed(5) });
      }, () => {}, { enableHighAccuracy:true });
      run(); gpsRef.current = setInterval(run, 6000);
    }
  };

  // Apply a preset scenario to the form
  const applyScenario = (sc) => {
    setActiveScenario(sc.id);
    setForm({ ...sc.form });
    setResult(null);
  };

  // Run the simulation against the API (with client fallback and robust error handling)
  const runSim = useCallback(async () => {
    setLoading(true);
    setResult(null);
    let r = null;
    let error = null;
    const payload = { ...form };
    // Try real backend API first
    try {
      r = await predictRisk(payload);
      // Defensive: check for valid response
      if (!r || typeof r !== "object" || r.score == null) throw new Error("Invalid API response");
    } catch (e) {
      error = e;
      r = null;
    }

    // Client-side fallback if API unavailable or error
    if (!r) {
      const rf    = computeRF(payload);
      const lstm  = computeLSTM(payload, rf);
      const boost = selectedZone !== null ? HP_ZONES[selectedZone].risk * 0.07 : 0;
      const score = Math.min(rf * 0.7 + lstm * 0.3 + boost, 100);
      r = {
        score, rf_score:rf, lstm_score:lstm, boost,
        model_used:"RF+LSTM Ensemble (client fallback)",
        xai_explanation: buildXAI(payload, score),
        xai_factors:     buildFactors(payload),
        error: error ? (error.message || "API unavailable") : null,
      };
    }

    setResult(r);

    // Add entry to simulation history log
    const scenLabel = activeScenario
      ? SCENARIOS.find(s => s.id === activeScenario)?.label || activeScenario
      : "Manual";
    setSimLog(p => [{
      ts:new Date().toLocaleTimeString(),
      scenario:scenLabel,
      score:r.score?.toFixed(1),
      level:RL(r.score),
      color:RC(r.score),
    }, ...p].slice(0, 12));

    setLoading(false);
  }, [form, selectedZone, activeScenario]);

  // ── Sub-component: Admin-style Select ────────────────────────────
  const ASelect = ({ label, field, opts }) => (
    <Box>
      <Typography sx={{ fontSize:10, fontWeight:700, color:T.textMut, letterSpacing:".08em", mb:.5, textTransform:"uppercase" }}>
        {label}
      </Typography>
      <select
        value={form[field]}
        onChange={e => set(field, e.target.value)}
        style={{
          width:"100%", background:T.card, border:`1px solid ${T.border}`, borderRadius:6,
          padding:"7px 10px", fontSize:12, color:T.text, fontFamily:T.sans, outline:"none", cursor:"pointer",
        }}
      >
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Box>
  );

  // ── Sub-component: Admin-style Slider ────────────────────────────
  const ASlider = ({ field, label, min, max, unit, color }) => {
    const val = form[field];
    const pct = Math.min(((val - min) / (max - min)) * 100, 100);
    const clr = color || (field === "speed" ? (val > 80 ? T.red : val > 50 ? T.amber : T.green) : T.blue);
    return (
      <Box>
        <Box sx={{ display:"flex", justifyContent:"space-between", mb:.5 }}>
          <Typography sx={{ fontSize:10, fontWeight:700, color:T.textMut, letterSpacing:".08em", textTransform:"uppercase" }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize:11, fontWeight:700, color:clr, fontFamily:T.mono }}>{val}{unit}</Typography>
        </Box>
        <Box sx={{ position:"relative", height:4, background:"rgba(255,255,255,0.07)", borderRadius:2, mb:.3 }}>
          <Box sx={{ position:"absolute", left:0, top:0, height:"100%", width:`${pct}%`, background:clr, borderRadius:2, transition:"width .2s" }}/>
        </Box>
        <input
          type="range" min={min} max={max} value={val}
          onChange={e => set(field, +e.target.value)}
          style={{ width:"100%", margin:0, accentColor:clr, cursor:"pointer" }}
        />
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight:"calc(100vh - 58px)", background:T.bg, fontFamily:T.sans, color:T.text }}>

      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:transparent;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;cursor:pointer;margin-top:-5px;background:#fff;border:1.5px solid #cbd5e1;}
        select option{background:#f3f6fa;color:#1a202c;}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanLine{0%{top:0}100%{top:100%}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.08);border-radius:4px}
      `}</style>

      {/* ══ HEADER ══ */}
      <Box sx={{
        background:`linear-gradient(135deg, #0d1117 0%, #111827 100%)`,
        borderBottom:`1px solid ${T.border}`,
        px:3, py:1.8,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:200,
        boxShadow:"0 2px 32px rgba(0,0,0,0.5)",
      }}>
        <Box sx={{ display:"flex", alignItems:"center", gap:2 }}>
          <Box sx={{
            width:36, height:36, borderRadius:8,
            background:`linear-gradient(135deg,${T.orange},${T.red})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, boxShadow:`0 4px 14px ${T.orange}44`,
          }}>⚡</Box>
          <Box>
            <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
              <Typography sx={{ fontFamily:T.display, fontWeight:800, fontSize:16, color:T.text, letterSpacing:"-.3px" }}>
                Risk Analysis Panel
              </Typography>
              <Chip label="ADMIN ONLY" size="small" sx={{
                fontSize:9, height:16, fontWeight:800, letterSpacing:".06em",
                background:"rgba(239,68,68,0.12)", color:T.red,
                border:`1px solid rgba(239,68,68,0.3)`,
              }}/>
            </Box>
            <Typography sx={{ fontSize:10, color:T.textMut, fontFamily:T.mono }}>
              IntelliCrash · RF+LSTM Ensemble · iRAD 2025-26
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display:"flex", gap:1, alignItems:"center" }}>
          {liveGPS && liveSpeed !== null && (
            <Chip label={`🛰 ${liveSpeed} km/h`} size="small" sx={{
              fontSize:11, fontWeight:700, fontFamily:T.mono,
              background:"rgba(34,197,94,0.12)", color:T.green,
              border:`1px solid rgba(34,197,94,0.25)`,
              animation:"blink 1.5s infinite",
            }}/>
          )}
          <button onClick={toggleGPS} style={{
            padding:"6px 14px", borderRadius:20, fontSize:11, fontWeight:700,
            cursor:"pointer", fontFamily:T.sans, transition:"all .2s",
            background:liveGPS?"rgba(239,68,68,0.12)":"rgba(34,197,94,0.1)",
            border:`1px solid ${liveGPS?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`,
            color:liveGPS?T.red:T.green,
          }}>{liveGPS?"◼ Stop GPS":"📡 Live GPS"}</button>
          <button onClick={() => nav("/admin")} style={{
            padding:"6px 14px", borderRadius:20, fontSize:11, fontWeight:700,
            cursor:"pointer", fontFamily:T.sans,
            background:"rgba(255,255,255,0.05)", border:`1px solid ${T.border}`, color:T.textSub,
          }}>← Admin Panel</button>
        </Box>
      </Box>

      {/* ══ BODY — 3-COLUMN GRID ══ */}
      <Box sx={{
        display:"grid",
        gridTemplateColumns:{ xs:"1fr", md:"280px 1fr 320px" },
        height:"calc(100vh - 106px)",
        overflow:"hidden",
      }}>

        {/* ══════ COL 1: Hotspot Zones + Scenario Selector ══════ */}
        <Box sx={{
          borderRight:`1px solid ${T.border}`,
          overflowY:"auto", background:T.panel,
          display:"flex", flexDirection:"column",
        }}>

          {/* Preset Scenarios */}
          <Box sx={{ p:1.5, borderBottom:`1px solid ${T.border}` }}>
            <Typography sx={{ fontSize:10, fontWeight:700, color:T.textMut, letterSpacing:".1em", mb:1 }}>
              SCENARIO SIMULATION
            </Typography>
            {SCENARIOS.map(sc => (
              <Box key={sc.id} onClick={() => applyScenario(sc)}
                sx={{
                  mb:.8, p:1.2, borderRadius:8, cursor:"pointer", transition:"all .18s",
                  background:activeScenario===sc.id?`${sc.color}10`:"rgba(255,255,255,0.02)",
                  border:`1px solid ${activeScenario===sc.id?sc.color+"44":T.border}`,
                  "&:hover":{ background:`${sc.color}08`, borderColor:`${sc.color}33` },
                }}>
                <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:.3 }}>
                  <Typography sx={{ fontSize:12, fontWeight:700, color:T.text }}>{sc.label}</Typography>
                  <Chip label={sc.badge} size="small" sx={{
                    fontSize:8, height:14, fontWeight:800,
                    background:`${sc.color}18`, color:sc.color,
                    border:`1px solid ${sc.color}33`,
                  }}/>
                </Box>
                <Typography sx={{ fontSize:10, color:T.textSub, lineHeight:1.4 }}>{sc.desc}</Typography>
              </Box>
            ))}
          </Box>

          {/* HP iRAD Hotspot Reference List */}
          <Box sx={{ p:1.5, flex:1 }}>
            <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb:1 }}>
              <Typography sx={{ fontSize:10, fontWeight:700, color:T.textMut, letterSpacing:".1em" }}>
                HP HOTSPOTS
              </Typography>
              <Chip label="iRAD 2025-26" size="small" sx={{
                fontSize:8, height:14, fontWeight:700,
                background:"rgba(59,130,246,0.12)", color:T.blue,
                border:`1px solid rgba(59,130,246,0.2)`,
              }}/>
            </Box>
            {HP_ZONES.map((z, i) => (
              <Tooltip key={z.name} title={`${z.accidents} accidents · ${z.killed} killed · Click to use coordinates`} placement="right">
                <Box
                  onClick={() => {
                    setSelectedZone(i);
                    set("criticalZone", "1");
                    setCoordInput({ lat:z.lat.toFixed(5), lon:z.lon.toFixed(5) });
                  }}
                  sx={{
                    mb:.6, p:1, borderRadius:6, cursor:"pointer", transition:"all .15s",
                    background:selectedZone===i?RBg(z.risk):"rgba(255,255,255,0.02)",
                    border:`1px solid ${selectedZone===i?RC(z.risk)+"44":T.border}`,
                    "&:hover":{ background:RBg(z.risk), borderColor:RC(z.risk)+"33" },
                  }}>
                  <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", mb:.4 }}>
                    <Typography sx={{ fontSize:11, fontWeight:600, color:T.text, lineHeight:1.3, flex:1 }}>{z.name}</Typography>
                    <Typography sx={{ fontSize:10, fontFamily:T.mono, fontWeight:700, color:RC(z.risk), flexShrink:0, ml:.5 }}>{z.risk}</Typography>
                  </Box>
                  <Typography sx={{ fontSize:9, color:T.textMut, mb:.4 }}>{z.district} · {z.accidents} acc · 💀{z.killed}</Typography>
                  <Box sx={{ height:2, background:"rgba(255,255,255,0.06)", borderRadius:1 }}>
                    <Box sx={{ height:"100%", width:`${z.risk}%`, background:RC(z.risk), borderRadius:1, transition:"width .6s ease" }}/>
                  </Box>
                </Box>
              </Tooltip>
            ))}
            {selectedZone !== null && (
              <button onClick={() => { setSelectedZone(null); set("criticalZone","0"); }}
                style={{
                  marginTop:6, width:"100%", padding:"5px", borderRadius:6, fontSize:10,
                  cursor:"pointer", background:"rgba(255,255,255,0.04)",
                  border:`1px solid ${T.border}`, color:T.textSub, fontFamily:T.sans,
                }}>
                ✕ Clear Zone Selection
              </button>
            )}
          </Box>

          {/* Simulation Run History */}
          {simLog.length > 0 && (
            <Box sx={{ p:1.5, borderTop:`1px solid ${T.border}` }}>
              <Typography sx={{ fontSize:10, fontWeight:700, color:T.textMut, letterSpacing:".1em", mb:.8 }}>
                SIM LOG
              </Typography>
              {simLog.map((s, i) => (
                <Box key={i} sx={{ display:"flex", gap:1, alignItems:"center", mb:.4, opacity:Math.max(1-i*0.07, 0.3) }}>
                  <Typography sx={{ fontSize:9, fontFamily:T.mono, color:T.textMut, flexShrink:0 }}>{s.ts}</Typography>
                  <Typography sx={{ fontSize:9, color:T.textSub, flex:1 }} noWrap>{s.scenario}</Typography>
                  <Typography sx={{ fontSize:10, fontWeight:700, color:s.color, fontFamily:T.mono }}>{s.score}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* ══════ COL 2: Input Form ══════ */}
        <Box sx={{ overflowY:"auto", p:2, background:T.bg }}>

          {/* Location / Coordinate Input */}
          <Box sx={{ mb:2, p:1.5, background:T.card, borderRadius:10, border:`1px solid ${T.border}` }}>
            <Typography sx={{ fontSize:10, fontWeight:700, color:T.textMut, letterSpacing:".1em", mb:1 }}>
              📍 LOCATION INPUT
            </Typography>
            <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, mb:1 }}>
              {["lat","lon"].map(k => (
                <Box key={k}>
                  <Typography sx={{ fontSize:9, color:T.textMut, mb:.3, textTransform:"uppercase" }}>
                    {k === "lat" ? "Latitude" : "Longitude"}
                  </Typography>
                  <input
                    value={coordInput[k]}
                    onChange={e => setCoordInput(p => ({ ...p, [k]:e.target.value }))}
                    style={{
                      width:"100%", background:"rgba(255,255,255,0.05)", border:`1px solid ${T.border}`,
                      borderRadius:6, padding:"6px 10px", fontSize:12, color:T.text,
                      fontFamily:T.mono, outline:"none", boxSizing:"border-box",
                    }}
                  />
                </Box>
              ))}
            </Box>
            <Box sx={{ display:"flex", gap:.8 }}>
              <button onClick={fetchWeather} disabled={wxLoading} style={{
                flex:1, padding:"6px", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer",
                background:"rgba(59,130,246,0.1)", border:`1px solid rgba(59,130,246,0.25)`,
                color:T.blue, fontFamily:T.sans, display:"flex", alignItems:"center", justifyContent:"center", gap:4,
              }}>
                {wxLoading ? "Detecting…" : "🌤️ Fetch Weather for Location"}
              </button>
              {selectedZone !== null && (
                <button onClick={() => setCoordInput({ lat:HP_ZONES[selectedZone].lat.toFixed(5), lon:HP_ZONES[selectedZone].lon.toFixed(5) })}
                  style={{
                    flex:1, padding:"6px", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer",
                    background:"rgba(245,158,11,0.1)", border:`1px solid rgba(245,158,11,0.25)`,
                    color:T.amber, fontFamily:T.sans,
                  }}>
                  📌 Use Zone Coords
                </button>
              )}
            </Box>
          </Box>

          {/* Road Condition Inputs */}
          <Box sx={{ mb:2, p:1.5, background:T.card, borderRadius:10, border:`1px solid ${T.border}` }}>
            <Typography sx={{ fontSize:10, fontWeight:700, color:T.textMut, letterSpacing:".1em", mb:1.2 }}>
              🗂️ ROAD CONDITIONS
            </Typography>
            <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1.2, mb:1.5 }}>
              <ASelect label="Weather"         field="weather"        opts={OPTS.weather}/>
              <ASelect label="Road Type"       field="roadType"       opts={OPTS.roadType}/>
              <ASelect label="Time of Day"     field="timeOfDay"      opts={OPTS.timeOfDay}/>
              <ASelect label="Area Type"       field="areaType"       opts={OPTS.areaType}/>
              <ASelect label="Day of Week"     field="dayOfWeek"      opts={OPTS.dayOfWeek}/>
              <ASelect label="Road Condition"  field="roadCondition"  opts={OPTS.roadCondition}/>
              <ASelect label="Vehicle Type"    field="vehicleType"    opts={OPTS.vehicleType}/>
              <ASelect label="Light Condition" field="lightCondition" opts={OPTS.lightCondition}/>
            </Box>
            <ASelect label="Critical Zone (iRAD hotspot?)" field="criticalZone" opts={OPTS.criticalZone}/>
          </Box>

          {/* Numeric Sliders */}
          <Box sx={{ mb:2, p:1.5, background:T.card, borderRadius:10, border:`1px solid ${T.border}` }}>
            <Typography sx={{ fontSize:10, fontWeight:700, color:T.textMut, letterSpacing:".1em", mb:1.5 }}>
              📊 NUMERIC PARAMETERS
            </Typography>
            <Box sx={{ display:"flex", flexDirection:"column", gap:1.5 }}>
              <ASlider field="speed"      label={liveGPS && liveSpeed ? "Speed (GPS Active)" : "Speed"} min={0} max={120} unit=" km/h"/>
              <ASlider field="vehicles"   label="Nearby Vehicles" min={0}  max={20}   unit=""    color={T.cyan}/>
              <ASlider field="visibility" label="Visibility"      min={50} max={1000}  unit=" m"  color={T.purple}/>
            </Box>
          </Box>

          {/* Run Simulation CTA */}
          <button
            onClick={runSim}
            disabled={loading}
            style={{
              width:"100%", padding:"13px", borderRadius:10, fontSize:14, fontWeight:800,
              cursor:loading?"not-allowed":"pointer", fontFamily:T.sans,
              background:loading
                ?"rgba(255,255,255,0.06)"
                :`linear-gradient(135deg,#1a3a6b,${T.blue})`,
              border:"none", color:loading?"rgba(255,255,255,0.3)":"#fff",
              boxShadow:loading?"none":`0 4px 20px rgba(59,130,246,0.35)`,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              transition:"all .2s", letterSpacing:".04em",
            }}
          >
            {loading
              ? <><CircularProgress size={16} sx={{ color:"rgba(255,255,255,0.4)" }}/> Running Simulation…</>
              : "▶ RUN SIMULATION"}
          </button>

          {/* Reset to defaults */}
          <button
            onClick={() => { setForm(DEFAULT_FORM); setResult(null); setSelectedZone(null); setActiveScenario(null); }}
            style={{
              width:"100%", marginTop:8, padding:"7px", borderRadius:8, fontSize:11, fontWeight:600,
              cursor:"pointer", fontFamily:T.sans,
              background:"rgba(255,255,255,0.03)", border:`1px solid ${T.border}`, color:T.textSub,
            }}
          >
            ↺ Reset to Defaults
          </button>
        </Box>

        {/* ══════ COL 3: Results Panel ══════ */}
        <Box sx={{
          borderLeft:`1px solid ${T.border}`,
          overflowY:"auto", background:T.panel,
          display:"flex", flexDirection:"column",
        }}>

          {result ? (
            <Box sx={{ p:1.5, animation:"fadeSlide .35s ease both" }}>
              {/* ── Score Hero ── */}
              <Box sx={{
                mb:1.5, p:2, borderRadius:10, textAlign:"center",
                background:RBg(result.score),
                border:`1.5px solid ${RC(result.score)}33`,
                position:"relative", overflow:"hidden",
                boxShadow:"0 2px 16px 0 rgba(0,0,0,0.04)",
              }}>
                {/* Scan line decoration */}
                <Box sx={{
                  position:"absolute", left:0, right:0, height:"2px",
                  background:`linear-gradient(90deg,transparent,${RC(result.score)}60,transparent)`,
                  top:0, animation:"scanLine 2s linear infinite", opacity:.5, pointerEvents:"none",
                }}/>
                <Typography sx={{ fontFamily:T.mono, fontSize:52, fontWeight:700, color:RC(result.score), lineHeight:1 }}>
                  {result.score?.toFixed(1)}
                </Typography>
                <Typography sx={{ fontSize:10, color:RC(result.score), opacity:.7, mb:.8 }}>/100</Typography>
                <Chip label={RL(result.score)} sx={{
                  fontWeight:800, fontSize:12, letterSpacing:".1em",
                  background:RC(result.score), color:"#fff", height:24,
                }}/>
                <Box sx={{ mt:1.5, height:6, background:"rgba(0,0,0,0.07)", borderRadius:3, overflow:"hidden" }}>
                  <Box sx={{
                    height:"100%", width:`${Math.min(result.score,100)}%`,
                    background:RC(result.score), borderRadius:3,
                    transition:"width 1s cubic-bezier(.4,0,.2,1)",
                  }}/>
                </Box>
              </Box>

              {/* ── Error message if API failed ── */}
              {result.error && (
                <Box sx={{
                  mb:1.5, p:1.2, borderRadius:8,
                  background:"rgba(239,68,68,0.08)",
                  border:"1px solid rgba(239,68,68,0.18)",
                }}>
                  <Typography sx={{ fontSize:10, fontWeight:700, color:T.red, mb:.5, letterSpacing:".08em" }}>
                    ⚠️ API Error — Using Fallback
                  </Typography>
                  <Typography sx={{ fontSize:11, color:T.red, lineHeight:1.7 }}>
                    {result.error}
                  </Typography>
                </Box>
              )}

              {/* ── XAI: Why is risk this level? ── */}
              {result.xai_explanation && (
                <Box sx={{
                  mb:1.5, p:1.2, borderRadius:8,
                  background:"rgba(59,130,246,0.08)",
                  border:"1px solid rgba(59,130,246,0.18)",
                }}>
                  <Typography sx={{ fontSize:10, fontWeight:700, color:T.blue, mb:.5, letterSpacing:".08em" }}>
                    🧠 WHY IS RISK {RL(result.score)}?
                  </Typography>
                  <Typography sx={{ fontSize:11, color:T.blue, lineHeight:1.7 }}>
                    {result.xai_explanation}
                  </Typography>
                </Box>
              )}

              {/* ── Historical context from selected hotspot ── */}
              {selectedZone !== null && (
                <Box sx={{
                  mb:1.5, p:1.2, borderRadius:8,
                  background:"rgba(245,158,11,0.07)",
                  border:"1px solid rgba(245,158,11,0.18)",
                }}>
                  <Typography sx={{ fontSize:10, fontWeight:700, color:T.amber, mb:.5, letterSpacing:".08em" }}>
                    📍 HISTORICAL CONTEXT — iRAD 2025-26
                  </Typography>
                  <Typography sx={{ fontSize:11, fontWeight:700, color:T.text }}>{HP_ZONES[selectedZone].name}</Typography>
                  <Typography sx={{ fontSize:10, color:T.textSub, mt:.3 }}>District: {HP_ZONES[selectedZone].district}</Typography>
                  <Box sx={{ display:"flex", gap:1, mt:.8, flexWrap:"wrap" }}>
                    {[
                      [`⚠️ ${HP_ZONES[selectedZone].accidents} accidents`, "rgba(245,158,11,0.15)", T.amber],
                      [`💀 ${HP_ZONES[selectedZone].killed} fatalities`,   "rgba(239,68,68,0.15)",  T.red  ],
                      [`🔴 Risk Index ${HP_ZONES[selectedZone].risk}%`,    "rgba(239,68,68,0.1)",   T.red  ],
                    ].map(([lbl, bg, clr]) => (
                      <Box key={lbl} sx={{ px:1, py:.3, borderRadius:4, background:bg, border:`1px solid ${clr}33` }}>
                        <Typography sx={{ fontSize:10, fontWeight:700, color:clr }}>{lbl}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* ── Contributing Risk Factors ── */}
              {result.xai_factors && (
                <Box sx={{ mb:1.5, p:1.2, borderRadius:8, background:T.card, border:`1px solid ${T.border}` }}>
                  <Typography sx={{ fontSize:10, fontWeight:700, color:T.textMut, letterSpacing:".1em", mb:1 }}>
                    📊 CONTRIBUTING FACTORS
                  </Typography>
                  {Object.entries(result.xai_factors).map(([k, v]) => {
                    const num = parseFloat(String(v)) || 0;
                    const fClr = num >= 70 ? T.red : num >= 40 ? T.amber : T.green;
                    return (
                      <Box key={k} sx={{ mb:1 }}>
                        <Box sx={{ display:"flex", justifyContent:"space-between", mb:.3 }}>
                          <Typography sx={{ fontSize:10, color:T.textSub }}>{k}</Typography>
                          <Typography sx={{ fontSize:10, fontWeight:700, color:fClr, fontFamily:T.mono }}>{v}%</Typography>
                        </Box>
                        <Box sx={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2 }}>
                          <Box sx={{ height:"100%", width:`${Math.min(num,100)}%`, background:fClr, borderRadius:2, transition:"width .8s ease" }}/>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* ── Advanced Debug / ML Info (collapsible) ── */}
              <Box sx={{ mb:1.5, borderRadius:8, background:T.card, border:`1px solid ${T.border}`, overflow:"hidden" }}>
                <Box
                  onClick={() => setShowDebug(v => !v)}
                  sx={{
                    px:1.2, py:1, display:"flex", justifyContent:"space-between", alignItems:"center",
                    cursor:"pointer", "&:hover":{ background:"rgba(255,255,255,0.03)" },
                  }}
                >
                  <Typography sx={{ fontSize:10, fontWeight:700, color:T.textMut, letterSpacing:".1em" }}>
                    🔬 ADVANCED DEBUG / ML INFO
                  </Typography>
                  <Typography sx={{ fontSize:10, color:T.textMut }}>{showDebug ? "▲" : "▼"}</Typography>
                </Box>
                <Collapse in={showDebug}>
                  <Box sx={{ px:1.2, pb:1.2 }}>
                    <Divider sx={{ borderColor:T.border, mb:1 }}/>

                    {/* RF + LSTM individual scores */}
                    <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, mb:1 }}>
                      {[
                        { label:"🌲 Random Forest", val:result.rf_score,   color:T.blue,   bg:"rgba(59,130,246,0.08)",  desc:"Feature importance weighted" },
                        { label:"🧠 LSTM",          val:result.lstm_score, color:T.purple, bg:"rgba(139,92,246,0.08)", desc:"Sequential temporal drift"   },
                      ].map(m => (
                        <Box key={m.label} sx={{ p:1, borderRadius:6, background:m.bg, border:`1px solid ${m.color}22` }}>
                          <Typography sx={{ fontSize:9, fontWeight:700, color:m.color, mb:.3 }}>{m.label}</Typography>
                          <Typography sx={{ fontFamily:T.mono, fontSize:22, fontWeight:700, color:m.color, lineHeight:1 }}>
                            {m.val != null ? m.val?.toFixed(1) : "—"}
                          </Typography>
                          <Typography sx={{ fontSize:8, color:`${m.color}88`, mt:.2 }}>/100</Typography>
                          {m.val != null && (
                            <Box sx={{ mt:.5, height:2, background:"rgba(255,255,255,0.06)", borderRadius:1 }}>
                              <Box sx={{ height:"100%", width:`${Math.min(m.val,100)}%`, background:m.color, borderRadius:1 }}/>
                            </Box>
                          )}
                          <Typography sx={{ fontSize:9, color:T.textMut, mt:.4, lineHeight:1.3 }}>{m.desc}</Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Ensemble formula breakdown */}
                    <Box sx={{ p:1, borderRadius:6, background:"rgba(255,255,255,0.03)", border:`1px solid ${T.border}`, mb:1 }}>
                      <Typography sx={{ fontSize:9, color:T.textMut, fontFamily:T.mono, lineHeight:1.8 }}>
                        Final = RF×0.70 + LSTM×0.30 + iRAD Boost<br/>
                        = {result.rf_score?.toFixed(1)}×0.70 + {result.lstm_score?.toFixed(1) ?? 0}×0.30 + {result.boost?.toFixed(1) ?? 0}<br/>
                        = <span style={{ color:RC(result.score), fontWeight:700 }}>{result.score?.toFixed(1)}</span>
                      </Typography>
                    </Box>

                    {/* Metadata */}
                    <Box sx={{ display:"flex", flexDirection:"column", gap:.4 }}>
                      {[
                        ["Model",          result.model_used || "RF+LSTM"],
                        ["iRAD Boost",     `+${result.boost?.toFixed(1) ?? 0}`],
                        ["Dataset",        "iRAD 2021-26 HP"],
                        ["HP Calibration", "Mountain road edge cases"],
                      ].map(([k, v]) => (
                        <Box key={k} sx={{ display:"flex", justifyContent:"space-between" }}>
                          <Typography sx={{ fontSize:9, color:T.textMut }}>{k}</Typography>
                          <Typography sx={{ fontSize:9, fontWeight:600, color:T.textSub, fontFamily:T.mono, maxWidth:140, textAlign:"right" }} noWrap>{v}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Collapse>
              </Box>

              {/* ── Action buttons ── */}
              <Box sx={{ display:"flex", gap:.8 }}>
                <button onClick={() => nav("/navigation")} style={{
                  flex:1, padding:"9px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer",
                  background:"rgba(59,130,246,0.1)", border:`1px solid rgba(59,130,246,0.25)`,
                  color:T.blue, fontFamily:T.sans,
                }}>🗺️ Navigate</button>
                <button onClick={() => nav("/admin")} style={{
                  flex:1, padding:"9px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer",
                  background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`,
                  color:T.textSub, fontFamily:T.sans,
                }}>← Admin</button>
              </Box>

            </Box>
          ) : (
            /* ── Empty state ── */
            <Box sx={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", p:3, textAlign:"center" }}>
              <Box sx={{ fontSize:48, mb:2, opacity:.3 }}>⚡</Box>
              <Typography sx={{ fontSize:13, color:T.textMut, lineHeight:1.8, mb:1 }}>
                Select a scenario or configure<br/>conditions, then click
              </Typography>
              <Box sx={{
                px:2, py:1, borderRadius:6,
                background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.2)",
                fontFamily:T.mono, fontSize:12, fontWeight:700, color:T.blue,
              }}>▶ RUN SIMULATION</Box>
              <Typography sx={{ fontSize:10, color:T.textMut, mt:2 }}>
                Results, model breakdown, and<br/>XAI explanation will appear here
              </Typography>
            </Box>
          )}
        </Box>

      </Box>
    </Box>
  );
}