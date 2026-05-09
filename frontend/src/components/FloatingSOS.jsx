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
    startSOSSequence();
  };

  const startSOSSequence = async () => {
    setIsActivating(true);
    setStatus("Acquiring Location...");
    
    try {
      const gps = await getRealDeviceLocation();
      const [lat, lon] = gps || [31.5892, 76.9189]; // Fallback to Mandi if GPS fails
      setPatientPos([lat, lon]);
      
      const hospital = getNearestHospital(lat, lon);
      setNearestH(hospital);
      
      setStatus("SMS Sent. Calling Emergency...");

      let realUserName = "IntelliCrash User";
      try {
        const ic_user = JSON.parse(localStorage.getItem("ic_user") || "{}");
        realUserName = ic_user.email?.split("@")[0] || ic_user.name || "Emergency Caller";
      } catch {}

      // Voice alert
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance("SOS activated. SMS sent. Making emergency call to your contacts. Ambulance tracking started.");
        window.speechSynthesis.speak(msg);
      }

      // Fire and forget SOS API call to avoid blocking
      triggerSOS({
        lat,
        lon,
        auto_crash: false,
        user_name: realUserName,
        address: `Priority emergency alert near ${hospital.name}`
      }).catch(err => console.error("SOS Trigger failed:", err));

      // Get first emergency contact or fallback to ambulance
      let phoneToCall = AMBULANCE_NUMBER;
      try {
        const contacts = JSON.parse(localStorage.getItem("ic_contacts") || "[]");
        if (contacts.length > 0 && contacts[0].phone) {
          phoneToCall = contacts[0].phone;
        }
      } catch (e) {}

      // Trigger actual phone call
      window.location.href = `tel:${phoneToCall}`;

      setShowTracker(true);
      setShowConfirm(false);
      setIsActivating(false);

    } catch (err) {
      console.error("SOS Trigger Sequence Error:", err);
      setStatus("Manual Call Required");
      setTimeout(() => setIsActivating(false), 3000);
    }
  };

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
                fontSize: 24, fontWeight: 900, mb: 1, letterSpacing: -1, color: "#1e293b",
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
            <Box sx={{ py: 2 }}>
              <CircularProgress sx={{ color: "#ff3d00" }} />
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
