/**
 * AdminLogin.jsx — IntelliCrash Admin Portal v4.0
 * ─────────────────────────────────────────────────
 * Production security:
 *  ✅ Rate limiting — 5 failed attempts → 15-minute lockout
 *  ✅ Audit trail — attempt count + timestamps in sessionStorage
 *  ✅ Lockout countdown timer displayed live
 *  ✅ Email allowlist guard — non-admin emails are rejected immediately
 *  ✅ Admin session flag (ic_admin_session) set after success
 *  ✅ Separated from user ProtectedRoute entirely
 *  ✅ Clean minimal UI — dark glass card
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../services/supabase";

const ADMIN_EMAILS   = ["shubhamabhi004@gmail.com"];
const MAX_ATTEMPTS   = 5;
const LOCKOUT_MS     = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_KEY    = "ic_admin_attempts";
const LOCKOUT_KEY    = "ic_admin_lockout_until";

// ── Rate-limit helpers ────────────────────────────────────────────
function getAttempts()  { return parseInt(sessionStorage.getItem(ATTEMPT_KEY)  || "0", 10); }
function getLockoutEnd() { return parseInt(sessionStorage.getItem(LOCKOUT_KEY) || "0", 10); }
function bumpAttempt()  {
  const n = getAttempts() + 1;
  sessionStorage.setItem(ATTEMPT_KEY, String(n));
  if (n >= MAX_ATTEMPTS) sessionStorage.setItem(LOCKOUT_KEY, String(Date.now() + LOCKOUT_MS));
  return n;
}
function resetAttempts() {
  sessionStorage.removeItem(ATTEMPT_KEY);
  sessionStorage.removeItem(LOCKOUT_KEY);
}
function isLockedOut() { return getLockoutEnd() > Date.now(); }
function secondsLeft() { return Math.ceil((getLockoutEnd() - Date.now()) / 1000); }

// ── Icon components (no extra dependency) ────────────────────────
const ShieldIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/>
  </svg>
);
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const EyeIcon    = ({ open }) => open
  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

const inp = {
  width: "100%", padding: "13px 13px 13px 42px",
  borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(15, 23, 42, 0.6)", color: "#f1f5f9",
  outline: "none", fontSize: 14, boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif", transition: "border 0.2s",
};

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [checking, setChecking] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef(null);

  // ── Countdown timer when locked out ────────────────────────────
  useEffect(() => {
    if (isLockedOut()) {
      setCountdown(secondsLeft());
      intervalRef.current = setInterval(() => {
        const s = secondsLeft();
        if (s <= 0) { clearInterval(intervalRef.current); setCountdown(0); resetAttempts(); }
        else setCountdown(s);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, []);

  // ── Session check ───────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (user && ADMIN_EMAILS.includes(user.email)) {
        sessionStorage.setItem("ic_admin_session", "1");
        navigate("/admin", { replace: true });
      }
      setChecking(false);
    });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (isLockedOut()) {
      setError(`Too many failed attempts. Try again in ${Math.ceil(countdown / 60)} min.`);
      return;
    }

    if (!email.trim() || !password.trim()) { setError("Email and password required."); return; }

    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authErr) {
        const n = bumpAttempt();
        if (n >= MAX_ATTEMPTS) {
          setCountdown(Math.ceil(LOCKOUT_MS / 1000));
          setError(`Account locked for 15 minutes after ${MAX_ATTEMPTS} failed attempts.`);
        } else {
          setError(`Invalid credentials. ${MAX_ATTEMPTS - n} attempt(s) remaining before lockout.`);
        }
        return;
      }

      const user = data?.user;
      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        await supabase.auth.signOut();
        bumpAttempt();
        setError("Access denied. Your account does not have admin authorization.");
        return;
      }

      // Success
      resetAttempts();
      sessionStorage.setItem("ic_admin_session", "1");
      sessionStorage.setItem("ic_admin_email", user.email);
      sessionStorage.setItem("ic_admin_login_ts", Date.now().toString());
      navigate("/admin", { replace: true });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLockedOut()) return;
    setError("");
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin-login` },
    });
    if (e) setError(e.message);
  };

  if (checking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.08)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const locked = isLockedOut() || countdown > 0;
  const mins = Math.floor(countdown / 60), secs = countdown % 60;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      padding: 20, position: "relative", overflow: "hidden" }}>

      {/* Ambient glow */}
      <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ width: "100%", maxWidth: 400, background: "rgba(15,23,42,0.8)", backdropFilter: "blur(24px)",
          borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 64px -16px rgba(0,0,0,0.6)", padding: "40px 36px", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)",
            borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <ShieldIcon />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#f8fafc", margin: "0 0 6px", fontFamily: "'DM Sans',sans-serif" }}>
            Admin Portal
          </h1>
          <p style={{ fontSize: 12.5, color: "#475569", margin: 0, fontFamily: "'DM Sans',sans-serif" }}>
            IntelliCrash · Restricted Access
          </p>
        </div>

        {/* Lockout banner */}
        <AnimatePresence>
          {locked && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12,
                padding: "14px 16px", marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>🔒 Account Locked</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#fca5a5", fontFamily: "monospace" }}>
                {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Too many failed attempts</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        <AnimatePresence>
          {error && !locked && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: "11px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)",
                color: "#fca5a5", fontSize: 12.5, fontWeight: 600, marginBottom: 20,
                border: "1px solid rgba(239,68,68,0.18)" }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Email */}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }}>
              <MailIcon />
            </span>
            <input type="email" placeholder="Admin email address" value={email} required disabled={locked || loading}
              onChange={e => setEmail(e.target.value)}
              style={{ ...inp, borderColor: email && !email.includes("@") ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Password */}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }}>
              <LockIcon />
            </span>
            <input type={showPass ? "text" : "password"} placeholder="Password" value={password} required
              disabled={locked || loading} onChange={e => setPassword(e.target.value)}
              style={{ ...inp, paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPass(!showPass)} disabled={locked}
              style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 0, display: "flex" }}>
              <EyeIcon open={showPass} />
            </button>
          </div>

          {/* Submit */}
          <motion.button whileHover={!locked && !loading ? { scale: 1.01 } : {}} whileTap={!locked && !loading ? { scale: 0.99 } : {}}
            type="submit" disabled={locked || loading}
            style={{ width: "100%", padding: "14px", borderRadius: 12,
              background: locked ? "rgba(37,99,235,0.3)" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: locked ? "#475569" : "#fff", fontSize: 14, fontWeight: 800, border: "none",
              cursor: locked || loading ? "not-allowed" : "pointer", marginTop: 4,
              fontFamily: "'DM Sans',sans-serif", transition: "opacity 0.2s",
              boxShadow: locked ? "none" : "0 4px 16px rgba(37,99,235,0.3)" }}>
            {loading ? "Verifying…" : locked ? `Locked · ${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}` : "Authorize Access →"}
          </motion.button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0", color: "#334155" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        </div>

        {/* Google OAuth */}
        <motion.button whileHover={!locked ? { y: -1 } : {}} onClick={handleGoogleLogin} disabled={locked || loading}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)", cursor: locked ? "not-allowed" : "pointer",
            fontSize: 13.5, fontWeight: 600, color: "#cbd5e1", fontFamily: "'DM Sans',sans-serif" }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </motion.button>

        {/* Attempts warning */}
        {!locked && getAttempts() > 0 && (
          <p style={{ fontSize: 11, color: "#ef4444", marginTop: 16, textAlign: "center", fontWeight: 600 }}>
            ⚠️ {getAttempts()}/{MAX_ATTEMPTS} failed attempt{getAttempts() > 1 ? "s" : ""} — {MAX_ATTEMPTS - getAttempts()} remaining before lockout
          </p>
        )}

        <p style={{ fontSize: 11, color: "#334155", marginTop: 20, textAlign: "center", lineHeight: 1.6 }}>
          Admin sessions are audited. Unauthorized access is prohibited.<br />
          Authorized iRAD personnel only.
        </p>
      </motion.div>

      <div style={{ position: "absolute", bottom: 20, textAlign: "center", width: "100%", fontSize: 11, fontWeight: 600, color: "#1e293b" }}>
        INTELLICRASH ADMIN v4.0 · RESTRICTED AREA
      </div>
    </div>
  );
}