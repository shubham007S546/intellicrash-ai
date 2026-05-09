/**
 * App.jsx — IntelliCrash v10.0
 * ✅ Performance Optimized: React.lazy + Suspense for all secondary pages
 * ✅ Premium Security: Authenticated routes for Rewards and Navigation
 * ✅ Robust Account Isolation: Per-user gamification and reward state
 */
import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import {
  BrowserRouter, Routes, Route, Navigate,
  useNavigate, useLocation,
} from "react-router-dom";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { useTheme } from "./hooks/useTheme";
import { supabase } from "./services/supabase";

import Navbar            from "./components/Navbar.jsx";
import ChatBotButton     from "./components/ChatBotButton.jsx";
import FloatingSOS       from "./components/FloatingSOS.jsx";
import GuestLoginPrompt  from "./components/GuestLoginPrompt.jsx";

// Home is loaded eagerly for speed
import Home              from "./pages/Home.jsx";

// Lazy load heavy components for faster initial frame
const Navigation        = React.lazy(() => import("./pages/Navigation.jsx"));
const Rewards           = React.lazy(() => import("./pages/Rewards.jsx"));
const Bulletin          = React.lazy(() => import("./pages/Bulletin.jsx"));
const SOS               = React.lazy(() => import("./pages/SOS.jsx"));
const About             = React.lazy(() => import("./pages/About.jsx"));
const AccidentDetail    = React.lazy(() => import("./pages/AccidentDetail.jsx"));
const FamilyTrack       = React.lazy(() => import("./pages/FamilyTrack.jsx"));
const UserLogin         = React.lazy(() => import("./pages/UserLogin.jsx"));
const Admin             = React.lazy(() => import("./pages/Admin.jsx"));
const AdminLogin        = React.lazy(() => import("./pages/AdminLogin.jsx"));
const AdminRiskAnalysis = React.lazy(() => import("./pages/AdminRiskAnalysis.jsx"));
const Dashboard         = React.lazy(() => import("./pages/Dashboard.jsx"));
const XAI               = React.lazy(() => import("./pages/XAI.jsx"));
const ChatBot           = React.lazy(() => import("./pages/ChatBot.jsx"));

