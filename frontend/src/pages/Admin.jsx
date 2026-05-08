/**
 * Admin.jsx — IntelliCrash Admin v3.1 (Light Theme)
 * ✅ FIX: tab === 7 for Data Mining (was 6 — triggered on Hotspots)
 * ✅ FIX: Full light theme — white/gray bg, dark text, clean cards
 * ✅ FIX: All JSX syntax errors resolved — complete file
 * ✅ All 8 tabs: Analytics, Sentiment, Database, Tools, RF Model, XAI, Hotspots, Data Mining
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, Card, CardContent, Grid, Chip,
  LinearProgress, Button, Stack, Tabs, Tab, Table, TableHead,
  TableBody, TableRow, TableCell, TextField, Alert, Tooltip,
  IconButton, CircularProgress, Badge,
} from "@mui/material";
import {
  Download, Refresh, Warning, TrendingUp, Analytics,
  Shield, People, Logout, Delete, Speed, Psychology,
  AutoGraph, Lightbulb,
} from "@mui/icons-material";
import { createClient } from "@supabase/supabase-js";
import {
  getStats, getReports, getSessions, getContacts, getSOSAlerts,
} from "../services/api";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase      = createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_EMAILS  = ["shubhamabhi004@gmail.com"];

const RC = (s) => s >= 67 ? "#dc2626" : s >= 34 ? "#d97706" : "#16a34a";
const RISK_COLOR = { HIGH: "#dc2626", MEDIUM: "#d97706", LOW: "#16a34a" };
const RISK_BG    = { HIGH: "#fef2f2", MEDIUM: "#fffbeb", LOW: "#f0fdf4" };

// ─── Design tokens ──────────────────────────────────────────────────────────
const T = {
  bg:        "#f4f6fa",
  card:      "#ffffff",
  border:    "#e2e8f0",
  header:    "#1e293b",
  sub:       "#64748b",
  accent:    "#2563eb",
  accentBg:  "#eff6ff",
  text:      "#0f172a",
  muted:     "#94a3b8",
  danger:    "#dc2626",
  success:   "#16a34a",
  warning:   "#d97706",
};

// ─── Hour Heatmap ─────────────────────────────────────────────────────────
function HourHeatmap({ data }) {
  const max = Math.max(...data, 1);
  return (
    <Box>
      <Box sx={{ display:"flex", gap:0.4, flexWrap:"wrap" }}>
        {data.map((count, h) => {
          const intensity = count / max;
          return (
            <Tooltip key={h} title={`${h}:00 — ${count} incidents`}>
              <Box sx={{ width:28, height:28, borderRadius:1, cursor:"default",
                background: count === 0 ? "#f1f5f9" : `rgba(37,99,235,${0.1 + intensity * 0.88})`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Typography sx={{ fontSize:8, color: count > max * 0.5 ? "#fff" : T.muted, fontWeight:700 }}>{h}</Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      <Typography sx={{ fontSize:10, color:T.muted, mt:0.5 }}>Hour (0–23) · Darker = more incidents</Typography>
    </Box>
  );
}

// ─── Mini Bar Chart ────────────────────────────────────────────────────────
function MiniBar({ data, color = T.accent, height = 80 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <Box sx={{ display:"flex", alignItems:"flex-end", gap:0.5, height }}>
      {data.map((d, i) => (
        <Box key={i} sx={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:0.3 }}>
          <Box sx={{ width:"100%", background:color, borderRadius:"2px 2px 0 0", minHeight: d.value > 0 ? 2 : 0,
            height:`${(d.value / max) * height * 0.8}px`, transition:"height 0.5s" }} />
          <Typography sx={{ fontSize:8, color:T.muted, textAlign:"center" }}>{d.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}

// ─── Sentiment Donut ────────────────────────────────────────────────────────
function SentimentDonut({ breakdown = [] }) {
  const get = (l) => breakdown.find(b => b.sentiment === l)?.count || 0;
  const positive = get("positive"), neutral = get("neutral"), negative = get("negative");
  const total = positive + neutral + negative || 1;
  const posP = Math.round((positive / total) * 100);
  const neuP = Math.round((neutral  / total) * 100);
  const negP = 100 - posP - neuP;
  const circ = 301.6;
  return (
    <Box sx={{ display:"flex", gap:3, alignItems:"center", flexWrap:"wrap" }}>
      <Box sx={{ position:"relative", width:120, height:120, flexShrink:0 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" strokeWidth="16"/>
          {positive > 0 && <circle cx="60" cy="60" r="48" fill="none" stroke={T.success} strokeWidth="16"
            strokeDasharray={`${(positive/total)*circ} ${circ}`} strokeDashoffset="75.4"/>}
          {neutral > 0 && <circle cx="60" cy="60" r="48" fill="none" stroke={T.warning} strokeWidth="16"
            strokeDasharray={`${(neutral/total)*circ} ${circ}`} strokeDashoffset={`${75.4-(positive/total)*circ}`}/>}
          {negative > 0 && <circle cx="60" cy="60" r="48" fill="none" stroke={T.danger} strokeWidth="16"
            strokeDasharray={`${(negative/total)*circ} ${circ}`} strokeDashoffset={`${75.4-((positive+neutral)/total)*circ}`}/>}
          <text x="60" y="55" textAnchor="middle" fontSize="20" fontWeight="800" fill={T.text}>{posP}%</text>
          <text x="60" y="70" textAnchor="middle" fontSize="9" fill={T.muted}>positive</text>
        </svg>
      </Box>
      <Box sx={{ flex:1 }}>
        {[{label:"😊 Positive",count:positive,color:T.success,pct:posP},{label:"😐 Neutral",count:neutral,color:T.warning,pct:neuP},{label:"😞 Negative",count:negative,color:T.danger,pct:negP}].map(s => (
          <Box key={s.label} sx={{ mb:1.2 }}>
            <Box sx={{ display:"flex", justifyContent:"space-between", mb:0.4 }}>
              <Typography sx={{ fontSize:12, fontWeight:600, color:T.text }}>{s.label}</Typography>
              <Typography sx={{ fontSize:12, fontWeight:800, color:s.color }}>{s.count} ({s.pct}%)</Typography>
            </Box>
            <LinearProgress variant="determinate" value={s.pct} sx={{ height:6, borderRadius:3, background:"#f1f5f9",
              "& .MuiLinearProgress-bar":{ background:s.color, borderRadius:3 } }}/>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Feature Bar ─────────────────────────────────────────────────────────
function FeatureBar({ name, pct, icon, note, rank }) {
  const colors = ["#2563eb","#7c3aed","#0891b2","#0d9488","#16a34a","#65a30d","#d97706","#dc2626","#9f1239","#6b21a8"];
  const c = colors[rank % colors.length];
  return (
    <Box sx={{ mb:1.5 }}>
      <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:0.3 }}>
        <Box sx={{ display:"flex", alignItems:"center", gap:0.8 }}>
          <Typography sx={{ fontSize:13 }}>{icon}</Typography>
          <Typography sx={{ fontSize:12, fontWeight:700, color:T.text }}>{name}</Typography>
        </Box>
        <Typography sx={{ fontSize:12, fontWeight:900, color:c }}>{pct.toFixed(1)}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={Math.min(pct, 100)}
        sx={{ height:8, borderRadius:4, background:"#f1f5f9",
          "& .MuiLinearProgress-bar":{ background:`linear-gradient(90deg,${c},${c}99)`, borderRadius:4 } }}/>
      {note && <Typography sx={{ fontSize:10, color:T.muted, mt:0.2 }}>{note}</Typography>}
    </Box>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────
function InsightCard({ icon, title, value, detail, color, severity = "info" }) {
  const bg = { critical:"#fef2f2", warning:"#fffbeb", success:"#f0fdf4", info:"#eff6ff" }[severity];
  const bc = { critical:"#fecaca", warning:"#fde68a", success:"#bbf7d0", info:"#bfdbfe" }[severity];
  return (
    <Card elevation={0} sx={{ border:`1px solid ${bc}`, borderRadius:3, background:bg, mb:1.5 }}>
      <CardContent sx={{ py:1.5, px:2, "&:last-child":{ pb:1.5 } }}>
        <Box sx={{ display:"flex", alignItems:"flex-start", gap:1.5 }}>
          <Typography sx={{ fontSize:22, mt:0.2 }}>{icon}</Typography>
          <Box sx={{ flex:1 }}>
            <Typography sx={{ fontSize:12, fontWeight:800, color:T.text, mb:0.3 }}>{title}</Typography>
            <Typography sx={{ fontSize:20, fontWeight:900, color, lineHeight:1.1, mb:0.3 }}>{value}</Typography>
            <Typography sx={{ fontSize:11, color:T.sub }}>{detail}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, color, bg, icon }) {
  return (
    <Card elevation={0} sx={{ border:`1px solid ${color}22`, borderRadius:3, textAlign:"center", overflow:"hidden", background:T.card }}>
      <Box sx={{ height:3, background:color }} />
      <CardContent sx={{ py:1.5, px:1 }}>
        <Box sx={{ color, mb:0.5, "& svg":{ fontSize:18 } }}>{icon}</Box>
        <Typography sx={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color, lineHeight:1 }}>{value}</Typography>
        <Typography sx={{ fontSize:10, color:T.muted, mt:0.3 }}>{label}</Typography>
      </CardContent>
    </Card>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────
function SCard({ title, children, action }) {
  return (
    <Card elevation={0} sx={{ border:`1px solid ${T.border}`, borderRadius:3, background:T.card }}>
      <CardContent>
        {(title || action) && (
          <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2 }}>
            {title && <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:T.header, fontSize:14 }}>{title}</Typography>}
            {action}
          </Box>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN ADMIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function Admin() {
  const nav = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [adminUser,   setAdminUser]   = useState(null);
  const [tab,         setTab]         = useState(0);
  const [analytics,   setAnalytics]   = useState(null);
  const [adminStats,  setAdminStats]  = useState(null);
  const [alerts,      setAlerts]      = useState([]);
  const [reports,     setReports]     = useState([]);
  const [sessions,    setSessions]    = useState([]);
  const [contacts,    setContacts]    = useState([]);
  const [features,    setFeatures]    = useState({});
  const [xaiData,     setXaiData]     = useState(null);
  const [xaiExplain,  setXaiExplain]  = useState(null);
  const [xaiLoading,  setXaiLoading]  = useState(false);
  const [reviews,     setReviews]     = useState([]);
  const [sentStats,   setSentStats]   = useState(null);
  const [mlHotspots,  setMlHotspots]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [importMsg,   setImportMsg]   = useState(null);
  const [search,      setSearch]      = useState("");
  const [dbTab,       setDbTab]       = useState(0);
  const [deleteMsg,   setDeleteMsg]   = useState(null);
  const [insights,    setInsights]    = useState([]);
  const [insightLoading, setInsightLoading] = useState(false);
  const [hotspotFilter, setHotspotFilter] = useState("ALL");
  const fileRef = useRef(null);

  // ── Auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (!user || !ADMIN_EMAILS.includes(user.email)) nav("/admin-login", { replace: true });
      else { setAdminUser(user); setAuthChecked(true); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const user = session?.user;
      if (!user || !ADMIN_EMAILS.includes(user.email)) nav("/admin-login", { replace: true });
      else { setAdminUser(user); setAuthChecked(true); }
    });
    return () => listener?.subscription?.unsubscribe();
  }, [nav]);

  const handleLogout = async () => { await supabase.auth.signOut(); nav("/admin-login"); };

  // ── Data load ─────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const [st, al, rp, se, co] = await Promise.allSettled([
        getStats(), getSOSAlerts(), getReports(), getSessions(), getContacts(),
      ]);
      if (st.status === "fulfilled") setAnalytics(st.value);
      if (al.status === "fulfilled") setAlerts(al.value?.alerts || []);
      if (rp.status === "fulfilled") setReports(rp.value?.reports || []);
      if (se.status === "fulfilled") setSessions(se.value?.sessions || []);
      if (co.status === "fulfilled") setContacts(co.value?.contacts || []);

      try { const as = await fetch("/api/admin/stats").then(r => r.json()); setAdminStats(as); } catch {}
      try {
        const fi = await fetch("/api/feature_importances").then(r => r.json());
        setFeatures(fi?.feature_importances || {}); setXaiData(fi);
      } catch {}
      try {
        const [rv, ss] = await Promise.all([
          fetch("/api/reviews/all").then(r => r.json()),
          fetch("/api/reviews/stats").then(r => r.json()),
        ]);
        setReviews(rv?.reviews || []); setSentStats(ss);
      } catch {}
      try {
        const ml = await fetch("/api/hotspots/ml").then(r => r.json());
        setMlHotspots(ml?.hotspots || []);
      } catch {
        try { const dyn = await fetch("/api/hotspots/dynamic").then(r => r.json()); setMlHotspots(dyn?.hotspots || []); } catch {}
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (authChecked) load(); }, [authChecked]);

  // ── Data Mining ───────────────────────────────────────────────────────
  const generateInsights = async () => {
    setInsightLoading(true);
    const computed = [];
    try {
      if (analytics?.hour_distribution) {
        const hours = analytics.hour_distribution;
        const maxH = hours.indexOf(Math.max(...hours));
        const nightTotal = hours.slice(20).reduce((a,b)=>a+b,0) + hours.slice(0,4).reduce((a,b)=>a+b,0);
        const dayTotal   = hours.slice(8,18).reduce((a,b)=>a+b,0) || 1;
        computed.push({ icon:"🕐", title:"Peak Incident Hour", severity:"warning", value:`${maxH}:00 – ${maxH+1}:00`,
          detail:`Night (8PM–4AM): ${nightTotal} vs Day (8AM–6PM): ${dayTotal}. ${nightTotal > dayTotal ? "Night driving is significantly more dangerous." : "Daytime traffic causes most incidents."}`, color:T.warning });
      }
      if (sentStats?.total > 0) {
        const negPct = sentStats.breakdown?.find(b=>b.sentiment==="negative")?.pct || 0;
        const posPct = sentStats.positive_pct || 0;
        computed.push({ icon: posPct >= 70 ? "😊" : posPct >= 50 ? "😐" : "😞", title:"Driver Satisfaction Score",
          severity: posPct >= 70 ? "success" : posPct >= 50 ? "info" : "critical", value:`${posPct}% Positive`,
          detail:`${sentStats.total} reviews analyzed. ${negPct}% negative. ${posPct >= 70 ? "Drivers are highly satisfied!" : negPct > 20 ? "High negative — investigate complaints." : "Moderate satisfaction."}`,
          color: posPct >= 70 ? T.success : posPct >= 50 ? T.accent : T.danger });
      }
      if (mlHotspots.length > 0) {
        const highRisk = mlHotspots.filter(h => h.risk === "HIGH" || h.risk_level === 2).length;
        const districts = {};
        mlHotspots.forEach(h => { if (h.district) districts[h.district] = (districts[h.district]||0)+1; });
        const topDist = Object.entries(districts).sort((a,b)=>b[1]-a[1])[0];
        computed.push({ icon:"🗺️", title:"Hotspot Risk Distribution", severity: highRisk > 10 ? "critical" : "warning",
          value:`${highRisk} HIGH-risk zones`,
          detail:`${mlHotspots.length} total hotspots. ${topDist ? `Most dense district: ${topDist[0]} (${topDist[1]}).` : ""} ${highRisk > mlHotspots.length * 0.5 ? "⚠️ Over 50% HIGH risk — emergency action needed." : ""}`,
          color:T.danger });
      }
      if (sessions.length > 5) {
        const recent5 = sessions.slice(0,5).map(s=>s.driver_score||0);
        const older   = sessions.slice(5,15).map(s=>s.driver_score||0);
        const recentAvg = recent5.reduce((a,b)=>a+b,0)/recent5.length;
        const olderAvg  = older.length > 0 ? older.reduce((a,b)=>a+b,0)/older.length : recentAvg;
        const trend = recentAvg - olderAvg;
        computed.push({ icon: trend > 5 ? "📈" : trend < -5 ? "📉" : "➡️", title:"Driver Score Trend",
          severity: trend > 5 ? "success" : trend < -5 ? "warning" : "info", value:`${recentAvg.toFixed(1)}/100 avg`,
          detail:`${Math.abs(trend).toFixed(1)}pt ${trend >= 0 ? "improvement" : "decline"} vs previous. ${sessions.length} sessions.`,
          color: trend > 0 ? T.success : T.danger });
      }
      if (alerts.length > 0) {
        const highSOS = alerts.filter(a => a.severity === "3" || parseFloat(a.risk_score) >= 67).length;
        const pct = Math.round(highSOS/alerts.length*100);
        computed.push({ icon:"🚨", title:"SOS Severity Analysis", severity: pct > 40 ? "critical" : "warning",
          value:`${highSOS} critical (${pct}%)`,
          detail:`${alerts.length} SOS total. ${pct > 40 ? "Abnormally high critical rate — consider speed enforcement." : "Normal distribution."}`,
          color:T.danger });
      }
      if (analytics?.type_distribution) {
        const types = analytics.type_distribution;
        const topType = Object.entries(types).sort((a,b)=>b[1]-a[1])[0];
        const total = Object.values(types).reduce((a,b)=>a+b,0) || 1;
        if (topType) computed.push({ icon:"📊", title:"Dominant Report Category", severity:"info",
          value:`${topType[0]} (${Math.round(topType[1]/total*100)}%)`,
          detail:`${topType[1]}/${total} reports are "${topType[0]}". Focus infrastructure improvements here.`,
          color:T.accent });
      }
      if (xaiData?.ranked?.length > 0) {
        const top = xaiData.ranked[0]; const modelLoaded = xaiData.rf_loaded;
        computed.push({ icon: modelLoaded ? "🌲" : "⚠️", title:"ML Model Status",
          severity: modelLoaded ? "success" : "critical",
          value: modelLoaded ? `RF Loaded — ${xaiData.total_features} features` : "Model Not Loaded",
          detail: modelLoaded ? `Top predictor: ${top.label} (${top["importance_%"]}%). ${xaiData.n_estimators || 300} trees.` : "Place best_random_forest_model.pkl in python/ to enable.",
          color: modelLoaded ? T.success : T.danger });
      }
      if (contacts.length > 0) {
        const hasEmail = contacts.filter(c=>c.email && c.email.includes("@")).length;
        computed.push({ icon:"📞", title:"Emergency Contact Coverage", severity: hasEmail < 2 ? "warning" : "success",
          value:`${contacts.length} contacts (${hasEmail} email)`,
          detail:`${hasEmail} can receive SOS email alerts. ${hasEmail < 2 ? "Add more email contacts." : "Good coverage."}`,
          color:"#0891b2" });
      }
    } catch(e) { console.error("Insights error:", e); }
    setInsights(computed); setInsightLoading(false);
  };

  // ── Tab 7 = Data Mining ────────────────────────────────────────────────
  useEffect(() => {
    if (authChecked && !loading && tab === 7) generateInsights();
  }, [tab, loading, authChecked]);

  // ── XAI Test ──────────────────────────────────────────────────────────
  const runXaiExplain = async () => {
    setXaiLoading(true);
    try {
      const r = await fetch("/api/xai/explain", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ weather:"1", roadType:"1", timeOfDay:"3", areaType:"0", dayOfWeek:"5",
          roadCondition:"1", vehicleType:"0", lightCondition:"1", criticalZone:"1", speed:90, vehicles:3, visibility:500 }) });
      setXaiExplain(await r.json());
    } catch {}
    setXaiLoading(false);
  };

  const handleCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const form = new FormData(); form.append("file", file);
    try {
      const r = await fetch("/api/hotspots/import", { method:"POST", body:form });
      const d = await r.json();
      setImportMsg(`✅ Imported ${d.imported} hotspots${d.skipped > 0 ? `, skipped ${d.skipped}` : ""}`);
    } catch (err) { setImportMsg(`❌ ${err.message}`); }
    setTimeout(() => setImportMsg(null), 6000); e.target.value = "";
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm("Delete this review permanently?")) return;
    try {
      const r = await fetch(`/api/reviews/${id}`, { method:"DELETE" });
      if (r.ok) {
        setReviews(prev => prev.filter(rv => rv.id !== id));
        setDeleteMsg("✅ Review deleted");
        const ss = await fetch("/api/reviews/stats").then(r => r.json()); setSentStats(ss);
      } else setDeleteMsg("❌ Could not delete");
    } catch { setDeleteMsg("❌ Network error"); }
    setTimeout(() => setDeleteMsg(null), 3000);
  };

  const exportCSV = (data, fn) => {
    if (!data.length) return;
    const cols = Object.keys(data[0]);
    const csv = [cols.join(","), ...data.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    a.download = fn; a.click();
  };

  const positivePct = adminStats?.positive_pct != null ? `${adminStats.positive_pct}%`
    : (sentStats?.positive_pct != null ? `${sentStats.positive_pct}%` : "—");

  const SC = [
    { label:"SOS Total",      value:adminStats?.sos_total      ?? alerts.length,   color:T.danger,   icon:<Warning/>    },
    { label:"Reports Active", value:adminStats?.reports_active  ?? reports.length,  color:T.warning,  icon:<Analytics/>  },
    { label:"Sessions",       value:adminStats?.sessions_total  ?? sessions.length, color:T.success,  icon:<TrendingUp/> },
    { label:"Avg Driver",     value:adminStats?.avg_driver_score ?? 0,              color:T.accent,   icon:<Shield/>     },
    { label:"High Risk SOS",  value:adminStats?.sos_active      ?? 0,              color:"#b91c1c",  icon:<Warning/>    },
    { label:"Reviews",        value:adminStats?.reviews_total   ?? reviews.length,  color:"#7c3aed",  icon:<Analytics/>  },
    { label:"Positive %",     value:positivePct,                                    color:T.success,  icon:<TrendingUp/> },
    { label:"Contacts",       value:contacts.length,                                color:"#0891b2",  icon:<People/>     },
  ];

  const typeData = Object.entries(analytics?.type_distribution || {}).map(([k,v]) => ({ label:k.slice(0,6), value:v }));
  const DB_TABS = [
    { label:`🚨 SOS (${alerts.length})`,       data:alerts,    fn:"sos.csv"      },
    { label:`📡 Reports (${reports.length})`,   data:reports,   fn:"reports.csv"  },
    { label:`🚗 Sessions (${sessions.length})`, data:sessions,  fn:"sessions.csv" },
    { label:`👤 Contacts (${contacts.length})`, data:contacts,  fn:"contacts.csv" },
    { label:`💬 Reviews (${reviews.length})`,   data:reviews,   fn:"reviews.csv"  },
  ];
  const TABS = ["📊 Analytics","💬 Sentiment","📋 Database","🔧 Tools","🌲 RF Model","🧠 XAI","🗺️ Hotspots","💡 Data Mining"];

  const sentimentBadge = (label) => {
    const cfg = {
      positive:{ color:T.success, bg:"#dcfce7", icon:"😊" },
      negative:{ color:T.danger,  bg:"#fef2f2", icon:"😞" },
      neutral: { color:T.warning, bg:"#fef3c7", icon:"😐" },
    }[label] || { color:T.muted, bg:"#f1f5f9", icon:"🤔" };
    return (
      <Box sx={{ display:"inline-flex", alignItems:"center", gap:0.4, background:cfg.bg, borderRadius:10, px:1, py:0.2 }}>
        <Typography sx={{ fontSize:11 }}>{cfg.icon}</Typography>
        <Typography sx={{ fontSize:10, fontWeight:700, color:cfg.color, textTransform:"capitalize" }}>{label || "—"}</Typography>
      </Box>
    );
  };

  const getBC = (l) => sentStats?.breakdown?.find(b => b.sentiment === l)?.count ?? 0;
  const filteredHotspots = mlHotspots.filter(h => {
    if (hotspotFilter === "ALL") return true;
    return h.risk === hotspotFilter || h.risk_label === hotspotFilter ||
      (hotspotFilter==="HIGH" && h.risk_level===2) || (hotspotFilter==="MEDIUM" && h.risk_level===1) || (hotspotFilter==="LOW" && h.risk_level===0);
  });

  if (!authChecked) return (
    <Box sx={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:T.bg }}>
      <LinearProgress sx={{ width:300, borderRadius:4 }} />
    </Box>
  );

  return (
    <Box sx={{ background:T.bg, minHeight:"calc(100vh - 58px)" }}>

      {/* ── Header ── */}
      <Box sx={{ background:T.card, borderBottom:`1px solid ${T.border}`, py:2, px:3, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
        <Container maxWidth="xl">
          <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:T.header, display:"flex", alignItems:"center", gap:1 }}>
                🛡️ IntelliCrash Admin
                <Chip label="v3.1" size="small" sx={{ fontWeight:700, background:T.accentBg, color:T.accent, fontSize:10 }}/>
              </Typography>
              <Typography sx={{ color:T.sub, fontSize:12 }}>
                {adminUser?.email} · Full Access · {TABS.length} modules
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Button onClick={() => nav("/admin/risk-analysis")} startIcon={<Speed/>} variant="outlined" size="small"
                sx={{ borderColor:"#f97316", color:"#f97316", borderRadius:20, fontWeight:700, textTransform:"none",
                  "&:hover":{ background:"rgba(249,115,22,0.06)", borderColor:"#f97316" } }}>⚡ Risk Analysis</Button>
              <Button onClick={load} startIcon={<Refresh/>} variant="outlined" size="small"
                sx={{ borderColor:T.border, color:T.sub, borderRadius:20, textTransform:"none",
                  "&:hover":{ background:T.bg } }}>Refresh</Button>
              <Button onClick={handleLogout} startIcon={<Logout/>} variant="outlined" size="small"
                sx={{ borderColor:"#fca5a5", color:T.danger, borderRadius:20, textTransform:"none",
                  "&:hover":{ background:"#fef2f2", borderColor:T.danger } }}>Logout</Button>
              <Button onClick={() => nav("/")} variant="contained" size="small"
                sx={{ borderRadius:20, fontWeight:700, textTransform:"none", background:T.accent,
                  "&:hover":{ background:"#1d4ed8" } }}>← App</Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py:3 }}>
        {loading && <LinearProgress sx={{ mb:2, borderRadius:4 }} />}
        {importMsg && <Alert severity={importMsg.startsWith("✅") ? "success" : "error"} sx={{ mb:2, borderRadius:2 }}>{importMsg}</Alert>}
        {deleteMsg && <Alert severity={deleteMsg.startsWith("✅") ? "success" : "error"} sx={{ mb:2, borderRadius:2 }}>{deleteMsg}</Alert>}

        {/* Risk Analysis Banner */}
        <Box sx={{ mb:3, p:2, background:"linear-gradient(135deg,#fff7ed,#fef2f2)", border:"1px solid #fed7aa", borderRadius:3,
          display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:2 }}>
          <Box>
            <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:T.header }}>⚡ Risk Analysis Dashboard</Typography>
            <Typography sx={{ fontSize:12, color:T.sub, mt:0.3 }}>Simulate road risk scenarios · Test ML model · Analyze hotspot behavior</Typography>
          </Box>
          <Button onClick={() => nav("/admin/risk-analysis")} variant="contained" startIcon={<Speed/>} size="small"
            sx={{ borderRadius:20, fontWeight:700, textTransform:"none", background:"linear-gradient(135deg,#f97316,#ef4444)",
              boxShadow:"0 4px 12px rgba(249,115,22,0.3)" }}>
            Open Risk Analysis
          </Button>
        </Box>

        {/* Stats row */}
        <Grid container spacing={1.5} sx={{ mb:3 }}>
          {SC.map(s => (
            <Grid item xs={6} sm={3} md={1.5} key={s.label}>
              <StatCard {...s}/>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Box sx={{ background:T.card, borderRadius:3, border:`1px solid ${T.border}`, mb:2, overflow:"hidden" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
            sx={{ "& .MuiTab-root":{ fontWeight:700, textTransform:"none", fontSize:11, minWidth:90, color:T.sub },
              "& .Mui-selected":{ color:`${T.accent} !important` },
              "& .MuiTabs-indicator":{ background:T.accent, height:3 } }}>
            {TABS.map((l, i) => <Tab key={i} label={l}/>)}
          </Tabs>
        </Box>

        {/* ══ TAB 0: ANALYTICS ══ */}
        {tab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <SCard title="🕐 Incident Hour Distribution">
                {analytics?.hour_distribution ? <HourHeatmap data={analytics.hour_distribution}/> : <Typography sx={{ color:T.muted, fontSize:13 }}>No data yet</Typography>}
              </SCard>
            </Grid>
            <Grid item xs={12} md={2.5}>
              <SCard title="📊 Report Types">
                {typeData.length > 0 ? <MiniBar data={typeData} color={T.danger} height={90}/> : <Typography sx={{ color:T.muted, fontSize:12 }}>No reports yet</Typography>}
              </SCard>
            </Grid>
            <Grid item xs={12} md={2.5}>
              <SCard title="📈 SOS Risk Trend">
                {analytics?.risk_trend?.slice(0,8).map((r,i) => (
                  <Box key={i} sx={{ display:"flex", justifyContent:"space-between", py:0.5, borderBottom:`1px solid ${T.border}` }}>
                    <Typography sx={{ fontSize:10, color:T.muted }}>{r.ts}</Typography>
                    <Typography sx={{ fontSize:11, fontWeight:700, color:RC(r.score) }}>{r.score?.toFixed(0)}</Typography>
                  </Box>
                )) || <Typography sx={{ color:T.muted, fontSize:12 }}>No SOS data</Typography>}
              </SCard>
            </Grid>
            <Grid item xs={12}>
              <SCard title="🔴 Learned Hotspots">
                {analytics?.top_hotspots?.length > 0 ? (
                  <Box sx={{ overflowX:"auto", border:`1px solid ${T.border}`, borderRadius:2 }}>
                    <Table size="small">
                      <TableHead><TableRow sx={{ background:"#fef2f2" }}>
                        {["#","Lat","Lon","Reports","Avg Sev","Risk"].map(h => <TableCell key={h} sx={{ fontWeight:700, fontSize:11, color:T.danger }}>{h}</TableCell>)}
                      </TableRow></TableHead>
                      <TableBody>
                        {analytics.top_hotspots.map((h,i) => (
                          <TableRow key={i} sx={{ "&:hover":{ background:"#fef2f2" } }}>
                            <TableCell sx={{ fontSize:12 }}>{i+1}</TableCell>
                            <TableCell sx={{ fontSize:11, fontFamily:"monospace" }}>{h.lat?.toFixed(5)}</TableCell>
                            <TableCell sx={{ fontSize:11, fontFamily:"monospace" }}>{h.lon?.toFixed(5)}</TableCell>
                            <TableCell sx={{ fontSize:12, fontWeight:700 }}>{h.report_count}</TableCell>
                            <TableCell sx={{ fontSize:12 }}>{h.avg_severity?.toFixed(1)}/3</TableCell>
                            <TableCell><Chip label={h.avg_severity>=2.5?"HIGH":"MEDIUM"} size="small"
                              sx={{ fontWeight:700, fontSize:10, background:h.avg_severity>=2.5?RISK_BG.HIGH:RISK_BG.MEDIUM, color:h.avg_severity>=2.5?RISK_COLOR.HIGH:RISK_COLOR.MEDIUM }}/></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ) : <Alert severity="info" sx={{ borderRadius:2, fontSize:12 }}>No learned hotspots yet. Appear after 2+ community reports at same location.</Alert>}
              </SCard>
            </Grid>
          </Grid>
        )}

        {/* ══ TAB 1: SENTIMENT ══ */}
        {tab === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <SCard title="🧠 NLP Sentiment Overview">
                {sentStats?.breakdown?.length > 0 ? <SentimentDonut breakdown={sentStats.breakdown}/> : <Alert severity="info" sx={{ borderRadius:2, fontSize:12 }}>No reviews yet.</Alert>}
              </SCard>
            </Grid>
            <Grid item xs={12} md={7}>
              <SCard title="📋 Sentiment Insights">
                {sentStats && sentStats.total > 0 ? (
                  <Box>
                    <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1.5, mb:2 }}>
                      {[{label:"Total Reviews",value:sentStats.total,color:T.accent},{label:"Positive",value:getBC("positive"),color:T.success},{label:"Negative",value:getBC("negative"),color:T.danger},{label:"Neutral",value:getBC("neutral"),color:T.warning}].map(s => (
                        <Box key={s.label} sx={{ p:1.5, background:T.bg, borderRadius:2, textAlign:"center", border:`1px solid ${T.border}` }}>
                          <Typography sx={{ fontWeight:900, fontSize:28, color:s.color, lineHeight:1 }}>{s.value}</Typography>
                          <Typography sx={{ fontSize:11, color:T.muted, mt:0.3 }}>{s.label}</Typography>
                        </Box>
                      ))}
                    </Box>
                    {getBC("negative") > 0 && <Alert severity="warning" sx={{ borderRadius:2, fontSize:12 }}>⚠️ {getBC("negative")} negative review(s) detected.</Alert>}
                    {getBC("positive") > sentStats.total * 0.7 && <Alert severity="success" sx={{ borderRadius:2, fontSize:12, mt:1 }}>✅ {sentStats.positive_pct}% positive — drivers are satisfied!</Alert>}
                  </Box>
                ) : <Typography sx={{ color:T.muted, fontSize:13 }}>Sentiment insights appear once drivers submit reviews.</Typography>}
              </SCard>
            </Grid>
            <Grid item xs={12}>
              <SCard title="💬 All Driver Reviews"
                action={<Box sx={{ display:"flex", gap:1 }}>
                  <Chip label={`${reviews.length} total`} size="small" sx={{ fontWeight:700, background:T.accentBg, color:T.accent }}/>
                  <Button size="small" startIcon={<Download/>} onClick={() => exportCSV(reviews,"reviews.csv")} variant="outlined"
                    sx={{ borderRadius:20, textTransform:"none", borderColor:T.success, color:T.success }}>CSV</Button>
                </Box>}>
                <TextField size="small" placeholder="Search reviews..." value={search} onChange={e=>setSearch(e.target.value)} sx={{ mb:2, width:280 }}/>
                {reviews.length === 0 ? <Alert severity="info" sx={{ borderRadius:2, fontSize:12 }}>No reviews yet.</Alert> :
                  <Box sx={{ overflowX:"auto", border:`1px solid ${T.border}`, borderRadius:2 }}>
                    <Table size="small">
                      <TableHead><TableRow sx={{ background:T.bg }}>
                        {["#","Name","Review","Rating","Sentiment","Score","Date","Del"].map(h => <TableCell key={h} sx={{ fontWeight:700, fontSize:11, color:T.sub }}>{h}</TableCell>)}
                      </TableRow></TableHead>
                      <TableBody>
                        {reviews.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase())).map((r,i) => (
                          <TableRow key={r.id||i} sx={{ "&:hover":{ background:T.bg } }}>
                            <TableCell sx={{ fontSize:12 }}>{i+1}</TableCell>
                            <TableCell sx={{ fontSize:12, fontWeight:600, color:T.text }}>{(!r.user_name||r.user_name.toLowerCase()==="anonymous")?"Anonymous":r.user_name}</TableCell>
                            <TableCell sx={{ fontSize:12, maxWidth:260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}><Tooltip title={r.review_text}><span>{r.review_text}</span></Tooltip></TableCell>
                            <TableCell sx={{ fontSize:12 }}>{"⭐".repeat(r.rating||0)}</TableCell>
                            <TableCell>{r.sentiment ? sentimentBadge(r.sentiment) : "—"}</TableCell>
                            <TableCell sx={{ fontSize:12, fontWeight:700, color:r.sentiment==="positive"?T.success:r.sentiment==="negative"?T.danger:T.warning }}>{r.sentiment_score!=null?`${Math.round(r.sentiment_score)}%`:"—"}</TableCell>
                            <TableCell sx={{ fontSize:11, color:T.muted }}>{r.created_at?new Date(r.created_at).toLocaleDateString("en-IN"):"—"}</TableCell>
                            <TableCell><Tooltip title="Delete"><IconButton size="small" color="error" onClick={()=>handleDeleteReview(r.id)}><Delete fontSize="small"/></IconButton></Tooltip></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>}
              </SCard>
            </Grid>
          </Grid>
        )}

        {/* ══ TAB 2: DATABASE ══ */}
        {tab === 2 && (
          <Box>
            <Box sx={{ background:T.card, borderRadius:3, border:`1px solid ${T.border}`, mb:2, overflow:"hidden" }}>
              <Tabs value={dbTab} onChange={(_,v)=>setDbTab(v)} variant="scrollable"
                sx={{ "& .MuiTab-root":{ fontWeight:600, textTransform:"none", fontSize:12, color:T.sub },
                  "& .Mui-selected":{ color:`${T.accent} !important` },
                  "& .MuiTabs-indicator":{ background:T.accent } }}>
                {DB_TABS.map((t,i) => <Tab key={i} label={t.label}/>)}
              </Tabs>
            </Box>
            {DB_TABS.map((dt, ti) => (
              <Box key={ti} sx={{ display:dbTab===ti?"block":"none" }}>
                <Box sx={{ display:"flex", gap:2, mb:2, alignItems:"center" }}>
                  <TextField size="small" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} sx={{ flex:1, maxWidth:280 }}/>
                  <Chip label={`${dt.data.length} records`} size="small" sx={{ fontWeight:700, background:T.accentBg, color:T.accent }}/>
                  <Button size="small" startIcon={<Download/>} onClick={()=>exportCSV(dt.data,dt.fn)} variant="outlined"
                    sx={{ borderRadius:20, textTransform:"none", borderColor:T.success, color:T.success }}>CSV</Button>
                </Box>
                <Box sx={{ overflowX:"auto", border:`1px solid ${T.border}`, borderRadius:2, background:T.card }}>
                  <Table size="small">
                    <TableHead><TableRow sx={{ background:T.bg }}>
                      {dt.data.length > 0 && Object.keys(dt.data[0]).slice(0,8).map(k => <TableCell key={k} sx={{ fontWeight:700, fontSize:10, color:T.sub, textTransform:"uppercase", whiteSpace:"nowrap" }}>{k.replace(/_/g," ")}</TableCell>)}
                    </TableRow></TableHead>
                    <TableBody>
                      {dt.data.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase())).slice(0,50).map((row,i) => (
                        <TableRow key={i} sx={{ "&:hover":{ background:T.bg } }}>
                          {Object.values(row).slice(0,8).map((v,j) => <TableCell key={j} sx={{ fontSize:11, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:T.text }}>{typeof v==="object"?JSON.stringify(v).slice(0,50):String(v??"—").slice(0,80)}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* ══ TAB 3: TOOLS ══ */}
        {tab === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <SCard title="📤 Bulk Hotspot Import (CSV)">
                <Typography sx={{ fontSize:12, color:T.muted, mb:1.5 }}>Format: <code>lat,lon,name,accidents,killed,district</code></Typography>
                <Alert severity="info" sx={{ mb:1.5, borderRadius:2, fontSize:11 }}>All 38 iRAD HP hotspots are pre-loaded. Import additional data from your CSV.</Alert>
                <Box sx={{ background:T.bg, border:`2px dashed ${T.border}`, borderRadius:2, p:3, textAlign:"center", cursor:"pointer",
                  "&:hover":{ borderColor:T.accent, background:T.accentBg } }} onClick={()=>fileRef.current.click()}>
                  <Typography sx={{ fontSize:28, mb:0.5 }}>📁</Typography>
                  <Typography sx={{ fontWeight:700, color:T.accent, fontSize:13 }}>Click to upload CSV</Typography>
                </Box>
                <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }} onChange={handleCSV}/>
              </SCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <SCard title="🏔️ Seasonal Pass Status">
                {[["Rohtang Pass",[5,6,7,8,9,10],"3978m","Atal Tunnel"],["Spiti Valley",[6,7,8,9],"4550m","Via Shimla"],["Jalori Pass",[4,5,6,7,8,9,10],"3120m","Via NH"],["Baralacha Pass",[6,7,8,9],"4890m","None"],["Kunzum Pass",[6,7,8,9],"4590m","Atal Tunnel"]].map(([name,open,elev,alt]) => {
                  const m = new Date().getMonth()+1; const isOpen = open.includes(m);
                  return (
                    <Box key={name} sx={{ display:"flex", justifyContent:"space-between", p:1.2, mb:0.8, borderRadius:2,
                      background:isOpen?RISK_BG.LOW:RISK_BG.HIGH, border:`1px solid ${isOpen?"#bbf7d0":"#fecaca"}` }}>
                      <Box>
                        <Typography sx={{ fontSize:12, fontWeight:700, color:T.text }}>{name}</Typography>
                        <Typography sx={{ fontSize:10, color:T.muted }}>{elev} · Alt: {alt}</Typography>
                      </Box>
                      <Chip label={isOpen?"OPEN":"CLOSED"} size="small" color={isOpen?"success":"error"} sx={{ fontWeight:700, fontSize:10 }}/>
                    </Box>
                  );
                })}
              </SCard>
            </Grid>
          </Grid>
        )}

        {/* ══ TAB 4: RF MODEL ══ */}
        {tab === 4 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <SCard title="🌲 RF Feature Importances">
                {Object.keys(features).length > 0
                  ? Object.entries(features).sort(([,a],[,b])=>b-a).map(([k,v]) => (
                      <Box key={k} sx={{ mb:1.5 }}>
                        <Box sx={{ display:"flex", justifyContent:"space-between", mb:0.3 }}>
                          <Typography sx={{ fontSize:12, fontWeight:600, color:T.text }}>{k.replace(/_/g," ")}</Typography>
                          <Typography sx={{ fontSize:12, fontWeight:700, color:"#7c3aed" }}>{(v*100).toFixed(1)}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={v*100} sx={{ height:7, borderRadius:4, background:"#f1f5f9",
                          "& .MuiLinearProgress-bar":{ background:"linear-gradient(90deg,#7c3aed,#2563eb)", borderRadius:4 } }}/>
                      </Box>
                    ))
                  : <Alert severity="warning" sx={{ borderRadius:2, fontSize:12 }}>RF model not loaded. Place .pkl files in python/ folder.</Alert>}
              </SCard>
            </Grid>
            <Grid item xs={12} md={7}>
              <SCard title="📊 Model Visualizations">
                <Grid container spacing={1.5}>
                  {["confusion_matrix.png","feature_importance.png","actual_vs_predicted.png","classification_report_heatmap.png"].map(f => (
                    <Grid item xs={6} key={f}>
                      <Box sx={{ border:`1px solid ${T.border}`, borderRadius:2, overflow:"hidden" }}>
                        <img src={`/api/static/${f}`} alt={f} style={{ width:"100%", height:140, objectFit:"contain", background:T.bg }} onError={e => { e.target.style.display="none"; }}/>
                        <Typography sx={{ fontSize:10, color:T.muted, p:0.5, textAlign:"center" }}>{f.replace(".png","").replace(/_/g," ")}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </SCard>
            </Grid>
          </Grid>
        )}

        {/* ══ TAB 5: XAI ══ */}
        {tab === 5 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <SCard title="🧠 Explainable AI — Feature Importances">
                <Typography sx={{ fontSize:11, color:T.muted, mb:2 }}>What drives the risk prediction? (RF Mean Decrease Impurity)</Typography>
                {xaiData?.ranked?.length > 0
                  ? xaiData.ranked.map((item,i) => (
                      <FeatureBar key={item.feature} rank={i} name={item.label||item.feature} pct={item["importance_%"]} icon={item.icon||"📊"} note={item.hp_note}/>
                    ))
                  : <Alert severity="warning" sx={{ borderRadius:2, fontSize:12 }}>RF model not loaded — XAI unavailable.</Alert>}
              </SCard>
            </Grid>
            <Grid item xs={12} md={7}>
              <SCard title="⚡ Live XAI Prediction Test"
                action={<Button onClick={runXaiExplain} variant="contained" size="small" disabled={xaiLoading}
                  sx={{ borderRadius:20, fontWeight:700, textTransform:"none", background:"linear-gradient(135deg,#7c3aed,#2563eb)" }}>
                  {xaiLoading ? <CircularProgress size={16} sx={{ color:"#fff" }}/> : "Run XAI Test"}
                </Button>}>
                <Typography sx={{ fontSize:11, color:T.muted, mb:2 }}>Scenario: Night rain + Mountain + 90 km/h + iRAD hotspot</Typography>
                {xaiExplain ? (
                  <Box>
                    <Box sx={{ display:"flex", gap:2, mb:2, flexWrap:"wrap" }}>
                      <Box sx={{ p:2, background:xaiExplain.predicted_class===3?RISK_BG.HIGH:xaiExplain.predicted_class===2?RISK_BG.MEDIUM:RISK_BG.LOW,
                        border:`2px solid ${xaiExplain.predicted_class===3?"#fca5a5":xaiExplain.predicted_class===2?"#fde68a":"#86efac"}`,
                        borderRadius:3, textAlign:"center", minWidth:100 }}>
                        <Typography sx={{ fontSize:28, fontWeight:900, color:xaiExplain.predicted_class===3?T.danger:xaiExplain.predicted_class===2?T.warning:T.success }}>{xaiExplain.risk_score?.toFixed(0)}</Typography>
                        <Typography sx={{ fontSize:11, fontWeight:700, color:T.sub }}>Risk Score</Typography>
                      </Box>
                      <Box sx={{ flex:1 }}>
                        <Chip label={xaiExplain.severity_label} color={xaiExplain.predicted_class===3?"error":xaiExplain.predicted_class===2?"warning":"success"} sx={{ fontWeight:800, mb:1 }}/>
                        <Typography sx={{ fontSize:12, color:T.text, lineHeight:1.5 }}>{xaiExplain.explanation}</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize:11, fontWeight:700, color:T.muted, mb:1 }}>CLASS PROBABILITIES</Typography>
                    {Object.entries(xaiExplain.probabilities||{}).map(([cls,prob]) => {
                      const labels={"1":"Low","2":"Medium","3":"High"};
                      const clrs={"1":T.success,"2":T.warning,"3":T.danger};
                      return (
                        <Box key={cls} sx={{ mb:0.8 }}>
                          <Box sx={{ display:"flex", justifyContent:"space-between", mb:0.2 }}>
                            <Typography sx={{ fontSize:11, fontWeight:600, color:T.text }}>{labels[cls]||cls} Risk</Typography>
                            <Typography sx={{ fontSize:11, fontWeight:800, color:clrs[cls] }}>{(prob*100).toFixed(1)}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={prob*100} sx={{ height:6, borderRadius:3,
                            "& .MuiLinearProgress-bar":{ background:clrs[cls] } }}/>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Box sx={{ py:4, textAlign:"center", color:T.muted }}>
                    <Psychology sx={{ fontSize:48, mb:1, opacity:0.3 }}/>
                    <Typography sx={{ fontSize:13 }}>Click "Run XAI Test" to see explainable prediction</Typography>
                  </Box>
                )}
              </SCard>
              {xaiExplain?.feature_contributions && (
                <Box sx={{ mt:2 }}>
                  <SCard title="📋 Feature Contributions (Test Scenario)">
                    <Box sx={{ overflowX:"auto", border:`1px solid ${T.border}`, borderRadius:2 }}>
                      <Table size="small">
                        <TableHead><TableRow sx={{ background:T.bg }}>
                          {["Feature","Icon","Value","Importance %","HP Note"].map(h => <TableCell key={h} sx={{ fontWeight:700, fontSize:10, color:T.sub }}>{h}</TableCell>)}
                        </TableRow></TableHead>
                        <TableBody>
                          {Object.entries(xaiExplain.feature_contributions).slice(0,11).map(([feat,info]) => (
                            <TableRow key={feat} sx={{ "&:hover":{ background:T.bg } }}>
                              <TableCell sx={{ fontSize:11, fontWeight:600, color:T.text }}>{info.label||feat}</TableCell>
                              <TableCell sx={{ fontSize:14 }}>{info.icon||"📊"}</TableCell>
                              <TableCell sx={{ fontSize:11, fontFamily:"monospace", color:T.accent }}>{info.value_label||info.value}</TableCell>
                              <TableCell>
                                <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
                                  <LinearProgress variant="determinate" value={Math.min(info["importance_%"]||0,100)} sx={{ width:50, height:5, borderRadius:3, "& .MuiLinearProgress-bar":{ background:"#7c3aed" } }}/>
                                  <Typography sx={{ fontSize:10, fontWeight:700, color:"#7c3aed" }}>{info["importance_%"]?.toFixed(1)}%</Typography>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontSize:10, color:T.muted, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{info.hp_note||"—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </SCard>
                </Box>
              )}
            </Grid>
          </Grid>
        )}

        {/* ══ TAB 6: HOTSPOTS ══ */}
        {tab === 6 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <SCard
                title="🗺️ iRAD HP Hotspots — ML Risk Scores"
                action={<Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {["ALL","HIGH","MEDIUM","LOW"].map(f => (
                    <Chip key={f}
                      label={`${f} ${f==="ALL"?`(${mlHotspots.length})`:mlHotspots.filter(h=>h.risk===f||h.risk_label===f).length}`}
                      onClick={()=>setHotspotFilter(f)} size="small"
                      sx={{ fontWeight:700, cursor:"pointer",
                        background: hotspotFilter===f ? (RISK_COLOR[f]||T.accent) : T.bg,
                        color: hotspotFilter===f ? "#fff" : (RISK_COLOR[f]||T.accent),
                        border:`1px solid ${RISK_COLOR[f]||T.accent}55` }}/>
                  ))}
                  <Button size="small" startIcon={<Download/>} onClick={()=>exportCSV(mlHotspots,"hotspots_ml.csv")} variant="outlined"
                    sx={{ borderRadius:20, textTransform:"none", borderColor:T.success, color:T.success }}>CSV</Button>
                </Stack>}>
                <Typography sx={{ fontSize:12, color:T.muted, mb:2 }}>38 official iRAD hotspots · RandomForest MultiDataset · 2021-26</Typography>

                {/* Risk summary */}
                <Grid container spacing={2} sx={{ mb:2 }}>
                  {["HIGH","MEDIUM","LOW"].map(risk => {
                    const count = mlHotspots.filter(h=>h.risk===risk||h.risk_label===risk).length;
                    return (
                      <Grid item xs={4} key={risk}>
                        <Box sx={{ p:1.5, background:RISK_BG[risk], border:`1px solid ${RISK_COLOR[risk]}33`, borderRadius:2, textAlign:"center" }}>
                          <Typography sx={{ fontSize:22, fontWeight:900, color:RISK_COLOR[risk] }}>{count}</Typography>
                          <Typography sx={{ fontSize:11, fontWeight:700, color:RISK_COLOR[risk] }}>{risk} RISK</Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>

                {mlHotspots.length === 0
                  ? <Alert severity="info" sx={{ borderRadius:2 }}>No ML hotspots loaded. Ensure <code>/api/hotspots/ml</code> is running.</Alert>
                  : <Box sx={{ overflowX:"auto", border:`1px solid ${T.border}`, borderRadius:2 }}>
                      <Table size="small">
                        <TableHead><TableRow sx={{ background:T.bg }}>
                          {["#","Name","District","Lat","Lon","Accidents","Killed","Score","Risk","Model"].map(h =>
                            <TableCell key={h} sx={{ fontWeight:700, fontSize:10, color:T.sub, whiteSpace:"nowrap" }}>{h}</TableCell>)}
                        </TableRow></TableHead>
                        <TableBody>
                          {filteredHotspots.map((h,i) => {
                            const risk  = h.risk||h.risk_label||"MEDIUM";
                            const score = h.risk_score??50;
                            return (
                              <TableRow key={i} sx={{ "&:hover":{ background:RISK_BG[risk]||T.bg } }}>
                                <TableCell sx={{ fontSize:11, fontWeight:700, color:T.sub }}>{i+1}</TableCell>
                                <TableCell sx={{ fontSize:11, fontWeight:600, color:T.text, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.name||"—"}</TableCell>
                                <TableCell sx={{ fontSize:11, color:T.text }}>{h.district||"—"}</TableCell>
                                <TableCell sx={{ fontSize:10, fontFamily:"monospace", color:T.sub }}>{parseFloat(h.lat||0).toFixed(5)}</TableCell>
                                <TableCell sx={{ fontSize:10, fontFamily:"monospace", color:T.sub }}>{parseFloat(h.lon||0).toFixed(5)}</TableCell>
                                <TableCell sx={{ fontSize:11, fontWeight:700, color:T.text }}>{h.accidents||h.count||"—"}</TableCell>
                                <TableCell sx={{ fontSize:11, fontWeight:700, color:T.danger }}>{h.killed||"—"}</TableCell>
                                <TableCell>
                                  <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
                                    <LinearProgress variant="determinate" value={Math.min(score,100)} sx={{ width:40, height:5, borderRadius:3,
                                      "& .MuiLinearProgress-bar":{ background:RISK_COLOR[risk]||T.warning } }}/>
                                    <Typography sx={{ fontSize:10, fontWeight:800, color:RISK_COLOR[risk] }}>{score.toFixed(0)}</Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip label={risk} size="small" sx={{ fontWeight:800, fontSize:9, background:RISK_BG[risk], color:RISK_COLOR[risk], border:`1px solid ${RISK_COLOR[risk]}44` }}/>
                                </TableCell>
                                <TableCell sx={{ fontSize:10, color:T.muted }}>{h.model_used?.replace("_MultiDataset","").replace("_v2","")||h.source?.replace("irad_ml_","ML:")||"RF"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>}

                {/* Probability breakdown for top 5 */}
                {mlHotspots.filter(h=>h.probability&&Object.keys(h.probability).length>0).length > 0 && (
                  <Box sx={{ mt:3 }}>
                    <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:2, fontSize:13, color:T.header }}>🎲 ML Probability Breakdown — Top 5 Hotspots</Typography>
                    <Grid container spacing={2}>
                      {mlHotspots.filter(h=>h.probability&&Object.keys(h.probability).length>0).slice(0,5).map((h,i) => (
                        <Grid item xs={12} sm={6} md={4} key={i}>
                          <Box sx={{ p:1.5, border:`1px solid ${T.border}`, borderRadius:2, background:T.bg }}>
                            <Typography sx={{ fontSize:11, fontWeight:700, mb:1, color:T.text }} noWrap>{h.name||`Hotspot ${i+1}`}</Typography>
                            {["LOW","MEDIUM","HIGH"].map(r => {
                              const p = (h.probability[r]||0)*100;
                              return (
                                <Box key={r} sx={{ mb:0.5 }}>
                                  <Box sx={{ display:"flex", justifyContent:"space-between" }}>
                                    <Typography sx={{ fontSize:10, color:T.sub }}>{r}</Typography>
                                    <Typography sx={{ fontSize:10, fontWeight:700, color:RISK_COLOR[r] }}>{p.toFixed(0)}%</Typography>
                                  </Box>
                                  <LinearProgress variant="determinate" value={p} sx={{ height:4, borderRadius:2,
                                    "& .MuiLinearProgress-bar":{ background:RISK_COLOR[r] } }}/>
                                </Box>
                              );
                            })}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </SCard>
            </Grid>
          </Grid>
        )}

        {/* ══ TAB 7: DATA MINING ══ */}
        {tab === 7 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2, flexWrap:"wrap", gap:2 }}>
                <Box>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:T.header }}>💡 Automated Data Mining & Insights</Typography>
                  <Typography sx={{ fontSize:12, color:T.muted }}>AI-generated insights from all IntelliCrash data · Updated on demand</Typography>
                </Box>
                <Button onClick={generateInsights} variant="contained" startIcon={insightLoading ? <CircularProgress size={16} sx={{ color:"#fff" }}/> : <AutoGraph/>}
                  disabled={insightLoading} sx={{ borderRadius:20, fontWeight:700, textTransform:"none", background:"linear-gradient(135deg,#7c3aed,#2563eb)", boxShadow:"0 4px 12px rgba(124,58,237,0.3)" }}>
                  {insightLoading ? "Analyzing…" : "Regenerate Insights"}
                </Button>
              </Box>
            </Grid>

            {/* Quick overview */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                {[
                  { label:"Data Points Analyzed", value:(reports.length+alerts.length+sessions.length+reviews.length+mlHotspots.length).toLocaleString(), icon:"🔢", color:T.accent },
                  { label:"Hotspots Processed",   value:mlHotspots.length, icon:"📍", color:T.danger },
                  { label:"Sessions Analyzed",    value:sessions.length,   icon:"🚗", color:T.success },
                  { label:"Reviews Mined",        value:reviews.length,    icon:"💬", color:"#7c3aed" },
                ].map(s => (
                  <Grid item xs={6} sm={3} key={s.label}>
                    <Card elevation={0} sx={{ border:`1px solid ${T.border}`, borderRadius:3, textAlign:"center", background:T.card }}>
                      <CardContent sx={{ py:1.5 }}>
                        <Typography sx={{ fontSize:22 }}>{s.icon}</Typography>
                        <Typography sx={{ fontWeight:900, fontSize:22, color:s.color, lineHeight:1 }}>{s.value}</Typography>
                        <Typography sx={{ fontSize:10, color:T.muted, mt:0.3 }}>{s.label}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {insightLoading && (
              <Grid item xs={12}>
                <Box sx={{ textAlign:"center", py:4 }}>
                  <CircularProgress size={48} sx={{ color:"#7c3aed", mb:2 }}/>
                  <Typography sx={{ fontSize:14, color:T.muted }}>Mining data and generating insights…</Typography>
                </Box>
              </Grid>
            )}

            {!insightLoading && insights.length === 0 && (
              <Grid item xs={12}>
                <Card elevation={0} sx={{ border:`1px solid ${T.border}`, borderRadius:3, textAlign:"center", py:6, background:T.card }}>
                  <Lightbulb sx={{ fontSize:64, color:"#e2e8f0", mb:2 }}/>
                  <Typography sx={{ fontSize:16, fontWeight:700, color:T.muted, mb:1 }}>No insights generated yet</Typography>
                  <Typography sx={{ fontSize:13, color:T.muted, mb:3 }}>Click "Regenerate Insights" to analyze all data</Typography>
                  <Button onClick={generateInsights} variant="contained" sx={{ borderRadius:20, fontWeight:700, textTransform:"none" }}>Generate Now</Button>
                </Card>
              </Grid>
            )}

            {!insightLoading && insights.length > 0 && (
              <>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:2, fontSize:14, color:T.header }}>🔴 Critical & Warning</Typography>
                  {insights.filter(i=>i.severity==="critical"||i.severity==="warning").map((ins,i) => <InsightCard key={i} {...ins}/>)}
                  {insights.filter(i=>i.severity==="critical"||i.severity==="warning").length===0 && <Alert severity="success" sx={{ borderRadius:2 }}>✅ No critical insights. System healthy!</Alert>}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:2, fontSize:14, color:T.header }}>✅ Positive & Info</Typography>
                  {insights.filter(i=>i.severity==="success"||i.severity==="info").map((ins,i) => <InsightCard key={i} {...ins}/>)}
                </Grid>

                {/* District danger ranking */}
                {mlHotspots.length > 0 && (() => {
                  const districts = {};
                  mlHotspots.forEach(h => {
                    const d = h.district||"Unknown";
                    if (!districts[d]) districts[d]={total:0,high:0,score:0};
                    districts[d].total++;
                    if (h.risk==="HIGH"||h.risk_level===2) districts[d].high++;
                    districts[d].score += (h.risk_score||50);
                  });
                  const ranked = Object.entries(districts).map(([name,d])=>({name,...d,avgScore:d.score/d.total})).sort((a,b)=>b.avgScore-a.avgScore);
                  return (
                    <Grid item xs={12}>
                      <SCard title="📊 District Danger Ranking (Auto-Mined)">
                        <Box sx={{ overflowX:"auto", border:`1px solid ${T.border}`, borderRadius:2 }}>
                          <Table size="small">
                            <TableHead><TableRow sx={{ background:T.bg }}>
                              {["Rank","District","Total","HIGH Risk","Avg ML Score","Danger"].map(h => <TableCell key={h} sx={{ fontWeight:700, fontSize:11, color:T.sub }}>{h}</TableCell>)}
                            </TableRow></TableHead>
                            <TableBody>
                              {ranked.map((d,i) => {
                                const danger = d.avgScore>=70?"CRITICAL":d.avgScore>=50?"HIGH":d.avgScore>=30?"MEDIUM":"LOW";
                                const dc = {CRITICAL:T.danger,HIGH:"#ef4444",MEDIUM:T.warning,LOW:T.success}[danger];
                                return (
                                  <TableRow key={d.name} sx={{ "&:hover":{ background:T.bg } }}>
                                    <TableCell sx={{ fontSize:14, fontWeight:900, color:i<3?T.danger:T.muted }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</TableCell>
                                    <TableCell sx={{ fontSize:12, fontWeight:700, color:T.text }}>{d.name}</TableCell>
                                    <TableCell sx={{ fontSize:12, color:T.text }}>{d.total}</TableCell>
                                    <TableCell sx={{ fontSize:12, fontWeight:700, color:T.danger }}>{d.high}</TableCell>
                                    <TableCell>
                                      <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
                                        <LinearProgress variant="determinate" value={Math.min(d.avgScore,100)} sx={{ width:60, height:6, borderRadius:3, "& .MuiLinearProgress-bar":{ background:dc } }}/>
                                        <Typography sx={{ fontSize:11, fontWeight:800, color:dc }}>{d.avgScore.toFixed(0)}</Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell><Chip label={danger} size="small" sx={{ fontWeight:800, fontSize:9, background:RISK_BG[danger==="CRITICAL"?"HIGH":danger]||"#f1f5f9", color:dc }}/></TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </Box>
                      </SCard>
                    </Grid>
                  );
                })()}

                {/* Driver performance mining */}
                {sessions.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <SCard title="🚗 Driver Performance Mining">
                      {(() => {
                        const scores  = sessions.map(s=>s.driver_score||0).filter(s=>s>0);
                        const avg     = scores.reduce((a,b)=>a+b,0)/(scores.length||1);
                        const safe    = sessions.filter(s=>s.driver_score>=80).length;
                        const risky   = sessions.filter(s=>s.driver_score<60).length;
                        const avgDist = sessions.map(s=>s.distance_km||0).reduce((a,b)=>a+b,0)/(sessions.length||1);
                        return (
                          <Box>
                            {[{label:"Average Driver Score",value:`${avg.toFixed(1)}/100`,color:avg>=75?T.success:avg>=60?T.warning:T.danger},
                              {label:"Safe Drivers (≥80)",value:`${safe} (${Math.round(safe/(sessions.length||1)*100)}%)`,color:T.success},
                              {label:"Risky Drivers (<60)",value:`${risky} (${Math.round(risky/(sessions.length||1)*100)}%)`,color:T.danger},
                              {label:"Avg Trip Distance",value:`${avgDist.toFixed(1)} km`,color:T.accent}].map(s => (
                              <Box key={s.label} sx={{ display:"flex", justifyContent:"space-between", py:1, borderBottom:`1px solid ${T.border}` }}>
                                <Typography sx={{ fontSize:12, color:T.sub }}>{s.label}</Typography>
                                <Typography sx={{ fontSize:12, fontWeight:800, color:s.color }}>{s.value}</Typography>
                              </Box>
                            ))}
                          </Box>
                        );
                      })()}
                    </SCard>
                  </Grid>
                )}

                {/* Review keyword mining */}
                {reviews.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <SCard title="💬 Review Keyword Mining">
                      {(() => {
                        const text = reviews.map(r=>r.review_text||"").join(" ").toLowerCase();
                        const keywords = ["save","helpful","accurate","warning","slow","crash","safe","risk","alert","sos","navigation","speed","fog","snow","rain","hotspot","gps","road"];
                        const counts = keywords.map(k=>({ word:k, count:(text.match(new RegExp(k,"g"))||[]).length })).filter(k=>k.count>0).sort((a,b)=>b.count-a.count).slice(0,10);
                        const maxC = Math.max(...counts.map(k=>k.count),1);
                        return counts.map(k => (
                          <Box key={k.word} sx={{ mb:0.8 }}>
                            <Box sx={{ display:"flex", justifyContent:"space-between", mb:0.2 }}>
                              <Typography sx={{ fontSize:11, fontWeight:600, color:T.text, textTransform:"capitalize" }}>"{k.word}"</Typography>
                              <Typography sx={{ fontSize:11, fontWeight:800, color:"#7c3aed" }}>{k.count}×</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={(k.count/maxC)*100} sx={{ height:5, borderRadius:3,
                              "& .MuiLinearProgress-bar":{ background:"linear-gradient(90deg,#7c3aed,#2563eb)" } }}/>
                          </Box>
                        ));
                      })()}
                    </SCard>
                  </Grid>
                )}
              </>
            )}
          </Grid>
        )}
      </Container>
    </Box>
  );
}