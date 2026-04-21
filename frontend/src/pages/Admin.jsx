/**
 * Admin.jsx — IntelliCrash Admin v2.1 FIXED
 * ✅ FIX: NaN% → reads sentStats.positive_pct from /api/reviews/stats
 * ✅ FIX: Sentiment donut reads breakdown array correctly
 * ✅ FIX: Reviews table uses correct field names (user_name, sentiment, sentiment_score)
 * ✅ FIX: Delete button on every review row (DELETE /api/reviews/:id)
 * ✅ FIX: CSV upload hits correct endpoint /api/hotspots/import
 * ✅ FIX: Sentiment Insights reads correct counts from breakdown
 * ✅ FIX: Avg Driver shows correctly from /api/admin/stats
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, Card, CardContent, Grid, Chip,
  LinearProgress, Button, Stack, Tabs, Tab, Table, TableHead,
  TableBody, TableRow, TableCell, TextField, Alert, Tooltip, IconButton,
} from "@mui/material";
import {
  Download, Refresh, Warning, TrendingUp, Analytics,
  Map, Shield, People, Logout, Delete,
} from "@mui/icons-material";
import { createClient } from "@supabase/supabase-js";
import {
  getStats, getReports, getSessions, getContacts, getSOSAlerts,
} from "../services/api";

// ── Supabase ──────────────────────────────────────────────────────
const SUPABASE_URL = "https://demswvtoqurpjoqrqndy.supabase.co";
const SUPABASE_KEY = "sb_publishable_nB5DXgfVKcGDokaWRKKe3A_YjHq85oi";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_EMAILS = ["shubhamabhi004@gmail.com"];

const RC = (s) => s >= 67 ? "#ea4335" : s >= 34 ? "#f9ab00" : "#34a853";

// ── Hour heatmap ──────────────────────────────────────────────────
function HourHeatmap({ data }) {
  const max = Math.max(...data, 1);
  return (
    <Box>
      <Box sx={{ display:"flex", gap:0.3, flexWrap:"wrap" }}>
        {data.map((count, h) => {
          const intensity = count / max;
          return (
            <Tooltip key={h} title={`${h}:00 — ${count} incidents`}>
              <Box sx={{ width:28, height:28, borderRadius:1,
                background: count === 0 ? "#f1f3f4" : `rgba(234,67,53,${0.1 + intensity * 0.9})`,
                display:"flex", alignItems:"center", justifyContent:"center", cursor:"default" }}>
                <Typography sx={{ fontSize:8, color:count > max * 0.5 ? "#fff" : "#80868b", fontWeight:700 }}>{h}</Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      <Typography sx={{ fontSize:10, color:"#80868b", mt:0.5 }}>Hour of day (0–23) · Darker = more incidents</Typography>
    </Box>
  );
}

// ── Mini bar ──────────────────────────────────────────────────────
function MiniBar({ data, color = "#1a73e8", height = 80 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <Box sx={{ display:"flex", alignItems:"flex-end", gap:0.5, height }}>
      {data.map((d, i) => (
        <Box key={i} sx={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:0.3 }}>
          <Box sx={{ width:"100%", height:`${(d.value / max) * height * 0.8}px`,
            background:color, borderRadius:"2px 2px 0 0", minHeight:d.value > 0 ? 2 : 0, transition:"height 0.6s" }} />
          <Typography sx={{ fontSize:8, color:"#80868b", textAlign:"center" }}>{d.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── Sentiment donut ───────────────────────────────────────────────
// ✅ FIX: accepts breakdown array and extracts counts correctly
function SentimentDonut({ breakdown = [] }) {
  const get = (label) => breakdown.find(b => b.sentiment === label)?.count || 0;
  const positive = get("positive");
  const neutral  = get("neutral");
  const negative = get("negative");
  const total    = positive + neutral + negative || 1;
  const posP     = Math.round((positive / total) * 100);
  const neuP     = Math.round((neutral  / total) * 100);
  const negP     = 100 - posP - neuP;

  return (
    <Box sx={{ display:"flex", gap:3, alignItems:"center", flexWrap:"wrap" }}>
      <Box sx={{ position:"relative", width:120, height:120, flexShrink:0 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="48" fill="none" stroke="#f1f5f9" strokeWidth="16"/>
          {positive > 0 && (
            <circle cx="60" cy="60" r="48" fill="none" stroke="#16a34a" strokeWidth="16"
              strokeDasharray={`${(positive / total) * 301.6} 301.6`}
              strokeDashoffset="75.4" strokeLinecap="butt"/>
          )}
          {neutral > 0 && (
            <circle cx="60" cy="60" r="48" fill="none" stroke="#d97706" strokeWidth="16"
              strokeDasharray={`${(neutral / total) * 301.6} 301.6`}
              strokeDashoffset={`${75.4 - (positive / total) * 301.6}`} strokeLinecap="butt"/>
          )}
          {negative > 0 && (
            <circle cx="60" cy="60" r="48" fill="none" stroke="#dc2626" strokeWidth="16"
              strokeDasharray={`${(negative / total) * 301.6} 301.6`}
              strokeDashoffset={`${75.4 - ((positive + neutral) / total) * 301.6}`} strokeLinecap="butt"/>
          )}
          <text x="60" y="55" textAnchor="middle" fontSize="20" fontWeight="800" fill="#0f172a">{posP}%</text>
          <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#94a3b8">positive</text>
        </svg>
      </Box>
      <Box sx={{ flex:1 }}>
        {[
          { label:"😊 Positive", count:positive, color:"#16a34a", pct:posP },
          { label:"😐 Neutral",  count:neutral,  color:"#d97706", pct:neuP },
          { label:"😞 Negative", count:negative, color:"#dc2626", pct:negP },
        ].map(s => (
          <Box key={s.label} sx={{ mb:1.2 }}>
            <Box sx={{ display:"flex", justifyContent:"space-between", mb:0.4 }}>
              <Typography sx={{ fontSize:12, fontWeight:600, color:"#1a1a1a" }}>{s.label}</Typography>
              <Typography sx={{ fontSize:12, fontWeight:800, color:s.color }}>{s.count} ({s.pct}%)</Typography>
            </Box>
            <LinearProgress variant="determinate" value={s.pct}
              sx={{ height:6, borderRadius:3, background:"#f1f5f9",
                "& .MuiLinearProgress-bar":{ background:s.color, borderRadius:3 } }} />
          </Box>
        ))}
        <Typography sx={{ fontSize:10, color:"#94a3b8", mt:0.5 }}>
          Based on {positive + neutral + negative} reviews · NLP TextBlob model
        </Typography>
      </Box>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN ADMIN
// ══════════════════════════════════════════════════════════════════
export default function Admin() {
  const nav      = useNavigate();
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
  const [reviews,     setReviews]     = useState([]);
  const [sentStats,   setSentStats]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [importMsg,   setImportMsg]   = useState(null);
  const [search,      setSearch]      = useState("");
  const [dbTab,       setDbTab]       = useState(0);
  const [deleteMsg,   setDeleteMsg]   = useState(null);
  const fileRef = useRef(null);

  // ── Auth guard ────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        nav("/admin-login", { replace: true });
      } else {
        setAdminUser(user);
        setAuthChecked(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        nav("/admin-login", { replace: true });
      } else {
        setAdminUser(user);
        setAuthChecked(true);
      }
    });
    return () => listener?.subscription?.unsubscribe();
  }, [nav]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav("/admin-login");
  };

  // ── Data fetch ────────────────────────────────────────────────
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

      // ✅ Admin stats (has avg_driver_score, positive_pct, etc.)
      try {
        const as = await fetch("/api/admin/stats").then(r => r.json());
        setAdminStats(as);
      } catch {}

      // Feature importances
      try {
        const fi = await fetch("/api/feature_importances").then(r => r.json());
        setFeatures(fi?.feature_importances || {});
      } catch {}

      // ✅ Sentiment data — breakdown array from /api/reviews/stats
      try {
        const [rv, ss] = await Promise.all([
          fetch("/api/reviews/all").then(r => r.json()),
          fetch("/api/reviews/stats").then(r => r.json()),
        ]);
        setReviews(rv?.reviews || []);
        setSentStats(ss);
      } catch {}

    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (authChecked) load(); }, [authChecked]);

  // ✅ FIX: correct endpoint /api/hotspots/import
  const handleCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const form = new FormData(); form.append("file", file);
    try {
      const r = await fetch("/api/hotspots/import", { method:"POST", body:form });
      const d = await r.json();
      setImportMsg(`✅ Imported ${d.imported} hotspots${d.skipped > 0 ? `, skipped ${d.skipped}` : ""}`);
      setTimeout(() => setImportMsg(null), 6000);
    } catch (err) { setImportMsg(`❌ ${err.message}`); }
    e.target.value = "";
  };

  // ✅ Delete a review
  const handleDeleteReview = async (id) => {
    if (!window.confirm("Delete this review permanently?")) return;
    try {
      const r = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
      if (r.ok) {
        setReviews(prev => prev.filter(rv => rv.id !== id));
        setDeleteMsg("✅ Review deleted");
        setTimeout(() => setDeleteMsg(null), 3000);
        // Refresh sentiment stats
        const ss = await fetch("/api/reviews/stats").then(r => r.json());
        setSentStats(ss);
      } else {
        setDeleteMsg("❌ Could not delete review");
      }
    } catch {
      setDeleteMsg("❌ Network error");
    }
  };

  const exportCSV = (data, fn) => {
    if (!data.length) return;
    const cols = Object.keys(data[0]);
    const csv = [
      cols.join(","),
      ...data.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(",")),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    a.download = fn; a.click();
  };

  // ✅ FIX: use adminStats for avg_driver_score and positive_pct
  const positivePct = adminStats?.positive_pct != null
    ? `${adminStats.positive_pct}%`
    : (sentStats?.positive_pct != null ? `${sentStats.positive_pct}%` : "—");

  const SC = [
    { label:"SOS Total",      value:adminStats?.sos_total      ?? alerts.length,    color:"#ea4335", bg:"#fce8e6", icon:<Warning/>    },
    { label:"Reports Active", value:adminStats?.reports_active  ?? reports.length,   color:"#f9ab00", bg:"#fff8e1", icon:<Analytics/>  },
    { label:"Sessions",       value:adminStats?.sessions_total  ?? sessions.length,  color:"#34a853", bg:"#e6f4ea", icon:<TrendingUp/> },
    { label:"Avg Driver",     value:adminStats?.avg_driver_score ?? 0,               color:"#1a73e8", bg:"#e8f0fe", icon:<Shield/>     },
    { label:"High Risk SOS",  value:adminStats?.sos_active      ?? 0,               color:"#c62828", bg:"#fce8e6", icon:<Warning/>    },
    { label:"Reviews",        value:adminStats?.reviews_total   ?? reviews.length,  color:"#7c3aed", bg:"#f3e8ff", icon:<Analytics/>  },
    { label:"Positive %",     value:positivePct,                                     color:"#16a34a", bg:"#dcfce7", icon:<TrendingUp/> },
    { label:"Contacts",       value:contacts.length,                                 color:"#0097a7", bg:"#e0f7fa", icon:<People/>    },
  ];

  const typeData = Object.entries(analytics?.type_distribution || {}).map(([k,v]) => ({ label:k.slice(0,6), value:v }));

  const DB_TABS = [
    { label:`🚨 SOS (${alerts.length})`,      data:alerts,    fn:"sos.csv"      },
    { label:`📡 Reports (${reports.length})`,  data:reports,   fn:"reports.csv"  },
    { label:`🚗 Sessions (${sessions.length})`,data:sessions,  fn:"sessions.csv" },
    { label:`👤 Contacts (${contacts.length})`,data:contacts,  fn:"contacts.csv" },
    { label:`💬 Reviews (${reviews.length})`,  data:reviews,   fn:"reviews.csv"  },
  ];

  // ✅ FIX: use correct field r.sentiment (not r.sentiment_label)
  const sentimentBadge = (label) => {
    const cfg = {
      positive: { color:"#16a34a", bg:"#dcfce7", icon:"😊" },
      negative: { color:"#dc2626", bg:"#fee2e2", icon:"😞" },
      neutral:  { color:"#d97706", bg:"#fef3c7", icon:"😐" },
    }[label] || { color:"#64748b", bg:"#f1f5f9", icon:"🤔" };
    return (
      <Box sx={{ display:"inline-flex", alignItems:"center", gap:0.4, background:cfg.bg, borderRadius:10, px:1, py:0.2 }}>
        <Typography sx={{ fontSize:11 }}>{cfg.icon}</Typography>
        <Typography sx={{ fontSize:10, fontWeight:700, color:cfg.color, textTransform:"capitalize" }}>{label || "—"}</Typography>
      </Box>
    );
  };

  // Extract counts from breakdown for Sentiment Insights
  const getBreakdownCount = (label) =>
    sentStats?.breakdown?.find(b => b.sentiment === label)?.count ?? 0;

  if (!authChecked) return (
    <Box sx={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f0f4ff" }}>
      <LinearProgress sx={{ width:300, borderRadius:4 }} />
    </Box>
  );

  return (
    <Box sx={{ background:"#f0f4ff", minHeight:"calc(100vh - 58px)" }}>

      {/* Header */}
      <Box sx={{ background:"linear-gradient(135deg,#1a1a2e,#2d3561)", py:2.5, px:3 }}>
        <Container maxWidth="xl">
          <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <Box>
              <Typography variant="h5" sx={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#fff" }}>
                🛡️ IntelliCrash Admin
              </Typography>
              <Typography sx={{ color:"rgba(255,255,255,0.6)", fontSize:13 }}>
                {adminUser?.email} · Authenticated via Supabase
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button onClick={load} startIcon={<Refresh/>} variant="outlined"
                sx={{ borderColor:"rgba(255,255,255,0.4)", color:"#fff", borderRadius:20,
                  "&:hover":{ background:"rgba(255,255,255,0.1)" } }}>
                Refresh
              </Button>
              <Button onClick={handleLogout} startIcon={<Logout/>} variant="outlined"
                sx={{ borderColor:"rgba(239,68,68,0.5)", color:"#f87171", borderRadius:20,
                  "&:hover":{ background:"rgba(239,68,68,0.1)" } }}>
                Logout
              </Button>
              <Button onClick={() => nav("/navigate")} variant="contained"
                sx={{ borderRadius:20, fontWeight:700 }}>← App</Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py:3 }}>
        {loading && <LinearProgress sx={{ mb:2, borderRadius:4 }} />}
        {importMsg && <Alert severity={importMsg.startsWith("✅") ? "success" : "error"} sx={{ mb:2, borderRadius:2 }}>{importMsg}</Alert>}
        {deleteMsg && <Alert severity={deleteMsg.startsWith("✅") ? "success" : "error"} sx={{ mb:2, borderRadius:2 }}>{deleteMsg}</Alert>}

        {/* Stats row */}
        <Grid container spacing={1.5} sx={{ mb:3 }}>
          {SC.map(s => (
            <Grid item xs={6} sm={3} md={1.5} key={s.label}>
              <Card elevation={0} sx={{ border:`1px solid ${s.color}22`, borderRadius:3, textAlign:"center", overflow:"hidden" }}>
                <Box sx={{ height:3, background:s.color }} />
                <CardContent sx={{ py:1.5, px:1 }}>
                  <Box sx={{ color:s.color, mb:0.5, "& svg":{ fontSize:18 } }}>{s.icon}</Box>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</Typography>
                  <Typography sx={{ fontSize:10, color:"#80868b", mt:0.3 }}>{s.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb:2, "& .MuiTab-root":{ fontWeight:700, textTransform:"none", fontSize:12 } }}>
          {["📊 Analytics", "💬 Sentiment", "📋 Database", "🔧 Tools", "🌲 RF Model"].map((l, i) => <Tab key={i} label={l}/>)}
        </Tabs>

        {/* ══ ANALYTICS ══ */}
        {tab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Card elevation={0} sx={{ border:"1px solid #e3eaf5", borderRadius:3 }}>
                <CardContent>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:2 }}>🕐 Incident Hour Distribution</Typography>
                  {analytics?.hour_distribution
                    ? <HourHeatmap data={analytics.hour_distribution}/>
                    : <Typography sx={{ color:"#80868b", fontSize:13 }}>No data yet — incidents appear here as reports are filed.</Typography>}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2.5}>
              <Card elevation={0} sx={{ border:"1px solid #e3eaf5", borderRadius:3, height:"100%" }}>
                <CardContent>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:2 }}>📊 Report Types</Typography>
                  {typeData.length > 0
                    ? <MiniBar data={typeData} color="#ea4335" height={90}/>
                    : <Typography sx={{ color:"#80868b", fontSize:12 }}>No reports yet</Typography>}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2.5}>
              <Card elevation={0} sx={{ border:"1px solid #e3eaf5", borderRadius:3, height:"100%" }}>
                <CardContent>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:2 }}>📈 SOS Risk Trend</Typography>
                  {analytics?.risk_trend?.slice(0, 8).map((r, i) => (
                    <Box key={i} sx={{ display:"flex", justifyContent:"space-between", py:0.5, borderBottom:"1px solid #f1f3f4" }}>
                      <Typography sx={{ fontSize:10, color:"#80868b" }}>{r.ts}</Typography>
                      <Typography sx={{ fontSize:11, fontWeight:700, color:RC(r.score) }}>{r.score?.toFixed(0)}</Typography>
                    </Box>
                  )) || <Typography sx={{ color:"#80868b", fontSize:12 }}>No SOS data</Typography>}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card elevation={0} sx={{ border:"1px solid #e3eaf5", borderRadius:3 }}>
                <CardContent>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:2 }}>🔴 Learned Hotspots</Typography>
                  {analytics?.top_hotspots?.length > 0 ? (
                    <Box sx={{ overflowX:"auto" }}>
                      <Table size="small">
                        <TableHead><TableRow sx={{ background:"#fce8e6" }}>
                          {["#","Lat","Lon","Reports","Avg Sev","Risk"].map(h =>
                            <TableCell key={h} sx={{ fontWeight:700, fontSize:11, color:"#ea4335" }}>{h}</TableCell>)}
                        </TableRow></TableHead>
                        <TableBody>
                          {analytics.top_hotspots.map((h, i) => (
                            <TableRow key={i} sx={{ "&:hover":{ background:"#fce8e6" } }}>
                              <TableCell sx={{ fontSize:12 }}>{i + 1}</TableCell>
                              <TableCell sx={{ fontSize:11, fontFamily:"monospace" }}>{h.lat?.toFixed(5)}</TableCell>
                              <TableCell sx={{ fontSize:11, fontFamily:"monospace" }}>{h.lon?.toFixed(5)}</TableCell>
                              <TableCell sx={{ fontSize:12, fontWeight:700 }}>{h.report_count}</TableCell>
                              <TableCell sx={{ fontSize:12 }}>{h.avg_severity?.toFixed(1)}/3</TableCell>
                              <TableCell><Chip label={h.avg_severity >= 2.5 ? "HIGH" : "MEDIUM"} size="small"
                                sx={{ fontWeight:700, fontSize:10,
                                  background:h.avg_severity >= 2.5 ? "#fce8e6" : "#fff8e1",
                                  color:h.avg_severity >= 2.5 ? "#ea4335" : "#b06000" }}/></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  ) : <Alert severity="info" sx={{ borderRadius:2, fontSize:12 }}>No learned hotspots yet. They appear as 2+ community reports accumulate at the same location.</Alert>}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* ══ SENTIMENT TAB ══ */}
        {tab === 1 && (
          <Grid container spacing={3}>
            {/* Overview donut */}
            <Grid item xs={12} md={5}>
              <Card elevation={0} sx={{ border:"1px solid #e3eaf5", borderRadius:3 }}>
                <CardContent>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:2 }}>
                    🧠 NLP Sentiment Overview
                  </Typography>
                  {sentStats?.breakdown?.length > 0 ? (
                    // ✅ FIX: pass breakdown array
                    <SentimentDonut breakdown={sentStats.breakdown} />
                  ) : (
                    <Alert severity="info" sx={{ borderRadius:2, fontSize:12 }}>
                      No reviews yet. Reviews appear when drivers submit feedback after trips.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Sentiment Insights */}
            <Grid item xs={12} md={7}>
              <Card elevation={0} sx={{ border:"1px solid #e3eaf5", borderRadius:3 }}>
                <CardContent>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:2 }}>
                    📋 Sentiment Insights
                  </Typography>
                  {sentStats && sentStats.total > 0 ? (
                    <Box>
                      <Box sx={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1.5, mb:2 }}>
                        {[
                          // ✅ FIX: read from breakdown array
                          { label:"Total Reviews",    value:sentStats.total,                    color:"#1d4ed8" },
                          { label:"Positive Reviews", value:getBreakdownCount("positive"),      color:"#16a34a" },
                          { label:"Negative Reviews", value:getBreakdownCount("negative"),      color:"#dc2626" },
                          { label:"Neutral Reviews",  value:getBreakdownCount("neutral"),       color:"#d97706" },
                        ].map(s => (
                          <Box key={s.label} sx={{ p:1.5, background:"#f8faff", borderRadius:2, textAlign:"center", border:"1px solid #e2e8f0" }}>
                            <Typography sx={{ fontWeight:900, fontSize:28, color:s.color, lineHeight:1 }}>{s.value}</Typography>
                            <Typography sx={{ fontSize:11, color:"#64748b", mt:0.3 }}>{s.label}</Typography>
                          </Box>
                        ))}
                      </Box>
                      {getBreakdownCount("negative") > 0 && (
                        <Alert severity="warning" sx={{ borderRadius:2, fontSize:12 }}>
                          ⚠️ {getBreakdownCount("negative")} negative review{getBreakdownCount("negative") > 1 ? "s" : ""} detected. Check the reviews table below.
                        </Alert>
                      )}
                      {getBreakdownCount("positive") > sentStats.total * 0.7 && (
                        <Alert severity="success" sx={{ borderRadius:2, fontSize:12, mt:1 }}>
                          ✅ {sentStats.positive_pct}% positive sentiment — drivers are satisfied with IntelliCrash!
                        </Alert>
                      )}
                    </Box>
                  ) : (
                    <Typography sx={{ color:"#80868b", fontSize:13 }}>
                      Sentiment insights will appear once drivers submit reviews.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* All reviews table with DELETE */}
            <Grid item xs={12}>
              <Card elevation={0} sx={{ border:"1px solid #e3eaf5", borderRadius:3 }}>
                <CardContent>
                  <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2 }}>
                    <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700 }}>
                      💬 All Driver Reviews (Admin View)
                    </Typography>
                    <Box sx={{ display:"flex", gap:1 }}>
                      <Chip label={`${reviews.length} total`} sx={{ fontWeight:700 }} />
                      <Button size="small" startIcon={<Download/>} onClick={() => exportCSV(reviews, "reviews.csv")}
                        variant="outlined" color="success" sx={{ borderRadius:20 }}>CSV</Button>
                    </Box>
                  </Box>
                  <TextField size="small" placeholder="Search reviews..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    sx={{ mb:2, width:280 }} />
                  {reviews.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius:2, fontSize:12 }}>
                      No reviews yet. After a driver completes a trip, a review popup appears in Navigation.
                    </Alert>
                  ) : (
                    <Box sx={{ overflowX:"auto", border:"1px solid #e3eaf5", borderRadius:2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ background:"#f3e8ff" }}>
                            {["#","Name","Review","Rating","Sentiment","Score","Date","Delete"].map(h => (
                              <TableCell key={h} sx={{ fontWeight:700, fontSize:11, color:"#7c3aed" }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reviews
                            .filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
                            .map((r, i) => (
                              <TableRow key={r.id || i} sx={{ "&:hover":{ background:"#faf5ff" }, "&:nth-of-type(even)":{ background:"#fdfaff" } }}>
                                <TableCell sx={{ fontSize:12 }}>{i + 1}</TableCell>
                                {/* ✅ FIX: r.user_name not r.name */}
                                <TableCell sx={{ fontSize:12, fontWeight:600 }}>{r.user_name || "Anonymous"}</TableCell>
                                <TableCell sx={{ fontSize:12, maxWidth:260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                  <Tooltip title={r.review_text}><span>{r.review_text}</span></Tooltip>
                                </TableCell>
                                <TableCell sx={{ fontSize:12 }}>{"⭐".repeat(r.rating || 0)}</TableCell>
                                {/* ✅ FIX: r.sentiment not r.sentiment_label */}
                                <TableCell>{r.sentiment ? sentimentBadge(r.sentiment) : "—"}</TableCell>
                                {/* ✅ FIX: r.sentiment_score not r.score */}
                                <TableCell sx={{ fontSize:12, fontWeight:700,
                                  color: r.sentiment === "positive" ? "#16a34a" : r.sentiment === "negative" ? "#dc2626" : "#d97706" }}>
                                  {r.sentiment_score != null ? `${Math.round(r.sentiment_score)}%` : "—"}
                                </TableCell>
                                <TableCell sx={{ fontSize:11, color:"#80868b" }}>
                                  {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "—"}
                                </TableCell>
                                {/* ✅ DELETE button */}
                                <TableCell>
                                  <Tooltip title="Delete this review">
                                    <IconButton size="small" color="error"
                                      onClick={() => handleDeleteReview(r.id)}
                                      sx={{ "&:hover":{ background:"#fce8e6" } }}>
                                      <Delete fontSize="small"/>
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* ══ DATABASE ══ */}
        {tab === 2 && (
          <Box>
            <Tabs value={dbTab} onChange={(_, v) => setDbTab(v)}
              sx={{ mb:2, "& .MuiTab-root":{ fontWeight:600, textTransform:"none", fontSize:12 } }}>
              {DB_TABS.map((t, i) => <Tab key={i} label={t.label}/>)}
            </Tabs>
            {DB_TABS.map((dt, ti) => (
              <Box key={ti} sx={{ display:dbTab === ti ? "block" : "none" }}>
                <Box sx={{ display:"flex", gap:2, mb:2, alignItems:"center" }}>
                  <TextField size="small" placeholder="Search..." value={search}
                    onChange={e => setSearch(e.target.value)} sx={{ flex:1, maxWidth:280 }}/>
                  <Chip label={`${dt.data.length} records`} sx={{ fontWeight:700 }}/>
                  <Button size="small" startIcon={<Download/>} onClick={() => exportCSV(dt.data, dt.fn)}
                    variant="outlined" color="success" sx={{ borderRadius:20 }}>CSV</Button>
                </Box>
                <Box sx={{ overflowX:"auto", border:"1px solid #e3eaf5", borderRadius:2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ background:"#f8faff" }}>
                        {dt.data.length > 0 && Object.keys(dt.data[0]).slice(0, 8).map(k => (
                          <TableCell key={k} sx={{ fontWeight:700, fontSize:10, color:"#6b7a99", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                            {k.replace(/_/g, " ")}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dt.data
                        .filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
                        .slice(0, 50)
                        .map((row, i) => (
                          <TableRow key={i} sx={{ "&:hover":{ background:"#f8faff" }, "&:nth-of-type(even)":{ background:"#fafbff" } }}>
                            {Object.values(row).slice(0, 8).map((v, j) => (
                              <TableCell key={j} sx={{ fontSize:11, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                {typeof v === "object" ? JSON.stringify(v).slice(0, 50) : String(v ?? "—").slice(0, 80)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* ══ TOOLS ══ */}
        {tab === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border:"1px solid #e3eaf5", borderRadius:3 }}>
                <CardContent>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:1 }}>📤 Bulk Hotspot Import (CSV)</Typography>
                  <Typography sx={{ fontSize:12, color:"#80868b", mb:1.5 }}>Format: lat,lon,name,accidents,killed,district</Typography>
                  <Alert severity="info" sx={{ mb:1.5, borderRadius:2, fontSize:11 }}><code>lat,lon,name,accidents,killed,district</code></Alert>
                  <Box sx={{ background:"#f8faff", border:"2px dashed #c7d7f5", borderRadius:2, p:3, textAlign:"center", cursor:"pointer",
                    "&:hover":{ borderColor:"#1a73e8", background:"#e8f0fe" } }} onClick={() => fileRef.current.click()}>
                    <Typography sx={{ fontSize:28, mb:0.5 }}>📁</Typography>
                    <Typography sx={{ fontWeight:700, color:"#1a73e8", fontSize:13 }}>Click to upload CSV</Typography>
                  </Box>
                  {/* ✅ FIX: correct endpoint in handleCSV */}
                  <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }} onChange={handleCSV}/>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border:"1px solid #e3eaf5", borderRadius:3 }}>
                <CardContent>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:1.5 }}>🏔️ Seasonal Pass Status</Typography>
                  {[
                    ["Rohtang Pass",   [5,6,7,8,9,10],  "3978m", "Atal Tunnel"],
                    ["Spiti Valley",   [6,7,8,9],        "4550m", "Via Shimla"],
                    ["Jalori Pass",    [4,5,6,7,8,9,10], "3120m", "Via NH"],
                    ["Baralacha Pass", [6,7,8,9],         "4890m", "None"],
                    ["Kunzum Pass",    [6,7,8,9],         "4590m", "Atal Tunnel"],
                  ].map(([name, open, elev, alt]) => {
                    const m = new Date().getMonth() + 1;
                    const isOpen = open.includes(m);
                    return (
                      <Box key={name} sx={{ display:"flex", justifyContent:"space-between", p:1, mb:0.5, borderRadius:2,
                        background:isOpen ? "#e6f4ea" : "#fce8e6", border:`1px solid ${isOpen ? "#a8d5b5" : "#f5c6c2"}` }}>
                        <Box>
                          <Typography sx={{ fontSize:12, fontWeight:700 }}>{name}</Typography>
                          <Typography sx={{ fontSize:10, color:"#80868b" }}>{elev} · Alt: {alt}</Typography>
                        </Box>
                        <Chip label={isOpen ? "OPEN" : "CLOSED"} size="small"
                          color={isOpen ? "success" : "error"} sx={{ fontWeight:700, fontSize:10 }}/>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* ══ RF MODEL ══ */}
        {tab === 4 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Card elevation={0} sx={{ border:"1px solid #e3eaf5", borderRadius:3 }}>
                <CardContent>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:2 }}>🌲 RF Feature Importances</Typography>
                  {Object.keys(features).length > 0 ? (
                    Object.entries(features).sort(([,a],[,b]) => b - a).map(([k, v]) => (
                      <Box key={k} sx={{ mb:1.5 }}>
                        <Box sx={{ display:"flex", justifyContent:"space-between", mb:0.3 }}>
                          <Typography sx={{ fontSize:12, color:"#1a1a1a", fontWeight:600 }}>{k.replace(/_/g, " ")}</Typography>
                          <Typography sx={{ fontSize:12, fontWeight:700, color:"#7c3aed" }}>{(v * 100).toFixed(1)}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={v * 100}
                          sx={{ height:7, borderRadius:4, background:"#f1f3f4",
                            "& .MuiLinearProgress-bar":{ background:"linear-gradient(90deg,#7c3aed,#1a73e8)" } }}/>
                      </Box>
                    ))
                  ) : <Alert severity="warning" sx={{ borderRadius:2, fontSize:12 }}>RF model not loaded. Place .pkl files in python/ folder.</Alert>}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={7}>
              <Card elevation={0} sx={{ border:"1px solid #e3eaf5", borderRadius:3 }}>
                <CardContent>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, mb:2 }}>📊 Model Visualizations</Typography>
                  <Grid container spacing={1.5}>
                    {["confusion_matrix.png","feature_importance.png","actual_vs_predicted.png","classification_report_heatmap.png"].map(f => (
                      <Grid item xs={6} key={f}>
                        <Box sx={{ border:"1px solid #e3eaf5", borderRadius:2, overflow:"hidden" }}>
                          <img src={`/api/static/${f}`} alt={f} style={{ width:"100%", height:140, objectFit:"contain", background:"#f8faff" }}
                            onError={e => { e.target.style.display = "none"; }}/>
                          <Typography sx={{ fontSize:10, color:"#80868b", p:0.5, textAlign:"center" }}>{f.replace(".png","").replace(/_/g," ")}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}