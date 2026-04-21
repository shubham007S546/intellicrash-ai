/**
 * UserLogin.jsx — IntelliCrash v3.0 FINAL
 * ✅ "Login Bag Animation" style — SVG character reacts to password
 * ✅ Character bobs when idle, covers eyes when password focused, peeks on show-password
 * ✅ Google OAuth + GitHub OAuth + Email/Password + Sign Up
 * ✅ Reads ?tab=signup from URL
 * ✅ Imports login.css for CSS animations
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import {
  Box, Button, TextField, CircularProgress,
  Alert, InputAdornment, IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import "./login.css"; // place login.css in /pages/

/* ── Icons ──────────────────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
const GitHubIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink:0 }}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

/* ── Animated Character ─────────────────────────────────────────────────── */
// mode: "idle" | "watching" | "covering" | "peeking"
function Character({ mode }) {
  const animClass =
    mode === "covering" ? "char-cover" :
    mode === "peeking"  ? "char-peek"  :
    "char-bob";

  // Eye state
  const eyesCovered = mode === "covering";
  const eyesPeeking = mode === "peeking";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", userSelect:"none" }}>
      <div className={animClass} style={{ transformOrigin:"bottom center" }}>
        <svg width="110" height="160" viewBox="0 0 110 160">
          <defs>
            <radialGradient id="ug-skin" cx="50%" cy="40%" r="60%">
              <stop offset="0%"  stopColor="#fde8d0"/>
              <stop offset="100%" stopColor="#f4c49a"/>
            </radialGradient>
            <radialGradient id="ug-hair" cx="50%" cy="20%" r="80%">
              <stop offset="0%"  stopColor="#c8a96e"/>
              <stop offset="100%" stopColor="#a0784a"/>
            </radialGradient>
            <radialGradient id="ug-shirt" cx="50%" cy="30%" r="70%">
              <stop offset="0%"  stopColor="#7c9fc7"/>
              <stop offset="100%" stopColor="#4a6fa5"/>
            </radialGradient>
          </defs>

          {/* Shadow */}
          <ellipse cx="55" cy="156" rx="28" ry="6" fill="rgba(0,0,0,0.18)"/>

          {/* Body / shirt */}
          <path d="M28 105 Q20 120 18 155 L92 155 Q90 120 82 105 Q68 115 55 115 Q42 115 28 105 Z"
            fill="url(#ug-shirt)"/>

          {/* Collar */}
          <path d="M42 108 L55 122 L68 108 Q62 112 55 112 Q48 112 42 108 Z"
            fill="#fff" opacity="0.7"/>

          {/* Neck */}
          <rect x="48" y="90" width="14" height="18" rx="6" fill="url(#ug-skin)"/>

          {/* Head */}
          <ellipse cx="55" cy="70" rx="30" ry="33" fill="url(#ug-skin)"/>

          {/* Hair */}
          <path d="M26 62 Q25 35 55 28 Q85 35 84 62 Q80 42 55 38 Q30 42 26 62 Z"
            fill="url(#ug-hair)"/>
          {/* Hair strands */}
          <path d="M28 55 Q26 44 32 38" stroke="#a0784a" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M82 55 Q84 44 78 38" stroke="#a0784a" strokeWidth="2" fill="none" strokeLinecap="round"/>

          {/* Ears */}
          <ellipse cx="25" cy="70" rx="6" ry="8" fill="url(#ug-skin)"/>
          <ellipse cx="85" cy="70" rx="6" ry="8" fill="url(#ug-skin)"/>
          <ellipse cx="25" cy="70" rx="3.5" ry="5" fill="#f4a88a" opacity="0.5"/>
          <ellipse cx="85" cy="70" rx="3.5" ry="5" fill="#f4a88a" opacity="0.5"/>

          {/* ── Eyes ── */}
          {eyesCovered ? (
            /* Hands covering eyes */
            <>
              {/* Left hand */}
              <ellipse cx="40" cy="68" rx="13" ry="10" fill="url(#ug-skin)"
                stroke="#e8b090" strokeWidth="1"/>
              {/* Right hand */}
              <ellipse cx="70" cy="68" rx="13" ry="10" fill="url(#ug-skin)"
                stroke="#e8b090" strokeWidth="1"/>
              {/* Fingers left */}
              <rect x="28" y="60" width="7" height="12" rx="3.5" fill="url(#ug-skin)" stroke="#e8b090" strokeWidth="0.8"/>
              <rect x="36" y="58" width="7" height="13" rx="3.5" fill="url(#ug-skin)" stroke="#e8b090" strokeWidth="0.8"/>
              <rect x="44" y="58" width="7" height="13" rx="3.5" fill="url(#ug-skin)" stroke="#e8b090" strokeWidth="0.8"/>
              {/* Fingers right */}
              <rect x="59" y="58" width="7" height="13" rx="3.5" fill="url(#ug-skin)" stroke="#e8b090" strokeWidth="0.8"/>
              <rect x="67" y="58" width="7" height="13" rx="3.5" fill="url(#ug-skin)" stroke="#e8b090" strokeWidth="0.8"/>
              <rect x="75" y="60" width="7" height="12" rx="3.5" fill="url(#ug-skin)" stroke="#e8b090" strokeWidth="0.8"/>
            </>
          ) : eyesPeeking ? (
            /* Peeking — eyes wide open, hands lowered */
            <>
              {/* Lowered hands */}
              <ellipse cx="37" cy="82" rx="12" ry="8" fill="url(#ug-skin)" stroke="#e8b090" strokeWidth="1"/>
              <ellipse cx="73" cy="82" rx="12" ry="8" fill="url(#ug-skin)" stroke="#e8b090" strokeWidth="1"/>
              {/* Eyes wide */}
              <ellipse cx="43" cy="68" rx="9" ry="10" fill="#fff"/>
              <ellipse cx="67" cy="68" rx="9" ry="10" fill="#fff"/>
              <circle cx="45" cy="70" r="5.5" fill="#3b5fa0"/>
              <circle cx="69" cy="70" r="5.5" fill="#3b5fa0"/>
              <circle cx="46" cy="68" r="2.5" fill="#1a1a2e"/>
              <circle cx="70" cy="68" r="2.5" fill="#1a1a2e"/>
              <circle cx="48" cy="66" r="1.2" fill="#fff"/>
              <circle cx="72" cy="66" r="1.2" fill="#fff"/>
              {/* Raised eyebrows */}
              <path d="M35 57 Q43 53 51 56" stroke="#a0784a" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <path d="M59 56 Q67 53 75 57" stroke="#a0784a" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </>
          ) : (
            /* Normal / watching eyes */
            <>
              <ellipse cx="43" cy="70" rx="8" ry="9" fill="#fff"/>
              <ellipse cx="67" cy="70" rx="8" ry="9" fill="#fff"/>
              <circle cx="44.5" cy="71" r="5" fill="#3b5fa0"/>
              <circle cx="68.5" cy="71" r="5" fill="#3b5fa0"/>
              <circle cx="45.5" cy="69.5" r="2.2" fill="#1a1a2e"/>
              <circle cx="69.5" cy="69.5" r="2.2" fill="#1a1a2e"/>
              <circle cx="47" cy="68" r="1" fill="#fff"/>
              <circle cx="71" cy="68" r="1" fill="#fff"/>
              {/* Eyebrows */}
              <path d="M36 61 Q43 57.5 50 60" stroke="#a0784a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
              <path d="M60 60 Q67 57.5 74 61" stroke="#a0784a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            </>
          )}

          {/* Nose */}
          <ellipse cx="55" cy="79" rx="3.5" ry="2.5" fill="#e8a882" opacity="0.6"/>

          {/* Mouth */}
          {eyesCovered ? (
            <path d="M46 90 Q55 87 64 90" stroke="#c0866a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          ) : (
            <path d="M46 90 Q55 96 64 90" stroke="#c0866a" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          )}

          {/* Blush */}
          <ellipse cx="33" cy="78" rx="7" ry="5" fill="#f8a0a0" opacity="0.3"/>
          <ellipse cx="77" cy="78" rx="7" ry="5" fill="#f8a0a0" opacity="0.3"/>

          {/* Arms */}
          {!eyesCovered && !eyesPeeking && (
            <>
              <path d="M28 108 Q14 118 12 132" stroke="url(#ug-shirt)"
                strokeWidth="16" strokeLinecap="round" fill="none"/>
              <path d="M82 108 Q96 118 98 132" stroke="url(#ug-shirt)"
                strokeWidth="16" strokeLinecap="round" fill="none"/>
              {/* Hands */}
              <ellipse cx="11" cy="136" rx="8" ry="7" fill="url(#ug-skin)"/>
              <ellipse cx="99" cy="136" rx="8" ry="7" fill="url(#ug-skin)"/>
            </>
          )}
        </svg>
      </div>

      {/* Label */}
      <p style={{
        margin:"4px 0 0",
        fontSize:11,
        color: eyesCovered
          ? "rgba(99,102,241,0.7)"
          : eyesPeeking
            ? "rgba(99,102,241,0.9)"
            : "rgba(100,116,139,0.6)",
        letterSpacing:"0.1em",
        textTransform:"uppercase",
        transition:"color 0.3s",
      }}>
        {eyesCovered ? "not looking 👀" : eyesPeeking ? "i can see now!" : "intellicrash"}
      </p>
    </div>
  );
}

