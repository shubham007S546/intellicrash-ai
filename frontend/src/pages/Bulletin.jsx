import { useState, useCallback, useMemo, useEffect } from "react";
import { Plus, Info, Zap, ShieldCheck, Video as VideoIcon, Filter } from "lucide-react";
import { Typography, Box, Chip, Divider, CircularProgress, Tooltip, IconButton } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import NewsCard from "./NewsCard";
import CreateBulletinModal from "../components/CreateBulletinModal";

const BASE = import.meta?.env?.VITE_API_URL ?? "http://127.0.0.1:8000";

export default function Bulletin() {
  const [allIncidents, setAllIncidents] = useState([]);
  const [activeFilter, setActiveFilter] = useState("Real Reports");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("ic_user") || "{}");
      return user.role === "admin" || user.email?.includes("admin") || user.is_admin;
    } catch { return false; }
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/reports?active_only=true&limit=100`);
      const data = await res.json();
      const reports = data.reports || [];
      
      const transformed = reports.map(r => {
        let rawContent = (r.description || "").trim();
        const cleanContent = rawContent
          .replace(/\[AutoLearned\].*?(\s|$)/gi, "")
          .replace(/count=\d+/gi, "")
          .replace(/avgSev=[\d.]+/gi, "")
          .replace(/fatals=\d+/gi, "")
          .replace(/lat=[\d.]+\s+lon=[\d.]+/gi, "")
          .replace(/severity=\w+/gi, "")
          .trim() || "Road safety update for Himachal Pradesh.";

        const displayTitle = (r.title || cleanContent || "Safety Advisory")
          .replace(/\[AutoLearned\]/gi, "")
          .trim();
        
        return {
          id: r.id,
          title: displayTitle.length > 70 ? displayTitle.slice(0, 70) + "..." : displayTitle,
          headline: displayTitle,
          content: cleanContent,
          author: r.reporter || (r.source === "system" ? "AI Safety Engine" : "Community"),
          date: r.timestamp || new Date().toISOString(),
          category: r.type?.toUpperCase() || "GENERAL",
          severity: r.severity || "moderate",
          image_url: r.photos?.[0] || null,
          video_url: r.video_url || null,
          source: r.source || "system",
          isBreaking: r.severity === "severe",
        };
      }).sort((a, b) => new Date(b.date) - new Date(a.date));

      setAllIncidents(transformed);
    } catch (err) {
      console.error("Fetch incidents failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    window.addEventListener("intellicrash_new_report", fetchIncidents);
    const interval = setInterval(fetchIncidents, 30000);
    return () => {
      window.removeEventListener("intellicrash_new_report", fetchIncidents);
      clearInterval(interval);
    };
  }, [fetchIncidents]);

  const filteredIncidents = useMemo(() => {
    return allIncidents.filter(inc => {
      // DEFAULT: Only show community, navigation, and official external reports
      const isRealReport = inc.source === "community" || inc.source === "navigation" || inc.source === "external" || inc.source === "OFFICIAL (SOS)";
      
      if (activeFilter === "All") return isRealReport || inc.source === "system"; // System only in 'All'
      if (activeFilter === "Real Reports") return isRealReport;
      if (activeFilter === "Advisories") return inc.source === "system" || inc.source === "ai";
      if (activeFilter === "Videos") return !!inc.video_url || inc.category === "VIDEO";
      return isRealReport;
    });
  }, [allIncidents, activeFilter]);

  const handleResolved = (id) => {
    setAllIncidents(prev => prev.filter(inc => inc.id !== id));
    try {
      const resolved = JSON.parse(localStorage.getItem("intellicrash_resolved_ids") || "[]");
      localStorage.setItem("intellicrash_resolved_ids", JSON.stringify([...new Set([...resolved, id])]));
      window.dispatchEvent(new Event("intellicrash_report_resolved"));
    } catch {}
  };

  const T = {
    bg: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    accent: "#ea580c",
    accentGrad: "linear-gradient(135deg, #ea580c, #dc2626)",
    text: "#0f172a",
    sub: "#64748b",
    glass: "rgba(255, 255, 255, 0.8)",
    border: "rgba(226, 232, 240, 0.8)"
  };

  return (
    <Box sx={{ background: T.bg, minHeight: "100vh", pb: 10 }}>
      <style>{`
        @font-face { font-family: 'Syne'; src: url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap'); }
        .glass-panel { background: ${T.glass}; backdrop-filter: blur(16px); border: 1px solid ${T.border}; box-shadow: 0 8px 32px rgba(15,23,42,0.06); }
        .filter-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .filter-btn:hover { transform: translateY(-1px); }
        .incident-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 24px; }
        @media (max-width: 600px) { .incident-grid { grid-template-columns: 1fr; } }
      `}</style>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 }, pt: 6 }}>
        
        {/* Portal Header */}
        <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="glass-panel" style={{ borderRadius: 32, padding: 40, marginBottom: 40, position: "relative", overflow: "hidden" }}>
          <Box sx={{ position: "absolute", top: -50, right: -50, width: 250, height: 250, background: "radial-gradient(circle, rgba(234, 88, 12, 0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 12px #ef4444" }} />
            <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#ef4444", letterSpacing: 2, textTransform: "uppercase" }}>Unified Intelligence Command</Typography>
          </Box>
          
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 3 }}>
            <Box>
              <Typography sx={{ fontSize: { xs: 32, md: 44 }, fontWeight: 900, color: T.text, fontFamily: "'Syne', sans-serif", lineHeight: 1, mb: 1.5 }}>HP Safety Bulletin</Typography>
              <Typography sx={{ fontSize: 14, color: T.sub, fontWeight: 500, maxWidth: 500 }}>
                Real-time road intelligence crowdsourced from drivers and synthesized by our BiLSTM safety engine.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <button onClick={() => setIsModalOpen(true)} style={{ padding: "14px 28px", background: T.accentGrad, color: "#fff", border: "none", borderRadius: 16, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 14, boxShadow: "0 12px 24px -6px rgba(234, 88, 12, 0.4)" }}>
                <Plus size={20} /> POST INCIDENT
              </button>
            </Box>
          </Box>
        </motion.div>

        {/* Filter Bar */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", background: "#fff", p: 0.8, borderRadius: 4, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
            {[
              { id: "All", icon: <Filter size={14} /> },
              { id: "Real Reports", icon: <ShieldCheck size={14} /> },
              { id: "Advisories", icon: <Zap size={14} /> },
              { id: "Videos", icon: <VideoIcon size={14} /> }
            ].map(f => (
              <button key={f.id} onClick={() => setActiveFilter(f.id)} className="filter-btn" style={{ 
                padding: "10px 20px", background: activeFilter === f.id ? T.accentGrad : "transparent", color: activeFilter === f.id ? "#fff" : T.sub, 
                border: "none", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
                boxShadow: activeFilter === f.id ? "0 4px 12px rgba(234, 88, 12, 0.3)" : "none"
              }}>
                {f.icon} {f.id}
              </button>
            ))}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.sub }}>
              {filteredIncidents.length} <span style={{ fontWeight: 500 }}>Active Pulse(s)</span>
            </Typography>
            <IconButton onClick={fetchIncidents} size="small" sx={{ background: "#fff", border: "1px solid #e2e8f0" }}>
              <Zap size={16} color={T.accent} />
            </IconButton>
          </Box>
        </Box>

        {/* Content Section */}
        <AnimatePresence mode="wait">
          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 10 }}>
              <CircularProgress size={40} sx={{ color: T.accent, mb: 2 }} />
              <Typography sx={{ color: T.sub, fontWeight: 600 }}>Syncing with command center...</Typography>
            </Box>
          ) : filteredIncidents.length > 0 ? (
            <Box className="incident-grid">
              {filteredIncidents.map((inc, i) => (
                <motion.div key={inc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  {/* Explicit Section Heading for distinction */}
                  {(i === 0 || (filteredIncidents[i-1].source !== inc.source)) && (
                    <Box sx={{ mb: 2, mt: i > 0 ? 4 : 0, width: "100%", px: 2 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 900, color: T.accent, letterSpacing: 1.5, textTransform: "uppercase", mb: 1 }}>
                        {inc.source === "system" ? "🤖 AI Safety Advisories" : "📢 Verified User Reports"}
                      </Typography>
                      <Divider sx={{ mb: 2, opacity: 0.5 }} />
                    </Box>
                  )}
                  <NewsCard 
                    incident={inc} 
                    isAdmin={isAdmin} 
                    onResolve={() => handleResolved(inc.id)}
                    badge={
                      inc.source === "system" 
                        ? <Chip label="AI ADVISORY" size="small" sx={{ bgcolor: "rgba(37,99,235,0.1)", color: "#2563eb", fontWeight: 900, fontSize: 9 }} />
                        : <Chip label="VERIFIED DRIVER" size="small" sx={{ bgcolor: "rgba(22,163,74,0.1)", color: "#16a34a", fontWeight: 900, fontSize: 9 }} />
                    }
                  />
                </motion.div>
              ))}
            </Box>
          ) : (
            <Box sx={{ py: 12, textAlign: "center", border: "2px dashed #cbd5e1", borderRadius: 8 }}>
              <Info size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#64748b" }}>No pulses detected for this filter.</Typography>
              <Typography sx={{ color: "#94a3b8", mt: 1 }}>Try switching filters or reporting a new incident.</Typography>
            </Box>
          )}
        </AnimatePresence>
      </Box>

      <CreateBulletinModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onPost={async (data) => {
          try {
            const res = await fetch(`${BASE}/api/reports`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: data.headline,
                description: data.description,
                type: data.type,
                severity: data.severity,
                photos: data.image_url ? [data.image_url] : [],
                reporter: JSON.parse(localStorage.getItem("ic_user") || "{}").email || "Community User", 
                source: "community",
                lat: 31.1048,               // Fallback if needed
                lon: 77.1734
              })
            });
            if (res.ok) {
              await fetchIncidents();
              window.dispatchEvent(new Event("intellicrash_new_report"));
            }
          } catch (err) {
            console.error("Failed to post bulletin:", err);
          }
          setIsModalOpen(false);
        }}
      />
    </Box>
  );
}