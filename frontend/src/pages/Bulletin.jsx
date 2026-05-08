import { useState, useCallback, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Typography } from "@mui/material";
import NewsCard from "./NewsCard";
import CreateBulletinModal from "../components/CreateBulletinModal";

const BASE = import.meta?.env?.VITE_API_URL ?? "http://127.0.0.1:8000";

export default function Bulletin() {
  const [allIncidents, setAllIncidents] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simple admin check
  const isAdmin = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("ic_user") || "{}");
      return user.role === "admin" || user.email?.includes("admin") || user.is_admin;
    } catch { return false; }
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      // Fetch active reports
      const res = await fetch(`${BASE}/api/reports?active_only=true&limit=100`);
      const data = await res.json();
      const reports = data.reports || [];
      
      const transformed = reports.map(r => {
        let rawContent = (r.description || "").trim();
        
        // ROBUST CLEANING: Detect technical metadata patterns
        const avgSevMatch = rawContent.match(/avgSev=([\d.]+)/i);
        const fatalsMatch = rawContent.match(/fatals=(\d+)/i);
        const latLonMatch = rawContent.match(/lat=[\d.]+\s+lon=[\d.]+/i);

        let humanizedContent = rawContent;
        if (avgSevMatch || fatalsMatch) {
          const sev = parseFloat(avgSevMatch?.[1] || 0);
          const f   = fatalsMatch?.[1] || 0;
          const sevLabel = sev >= 67 ? "Critical" : sev >= 34 ? "Significant" : "Noticeable";
          humanizedContent = `System Alert: ${sevLabel} risk level detected with ${f} estimated historical impact factors in this zone.`;
        }

        // Final strip of all technical brackets and metadata
        const cleanContent = humanizedContent
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
          author: r.reporter || "HP Safety Base",
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
    const interval = setInterval(fetchIncidents, 15000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const filteredIncidents = useMemo(() => {
    return allIncidents.filter(inc => {
      if (activeFilter === "All") return true;
      if (activeFilter === "Videos") return inc.video_url !== null;
      if (activeFilter === "News") return inc.video_url === null;
      return true;
    });
  }, [allIncidents, activeFilter]);

  const handleResolved = (id) => {
    setAllIncidents(prev => prev.filter(inc => inc.id !== id));
    // Sync with global state for map and other components
    try {
      const resolved = JSON.parse(localStorage.getItem("intellicrash_resolved_ids") || "[]");
      localStorage.setItem("intellicrash_resolved_ids", JSON.stringify([...new Set([...resolved, id])]));
      window.dispatchEvent(new Event("intellicrash_report_resolved"));
    } catch {}
  };

  return (
    <div style={{
      background: "radial-gradient(circle at top right, #f8fafc, #ffffff)",
      minHeight: "100vh",
      padding: "20px",
      color: "#1e293b",
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", paddingTop: "40px" }}>
        
        {/* Portal Header */}
        <div style={{ 
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.5)",
          borderRadius: "24px",
          padding: "32px",
          marginBottom: "40px",
          boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 10px #ef4444", animation: "pulse 1.5s infinite" }} />
            <Typography sx={{ fontSize: "11px", fontWeight: "800", color: "#ef4444", letterSpacing: "1.5px" }}>LIVE INTELLIGENCE FEED</Typography>
          </div>
          
          <h1 style={{ 
            fontSize: "28px", 
            fontWeight: "900", 
            margin: "0 0 8px 0",
            letterSpacing: "-0.8px",
            color: "#0f172a",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.1
          }}>
            Safety Command Bulletin
          </h1>
          <Typography sx={{ fontSize: "13px", color: "#64748b", fontWeight: "500", mb: 3 }}>
            Official Road Safety Intelligence for Himachal Pradesh · Powered by AI Ensemble
          </Typography>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ 
              display: "flex", 
              background: "#f1f5f9", 
              padding: "4px", 
              borderRadius: "14px",
              border: "1px solid #e2e8f0"
            }}>
              {["All", "News", "Videos"].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    padding: "8px 20px",
                    background: activeFilter === f ? "#fff" : "transparent",
                    color: activeFilter === f ? "#0f172a" : "#64748b",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "700",
                    transition: "all 0.2s",
                    boxShadow: activeFilter === f ? "0 4px 12px rgba(0,0,0,0.05)" : "none"
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{
                marginLeft: "auto",
                padding: "12px 28px",
                background: "linear-gradient(135deg, #ea580c, #dc2626)",
                color: "#fff",
                border: "none",
                borderRadius: "14px",
                fontWeight: "800",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                boxShadow: "0 10px 20px -5px rgba(234, 88, 12, 0.3)"
              }}
            >
              <Plus size={18} /> REPORT INCIDENT
            </button>
          </div>
        </div>

        {/* Results Info */}
        <div style={{ marginBottom: "30px" }}>
          <span style={{ fontSize: "20px", fontWeight: "700", opacity: 0.9 }}>
            'Himachal Pradesh Accident'
          </span>
          <span style={{ marginLeft: "10px", fontSize: "16px", opacity: 0.5 }}>
            - {filteredIncidents.length} Result(s)
          </span>
        </div>

        {/* News List */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div style={{ padding: "100px", textAlign: "center", opacity: 0.5 }}>Loading portal...</div>
          ) : filteredIncidents.length > 0 ? (
            filteredIncidents.map(inc => (
              <NewsCard 
                key={inc.id} 
                incident={inc} 
                isAdmin={isAdmin} 
                onResolve={handleResolved}
              />
            ))
          ) : (
            <div style={{ padding: "100px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "12px", opacity: 0.6, color: "var(--text-secondary)" }}>
              No reports found in the portal.
            </div>
          )}
        </div>
      </div>

      <CreateBulletinModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onPost={(data) => {
          setAllIncidents([data, ...allIncidents]);
          setIsModalOpen(false);
          fetchIncidents();
        }}
      />
    </div>
  );
}