/* ── Light input field ───────────────────────────────────────────────────── */
function NiceField({ sx, ...props }) {
  return (
    <TextField fullWidth size="small" {...props} sx={{
      mb:1.5,
      "& .MuiOutlinedInput-root":{
        borderRadius:2, fontSize:14, color:"#1e293b",
        background:"#f8faff",
        "& fieldset":{ borderColor:"#e2e8f0", transition:"border-color 0.2s, box-shadow 0.2s" },
        "&:hover fieldset":{ borderColor:"#a5b4fc" },
        "&.Mui-focused fieldset":{ borderColor:"#6366f1", boxShadow:"0 0 0 3px rgba(99,102,241,0.12)" },
      },
      "& input::placeholder":{ color:"#94a3b8", opacity:1 },
      "& label":{ color:"#94a3b8", fontSize:13 },
      "& label.Mui-focused":{ color:"#6366f1" },
      ...sx,
    }}/>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function UserLogin() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab,             setTab]             = useState(searchParams.get("tab")==="signup" ? "signup" : "login");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass,        setShowPass]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [providerLoading, setProviderLoading] = useState("");
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  // Character mode: "idle" | "watching" | "covering" | "peeking"
  const [charMode, setCharMode] = useState("idle");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) nav("/", { replace:true });
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) nav("/", { replace:true });
    });
    return () => listener?.subscription?.unsubscribe();
  }, [nav]);

  const handleOAuth = async (provider) => {
    setProviderLoading(provider); setError("");
    const { error:e } = await supabase.auth.signInWithOAuth({
      provider,
      options:{ redirectTo:`${window.location.origin}/` },
    });
    if (e) setError(e.message);
    setProviderLoading("");
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    const { error:e } = await supabase.auth.signInWithPassword({ email:email.trim(), password });
    if (e) setError(e.message);
    setLoading(false);
  };

  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) { setError("Please fill in all fields."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    const { error:e } = await supabase.auth.signUp({
      email:email.trim(), password,
      options:{ emailRedirectTo:`${window.location.origin}/` },
    });
    if (e) {
      setError(e.message);
    } else {
      setSuccess("Account created! Check your email to confirm before signing in.");
      setEmail(""); setPassword(""); setConfirmPassword("");
    }
    setLoading(false);
  };

  if (checkingSession) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100vh", background:"#f0f4ff" }}>
      <CircularProgress sx={{ color:"#6366f1" }}/>
    </div>
  );

  const busy = loading || !!providerLoading;

  return (
    <div style={{
      display:"flex", minHeight:"100vh",
      fontFamily:"'DM Sans',sans-serif",
      background:"#f0f4ff",
    }}>

      {/* ── Left decorative panel ── */}
      <div
        className="panel-slide-in"
        style={{
          display:"none",
          flex:1,
          flexDirection:"column",
          alignItems:"center",
          justifyContent:"center",
          background:"linear-gradient(150deg,#312e81,#4338ca,#6d28d9)",
          color:"#fff",
          padding:"48px 40px",
          position:"relative",
          overflow:"hidden",
        }}
        // show on md+ via inline media (handled by CSS below, or use a style tag)
        id="login-left-panel"
      >
        {/* Decorative blobs */}
        {[
          { w:320, h:320, top:-90,  right:-90,  opacity:0.1 },
          { w:200, h:200, bottom:-60, left:-60, opacity:0.08 },
          { w:120, h:120, top:"38%", left:"65%", opacity:0.07 },
        ].map((c,i) => (
          <div key={i} style={{
            position:"absolute", width:c.w, height:c.h, borderRadius:"50%",
            background:"#fff", opacity:c.opacity,
            top:c.top, right:c.right, bottom:c.bottom, left:c.left,
          }}/>
        ))}

        <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:38,
          margin:"0 0 8px", zIndex:1 }}>IntelliCrash</p>
        <p style={{ fontSize:15, opacity:0.78, textAlign:"center", maxWidth:300,
          lineHeight:1.75, margin:"0 0 40px", zIndex:1 }}>
          HP Road Safety Intelligence.<br/>
          Real-time crash analysis · iRAD powered.
        </p>

        {/* Stats */}
        {[
          { label:"Crashes Analyzed",    value:"12,480+" },
          { label:"Districts Covered",   value:"12 / 12" },
          { label:"Prediction Accuracy", value:"94.3%"   },
        ].map(({ label, value }, i) => (
          <div
            key={label}
            className={`stat-pop-${i+1}`}
            style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              background:"rgba(255,255,255,0.11)", borderRadius:12,
              padding:"12px 20px", marginBottom:10,
              backdropFilter:"blur(10px)",
              border:"1px solid rgba(255,255,255,0.16)",
              width:"100%", maxWidth:300, zIndex:1,
            }}
          >
            <span style={{ fontSize:13, opacity:0.82 }}>{label}</span>
            <span style={{ fontWeight:800, fontSize:16 }}>{value}</span>
          </div>
        ))}

        {/* Testimonial */}
        <div style={{
          marginTop:24, padding:"20px 24px",
          background:"rgba(255,255,255,0.09)",
          borderRadius:14, border:"1px solid rgba(255,255,255,0.18)",
          width:"100%", maxWidth:300, zIndex:1,
        }}>
          <div style={{ display:"flex", gap:3, marginBottom:8 }}>
            {"⭐⭐⭐⭐⭐".split("").map((s,i) => (
              <span key={i} style={{ fontSize:13 }}>⭐</span>
            ))}
          </div>
          <p style={{ fontSize:13, opacity:0.88, fontStyle:"italic",
            lineHeight:1.65, margin:"0 0 8px" }}>
            "IntelliCrash saved us near Shimla. The risk alerts are incredibly accurate."
          </p>
          <p style={{ fontSize:11, opacity:0.5, margin:0 }}>— HP Driver, Shimla</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="form-slide-in"
        style={{
          width:"100%",
          maxWidth:520,
          display:"flex",
          flexDirection:"column",
          alignItems:"center",
          justifyContent:"center",
          background:"#fff",
          padding:"40px 32px",
          boxShadow:"-4px 0 40px rgba(99,102,241,0.06)",
          position:"relative",
        }}
      >
        {/* Character */}
        <div style={{ marginBottom:4 }}>
          <Character mode={charMode}/>
        </div>

        {/* Heading */}
        <div style={{ width:"100%", maxWidth:360, marginBottom:24 }}>
          <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
            fontSize:24, color:"#0f172a", margin:"0 0 4px" }}>
            {tab==="login" ? "Welcome back 👋" : "Create account ✨"}
          </p>
          <p style={{ fontSize:14, color:"#64748b", margin:0 }}>
            {tab==="login"
              ? "Sign in to IntelliCrash road safety tools"
              : "Join the HP Road Safety Platform — free forever"}
          </p>
        </div>

        <div style={{ width:"100%", maxWidth:360 }}>
          {/* Tab switcher */}
          <div style={{
            display:"flex", background:"#f1f5f9", borderRadius:10,
            padding:4, marginBottom:20,
          }}>
            {["login","signup"].map(t => (
              <div key={t}
                onClick={() => { setTab(t); setError(""); setSuccess(""); setCharMode("idle"); }}
                style={{
                  flex:1, textAlign:"center",
                  padding:"9px 0", borderRadius:8,
                  fontWeight:600, fontSize:14, cursor:"pointer",
                  transition:"all 0.18s",
                  background: tab===t ? "#fff" : "transparent",
                  color: tab===t ? "#0f172a" : "#64748b",
                  boxShadow: tab===t ? "0 1px 6px rgba(0,0,0,0.10)" : "none",
                  userSelect:"none",
                }}
              >
                {t==="login" ? "Sign In" : "Sign Up"}
              </div>
            ))}
          </div>

          {/* Alerts */}
          {error   && <Alert severity="error"   onClose={() => setError("")}   sx={{ mb:2, borderRadius:2, fontSize:13 }}>{error}</Alert>}
          {success && <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb:2, borderRadius:2, fontSize:13 }}>{success}</Alert>}

          {/* OAuth */}
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            {[
              { p:"google", label:"Google",  Icon:GoogleIcon, dark:false },
              { p:"github", label:"GitHub",  Icon:GitHubIcon, dark:true  },
            ].map(({ p, label, Icon, dark }) => (
              <Button key={p} fullWidth onClick={() => handleOAuth(p)} disabled={busy}
                startIcon={
                  providerLoading===p
                    ? <CircularProgress size={15} sx={{ color: dark?"#f9fafb":"#1f2937" }}/>
                    : <Icon/>
                }
                sx={{
                  py:1.25, borderRadius:2, fontWeight:600, fontSize:13,
                  textTransform:"none",
                  background: dark ? "#1f2937" : "#fff",
                  border:`1.5px solid ${dark?"#374151":"#e2e8f0"}`,
                  color: dark ? "#f9fafb" : "#1f2937",
                  "&:hover":{
                    background: dark ? "#111827" : "#f8faff",
                    borderColor: dark ? "#4b5563" : "#c7d2fe",
                    boxShadow:"0 2px 8px rgba(0,0,0,0.09)",
                  },
                  "&:disabled":{ opacity:0.5 },
                  transition:"all 0.18s",
                }}>
                {label}
              </Button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:"#e2e8f0" }}/>
            <span style={{ fontSize:12, color:"#94a3b8" }}>or continue with email</span>
            <div style={{ flex:1, height:1, background:"#e2e8f0" }}/>
          </div>

          {/* Email */}
          <NiceField
            label="Email address" type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setCharMode("watching")}
            onBlur={() => setCharMode("idle")}
          />

          {/* Password — triggers character cover/peek */}
          <NiceField
            label="Password"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setCharMode(showPass ? "peeking" : "covering")}
            onBlur={() => setCharMode("idle")}
            onKeyDown={e => tab==="login" && e.key==="Enter" && handleEmailLogin()}
            InputProps={{
              endAdornment:(
                <InputAdornment position="end">
                  <IconButton size="small"
                    onClick={() => {
                      setShowPass(p => {
                        const next = !p;
                        setCharMode(next ? "peeking" : "covering");
                        return next;
                      });
                    }}
                    sx={{ color:"#94a3b8", "&:hover":{ color:"#6366f1" } }}>
                    {showPass ? <VisibilityOff fontSize="small"/> : <Visibility fontSize="small"/>}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: tab==="signup" ? 1.5 : 2 }}
          />

          {tab==="signup" && (
            <NiceField
              label="Confirm password" type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onFocus={() => setCharMode("covering")}
              onBlur={() => setCharMode("idle")}
              onKeyDown={e => e.key==="Enter" && handleEmailSignup()}
              sx={{ mb:2 }}
            />
          )}

          {/* Submit */}
          <Button fullWidth
            onClick={tab==="login" ? handleEmailLogin : handleEmailSignup}
            disabled={busy}
            sx={{
              py:1.4, borderRadius:2.5, fontWeight:800, fontSize:14,
              textTransform:"none",
              background: busy ? "#e0e7ff" : "linear-gradient(135deg,#6366f1,#7c3aed)",
              color: busy ? "#a5b4fc" : "#fff",
              boxShadow: busy ? "none" : "0 4px 18px rgba(99,102,241,0.35)",
              "&:hover":{
                background:"linear-gradient(135deg,#4f46e5,#6d28d9)",
                transform:"translateY(-2px)",
                boxShadow:"0 8px 24px rgba(99,102,241,0.42)",
              },
              "&:disabled":{ color:"#a5b4fc" },
              transition:"all 0.2s",
            }}>
            {loading
              ? <CircularProgress size={18} sx={{ color:"#fff" }}/>
              : tab==="login" ? "Sign In" : "Create Account"}
          </Button>

          {/* Footer */}
          <p style={{ textAlign:"center", fontSize:12, color:"#94a3b8", margin:"20px 0 8px" }}>
            By continuing, you agree to IntelliCrash's{" "}
            <span style={{ color:"#6366f1", cursor:"pointer" }}>Terms</span>
            {" "}and{" "}
            <span style={{ color:"#6366f1", cursor:"pointer" }}>Privacy Policy</span>.
          </p>

          <p style={{ textAlign:"center", fontSize:12, color:"#94a3b8", margin:0 }}>
            Admin access?{" "}
            <Link to="/admin-login" style={{
              color:"#6366f1", fontWeight:600, textDecoration:"none",
            }}>
              Admin Portal →
            </Link>
          </p>
        </div>
      </div>

      {/* Show left panel on desktop via style tag */}
      <style>{`
        @media (min-width: 768px) {
          #login-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}