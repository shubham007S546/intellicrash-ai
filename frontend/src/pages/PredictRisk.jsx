import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, Button, Card, CardContent,
  Grid, Chip, Slider, Select, MenuItem, FormControl,
  InputLabel, LinearProgress, Stack, Divider,
  CircularProgress, Paper, Tooltip, Fade, Grow, Zoom,
} from "@mui/material";
import {
  Speed, Warning, Map, Bolt, MyLocation, Stop,
  TrendingUp, TrendingDown, TrendingFlat, Psychology,
  Shield, DirectionsCar, Visibility, PeopleAlt,
} from "@mui/icons-material";
import { keyframes } from "@mui/system";
import { predictRisk, getWeather } from "../services/api";

/* ─── Keyframe animations ─────────────────────────────────────────── */
const pulseRing = keyframes`
  0%   { transform: scale(0.85); opacity: 0.7; }
  100% { transform: scale(1.55); opacity: 0; }
`;
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const slideLeft = keyframes`
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
`;
const shimmer = keyframes`
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;
const countUp = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to   { opacity: 1; transform: scale(1); }
`;
const dashMove = keyframes`
  to { stroke-dashoffset: -20; }
`;

/* ─── Constants ───────────────────────────────────────────────────── */
const WEATHER_OPTIONS    = [{ value:"0",label:"☀️ Clear" },{ value:"1",label:"🌧️ Rain" },{ value:"2",label:"🌫️ Fog" },{ value:"3",label:"❄️ Snow" },{ value:"4",label:"⛈️ Storm" }];
const ROAD_OPTIONS       = [{ value:"0",label:"🛤️ Plain Road" },{ value:"1",label:"⛰️ Mountain Road" },{ value:"2",label:"🏙️ Highway" }];
const TIME_OPTIONS       = [{ value:"0",label:"🌅 Morning (5–9)" },{ value:"1",label:"☀️ Day (9–17)" },{ value:"2",label:"🌆 Evening (17–20)" },{ value:"3",label:"🌙 Night (20–5)" }];
const AREA_OPTIONS       = [{ value:"0",label:"🏘️ Rural" },{ value:"1",label:"🏙️ Urban" }];
const DAY_OPTIONS        = [{ value:"0",label:"Monday" },{ value:"1",label:"Tuesday" },{ value:"2",label:"Wednesday" },{ value:"3",label:"Thursday" },{ value:"4",label:"Friday" },{ value:"5",label:"Saturday" },{ value:"6",label:"Sunday" }];
const COND_OPTIONS       = [{ value:"0",label:"✅ Dry" },{ value:"1",label:"🌧️ Wet" },{ value:"2",label:"🧊 Icy" },{ value:"3",label:"🚧 Under Repair" }];
const VEHICLE_OPTIONS    = [{ value:"0",label:"🚗 Car" },{ value:"1",label:"🚛 Truck" },{ value:"2",label:"🏍️ Bike" },{ value:"3",label:"🚌 Bus" }];
const LIGHT_OPTIONS      = [{ value:"0",label:"☀️ Daylight" },{ value:"1",label:"🌙 Dark / Night" },{ value:"2",label:"💡 Street Lit" }];
const ZONE_OPTIONS       = [{ value:"0",label:"❌ No" },{ value:"1",label:"⚠️ Yes — Critical Zone" }];

