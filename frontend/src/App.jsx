/**
 * App.jsx — IntelliCrash v5.1 FIXED
 *
 * FIXES vs v5.0:
 * ✅ ProtectedRoute — 5s timeout so it never hangs if Supabase is slow/down
 * ✅ ProtectedRoute — try/catch on supabase import + getSession call
 * ✅ ProtectedRoute — guest bypass via localStorage ic_guest=true
 * ✅ /login route — no longer wrapped in ProtectedRoute (was causing blank page)
 */
import React from "react";
import { Box, Typography } from "@mui/material";
import {
  BrowserRouter, Routes, Route, Navigate,
  useNavigate, useLocation,
} from "react-router-dom";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "./hooks/useTheme";

import Navbar            from "./components/Navbar.jsx";
import ChatBotButton     from "./components/ChatBotButton.jsx";
import FloatingSOS        from "./components/FloatingSOS.jsx";

import Home              from "./pages/Home.jsx";
import Navigation        from "./pages/Navigation.jsx";
import Rewards           from "./pages/Rewards.jsx";
import Bulletin          from "./pages/Bulletin.jsx";
import SOS               from "./pages/SOS.jsx";
import About             from "./pages/About.jsx";
import AccidentDetail    from "./pages/AccidentDetail.jsx";
import FamilyTrack       from "./pages/FamilyTrack.jsx";
import UserLogin         from "./pages/UserLogin.jsx";
import Admin             from "./pages/Admin.jsx";
import AdminLogin        from "./pages/AdminLogin.jsx";
import AdminRiskAnalysis from "./pages/AdminRiskAnalysis.jsx";
import Dashboard         from "./pages/Dashboard.jsx";
import XAI               from "./pages/XAI.jsx";
import ChatBot           from "./pages/ChatBot.jsx";

