import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Container, Grid, Chip, Divider, IconButton, Dialog, Slide } from "@mui/material";
import { Share, BookmarkBorder, AccessTime, LocationOn, LocalFireDepartment, AddCircleOutline } from "@mui/icons-material";
import CreateBulletinModal from "../components/CreateBulletinModal";
import { X, Share2 } from "lucide-react";

// Inject Google Fonts properly (not via broken @font-face src:url())
const injectFont = () => {
  if (document.getElementById("ic-playfair-font")) return;
  const link = document.createElement("link");
  link.id = "ic-playfair-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap";
  document.head.appendChild(link);
};


const BASE = import.meta?.env?.VITE_API_URL ?? "";

const T = {
  bg: "#fff",
  text: "#0f172a",
  textSub: "#64748b",
  accent: "#ea580c",
  border: "#e2e8f0",
  blue: "#2563eb",
  red: "#dc2626"
};

const CATEGORY_IMAGES = {
  "ACCIDENT": "https://images.unsplash.com/photo-1545153996-e1799787a70a?auto=format&fit=crop&q=80&w=800",
  "TRAFFIC": "https://images.unsplash.com/photo-1518131343132-722137976660?auto=format&fit=crop&q=80&w=800",
  "ROADBLOCK": "https://images.unsplash.com/photo-1494548162494-384bba4ab999?auto=format&fit=crop&q=80&w=800",
  "HAZARD": "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&q=80&w=800",
  "GENERAL": "https://images.unsplash.com/photo-1527525443983-6e60c75efe46?auto=format&fit=crop&q=80&w=800",
};