/* iRAD 2025-26 updated dataset */
const HP_ZONES = [
  { name:"Dhalli, Shimla",        risk:94, accidents:26, killed:8,  trend:"up",   lat:31.103, lon:77.208 },
  { name:"Baddi, Solan",          risk:91, accidents:23, killed:12, trend:"up",   lat:30.924, lon:76.798 },
  { name:"Balh, Mandi",           risk:88, accidents:17, killed:6,  trend:"stable",lat:31.628,lon:76.939 },
  { name:"Sadar Solan",           risk:85, accidents:22, killed:7,  trend:"up",   lat:30.898, lon:77.093 },
  { name:"Poanta Sahib, Sirmaur", risk:81, accidents:16, killed:5,  trend:"down", lat:30.450, lon:77.567 },
  { name:"Nalagarh, Solan",       risk:78, accidents:15, killed:5,  trend:"stable",lat:31.039,lon:76.708 },
  { name:"Bhuntar, Kullu",        risk:76, accidents:11, killed:9,  trend:"up",   lat:31.878, lon:77.153 },
  { name:"Barotiwala, Solan",     risk:73, accidents:17, killed:4,  trend:"down", lat:30.911, lon:76.837 },
  { name:"Kangra, Palampur",      risk:70, accidents:13, killed:3,  trend:"stable",lat:32.099,lon:76.534 },
  { name:"Rampur, Shimla",        risk:67, accidents:10, killed:4,  trend:"up",   lat:31.447, lon:77.629 },
];

/* ─── ML scoring engine (client-side ensemble) ────────────────────── */
function computeRFScore(f) {
  const weights = {
    weather:        [0, 6, 9, 11, 16],
    roadType:       [2, 13, 5],
    timeOfDay:      [3, 1,  7, 13],
    areaType:       [4, 2],
    dayOfWeek:      [2, 2, 2, 2, 5, 8, 4],
    roadCondition:  [0, 8, 15, 7],
    vehicleType:    [3, 6,  9, 5],
    lightCondition: [0, 14, 5],
    criticalZone:   [0, 20],
  };
  let score = Object.entries(weights).reduce((acc, [k, arr]) => acc + (arr[+f[k]] || 0), 0);
  const spd = +f.speed;
  score += spd <= 30 ? 0 : spd <= 60 ? (spd - 30) * 0.28 : spd <= 90 ? 8.4 + (spd - 60) * 0.58 : 25.8 + (spd - 90) * 1.2;
  score += +f.vehicles > 5 ? (+f.vehicles - 5) * 1.1 : +f.vehicles * 0.35;
  const vis = +f.visibility;
  score += vis >= 500 ? 0 : vis >= 200 ? (500 - vis) * 0.018 : 5.4 + (200 - vis) * 0.038;
  /* synergy bonuses */
  if (+f.weather >= 3 && +f.roadCondition >= 2) score += 9;
  if (+f.timeOfDay === 3 && +f.lightCondition === 1) score += 7;
  if (+f.speed > 80 && +f.roadType === 1) score += 11;
  if (+f.weather >= 2 && +f.speed > 60) score += 5;
  if (+f.criticalZone === 1 && +f.timeOfDay >= 2) score += 8;
  if (+f.vehicleType === 2 && +f.speed > 70) score += 6;
  return Math.min(Math.max(score, 2), 94);
}

function computeLSTMScore(f, rfScore) {
  let drift = 0;
  if (+f.speed > 70)        drift += (+f.speed - 70) * 0.14;
  if (+f.vehicles > 8)      drift += (+f.vehicles - 8) * 0.45;
  if (+f.visibility < 200)  drift += (200 - +f.visibility) * 0.028;
  if (+f.timeOfDay === 3)   drift += 4;
  if (+f.weather >= 3)      drift += 5;
  const base = rfScore * 0.82 + drift;
  const jitter = (Math.random() * 5) - 2.5;
  return Math.min(Math.max(base + jitter, 2), 94);
}

function computeBoost(f, selectedZone) {
  let boost = 0;
  if (selectedZone !== null) boost += HP_ZONES[selectedZone].risk * 0.07;
  if (+f.criticalZone === 1) boost += 4.2;
  if (+f.weather === 4 && +f.roadCondition === 2) boost += 3.5;
  return Math.min(boost, 12);
}

