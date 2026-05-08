import React, { useState, useEffect } from "react";
import { Box, Typography, Modal, CircularProgress } from "@mui/material";
import { Phone, Warning, LocalHospital, GpsFixed } from "@mui/icons-material";
import { triggerSOS, getRealDeviceLocation } from "../services/api";
import AmbulanceTracker from "./AmbulanceTracker";

const AMBULANCE_NUMBER = "9015162007"; 

// Predefined major hospitals in HP for 'Nearest' logic
const HP_HOSPITALS = [
  { name: "IGMC Shimla", lat: 31.1075, lon: 77.1858 },
  { name: "Tanda Medical College", lat: 32.1025, lon: 76.2734 },
  { name: "Mandi Med. College", lat: 31.5892, lon: 76.9189 },
  { name: "Hamirpur Hospital", lat: 31.6862, lon: 76.5215 },
  { name: "Kullu Hospital", lat: 31.9578, lon: 77.1094 },
  { name: "Chamba Hospital", lat: 32.5534, lon: 76.1258 },
  { name: "Solan Hospital", lat: 30.9084, lon: 77.1015 }
];

function getNearestHospital(lat, lon) {
  let nearest = HP_HOSPITALS[0];
  let minDist = Infinity;
  HP_HOSPITALS.forEach(h => {
    const d = Math.sqrt(Math.pow(h.lat - lat, 2) + Math.pow(h.lon - lon, 2));
    if (d < minDist) {
      minDist = d;
      nearest = h;
    }
  });
  return nearest;
}

