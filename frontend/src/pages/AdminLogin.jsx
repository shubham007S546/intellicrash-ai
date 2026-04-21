/**
 * AdminLogin.jsx — IntelliCrash v3.0 FINAL
 * ✅ Login Lamp aesthetic with CSS animations (no MUI keyframe bugs)
 * ✅ Lamp glows amber when card/fields are focused
 * ✅ Google + GitHub OAuth
 * ✅ Email/Password FIXED (Supabase verifies first, then whitelist check)
 * ✅ Imports login.css for reliable CSS animations
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import {
  Box, Button, TextField, CircularProgress,
  Alert, InputAdornment, IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import "./login.css"; // place login.css next to this file in /pages/

const ADMIN_EMAILS = ["shubhamabhi004@gmail.com"];

/* ── Icons ──────────────────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink:0 }}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

/* ── Lamp SVG ────────────────────────────────────────────────────────────── */
function Lamp({ isOn }) {
  return (
    <div className="lamp-float" style={{ position:"relative", width:150, height:200 }}>
      {isOn && (
        <div className="lamp-glow" style={{
          position:"absolute", top:0, left:"50%",
          width:220, height:220, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(251,191,36,0.32) 0%,rgba(251,191,36,0.06) 55%,transparent 75%)",
          pointerEvents:"none", zIndex:0,
        }} />
      )}
      <svg width="150" height="200" viewBox="0 0 150 200" style={{ position:"relative", zIndex:1 }}>
        <defs>
          <radialGradient id="adm-shade" cx="50%" cy="28%" r="72%">
            <stop offset="0%"   stopColor={isOn ? "#fef9c3" : "#d1d5db"} />
            <stop offset="55%"  stopColor={isOn ? "#fbbf24" : "#9ca3af"} />
            <stop offset="100%" stopColor={isOn ? "#b45309" : "#6b7280"} />
          </radialGradient>
          <radialGradient id="adm-base" cx="50%" cy="0%" r="100%">
            <stop offset="0%"   stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#9ca3af" />
          </radialGradient>
          <filter id="adm-blur"><feGaussianBlur stdDeviation="3"/></filter>
        </defs>
        <ellipse cx="75" cy="60" rx="54" ry="19"
          fill={isOn?"#92400e":"#374151"} opacity="0.35" filter="url(#adm-blur)"/>
        <path d="M22 58 Q24 96 44 108 L106 108 Q126 96 128 58 Z"
          fill="url(#adm-shade)" stroke={isOn?"#b45309":"#4b5563"} strokeWidth="1.2"/>
        <rect x="38" y="106" width="74" height="9" rx="4.5"
          fill={isOn?"#92400e":"#6b7280"}/>
        {isOn && <ellipse cx="75" cy="104" rx="28" ry="6" fill="rgba(251,191,36,0.4)"/>}
        <rect x="70" y="115" width="10" height="58" rx="5" fill="url(#adm-base)"/>
        <line x1="75" y1="115" x2="75" y2="140"
          stroke={isOn?"#fbbf24":"#9ca3af"} strokeWidth="1.5" strokeDasharray="3,3"/>
        <circle cx="75" cy="144" r="4.5" fill={isOn?"#fbbf24":"#9ca3af"}/>
        <ellipse cx="75" cy="177" rx="30" ry="7" fill="#1f2937" opacity="0.5"/>
        <rect x="54" y="169" width="42" height="10" rx="5" fill="url(#adm-base)"/>
        {isOn && <path d="M55 180 Q75 176 95 180 L130 200 L20 200 Z" fill="rgba(251,191,36,0.06)"/>}
      </svg>
      {isOn && (
        <div className="floor-glow" style={{
          position:"absolute", bottom:-20, left:"50%",
          transform:"translateX(-50%)",
          width:220, height:50,
          background:"radial-gradient(ellipse,rgba(251,191,36,0.16) 0%,transparent 72%)",
          borderRadius:"50%", pointerEvents:"none",
        }}/>
      )}
    </div>
  );
}