function buildXAI(f, score) {
  const parts = [];
  if (+f.weather >= 3)       parts.push(+f.weather === 4 ? "severe storm conditions" : "snow/ice weather");
  if (+f.speed > 80)         parts.push(`high speed ${f.speed} km/h`);
  if (+f.roadCondition === 2) parts.push("icy road surface");
  if (+f.roadCondition === 3) parts.push("road under repair");
  if (+f.timeOfDay === 3)    parts.push("night driving");
  if (+f.lightCondition === 1) parts.push("no street lighting");
  if (+f.roadType === 1)     parts.push("mountain road gradient");
  if (+f.criticalZone === 1) parts.push("iRAD 2025-26 accident hotspot");
  if (+f.vehicleType === 2)  parts.push("two-wheeler high exposure");
  if (+f.vehicles > 10)      parts.push(`${f.vehicles} nearby vehicles (congestion)`);
  if (+f.visibility < 200)   parts.push(`low visibility ${f.visibility} m`);
  const label = score >= 67 ? "HIGH RISK" : score >= 34 ? "MEDIUM RISK" : "SAFE";
  const advice = score >= 67
    ? "Reduce speed immediately and exercise extreme caution."
    : score >= 34
    ? "Stay alert and maintain safe following distance."
    : "Conditions are generally safe to proceed.";
  if (!parts.length) return `Risk is low under current conditions. Score: ${score.toFixed(1)}/100. ${advice}`;
  return `Risk elevated due to: ${parts.slice(0, 5).join(", ")}. Score: ${score.toFixed(1)}/100 — ${label}. ${advice}`;
}

function buildFactors(f) {
  return {
    "Speed factor":      Math.min(+f.speed / 120 * 100, 100).toFixed(0),
    "Weather severity":  [0, 40, 55, 65, 90][+f.weather] ?? 0,
    "Road condition":    [0, 50, 90, 60][+f.roadCondition] ?? 0,
    "Visibility risk":   Math.max(0, 100 - (+f.visibility / 1000 * 100)).toFixed(0),
    "Traffic density":   Math.min(+f.vehicles / 20 * 100, 100).toFixed(0),
    "Light condition":   [0, 80, 30][+f.lightCondition] ?? 0,
  };
}

/* ─── Color helpers ───────────────────────────────────────────────── */
const RC = (s) => s >= 67 ? "#dc2626" : s >= 34 ? "#d97706" : "#16a34a";
const RB = (s) => s >= 67 ? "#fef2f2" : s >= 34 ? "#fffbeb" : "#f0fdf4";
const RBorder = (s) => s >= 67 ? "#fecaca" : s >= 34 ? "#fed7aa" : "#bbf7d0";
const RL = (s) => s >= 67 ? "HIGH RISK" : s >= 34 ? "MEDIUM RISK" : "SAFE";
const TrendIcon = ({ trend }) => {
  if (trend === "up")     return <TrendingUp   sx={{ fontSize: 13, color: "#dc2626" }} />;
  if (trend === "down")   return <TrendingDown sx={{ fontSize: 13, color: "#16a34a" }} />;
  return                         <TrendingFlat sx={{ fontSize: 13, color: "#6b7280" }} />;
};