/* MUI theme generator function */
const getMuiTheme = (mode) => createTheme({
  palette: {
    mode,
    primary:    { main: "#ff4d00", dark: "#ea4300", light: "#ff8c42" },
    secondary:  { main: "#0097a7" },
    error:      { main: "#ef4444" },
    warning:    { main: "#f59e0b" },
    success:    { main: "#22c55e" },
    background: { 
      default: mode === "light" ? "#fafafa" : "#0a0a0f", 
      paper: mode === "light" ? "#ffffff" : "#1a1a1e" 
    },
    text:       { 
      primary: mode === "light" ? "#0a0a0f" : "#f5f5f5", 
      secondary: mode === "light" ? "#6b6b7e" : "#9898a8" 
    },
    divider:    mode === "light" ? "#e8e8f0" : "rgba(255,255,255,0.1)",
  },
  typography: {
    fontFamily: "'Inter', 'DM Sans', sans-serif",
    h1: { fontFamily: "'Outfit', sans-serif", fontWeight: 900 },
    h2: { fontFamily: "'Outfit', sans-serif", fontWeight: 800 },
    h3: { fontFamily: "'Outfit', sans-serif", fontWeight: 800 },
    h4: { fontFamily: "'Outfit', sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Outfit', sans-serif", fontWeight: 700 },
    h6: { fontFamily: "'Outfit', sans-serif", fontWeight: 700 },
  },
  shape: { borderRadius: 16 },

  components: {
    MuiPaper:  { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: { styleOverrides: { root: { textTransform: "none", fontWeight: 700 } } },
  },
});

/* ── Error Boundary ──────────────────────────────────────────────────────── */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(err, info) { console.error("App error:", err, info); }
  render() {
    if (this.state.error)
      return (
        <Box sx={{ p: 4, textAlign: "center", background: "var(--bg-primary)", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="h5" sx={{ color: "#ef4444", mb: 2, fontFamily: "'Clash Display',sans-serif" }}>
            Something went wrong
          </Typography>
          <Typography sx={{ color: "#6b6b7e", mb: 3, maxWidth: 420 }}>
            {this.state.error.message}
          </Typography>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ padding: "12px 28px", borderRadius: 36, background: "linear-gradient(135deg,#ff4d00,#ff8c42)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "'Satoshi',sans-serif", boxShadow: "0 4px 14px rgba(255,77,0,.3)" }}
          >
            Try Again
          </button>
        </Box>
      );
    return this.props.children;
  }
}

/* ── Offline Banner ──────────────────────────────────────────────────────── */
function OfflineBanner() {
  const [offline, setOffline] = React.useState(!navigator.onLine);
  React.useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online",  on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (!offline) return null;
  return (
    <Box sx={{ background: "#fef2f2", borderBottom: "1px solid #fecaca", p: 0.8, textAlign: "center" }}>
      <Typography sx={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
        📵 You are offline — map features may be limited
      </Typography>
    </Box>
  );
}

/* ── Protected Route — FIXED ─────────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const [authState, setAuthState] = useState("loading"); // "loading" | "authed" | "unauthed"
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    let mounted = true;

    // ── Guest bypass ────────────────────────────────────────────
    if (localStorage.getItem("ic_guest") === "true") {
      setAuthState("authed");
      return;
    }

    // ── Hard 5-second timeout — never hang forever ──────────────
    const timeoutId = setTimeout(() => {
      if (mounted && authState === "loading") {
        console.warn("[ProtectedRoute] Supabase auth check timed out — redirecting to /login");
        setAuthState("unauthed");
        navigate("/login", { replace: true, state: { from: location.pathname } });
      }
    }, 5000);

    const checkAuth = async () => {
      try {
        // Dynamic import so a Supabase crash doesn't break the whole app
        const { supabase } = await import("./services/supabase");
        const { data, error } = await supabase.auth.getSession();

        clearTimeout(timeoutId);
        if (!mounted) return;

        if (error) {
          console.warn("[ProtectedRoute] getSession error:", error.message);
          setAuthState("unauthed");
          navigate("/login", { replace: true, state: { from: location.pathname } });
          return;
        }

        if (data?.session?.user) {
          setAuthState("authed");
        } else {
          setAuthState("unauthed");
          navigate("/login", { replace: true, state: { from: location.pathname } });
        }
      } catch (e) {
        clearTimeout(timeoutId);
        console.warn("[ProtectedRoute] Auth check failed:", e.message);
        if (!mounted) return;
        setAuthState("unauthed");
        navigate("/login", { replace: true, state: { from: location.pathname } });
      }
    };

    checkAuth();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.pathname]);

  // ── Loading spinner ─────────────────────────────────────────────
  if (authState === "loading") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 2 }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "linear-gradient(135deg,#ff4d00,#ff8c42)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}
        >
          🛡️
        </div>
        <Typography sx={{ color: "#6b6b7e", fontSize: 14 }}>Verifying access…</Typography>
      </Box>
    );
  }

  if (authState === "unauthed") return null;
  return children;
}

import GuestLoginPrompt from "./components/GuestLoginPrompt.jsx";

/* ── App ─────────────────────────────────────────────────────────────────── */
export default function App() {
  const { theme: currentTheme } = useTheme();
  const muiTheme = useMemo(() => getMuiTheme(currentTheme), [currentTheme]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <BrowserRouter>
        <OfflineBanner />
        <Navbar />
        <ErrorBoundary>
          <Box sx={{ minHeight: "100vh", background: "var(--bg-primary)", transition: "background 0.3s ease" }}>
            <Routes>
              {/* Public routes */}
              <Route path="/"             element={<Home />} />
              <Route path="/home"         element={<Home />} />
              <Route path="/login"        element={<UserLogin />} />
              <Route path="/rewards"      element={<Rewards />} />
              <Route path="/bulletin"     element={<Bulletin />} />
              <Route path="/sos"          element={<SOS />} />
              <Route path="/about"        element={<About />} />
              <Route path="/chatbot"      element={<ChatBot />} />
              <Route path="/accident/:id" element={<AccidentDetail />} />
              <Route path="/track/:shareId" element={<FamilyTrack />} />
              <Route path="/admin"               element={<Admin />} />
              <Route path="/admin-login"         element={<AdminLogin />} />
              <Route path="/admin/risk-analysis" element={<AdminRiskAnalysis />} />
              <Route path="/xai"          element={<XAI />} />

              {/* Protected routes — require login */}
              <Route
                path="/navigation"
                element={
                  <ProtectedRoute>
                    <Navigation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Redirects */}
              <Route path="/trips"   element={<Navigate to="/rewards"           replace />} />
              <Route path="/predict" element={<Navigate to="/admin/risk-analysis" replace />} />
              <Route path="*"        element={<Navigate to="/"                  replace />} />
            </Routes>
          </Box>
        </ErrorBoundary>
        <ChatBotButton />
        <FloatingSOS />
        <GuestLoginPrompt />
      </BrowserRouter>
    </ThemeProvider>
  );
}