/* ── MUI Theme ───────────────────────────────────────────────────────────── */
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
      paper:   mode === "light" ? "#ffffff" : "#1a1a1e",
    },
    text: {
      primary:   mode === "light" ? "#0a0a0f" : "#f5f5f5",
      secondary: mode === "light" ? "#6b6b7e" : "#9898a8",
    },
    divider: mode === "light" ? "#e8e8f0" : "rgba(255,255,255,0.1)",
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
        <Box sx={{ p:4, textAlign:"center", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <Typography variant="h5" sx={{ color:"#ef4444", mb:2 }}>Something went wrong</Typography>
          <Typography sx={{ color:"#6b6b7e", mb:3, maxWidth:420 }}>{this.state.error.message}</Typography>
          <button onClick={() => this.setState({ error: null })}
            style={{ padding:"12px 28px", borderRadius:36, background:"linear-gradient(135deg,#ff4d00,#ff8c42)", color:"#fff", border:"none", cursor:"pointer", fontWeight:700 }}>
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
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (!offline) return null;
  return (
    <Box sx={{ background:"#fef2f2", borderBottom:"1px solid #fecaca", p:0.8, textAlign:"center" }}>
      <Typography sx={{ fontSize:12, color:"#dc2626", fontWeight:600 }}>📵 You are offline — map features may be limited</Typography>
    </Box>
  );
}

/* ── Protected Route — for regular users ────────────────────────────────── */
function ProtectedRoute({ children }) {
  const [authState, setAuthState] = useState("loading");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    if (localStorage.getItem("ic_guest") === "true") { setAuthState("authed"); return; }
    const timeoutId = setTimeout(() => {
      if (mounted && authState === "loading") {
        setAuthState("unauthed");
        navigate("/login", { replace: true, state: { from: location.pathname } });
      }
    }, 2000);
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        clearTimeout(timeoutId);
        if (!mounted) return;
        if (error || !data?.session?.user) {
          setAuthState("unauthed");
          navigate("/login", { replace: true, state: { from: location.pathname } });
        } else {
          setAuthState("authed");
        }
      } catch (e) {
        clearTimeout(timeoutId);
        if (!mounted) return;
        setAuthState("unauthed");
        navigate("/login", { replace: true, state: { from: location.pathname } });
      }
    };
    checkAuth();
    return () => { mounted = false; clearTimeout(timeoutId); };
  }, [navigate, location.pathname]);

  if (authState === "loading") return (
    <Box sx={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", flexDirection:"column", gap:2 }}>
      <div style={{ width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,#ff4d00,#ff8c42)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🛡️</div>
      <Typography sx={{ color:"#6b6b7e", fontSize:14 }}>Verifying access…</Typography>
    </Box>
  );
  if (authState === "unauthed") return null;
  return children;
}

/* ── Admin Route — Requires ic_admin_session flag ────────────────────────── */
const ADMIN_EMAILS = ["shubhamabhi004@gmail.com"];

function AdminRoute({ children }) {
  const [state, setState] = useState("loading");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted && state === "loading") {
        setState("denied");
        navigate("/admin-login", { replace: true, state: { from: location.pathname } });
      }
    }, 2000);
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        clearTimeout(timeout);
        if (!mounted) return;
        const user = data?.session?.user;
        const hasFlag = sessionStorage.getItem("ic_admin_session") === "1";
        if (user && ADMIN_EMAILS.includes(user.email) && hasFlag) {
          setState("ok");
        } else {
          setState("denied");
          navigate("/admin-login", { replace: true, state: { from: location.pathname } });
        }
      } catch {
        clearTimeout(timeout);
        if (!mounted) return;
        setState("denied");
        navigate("/admin-login", { replace: true });
      }
    };
    check();
    return () => { mounted = false; clearTimeout(timeout); };
  }, [navigate, location.pathname]);

  if (state === "loading") return (
    <Box sx={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", flexDirection:"column", gap:2 }}>
      <div style={{ width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,#1d4ed8,#2563eb)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🛡️</div>
      <Typography sx={{ color:"#6b6b7e", fontSize:14 }}>Verifying admin access…</Typography>
    </Box>
  );
  if (state === "denied") return null;
  return children;
}

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
          <Box sx={{ minHeight:"calc(100vh - 70px)", display:"flex", flexDirection:"column", background:"var(--bg-primary)", transition:"background 0.3s ease" }}>
            <React.Suspense fallback={
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", flexDirection: "column", gap: 2 }}>
                <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#64748b" }}>Loading Intelligence...</Typography>
              </Box>
            }>
              <Routes>
                {/* ── Public ──────────────────────────────────────── */}
                <Route path="/"             element={<Home />} />
                <Route path="/home"         element={<Home />} />
                <Route path="/login"        element={<UserLogin />} />
                <Route path="/bulletin"     element={<Bulletin />} />
                <Route path="/sos"          element={<SOS />} />
                <Route path="/about"        element={<About />} />
                <Route path="/chatbot"      element={<ChatBot />} />
                <Route path="/xai"          element={<XAI />} />
                <Route path="/accident/:id" element={<AccidentDetail />} />
                <Route path="/track/:shareId" element={<FamilyTrack />} />

                {/* ── Protected Routes (User Auth Required) ────────── */}
                <Route path="/navigation"   element={<ProtectedRoute><Navigation /></ProtectedRoute>} />
                <Route path="/rewards"      element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
                <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                {/* ── Admin Login (Public) ───────────────────────── */}
                <Route path="/admin-login"  element={<AdminLogin />} />

                {/* ── Admin-Only Routes (AdminRoute guard) ────────── */}
                <Route path="/admin"               element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="/admin/risk-analysis" element={<AdminRoute><AdminRiskAnalysis /></AdminRoute>} />

                {/* ── Redirects ────────────────────────────────────── */}
                <Route path="/trips"   element={<Navigate to="/rewards" replace />} />
                <Route path="/predict" element={<Navigate to="/admin/risk-analysis" replace />} />
                <Route path="*"        element={<Navigate to="/" replace />} />
              </Routes>
            </React.Suspense>
          </Box>
        </ErrorBoundary>
        <ChatBotButton />
        <FloatingSOS />
        <GuestLoginPrompt />
      </BrowserRouter>
    </ThemeProvider>
  );
}