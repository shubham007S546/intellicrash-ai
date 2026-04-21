/**
 * Home.jsx — IntelliCrash v5.0 FINAL
 * ✅ Sign In / Sign Up button added to hero
 * ✅ Shows logged-in user name + logout if session exists
 * ✅ ReviewSection fully integrated above CTA
 * ✅ All existing features preserved
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  Chip, Stack, CardActionArea, LinearProgress, Tooltip,
  TextField, Rating, CircularProgress, Avatar,
} from "@mui/material";
import { NavigationOutlined, Bolt, ArrowForward, Warning, Send, Star, Login, Logout } from "@mui/icons-material";
import { getStats, getReports } from "../services/api";
import { supabase } from "../services/supabase";   // ✅ NEW

const REFRESH_MS = 20_000;
const EXPIRE_MS  = 6 * 3600_000;

const RICON  = { accident:"💥", traffic:"🚦", roadblock:"🚧", hazard:"⚠️", contribution:"💬" };
const RCOL   = { accident:"#ef4444", traffic:"#f59e0b", roadblock:"#3b82f6", hazard:"#a855f7", contribution:"#22c55e" };
const RLABEL = { accident:"Accident", traffic:"Traffic Jam", roadblock:"Roadblock", hazard:"Hazard", contribution:"Tip" };

function isExpired(r) {
  if (r.resolved) return true;
  if (!r.timestamp) return false;
  return Date.now() - new Date(r.timestamp).getTime() > EXPIRE_MS;
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (diff < 1)  return "Just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff/60)}h ago`;
}

function useCountUp(target, duration=1200) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now-start)/duration, 1);
          setVal(Math.floor(p*target));
          if (p < 1) requestAnimationFrame(tick);
          else setVal(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold:0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return [val, ref];
}

function LiveTicker({ reports }) {
  const nav = useNavigate();
  if (!reports.length) return null;
  const items = [...reports, ...reports];
  return (
    <Box onClick={() => nav("/bulletin")} sx={{
      background:"linear-gradient(90deg,#0f172a,#1e3a5f)",
      py:1.2, cursor:"pointer", overflow:"hidden", position:"relative",
      "&:hover .ticker-content":{ animationPlayState:"paused" },
      borderBottom:"1px solid rgba(255,255,255,0.08)",
    }}>
      <Box sx={{ position:"absolute", left:0, top:0, bottom:0, width:60,
        background:"linear-gradient(90deg,#0f172a,transparent)", zIndex:2, pointerEvents:"none" }} />
      <Box sx={{ position:"absolute", right:0, top:0, bottom:0, width:60,
        background:"linear-gradient(270deg,#0f172a,transparent)", zIndex:2, pointerEvents:"none" }} />
      <Box sx={{ display:"flex", alignItems:"center", pl:2, position:"relative", zIndex:1 }}>
        <Box sx={{ display:"flex", alignItems:"center", gap:0.8, mr:2, flexShrink:0 }}>
          <Box sx={{ width:7, height:7, borderRadius:"50%", background:"#22c55e",
            animation:"tickerPulse 1.5s infinite",
            "@keyframes tickerPulse":{"0%,100%":{opacity:1},"50%":{opacity:0.3}} }} />
          <Typography sx={{ fontSize:10, fontWeight:900, color:"#86efac", letterSpacing:"0.1em" }}>LIVE</Typography>
        </Box>
        <Box className="ticker-content" sx={{
          display:"flex", gap:3, alignItems:"center",
          animation:"tickerScroll 40s linear infinite",
          "@keyframes tickerScroll":{ from:{transform:"translateX(0)"}, to:{transform:"translateX(-50%)"} },
          willChange:"transform",
        }}>
          {items.map((r,i) => (
            <Box key={`${r.id}-${i}`} sx={{ display:"flex", alignItems:"center", gap:0.8, flexShrink:0 }}>
              <Typography sx={{ fontSize:13 }}>{RICON[r.type]||"⚠️"}</Typography>
              <Typography sx={{ fontSize:11, color:"rgba(255,255,255,0.9)", fontWeight:600, whiteSpace:"nowrap" }}>
                {r.landmark || r.description?.slice(0,40) || "HP Road"}
              </Typography>
              <Typography sx={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>{timeAgo(r.timestamp)}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function StatCard({ n, label, sub }) {
  const raw = parseFloat(n.replace(/[^0-9.]/g,""));
  const suffix = n.replace(/[0-9.]/g,"");
  const isNum = !isNaN(raw);
  const [display, ref] = useCountUp(isNum ? raw : 0, 1400);
  return (
    <Box ref={ref} sx={{ textAlign:"center", py:1 }}>
      <Typography sx={{ fontFamily:"'Syne',sans-serif", fontSize:{ xs:26, md:32 }, fontWeight:900, color:"#1d4ed8", lineHeight:1 }}>
        {isNum ? `${display}${suffix}` : n}
      </Typography>
      <Typography sx={{ fontSize:12, fontWeight:700, color:"#1a1a1a", mt:0.5 }}>{label}</Typography>
      <Typography sx={{ fontSize:10, color:"#94a3b8" }}>{sub}</Typography>
    </Box>
  );
}

function HomeReportCard({ r, index, onClick }) {
  const clr = RCOL[r.type] || "#6b7a99";
  return (
    <Card elevation={0} sx={{
      border:`1.5px solid ${clr}22`, borderRadius:3, overflow:"hidden",
      animation:`slideUp 0.5s cubic-bezier(.22,.68,0,1.2) ${index*0.07}s both`,
      "@keyframes slideUp":{ from:{opacity:0,transform:"translateY(18px)"}, to:{opacity:1,transform:"translateY(0)"} },
      transition:"all 0.22s",
      "&:hover":{ transform:"translateY(-4px)", boxShadow:`0 10px 28px ${clr}28`, borderColor:`${clr}55` },
    }}>
      <Box sx={{ height:3, background:clr }} />
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ py:1.5, px:2 }}>
          <Box sx={{ display:"flex", gap:1.5, alignItems:"flex-start" }}>
            <Box sx={{ width:36, height:36, borderRadius:2, background:`${clr}12`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
              {RICON[r.type]||"⚠️"}
            </Box>
            <Box sx={{ flex:1, minWidth:0 }}>
              <Box sx={{ display:"flex", justifyContent:"space-between", mb:0.4 }}>
                <Typography sx={{ fontWeight:700, fontSize:13, textTransform:"capitalize", color:"#1a1a1a" }}>
                  {RLABEL[r.type]||r.type}
                </Typography>
                {r.severity && (
                  <Chip label={r.severity} size="small" sx={{ height:16, fontSize:9, fontWeight:700,
                    background:r.severity==="severe"?"#fef2f2":r.severity==="moderate"?"#fffbeb":"#f0fdf4",
                    color:r.severity==="severe"?"#ef4444":r.severity==="moderate"?"#b06000":"#137333" }} />
                )}
              </Box>
              <Typography sx={{ fontSize:12, color:"#5f6368", mb:0.5 }} noWrap>
                📍 {r.landmark || r.description?.slice(0,50) || "HP Road"}
              </Typography>
              <Box sx={{ display:"flex", justifyContent:"space-between" }}>
                <Typography sx={{ fontSize:10, color:"#80868b" }}>{timeAgo(r.timestamp)}</Typography>
                <Typography sx={{ fontSize:10, fontWeight:700, color:clr }}>View details →</Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function HeroParticles() {
  const particles = [
    { emoji:"🛡️", x:"15%", y:"20%", size:28, delay:0,   dur:6 },
    { emoji:"🗺️", x:"80%", y:"15%", size:22, delay:1.5, dur:7 },
    { emoji:"⚡",  x:"70%", y:"70%", size:20, delay:0.8, dur:5 },
    { emoji:"🚨",  x:"20%", y:"75%", size:20, delay:2,   dur:8 },
    { emoji:"🌤️", x:"50%", y:"10%", size:18, delay:0.3, dur:6.5 },
    { emoji:"📡",  x:"88%", y:"50%", size:18, delay:1,   dur:7.5 },
  ];
  return (
    <Box sx={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
      {particles.map((p,i) => (
        <Box key={i} sx={{
          position:"absolute", left:p.x, top:p.y, fontSize:p.size, opacity:0.18,
          animation:`float${i} ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
          [`@keyframes float${i}`]: {
            from:{ transform:"translateY(0px) rotate(0deg)" },
            to:  { transform:`translateY(-${12+i*3}px) rotate(${5*(i%2===0?1:-1)}deg)` },
          },
        }}>{p.emoji}</Box>
      ))}
    </Box>
  );
}

function SentimentBadge({ label, score }) {
  const cfg = {
    positive: { color:"#16a34a", bg:"#dcfce7", icon:"😊" },
    negative: { color:"#dc2626", bg:"#fee2e2", icon:"😞" },
    neutral:  { color:"#d97706", bg:"#fef3c7", icon:"😐" },
  }[label] || { color:"#64748b", bg:"#f1f5f9", icon:"🤔" };
  return (
    <Box sx={{ display:"inline-flex", alignItems:"center", gap:0.5,
      background:cfg.bg, borderRadius:10, px:1.2, py:0.3 }}>
      <Typography sx={{ fontSize:12 }}>{cfg.icon}</Typography>
      <Typography sx={{ fontSize:10, fontWeight:700, color:cfg.color, textTransform:"capitalize" }}>
        {label} {score && `· ${score}%`}
      </Typography>
    </Box>
  );
}

function ReviewCard({ review, index }) {
  const initials = (review.name || "U").slice(0,2).toUpperCase();
  const colors = ["#1d4ed8","#059669","#d97706","#7c3aed","#0891b2","#dc2626"];
  const color = colors[index % colors.length];
  return (
    <Card elevation={0} sx={{
      border:"1.5px solid #e2e8f0", borderRadius:3, height:"100%",
      animation:`fadeCard 0.5s ease ${index*0.1}s both`,
      "@keyframes fadeCard":{ from:{opacity:0,transform:"translateY(16px)"}, to:{opacity:1,transform:"none"} },
      transition:"all 0.22s",
      "&:hover":{ transform:"translateY(-4px)", boxShadow:`0 12px 32px ${color}18`, borderColor:`${color}44` },
      position:"relative", overflow:"hidden",
    }}>
      <Box sx={{ height:3, background:`linear-gradient(90deg,${color},${color}88)` }} />
      <CardContent sx={{ p:2.5 }}>
        <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", mb:1.5 }}>
          <Box sx={{ display:"flex", alignItems:"center", gap:1.2 }}>
            <Avatar sx={{ width:36, height:36, background:color, fontSize:13, fontWeight:800 }}>
              {initials}
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>
                {review.name || "Anonymous"}
              </Typography>
              <Typography sx={{ fontSize:10, color:"#94a3b8" }}>
                {review.created_at ? timeAgo(review.created_at) : "Recently"}
              </Typography>
            </Box>
          </Box>
          {review.sentiment_label && (
            <SentimentBadge label={review.sentiment_label} score={review.sentiment_score} />
          )}
        </Box>
        {review.rating && (
          <Box sx={{ mb:1 }}>
            <Rating value={review.rating} readOnly size="small"
              sx={{ "& .MuiRating-iconFilled":{ color:"#f59e0b" } }} />
          </Box>
        )}
        <Typography sx={{ fontSize:13, color:"#475569", lineHeight:1.75, fontStyle:"italic" }}>
          "{review.review_text}"
        </Typography>
      </CardContent>
    </Card>
  );
}

function ReviewSubmitForm({ onSubmitted }) {
  const [name, setName]       = useState("");
  const [text, setText]       = useState("");
  const [rating, setRating]   = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");

  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 5) { setError("Please write at least 5 characters."); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/reviews", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ name: name.trim() || "Anonymous", review_text: text.trim(), rating }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setName(""); setText(""); setRating(5);
        onSubmitted && onSubmitted();
      } else {
        setError(data.detail || "Submission failed. Try again.");
      }
    } catch {
      setError("Network error. Make sure the backend is running.");
    }
    setLoading(false);
  };

  if (result) return (
    <Box sx={{ textAlign:"center", py:4, px:3,
      background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:3 }}>
      <Typography sx={{ fontSize:32, mb:1 }}>🎉</Typography>
      <Typography sx={{ fontWeight:700, color:"#16a34a", fontSize:15, mb:0.5 }}>
        Thank you for your feedback!
      </Typography>
      <SentimentBadge label={result.sentiment?.label} score={result.sentiment?.score} />
      <Typography sx={{ fontSize:12, color:"#64748b", mt:1.5 }}>
        Your review helps improve IntelliCrash for all HP drivers.
      </Typography>
      <Button size="small" onClick={() => setResult(null)}
        sx={{ mt:2, color:"#16a34a", fontWeight:700, fontSize:12 }}>
        Write another review
      </Button>
    </Box>
  );

  return (
    <Box sx={{ background:"#f8faff", border:"1.5px solid #e2e8f0", borderRadius:3, p:3 }}>
      <Typography sx={{ fontWeight:800, fontSize:15, color:"#0f172a", mb:0.5 }}>
        ✍️ Share Your Experience
      </Typography>
      <Typography sx={{ fontSize:12, color:"#64748b", mb:2 }}>
        Your feedback helps us improve road safety for everyone in HP.
      </Typography>
      <Box sx={{ display:"flex", flexDirection:"column", gap:2 }}>
        <TextField
          label="Your Name (optional)" value={name} onChange={e => setName(e.target.value)}
          size="small" fullWidth sx={{ "& .MuiOutlinedInput-root":{ borderRadius:2, fontSize:13 } }}
        />
        <Box>
          <Typography sx={{ fontSize:12, color:"#64748b", mb:0.5 }}>Rating</Typography>
          <Rating value={rating} onChange={(_, v) => setRating(v || 1)}
            sx={{ "& .MuiRating-iconFilled":{ color:"#f59e0b" } }} />
        </Box>
        <TextField
          label="Your Review" value={text}
          onChange={e => { setText(e.target.value); setError(""); }}
          size="small" fullWidth multiline rows={3}
          placeholder="Tell us about your experience with IntelliCrash on HP roads..."
          sx={{ "& .MuiOutlinedInput-root":{ borderRadius:2, fontSize:13 } }}
        />
        {error && <Typography sx={{ fontSize:12, color:"#dc2626" }}>{error}</Typography>}
        <Button variant="contained" onClick={handleSubmit}
          disabled={loading || !text.trim()}
          endIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Send fontSize="small" />}
          sx={{
            borderRadius:2, fontWeight:700, fontSize:13, py:1.2,
            background:"#1d4ed8", "&:hover":{ background:"#1e40af" },
            "&:disabled":{ background:"#cbd5e1" },
          }}>
          {loading ? "Analysing Sentiment..." : "Submit Review"}
        </Button>
      </Box>
    </Box>
  );
}

function ReviewSection() {
  const [reviews, setReviews] = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    try {
      const [rRes, sRes] = await Promise.allSettled([
        fetch("/api/reviews/top").then(r => r.json()),
        fetch("/api/reviews/stats").then(r => r.json()),
      ]);
      if (rRes.status === "fulfilled") setReviews(rRes.value?.reviews || []);
      if (sRes.status === "fulfilled") setStats(sRes.value);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const positivePercent = stats
    ? Math.round((stats.positive / Math.max(stats.total, 1)) * 100)
    : null;

  return (
    <Box sx={{ py:{ xs:5, md:8 }, background:"#fff" }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign:"center", mb:5 }}>
          <Chip label="Community Feedback · AI Sentiment Analysis"
            sx={{ background:"#f3e8ff", color:"#7c3aed", fontWeight:700, mb:2, fontSize:11 }} />
          <Typography variant="h4" sx={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#0f172a", mb:1.5 }}>
            💬 What Drivers Are Saying
          </Typography>
          <Typography sx={{ color:"#64748b", fontSize:15, maxWidth:520, mx:"auto" }}>
            Real reviews from HP drivers, analysed by our NLP sentiment model to help improve IntelliCrash.
          </Typography>
        </Box>

        {stats && stats.total > 0 && (
          <Box sx={{ mb:5, p:3, background:"linear-gradient(135deg,#f0f4ff,#e8f0fe)",
            borderRadius:3, border:"1px solid #dbeafe" }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3} sx={{ textAlign:"center" }}>
                <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:42, color:"#1d4ed8", lineHeight:1 }}>
                  {positivePercent}%
                </Typography>
                <Typography sx={{ fontSize:12, color:"#64748b", fontWeight:600 }}>Positive Sentiment</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Grid container spacing={2}>
                  {[
                    { label:"😊 Positive", count:stats.positive, color:"#16a34a", bg:"#dcfce7" },
                    { label:"😐 Neutral",  count:stats.neutral,  color:"#d97706", bg:"#fef3c7" },
                    { label:"😞 Negative", count:stats.negative, color:"#dc2626", bg:"#fee2e2" },
                  ].map(s => (
                    <Grid item xs={4} key={s.label}>
                      <Box sx={{ textAlign:"center", p:1.5, background:s.bg,
                        borderRadius:2, border:`1px solid ${s.color}22` }}>
                        <Typography sx={{ fontWeight:900, fontSize:22, color:s.color }}>{s.count}</Typography>
                        <Typography sx={{ fontSize:11, color:s.color, fontWeight:600 }}>{s.label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                <Box sx={{ mt:1.5 }}>
                  <Box sx={{ display:"flex", borderRadius:10, overflow:"hidden", height:8 }}>
                    <Box sx={{ width:`${(stats.positive/stats.total)*100}%`, background:"#16a34a", transition:"width 1s" }} />
                    <Box sx={{ width:`${(stats.neutral/stats.total)*100}%`,  background:"#d97706", transition:"width 1s" }} />
                    <Box sx={{ width:`${(stats.negative/stats.total)*100}%`, background:"#dc2626", transition:"width 1s" }} />
                  </Box>
                  <Typography sx={{ fontSize:10, color:"#94a3b8", mt:0.5, textAlign:"right" }}>
                    Based on {stats.total} review{stats.total!==1?"s":""}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            {loading && (
              <Box sx={{ display:"flex", justifyContent:"center", py:6 }}>
                <CircularProgress size={32} sx={{ color:"#1d4ed8" }} />
              </Box>
            )}
            {!loading && reviews.length === 0 && (
              <Box sx={{ textAlign:"center", py:7, border:"2px dashed #e2e8f0",
                borderRadius:4, background:"#f8faff" }}>
                <Typography sx={{ fontSize:40, mb:1 }}>💬</Typography>
                <Typography sx={{ color:"#64748b", fontSize:15, fontWeight:600, mb:0.5 }}>No reviews yet</Typography>
                <Typography sx={{ color:"#94a3b8", fontSize:13 }}>Be the first to share your experience!</Typography>
              </Box>
            )}
            <Grid container spacing={2}>
              {reviews.map((r, i) => (
                <Grid item xs={12} sm={6} key={r.id || i}>
                  <ReviewCard review={r} index={i} />
                </Grid>
              ))}
            </Grid>
          </Grid>
          <Grid item xs={12} md={4}>
            <ReviewSubmitForm onSubmitted={() => { setTimeout(fetchReviews, 600); }} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

const FEATURES = [
  { icon:"🧠", title:"RF + LSTM Ensemble",   desc:"Random Forest trained on 20,000+ HP accident records + LSTM neural network. 94% accuracy on severity prediction.", color:"#7c3aed", bg:"#f3e8ff" },
  { icon:"🗺️", title:"Real-time Navigation", desc:"Turn-by-turn directions via OSRM. Village-level HP maps. Speed cameras, toll booths, iRAD hotspots overlay.", color:"#1a73e8", bg:"#e8f0fe" },
  { icon:"🚨", title:"Smart SOS",            desc:"GPS + AI risk + email admin instantly + SMS + WhatsApp. Finds nearest hospitals via OpenStreetMap.", color:"#ea4335", bg:"#fce8e6" },
  { icon:"📡", title:"Community Reports",    desc:"Real-time accident, traffic, hazard reporting. Auto-expires after 6 hours. Trains dynamic hotspot ML model.", color:"#f9ab00", bg:"#fff8e1" },
  { icon:"⚠️", title:"35 iRAD Hotspots",    desc:"Official MoRTH 2024 data. GPS of every dangerous HP location with exact fatality counts.", color:"#ea4335", bg:"#fce8e6" },
  { icon:"🌤️", title:"Weather + Forecast",  desc:"Live weather + 3-day OpenMeteo forecast. Risk score auto-adjusts for rain/snow/fog.", color:"#0097a7", bg:"#e0f7fa" },
];

const HP_STATS = [
  { n:"2,109", l:"HP Accidents 2024",   s:"iRAD/eDAR Official" },
  { n:"94%",   l:"RF Model Accuracy",   s:"20K+ training records" },
  { n:"35",    l:"Hotspots Mapped",     s:"GPS-verified MoRTH" },
  { n:"11",    l:"ML Features",         s:"Weather·Speed·Road·Time" },
  { n:"Free",  l:"No API Cost",         s:"OSRM+Nominatim+OpenMeteo" },
  { n:"112",   l:"HP Emergency",        s:"One-tap SOS call" },
];

// ─── MAIN HOME PAGE ─────────────────────────────────────────────────────────
export default function Home() {
  const nav = useNavigate();
  const [metrics, setMetrics] = useState({});
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user,    setUser]    = useState(null);   // ✅ NEW — track logged in user

  // ✅ NEW — listen to auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, rRes] = await Promise.allSettled([getStats(), getReports()]);
      if (mRes.status === "fulfilled") setMetrics(mRes.value || {});
      if (rRes.status === "fulfilled") {
        const live = (rRes.value.reports||[]).filter(r=>!isExpired(r));
        setReports(live);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  const severeCount = reports.filter(r=>r.severity==="severe").length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <Box sx={{ background:"#f0f4ff", fontFamily:"'DM Sans',sans-serif" }}>

      <LiveTicker reports={reports} />

      {/* HERO */}
      <Box sx={{
        background:"linear-gradient(160deg,#eff6ff 0%,#e8f0fe 40%,#e0f2fe 100%)",
        pt:{ xs:5, md:8 }, pb:{ xs:5, md:8 }, position:"relative", overflow:"hidden",
      }}>
        <HeroParticles />
        <Box sx={{ position:"absolute", width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle,#bfdbfe60,transparent 70%)",
          top:-100, right:-150, pointerEvents:"none",
          animation:"blob1 10s ease-in-out infinite alternate",
          "@keyframes blob1":{ from:{transform:"scale(1)"}, to:{transform:"scale(1.15) rotate(15deg)"} } }} />

        <Container maxWidth="lg" sx={{ position:"relative" }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ animation:"heroIn 0.7s cubic-bezier(.22,.68,0,1.2) both",
                "@keyframes heroIn":{ from:{opacity:0,transform:"translateY(30px)"}, to:{opacity:1,transform:"translateY(0)"} } }}>
                <Chip label="iRAD 2024 · MoRTH Official Data"
                  sx={{ background:"#dbeafe", color:"#1d4ed8", fontWeight:700, mb:2, fontSize:11 }} />

                {severeCount >= 1 && (
                  <Box sx={{ display:"inline-flex", alignItems:"center", gap:0.8,
                    background:"#fef2f2", border:"1px solid #fecaca",
                    borderRadius:2, px:1.5, py:0.7, mb:2, ml:1 }}>
                    <Box sx={{ width:6, height:6, borderRadius:"50%", background:"#ef4444",
                      animation:"blink 1s infinite", "@keyframes blink":{"0%,100%":{opacity:1},"50%":{opacity:0.2}} }} />
                    <Typography sx={{ fontSize:11, fontWeight:700, color:"#ef4444" }}>
                      {severeCount} SEVERE incident{severeCount>1?"s":""} on HP roads now
                    </Typography>
                  </Box>
                )}

                <Typography variant="h1" sx={{
                  fontFamily:"'Syne',sans-serif", fontWeight:900,
                  fontSize:{ xs:38, md:56 }, color:"#0f172a", lineHeight:1.1, mb:2,
                }}>
                  Drive Safer in<br/>
                  <Box component="span" sx={{
                    background:"linear-gradient(135deg,#1d4ed8,#0891b2)",
                    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                  }}>Himachal Pradesh</Box>
                </Typography>

                <Typography sx={{ fontSize:{ xs:15, md:17 }, color:"#475569", lineHeight:1.85, mb:3.5, maxWidth:480 }}>
                  India's first AI-powered road safety platform for HP mountain roads.{" "}
                  <strong>Random Forest + LSTM</strong> ensemble with real-time risk prediction,
                  community alerts and one-tap emergency SOS.
                </Typography>

                {/* ✅ HERO BUTTONS — now includes auth button */}
                <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ gap:1.5, mb:3 }}>
                  <Button variant="contained" size="large" startIcon={<NavigationOutlined />}
                    onClick={() => nav("/navigate")}
                    sx={{ borderRadius:3, px:3.5, py:1.5, fontWeight:800, fontSize:15, background:"#1d4ed8",
                      boxShadow:"0 8px 24px rgba(29,78,216,0.35)",
                      "&:hover":{ background:"#1e40af", transform:"translateY(-2px)" }, transition:"all 0.2s" }}>
                    Start Navigation
                  </Button>

                  <Button variant="outlined" size="large" startIcon={<Bolt />}
                    onClick={() => nav("/predict")}
                    sx={{ borderRadius:3, px:3.5, py:1.5, fontWeight:700, borderColor:"#1d4ed8", color:"#1d4ed8",
                      "&:hover":{ background:"#dbeafe", transform:"translateY(-2px)" }, transition:"all 0.2s" }}>
                    Predict Risk
                  </Button>

                  {/* ✅ Auth button — shows logout if logged in, sign in if not */}
                  {user ? (
                    <Button
                      variant="text"
                      startIcon={<Logout fontSize="small" />}
                      onClick={handleLogout}
                      sx={{
                        borderRadius:3, px:2.5, py:1.5, fontWeight:700,
                        color:"#64748b", border:"1.5px dashed #cbd5e1",
                        "&:hover":{ background:"#fef2f2", color:"#dc2626", borderColor:"#fca5a5" },
                        transition:"all 0.2s",
                      }}
                    >
                      {user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "Sign Out"}
                    </Button>
                  ) : (
                    <Button
                      variant="text"
                      startIcon={<Login fontSize="small" />}
                      onClick={() => nav("/login")}
                      sx={{
                        borderRadius:3, px:2.5, py:1.5, fontWeight:700,
                        color:"#1d4ed8", border:"1.5px dashed #93c5fd",
                        "&:hover":{ background:"#dbeafe" },
                        transition:"all 0.2s",
                      }}
                    >
                      Sign In
                    </Button>
                  )}
                </Stack>

                <Stack direction="row" spacing={3} flexWrap="wrap" sx={{ gap:1 }}>
                  {["✅ Free forever","🔒 Offline PWA","📱 Mobile + Desktop","🧠 Real ML model"].map(label => (
                    <Typography key={label} sx={{ fontSize:12, color:"#64748b" }}>{label}</Typography>
                  ))}
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12} md={6} sx={{ display:{ xs:"none", md:"flex" }, justifyContent:"center" }}>
              <Box sx={{ position:"relative",
                animation:"heroVisIn 0.8s cubic-bezier(.22,.68,0,1.2) 0.15s both",
                "@keyframes heroVisIn":{ from:{opacity:0,transform:"scale(0.85)"}, to:{opacity:1,transform:"scale(1)"} } }}>
                <Box sx={{
                  width:360, height:360, borderRadius:"50%",
                  background:"radial-gradient(circle at 40% 40%,#dbeafe,#e0f2fe,#f0f9ff)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow:"0 24px 80px rgba(29,78,216,0.15)",
                  animation:"float 4s ease-in-out infinite",
                  "@keyframes float":{"0%,100%":{transform:"translateY(0)"},"50%":{transform:"translateY(-14px)"}},
                }}>
                  <Box sx={{ textAlign:"center" }}>
                    <Typography sx={{ fontSize:88 }}>🛡️</Typography>
                    <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:24, color:"#0f172a", mt:1 }}>
                      IntelliCrash
                    </Typography>
                    <Typography sx={{ fontSize:13, color:"#64748b" }}>AI Road Safety · HP</Typography>
                    {reports.length > 0 && (
                      <Chip label={`${reports.length} live reports`} size="small"
                        sx={{ mt:1, background:"#fef2f2", color:"#ef4444", fontWeight:700, fontSize:10 }} />
                    )}
                  </Box>
                </Box>
                {[
                  { label:"⚡ AI Risk", angle:0   },
                  { label:"🗺️ Maps",   angle:72  },
                  { label:"🚨 SOS",    angle:144 },
                  { label:"📡 Reports",angle:216 },
                  { label:"🌤️ Weather",angle:288 },
                ].map(({label,angle})=>{
                  const dist = 172;
                  const rad  = (angle-90)*Math.PI/180;
                  return (
                    <Box key={label} sx={{
                      position:"absolute", top:"50%", left:"50%",
                      transform:`translate(calc(-50% + ${Math.cos(rad)*dist}px), calc(-50% + ${Math.sin(rad)*dist}px))`,
                    }}>
                      <Chip label={label} size="small"
                        sx={{ background:"#fff", boxShadow:"0 4px 12px rgba(0,0,0,0.12)", fontWeight:700, fontSize:11 }} />
                    </Box>
                  );
                })}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* STATS */}
      <Box sx={{ background:"#fff", py:4, borderBottom:"1px solid #f1f5f9" }}>
        <Container maxWidth="lg">
          <Grid container spacing={2}>
            {HP_STATS.map(s => (
              <Grid item xs={6} sm={4} md={2} key={s.l}>
                <StatCard n={s.n} label={s.l} sub={s.s} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* LIVE REPORTS */}
      <Box sx={{ py:{ xs:5, md:7 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", mb:3 }}>
            <Box>
              <Box sx={{ display:"flex", alignItems:"center", gap:1, mb:1 }}>
                <Box sx={{ width:8, height:8, borderRadius:"50%", background:"#ea4335",
                  animation:"blink 1.5s infinite",
                  "@keyframes blink":{"0%,100%":{opacity:1},"50%":{opacity:0.3}} }} />
                <Typography sx={{ fontSize:11, fontWeight:700, color:"#ea4335", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                  Live · Auto-refresh every 20s
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#0f172a" }}>
                📡 Community Reports
              </Typography>
              <Typography sx={{ fontSize:13, color:"#64748b", mt:0.5 }}>
                Real accidents, hazards and traffic on HP roads — reported by drivers like you
              </Typography>
            </Box>
            <Button endIcon={<ArrowForward />} onClick={() => nav("/bulletin")}
              sx={{ fontWeight:700, color:"#1d4ed8", display:{ xs:"none", sm:"flex" } }}>
              View All
            </Button>
          </Box>

          {loading && <LinearProgress sx={{ mb:2, borderRadius:4, height:3,
            "& .MuiLinearProgress-bar":{ background:"linear-gradient(90deg,#3b82f6,#0891b2)" } }} />}

          {!loading && reports.length === 0 && (
            <Box onClick={() => nav("/bulletin")} sx={{
              textAlign:"center", py:7,
              border:"2px dashed #e2e8f0", borderRadius:4, background:"#f8faff",
              cursor:"pointer", transition:"all 0.2s",
              "&:hover":{ borderColor:"#bfdbfe", background:"#eff6ff" },
            }}>
              <Typography sx={{ fontSize:40, mb:1 }}>📡</Typography>
              <Typography sx={{ color:"#64748b", fontSize:15, fontWeight:600, mb:1 }}>No active reports right now</Typography>
              <Typography sx={{ color:"#94a3b8", fontSize:13, mb:3 }}>Be the first to report an incident on HP roads</Typography>
              <Button variant="contained" onClick={e=>{ e.stopPropagation(); nav("/navigate"); }}
                sx={{ borderRadius:20, px:3, fontWeight:700, background:"#1d4ed8" }}>
                Report an Incident
              </Button>
            </Box>
          )}

          <Grid container spacing={2}>
            {reports.slice(0,6).map((r,i) => (
              <Grid item xs={12} sm={6} md={4} key={r.id}>
                <HomeReportCard r={r} index={i} onClick={()=>nav(`/accident/${r.id}`)} />
              </Grid>
            ))}
          </Grid>

          {reports.length > 6 && (
            <Box sx={{ textAlign:"center", mt:3 }}>
              <Button variant="outlined" onClick={() => nav("/bulletin")}
                sx={{ borderRadius:20, px:4, fontWeight:700, borderColor:"#1d4ed8", color:"#1d4ed8" }}>
                View all {reports.length} reports →
              </Button>
            </Box>
          )}
        </Container>
      </Box>

      {/* FEATURES */}
      <Box sx={{ py:{ xs:5, md:8 }, background:"#fff" }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign:"center", mb:6 }}>
            <Chip label="Features" sx={{ background:"#dbeafe", color:"#1d4ed8", fontWeight:700, mb:2 }} />
            <Typography variant="h4" sx={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#0f172a", mb:1.5 }}>
              Everything for Safe HP Mountain Travel
            </Typography>
            <Typography sx={{ color:"#64748b", fontSize:15, maxWidth:520, mx:"auto" }}>
              Built with real government accident data, production ML models, and free APIs — no hidden costs.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {FEATURES.map((f,i) => (
              <Grid item xs={12} sm={6} md={4} key={f.title}>
                <Card elevation={0} sx={{
                  border:"1px solid #e2e8f0", borderRadius:3, height:"100%",
                  animation:`fadeCard 0.5s ease ${i*0.08}s both`,
                  "@keyframes fadeCard":{ from:{opacity:0,transform:"translateY(20px)"}, to:{opacity:1,transform:"translateY(0)"} },
                  transition:"all 0.2s",
                  "&:hover":{ transform:"translateY(-6px)", boxShadow:`0 16px 40px ${f.color}18`, borderColor:`${f.color}44` },
                }}>
                  <CardContent sx={{ p:3 }}>
                    <Box sx={{ width:48, height:48, borderRadius:2.5, background:f.bg,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, mb:2 }}>
                      {f.icon}
                    </Box>
                    <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, color:"#0f172a", mb:1 }}>
                      {f.title}
                    </Typography>
                    <Typography sx={{ fontSize:13, color:"#64748b", lineHeight:1.75 }}>{f.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* MODEL PERFORMANCE */}
      <Box sx={{ py:{ xs:5, md:7 }, background:"linear-gradient(135deg,#f0f4ff,#e8f0fe)" }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign:"center", mb:4 }}>
            <Chip label="ML Model" sx={{ background:"#f3e8ff", color:"#7c3aed", fontWeight:700, mb:2 }} />
            <Typography variant="h5" sx={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#0f172a" }}>
              🧠 Real AI Performance
            </Typography>
            <Typography sx={{ color:"#64748b", fontSize:13, mt:0.5 }}>
              Random Forest + LSTM trained on HP iRAD 2024 accident data
            </Typography>
          </Box>
          <Grid container spacing={2} justifyContent="center">
            {[
              ["Accuracy",       parseFloat(metrics["Accuracy"]||0.94)*100,            "%", "#1d4ed8"],
              ["F1 Score",       parseFloat(metrics["F1 Score (Weighted)"]||0.91)*100, "%", "#059669"],
              ["Training Data",  parseInt(metrics["Training Samples"]||20000)/1000,    "K", "#d97706"],
              ["Active Reports", reports.length,                                        "",  "#dc2626"],
            ].map(([l,v,suf,c]) => (
              <Grid item xs={6} sm={3} key={l}>
                <Card elevation={0} sx={{ border:`1.5px solid ${c}22`, borderRadius:3, textAlign:"center", p:2.5, background:"#fff",
                  transition:"all 0.2s", "&:hover":{ transform:"translateY(-4px)", boxShadow:`0 8px 24px ${c}18` } }}>
                  <Typography sx={{ fontFamily:"'Syne',sans-serif", fontSize:{ xs:28, md:36 }, fontWeight:900, color:c }}>
                    {typeof v==="number" ? v.toFixed(v%1===0?0:1) : v}{suf}
                  </Typography>
                  <Typography sx={{ fontSize:12, color:"#64748b", mt:0.5, fontWeight:600 }}>{l}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* REVIEWS */}
      <ReviewSection />

      {/* CTA */}
      <Box sx={{
        py:{ xs:6, md:10 },
        background:"linear-gradient(135deg,#1d4ed8,#0891b2)",
        textAlign:"center", position:"relative", overflow:"hidden",
      }}>
        <Box sx={{ position:"absolute", inset:0, opacity:0.05,
          backgroundImage:"radial-gradient(circle at 25% 25%,#fff 2px,transparent 2px)",
          backgroundSize:"40px 40px" }} />
        <Container maxWidth="md" sx={{ position:"relative" }}>
          <Typography variant="h3" sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, color:"#fff", mb:2, fontSize:{ xs:28, md:42 } }}>
            Ready to Drive Safer?
          </Typography>
          <Typography sx={{ color:"rgba(255,255,255,0.8)", fontSize:{ xs:14, md:16 }, mb:5, maxWidth:500, mx:"auto" }}>
            Free · Open source · Built for Himachal Pradesh mountain roads
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ gap:2 }}>
            <Button variant="contained" size="large" onClick={() => nav("/navigate")}
              sx={{ background:"#fff", color:"#1d4ed8", fontWeight:800, borderRadius:3, px:4, py:1.5,
                "&:hover":{ background:"#f0f4ff", transform:"translateY(-3px)" }, transition:"all 0.2s" }}>
              🗺️ Open Navigation
            </Button>
            <Button variant="outlined" size="large" onClick={() => nav("/sos")}
              sx={{ borderColor:"rgba(255,255,255,0.6)", color:"#fff", fontWeight:700, borderRadius:3, px:4, py:1.5,
                "&:hover":{ background:"rgba(255,255,255,0.1)", transform:"translateY(-3px)" }, transition:"all 0.2s" }}>
              🚨 Emergency SOS
            </Button>
            {!user && (
              <Button variant="outlined" size="large" onClick={() => nav("/login")}
                sx={{ borderColor:"rgba(255,255,255,0.6)", color:"#fff", fontWeight:700, borderRadius:3, px:4, py:1.5,
                  "&:hover":{ background:"rgba(255,255,255,0.1)", transform:"translateY(-3px)" }, transition:"all 0.2s" }}>
                👤 Join Free
              </Button>
            )}
          </Stack>
          <Typography sx={{ color:"rgba(255,255,255,0.5)", fontSize:11, mt:5 }}>
            Emergency: 112 · Ambulance: 108 · HP Police: 100
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}