/* ── Styled field ────────────────────────────────────────────────────────── */
function LampField({ lampOn, sx, ...props }) {
  const accent = lampOn ? "#fbbf24" : "#6366f1";
  return (
    <TextField fullWidth size="small" {...props} sx={{
      mb:1.5,
      "& .MuiOutlinedInput-root":{
        borderRadius:2.5, fontSize:13, color:"#f5f0e8",
        background:"rgba(255,255,255,0.05)", transition:"background 0.3s",
        "& fieldset":{ borderColor:"rgba(255,255,255,0.09)", transition:"border-color 0.3s, box-shadow 0.3s" },
        "&:hover fieldset":{ borderColor:`${accent}66` },
        "&.Mui-focused fieldset":{ borderColor:accent, boxShadow:`0 0 0 3px ${accent}20` },
      },
      "& input":{ color:"#f5f0e8", "&::placeholder":{ color:"rgba(255,255,255,0.22)", opacity:1 } },
      "& label":{ color:"rgba(255,255,255,0.28)", fontSize:12 },
      "& label.Mui-focused":{ color:accent },
      ...sx,
    }}/>
  );
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AdminLogin() {
  const nav = useNavigate();
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [showPass,        setShowPass]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [providerLoading, setProviderLoading] = useState("");
  const [error,           setError]           = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [lampOn,          setLampOn]          = useState(false);
  const lampTimer = useRef(null);

  const turnOn  = () => { clearTimeout(lampTimer.current); setLampOn(true); };
  const turnOff = () => { lampTimer.current = setTimeout(() => setLampOn(false), 3000); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        if (ADMIN_EMAILS.includes(data.session.user.email)) nav("/admin", { replace:true });
        else { supabase.auth.signOut(); setError("Access denied. Not an authorised admin."); }
      }
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        if (ADMIN_EMAILS.includes(session.user.email)) nav("/admin", { replace:true });
        else { supabase.auth.signOut(); setError("Access denied. Only authorised admin allowed."); }
      }
    });
    return () => listener?.subscription?.unsubscribe();
  }, [nav]);

  const handleOAuth = async (provider) => {
    setProviderLoading(provider); setError("");
    const { error:e } = await supabase.auth.signInWithOAuth({
      provider,
      options:{ redirectTo:`${window.location.origin}/admin-login` },
    });
    if (e) setError(e.message);
    setProviderLoading("");
  };

  // ✅ FIXED: Supabase verifies password first, THEN we check admin whitelist
  const handleEmail = async () => {
    if (!email.trim() || !password.trim()) { setError("Please enter email and password."); return; }
    setLoading(true); setError("");
    const { data, error:e } = await supabase.auth.signInWithPassword({ email:email.trim(), password });
    if (e) { setError(e.message); setLoading(false); return; }
    if (!ADMIN_EMAILS.includes(data.user?.email)) {
      await supabase.auth.signOut();
      setError("Access denied. This email is not an authorised admin.");
    }
    setLoading(false);
  };

  if (checkingSession) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100vh", background:"linear-gradient(135deg,#0c0c14,#13101f)" }}>
      <CircularProgress sx={{ color:"#fbbf24" }}/>
    </div>
  );

  const busy = loading || !!providerLoading;

  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"center",
      minHeight:"100vh",
      background: lampOn
        ? "linear-gradient(135deg,#0f0d18,#1a1426,#1c1508)"
        : "linear-gradient(135deg,#0c0c14,#13101f,#0f0c1a)",
      transition:"background 1.1s ease",
      fontFamily:"'DM Sans',sans-serif",
      overflow:"hidden", position:"relative",
    }}>
      <div className="dot-grid"/>

      {lampOn && (
        <div className="floor-glow" style={{
          position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
          width:700, height:220,
          background:"radial-gradient(ellipse,rgba(251,191,36,0.07) 0%,transparent 70%)",
          pointerEvents:"none", zIndex:1,
        }}/>
      )}

      <div className="page-in" style={{
        display:"flex", alignItems:"center", gap:48,
        padding:"0 16px", flexWrap:"wrap", justifyContent:"center",
        position:"relative", zIndex:2,
      }}>

        {/* ── Lamp ── */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          <p style={{
            fontFamily:"'Syne',serif", fontStyle:"italic",
            fontSize:26, fontWeight:300, margin:0,
            color: lampOn ? "rgba(251,191,36,0.65)" : "rgba(255,255,255,0.14)",
            letterSpacing:"-0.02em", transition:"color 1s ease",
          }}>Admin Portal</p>

          <Lamp isOn={lampOn}/>

          <p style={{
            fontSize:9, margin:0,
            color: lampOn ? "rgba(251,191,36,0.45)" : "rgba(255,255,255,0.1)",
            letterSpacing:"0.18em", textTransform:"uppercase",
            transition:"color 1s ease",
          }}>
            {lampOn ? "secured · illuminated" : "click to illuminate"}
          </p>
        </div>

        {/* ── Card ── */}
        <div
          className="card-shine"
          onClick={turnOn}
          style={{
            width:"100%", maxWidth:400,
            background: lampOn ? "rgba(28,22,8,0.94)" : "rgba(18,18,30,0.94)",
            border: lampOn ? "1px solid rgba(251,191,36,0.22)" : "1px solid rgba(255,255,255,0.07)",
            borderRadius:20, padding:"36px 32px",
            boxShadow: lampOn
              ? "0 32px 80px rgba(0,0,0,0.75),0 0 60px rgba(251,191,36,0.07)"
              : "0 32px 80px rgba(0,0,0,0.65)",
            backdropFilter:"blur(24px)",
            transition:"background 0.8s ease,border-color 0.8s ease,box-shadow 0.8s ease",
            position:"relative", overflow:"hidden",
          }}
        >
          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{
              fontSize:42, marginBottom:6,
              filter: lampOn ? "drop-shadow(0 0 14px rgba(251,191,36,0.65))" : "none",
              transition:"filter 0.8s ease",
            }}>🛡️</div>
            <p style={{
              fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:22, margin:"0 0 3px",
              color: lampOn ? "#fef3c7" : "#f0f0f8",
              transition:"color 0.8s ease",
            }}>Welcome</p>
            <p style={{
              fontSize:10, margin:0, letterSpacing:"0.2em", textTransform:"uppercase",
              color: lampOn ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.22)",
              transition:"color 0.8s ease",
            }}>IntelliCrash · Admin</p>
          </div>

          {error && (
            <Alert severity="error" onClose={() => setError("")} sx={{
              mb:2, borderRadius:2, fontSize:12,
              background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
              color:"#fca5a5", "& .MuiAlert-icon":{ color:"#f87171" },
            }}>{error}</Alert>
          )}

          {/* OAuth */}
          <div style={{ display:"flex", gap:12, marginBottom:16 }}>
            {[
              { p:"google", label:"Google", Icon:GoogleIcon },
              { p:"github", label:"GitHub", Icon:GitHubIcon },
            ].map(({ p, label, Icon }) => (
              <Button key={p} fullWidth onClick={() => handleOAuth(p)} disabled={busy}
                startIcon={
                  providerLoading===p
                    ? <CircularProgress size={13} sx={{ color:"rgba(255,255,255,0.4)" }}/>
                    : <Icon/>
                }
                sx={{
                  py:1.2, borderRadius:2.5, fontWeight:600, fontSize:13, textTransform:"none",
                  color: lampOn ? "#fef3c7" : "#dde0f0",
                  background:"rgba(255,255,255,0.04)",
                  border: lampOn ? "1px solid rgba(251,191,36,0.18)" : "1px solid rgba(255,255,255,0.08)",
                  "&:hover":{ background: lampOn ? "rgba(251,191,36,0.09)" : "rgba(255,255,255,0.08)",
                    borderColor: lampOn ? "rgba(251,191,36,0.38)" : "rgba(255,255,255,0.18)" },
                  "&:disabled":{ color:"rgba(255,255,255,0.2)" },
                  transition:"all 0.3s",
                }}>
                {label}
              </Button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }}/>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.2)" }}>or</span>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }}/>
          </div>

          {/* Fields */}
          <LampField label="Admin Email" placeholder="admin@example.com"
            value={email} lampOn={lampOn}
            onChange={e => { setEmail(e.target.value); setError(""); }}
            onFocus={turnOn} onBlur={turnOff}
          />
          <LampField label="Password" type={showPass?"text":"password"}
            placeholder="••••••••" value={password} lampOn={lampOn}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onFocus={turnOn} onBlur={turnOff}
            onKeyDown={e => e.key==="Enter" && !busy && handleEmail()}
            InputProps={{
              endAdornment:(
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPass(p=>!p)}
                    sx={{ color:"rgba(255,255,255,0.2)",
                      "&:hover":{ color: lampOn ? "#fbbf24" : "rgba(255,255,255,0.5)" } }}>
                    {showPass ? <VisibilityOff fontSize="small"/> : <Visibility fontSize="small"/>}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb:2 }}
          />

          {/* Submit */}
          <Button fullWidth onClick={handleEmail} disabled={busy} sx={{
            py:1.45, borderRadius:2.5, fontWeight:800, fontSize:14,
            textTransform:"none", letterSpacing:"0.02em",
            background: lampOn
              ? "linear-gradient(135deg,#f59e0b,#d97706)"
              : "linear-gradient(135deg,#6366f1,#4f46e5)",
            color: lampOn ? "#1c1200" : "#fff",
            boxShadow: lampOn
              ? "0 6px 24px rgba(245,158,11,0.42),inset 0 1px 0 rgba(255,255,255,0.18)"
              : "0 6px 24px rgba(99,102,241,0.38)",
            "&:hover":{
              background: lampOn
                ? "linear-gradient(135deg,#fbbf24,#f59e0b)"
                : "linear-gradient(135deg,#818cf8,#6366f1)",
              transform:"translateY(-2px)",
              boxShadow: lampOn
                ? "0 10px 32px rgba(245,158,11,0.52)"
                : "0 10px 32px rgba(99,102,241,0.48)",
            },
            "&:disabled":{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.22)" },
            transition:"all 0.3s",
          }}>
            {loading
              ? <CircularProgress size={18} sx={{ color: lampOn ? "#1c1200" : "#fff" }}/>
              : "Sign In as Admin"}
          </Button>

          <p style={{
            textAlign:"center", fontSize:10,
            color:"rgba(255,255,255,0.14)", marginTop:20, lineHeight:1.9,
          }}>
            🔒 Restricted to authorised admin only<br/>
            IntelliCrash · HP Road Safety · iRAD 2025-26
          </p>
        </div>
      </div>
    </div>
  );
}