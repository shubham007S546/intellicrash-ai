import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../services/supabase";
import { Shield, Mail, Lock, ArrowRight, Chrome, Github, Eye, EyeOff } from "lucide-react";

const ADMIN_EMAILS = ["shubhamabhi004@gmail.com"];

const GoogleIcon = () => <Chrome size={18} />;
const GitHubIcon = () => <Github size={18} />;

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [showPass,        setShowPass]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [providerLoading, setProviderLoading] = useState("");
  const [error,           setError]           = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        if (ADMIN_EMAILS.includes(data.session.user.email)) navigate("/admin", { replace: true });
      }
      setCheckingSession(false);
    });
  }, [navigate]);

  const handleOAuth = async (provider) => {
    setProviderLoading(provider);
    setError("");
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/admin-login` },
    });
    if (e) setError(e.message);
  };

  const handleEmail = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password.trim()) { setError("All fields required."); return; }
    setLoading(true); setError("");
    try {
      const { data, error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (e) setError(e.message);
      else if (data.user && !ADMIN_EMAILS.includes(data.user.email)) {
        await supabase.auth.signOut();
        setError("Access denied. Admin authorization required.");
      } else if (data.user) {
        navigate("/admin", { replace: true });
      }
    } catch (err) {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#3b82f6", borderRadius: "50%" }} />
    </div>
  );

  const busy = loading || !!providerLoading;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background Ambience */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "100vw", height: "100vh", background: "radial-gradient(circle at center, rgba(37, 99, 235, 0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          width: "100%", maxWidth: 420,
          background: "rgba(30, 41, 59, 0.7)",
          backdropFilter: "blur(20px)",
          borderRadius: 28,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          padding: 40,
          zIndex: 1,
          textAlign: "center"
        }}
      >
        <motion.div
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          style={{ width: 64, height: 64, background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}
        >
          <Shield size={32} color="#3b82f6" />
        </motion.div>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f8fafc", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Admin Access</h1>
        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 32, fontWeight: 500 }}>Secure authorization required to access system controls</p>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: "12px", borderRadius: 12, background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", fontSize: 13, fontWeight: 600, marginBottom: 24, border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <Mail style={{ position: "absolute", left: 14, top: 14, color: "#475569" }} size={18} />
            <input
              type="email"
              required
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "14px 14px 14px 44px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15, 23, 42, 0.5)", color: "#f1f5f9", outline: "none", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ position: "relative" }}>
            <Lock style={{ position: "absolute", left: 14, top: 14, color: "#475569" }} size={18} />
            <input
              type={showPass ? "text" : "password"}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "14px 14px 14px 44px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15, 23, 42, 0.5)", color: "#f1f5f9", outline: "none", fontSize: 14, boxSizing: "border-box" }}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={{ position: "absolute", right: 14, top: 14, background: "none", border: "none", color: "#475569", cursor: "pointer" }}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, background: "#3b82f6" }}
            whileTap={{ scale: 0.98 }}
            disabled={busy}
            style={{ width: "100%", padding: "16px", borderRadius: 14, background: "#2563eb", color: "#fff", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}
          >
            {loading ? "Authenticating..." : "Authorize Access"} <ArrowRight size={18} />
          </motion.button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 0", color: "#334155" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
          <span style={{ fontSize: 11, fontWeight: 700 }}>Social Identity</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <motion.button
            whileHover={{ y: -2, background: "rgba(255,255,255,0.05)" }}
            onClick={() => handleOAuth("google")}
            disabled={busy}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}
          >
            <GoogleIcon /> Google
          </motion.button>
          <motion.button
            whileHover={{ y: -2, background: "rgba(255,255,255,0.05)" }}
            onClick={() => handleOAuth("github")}
            disabled={busy}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}
          >
            <GitHubIcon /> GitHub
          </motion.button>
        </div>

        <p style={{ fontSize: 11, color: "#475569", marginTop: 32, lineHeight: 1.6 }}>
          Admin sessions are monitored. Access granted to<br />authorized iRAD personnel only.
        </p>
      </motion.div>

      <div style={{ position: "absolute", bottom: 20, textAlign: "center", width: "100%", color: "#334155", fontSize: 11, fontWeight: 600 }}>
        INTELLICRASH CORE v3.1 · RESTRICTED AREA
      </div>
    </div>
  );
}