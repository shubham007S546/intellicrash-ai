/**
 * Navbar.jsx — IntelliCrash v10.0 FINAL
 * ✅ Dark glassmorphism aesthetic (replaces white MUI AppBar)
 * ✅ Sign In (ghost) + Sign Up (orange gradient) top-right when logged out
 * ✅ User avatar + name + logout when logged in
 * ✅ Mobile drawer + bottom tab bar preserved
 * ✅ No MUI dependency — pure inline styles
 * ✅ Supabase auth state
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabase";

const LINKS = [
  { label: "Home",      path: "/",           emoji: "🏠" },
  { label: "Navigate",  path: "/navigation", emoji: "🗺️" },
  { label: "Predict",   path: "/predict",    emoji: "⚡" },
  { label: "Dashboard", path: "/dashboard",  emoji: "📊" },
  { label: "XAI",       path: "/xai",        emoji: "🧠" },
  { label: "Bulletin",  path: "/bulletin",   emoji: "📡" },
  { label: "Trips",     path: "/trips",      emoji: "🚗" },
  { label: "About",     path: "/about",      emoji: "ℹ️" },
];

const BOTTOM_TABS = [
  { label: "Home",     path: "/",           emoji: "🏠" },
  { label: "Navigate", path: "/navigation", emoji: "🗺️" },
  { label: "Predict",  path: "/predict",    emoji: "⚡" },
  { label: "SOS",      path: "/sos",        emoji: "🚨" },
  { label: "More",     path: "/dashboard",  emoji: "☰"  },
];

export default function Navbar() {
  const nav      = useNavigate();
  const location = useLocation();
  const [user,       setUser]       = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(window.innerWidth < 900);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data?.session?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    nav("/");
  };

  const isActive = (p) =>
    p === "/" ? location.pathname === "/" : location.pathname.startsWith(p);

  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.user_metadata?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  const S = {
    nav: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 58, padding: "0 20px",
      background: "rgba(8,8,14,0.94)",
      backdropFilter: "blur(20px) saturate(1.8)",
      WebkitBackdropFilter: "blur(20px) saturate(1.8)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      position: "sticky", top: 0, zIndex: 2000,
      fontFamily: "'DM Sans',sans-serif",
      boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
    },
    logoWrap: {
      display: "flex", alignItems: "center", gap: 10,
      cursor: "pointer", flexShrink: 0,
    },
    logoIcon: {
      width: 34, height: 34, flexShrink: 0,
      background: "linear-gradient(135deg,#f97316,#ef4444)",
      borderRadius: 10, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: 17,
      boxShadow: "0 4px 14px rgba(249,115,22,0.45)",
    },
    logoText: {
      fontFamily: "'Syne',sans-serif", fontWeight: 800,
      fontSize: 19, color: "#fff", letterSpacing: "-0.5px",
    },
    badge: {
      fontSize: 9, fontWeight: 700,
      background: "rgba(249,115,22,0.12)", color: "#f97316",
      border: "1px solid rgba(249,115,22,0.25)",
      borderRadius: 6, padding: "2px 7px",
      letterSpacing: "0.8px", textTransform: "uppercase",
    },
    navLinks: { display: "flex", alignItems: "center", gap: 2 },
    right: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
    langBtn: {
      padding: "6px 12px", borderRadius: 22, fontSize: 12, fontWeight: 600,
      color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
      fontFamily: "'DM Sans',sans-serif",
    },
    signInBtn: {
      display: "flex", alignItems: "center", gap: 7,
      padding: "6px 14px 6px 10px", borderRadius: 22, fontSize: 13, fontWeight: 600,
      color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer",
      fontFamily: "'DM Sans',sans-serif",
    },
    signUpBtn: {
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 16px", borderRadius: 22, fontSize: 13, fontWeight: 700,
      color: "#fff", background: "linear-gradient(135deg,#f97316,#ef4444)",
      border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
      boxShadow: "0 3px 14px rgba(249,115,22,0.4)",
    },
    userBtn: {
      display: "flex", alignItems: "center", gap: 8,
      padding: "5px 12px 5px 6px", borderRadius: 22, fontSize: 13, fontWeight: 600,
      color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer",
      fontFamily: "'DM Sans',sans-serif",
    },
    avatar: {
      width: 24, height: 24, borderRadius: "50%",
      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, fontWeight: 800, color: "#fff", flexShrink: 0,
    },
    sosBtn: {
      display: "flex", alignItems: "center", gap: 5,
      padding: "6px 14px", borderRadius: 22, fontSize: 13, fontWeight: 700,
      color: "#fff", background: "linear-gradient(135deg,#ef4444,#dc2626)",
      border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
      boxShadow: "0 2px 12px rgba(239,68,68,0.4)", whiteSpace: "nowrap",
    },
    hamburger: {
      background: "none", border: "none", cursor: "pointer",
      padding: 6, borderRadius: 8, color: "rgba(255,255,255,0.6)",
      display: "flex",
    },
  };

  const navLinkStyle = (active) => ({
    display: "flex", alignItems: "center", gap: 5,
    padding: "6px 12px", borderRadius: 22, fontSize: 12,
    fontWeight: active ? 700 : 500,
    color: active ? "#f97316" : "rgba(255,255,255,0.5)",
    background: active ? "rgba(249,115,22,0.12)" : "transparent",
    border: active ? "1px solid rgba(249,115,22,0.2)" : "1px solid transparent",
    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
    whiteSpace: "nowrap",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        @keyframes drawerIn { from { transform:translateX(-100%); opacity:0 } to { transform:translateX(0); opacity:1 } }
        .nb-link:hover { background:rgba(255,255,255,0.07) !important; color:rgba(255,255,255,0.9) !important; }
        .nb-signin:hover { background:rgba(255,255,255,0.11) !important; color:#fff !important; transform:translateY(-1px); }
        .nb-signup:hover { box-shadow:0 5px 22px rgba(249,115,22,0.55) !important; transform:translateY(-1px) scale(1.02); }
        .nb-user:hover { background:rgba(255,255,255,0.1) !important; }
        .nb-sos:hover { box-shadow:0 5px 22px rgba(239,68,68,0.6) !important; transform:scale(1.03) translateY(-1px); }
      `}</style>

      {/* ══ TOP NAVBAR ══ */}
      <nav style={S.nav}>
        {/* Orange gradient top line */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:1, pointerEvents:"none",
          background:"linear-gradient(90deg,transparent,rgba(249,115,22,0.7),rgba(239,68,68,0.7),transparent)",
        }}/>

        {/* Logo */}
        <div style={S.logoWrap} onClick={() => nav("/")}>
          <div style={S.logoIcon}>🛡️</div>
          <span style={S.logoText}>
            Intelli<span style={{ color:"#f97316" }}>Crash</span>
          </span>
          {!isMobile && <span style={S.badge}>HP · iRAD</span>}
        </div>

        {/* Desktop links */}
        {!isMobile && (
          <div style={S.navLinks}>
            {LINKS.map(l => (
              <button key={l.path} className="nb-link" onClick={() => nav(l.path)} style={navLinkStyle(isActive(l.path))}>
                <span style={{ fontSize:13 }}>{l.emoji}</span>
                {l.label}
              </button>
            ))}
          </div>
        )}

        {/* Right */}
        <div style={S.right}>
          {!isMobile && <button style={S.langBtn}>🌐 EN</button>}

          {user ? (
            <button className="nb-user" onClick={handleLogout} title="Sign out" style={S.userBtn}>
              <div style={S.avatar}>{initials}</div>
              {!isMobile && <span>{displayName}</span>}
              <span style={{ fontSize:10, opacity:0.4 }}>↩</span>
            </button>
          ) : (
            <>
              {!isMobile && (
                <button className="nb-signin" onClick={() => nav("/login")} style={S.signInBtn}>
                  <span style={{ fontSize:14 }}>👤</span>
                  Sign In
                </button>
              )}
              <button className="nb-signup" onClick={() => nav("/login?tab=signup")} style={S.signUpBtn}>
                ✨ <span>{isMobile ? "" : "Sign Up"}</span>
              </button>
            </>
          )}

          <button className="nb-sos" onClick={() => nav("/sos")} style={S.sosBtn}>
            🚨 SOS
          </button>

          {isMobile && (
            <button style={S.hamburger} onClick={() => setDrawerOpen(true)}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          )}
        </div>
      </nav>

      {/* ══ MOBILE DRAWER ══ */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position:"fixed", inset:0, top:58, zIndex:1900,
            background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            position:"absolute", top:0, left:0, width:280, height:"100%",
            background:"#0f0f18", borderRight:"1px solid rgba(255,255,255,0.07)",
            padding:"16px 12px", boxShadow:"4px 0 40px rgba(0,0,0,0.6)",
            overflowY:"auto", display:"flex", flexDirection:"column", gap:4,
            animation:"drawerIn 0.22s ease",
          }}>
            {LINKS.map(l => (
              <button key={l.path} onClick={() => { nav(l.path); setDrawerOpen(false); }} style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"11px 14px", borderRadius:10, fontSize:14,
                fontWeight: isActive(l.path) ? 700 : 500,
                color: isActive(l.path) ? "#f97316" : "rgba(255,255,255,0.65)",
                background: isActive(l.path) ? "rgba(249,115,22,0.12)" : "transparent",
                border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                textAlign:"left", width:"100%",
              }}>
                <span style={{ fontSize:18, width:26, textAlign:"center" }}>{l.emoji}</span>
                {l.label}
              </button>
            ))}

            {/* Drawer auth */}
            <div style={{ marginTop:8, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", gap:8 }}>
              {user ? (
                <button onClick={() => { handleLogout(); setDrawerOpen(false); }} style={{
                  width:"100%", padding:"10px 14px", borderRadius:10,
                  background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.75)",
                  border:"1px solid rgba(255,255,255,0.1)", cursor:"pointer",
                  fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
                  display:"flex", alignItems:"center", gap:8,
                }}>
                  <div style={{ width:22, height:22, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#fff" }}>{initials}</div>
                  {displayName} · Sign Out
                </button>
              ) : (
                <>
                  <button onClick={() => { nav("/login"); setDrawerOpen(false); }} style={{
                    width:"100%", padding:"10px 14px", borderRadius:10,
                    background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.75)",
                    border:"1px solid rgba(255,255,255,0.1)", cursor:"pointer",
                    fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
                  }}>Sign In</button>
                  <button onClick={() => { nav("/login?tab=signup"); setDrawerOpen(false); }} style={{
                    width:"100%", padding:"10px 14px", borderRadius:10,
                    background:"linear-gradient(135deg,#f97316,#ef4444)", color:"#fff",
                    border:"none", cursor:"pointer",
                    fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif",
                    boxShadow:"0 3px 14px rgba(249,115,22,0.3)",
                  }}>✨ Sign Up — It's Free</button>
                </>
              )}
            </div>

            <button onClick={() => { nav("/sos"); setDrawerOpen(false); }} style={{
              marginTop:"auto", padding:12, background:"rgba(239,68,68,0.1)",
              color:"#ef4444", border:"1px solid rgba(239,68,68,0.25)",
              borderRadius:10, fontSize:14, fontWeight:800,
              cursor:"pointer", fontFamily:"'DM Sans',sans-serif", width:"100%",
            }}>🚨 SOS Emergency — 112</button>
          </div>
        </div>
      )}

      {/* ══ MOBILE BOTTOM TAB BAR ══ */}
      {isMobile && (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:1400,
          height:60, display:"flex",
          background:"rgba(10,10,18,0.97)", borderTop:"1px solid rgba(255,255,255,0.07)",
          backdropFilter:"blur(16px)",
        }}>
          {BOTTOM_TABS.map(t => {
            const act  = isActive(t.path);
            const isSOS = t.label === "SOS";
            return (
              <div key={t.path} onClick={() => nav(t.path)} style={{
                flex:1, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                cursor:"pointer", gap:2,
              }}>
                <div style={{
                  width: isSOS ? 38 : "auto", height: isSOS ? 38 : "auto",
                  borderRadius: isSOS ? "50%" : 0,
                  background: isSOS ? "linear-gradient(135deg,#ef4444,#dc2626)" : "transparent",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow: isSOS ? "0 2px 12px rgba(239,68,68,0.5)" : "none",
                  marginBottom: isSOS ? 2 : 0,
                }}>
                  <span style={{ fontSize: isSOS ? 16 : 20 }}>{t.emoji}</span>
                </div>
                <span style={{
                  fontSize:9, fontFamily:"'DM Sans',sans-serif",
                  fontWeight: act ? 700 : 400,
                  color: isSOS ? "#f87171" : act ? "#f97316" : "rgba(255,255,255,0.4)",
                }}>{t.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}