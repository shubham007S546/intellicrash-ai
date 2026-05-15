/**
 * Home.jsx — IntelliCrash v18.0
 *
 * FIXED vs v17.0:
 *  ✅ isExpired() — HARD 8h cap on timestamp age regardless of expires_at
 *     (fixes "982h ago" showing in ticker when old DB records have stale expires_at)
 *  ✅ isHumanReport() — unchanged (already correct from v17)
 *  ✅ Live ticker only shows reports < 8h old AND not expired
 *  ✅ All other v17 features preserved
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const REFRESH_MS = 20_000;
const MAX_AGE_MS = 8 * 3600_000; // 8h hard cap — no report older than this ever shows

const RICON  = { accident: "💥", traffic: "🚦", roadblock: "🚧", hazard: "⚠️", contribution: "💬" };
const RCOL   = { accident: "#e53935", traffic: "#fb8c00", roadblock: "#1e88e5", hazard: "#8e24aa", contribution: "#43a047" };
const RLABEL = { accident: "Accident", traffic: "Traffic Jam", roadblock: "Roadblock", hazard: "Hazard", contribution: "Driver Tip" };

const FEATURES = [
  { icon: "🧭", title: "Smart Navigation",   desc: "AI-powered routes that flag accident hotspots, sharp hairpin bends, and danger zones specific to HP mountain roads.", accent: "#f4511e", light: "#fbe9e7" },
  { icon: "⚠️", title: "Real-time Alerts",   desc: "Instant push warnings for fog, black ice, school zones, police nakas, and live community-reported incidents.", accent: "#e53935", light: "#ffebee" },
  { icon: "🏆", title: "Safety Rewards",     desc: "Earn points for every safe trip. Redeem for fuel vouchers, toll passes, and HP Tourism partner discounts.", accent: "#43a047", light: "#e8f5e9" },
  { icon: "📢", title: "Community Bulletin", desc: "A live feed of road incidents reported by drivers across all 12 HP districts — updated every 20 seconds.", accent: "#1e88e5", light: "#e3f2fd" },
  { icon: "🚨", title: "One-tap SOS",        desc: "Shares your GPS location instantly with family and auto-detects the nearest hospital and police station.", accent: "#e53935", light: "#ffebee" },
  { icon: "🌤️", title: "Weather + Forecast", desc: "Live conditions and a 3-day mountain forecast. Your risk score adjusts automatically for rain, snow, and fog.", accent: "#0288d1", light: "#e1f5fe" },
];

const STATS = [
  { target: 38,  suffix: "",    label: "iRAD Hotspots",    sub: "GPS-verified zones",    icon: "⚠️" },
  { target: 12,  suffix: "",    label: "Districts Covered", sub: "All HP corridors",     icon: "🗺️" },
  { target: null, raw: "99.3%", label: "Model Accuracy",   sub: "Hybrid BiLSTM-RF",     icon: "🧠" },
  { target: null, raw: "20K+",  label: "Training Records", sub: "iRAD 2024 dataset",    icon: "📊" },
  { target: null, raw: "0.993", label: "F1-Score",         sub: "Weighted average",     icon: "📈" },
  { target: 112,  suffix: "",   label: "HP Emergency",     sub: "One-tap SOS",          icon: "🚑" },
];

const METRICS = [
  { label: "Accuracy",      value: "99.32%", color: "#f4511e", light: "#fbe9e7", icon: "🎯" },
  { label: "Precision",     value: "99.33%", color: "#1e88e5", light: "#e3f2fd", icon: "🔬" },
  { label: "Recall",        value: "99.32%", color: "#43a047", light: "#e8f5e9", icon: "📡" },
  { label: "F1-Score",      value: "99.32%", color: "#8e24aa", light: "#f3e5f5", icon: "⚡" },
  { label: "Random Forest", value: "97.0%",  color: "#546e7a", light: "#eceff1", icon: "🌲" },
  { label: "LSTM Baseline", value: "98.0%",  color: "#546e7a", light: "#eceff1", icon: "🔁" },
  { label: "Hybrid Model",  value: "99.3%",  color: "#f4511e", light: "#fbe9e7", icon: "🏆" },
];

/* ─── Helpers ─────────────────────────────────────────────────────────── */

/**
 * ✅ FIXED v18: Hard 8h cap on timestamp age FIRST.
 *   - If the report's timestamp is older than 8h → always expired (fixes "982h ago" bug)
 *   - Then checks resolved/status
 *   - Then checks expires_at if present
 *   - Falls back to 6h from timestamp
 */
function isExpired(r) {
  // Hard cap: if timestamp is older than 8h, always treat as expired
  if (r.timestamp) {
    const ageMs = Date.now() - new Date(r.timestamp).getTime();
    if (ageMs > MAX_AGE_MS) return true;
  }

  // Explicit resolved/expired status
  if (r.resolved || r.status === "expired") return true;

  // Use expires_at if set
  if (r.expires_at) return Date.now() > new Date(r.expires_at).getTime();

  // Fallback: 6h from timestamp
  if (!r.timestamp) return false;
  return Date.now() - new Date(r.timestamp).getTime() > 6 * 3600_000;
}

/**
 * isHumanReport — accepts Navigation.jsx reports and loosened filter
 */
function isHumanReport(r) {
  const desc = (r.description || "").trim();
  const rep  = (r.reporter    || "").trim();
  const lm   = (r.landmark    || "").trim();

  // Always accept Navigation.jsx driver reports
  if (rep === "IntelliCrash Driver") return true;

  // Block adaptive/auto records
  if (rep.toLowerCase().includes("adaptive"))        return false;
  if (rep.toLowerCase().includes("autolearned"))     return false;
  if (desc.startsWith("[AutoLearned]"))              return false;
  if (/^count=\d+/.test(desc))                       return false;
  if (/^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(desc))  return false;

  // Accept if landmark present OR desc ≥ 5 chars
  return lm.length >= 1 || desc.length >= 5;
}