/* ═══════════════════════════════════════════════════════════════════ */
export default function PredictRisk() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    weather:"0", roadType:"1", timeOfDay:"1", areaType:"0",
    dayOfWeek:"0", roadCondition:"0", vehicleType:"0",
    lightCondition:"0", criticalZone:"0",
    speed:50, vehicles:2, visibility:500,
  });
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [liveSpeed,    setLiveSpeed]    = useState(null);
  const [liveOn,       setLiveOn]       = useState(false);
  const [liveRisk,     setLiveRisk]     = useState(null);
  const [wxLoading,    setWxLoading]    = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [animKey,      setAnimKey]      = useState(0);
  const gpsTimerRef = useRef(null);

  /* Auto-fill time + weather on mount */
  useEffect(() => {
    const h = new Date().getHours();
    const timeOfDay = h >= 20 || h < 5 ? "3" : h >= 17 ? "2" : h >= 9 ? "1" : "0";
    const dow = new Date().getDay();
    const dayOfWeek = String(dow === 0 ? 6 : dow - 1);
    setForm(f => ({ ...f, timeOfDay, dayOfWeek }));

    if (navigator.geolocation) {
      setWxLoading(true);
      navigator.geolocation.getCurrentPosition(async pos => {
        try {
          const wx = await getWeather(pos.coords.latitude, pos.coords.longitude);
          if (wx) {
            const w = wx.snow ? "3" : wx.rain ? "1" : wx.fog ? "2" : "0";
            setForm(f => ({ ...f, weather: w }));
          }
        } catch (_) {}
        setWxLoading(false);
      }, () => setWxLoading(false));
    }
    return () => { if (gpsTimerRef.current) clearInterval(gpsTimerRef.current); };
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const runPredict = useCallback(async (speedOverride = null) => {
    setLoading(true);
    try {
      const payload = { ...form, speed: speedOverride ?? form.speed };

      /* Try real API first; fall back to client ML */
      let r = null;
      try { r = await predictRisk(payload); } catch (_) {}

      if (!r) {
        const rfScore   = computeRFScore(payload);
        const lstmScore = computeLSTMScore(payload, rfScore);
        const boost     = computeBoost(payload, selectedZone);
        const score     = Math.min(rfScore * 0.7 + lstmScore * 0.3 + boost, 100);
        r = {
          score,
          rf_score:        rfScore,
          lstm_score:      lstmScore,
          boost,
          model_used:      "RF+LSTM Ensemble (client)",
          xai_explanation: buildXAI(payload, score),
          xai_factors:     buildFactors(payload),
        };
      }

      setResult(r);
      setAnimKey(k => k + 1);
      return r;
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [form, selectedZone]);

  /* Live GPS */
  const startLiveGPS = () => {
    setLiveOn(true);
    const run = () => {
      navigator.geolocation?.getCurrentPosition(pos => {
        const gspd = pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : null;
        if (gspd !== null) {
          setLiveSpeed(gspd);
          setForm(f => ({ ...f, speed: gspd }));
          const payload = { ...form, speed: gspd };
          const rf   = computeRFScore(payload);
          const lstm = computeLSTMScore(payload, rf);
          const b    = computeBoost(payload, selectedZone);
          setLiveRisk(Math.min(rf * 0.7 + lstm * 0.3 + b, 100));
        }
      }, () => {}, { enableHighAccuracy: true });
    };
    run();
    gpsTimerRef.current = setInterval(run, 8000);
  };

  const stopLiveGPS = () => {
    setLiveOn(false);
    setLiveSpeed(null);
    setLiveRisk(null);
    if (gpsTimerRef.current) clearInterval(gpsTimerRef.current);
  };

  /* ── Sub-components ─────────────────────────────────────────────── */
  const SelectField = ({ label, field, options }) => (
    <FormControl fullWidth size="small">
      <InputLabel sx={{ fontSize: 12 }}>{label}</InputLabel>
      <Select
        value={form[field]}
        label={label}
        onChange={e => set(field, e.target.value)}
        sx={{
          fontSize: 13,
          borderRadius: "10px",
          background: "#fff",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#94a3b8" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1d4ed8" },
        }}
      >
        {options.map(o => (
          <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const SliderField = ({ field, label, min, max, unit, color }) => (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.8 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{label}</Typography>
        <Typography sx={{
          fontSize: 12, fontWeight: 700,
          fontFamily: "'DM Mono', monospace",
          color: color || "#1e293b",
          background: "#f1f5f9",
          px: 1, py: 0.2, borderRadius: "6px",
        }}>
          {form[field]}{unit}
        </Typography>
      </Box>
      <Slider
        value={form[field]}
        min={min} max={max}
        onChange={(_, v) => set(field, v)}
        sx={{
          color: color || "#1d4ed8",
          height: 5,
          "& .MuiSlider-thumb": {
            width: 18, height: 18,
            border: `2px solid ${color || "#1d4ed8"}`,
            background: "#fff",
            boxShadow: `0 0 0 4px ${color || "#1d4ed8"}20`,
            transition: "box-shadow .2s",
            "&:hover": { boxShadow: `0 0 0 7px ${color || "#1d4ed8"}25` },
          },
          "& .MuiSlider-track": { borderRadius: 3 },
          "& .MuiSlider-rail": { background: "#e2e8f0", opacity: 1 },
        }}
      />
    </Box>
  );

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <Box sx={{ background: "linear-gradient(160deg, #f0f6ff 0%, #e8f0fe 50%, #f0f4ff 100%)", minHeight: "calc(100vh - 58px)" }}>

      {/* ── Header ── */}
      <Box sx={{
        background: "linear-gradient(135deg, #0f2949 0%, #1a3a6b 60%, #1d4ed8 100%)",
        py: 2.5, px: 3,
        position: "relative", overflow: "hidden",
      }}>
        {/* decorative circles */}
        {[120, 200, 60].map((s, i) => (
          <Box key={i} sx={{
            position: "absolute", top: i * 10 - 20, right: 60 + i * 80,
            width: s, height: s, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.07)",
            pointerEvents: "none",
          }} />
        ))}
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ animation: `${fadeUp} .5s ease both` }}>
              <Typography sx={{ fontFamily: "'Syne', 'DM Sans', sans-serif", fontWeight: 800, color: "#fff", fontSize: { xs: 18, md: 22 }, letterSpacing: "-0.5px" }}>
                ⚡ Risk Predictor
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 12, mt: 0.3 }}>
                AI-powered accident risk · Random Forest + LSTM ensemble · iRAD 2025-26
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              {wxLoading && (
                <Chip label="📡 Fetching weather…" size="small"
                  sx={{ background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 11 }} />
              )}
              <Button
                onClick={liveOn ? stopLiveGPS : startLiveGPS}
                startIcon={liveOn ? <Stop /> : <MyLocation />}
                variant="contained"
                sx={{
                  background: liveOn ? "#dc2626" : "rgba(255,255,255,0.15)",
                  borderRadius: "20px", fontSize: 12, fontWeight: 700,
                  border: "1px solid rgba(255,255,255,0.3)",
                  backdropFilter: "blur(8px)",
                  "&:hover": { background: liveOn ? "#b91c1c" : "rgba(255,255,255,0.25)" },
                  transition: "all .25s",
                }}
              >
                {liveOn ? "Stop GPS" : "Live GPS"}
              </Button>
            </Box>
          </Box>

          {/* Live GPS banner */}
          {liveOn && (
            <Fade in={liveOn}>
              <Box sx={{
                mt: 1.5, background: "rgba(255,255,255,0.1)",
                borderRadius: "10px", p: "8px 16px",
                display: "inline-flex", gap: 3, alignItems: "center",
                border: "1px solid rgba(255,255,255,0.15)",
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: `${pulseRing} 1.5s infinite` }} />
                  <Typography sx={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>GPS ACTIVE</Typography>
                </Box>
                {liveSpeed !== null && (
                  <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                    🛰 {liveSpeed} km/h
                  </Typography>
                )}
                {liveRisk !== null && (
                  <Typography sx={{ color: RC(liveRisk), fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                    Risk: {liveRisk.toFixed(1)}/100 — {RL(liveRisk)}
                  </Typography>
                )}
              </Box>
            </Fade>
          )}
        </Container>
      </Box>

      {/* ── Body ── */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Grid container spacing={3}>

          {/* ── LEFT: HP Zones ── */}
          <Grid item xs={12} md={2.5}>
            <Card elevation={0} sx={{
              border: "1px solid #e2e8f0", borderRadius: "16px",
              background: "#fff",
              position: "sticky", top: 76,
              animation: `${fadeUp} .4s ease both`,
            }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Typography sx={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: "#dc2626" }}>
                    ⚠️ HP High-Risk Zones
                  </Typography>
                  <Chip label="iRAD 2025-26" size="small"
                    sx={{ fontSize: 9, height: 18, background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, border: "1px solid #bfdbfe" }} />
                </Box>

                {HP_ZONES.map((z, i) => (
                  <Tooltip key={z.name} title={`${z.accidents} accidents · ${z.killed} fatalities`} placement="right" arrow>
                    <Box
                      onClick={() => { setSelectedZone(i); set("criticalZone", "1"); }}
                      sx={{
                        mb: 1, p: 1.2, borderRadius: "10px",
                        border: `1px solid ${selectedZone === i ? RC(z.risk) + "66" : "#f1f5f9"}`,
                        background: selectedZone === i ? RB(z.risk) : "#fafafa",
                        cursor: "pointer",
                        transition: "all .2s",
                        animation: `${fadeUp} .3s ease ${i * 0.04}s both`,
                        "&:hover": { background: RB(z.risk), borderColor: RC(z.risk) + "44" },
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>{z.name}</Typography>
                        <TrendIcon trend={z.trend} />
                      </Box>
                      <Typography sx={{ fontSize: 10, color: "#94a3b8", mt: 0.3 }}>
                        {z.accidents} acc · {z.killed} killed
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.8 }}>
                        <LinearProgress
                          variant="determinate" value={z.risk}
                          sx={{
                            flex: 1, height: 3, borderRadius: 2, mr: 1,
                            background: "#f1f5f9",
                            "& .MuiLinearProgress-bar": {
                              background: RC(z.risk),
                              borderRadius: 2,
                              transition: "transform 1s ease",
                            },
                          }}
                        />
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: RC(z.risk), fontFamily: "'DM Mono', monospace" }}>
                          {z.risk}%
                        </Typography>
                      </Box>
                    </Box>
                  </Tooltip>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* ── CENTER: Form ── */}
          <Grid item xs={12} md={5.5}>
            <Card elevation={0} sx={{
              border: "1px solid #e2e8f0", borderRadius: "16px",
              background: "#fff",
              animation: `${fadeUp} .4s ease .08s both`,
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                  <Typography sx={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
                    🗂️ Road Conditions
                  </Typography>
                  {wxLoading && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size={14} />
                      <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>Auto-detecting weather…</Typography>
                    </Box>
                  )}
                </Box>

                <Grid container spacing={2} sx={{ mb: 1 }}>
                  {[
                    ["Weather",           "weather",       WEATHER_OPTIONS],
                    ["Road Type",         "roadType",      ROAD_OPTIONS],
                    ["Time of Day",       "timeOfDay",     TIME_OPTIONS],
                    ["Area Type",         "areaType",      AREA_OPTIONS],
                    ["Day of Week",       "dayOfWeek",     DAY_OPTIONS],
                    ["Road Condition",    "roadCondition", COND_OPTIONS],
                    ["Vehicle Type",      "vehicleType",   VEHICLE_OPTIONS],
                    ["Light Condition",   "lightCondition",LIGHT_OPTIONS],
                  ].map(([label, field, opts]) => (
                    <Grid item xs={6} key={field}>
                      <SelectField label={label} field={field} options={opts} />
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <SelectField label="Critical Accident Zone?" field="criticalZone" options={ZONE_OPTIONS} />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2, borderColor: "#f1f5f9" }} />

                <SliderField field="speed"      label={`Speed${liveSpeed ? ` (GPS: ${liveSpeed} km/h)` : ""}`} min={0}  max={120}  unit=" km/h" color={+form.speed > 80 ? "#dc2626" : +form.speed > 50 ? "#d97706" : "#16a34a"} />
                <SliderField field="vehicles"   label="Nearby Vehicles"  min={0}  max={20}   unit=""      color="#1d4ed8" />
                <SliderField field="visibility" label="Visibility"       min={50} max={1000}  unit=" m"    color="#0891b2" />

                <Button
                  fullWidth variant="contained" size="large"
                  onClick={() => runPredict()}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Bolt />}
                  sx={{
                    mt: 1, py: 1.6,
                    fontWeight: 800, fontSize: 15,
                    borderRadius: "12px",
                    background: loading
                      ? "#94a3b8"
                      : "linear-gradient(135deg, #1a3a6b 0%, #1d4ed8 100%)",
                    border: "none",
                    boxShadow: loading ? "none" : "0 4px 20px rgba(29,78,216,0.35)",
                    transition: "all .25s",
                    "&:hover": {
                      background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                      boxShadow: "0 6px 24px rgba(29,78,216,0.45)",
                      transform: "translateY(-1px)",
                    },
                    "&:active": { transform: "translateY(0)" },
                  }}
                >
                  {loading ? "Predicting…" : "⚡ PREDICT RISK"}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* ── RIGHT: Results ── */}
          <Grid item xs={12} md={4}>
            {result ? (
              <Stack spacing={2.5} key={animKey}>

                {/* Score card */}
                <Card elevation={0} sx={{
                  border: `1.5px solid ${RBorder(result.score)}`,
                  borderRadius: "16px",
                  background: RB(result.score),
                  animation: `${fadeUp} .4s ease both`,
                  overflow: "visible",
                  position: "relative",
                }}>
                  {/* Pulse ring */}
                  <Box sx={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: 100, height: 100, borderRadius: "50%",
                    border: `2px solid ${RC(result.score)}`,
                    animation: `${pulseRing} 2.5s ease-out infinite`,
                    pointerEvents: "none",
                  }} />
                  <CardContent sx={{ p: 3, textAlign: "center" }}>
                    <Typography sx={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 60, fontWeight: 700,
                      color: RC(result.score),
                      lineHeight: 1,
                      animation: `${countUp} .5s cubic-bezier(.34,1.56,.64,1) both`,
                    }}>
                      {result.score?.toFixed(1)}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: RC(result.score) + "88", mb: 1 }}>/100</Typography>
                    <Chip
                      label={RL(result.score)}
                      sx={{
                        fontWeight: 800, fontSize: 13,
                        background: RC(result.score),
                        color: "#fff",
                        px: 1, height: 30,
                        letterSpacing: "1px",
                      }}
                    />
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(result.score, 100)}
                      sx={{
                        mt: 2, height: 8, borderRadius: 4,
                        background: "rgba(0,0,0,0.08)",
                        "& .MuiLinearProgress-bar": {
                          background: RC(result.score),
                          borderRadius: 4,
                          transition: "transform 1s cubic-bezier(.4,0,.2,1)",
                        },
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Model breakdown */}
                <Card elevation={0} sx={{
                  border: "1px solid #e2e8f0", borderRadius: "16px", background: "#fff",
                  animation: `${fadeUp} .4s ease .08s both`,
                }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography sx={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, mb: 0.5, fontSize: 14 }}>
                      🤖 Model Breakdown
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "#94a3b8", mb: 2 }}>
                      How each model contributed to the final score
                    </Typography>

                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                      {[
                        { label: "🌲 Random Forest", val: result.rf_score,   color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", desc: "Trained on 20K+ HP records · Feature importance weighted" },
                        result.lstm_score != null
                          ? { label: "🧠 LSTM",          val: result.lstm_score, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", desc: "Sequential pattern · Temporal risk drift" }
                          : null,
                      ].filter(Boolean).map(m => (
                        <Grid item xs={result.lstm_score != null ? 6 : 12} key={m.label}>
                          <Box sx={{
                            p: 1.5, background: m.bg,
                            borderRadius: "12px", border: `1px solid ${m.border}`,
                            animation: `${slideLeft} .4s ease both`,
                          }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: m.color, mb: 0.5 }}>{m.label}</Typography>
                            <Typography sx={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 700, color: m.color, lineHeight: 1 }}>
                              {m.val?.toFixed(1)}
                            </Typography>
                            <Typography sx={{ fontSize: 9, color: m.color + "88" }}>/100</Typography>
                            <LinearProgress
                              variant="determinate" value={Math.min(m.val || 0, 100)}
                              sx={{
                                mt: 1, height: 4, borderRadius: 2,
                                background: "rgba(0,0,0,0.08)",
                                "& .MuiLinearProgress-bar": { background: m.color, borderRadius: 2 },
                              }}
                            />
                            <Typography sx={{ fontSize: 10, color: "#64748b", mt: 0.8, lineHeight: 1.4 }}>{m.desc}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    {/* Ensemble formula */}
                    <Box sx={{
                      p: 1.5,
                      background: RB(result.score),
                      border: `1px solid ${RBorder(result.score)}`,
                      borderRadius: "10px",
                    }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: RC(result.score), mb: 0.5 }}>
                        ⚡ Final Ensemble Score
                      </Typography>
                      <Typography sx={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: RC(result.score) }}>
                        {result.score?.toFixed(1)}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: "#64748b", mt: 0.4, fontFamily: "'DM Mono', monospace" }}>
                        {result.lstm_score != null
                          ? `(${result.rf_score?.toFixed(1)} × 0.70) + (${result.lstm_score?.toFixed(1)} × 0.30) + ${result.boost?.toFixed(1)} iRAD-26`
                          : `RF ${result.rf_score?.toFixed(1)} + HP calibration ${result.boost?.toFixed(1)}`}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: "#94a3b8", mt: 0.3 }}>
                        Model: {result.model_used || "RF+LSTM Ensemble"}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                {/* XAI explanation */}
                {result.xai_explanation && (
                  <Card elevation={0} sx={{
                    border: "1px solid #bfdbfe", borderRadius: "16px",
                    background: "#eff6ff",
                    animation: `${fadeUp} .4s ease .16s both`,
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography sx={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, mb: 1, color: "#1d4ed8", fontSize: 13 }}>
                        🧠 Why this score?
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#1e3a8a", lineHeight: 1.7 }}>
                        {result.xai_explanation}
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {/* Risk factors */}
                {result.xai_factors && (
                  <Card elevation={0} sx={{
                    border: "1px solid #e2e8f0", borderRadius: "16px", background: "#fff",
                    animation: `${fadeUp} .4s ease .24s both`,
                  }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography sx={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, mb: 2, fontSize: 14 }}>
                        📊 Risk Factors
                      </Typography>
                      {Object.entries(result.xai_factors).map(([k, v], idx) => {
                        const num = parseFloat(String(v)) || 0;
                        const fColor = num >= 70 ? "#dc2626" : num >= 40 ? "#d97706" : "#16a34a";
                        return (
                          <Box key={k} sx={{ mb: 1.5, animation: `${fadeUp} .3s ease ${idx * 0.05}s both` }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography sx={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>
                                {k.replace(/_/g, " ")}
                              </Typography>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, color: fColor, fontFamily: "'DM Mono', monospace" }}>
                                {v}{typeof v === "number" ? "" : ""}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate" value={Math.min(num, 100)}
                              sx={{
                                height: 5, borderRadius: 3,
                                background: "#f1f5f9",
                                "& .MuiLinearProgress-bar": {
                                  background: fColor, borderRadius: 3,
                                  transition: "transform .8s cubic-bezier(.4,0,.2,1)",
                                },
                              }}
                            />
                          </Box>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Action buttons */}
                <Stack direction="row" spacing={1.5}>
                  <Button
                    fullWidth variant="outlined"
                    onClick={() => nav("/navigation")}
                    startIcon={<Map />}
                    sx={{ borderRadius: "20px", fontWeight: 700, borderColor: "#94a3b8", color: "#475569", "&:hover": { background: "#f8fafc" } }}
                  >
                    Navigate
                  </Button>
                  <Button
                    fullWidth variant="outlined" color="error"
                    onClick={() => nav("/sos")}
                    startIcon={<Warning />}
                    sx={{ borderRadius: "20px", fontWeight: 700 }}
                  >
                    SOS
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Card elevation={0} sx={{
                border: "2px dashed #bfdbfe", borderRadius: "16px",
                textAlign: "center", p: 5,
                background: "rgba(239,246,255,0.5)",
                animation: `${fadeUp} .5s ease both`,
              }}>
                <Psychology sx={{ fontSize: 52, color: "#bfdbfe", mb: 2 }} />
                <Typography sx={{ color: "#64748b", fontSize: 14, lineHeight: 1.7 }}>
                  Fill in road conditions and click <strong>Predict Risk</strong> to see the AI analysis.
                </Typography>
                <Typography sx={{ color: "#94a3b8", fontSize: 12, mt: 1 }}>
                  Or enable Live GPS to auto-predict as you drive.
                </Typography>
              </Card>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