export default function FloatingSOS() {
  const [isActivating, setIsActivating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(1);
  const [status, setStatus] = useState("");
  const [nearestH, setNearestH] = useState(null);
  const [showTracker, setShowTracker] = useState(false);
  const [patientPos, setPatientPos] = useState(null);
  
  useEffect(() => {
    const handleGlobalTrigger = () => handleSOSClick();
    window.addEventListener("trigger_intellicrash_sos", handleGlobalTrigger);
    return () => window.removeEventListener("trigger_intellicrash_sos", handleGlobalTrigger);
  }, []);

  const handleSOSClick = () => {
    setShowConfirm(true);
    setCountdown(1);
  };

  const startSOSSequence = async () => {
    setIsActivating(true);
    setStatus("Establishing Satellite Link...");
    
    try {
      // Phase 1: Location Acquisition (AUTHENTIC ONLY)
      const gps = await getRealDeviceLocation();
      if (!gps) {
        throw new Error("Unable to acquire authentic GPS fix. Please ensure location services are enabled and try again.");
      }
      const [lat, lon] = gps;
      setPatientPos([lat, lon]);
      
      // Get real user name
      let realUserName = "IntelliCrash User";
      try {
        const ic_user = JSON.parse(localStorage.getItem("ic_user") || "{}");
        realUserName = ic_user.email?.split("@")[0] || ic_user.name || "Emergency Caller";
      } catch {}

      // Phase 2: Hospital Identification
      const hospital = getNearestHospital(lat, lon);
      setNearestH(hospital);
      
      // Phase 3: Trigger Alert
      await triggerSOS({
        lat,
        lon,
        auto_crash: false,
        user_name: realUserName,
        address: `Priority emergency alert near ${hospital.name}`
      });

      // Phase 4: Finalize & Open Tracker Immediately
      window.location.href = `tel:${AMBULANCE_NUMBER}`;
      
      setStatus("Unit Dispatched");
      setShowTracker(true);
      // Close the confirm/activating modal so tracker is seen immediately
      setShowConfirm(false);
      setIsActivating(false);

    } catch (err) {
      console.error("SOS Trigger failed:", err);
      setStatus("Manual Call Required");
      setTimeout(() => setIsActivating(false), 3000);
    }
  };

  useEffect(() => {
    let timer;
    if (showConfirm && !isActivating && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (showConfirm && !isActivating && countdown === 0) {
      startSOSSequence();
    }
    return () => clearTimeout(timer);
  }, [showConfirm, countdown, isActivating]);

  return (
    <>
      {/* Moved to Bottom Left to separate from Chatbot */}
      <Box
        onClick={handleSOSClick}
        sx={{
          position: "fixed",
          bottom: 25,
          left: 25,
          zIndex: 10000,
          width: 70,
          height: 70,
          borderRadius: "24px",
          background: "linear-gradient(135deg, #ff3d00, #d50000)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 12px 40px rgba(255, 0, 0, 0.4), inset 0 2px 2px rgba(255,255,255,0.4)",
          transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          animation: "sosPulse 2s infinite",
          "@keyframes sosPulse": {
            "0%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(255, 61, 0, 0.7)" },
            "70%": { transform: "scale(1.05)", boxShadow: "0 0 0 15px rgba(255, 61, 0, 0)" },
            "100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(255, 61, 0, 0)" }
          },
          "&:hover": { transform: "scale(1.1) rotate(-5deg)", boxShadow: "0 20px 50px rgba(255, 0, 0, 0.6)" }
        }}
      >
        <Phone sx={{ color: "#fff", fontSize: 32 }} />
        <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#fff", mt: -0.5 }}>SOS</Typography>
      </Box>

      <Modal
        open={showConfirm}
        onClose={() => !isActivating && setShowConfirm(false)}
        sx={{ 
          display: "flex", alignItems: "center", justifyContent: "center", p: 2, 
          backdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(0,0,0,0.5)"
        }}
      >
        <Box sx={{
          background: "rgba(255, 255, 255, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: "40px",
          p: 6,
          maxWidth: 460,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 64px 128px -32px rgba(0,0,0,0.6)",
          color: "#0f172a",
          position: "relative",
          overflow: "hidden",
          animation: "modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          "@keyframes modalSlideUp": {
            from: { opacity: 0, transform: "translateY(40px) scale(0.95)" },
            to: { opacity: 1, transform: "translateY(0) scale(1)" }
          }
        }}>
          {/* Orbital Scan Animation */}
          <Box sx={{
            position: "absolute", top: -100, left: -100, right: -100, bottom: -100,
            background: "radial-gradient(circle at center, rgba(255, 61, 0, 0.03) 0%, transparent 70%)",
            animation: "orbitalRotate 10s infinite linear",
            pointerEvents: "none",
            "@keyframes orbitalRotate": {
              from: { transform: "rotate(0deg)" },
              to: { transform: "rotate(360deg)" }
            }
          }} />

          {isActivating ? (
            <Box sx={{ py: 2, position: "relative" }}>
              <Box sx={{ position: 'relative', display: 'inline-flex', mb: 5 }}>
                {/* Layered Radar Rings */}
                {[1, 2, 3, 4].map(i => (
                  <Box key={i} sx={{
                    position: "absolute", inset: -30, borderRadius: "50%",
                    border: "1px solid rgba(255, 61, 0, 0.4)",
                    animation: `radarWave ${3 + i}s infinite cubic-bezier(0.4, 0, 0.2, 1)`,
                    animationDelay: `${i * 0.5}s`,
                    opacity: 0,
                    "@keyframes radarWave": {
                      "0%": { transform: "scale(0.5)", opacity: 0.8 },
                      "100%": { transform: "scale(2)", opacity: 0 }
                    }
                  }} />
                ))}
                
                <Box sx={{ 
                  width: 120, height: 120, borderRadius: "50%", 
                  background: "linear-gradient(135deg, #fff, #f8fafc)",
                  boxShadow: "0 20px 60px rgba(255, 61, 0, 0.25), inset 0 2px 4px rgba(255,255,255,1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 2
                }}>
                  <GpsFixed sx={{ color: "#ff3d00", fontSize: 56, animation: "pulseOpacity 2s infinite" }} />
                </Box>
              </Box>
              
              <Typography sx={{ 
                fontSize: 32, fontWeight: 900, mb: 1, letterSpacing: -1.5, color: "#1e293b",
                background: "linear-gradient(135deg, #1e293b, #475569)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>
                {status}
              </Typography>
              
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 3 }}>
                {[0, 1, 2].map(i => (
                  <Box key={i} sx={{ 
                    width: 6, height: 6, borderRadius: "50%", background: "#ff3d00",
                    animation: "dotJump 1s infinite",
                    animationDelay: `${i * 0.2}s`,
                    "@keyframes dotJump": {
                      "0%, 100%": { transform: "translateY(0)" },
                      "50%": { transform: "translateY(-6px)" }
                    }
                  }} />
                ))}
              </Box>

              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 2 }}>
                Global Emergency Protocol Active
              </Typography>
            </Box>
          ) : (
            <Box sx={{ position: "relative" }}>
              <Box sx={{ 
                width: 100, height: 100, borderRadius: "32px", 
                background: "linear-gradient(135deg, #fff, #fef2f2)", 
                border: "1px solid rgba(255, 61, 0, 0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 40px",
                boxShadow: "0 24px 48px rgba(255, 61, 0, 0.12)"
              }}>
                <LocalHospital sx={{ fontSize: 52, color: "#ff3d00" }} />
              </Box>
              
              <Typography sx={{ fontSize: 38, fontWeight: 950, mb: 2, letterSpacing: -2, color: "#0f172a", lineHeight: 0.9 }}>
                EMERGENCY<br />DISPATCH
              </Typography>
              
              <Typography sx={{ fontSize: 17, color: "#475569", mb: 6, lineHeight: 1.6, fontWeight: 500 }}>
                Establishing a priority link with the nearest HP Medical Command Base.
              </Typography>
              
              <Box sx={{ position: "relative", height: 140, mb: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Box sx={{ 
                  position: "absolute", inset: 0, borderRadius: "50%", 
                  border: "2px dashed rgba(255, 61, 0, 0.1)",
                  animation: "spin 20s infinite linear"
                }} />
                <Typography sx={{ 
                  fontSize: 120, fontWeight: 950, color: "#ff3d00", 
                  textShadow: "0 10px 50px rgba(255, 61, 0, 0.4)",
                  lineHeight: 1, letterSpacing: -8, position: "relative"
                }}>
                  {countdown}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 2.5 }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    flex: 1, padding: "22px", borderRadius: "24px", border: "1.5px solid #e2e8f0",
                    background: "#fff", color: "#64748b", fontWeight: 800, cursor: "pointer",
                    fontSize: "15px", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    letterSpacing: 0.5
                  }}
                  onMouseEnter={e => { e.target.style.background = "#f8fafc"; e.target.style.transform = "scale(0.98)"; }}
                  onMouseLeave={e => { e.target.style.background = "#fff"; e.target.style.transform = "scale(1)"; }}
                >
                  ABORT
                </button>
                <button
                  onClick={startSOSSequence}
                  style={{
                    flex: 2, padding: "22px", borderRadius: "24px", border: "none",
                    background: "linear-gradient(135deg, #ff3d00, #dc2626)", 
                    color: "#fff", fontWeight: 900, cursor: "pointer",
                    fontSize: "16px", boxShadow: "0 16px 40px rgba(255, 61, 0, 0.4)",
                    letterSpacing: 1, transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                  onMouseEnter={e => e.target.style.transform = "scale(1.02) translateY(-4px)"}
                  onMouseLeave={e => e.target.style.transform = "scale(1) translateY(0)"}
                >
                  CALL BASE NOW
                </button>
              </Box>
            </Box>
          )}
        </Box>
      </Modal>

      {showTracker && (
        <AmbulanceTracker 
          patientPos={patientPos} 
          hospitalPos={nearestH} 
          onClose={() => {
            setShowTracker(false);
            setShowConfirm(false);
            setIsActivating(false);
          }} 
        />
      )}
    </>
  );
}