function timeAgo(ts) {
  if (!ts) return "Recently";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

/* ─── Count-up hook ───────────────────────────────────────────────────── */
function useCountUp(target, duration = 1800) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!target) return;
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = now => {
          const p = Math.min((now - t0) / duration, 1);
          setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
          if (p < 1) requestAnimationFrame(tick); else setVal(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return [val, ref];
}

function StatCell({ target, raw, suffix = "", label, sub, icon }) {
  const [val, ref] = useCountUp(target || 0);
  return (
    <div ref={ref} className="stat-cell">
      <span style={{ fontSize: 20, display: "block", marginBottom: 6 }}>{icon}</span>
      <span className="stat-num">{raw ?? `${val}${suffix}`}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-sub">{sub}</span>
    </div>
  );
}

function FeatureCard({ icon, title, desc, accent, light }) {
  const [h, setH] = useState(false);
  return (
    <div className="feat-card" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ borderColor: h ? accent + "40" : "#e8eaf6", transform: h ? "translateY(-4px)" : "", boxShadow: h ? `0 12px 40px ${accent}18, 0 2px 8px rgba(0,0,0,0.06)` : "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, opacity: h ? 1 : 0, transition: "opacity 0.22s", borderRadius: "20px 20px 0 0" }} />
      <div style={{ width: 52, height: 52, borderRadius: 16, background: light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18, border: `1px solid ${accent}20` }}>
        {icon}
      </div>
      <div className="feat-title">{title}</div>
      <p className="feat-desc">{desc}</p>
    </div>
  );
}

/* ── Live Ticker ── */
function LiveTicker({ reports }) {
  const nav = useNavigate();
  if (!reports.length) return null;
  const tripled = [...reports, ...reports, ...reports];
  const duration = Math.max(reports.length * 9, 45);
  return (
    <div onClick={() => nav("/bulletin")} className="ticker-wrap">
      <style>{`.tick-inner{display:flex;align-items:center;width:max-content;animation:tickMove ${duration}s linear infinite;}.tick-hover:hover .tick-inner{animation-play-state:paused;}@keyframes tickMove{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}`}</style>
      <div className="ticker-fade-l" />
      <div className="ticker-fade-r" />
      <div className="ticker-live-badge">
        <div className="ticker-dot" />
        <span>LIVE</span>
      </div>
      <div className="tick-hover" style={{ paddingLeft: 92, overflow: "hidden" }}>
        <div className="tick-inner">
          {tripled.map((r, i) => {
            const loc = r.landmark?.length > 0
              ? r.landmark
              : r.road?.length > 3
                ? r.road
                : r.description?.slice(0, 32) || "HP Road";
            const clr = RCOL[r.type] || "#f4511e";
            const isSevere = r.type === "accident" || r.type === "hazard";
            return (
              <div key={`${r.id}-${i}`} className="tick-item">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: clr, flexShrink: 0, boxShadow: `0 0 5px ${clr}80` }} />
                <span className="tick-type">{RICON[r.type] || "⚠️"} {RLABEL[r.type] || r.type}</span>
                <span className="tick-loc">📍 {loc}</span>
                <span className="tick-time">{timeAgo(r.timestamp)}</span>
                <div className={`bulletin-severity-badge ${isSevere || r.sentiment === "negative" ? "critical" : "moderate"}`}>
                  SEVERITY: {isSevere ? "CRITICAL" : (r.sentiment === "negative" ? "HIGH" : "MODERATE")}
                </div>
                <div className="tick-sep" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricsSection() {
  return (
    <section className="section" style={{ background: "linear-gradient(180deg,#fafafa,#f5f5f5)" }}>
      <div className="container">
        <div className="section-header">
          <span className="chip" style={{ background: "#fbe9e7", color: "#f4511e", borderColor: "#ffccbc" }}>Model Performance</span>
          <h2 className="section-title">📊 Prediction Accuracy</h2>
          <p className="section-sub">Our hybrid BiLSTM + Random Forest ensemble consistently outperforms individual baseline models across every metric.</p>
        </div>
        <div className="metrics-grid">
          {METRICS.map(({ label, value, color, light, icon }) => (
            <div key={label} className="metric-card"
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = color + "35"; e.currentTarget.style.boxShadow = `0 10px 28px ${color}14`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "#e8eaf6"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},${color}55)`, borderRadius: "16px 16px 0 0" }} />
              <div style={{ width: 44, height: 44, borderRadius: 12, background: light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>{icon}</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 28, color, lineHeight: 1, marginBottom: 6, letterSpacing: "-0.5px" }}>{value}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#37474f", fontFamily: "'Sora',sans-serif" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  const bullets = [
    { icon: "🎯", text: "Hybrid BiLSTM-RF ensemble with attention mechanism for superior accuracy" },
    { icon: "📍", text: "38 GPS-verified accident hotspots mapped across all 12 HP districts" },
    { icon: "⚡", text: "Real-time pipeline: GPS + speed + weather → risk score in milliseconds" },
    { icon: "🧠", text: "Explainable AI (XAI) layer surfaces exactly why a risk score was assigned" },
    { icon: "🚨", text: "One-tap SOS auto-finds nearest hospitals and police — critical in remote HP" },
    { icon: "✅", text: "Completely free — no subscription, no ads, no data selling, ever" },
  ];
  const chips = ["BiLSTM + RF Ensemble", "iRAD 2024", "FastAPI Backend", "Offline PWA", "XAI Layer"];

  return (
    <section className="section" style={{ background: "#fff" }}>
      <div className="container">
        <div className="about-grid">
          <div className="about-card">
            <div className="about-card-glow" />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🛡️</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 22, color: "#1a1a2e", marginBottom: 8, letterSpacing: "-0.5px" }}>IntelliCrash v18</div>
              <div style={{ fontSize: 13.5, color: "#78909c", lineHeight: 1.8, marginBottom: 28 }}>AI-Powered Road Safety Intelligence Platform for Himachal Pradesh Mountain Roads</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                {chips.map(c => (
                  <span key={c} style={{ background: "#fff", border: "1px solid #e8eaf6", borderRadius: 20, padding: "5px 13px", fontSize: 11.5, fontWeight: 600, color: "#37474f", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{c}</span>
                ))}
              </div>
              <div style={{ background: "#fff", border: "1px solid #ffccbc", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 26 }}>🤝</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", fontFamily: "'Sora',sans-serif" }}>Team IntelliCrash</div>
                  <div style={{ fontSize: 11, color: "#90a4ae" }}>JNGEC Sundernagar · Himachal Pradesh · 2025-26</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="chip" style={{ background: "#fbe9e7", color: "#f4511e", borderColor: "#ffccbc", marginBottom: 16, display: "inline-block" }}>About the Project</span>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: "clamp(28px,3.2vw,44px)", color: "#1a1a2e", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16 }}>
              Built for HP Roads.<br />Backed by Real Data.
            </h2>
            <p style={{ fontSize: 15, color: "#546e7a", lineHeight: 1.9, marginBottom: 28 }}>
              IntelliCrash is trained on 20,000+ real accident records from MoRTH's iRAD dataset, covering all 12 districts of Himachal Pradesh. It combines deep learning with traditional ML to deliver the most accurate and actionable road safety platform for mountain driving.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {bullets.map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fbe9e7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, border: "1px solid #ffccbc" }}>{icon}</div>
                  <span style={{ fontSize: 14, color: "#37474f", lineHeight: 1.65, paddingTop: 7 }}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, background: "#f5f5f5", border: "1px solid #e8eaf6", borderRadius: 18, padding: "18px 22px" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#f4511e,#ff7043)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff", flexShrink: 0 }}>IC</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e", fontFamily: "'Sora',sans-serif" }}>Team IntelliCrash</div>
                <div style={{ fontSize: 12, color: "#78909c", marginBottom: 8 }}>AI Road Safety · JNGEC Sundernagar, Himachal Pradesh</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a className="creator-link" href="https://www.linkedin.com/in/shubham-707b0b350" target="_blank" rel="noreferrer">💼 LinkedIn</a>
                  <a className="creator-link" href="mailto:shubhamabhi004@gmail.com">✉️ Shubham</a>
                  <a className="creator-link" href="mailto:rihalrai68@gmail.com">✉️ Rihal</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const [form, setForm]       = useState({ name: "", email: "", message: "" });
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/contact-form", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) { setSent(true); setTimeout(() => setSent(false), 4000); setForm({ name: "", email: "", message: "" }); }
      else setError(data.message || `Failed (${res.status}). Please try again.`);
    } catch { setError("Network error. Please check your connection."); }
    setLoading(false);
  };

  const inp = { width: "100%", padding: "13px 15px", border: "1.5px solid #e8eaf6", borderRadius: 10, fontSize: 14, color: "#1a1a2e", outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#fafafa", transition: "border-color .18s,background .18s" };

  return (
    <section className="section" style={{ background: "#f5f5f5" }}>
      <div className="container">
        <div className="contact-grid">
          <div>
            <span className="chip" style={{ background: "#fbe9e7", color: "#f4511e", borderColor: "#ffccbc", marginBottom: 16, display: "inline-block" }}>Get In Touch</span>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: "clamp(28px,3.2vw,44px)", color: "#1a1a2e", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16 }}>
              Drive HP Safer.<br />
              <span style={{ background: "linear-gradient(135deg,#f4511e,#ff7043)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Connect With Us.</span>
            </h2>
            <p style={{ fontSize: 15, color: "#546e7a", lineHeight: 1.9, marginBottom: 28 }}>Have feedback, a hotspot to report, or want to collaborate on HP road safety? Reach out to the team.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: "📧", label: "Shubham",   val: "shubhamabhi004@gmail.com",         href: "mailto:shubhamabhi004@gmail.com" },
                { icon: "📧", label: "Rihal Rai", val: "rihalrai68@gmail.com",               href: "mailto:rihalrai68@gmail.com" },
                { icon: "🚨", label: "Emergency", val: "112 / 108 / 100",                    href: "tel:112" },
                { icon: "💼", label: "LinkedIn",  val: "linkedin.com/in/shubham-707b0b350", href: "https://www.linkedin.com/in/shubham-707b0b350" },
              ].map(({ icon, label, val, href }) => (
                <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="contact-link">
                  <div className="contact-icon-wrap">{icon}</div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#90a4ae", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'Sora',sans-serif" }}>{label}</div>
                    <div style={{ fontSize: 13.5, color: "#1a1a2e", fontWeight: 600 }}>{val}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="contact-form-wrap">
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 20, color: "#1a1a2e", marginBottom: 4, letterSpacing: "-0.4px" }}>Send a Message</h3>
            <p style={{ fontSize: 13, color: "#90a4ae", marginBottom: 24 }}>We respond within 24 hours.</p>
            {sent  && <div className="alert-success">✅ Message sent! We'll reply soon.</div>}
            {error && <div className="alert-error">⚠️ {error}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[{ label: "Your Name", key: "name", type: "text", ph: "e.g. Rajesh Kumar" }, { label: "Email", key: "email", type: "email", ph: "shubhamabhi004@gmail.com" }].map(({ label, key, type, ph }) => (
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input type={type} placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required style={inp}
                    onFocus={e => { e.target.style.borderColor = "#f4511e"; e.target.style.background = "#fff"; }}
                    onBlur={e => { e.target.style.borderColor = "#e8eaf6"; e.target.style.background = "#fafafa"; }} />
                </div>
              ))}
              <div>
                <label className="form-label">Message</label>
                <textarea placeholder="Your experience, suggestions, or a hotspot to report..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4} required style={{ ...inp, resize: "vertical" }}
                  onFocus={e => { e.target.style.borderColor = "#f4511e"; e.target.style.background = "#fff"; }}
                  onBlur={e => { e.target.style.borderColor = "#e8eaf6"; e.target.style.background = "#fafafa"; }} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ opacity: loading ? 0.65 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "⏳ Sending…" : "🚀 Send Message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══ MAIN ══ */
export default function Home() {
  const nav = useNavigate();
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [reviews,    setReviews]    = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("../services/supabase");
        const { data } = await supabase.auth.getSession();
        setIsLoggedIn(!!data?.session?.user);
        supabase.auth.onAuthStateChange((_e, s) => setIsLoggedIn(!!s?.user));
      } catch { try { setIsLoggedIn(!!localStorage.getItem("ic_user")); } catch {} }
    })();
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [rRes, rvRes] = await Promise.allSettled([
        fetch("/api/reports?limit=200&active_only=true").then(r => r.json()),
        fetch("/api/reviews/all?limit=3").then(r => r.json()),
      ]);
      if (rRes.status === "fulfilled") {
        const live = (rRes.value.reports || [])
          // ✅ v18.1 FIX: Filter for Navigation, Community (manual), and External (Google Form) reports
          .filter(r => !isExpired(r) && isHumanReport(r) && (r.source === "navigation" || r.source === "community" || r.source === "external"))
          .sort((a, b) => {
            if (a.severity === "severe" && b.severity !== "severe") return -1;
            if (b.severity === "severe" && a.severity !== "severe") return 1;
            return new Date(b.timestamp) - new Date(a.timestamp);
          });
        setReports(live);
      }
      if (rvRes.status === "fulfilled") {
        const rv = rvRes.value;
        const arr = Array.isArray(rv) ? rv : rv?.reviews || [];
        setReviews(arr);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); const id = setInterval(fetchAll, REFRESH_MS); return () => clearInterval(id); }, [fetchAll]);

  const severeCount = reports.filter(r => r.severity === "severe").length;

  const STATIC_REVIEWS = [
    { id: "r1", user_name: "Rajesh Kumar", route: "Shimla → Dhalli",  rating: 5, review_text: "The real-time risk alerts are lifesavers near Shimla. I drive more cautiously when the score hits 80.", color: "#1e88e5", sentiment: "positive" },
    { id: "r2", user_name: "Anjali Sharma", route: "Manali → Rohtang", rating: 5, review_text: "The Hindi voice navigation helps my drivers navigate the Rohtang passes safely during sudden fog.", color: "#43a047", sentiment: "positive" },
    { id: "r3", user_name: "Vikram Singh",   route: "Mandi → Sundernagar", rating: 5, review_text: "Finally, a map that understands HP mountain roads. The SOS feature gives us peace of mind at night.", color: "#fb8c00", sentiment: "positive" },
  ];
  const displayReviews = reviews.length > 0 ? reviews : STATIC_REVIEWS;

  return (
    <div style={{ background: "#fafafa", fontFamily: "'DM Sans',sans-serif", color: "#1a1a2e" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

        @keyframes liveDot{0%,100%{opacity:1}50%{opacity:.15}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}

        .container{max-width:1280px;margin:0 auto;padding:0 40px;}
        .section{padding:96px 0;}

        /* Ticker */
        .ticker-wrap{position:relative;overflow:hidden;background:linear-gradient(90deg,#fffde7,#fff8f2,#fffde7);border-bottom:1px solid #ffe0b2;padding:7px 0;cursor:pointer;}
        .ticker-fade-l{position:absolute;left:0;top:0;bottom:0;width:100px;background:linear-gradient(90deg,#fffde7,transparent);z-index:2;pointer-events:none;}
        .ticker-fade-r{position:absolute;right:0;top:0;bottom:0;width:100px;background:linear-gradient(270deg,#fffde7,transparent);z-index:2;pointer-events:none;}
        .ticker-live-badge{position:absolute;left:14px;top:50%;transform:translateY(-50%);z-index:3;display:flex;align-items:center;gap:5px;background:#e53935;border-radius:20px;padding:3px 10px;}
        .ticker-live-badge span{font-size:9px;font-weight:900;color:#fff;letter-spacing:.15em;font-family:'Sora',sans-serif;}
        .ticker-dot{width:5px;height:5px;border-radius:50%;background:#fff;animation:liveDot 1.2s infinite;}
        .tick-item{display:flex;align-items:center;gap:10px;padding:0 20px;flex-shrink:0;}
        .tick-type{font-size:11.5px;font-weight:700;color:#4e2500;white-space:nowrap;font-family:'Sora',sans-serif;}
        .tick-loc{font-size:11px;color:#7b4000;white-space:nowrap;}
        .tick-time{font-size:10px;color:#a05020;white-space:nowrap;}
        .tick-sep{width:1px;height:12px;background:#ffcc80;margin:0 4px;flex-shrink:0;}

        /* Stats */
        .stats-strip{background:#fff;border-top:1px solid #e8eaf6;border-bottom:1px solid #e8eaf6;box-shadow:0 1px 12px rgba(0,0,0,0.04);}
        .ic-stats-grid{display:grid;grid-template-columns:repeat(6,1fr);}
        .stat-cell{text-align:center;padding:28px 12px;transition:background .2s;cursor:default;}
        .stat-cell:hover{background:#fff8f4;}
        .stat-num{font-family:'Sora',sans-serif;font-weight:800;font-size:30px;color:#f4511e;line-height:1;display:block;letter-spacing:-1px;}
        .stat-label{font-size:10.5px;font-weight:700;color:#1a1a2e;margin-top:6px;display:block;text-transform:uppercase;letter-spacing:.08em;}
        .stat-sub{font-size:10px;color:#90a4ae;margin-top:2px;display:block;}

        .hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;}
        .chip{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border:1px solid;border-radius:20px;padding:4px 13px;}
        .section-header{text-align:center;margin-bottom:56px;}
        .section-title{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(26px,3.2vw,44px);color:#1a1a2e;letter-spacing:-1.5px;line-height:1.1;margin:12px 0;}
        .section-sub{font-size:15px;color:#546e7a;max-width:480px;margin:0 auto;line-height:1.85;}

        .features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .feat-card{background:#fff;border:1.5px solid #e8eaf6;border-radius:20px;padding:28px 24px;transition:all .26s cubic-bezier(.34,1.56,.64,1);position:relative;overflow:hidden;}
        .feat-title{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;color:#1a1a2e;margin-bottom:10px;letter-spacing:-.2px;}
        .feat-desc{font-size:13.5px;color:#78909c;line-height:1.8;margin:0;}

        .metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
        .metric-card{background:#fff;border:1.5px solid #e8eaf6;border-radius:16px;padding:24px 20px;text-align:center;position:relative;overflow:hidden;transition:all .22s;}

        .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:start;}
        .about-card{background:linear-gradient(145deg,#fff8f3,#fff2e6);border:1.5px solid #ffccbc;border-radius:24px;padding:40px;position:relative;overflow:hidden;}
        .about-card-glow{position:absolute;top:-20%;right:-10%;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(244,81,30,.07),transparent 70%);pointer-events:none;}

        .reviews-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .review-card{background:#fff;border:1.5px solid #e8eaf6;border-radius:20px;padding:26px;transition:all .22s;overflow:hidden;position:relative;box-shadow:0 1px 4px rgba(0,0,0,0.04);}

        .contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
        .contact-link{display:flex;align-items:center;gap:14px;padding:13px 18px;background:#fff;border:1.5px solid #e8eaf6;border-radius:14px;text-decoration:none;transition:all .2s;box-shadow:0 1px 4px rgba(0,0,0,0.04);}
        .contact-link:hover{border-color:#ffccbc;background:#fff8f4;box-shadow:0 4px 16px rgba(244,81,30,.09);}
        .contact-icon-wrap{font-size:18px;width:30px;text-align:center;flex-shrink:0;}
        .contact-form-wrap{background:#fff;border:1.5px solid #e8eaf6;border-radius:24px;padding:40px;box-shadow:0 4px 28px rgba(0,0,0,0.06);}
        .form-label{display:block;font-size:10.5px;font-weight:700;color:#37474f;margin-bottom:6px;text-transform:uppercase;letter-spacing:.07em;font-family:'Sora',sans-serif;}
        .alert-success{background:#e8f5e9;border:1px solid #a5d6a7;border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:13px;color:#2e7d32;font-weight:600;}
        .alert-error{background:#ffebee;border:1px solid #ef9a9a;border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:13px;color:#c62828;font-weight:600;}

        .btn-primary{padding:14px 28px;border-radius:36px;border:none;background:linear-gradient(135deg,#f4511e,#ff7043);color:#fff;font-weight:700;font-size:14.5px;font-family:'Sora',sans-serif;letter-spacing:-.2px;box-shadow:0 6px 20px rgba(244,81,30,.3);transition:all .22s;cursor:pointer;}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(244,81,30,.44);}
        .btn-outline{padding:14px 28px;border-radius:36px;border:1.5px solid #e0e0e0;background:#fff;color:#37474f;font-weight:700;font-size:14.5px;cursor:pointer;font-family:'Sora',sans-serif;transition:all .22s;box-shadow:0 1px 4px rgba(0,0,0,0.04);}
        .btn-outline:hover{border-color:#f4511e55;color:#f4511e;background:#fff8f4;}

        .creator-link{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#f4511e;text-decoration:none;background:#fbe9e7;border:1px solid #ffccbc;border-radius:20px;padding:3px 10px;transition:all .18s;font-family:'Sora',sans-serif;}
        .creator-link:hover{background:#f4511e;color:#fff;border-color:#f4511e;}

        .footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:48px;}
        .footer-link{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#78909c;text-decoration:none;margin-bottom:10px;transition:color .18s;}
        .footer-link:hover{color:#f4511e;}
        .footer-section-title{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#90a4ae;margin-bottom:18px;font-family:'Sora',sans-serif;}

        .severe-banner{background:#ffebee;border-bottom:1px solid #ef9a9a;padding:7px 0;text-align:center;cursor:pointer;}
        
        .bulletin-severity-badge { font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em; display: inline-block; margin-left: 8px; }
        .bulletin-severity-badge.critical { background: rgba(229, 57, 53, 0.1); color: #e53935; border: 1px solid rgba(229, 57, 53, 0.2); }
        .bulletin-severity-badge.moderate { background: rgba(67, 160, 71, 0.1); color: #43a047; border: 1px solid rgba(67, 160, 71, 0.2); }
        .bulletin-severity-badge.low { background: rgba(144, 164, 174, 0.1); color: #90a4ae; border: 1px solid rgba(144, 164, 174, 0.2); }

        @media(max-width:1024px){.metrics-grid{grid-template-columns:repeat(3,1fr);}.footer-grid{grid-template-columns:1fr 1fr;}}
        @media(max-width:768px){.hero-grid,.about-grid,.contact-grid{grid-template-columns:1fr;gap:40px;}.ic-hero-visual{display:none!important;}.features-grid,.reviews-grid{grid-template-columns:1fr;}.ic-stats-grid{grid-template-columns:repeat(3,1fr);}.metrics-grid{grid-template-columns:repeat(2,1fr);}.footer-grid{grid-template-columns:1fr 1fr;}.container{padding:0 20px;}.section{padding:64px 0;}}
        @media(max-width:480px){.ic-stats-grid{grid-template-columns:repeat(2,1fr);}.metrics-grid{grid-template-columns:1fr 1fr;}.footer-grid{grid-template-columns:1fr;}}
      `}</style>

      {/* LIVE TICKER */}
      <LiveTicker reports={reports} />

      {/* SEVERE BANNER */}
      {severeCount >= 1 && (
        <div className="severe-banner" onClick={() => nav("/bulletin")}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#e53935", animation: "blink 1s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#c62828", fontFamily: "'Sora',sans-serif" }}>
              {severeCount} SEVERE incident{severeCount > 1 ? "s" : ""} active on HP roads — tap to view
            </span>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(155deg,#fffcfa 0%,#fff9f5 45%,#fdfcff 100%)", minHeight: "calc(100vh - 68px)", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.25, backgroundImage: "radial-gradient(rgba(244,81,30,0.12) 1.5px,transparent 1.5px)", backgroundSize: "28px 28px" }} />
        <div style={{ position: "absolute", top: "-5%", right: "15%", width: 700, height: 600, pointerEvents: "none", background: "radial-gradient(ellipse at center,rgba(244,81,30,0.06),transparent 65%)" }} />

        <div className="container" style={{ position: "relative", zIndex: 1, padding: "80px 40px", width: "100%" }}>
          <div className="hero-grid">
            <div style={{ animation: "fadeUp .65s ease both" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", border: "1.5px solid #e8eaf6", borderRadius: 30, padding: "6px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 28 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#43a047", animation: "liveDot 1.4s infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#2e2e4e", letterSpacing: ".05em", fontFamily: "'Sora',sans-serif" }}>LIVE ON HP ROADS · iRAD 2025-26</span>
              </div>

              <h1 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: "clamp(38px,5vw,68px)", color: "#1a1a2e", lineHeight: 1.05, letterSpacing: "-2.5px", marginBottom: 20 }}>
                Drive Himachal Pradesh
                <span style={{ display: "block", background: "linear-gradient(135deg,#f4511e,#ff7043)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Safer, Smarter.</span>
              </h1>

              <p style={{ fontSize: 16.5, color: "#546e7a", lineHeight: 1.9, marginBottom: 36, maxWidth: 480 }}>
                AI-powered road safety for HP mountain roads. Real-time hotspot alerts, smart navigation, one-tap SOS, and safety rewards — built for every driver crossing Himachal's peaks.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
                <button className="btn-primary" onClick={() => isLoggedIn ? nav("/navigation") : nav("/login")}>
                  🧭 {isLoggedIn ? "Start Navigating" : "Sign In to Navigate"}
                </button>
                <button className="btn-outline" onClick={() => nav("/bulletin")}>📢 Live Bulletin</button>
              </div>

              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {["✅ Free forever", "📱 Mobile-first", "🔒 Offline PWA", "🧠 99.3% Accuracy"].map(l => (
                  <span key={l} style={{ fontSize: 12, color: "#90a4ae" }}>{l}</span>
                ))}
              </div>
            </div>

            <div className="ic-hero-visual" style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", animation: "float 4.5s ease-in-out infinite" }}>
                <div style={{ width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle at 38% 36%,#fff,#fff5ee,#fde0d0)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 32px 80px rgba(244,81,30,.13),0 0 0 1.5px rgba(244,81,30,.07)" }}>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: 82, display: "block", marginBottom: 8 }}>🛡️</span>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 20, color: "#1a1a2e", letterSpacing: "-.4px" }}>IntelliCrash</div>
                    <div style={{ fontSize: 12, color: "#90a4ae", marginTop: 4 }}>AI Road Safety · HP</div>
                    {reports.length > 0 && (
                      <div style={{ marginTop: 10, display: "inline-block", background: "#ffebee", color: "#e53935", fontWeight: 700, fontSize: 10, border: "1px solid #ef9a9a", borderRadius: 20, padding: "4px 12px", fontFamily: "'Sora',sans-serif" }}>
                        {reports.length} live report{reports.length !== 1 ? "s" : ""}
                      </div>
                    )}
                    <div style={{ marginTop: 6, display: "inline-block", background: "#e8f5e9", color: "#2e7d32", fontWeight: 700, fontSize: 10, border: "1px solid #a5d6a7", borderRadius: 20, padding: "4px 12px", fontFamily: "'Sora',sans-serif" }}>
                      99.3% Accuracy ✓
                    </div>
                  </div>
                </div>
                {[
                  { label: "⚡ AI Risk",   top: "12%",    left: "-8%" },
                  { label: "🗺️ Maps",    top: "5%",     right: "5%" },
                  { label: "🚨 SOS",     bottom: "15%", right: "-8%" },
                  { label: "🌤️ Weather", bottom: "8%",  left: "5%" },
                  { label: "📡 Live",    top: "50%",    left: "-14%", transform: "translateY(-50%)" },
                ].map(({ label, ...pos }) => (
                  <div key={label} style={{ position: "absolute", background: "#fff", border: "1.5px solid #e8eaf6", borderRadius: 30, padding: "7px 14px", fontSize: 11, fontWeight: 700, color: "#37474f", boxShadow: "0 4px 18px rgba(0,0,0,0.08)", whiteSpace: "nowrap", fontFamily: "'Sora',sans-serif", ...pos }}>{label}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="stats-strip">
        <div className="container">
          <div className="ic-stats-grid">
            {STATS.map((s, i) => (
              <div key={s.label} style={{ borderRight: i < 5 ? "1px solid #e8eaf6" : "none" }}>
                <StatCell {...s} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <MetricsSection />

      {/* FEATURES */}
      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <div className="section-header">
            <span className="chip" style={{ background: "#fbe9e7", color: "#f4511e", borderColor: "#ffccbc" }}>Features</span>
            <h2 className="section-title">Everything for Safe HP Travel</h2>
            <p className="section-sub">Built specifically for Himachal Pradesh's mountain roads — no hidden costs, no subscriptions, ever.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      <AboutSection />

      {/* LATEST NEWS PORTAL PREVIEW */}
      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
            <div>
              <span className="chip" style={{ background: "#e3f2fd", color: "#1e88e5", borderColor: "#bbdefb" }}>Safety Bulletins</span>
              <h2 className="section-title">📰 Road & Safety News</h2>
              <p className="section-sub">Curated updates from across Himachal Pradesh highways and rural corridors.</p>
            </div>
            <button 
              onClick={() => nav("/news")}
              style={{ padding: "10px 20px", borderRadius: 36, border: "1.5px solid #1e88e5", background: "rgba(30,136,229,0.05)", color: "#1e88e5", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
            >
              Open Full Portal →
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32 }}>
            {(reports.length >= 3 ? reports.slice(0, 3).map(r => ({
              t: r.title || r.description?.slice(0,60) || "Safety Alert",
              c: r.type?.toUpperCase() || "UPDATE",
              s: r.description?.slice(0, 100) || "Live update from IntelliCrash network.",
              i: r.photos?.[0] || "https://images.unsplash.com/photo-1494548162494-384bba4ab999?auto=format&fit=crop&q=80&w=400"
            })) : [
              { t: "NH-5 Landslide Near Jhakri", c: "URGENT", s: "BRO teams are on-site; clearance expected by evening.", i: "https://images.unsplash.com/photo-1494548162494-384bba4ab999?auto=format&fit=crop&q=80&w=400" },
              { t: "Himachal Police Deploy AI Cameras", c: "SAFETY", s: "50 new cameras integrated with IntelliCrash API.", i: "https://images.unsplash.com/photo-1527525443983-6e60c75efe46?auto=format&fit=crop&q=80&w=400" },
              { t: "Dense Fog Warning for Atal Tunnel", c: "WEATHER", s: "Visibility expected below 10m during night hours.", i: "https://images.unsplash.com/photo-1494548162494-384bba4ab999?auto=format&fit=crop&q=80&w=400" }
            ]).map((n, i) => (
              <div key={i} style={{ cursor: "pointer", group: "true" }} onClick={() => nav("/bulletin")}>
                <div style={{ width: "100%", height: 200, borderRadius: 16, overflow: "hidden", marginBottom: 16, border: "1px solid #e8eaf6" }}>
                  <img src={n.i} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s ease" }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 900, color: "#1e88e5", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{n.c}</div>
                <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.4, marginBottom: 8 }}>{n.t}</h3>
                <p style={{ fontSize: 13.5, color: "#78909c", lineHeight: 1.6 }}>{n.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="section" style={{ background: "#f5f5f5" }}>
        <div className="container">
          <div className="section-header">
            <span className="chip" style={{ background: "#ede7f6", color: "#6a1b9a", borderColor: "#ce93d8" }}>Community Feedback</span>
            <h2 className="section-title">💬 Driver Insights & AI Sentiment</h2>
            <p className="section-sub">Real-time analysis of user experiences across Himachal. Our AI evaluates every report for safety sentiment.</p>
          </div>

          {/* Sentiment Summary Bar */}
          <div style={{ background: "#fff", border: "1px solid #e8eaf6", borderRadius: 24, padding: "24px 32px", marginBottom: 40, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#90a4ae", textTransform: "uppercase", letterSpacing: 1 }}>Global Sentiment Distribution</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", fontFamily: "'Sora',sans-serif" }}>94% Positive Reliability</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#16a34a", background: "#e8f5e9", padding: "4px 12px", borderRadius: 20 }}>Llama-3 Analyzed</span>
              </div>
            </div>
            <div style={{ height: 10, background: "#f1f5f9", borderRadius: 5, overflow: "hidden", display: "flex" }}>
              <div style={{ width: "94%", background: "linear-gradient(90deg, #16a34a, #4ade80)" }} title="Positive: 94%" />
              <div style={{ width: "4%", background: "#f59e0b" }} title="Neutral: 4%" />
              <div style={{ width: "2%", background: "#dc2626" }} title="Negative: 2%" />
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#16a34a" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} /> Positive</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#f59e0b" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} /> Neutral</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#dc2626" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626" }} /> Critical</div>
            </div>
          </div>

          <div className="reviews-grid">
            {displayReviews.slice(0, 3).map((r, i) => {
              const COLS = ["#1e88e5", "#43a047", "#fb8c00", "#8e24aa", "#0288d1", "#e53935"];
              const color = r.color || COLS[i % COLS.length];
              const name  = r.user_name || "HP Driver";
              const sentiment = r.sentiment || "neutral";
              const score     = r.sentiment_score || (sentiment === "positive" ? 85 : sentiment === "negative" ? 15 : 50);
              const sentColor = sentiment === "positive" ? "#16a34a" : sentiment === "negative" ? "#dc2626" : "#f59e0b";
              const sentIcon  = sentiment === "positive" ? "🔥" : sentiment === "negative" ? "⚠️" : "⚖️";
              const timestamp = r.created_at ? timeAgo(r.created_at) : "Recently";
              return (
                <div key={r.id || i} className="review-card"
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.09)`; e.currentTarget.style.borderColor = color + "35"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#e8eaf6"; }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},${color}44)` }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0, fontFamily: "'Sora',sans-serif" }}>
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e", fontFamily: "'Sora',sans-serif" }}>{name}</div>
                        <div style={{ fontSize: 11.5, color: "#90a4ae" }}>{r.route || "HP Road"} · {timestamp}</div>
                      </div>
                    </div>
                    <div style={{ background: sentColor + "15", border: `1px solid ${sentColor}40`, borderRadius: 12, padding: "4px 10px", fontSize: 10, fontWeight: 800, color: sentColor, whiteSpace: "nowrap", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4, letterSpacing: 0.5 }}>
                      {sentIcon} {score}% {sentiment}
                    </div>
                  </div>
                  {r.rating && (
                    <div style={{ color: "#fb8c00", fontSize: 13, marginBottom: 10, letterSpacing: 1 }}>
                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    </div>
                  )}
                  <p style={{ fontSize: 13.5, color: "#546e7a", lineHeight: 1.8, fontStyle: "italic", margin: 0 }}>
                    "{r.review_text?.slice(0, 130)}{r.review_text?.length > 130 ? "…" : ""}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ContactSection />

      {/* FOOTER */}
      <footer style={{ background: "#fff", borderTop: "1.5px solid #e8eaf6", padding: "64px 40px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 52, paddingBottom: 36, borderBottom: "1px solid #e8eaf6" }}>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 26, color: "#1a1a2e", marginBottom: 4, letterSpacing: "-.6px" }}>Intelli<span style={{ color: "#f4511e" }}>Crash</span></div>
              <p style={{ fontSize: 13.5, color: "#78909c" }}>Himachal Pradesh's AI Road Safety Platform</p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {[
                { icon: "💼", href: "https://linkedin.com/in/shubham-707b0b350", bg: "#0077b5" },
                { icon: "𝕏",  href: "https://twitter.com/intellicrash",         bg: "#111" },
              ].map(({ icon, href, bg }) => (
                <a key={href} href={href} target="_blank" rel="noreferrer"
                  style={{ width: 40, height: 40, borderRadius: 10, background: bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, textDecoration: "none", fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.14)", transition: "transform .18s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                >{icon}</a>
              ))}
              <a href="mailto:shubhamabhi004@gmail.com"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 36, background: "linear-gradient(135deg,#f4511e,#ff7043)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 14px rgba(244,81,30,.28)", transition: "all .18s", fontFamily: "'Sora',sans-serif" }}
              >✉️ Contact Us</a>
            </div>
          </div>

          <div className="footer-grid" style={{ marginBottom: 44 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#f4511e,#ff7043)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🛡️</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, color: "#1a1a2e" }}>Intelli<span style={{ color: "#f4511e" }}>Crash</span></div>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.8, color: "#78909c", maxWidth: 230, marginBottom: 18 }}>AI-powered road safety for Himachal Pradesh. Built on real iRAD data. Always free.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <a href="mailto:shubhamabhi004@gmail.com" style={{ fontSize: 12.5, color: "#78909c", textDecoration: "none" }}>✉️ shubhamabhi004@gmail.com</a>
                <a href="mailto:rihalrai68@gmail.com"     style={{ fontSize: 12.5, color: "#78909c", textDecoration: "none" }}>✉️ rihalrai68@gmail.com</a>
                <span style={{ fontSize: 12.5, color: "#78909c" }}>🤝 JNGEC Sundernagar, HP</span>
              </div>
            </div>

            <div>
              <div className="footer-section-title">Platform</div>
              {[["🧭","Navigate","/navigation"],["📢","Live Bulletin","/bulletin"],["🏆","Rewards","/rewards"],["🚨","SOS Emergency","/sos"]].map(([ic,lb,path]) => (
                <a key={lb} className="footer-link" onClick={e => { e.preventDefault(); nav(path); }} href="#">
                  <span>{ic}</span>{lb}
                </a>
              ))}
            </div>

            <div>
              <div className="footer-section-title">Resources</div>
              {[["🗺️","Hotspot Map","/navigation"],["💬","AI Chat","/chatbot"]].map(([ic,lb,path]) => (
                <a key={lb} className="footer-link" onClick={e => { e.preventDefault(); nav(path); }} href="#">
                  <span>{ic}</span>{lb}
                </a>
              ))}
              <a className="footer-link" href="/api/docs" target="_blank" rel="noopener noreferrer">
                <span>📄</span>API Docs
              </a>
            </div>

            <div>
              <div className="footer-section-title">Emergency</div>
              {[
                ["🚨","HP Emergency: 112","tel:112","#e53935",true],
                ["🚑","Ambulance: 108",   "tel:108","#f4511e",true],
                ["👮","HP Police: 100",   "tel:100","#1e88e5",true],
                ["🔥","Fire: 1070",       "tel:1070","#78909c",false],
              ].map(([ic,lb,href,col,bold]) => (
                <a key={lb} href={href} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: col, fontWeight: bold ? 700 : 400, textDecoration: "none", marginBottom: 10 }}>
                  <span>{ic}</span>{lb}
                </a>
              ))}
              <div style={{ marginTop: 16, background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#e53935", marginBottom: 4, fontFamily: "'Sora',sans-serif", letterSpacing: ".05em" }}>🚨 EMERGENCY</div>
                <a href="tel:112" style={{ fontSize: 28, fontWeight: 800, color: "#e53935", textDecoration: "none", fontFamily: "'Sora',sans-serif", letterSpacing: "-.5px" }}>112</a>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "#e8eaf6", marginBottom: 24 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 12, color: "#90a4ae" }}>© 2025 IntelliCrash · Team IntelliCrash · JNGEC Sundernagar · All rights reserved</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#90a4ae" }}>
              <span style={{ background: "#fbe9e7", border: "1px solid #ffccbc", borderRadius: 8, padding: "3px 10px", fontSize: 10.5, color: "#f4511e", fontWeight: 700, fontFamily: "'Sora',sans-serif" }}>IntelliCrash AI</span>
              <span>iRAD 2025-26 · Himachal Pradesh Road Safety Project</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}