const getFallbackImage = (category) => CATEGORY_IMAGES[category] || CATEGORY_IMAGES["GENERAL"];

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function Bulletin() {
  const nav = useNavigate();

  const [allIncidents, setAllIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    injectFont();
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/reports?active_only=true&limit=50`);
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
          content: cleanContent,
          author: r.reporter || (r.source === "system" ? "AI Safety Engine" : "Community"),
          date: r.timestamp || new Date().toISOString(),
          category: r.type?.toUpperCase() || "GENERAL",
          severity: r.severity || "moderate",
          image_url: r.photos?.[0] || getFallbackImage(r.type?.toUpperCase()),
          video_url: r.video_url || null,
          source: r.source || "system",
          isBreaking: r.severity === "severe",
          lat: r.lat,
          lon: r.lon
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

  const activeReportsCount = allIncidents.filter(inc => inc.source !== "system").length;
  
  // Calculate average risk score loosely based on severe count
  const severeCount = allIncidents.filter(inc => inc.severity === "severe").length;
  const avgRiskLevel = severeCount > 3 ? "High (82)" : (severeCount > 0 ? "Moderate (42)" : "Low (15)");

  const FLASH_NEWS = useMemo(() => {
    if (allIncidents.length === 0) return [
      "🚧 Stay alert and drive safe.",
      "🚓 Report incidents to help others."
    ];
    return allIncidents.slice(0, 4).map(inc => `${inc.severity === "severe" ? "🚨" : "📢"} ${inc.title}`);
  }, [allIncidents]);

  const handleShare = async (inc) => {
    const shareData = { title: inc.title, text: inc.content, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`);
        alert("Link copied to clipboard!");
      }
    } catch (err) {}
  };

  const handlePost = async (data) => {
    try {
      // Get GPS
      let lat = 31.1048, lon = 77.1734;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch (e) { console.warn("GPS failed, using Shimla default"); }

      const res = await fetch(`${BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.headline,
          description: data.description,
          type: data.type,
          severity: data.severity,
          photos: data.image_url ? [data.image_url] : [],
          video_url: data.video_url || null,
          reporter: JSON.parse(localStorage.getItem("ic_user") || "{}").email || "Community User", 
          source: "community",
          lat,
          lon
        })
      });
      if (res.ok) {
        await fetchIncidents();
        window.dispatchEvent(new Event("intellicrash_new_report"));
      }
    } catch (err) {
      console.error("Failed to post bulletin:", err);
    }
  };

  return (
    <Box sx={{ background: T.bg, minHeight: "100vh", pb: 8 }}>
      
      {/* Newspaper Header */}
      <Box sx={{ borderBottom: `2px solid ${T.text}`, pt: 6, pb: 2, textAlign: "center", mb: 4 }}>
        <Container maxWidth="lg">
          <Typography sx={{ 
            fontFamily: "'Playfair Display', serif", 
            fontSize: { xs: 32, md: 56 }, 
            fontWeight: 900, 
            letterSpacing: -1,
            color: T.text,
            lineHeight: 1
          }}>
            THE INTELLICRASH BULLETIN
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, borderTop: `1px solid ${T.border}`, pt: 1, flexWrap: "wrap", gap: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.textSub, textTransform: "uppercase" }}>
              Himachal Pradesh Edition
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.textSub, textTransform: "uppercase" }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.accent, textTransform: "uppercase" }}>
              Live Safety Updates
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Flash News Ticker */}
        <Box sx={{ 
          background: "#000", color: "#fff", py: 1, px: 2, mb: 4, borderRadius: 1,
          display: "flex", gap: 3, overflow: "hidden", whiteSpace: "nowrap"
        }}>
          <Typography sx={{ fontWeight: 900, fontSize: 12, color: T.accent, flexShrink: 0 }}>FLASH NEWS:</Typography>
          <Box sx={{ display: "flex", gap: 4, animation: "ticker 30s linear infinite", "@keyframes ticker": { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } } }}>
            {[...FLASH_NEWS, ...FLASH_NEWS].map((msg, i) => (
              <Typography key={i} sx={{ fontSize: 12, fontWeight: 600 }}>{msg}</Typography>
            ))}
          </Box>
        </Box>

        <Grid container spacing={4}>
          {/* Main Content Area */}
          <Grid item xs={12} md={8}>
            {loading ? (
              <Typography sx={{ textAlign: "center", py: 10, color: T.textSub, fontWeight: 600 }}>Loading latest updates...</Typography>
            ) : allIncidents.length > 0 ? (
              <>
                {/* Hero Story (First Incident) */}
                <Box sx={{ mb: 6, cursor: "pointer" }} onClick={() => setSelectedIncident(allIncidents[0])}>
                  <Box sx={{ 
                    width: "100%", height: { xs: 240, md: 400 }, 
                    borderRadius: 2, overflow: "hidden", mb: 2,
                    position: "relative"
                  }}>
                    <img 
                      src={allIncidents[0].image_url} 
                      onError={(e) => { e.target.onerror = null; e.target.src = getFallbackImage(allIncidents[0].category); }}
                      alt="News" 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                    <Chip 
                      label={allIncidents[0].category} 
                      sx={{ position: "absolute", top: 16, left: 16, background: allIncidents[0].severity === "severe" ? T.red : T.accent, color: "#fff", fontWeight: 900, borderRadius: 1 }} 
                    />
                  </Box>
                  <Typography variant="h3" sx={{ 
                    fontFamily: "'Playfair Display', serif", 
                    fontWeight: 900, mb: 1.5, fontSize: { xs: 24, md: 36 },
                    "&:hover": { color: T.blue }
                  }}>
                    {allIncidents[0].title}
                  </Typography>
                  <Typography sx={{ color: T.textSub, fontSize: 16, lineHeight: 1.6, mb: 2 }}>
                    {allIncidents[0].content}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800 }}>BY {allIncidents[0].author}</Typography>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: T.textSub }}>
                      <AccessTime sx={{ fontSize: 14 }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{new Date(allIncidents[0].date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: T.textSub, ml: "auto" }}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleShare(allIncidents[0]); }}><Share sx={{ fontSize: 18 }} /></IconButton>
                      <IconButton size="small"><BookmarkBorder sx={{ fontSize: 18 }} /></IconButton>
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ mb: 4 }} />

                {/* Sub Stories Grid (Rest of incidents) */}
                <Grid container spacing={3}>
                  {allIncidents.slice(1).map(news => (
                    <Grid item xs={12} sm={6} key={news.id}>
                      <Box sx={{ cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }} onClick={() => setSelectedIncident(news)}>
                        <Box sx={{ width: "100%", height: 180, borderRadius: 1.5, overflow: "hidden", mb: 1.5, position: "relative" }}>
                          <img 
                            src={news.image_url} 
                            onError={(e) => { e.target.onerror = null; e.target.src = getFallbackImage(news.category); }}
                            alt="News" 
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                          />
                        </Box>
                        <Typography sx={{ fontSize: 10, fontWeight: 900, color: T.blue, letterSpacing: 1, mb: 0.5 }}>{news.category}</Typography>
                        <Typography sx={{ 
                          fontFamily: "'Playfair Display', serif", 
                          fontWeight: 800, fontSize: 18, mb: 1,
                          "&:hover": { color: T.blue }
                        }}>
                          {news.title}
                        </Typography>
                        <Typography sx={{ color: T.textSub, fontSize: 13, lineHeight: 1.5, mb: 2, flex: 1 }}>
                          {news.content.length > 100 ? `${news.content.slice(0, 100)}...` : news.content}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: T.textSub }}>
                          <LocationOn sx={{ fontSize: 12 }} />
                          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{news.category}</Typography>
                          <Typography sx={{ fontSize: 11, ml: "auto" }}>{new Date(news.date).toLocaleDateString()}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </>
            ) : (
              <Typography sx={{ textAlign: "center", py: 10, color: T.textSub, fontWeight: 600 }}>No recent incidents reported.</Typography>
            )}
          </Grid>

          {/* Sidebar Area */}
          <Grid item xs={12} md={4}>
            
            {/* Post Incident Action Button */}
            <Box sx={{ mb: 4 }}>
               <button 
                onClick={() => setIsModalOpen(true)} 
                style={{ 
                  width: "100%", padding: "16px", borderRadius: 12, border: "none", 
                  background: T.accent, color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  boxShadow: "0 8px 24px rgba(234, 88, 12, 0.4)",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "none"}
              >
                <AddCircleOutline /> POST NEW INCIDENT
              </button>
            </Box>

            {/* Live Stats Card */}
            <Box sx={{ background: "#f8fafc", p: 3, borderRadius: 2, border: `1px solid ${T.border}`, mb: 4 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 14, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <LocalFireDepartment sx={{ color: T.red }} /> LIVE SAFETY PULSE
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Active Reports</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 900, color: T.blue }}>{activeReportsCount} Today</Typography>
                </Box>
                <Box sx={{ height: 4, background: "#e2e8f0", borderRadius: 2 }}>
                  <Box sx={{ width: `${Math.min(activeReportsCount * 5, 100)}%`, height: "100%", background: T.blue, borderRadius: 2 }} />
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Avg. Risk Level</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 900, color: T.accent }}>{avgRiskLevel}</Typography>
                </Box>
                <Box sx={{ height: 4, background: "#e2e8f0", borderRadius: 2 }}>
                  <Box sx={{ width: "42%", height: "100%", background: T.accent, borderRadius: 2 }} />
                </Box>
              </Box>
              <button 
                onClick={() => nav("/navigation")}
                style={{ 
                  width: "100%", padding: "10px", borderRadius: 8, border: "none", 
                  background: T.text, color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" 
                }}
              >
                VIEW LIVE MAP →
              </button>
            </Box>

            {/* Trending Sections */}
            <Typography sx={{ fontWeight: 900, fontSize: 12, color: T.textSub, letterSpacing: 1, mb: 2, textTransform: "uppercase" }}>Trending Topics</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4 }}>
              {["NH-5 Landslide", "Atal Tunnel Fog", "Shimla Traffic", "iRAD Data 2024", "Road Safety Week"].map(tag => (
                <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" sx={{ borderRadius: 1, fontWeight: 700, fontSize: 10, cursor: "pointer", "&:hover": { background: "#f1f5f9" } }} />
              ))}
            </Box>

            {/* Quick Links */}
            <Box sx={{ p: 2, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Safety Resources</Typography>
              {[
                { l: "Emergency Contacts", c: T.red },
                { l: "District Wise Tolls", c: T.text },
                { l: "Weather Forecast", c: T.blue },
                { l: "Report a Hazard", c: T.accent }
              ].map((item, i) => (
                <Box key={i} sx={{ py: 1.5, borderTop: i > 0 ? `1px solid ${T.border}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", "&:hover": { pl: 0.5, transition: "0.2s" } }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{item.l}</Typography>
                  <Typography sx={{ fontSize: 16, color: item.c }}>→</Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>

      <CreateBulletinModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onPost={handlePost}
      />

      {/* Detail Popup Modal */}
      <Dialog 
        open={Boolean(selectedIncident)} 
        onClose={() => setSelectedIncident(null)}
        TransitionComponent={Transition}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "24px", overflow: "hidden", m: 2 }
        }}
      >
        {selectedIncident && (
          <Box sx={{ background: "#fff", position: "relative" }}>
            <IconButton 
              onClick={() => setSelectedIncident(null)}
              sx={{
                position: "absolute", top: 16, right: 16,
                background: "rgba(0,0,0,0.5)", color: "#fff",
                zIndex: 10, "&:hover": { background: "rgba(0,0,0,0.8)" }
              }}
            >
              <X size={20} />
            </IconButton>

            <Box sx={{ width: "100%", height: 350, background: "#f8fafc", position: "relative" }}>
              {selectedIncident.video_url ? (
                <video src={selectedIncident.video_url} controls autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <img 
                  src={selectedIncident.image_url} 
                  onError={(e) => { e.target.onerror = null; e.target.src = getFallbackImage(selectedIncident.category); }}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
              )}
              <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", p: 3, pt: 8, pointerEvents: "none" }}>
                <Chip 
                  label={selectedIncident.category} 
                  sx={{ background: selectedIncident.severity === "severe" ? T.red : T.accent, color: "#fff", fontWeight: 900, borderRadius: 1, mb: 2 }} 
                />
                <Typography variant="h3" sx={{ 
                  fontFamily: "'Playfair Display', serif", 
                  fontWeight: 900, fontSize: { xs: 24, md: 36 }, color: "#fff", lineHeight: 1.2
                }}>
                  {selectedIncident.title}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: { xs: 3, md: 5 } }}>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", fontSize: "14px", color: T.textSub, mb: 4, fontWeight: 700 }}>
                <Typography sx={{ fontWeight: 800 }}>{new Date(selectedIncident.date).toLocaleString()}</Typography>
                <span>•</span>
                <Typography sx={{ fontWeight: 800 }}>BY {selectedIncident.author.toUpperCase()}</Typography>
                <span>•</span>
                <Typography sx={{ fontWeight: 800, color: selectedIncident.severity === "severe" ? T.red : T.textSub }}>SEVERITY: {selectedIncident.severity.toUpperCase()}</Typography>
              </Box>

              <Typography sx={{ 
                fontSize: "1.1rem", 
                lineHeight: 1.8, 
                color: T.text, 
                whiteSpace: "pre-wrap",
                fontWeight: 500
              }}>
                {selectedIncident.content}
              </Typography>

              <Box sx={{ mt: 5, pt: 3, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end" }}>
                <IconButton 
                  onClick={() => handleShare(selectedIncident)}
                  sx={{
                    background: T.accent, color: "#fff",
                    borderRadius: "16px", px: 3, py: 1.5,
                    "&:hover": { background: T.accent, filter: "brightness(1.1)" },
                    display: "flex", gap: 1
                  }}
                >
                  <Share2 size={20} />
                  <Typography sx={{fontWeight: 800, fontSize: 14}}>SHARE NEWS</Typography>
                </IconButton>
              </Box>
            </Box>
          </Box>
        )}
      </Dialog>

    </Box>
  );
}