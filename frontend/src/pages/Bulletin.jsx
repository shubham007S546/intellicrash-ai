/**
 * Bulletin.jsx  — Enhanced Community Accident Bulletin
 *
 * Features:
 *  • Refreshes every 20 seconds
 *  • Auto-removes reports older than 6 hours (or instantly resolved)
 *  • Zero dummy data — only real user-submitted reports shown
 *  • Pattern analysis: detects road/time/type clusters and surfaces insights
 *  • Smooth animated card entrance + live pulse indicators
 *  • Full-screen immersive layout with glassmorphism cards
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, Card, CardContent, CardActionArea,
  Grid, Chip, Stack, LinearProgress, Divider, Button, Tooltip,
  Badge, IconButton, Collapse, Alert,
} from "@mui/material";
import {
  LocationOn, AccessTime, ArrowForward, Refresh,
  TrendingUp, Warning, FilterList, Close, Insights,
  NewReleases, Speed,
} from "@mui/icons-material";
import { getReports } from "../services/api";

/* ─── constants ─────────────────────────────────────────────────── */
const REFRESH_MS     = 20_000;          // 20 seconds
const EXPIRE_MS      = 6 * 3600_000;   // 6 hours
const INSTANT_MS     = 3600_000;       // 1 hour (mark as resolved-fast)

const T = {
  en: {
    title: "Community Bulletin",
    sub:   "Live accident & hazard reports from IntelliCrash users",
    all: "All", accident: "Accidents", traffic: "Traffic",
    roadblock: "Roadblock", hazard: "Hazard",
    noReport: "No active incidents right now. Roads look clear!",
    viewDetail: "View & Contribute",
    source: "IntelliCrash Community · iRAD 2024 Data",
    patternTitle: "🔍 Live Pattern Analysis",
    refreshIn: "Next refresh in",
  },
  hi: {
    title: "समुदाय बुलेटिन",
    sub:   "इंटेलीक्रैश उपयोगकर्ताओं की लाइव दुर्घटना रिपोर्ट",
    all: "सभी", accident: "दुर्घटनाएं", traffic: "ट्रैफिक",
    roadblock: "रोडब्लॉक", hazard: "खतरा",
    noReport: "अभी कोई सक्रिय घटना नहीं। सड़कें साफ लग रही हैं!",
    viewDetail: "देखें और योगदान करें",
    source: "इंटेलीक्रैश समुदाय · iRAD 2024 डेटा",
    patternTitle: "🔍 लाइव पैटर्न विश्लेषण",
    refreshIn: "अगला रिफ्रेश",
  },
};

const TYPE_COLOR  = { accident:"#ef4444", traffic:"#f59e0b", roadblock:"#3b82f6", hazard:"#a855f7", contribution:"#22c55e" };
const TYPE_ICON   = { accident:"💥", traffic:"🚦", roadblock:"🚧", hazard:"⚠️", contribution:"💬" };
const TYPE_LABEL  = { accident:"Accident", traffic:"Traffic Jam", roadblock:"Roadblock", hazard:"Hazard", contribution:"Tip" };
const SEV_COLOR   = { severe:"#ef4444", moderate:"#f59e0b", minor:"#22c55e" };
const SEV_BG      = { severe:"#fef2f2", moderate:"#fffbeb", minor:"#f0fdf4" };

/* ─── helpers ───────────────────────────────────────────────────── */
function ageMs(ts) { return ts ? Date.now() - new Date(ts).getTime() : 0; }

function isExpired(r) {
  const age = ageMs(r.timestamp);
  if (r.resolved) return true;
  if (age > EXPIRE_MS) return true;
  return false;
}

function timeLabel(ts) {
  const diff = Math.floor(ageMs(ts) / 60_000);
  if (diff < 1)  return "Just now";
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  return `${h}h ${diff % 60}m ago`;
}

