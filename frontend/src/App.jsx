import React from "react";
import { Box, Typography } from "@mui/material";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";

import Navbar         from "./components/Navbar.jsx";
import Home           from "./pages/Home.jsx";
import Navigation     from "./pages/Navigation.jsx";
import PredictRisk    from "./pages/PredictRisk.jsx";
import Dashboard      from "./pages/Dashboard.jsx";
import XAI            from "./pages/XAI.jsx";
import SOS            from "./pages/SOS.jsx";
import About          from "./pages/About.jsx";
import Bulletin       from "./pages/Bulletin.jsx";
import AccidentDetail from "./pages/AccidentDetail.jsx";
import Admin          from "./pages/Admin.jsx";
import AdminLogin     from "./pages/AdminLogin.jsx";
import UserLogin      from "./pages/UserLogin.jsx";   // ✅ NEW
import FamilyTrack    from "./pages/FamilyTrack.jsx";
import TripHistory    from "./pages/TripHistory.jsx";

const theme = createTheme({
  palette: {
    mode: "light",
    primary:    { main: "#1a73e8", dark: "#1557b0", light: "#4da3ff" },
    secondary:  { main: "#0097a7" },
    error:      { main: "#ea4335" },
    warning:    { main: "#f9ab00" },
    success:    { main: "#34a853" },
    background: { default: "#f0f4ff", paper: "#ffffff" },
    text:       { primary: "#1a1a2e", secondary: "#6b7a99" },
    divider:    "#e3eaf5",
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontFamily: "'Syne', sans-serif", fontWeight: 800 },
    h2: { fontFamily: "'Syne', sans-serif", fontWeight: 800 },
    h3: { fontFamily: "'Syne', sans-serif", fontWeight: 700 },
    h4: { fontFamily: "'Syne', sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Syne', sans-serif", fontWeight: 700 },
    h6: { fontFamily: "'Syne', sans-serif", fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(err, info) { console.error("App error:", err, info); }
  render() {
    if (this.state.error) return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" sx={{ color: "red", mb: 2 }}>Something went wrong</Typography>
        <Typography>{this.state.error.message}</Typography>
        <button onClick={() => this.setState({ error: null })}>Try Again</button>
      </Box>
    );
    return this.props.children;
  }
}

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
    <Box sx={{ background: "#fce8e6", p: 1, textAlign: "center" }}>
      📵 You are offline
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <OfflineBanner />
        <Navbar />
        <ErrorBoundary>
          <Box>
            <Routes>
              <Route path="/"             element={<Home />} />
              <Route path="/home"         element={<Home />} />
              <Route path="/navigation"   element={<Navigation />} />
              <Route path="/predict"      element={<PredictRisk />} />
              <Route path="/dashboard"    element={<Dashboard />} />
              <Route path="/xai"          element={<XAI />} />
              <Route path="/sos"          element={<SOS />} />
              <Route path="/about"        element={<About />} />
              <Route path="/bulletin"     element={<Bulletin />} />
              <Route path="/accident/:id" element={<AccidentDetail />} />

              {/* ✅ AUTH ROUTES */}
              <Route path="/login"        element={<UserLogin />} />
              <Route path="/admin-login"  element={<AdminLogin />} />
              <Route path="/admin"        element={<Admin />} />

              <Route path="/track/:shareId" element={<FamilyTrack />} />
              <Route path="/trips"          element={<TripHistory />} />
              <Route path="*"               element={<Home />} />
            </Routes>
          </Box>
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}