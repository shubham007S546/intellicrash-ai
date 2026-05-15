/**
 * Navbar.jsx — IntelliCrash v9.0
 * ✅ Live ticker REMOVED — Home.jsx owns it
 * ✅ Severe banner REMOVED — Home.jsx owns it
 * ✅ No getReports() call — navbar fetches nothing
 * ✅ Pill navbar, auth dropdown, mobile drawer preserved
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
  { label: "Home",     path: "/",           icon: "🏠", auth: false },
  { label: "Navigate", path: "/navigation", icon: "🧭", auth: true  },
  { label: "Rewards",  path: "/rewards",    icon: "🏆", auth: false },
  { label: "Bulletin", path: "/bulletin",   icon: "📢", auth: false },
];

function useAuth() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sub;
    const init = async () => {
      try {
        const { supabase } = await import("../services/supabase");
        const { data } = await supabase.auth.getSession();
        setUser(data?.session?.user || null);
        if (data?.session?.user) {
          localStorage.setItem("ic_user", JSON.stringify(data.session.user));
          localStorage.removeItem("ic_guest");
        } else {
          localStorage.removeItem("ic_user");
        }
        const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
          setUser(session?.user || null);
          if (session?.user) {
            localStorage.setItem("ic_user", JSON.stringify(session.user));
            localStorage.removeItem("ic_guest");
          } else {
            localStorage.removeItem("ic_user");
          }
        });
        sub = listener?.subscription;
      } catch { setUser(null); }
      setLoading(false);
    };
    init();
    return () => sub?.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { supabase } = await import("../services/supabase");
      await supabase.auth.signOut();
    } catch {}
  };

  return { user, loading, signOut };
}

function UserMenu({ user, signOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";
  const username = (user?.email || "").split("@")[0];
  const email    = user?.email || "";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "5px 12px 5px 5px",
          border: `1.5px solid ${open ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 36, background: open ? "var(--bg-soft)" : "var(--bg-card)",
          cursor: "pointer", transition: "all .18s",
          fontFamily: "'Satoshi', sans-serif",
          boxShadow: open ? "0 0 0 3px rgba(255,77,0,0.1)" : "none",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,77,0,0.08)"; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; } }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg,#ff4d00,#ff8c42)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>{initials}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0, maxWidth: 120 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", textAlign: "left" }}>{username}</span>
          <span style={{ fontSize: 9, color: "#9898a8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{email}</span>
        </div>
        <span style={{ fontSize: 10, color: "#9898a8", display: "inline-block", transition: "transform .18s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 10px)",
          width: 220, background: "var(--bg-card)",
          border: "1px solid var(--border)", borderRadius: 16,
          boxShadow: "0 12px 40px rgba(10,10,15,.12)",
          overflow: "hidden", zIndex: 300,
          animation: "icMenuPop 0.18s cubic-bezier(.22,.68,0,1.2) both",
        }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{username}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{email}</div>
          </div>
          {[
            { icon: "🧭", label: "Navigate",   path: "/navigation" },
            { icon: "🏆", label: "My Rewards", path: "/rewards"    },
          ].map(({ icon, label, path }) => (
            <button key={label} onClick={() => { nav(path); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "var(--text-primary)", fontFamily: "'Satoshi', sans-serif", textAlign: "left", transition: "background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-soft)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <span style={{ fontSize: 15 }}>{icon}</span> {label}
            </button>
          ))}
          <div style={{ height: 1, background: "#f0f0f8", margin: "4px 0" }} />
          <button onClick={() => { signOut(); setOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#ef4444", fontFamily: "'Satoshi', sans-serif", textAlign: "left", transition: "background .15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            🚪 Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const nav      = useNavigate();
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const handleNavClick = (link) => {
    if (link.auth && !user) { nav("/login"); return; }
    nav(link.path);
    setMobileOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const triggerSOS = () => {
    window.dispatchEvent(new CustomEvent("trigger_intellicrash_sos"));
  };

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@700&f[]=satoshi@400,500,600,700,800&display=swap');
        @keyframes icMenuPop { from{opacity:0;transform:translateY(-8px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes icNavIn   { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:none} }

        .ic7-nav-link {
          display:inline-flex; align-items:center; gap:6px;
          padding:8px 16px; border-radius:30px; border:none;
          background:transparent; font-size:13.5px; font-weight:600;
          cursor:pointer; font-family:'Satoshi',sans-serif;
          transition:all .18s; color:var(--text-secondary); white-space:nowrap; position:relative;
        }
        .ic7-nav-link:hover { background:var(--bg-soft); color:var(--accent); }
        .ic7-nav-link.active { background:linear-gradient(135deg,#ff4d00,#ff8c42); color:#fff; box-shadow:0 4px 14px rgba(255,77,0,.28); }
        .ic7-nav-link.active:hover { background:linear-gradient(135deg,#ea4300,#f07030); }
        .ic7-nav-link.locked { opacity:.65; }
        .ic7-nav-link.locked::after { content:'🔒'; font-size:8px; position:absolute; top:2px; right:2px; }

        .ic7-signin-btn {
          padding:8px 18px; border-radius:36px; border:1.5px solid var(--border); background:var(--bg-card);
          font-size:13px; font-weight:700; color:var(--text-primary); cursor:pointer;
          font-family:'Satoshi',sans-serif; transition:all .18s; white-space:nowrap;
        }
        .ic7-signin-btn:hover { border-color:var(--accent); color:var(--accent); background:var(--bg-soft); transform:translateY(-1px); }

        .ic7-signup-btn {
          padding:8px 20px; border-radius:36px; border:none;
          background:linear-gradient(135deg,#ff4d00,#ff8c42); color:#fff;
          font-size:13px; font-weight:800; cursor:pointer; font-family:'Satoshi',sans-serif;
          box-shadow:0 4px 14px rgba(255,77,0,.28); transition:all .18s; white-space:nowrap;
        }
        .ic7-signup-btn:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(255,77,0,.44); }

        .ic7-sos-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 18px; border-radius: 36px; border: none;
          background: linear-gradient(135deg, #ff3d00, #d50000);
          color: #fff; font-size: 13px; font-weight: 800; cursor: pointer;
          font-family: 'Satoshi', sans-serif;
          box-shadow: 0 4px 14px rgba(255, 61, 0, 0.35);
          transition: all .18s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          animation: sosPulseSmall 2s infinite;
        }
        .ic7-sos-btn:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 8px 22px rgba(255, 61, 0, 0.5); }
        .ic7-sos-btn:active { transform: scale(0.95); }

        @keyframes sosPulseSmall {
          0% { box-shadow: 0 0 0 0 rgba(255, 61, 0, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(255, 61, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 61, 0, 0); }
        }

        @keyframes sosPulseSmall {
          0% { box-shadow: 0 0 0 0 rgba(255, 61, 0, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(255, 61, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 61, 0, 0); }
        }

        @media(max-width:960px) {
          .ic7-desktop { display:none !important; }
          .ic7-mobile-btn { display:flex !important; }
        }
        @media(min-width:961px) {
          .ic7-mobile-btn    { display:none !important; }
          .ic7-mobile-drawer { display:none !important; }
        }
      `}</style>

      <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{
          background: "var(--bg-primary)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          boxShadow: scrolled ? "0 2px 20px rgba(10,10,15,.06)" : "none",
          transition: "all .25s ease",
          padding: "10px 24px",
        }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--bg-card)", borderRadius: 60, padding: "6px 8px 6px 16px",
              boxShadow: scrolled ? "0 4px 28px rgba(10,10,15,.09)" : "0 2px 18px rgba(10,10,15,.06)",
              border: "1px solid var(--border)",
              transition: "box-shadow .25s ease",
              animation: "icNavIn 0.4s cubic-bezier(.22,.68,0,1.2) both",
              gap: 8,
            }}>
              {/* Logo */}
              <button onClick={() => nav("/")}
                style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "none", cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#ff4d00,#ff8c42)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 4px 12px rgba(255,77,0,.22)", flexShrink: 0 }}>🛡️</div>
                <div>
                  <div style={{ fontFamily: "'Clash Display',sans-serif", fontWeight: 700, fontSize: 17, color: "var(--text-primary)", lineHeight: 1 }}>
                    Intelli<span style={{ color: "var(--accent)" }}>Crash</span>
                  </div>
                  <div style={{ fontSize: 8.5, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>iRAD 2020-25</div>
                </div>
              </button>

              {/* Desktop nav */}
              <div className="ic7-desktop" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}>
                {NAV_LINKS.map(link => {
                  const locked = link.auth && !user;
                  return (
                    <button key={link.path}
                      onClick={() => handleNavClick(link)}
                      className={`ic7-nav-link${isActive(link.path) ? " active" : ""}${locked ? " locked" : ""}`}
                      title={locked ? "Sign in required" : link.label}
                    >
                      <span>{link.icon}</span>{link.label}
                    </button>
                  );
                })}
              </div>

              {/* Right: auth */}
              <div className="ic7-desktop" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ThemeToggle />
                  {!loading && (
                    user
                      ? <UserMenu user={user} signOut={signOut} />
                      : <button className="ic7-signin-btn" onClick={() => nav("/login")}>Sign In</button>
                  )}
                </div>
              </div>


              {/* Mobile hamburger */}
              <div className="ic7-mobile-btn" style={{ display: "none", alignItems: "center", flexShrink: 0 }}>
                <button onClick={() => setMobileOpen(o => !o)}
                  style={{ display: "flex", flexDirection: "column", gap: 4, border: "1.5px solid var(--border)", borderRadius: 10, background: "var(--bg-card)", padding: "8px 10px", cursor: "pointer" }}>
                  <div style={{ width: 18, height: 2, background: "var(--text-primary)", borderRadius: 2, transition: "all .2s", transform: mobileOpen ? "rotate(45deg) translate(4px,4px)" : "" }} />
                  <div style={{ width: 18, height: 2, background: "var(--text-primary)", borderRadius: 2, opacity: mobileOpen ? 0 : 1, transition: "all .2s" }} />
                  <div style={{ width: 18, height: 2, background: "var(--text-primary)", borderRadius: 2, transition: "all .2s", transform: mobileOpen ? "rotate(-45deg) translate(4px,-4px)" : "" }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="ic7-mobile-drawer"
          style={{ position: "fixed", inset: 0, background: "rgba(10,10,15,.4)", zIndex: 90, backdropFilter: "blur(4px)" }}
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className="ic7-mobile-drawer" style={{
        position: "fixed", top: 64, left: 0, right: 0,
        background: "var(--bg-card)", zIndex: 95,
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgba(10,10,15,.1)",
        transform: mobileOpen ? "translateY(0)" : "translateY(-110%)",
        transition: "transform .25s cubic-bezier(.4,0,.2,1)",
        padding: "16px 20px 20px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {NAV_LINKS.map(link => {
          const locked = link.auth && !user;
          return (
            <button key={link.path} onClick={() => handleNavClick(link)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 16px", borderRadius: 12, border: "none",
                background: isActive(link.path) ? "linear-gradient(135deg,#ff4d00,#ff8c42)" : "var(--bg-soft)",
                color: isActive(link.path) ? "#fff" : "var(--text-primary)",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Satoshi',sans-serif", textAlign: "left",
                opacity: locked ? 0.7 : 1, transition: "all .15s",
              }}>
              <span style={{ fontSize: 18 }}>{link.icon}</span>
              {link.label}
              {locked && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-secondary)" }}>🔒 Sign in</span>}
            </button>
          );
        })}
        <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />

        {user ? (
          <div>
            <div style={{ fontSize: 12, color: "#9898a8", marginBottom: 10, fontFamily: "'Satoshi',sans-serif" }}>
              Signed in as <strong>{user.email}</strong>
            </div>
            <button onClick={() => { signOut(); setMobileOpen(false); }}
              style={{ padding: "10px 20px", borderRadius: 36, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Satoshi',sans-serif" }}>
              🚪 Sign Out
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button className="ic7-signin-btn" style={{ flex: 1 }} onClick={() => { nav("/login"); setMobileOpen(false); }}>Sign In</button>
          </div>
        )}
      </div>
    </>
  );
}