function analysePatterns(reports) {
  if (!reports.length) return [];
  const insights = [];

  // Road hotspot
  const roadCount = {};
  reports.forEach(r => { if (r.road) roadCount[r.road] = (roadCount[r.road]||0)+1; });
  const topRoad = Object.entries(roadCount).sort((a,b)=>b[1]-a[1])[0];
  if (topRoad && topRoad[1] >= 2)
    insights.push({ icon:"🛣️", text:`${topRoad[0]} has ${topRoad[1]} active incidents — exercise caution`, level:"warning" });

  // Severe cluster
  const severeCount = reports.filter(r=>r.severity==="severe").length;
  if (severeCount >= 2)
    insights.push({ icon:"🚨", text:`${severeCount} severe incidents active — consider alternate routes`, level:"error" });

  // Night-time cluster (20:00–05:00)
  const nightCount = reports.filter(r=>{
    const h = r.timestamp ? new Date(r.timestamp).getHours() : -1;
    return h >= 20 || h <= 5;
  }).length;
  if (nightCount >= 3)
    insights.push({ icon:"🌙", text:`${nightCount} incidents reported during low-visibility hours`, level:"info" });

  // Injured tally
  const totalInjured = reports.reduce((s,r)=>(s + (r.injured||0)), 0);
  if (totalInjured >= 3)
    insights.push({ icon:"🏥", text:`${totalInjured} total injuries across active reports — hospitals on alert`, level:"warning" });

  // Type surge
  const typeCounts = {};
  reports.forEach(r => { if(r.type) typeCounts[r.type] = (typeCounts[r.type]||0)+1; });
  const dominantType = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1])[0];
  if (dominantType && dominantType[1] / reports.length >= 0.5 && reports.length >= 3)
    insights.push({ icon: TYPE_ICON[dominantType[0]]||"⚠️", text:`${TYPE_LABEL[dominantType[0]]||dominantType[0]}s dominate today's reports (${Math.round(dominantType[1]/reports.length*100)}%)`, level:"info" });

  return insights;
}

/* ─── countdown component ───────────────────────────────────────── */
function RefreshCountdown({ seconds, onTick }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const id = setInterval(() => setLeft(p => { const n=p-1; onTick?.(n); return n<=0?seconds:n; }), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return (
    <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
      <Box sx={{ position:"relative", width:36, height:36 }}>
        <svg width="36" height="36" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15" fill="none" stroke="#60a5fa" strokeWidth="2.5"
            strokeDasharray={`${2*Math.PI*15}`}
            strokeDashoffset={`${2*Math.PI*15*(1-left/seconds)}`}
            style={{ transition:"stroke-dashoffset 1s linear" }} />
        </svg>
        <Typography sx={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:10, fontWeight:800, color:"#fff" }}>{left}</Typography>
      </Box>
      <Typography sx={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontWeight:600 }}>Next refresh</Typography>
    </Box>
  );
}

