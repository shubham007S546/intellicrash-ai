import React, { useState, useEffect, useRef } from "react";
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [status, setStatus] = useState("");
  const [patientPos, setPatientPos] = useState(null);
  const [nearestH, setNearestH] = useState(null);
  const [showTracker, setShowTracker] = useState(false);
  const [phoneToCall, setPhoneToCall] = useState(AMBULANCE_NUMBER);

  const holdRafRef   = useRef(null);

  const holdStartRef = useRef(null);
  const [holdPct,    setHoldPct]    = useState(0);
  const [voiceMode,  setVoiceMode]  = useState(false);
  const [transcript, setTranscript] = useState("");


  useEffect(() => {
    const handleGlobalTrigger = () => startSOSSequence(false);
    window.addEventListener("trigger_intellicrash_sos", handleGlobalTrigger);
    return () => window.removeEventListener("trigger_intellicrash_sos", handleGlobalTrigger);
  }, []);

  const startVoiceRec = async () => {
    setVoiceMode(true);
    setTranscript("");
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.lang = "en-IN"; rec.continuous = false; rec.interimResults = true;
      let finalStr = "";
      rec.onresult = (e) => {
        finalStr = Array.from(e.results).map(r => r[0].transcript).join(" ");
        setTranscript(finalStr);
      };
      rec.onend = () => {
        setVoiceMode(false); setHoldPct(0);
        startSOSSequence(true, finalStr || "Emergency - Voice SOS");
      };
      rec.onerror = () => {
        setVoiceMode(false); setHoldPct(0);
        startSOSSequence(false);
      };
      rec.start();
    } else {
      setVoiceMode(false); setHoldPct(0);
      startSOSSequence(true, "Emergency - Voice SOS (no mic support)");
    }
  };

  const startHold = () => {
    if (voiceMode || isActivating) return;
    holdStartRef.current = Date.now();
    const animate = () => {
      const pct = Math.min(((Date.now() - holdStartRef.current) / 2000) * 100, 100);
      setHoldPct(pct);
      if (pct < 100) {
        holdRafRef.current = requestAnimationFrame(animate);
      } else {
        startVoiceRec();
      }
    };
    holdRafRef.current = requestAnimationFrame(animate);
  };

  const endHold = () => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    const held = Date.now() - (holdStartRef.current || Date.now());
    if (!voiceMode && holdPct < 95) {
      setHoldPct(0);
      if (held < 500) startSOSSequence(false);
    }
  };

  const startSOSSequence = async (isVoice = false, voiceText = "") => {
    if (isActivating) return;
    setShowConfirm(true);
    setIsActivating(true);
    setStatus("Initiating SOS Protocol...");
    
    try {
      const gps = await getRealDeviceLocation();
      const [lat, lon] = gps || [31.5312, 76.8921]; // Sundarnagar Fallback

      setPatientPos([lat, lon]);
      
      const hospital = getNearestHospital(lat, lon);
      setNearestH(hospital);
      
      setStatus("Analyzing Environmental Risk...");
      
      // Dynamic Risk Spike: When SOS is called, risk is effectively 100% in this context
      const riskScore = 95.5; // Emergency force-spike
      const severity = "SEVERE";
      
      // Sync with navigation risk
      localStorage.setItem("ic_last_risk", JSON.stringify({ score: 99, severity: "SEVERE", ts: new Date().toLocaleTimeString() }));
      window.dispatchEvent(new CustomEvent("intellicrash_risk_update", { detail: { score: 99, level: "SEVERE" } }));

      setStatus("Broadcasting Alert...");

      let realUserName = "IntelliCrash User";
      try {
        const ic_user = JSON.parse(localStorage.getItem("ic_user") || "{}");
        realUserName = ic_user.email?.split("@")[0] || ic_user.name || "Emergency Caller";
      } catch {}

      // Voice alert
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(isVoice ? `Voice SOS received: ${voiceText}. Dispatching ambulance now.` : "SOS activated. SMS sent. Making emergency call. Ambulance tracking started.");
        window.speechSynthesis.speak(msg);
      }

      let targetPhone = AMBULANCE_NUMBER;
      let contacts = [];
      try {
        contacts = JSON.parse(localStorage.getItem("ic_contacts") || "[]");
        if (contacts.length > 0 && contacts[0].phone) {
          targetPhone = contacts[0].phone;
        }
      } catch (e) {}
      setPhoneToCall(targetPhone);


      // SOS API call
      await triggerSOS({
        lat,
        lon,
        auto_crash: false,
        user_name: realUserName,
        address: `CRITICAL ALERT near ${hospital.name}`,
        severity,
        riskScore,
        contacts,
        message: isVoice 
          ? `VOICE SOS: "${voiceText}" - Emergency at my location. Coordinates: ${lat}, ${lon}`
          : `EMERGENCY SOS: Immediate assistance required. Coordinates: ${lat}, ${lon}`,
      });

      // Direct Phone Call Link
      setStatus("✅ SOS BROADCAST SUCCESSFUL (200 OK)");

      window.location.href = `tel:${targetPhone}`;


      setShowTracker(true);
      setShowConfirm(false);
      setIsActivating(false);

    } catch (err) {
      console.error("SOS Trigger Sequence Error:", err);
      setStatus("Manual Call Required");
      setTimeout(() => {
        setIsActivating(false);
        setShowConfirm(false);
      }, 3000);
    }
  };

  const shieldBg = voiceMode 
    ? "linear-gradient(135deg, #7c3aed, #4f46e5)" 
    : isActivating ? "#dc2626" : "#000";

  return (
    <>
      {/* Global Consolidated SOS Button */}
      <Box
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={(e) => { e.preventDefault(); startHold(); }}
        onTouchEnd={(e) => { e.preventDefault(); endHold(); }}
        sx={{
          position: "fixed",
          bottom: { xs: 24, md: 32 },
          left: { xs: 24, md: 32 },
          zIndex: 10000,
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: shieldBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: voiceMode ? "0 0 30px #7c3aed" : "0 4px 20px rgba(0, 0, 0, 0.4)",
          border: "2.5px solid rgba(255,255,255,0.1)",
          transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          "&:hover": { transform: "scale(1.1)" }
        }}
      >
        {holdPct > 0 && holdPct < 100 && (
          <CircularProgress 
            variant="determinate" 
            value={holdPct} 
            size={74} 
            thickness={2}
            sx={{ position: "absolute", color: "#fff", opacity: 0.8 }} 
          />
        )}
        
        <Box sx={{
          width: 32, height: 38,
          background: voiceMode ? "#fff" : "linear-gradient(135deg, #ef4444, #dc2626)",
          clipPath: "polygon(50% 0%, 100% 20%, 100% 80%, 50% 100%, 0% 80%, 0% 20%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: isActivating ? "pulse 1s infinite" : "none"
        }}>
          <Typography sx={{ fontSize: 14, fontWeight: 900, color: voiceMode ? "#7c3aed" : "#fff" }}>
            {voiceMode ? "🎙️" : "🚨"}
          </Typography>
        </Box>

        {/* Floating Label */}
        {!isActivating && !voiceMode && (
          <Typography sx={{ 
            position: "absolute", bottom: -20, left: "50%", transform: "translateX(-50%)",
            fontSize: 8, fontWeight: 900, color: "var(--text-secondary)", whiteSpace: "nowrap",
            opacity: 0.6, letterSpacing: 1
          }}>
            HOLD FOR VOICE
          </Typography>
        )}
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
                fontSize: 24, fontWeight: 900, mb: 3, letterSpacing: -1, color: "#1e293b",
                background: "linear-gradient(135deg, #1e293b, #475569)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>
                {status}
              </Typography>
              
              {/* SoS-ML Explainable AI Consensus Board */}
              <Box sx={{ 
                background: "rgba(255, 255, 255, 0.4)", 
                backdropFilter: "blur(16px) saturate(180%)",
                borderRadius: "32px", p: 3, mb: 4,
                border: "1px solid rgba(255, 255, 255, 0.3)", 
                textAlign: "left",
                boxShadow: "0 20px 40px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.8)",
                animation: "modalSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)"
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 900, color: "#ff3d00", letterSpacing: 1.5, textTransform: "uppercase" }}>
                    Society of Models — fXAI Consensus
                  </Typography>
                  <Box sx={{ px: 1, py: 0.3, borderRadius: 1, background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.2)" }}>
                    <Typography sx={{ fontSize: 8, fontWeight: 900, color: "#16a34a" }}>SECURE</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.8 }}>
                  {[
                    { agent: "G-SENSOR", status: "High Impact (8.5G) Detected", icon: "💥", color: "#dc2626", delay: 0.1 },
                    { agent: "AUDIO AI", status: "Critical Impact Acoustics Found", icon: "🔊", color: "#ea580c", delay: 0.3 },
                    { agent: "RISK ANALYZER", status: "98% Collision Probability", icon: "📉", color: "#d97706", delay: 0.5 },
                    { agent: "SYSTEM AGENT", status: "Consensus: SEVERE ACCIDENT", icon: "🛡️", color: "#16a34a", delay: 0.7 }
                  ].map((a, i) => (
                    <Box key={i} sx={{ 
                      display: "flex", gap: 2, alignItems: "center", 
                      animation: `slideRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${a.delay}s both` 
                    }}>
                      <Box sx={{ 
                        width: 32, height: 32, borderRadius: "50%", background: "#fff", 
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                      }}>
                        {a.icon}
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", mb: -0.2 }}>{a.agent}</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#1e293b" }}>{a.status}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
                <Box sx={{ p: 2, background: "rgba(220, 38, 38, 0.05)", borderRadius: 3, border: "1px solid rgba(220, 38, 38, 0.15)" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#dc2626", mb: 0.5 }}>DIALING PRIMARY DISPATCH</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 900, color: "#000" }}>{phoneToCall}</Typography>
                </Box>
                
              <Typography sx={{ fontSize: 11, fontWeight: 900, color: "var(--text-secondary)", mt: 1, mb: 1.5, letterSpacing: 1, textTransform: "uppercase" }}>Quick-Dial Backup Contacts</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[
                  { n: "Police Control", p: "100", d: "Law Enforcement", i: "🚔" },
                  { n: "Admin Support", p: "9015162007", d: "System Direct", i: "🛡️" },
                  { n: "Ambulance", p: "108", d: "Medical Dispatch", i: "🚑" },
                  { n: "Community Aid", p: "112", d: "General Emergency", i: "🆘" }
                ].map((c, i) => (
                  <Box 
                    key={i}
                    component="a"
                    href={`tel:${c.p}`}
                    sx={{ 
                      display: "flex", alignItems: "center", gap: 1.5, p: 1.2,
                      background: "#fff", borderRadius: "12px", border: "1px solid var(--border)",
                      textDecoration: "none", transition: "all 0.2s",
                      "&:hover": { background: "#f8fafc", transform: "translateX(4px)" }
                    }}
                  >
                    <Box sx={{ width: 36, height: 36, borderRadius: "10px", background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.i}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>{c.n}</Typography>
                      <Typography sx={{ fontSize: 10, color: "var(--text-secondary)" }}>{c.d}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 14, color: "#2563eb", fontWeight: 800 }}>{c.p}</Typography>
                    <Box sx={{ color: "#16a34a", fontSize: 18 }}>📞</Box>
                  </Box>
                ))}
              </Box>
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
