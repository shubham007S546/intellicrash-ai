import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../services/supabase";
import { Shield, Mail, Lock, User, ArrowRight, Chrome, Github } from "lucide-react";
import { CircularProgress } from "@mui/material";

/* ── OAuth Icons ─────────────────────────────────────────────────────────── */
const GoogleIcon = () => <Chrome size={18} />;
const GitHubIcon = () => <Github size={18} />;

export default function UserLogin() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const redirectTo = location.state?.from || "/navigation";
  const mounted    = useRef(true);

  const params = new URLSearchParams(location.search);
  const [tab,             setTab]             = useState(params.get("mode") === "signup" ? 1 : 0);
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [name,            setName]            = useState("");
  const [loading,         setLoading]         = useState(false);
  const [providerLoading, setProviderLoading] = useState(""); // "google" | "github" | ""
  const [error,           setError]           = useState("");
  const [info,            setInfo]            = useState("");

  useEffect(() => {
    mounted.current = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted.current && data?.session?.user) {
        navigate(redirectTo, { replace: true });
      }
    };
    check();
    return () => { mounted.current = false; };
  }, [navigate, redirectTo]);

  const handleOAuth = async (provider) => {
    setProviderLoading(provider);
    setError("");
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/login` },
      });
      if (err) setError(err.message);
    } catch (e) {
      setError("OAuth failed — check your connection.");
    }
  };

  const handleSignIn = async (e) => {
    e?.preventDefault();
    setError(""); setInfo("");
    if (!email.trim() || !password.trim()) { setError("All fields required."); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (mounted.current && err) setError(err.message);
      else if (data?.user) navigate(redirectTo, { replace: true });
    } catch (e) {
      setError("Network error.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e?.preventDefault();
    setError(""); setInfo("");
    if (!email.trim() || !password.trim()) { setError("All fields required."); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim() || email.split("@")[0] } },
      });
      if (mounted.current && err) setError(err.message);
      else if (data?.user && !data.session) {
        setInfo("✅ Verify your email to continue.");
        setTab(0);
      } else if (data?.session) {
        navigate(redirectTo, { replace: true });
      }
    } catch (e) {
      setError("Network error.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const handleGuest = () => {
    localStorage.setItem("ic_guest", "true");
    navigate(redirectTo, { replace: true });
  };

  const busy = loading || !!providerLoading;

  return (
    <div style={{
      minHeight: "calc(100vh - 58px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(circle at top left, #fff1f2 0%, #f8fafc 40%, #f0f9ff 100%)",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Dynamic Background Elements */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity }}
        style={{ position: "absolute", top: "-10%", left: "-10%", width: "40vw", height: "40vw", background: "rgba(234, 88, 12, 0.05)", borderRadius: "50%", filter: "blur(80px)" }} 
      />
      <motion.div 
        animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
        transition={{ duration: 25, repeat: Infinity }}
        style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "40vw", height: "40vw", background: "rgba(37, 99, 235, 0.05)", borderRadius: "50%", filter: "blur(80px)" }} 
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          width: "100%", maxWidth: 440,
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(20px)",
          borderRadius: 32,
          boxShadow: "0 20px 50px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(255,255,255,0.5)",
          overflow: "hidden",
          zIndex: 1
        }}
      >
        {/* Header Section */}
        <div style={{ padding: "40px 40px 20px", textAlign: "center" }}>
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.05, rotate: 2 }}
            style={{ width: 72, height: 72, background: "linear-gradient(135deg, #ea580c, #dc2626)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 12px 30px rgba(234, 88, 12, 0.4)", position: "relative" }}
          >
            <Shield color="#fff" size={36} />
            <motion.div 
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ position: "absolute", inset: -4, border: "2px solid #ea580c", borderRadius: 24, opacity: 0.5 }}
            />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-1.5px", fontFamily: "'Syne', sans-serif" }}
          >
            {tab === 0 ? "Welcome Back" : "Create Account"}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ fontSize: 14, color: "#64748b", marginTop: 10, fontWeight: 500, lineHeight: 1.5 }}
          >
            {tab === 0 ? "Access your personalized safety dashboard and rewards." : "Join the world's first AI-driven mountain road safety network."}
          </motion.p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: 0, background: "#f8fafc", margin: "0 40px", borderRadius: 16, padding: 4 }}>
          <button 
            onClick={() => { setTab(0); setError(""); setInfo(""); }}
            style={{ flex: 1, padding: "10px 0", background: tab === 0 ? "#fff" : "transparent", border: "none", borderRadius: 12, color: tab === 0 ? "#ea580c" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "0.3s", boxShadow: tab === 0 ? "0 4px 12px rgba(0,0,0,0.05)" : "none" }}
          >
            Sign In
          </button>
          <button 
            onClick={() => { setTab(1); setError(""); setInfo(""); }}
            style={{ flex: 1, padding: "10px 0", background: tab === 1 ? "#fff" : "transparent", border: "none", borderRadius: 12, color: tab === 1 ? "#ea580c" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "0.3s", boxShadow: tab === 1 ? "0 4px 12px rgba(0,0,0,0.05)" : "none" }}
          >
            Sign Up
          </button>
        </div>

        <div style={{ padding: 40 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "anticipate" }}
            >
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ padding: "14px 18px", borderRadius: 16, background: "#fff1f2", color: "#e11d48", fontSize: 13, fontWeight: 700, marginBottom: 24, border: "1px solid rgba(225, 29, 72, 0.1)", display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span style={{ fontSize: 16 }}>⚠️</span> {error}
                </motion.div>
              )}
              {info && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ padding: "14px 18px", borderRadius: 16, background: "#f0fdf4", color: "#166534", fontSize: 13, fontWeight: 700, marginBottom: 24, border: "1px solid rgba(22, 101, 52, 0.1)", display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span style={{ fontSize: 16 }}>✅</span> {info}
                </motion.div>
              )}

              <form onSubmit={tab === 0 ? handleSignIn : handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {tab === 1 && (
                  <div style={{ position: "relative" }}>
                    <User style={{ position: "absolute", left: 16, top: 16, color: "#94a3b8" }} size={20} />
                    <input 
                      style={{ width: "100%", padding: "16px 16px 16px 48px", borderRadius: 18, border: "2px solid #f1f5f9", outline: "none", fontSize: 14, fontWeight: 600, background: "#f8fafc", boxSizing: "border-box", transition: "all 0.2s" }} 
                      placeholder="Full Name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      onFocus={(e) => e.target.style.borderColor = "#ea580c"}
                      onBlur={(e) => e.target.style.borderColor = "#f1f5f9"}
                    />
                  </div>
                )}
                
                <div style={{ position: "relative" }}>
                  <Mail style={{ position: "absolute", left: 16, top: 16, color: "#94a3b8" }} size={20} />
                  <input 
                    type="email" required 
                    style={{ width: "100%", padding: "16px 16px 16px 48px", borderRadius: 18, border: "2px solid #f1f5f9", outline: "none", fontSize: 14, fontWeight: 600, background: "#f8fafc", boxSizing: "border-box", transition: "all 0.2s" }} 
                    placeholder="Email Address" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    onFocus={(e) => e.target.style.borderColor = "#ea580c"}
                    onBlur={(e) => e.target.style.borderColor = "#f1f5f9"}
                  />
                </div>

                <div style={{ position: "relative" }}>
                  <Lock style={{ position: "absolute", left: 16, top: 16, color: "#94a3b8" }} size={20} />
                  <input 
                    type="password" required 
                    style={{ width: "100%", padding: "16px 16px 16px 48px", borderRadius: 18, border: "2px solid #f1f5f9", outline: "none", fontSize: 14, fontWeight: 600, background: "#f8fafc", boxSizing: "border-box", transition: "all 0.2s" }} 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    onFocus={(e) => e.target.style.borderColor = "#ea580c"}
                    onBlur={(e) => e.target.style.borderColor = "#f1f5f9"}
                  />
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={busy}
                  type="submit"
                  style={{ width: "100%", padding: "18px", borderRadius: 18, background: "linear-gradient(135deg, #ea580c, #dc2626)", color: "#fff", border: "none", fontSize: 15, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", boxShadow: "0 10px 25px rgba(234, 88, 12, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "0.3s" }}
                >
                  {loading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : (
                    <>
                      {tab === 0 ? "Sign In to Dashboard" : "Create My Account"}
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </form>
              <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
                <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Social Access</span>
                <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <motion.button
                  whileHover={{ y: -2, background: "#f8fafc" }}
                  onClick={() => handleOAuth("google")}
                  disabled={busy}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#334155" }}
                >
                  <GoogleIcon /> Google
                </motion.button>
                <motion.button
                  whileHover={{ y: -2, background: "#f8fafc" }}
                  onClick={() => handleOAuth("github")}
                  disabled={busy}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#334155" }}
                >
                  <GitHubIcon /> GitHub
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={handleGuest}
            style={{ width: "100%", background: "none", border: "none", color: "#64748b", fontSize: 13, fontWeight: 600, marginTop: 24, cursor: "pointer", textDecoration: "underline" }}
          >
            Continue as Guest (Limited Access)
          </button>
        </div>
      </motion.div>

      {/* Footer Info */}
      <div style={{ position: "absolute", bottom: 20, textAlign: "center", width: "100%", color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>
        © 2026 IntelliCrash AI · Trusted by HP Road Safety Dept.
      </div>
    </div>
  );
}