/* ─── report card ───────────────────────────────────────────────── */
function BulletinCard({ r, index, onClick }) {
  const clr = TYPE_COLOR[r.type] || "#6b7a99";
  const age  = ageMs(r.timestamp);
  const isNew = age < 300_000; // < 5 min

  return (
    <Card elevation={0} sx={{
      border:`1px solid ${clr}30`,
      borderRadius:3, height:"100%", overflow:"hidden",
      background:"#fff",
      animation:`cardIn 0.45s cubic-bezier(.22,.68,0,1.2) ${index*0.06}s both`,
      "@keyframes cardIn":{
        from:{ opacity:0, transform:"translateY(20px) scale(0.97)" },
        to:  { opacity:1, transform:"translateY(0) scale(1)" },
      },
      transition:"all 0.25s ease",
      "&:hover":{ boxShadow:`0 12px 32px ${clr}28`, transform:"translateY(-4px)", borderColor:`${clr}60` },
    }}>
      {/* top accent bar */}
      <Box sx={{ height:4, background:`linear-gradient(90deg,${clr},${clr}88)`,
        position:"relative", overflow:"hidden" }}>
        {isNew && (
          <Box sx={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.4)",
            animation:"shimmer 1.5s infinite",
            "@keyframes shimmer":{ "0%":{transform:"translateX(-100%)"},"100%":{transform:"translateX(200%)"} } }} />
        )}
      </Box>

      <CardActionArea onClick={onClick} sx={{ height:"100%", alignItems:"flex-start" }}>
        <CardContent sx={{ p:2, height:"100%", display:"flex", flexDirection:"column" }}>

          {/* header row */}
          <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", mb:1.5 }}>
            <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
              <Box sx={{ fontSize:22, lineHeight:1 }}>{TYPE_ICON[r.type]||"⚠️"}</Box>
              <Box>
                <Box sx={{ display:"flex", alignItems:"center", gap:0.7 }}>
                  <Typography sx={{ fontWeight:800, fontSize:13, color:"#111" }}>
                    {TYPE_LABEL[r.type] || r.type}
                  </Typography>
                  {isNew && (
                    <Chip label="NEW" size="small" sx={{ height:14, fontSize:8, fontWeight:900,
                      background:clr, color:"#fff", px:0.3 }} />
                  )}
                </Box>
                {r.severity && (
                  <Typography sx={{ fontSize:10, color:SEV_COLOR[r.severity]||"#888", fontWeight:700, letterSpacing:"0.05em" }}>
                    {r.severity.toUpperCase()}
                  </Typography>
                )}
              </Box>
            </Box>
            {r.injured > 0 && (
              <Chip label={`${r.injured} injured`} size="small"
                sx={{ background:"#fef2f2", color:"#ef4444", fontWeight:700, fontSize:10, height:18 }} />
            )}
          </Box>

          {/* location */}
          <Box sx={{ display:"flex", gap:0.6, alignItems:"flex-start", mb:0.8 }}>
            <LocationOn sx={{ fontSize:13, color:"#ef4444", mt:0.25, flexShrink:0 }} />
            <Typography sx={{ fontSize:12, color:"#374151", lineHeight:1.5, fontWeight:500 }}>
              {r.landmark || r.description?.slice(0,65) || `${r.lat?.toFixed(4)}, ${r.lon?.toFixed(4)}`}
            </Typography>
          </Box>

          {r.road && (
            <Typography sx={{ fontSize:11, color:"#6b7280", mb:0.8 }}>🛣️ {r.road}</Typography>
          )}

          {/* photo strip */}
          {r.photos?.length > 0 && (
            <Box sx={{ display:"flex", gap:0.8, mb:1.5, flexWrap:"nowrap", overflow:"hidden" }}>
              {r.photos.slice(0,3).map((ph,i) => (
                <img key={i} src={ph} alt="scene"
                  style={{ width:56, height:42, objectFit:"cover", borderRadius:6, border:"1px solid #e5e7eb", flexShrink:0 }} />
              ))}
              {r.photos.length > 3 && (
                <Box sx={{ width:56, height:42, borderRadius:6, background:"#f3f4f6",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Typography sx={{ fontSize:10, color:"#9ca3af", fontWeight:700 }}>+{r.photos.length-3}</Typography>
                </Box>
              )}
            </Box>
          )}

          <Box sx={{ flex:1 }} />
          <Divider sx={{ my:1, borderColor:"#f3f4f6" }} />

          {/* footer */}
          <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
              <Box sx={{ width:6, height:6, borderRadius:"50%", background: age<600_000?"#22c55e":"#f59e0b",
                animation: age<600_000?"pulse 2s infinite":"none",
                "@keyframes pulse":{"0%,100%":{opacity:1},"50%":{opacity:0.4}} }} />
              <Typography sx={{ fontSize:10, color:"#9ca3af" }}>{timeLabel(r.timestamp)}</Typography>
            </Box>
            <Box sx={{ display:"flex", alignItems:"center", gap:0.4, color:"#3b82f6" }}>
              <Typography sx={{ fontSize:11, fontWeight:700 }}>View & Contribute</Typography>
              <ArrowForward sx={{ fontSize:11 }} />
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

/* ─── pattern insights strip ────────────────────────────────────── */
function PatternStrip({ insights }) {
  const [show, setShow] = useState(true);
  if (!insights.length || !show) return null;
  const colors = { error:"#ef4444", warning:"#f59e0b", info:"#3b82f6" };

  return (
    <Box sx={{ mb:3, animation:"fadeDown 0.4s ease both",
      "@keyframes fadeDown":{ from:{ opacity:0, transform:"translateY(-10px)" }, to:{ opacity:1, transform:"translateY(0)" } } }}>
      <Box sx={{ background:"linear-gradient(135deg,#0f172a,#1e3a5f)", borderRadius:3, p:2.5, position:"relative", overflow:"hidden" }}>
        <Box sx={{ position:"absolute", inset:0, opacity:0.04,
          backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize:"18px 18px" }} />
        <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb:1.5, position:"relative" }}>
          <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
            <Insights sx={{ color:"#60a5fa", fontSize:18 }} />
            <Typography sx={{ fontWeight:800, fontSize:13, color:"#f0f9ff", letterSpacing:"0.04em" }}>
              LIVE PATTERN ANALYSIS
            </Typography>
          </Box>
          <IconButton size="small" onClick={()=>setShow(false)} sx={{ color:"rgba(255,255,255,0.4)", p:0.5 }}>
            <Close sx={{ fontSize:14 }} />
          </IconButton>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap:"wrap", gap:1.5, position:"relative" }}>
          {insights.map((ins,i) => (
            <Box key={i} sx={{
              display:"flex", alignItems:"flex-start", gap:0.8,
              background:`${colors[ins.level]||"#3b82f6"}18`,
              border:`1px solid ${colors[ins.level]||"#3b82f6"}35`,
              borderRadius:2, px:1.5, py:1,
            }}>
              <Typography sx={{ fontSize:14 }}>{ins.icon}</Typography>
              <Typography sx={{ fontSize:11, color:"rgba(255,255,255,0.85)", lineHeight:1.5 }}>{ins.text}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

/* ─── main component ─────────────────────────────────────────────── */
export default function Bulletin() {
  const nav  = useNavigate();
  const lang = localStorage.getItem("ic_lang") || "en";
  const t    = T[lang] || T.en;

  const [reports,  setReports]  = useState([]);   // raw from API
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");
  const [refreshTs, setRefreshTs] = useState(Date.now());
  const [newCount, setNewCount] = useState(0);
  const prevIds = useRef(new Set());

  /* fetch + expire logic */
  const fetchReports = useCallback(async () => {
    try {
      const d = await getReports();
      const all = (d.reports || []).filter(r => !isExpired(r));
      // detect new arrivals
      const newOnes = all.filter(r => !prevIds.current.has(r.id));
      setNewCount(newOnes.length);
      prevIds.current = new Set(all.map(r=>r.id));
      setReports(all);
      setRefreshTs(Date.now());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
    const id = setInterval(fetchReports, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchReports]);

  /* expire old ones locally without waiting for server */
  useEffect(() => {
    const id = setInterval(() => {
      setReports(prev => prev.filter(r => !isExpired(r)));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const filtered = filter === "all" ? reports : reports.filter(r=>r.type===filter);
  const patterns = analysePatterns(reports);

  const FILTERS = [
    ["all",       t.all,       "#6b7a99"],
    ["accident",  t.accident,  "#ef4444"],
    ["traffic",   t.traffic,   "#f59e0b"],
    ["roadblock", t.roadblock, "#3b82f6"],
    ["hazard",    t.hazard,    "#a855f7"],
  ];

  return (
    <Box sx={{ background:"#f8faff", minHeight:"calc(100vh - 58px)", fontFamily:"'DM Sans',sans-serif" }}>

      {/* ── Hero ─── */}
      <Box sx={{
        background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0c4a6e 100%)",
        py:5, px:3, position:"relative", overflow:"hidden",
      }}>
        {/* animated grid bg */}
        <Box sx={{ position:"absolute", inset:0, opacity:0.06,
          backgroundImage:"linear-gradient(rgba(255,255,255,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.3) 1px,transparent 1px)",
          backgroundSize:"40px 40px" }} />
        {/* moving glow orbs */}
        <Box sx={{ position:"absolute", width:300, height:300, borderRadius:"50%",
          background:"radial-gradient(circle,#3b82f640,transparent 70%)",
          top:-80, right:-60,
          animation:"orb 8s ease-in-out infinite",
          "@keyframes orb":{ "0%,100%":{transform:"translate(0,0)"},"50%":{transform:"translate(-20px,20px)"} } }} />

        <Container maxWidth="lg" sx={{ position:"relative" }}>
          <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:2 }}>
            <Box>
              <Box sx={{ display:"flex", alignItems:"center", gap:1.5, mb:1 }}>
                <Box sx={{ width:10, height:10, borderRadius:"50%", background:"#22c55e",
                  boxShadow:"0 0 0 3px #22c55e30",
                  animation:"livePulse 2s infinite",
                  "@keyframes livePulse":{"0%,100%":{boxShadow:"0 0 0 3px #22c55e30"},"50%":{boxShadow:"0 0 0 8px #22c55e10"}} }} />
                <Typography sx={{ fontSize:11, color:"#86efac", fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                  Live · Auto-refresh every 20s
                </Typography>
              </Box>
              <Typography variant="h4" sx={{
                fontFamily:"'Syne',sans-serif", fontWeight:900, color:"#f0f9ff",
                fontSize:{ xs:26, md:34 }, mb:0.5,
              }}>
                📡 {t.title}
              </Typography>
              <Typography sx={{ color:"rgba(240,249,255,0.65)", fontSize:14 }}>{t.sub}</Typography>
              <Typography sx={{ color:"rgba(240,249,255,0.35)", fontSize:11, mt:0.5 }}>{t.source}</Typography>
            </Box>

            <Box sx={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:1 }}>
              <RefreshCountdown seconds={REFRESH_MS/1000} />
              <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                {newCount > 0 && (
                  <Chip label={`+${newCount} new`} size="small"
                    sx={{ background:"#22c55e", color:"#fff", fontWeight:800, fontSize:10,
                      animation:"bounce 0.5s ease",
                      "@keyframes bounce":{ "0%,100%":{transform:"scale(1)"},"50%":{transform:"scale(1.1)"} } }} />
                )}
                <Chip label={`${reports.length} active`} size="small"
                  sx={{ background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.85)", fontWeight:700, fontSize:11 }} />
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py:3.5 }}>

        {/* Pattern insights */}
        <PatternStrip insights={patterns} />

        {/* Filter bar */}
        <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb:3, flexWrap:"wrap", gap:1.5 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap:"wrap", gap:1 }}>
            {FILTERS.map(([val,lbl,clr]) => (
              <Chip key={val} label={lbl} onClick={()=>setFilter(val)}
                sx={{
                  fontWeight:700, cursor:"pointer", fontSize:12,
                  background: filter===val ? clr : "transparent",
                  color: filter===val ? "#fff" : clr,
                  border:`1.5px solid ${clr}`,
                  transition:"all 0.2s",
                  "&:hover":{ background:`${clr}18` },
                  ...(filter===val && { boxShadow:`0 4px 12px ${clr}40` }),
                }} />
            ))}
          </Stack>
          <Chip label={`${filtered.length} showing`} variant="outlined"
            sx={{ fontWeight:700, borderColor:"#e2e8f0", color:"#64748b" }} />
        </Box>

        {loading && (
          <LinearProgress sx={{ mb:3, borderRadius:4, height:3,
            "& .MuiLinearProgress-bar":{ background:"linear-gradient(90deg,#3b82f6,#0891b2)" } }} />
        )}

        {/* Empty state — no dummy data */}
        {!loading && filtered.length === 0 && (
          <Box sx={{
            textAlign:"center", py:10,
            background:"linear-gradient(135deg,#f8faff,#eff6ff)",
            borderRadius:4, border:"2px dashed #dbeafe",
            animation:"fadeIn 0.5s ease",
            "@keyframes fadeIn":{ from:{opacity:0}, to:{opacity:1} },
          }}>
            <Typography sx={{ fontSize:52, mb:2 }}>
              {filter==="all" ? "📡" : TYPE_ICON[filter]||"📡"}
            </Typography>
            <Typography sx={{ color:"#374151", fontWeight:700, fontSize:16, mb:0.5 }}>
              {filter==="all" ? "All clear on HP roads!" : `No active ${TYPE_LABEL[filter]||filter} reports`}
            </Typography>
            <Typography sx={{ color:"#9ca3af", fontSize:13 }}>{t.noReport}</Typography>
          </Box>
        )}

        {/* Cards grid */}
        <Grid container spacing={2.5}>
          {filtered.map((r,i) => (
            <Grid item xs={12} sm={6} md={4} key={r.id}>
              <BulletinCard r={r} index={i} onClick={()=>nav(`/accident/${r.id}`)} />
            </Grid>
          ))}
        </Grid>

        {/* Live notice */}
        {!loading && reports.length > 0 && (
          <Box sx={{ textAlign:"center", mt:4 }}>
            <Typography sx={{ fontSize:11, color:"#9ca3af" }}>
              Reports auto-expire after 6 hours or when resolved · Last updated {new Date(refreshTs).toLocaleTimeString()}
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
}
