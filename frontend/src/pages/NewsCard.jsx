import { useState, useMemo } from "react";
import { Share2, CheckCircle2, X, Trash2 } from "lucide-react";
import { Typography, Box, IconButton, Tooltip } from "@mui/material";
import { motion } from "framer-motion";

const BASE = import.meta?.env?.VITE_API_URL ?? "";

const CATEGORY_STYLE = {
  ACCIDENT:  { color: "#ef4444", label: "ACCIDENT"  },
  TRAFFIC:   { color: "#f59e0b", label: "TRAFFIC"   },
  ROADBLOCK: { color: "#3b82f6", label: "ROADBLOCK" },
  HAZARD:    { color: "#f97316", label: "HAZARD"    },
  GENERAL:   { color: "#10b981", label: "NEWS"      },
};

export default function NewsCard({ incident, onResolve, badge }) {
  const [imgError, setImgError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);
  
  const cleanStr = (s) => (s || "")
    .replace(/\[AutoLearned\].*?(\s|$)/gi, "")
    .replace(/avgSev=[\d.]+/gi, "")
    .replace(/fatals=\d+/gi, "")
    .replace(/count=\d+/gi, "")
    .replace(/lat=[\d.]+\s+lon=[\d.]+/gi, "")
    .trim();

  const { 
    id, headline, title, content, author, date, category, 
    image_url, video_url, severity, source
  } = incident;

  const isAdmin = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("ic_user") || "{}");
      return user.role === "admin" || user.email?.includes("admin") || user.is_admin || user.email === "shubhamabhi004@gmail.com";
    } catch { return false; }
  }, []);

  const displayTitle = cleanStr(headline || title || "Safety Advisory");
  const displayContent = cleanStr(incident.description || incident.content || "Safety update for Himachal Pradesh.");
  const displayAuthor = (author || "HP Safety Base") === "IntelliCrash Demo" ? "IntelliCrash" : (author || "HP Safety Base") === "IntelliCrash-Adaptive" || (author || "system") === "system" || (author || "IntelliCrash AI") === "IntelliCrash AI" ? "AI Safety Engine" : (author || "HP Safety Base");
  
  const isVerified = source === "system" || source === "ai";
  const isSevere = severity === "severe";

  const cat = CATEGORY_STYLE[category] || CATEGORY_STYLE.GENERAL;
  const showImage = image_url && !imgError;
  const showVideo = video_url && !showImage;

  const handleShare = async (e) => {
    e.stopPropagation();
    const shareData = { title: displayTitle, text: displayContent, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`);
        alert("Link copied to clipboard!");
      }
    } catch (err) { console.error("Share failed:", err); }
  };

  const handleResolve = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Mark this incident as resolved?")) return;
    setResolving(true);
    try {
      const res = await fetch(`${BASE}/api/reports/${id}/resolve`, { method: "POST" });
      if (res.ok) onResolve(id);
      else alert("Failed to resolve incident.");
    } catch (err) { console.error("Resolve failed:", err); }
    finally { setResolving(false); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Permanently delete this report?")) return;
    try {
      const res = await fetch(`${BASE}/api/reports/${id}`, { method: "DELETE" });
      if (res.ok) onResolve(id);
      else alert("Delete failed.");
    } catch (err) { console.error("Delete failed:", err); }
  };

  return (
    <>
      <Box
        component={motion.article}
        onClick={() => setIsExpanded(true)}
        sx={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "24px",
          p: 2.5,
          mb: 2,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          alignItems: "flex-start",
          width: "100%",
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          backdropFilter: "blur(12px)",
          "&:hover": {
            transform: "translateY(-4px)",
            borderColor: "var(--accent)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          },
        }}
      >
        {/* Left Media */}
        {(showImage || showVideo) && (
          <Box sx={{
            width: { xs: "100%", md: "280px" },
            aspectRatio: "16/10",
            borderRadius: "16px",
            overflow: "hidden",
            background: "var(--bg-soft)",
            flexShrink: 0,
            position: "relative",
          }}>
            {showImage ? (
              <img src={image_url} alt="News" loading="lazy" onError={() => setImgError(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <video src={video_url} muted loop style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
            <Box sx={{
              position: "absolute", top: 0, left: 0, right: 0,
              background: isSevere ? "linear-gradient(90deg, #ef4444, #dc2626)" : "linear-gradient(90deg, #fbbf24, #f59e0b)", 
              color: isSevere ? "#fff" : "#000",
              px: 2, py: 0.8,
              fontSize: "10px", fontWeight: "900", letterSpacing: "0.1em",
              display: "flex", alignItems: "center", gap: 1,
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              zIndex: 2,
              textTransform: "uppercase"
            }}>
              <Box sx={{ fontSize: 14 }}>{isSevere ? "🚨" : "📢"}</Box>
              {isSevere ? "CRITICAL ALERT" : cat.label}
            </Box>
          </Box>
        )}

        {/* Right Content */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {badge ? badge : (
                <>
                  {isVerified && (
                    <Box sx={{ 
                      display: "inline-flex", alignItems: "center", gap: 0.5, 
                      background: "rgba(16,185,129,0.1)", color: "var(--green)", 
                      px: 1.5, py: 0.5, borderRadius: "20px", fontSize: "10px", fontWeight: "800",
                      border: "1px solid rgba(16,185,129,0.2)"
                    }}>
                      <CheckCircle2 size={12} /> OFFICIAL AI
                    </Box>
                  )}
                  {!isVerified && (
                    <Box sx={{ 
                      display: "inline-flex", alignItems: "center", gap: 0.5, 
                      background: "rgba(59,130,246,0.1)", color: "var(--blue)", 
                      px: 1.5, py: 0.5, borderRadius: "20px", fontSize: "10px", fontWeight: "800",
                      border: "1px solid rgba(59,130,246,0.2)"
                    }}>
                      👤 USER REPORT
                    </Box>
                  )}
                </>
              )}
              <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700 }}>
                {new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: "flex", alignItems: "center", gap: 1,
              background: isSevere ? "rgba(239,68,68,0.1)" : (isVerified ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)"),
              color: isSevere ? "var(--red)" : (isVerified ? "var(--blue)" : "var(--green)"),
              px: 1.5, py: 0.5, borderRadius: "20px", fontSize: "10px", fontWeight: "900",
              border: isSevere ? "1px solid rgba(239,68,68,0.2)" : (isVerified ? "1px solid rgba(59,130,246,0.2)" : "1px solid rgba(16,185,129,0.2)")
            }}>
              <span>{isVerified ? "AI" : "COMMUNITY"}</span>
              <span>{isSevere ? "CRITICAL" : (isVerified ? "ADVISORY" : "PULSE")}</span>
            </Box>
          </Box>

          <Typography variant="h5" sx={{
            fontSize: "1.25rem",
            fontWeight: 800,
            lineHeight: 1.3,
            color: "var(--text-primary)",
            fontFamily: "'Outfit', sans-serif"
          }}>
            {displayTitle}
          </Typography>

          <Typography sx={{
            fontSize: "0.95rem",
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            fontWeight: 500
          }}>
            {displayContent}
          </Typography>

          <Box sx={{ 
            mt: 1, pt: 2,
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            borderTop: "1px solid var(--border)",
          }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>
              SOURCE: {(displayAuthor || "HP Safety Base").toUpperCase()}
            </Typography>
            
            <Box sx={{ display: "flex", gap: 1 }}>
              {isAdmin && (
                <>
                  <Tooltip title="Mark as Resolved">
                    <IconButton 
                      onClick={handleResolve}
                      disabled={resolving}
                      sx={{
                        background: "rgba(16,185,129,0.1)", color: "var(--green)",
                        borderRadius: "12px", p: 1,
                        "&:hover": { background: "rgba(16,185,129,0.2)" }
                      }}
                    >
                      <CheckCircle2 size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Report">
                    <IconButton 
                      onClick={handleDelete}
                      sx={{
                        background: "rgba(239,68,68,0.1)", color: "var(--red)",
                        borderRadius: "12px", p: 1,
                        "&:hover": { background: "rgba(239,68,68,0.2)" }
                      }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              
              <IconButton 
                onClick={handleShare}
                sx={{
                  background: "var(--bg-soft)", color: "var(--text-primary)",
                  borderRadius: "12px", p: 1,
                  "&:hover": { background: "var(--border)" }
                }}
              >
                <Share2 size={18} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Expansion Modal */}
      {isExpanded && (
        <Box sx={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          p: 3, backdropFilter: "blur(20px)"
        }}>
          <Box
            component={motion.div}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            sx={{
              background: "var(--bg-card)",
              width: "100%", maxWidth: "700px",
              maxHeight: "90vh", borderRadius: "32px",
              overflowY: "auto", position: "relative",
              boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
              border: "1px solid var(--border)",
              p: 0
            }}
          >
            <IconButton 
              onClick={() => setIsExpanded(false)}
              sx={{
                position: "absolute", top: 20, right: 20,
                background: "var(--bg-soft)", color: "var(--text-primary)",
                zIndex: 10, "&:hover": { background: "var(--border)" }
              }}
            >
              <X size={20} />
            </IconButton>

            {(showImage || showVideo) && (
              <Box sx={{ width: "100%", aspectRatio: "16/9", background: "var(--bg-soft)" }}>
                {showImage ? (
                  <img src={image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <video src={video_url} controls autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </Box>
            )}

            <Box sx={{ p: { xs: 3, md: 5 } }}>
              <Box sx={{ display:"flex", alignItems:"center", gap:1.5, mb:3 }}>
                <Box sx={{ 
                  background: cat.color, color: "#fff", 
                  px: 2, py: 0.5, borderRadius: "8px", 
                  fontSize: "11px", fontWeight: "900"
                }}>
                  {cat.label}
                </Box>
                <Box sx={{ 
                  background: isSevere || incident.sentiment === "negative" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
                  color: isSevere || incident.sentiment === "negative" ? "var(--red)" : "var(--blue)",
                  px: 2, py: 0.5, borderRadius: "8px", fontSize: "11px", fontWeight: "800",
                  border: `1px solid ${isSevere || incident.sentiment === "negative" ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)"}`
                }}>
                  SEVERITY: {isSevere ? "CRITICAL" : (incident.sentiment === "negative" ? "HIGH" : "MODERATE")}
                </Box>
              </Box>

              <Typography variant="h3" sx={{ 
                fontSize: { xs: "1.75rem", md: "2.25rem" }, 
                fontWeight: 900, 
                lineHeight: 1.1, 
                mb: 2, 
                color: "var(--text-primary)",
                fontFamily: "'Outfit', sans-serif"
              }}>
                {displayTitle}
              </Typography>
              
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", fontSize: "13px", color: "var(--text-secondary)", mb: 4 }}>
                <Typography sx={{ fontWeight: 800 }}>{new Date(date).toLocaleDateString()}</Typography>
                <span>•</span>
                <Typography sx={{ fontWeight: 800 }}>BY {displayAuthor.toUpperCase()}</Typography>
              </Box>

              <Typography sx={{ 
                fontSize: "1.1rem", 
                lineHeight: 1.8, 
                color: "var(--text-primary)", 
                whiteSpace: "pre-wrap",
                fontWeight: 500
              }}>
                {displayContent}
              </Typography>

              <Box sx={{ mt: 5, pt: 3, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                <IconButton 
                  onClick={handleShare}
                  sx={{
                    background: "var(--accent)", color: "#fff",
                    borderRadius: "16px", px: 3, py: 1.5,
                    "&:hover": { background: "var(--accent)", filter: "brightness(1.1)" },
                    display: "flex", gap: 1
                  }}
                >
                  <Share2 size={20} />
                  <Typography sx={{fontWeight: 800, fontSize: 14}}>SHARE NEWS</Typography>
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
}
