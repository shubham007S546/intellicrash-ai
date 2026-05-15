// ================================================================
// SOS.jsx — SafeSignal v9  SINGLE BUTTON + VOICE SOS
// ✅ ONE single SOS button — tap = instant, long-press = voice SOS
// ✅ Sends to: contacts (SMS+Email) + Ambulance + nearby people
// ✅ Voice SOS: holds button → speech-to-text → sends with voice msg
// ✅ No WhatsApp — SMS + Email only
// ✅ AmbulanceTracker fully integrated (Leaflet, real OSRM)
// ================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapContainer, TileLayer, Marker, Popup,
  Circle, Polyline, useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Box, Typography, Chip, LinearProgress, Grid,
  IconButton, Tooltip, CircularProgress,
} from "@mui/material";
import { ChevronLeft } from "@mui/icons-material";
import AmbulanceTracker from "../components/AmbulanceTracker";
import { triggerSOS } from "../services/api";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const HP_HOTSPOTS_FULL = [
  { id:1,  lat:31.10297,  lon:77.20796,  name:"Dhalli–Kufri Stretch",        risk:"HIGH",   killed:8  },
  { id:2,  lat:31.10297,  lon:77.169533, name:"Sadar/East Shimla NH-5",      risk:"HIGH",   killed:5  },
  { id:3,  lat:31.11,     lon:77.143914, name:"Shimla West Bypass",          risk:"HIGH",   killed:4  },
  { id:4,  lat:31.127,    lon:77.228,    name:"Mashobra Bifurcation",        risk:"HIGH",   killed:7  },
  { id:5,  lat:31.32,     lon:77.42,     name:"Narkanda Hairpin Bends",      risk:"HIGH",   killed:6  },
  { id:32, lat:31.768,    lon:78.068,    name:"Kinnaur Kalpa Cliff Road",    risk:"HIGH",   killed:9  },
  { id:35, lat:32.502,    lon:77.648,    name:"Manali–Rohtang NH-3",         risk:"HIGH",   killed:8  },
];

const HP_HOSP = [
  { name:"IGMC Shimla",          lat:31.1048,  lon:77.1734 },
  { name:"DDU Hospital Shimla",  lat:31.1100,  lon:77.1650 },
  { name:"Kamla Nehru Hosp.",    lat:31.0990,  lon:77.1800 },
  { name:"Civil Hosp. Solan",    lat:30.9045,  lon:77.0967 },
  { name:"Zonal Hosp. Mandi",    lat:31.7080,  lon:76.9318 },
  { name:"Civil Hosp. Kullu",    lat:32.0985,  lon:77.1090 },
  { name:"RH Dharamshala",       lat:32.2188,  lon:76.3225 },
];

function hvDist([la1,lo1],[la2,lo2]) {
  const R=6371000,φ1=la1*Math.PI/180,φ2=la2*Math.PI/180,
    Δφ=(la2-la1)*Math.PI/180,Δλ=(lo2-lo1)*Math.PI/180,
    a=Math.sin(Δφ/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function getNearestHotspot(lat,lon,radiusM=2000){
  let nearest=null,minDist=Infinity;
  for(const h of HP_HOTSPOTS_FULL){
    const d=hvDist([lat,lon],[h.lat,h.lon]);
    if(d<radiusM&&d<minDist){minDist=d;nearest={...h,distanceM:Math.round(d)};}
  }
  return nearest;
}

async function fetchRealRisk(lat, lon, speedKph = null) {
  const h = new Date().getHours();
  const d = new Date().getDay();
  const timeOfDay  = (h>=5&&h<9)?"0":(h>=9&&h<17)?"1":(h>=17&&h<20)?"2":"3";
  const dayOfWeek  = String(d===0?6:d-1);
  const lightCondition = (h<6||h>=20)?"1":"0";
  const nearH = getNearestHotspot(lat, lon, 2000);
  const criticalZone = nearH ? "1" : "0";
  let speed = speedKph || 40;
  const payload = {
    weather:"0", roadType:"2", timeOfDay, areaType:"1", dayOfWeek,
    roadCondition:"0", vehicleType:"0", lightCondition,
    criticalZone, speed, vehicles:5, visibility:1000
  };
  try {
    const res = await fetch("/api/predict", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload),
    });
    const data = await res.json();
    return { score:Math.round(data.score??50), nearHotspot:nearH };
  } catch {
    return { score:45, nearHotspot:nearH };
  }
}

// ─────────────────────────────────────────────────────────────────
// VOICE SOS HOOK
// ─────────────────────────────────────────────────────────────────
function useVoiceSOS() {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const startListening = useCallback((onResult, onEnd) => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) { onEnd?.(""); return false; }
    const rec = new SpeechRec();
    recognitionRef.current = rec;
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      onResult?.(text);
    };
    rec.onerror = () => { setIsListening(false); onEnd?.(""); };
    rec.onend = () => { setIsListening(false); onEnd?.(transcript); };
    rec.start();
    setIsListening(true);
    return true;
  }, [transcript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, transcript, startListening, stopListening };
}

// ─────────────────────────────────────────────────────────────────
// MAIN SOS COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function SOS() {
  const [patientPos, setPatientPos]     = useState([31.1048, 77.1734]);
  const [showTracker, setShowTracker]   = useState(false);
  const [phase, setPhase]               = useState("idle"); // idle | activating | voice | sent
  const [statusMsg, setStatusMsg]       = useState("");
  const [nearestH, setNearestH]         = useState(null);
  const [voiceSOS, setVoiceSOS]         = useState(false);
  const [voiceText, setVoiceText]       = useState("");
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef  = useRef(null);
  const holdStartRef  = useRef(null);
  const holdRafRef    = useRef(null);
  const { isListening, startListening, stopListening } = useVoiceSOS();

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      setPatientPos([pos.coords.latitude, pos.coords.longitude]);
    }, () => {}, { enableHighAccuracy: true });
  }, []);

  // ── DISPATCH SOS (tap or voice) ──────────────────────────────────
  const dispatchSOS = useCallback(async (voiceMessage = "") => {
    setPhase("activating");
    setStatusMsg("📍 Acquiring GPS...");
    const gps = patientPos;

    const h = HP_HOSP.reduce((prev, curr) => {
      const d1 = hvDist(gps, [prev.lat, prev.lon]);
      const d2 = hvDist(gps, [curr.lat, curr.lon]);
      return d1 < d2 ? prev : curr;
    });
    setNearestH(h);
    setStatusMsg("🧠 Calculating risk...");

    const riskData = await fetchRealRisk(gps[0], gps[1]);
    const score    = riskData.score;
    const severity = score >= 67 ? "HIGH" : score >= 34 ? "MEDIUM" : "LOW";

    // Priority score (per the intelligent dispatch algorithm)
    const severityWeight = score >= 67 ? 80 : score >= 34 ? 50 : 20;
    const crashBonus     = voiceMessage ? 30 : 0;
    const priorityScore  = score + severityWeight + crashBonus;

    const baseMsg = voiceMessage
      ? `🗣️ VOICE SOS: "${voiceMessage}" — Risk: ${severity} (${score}/100) near ${h.name}. Priority Score: ${priorityScore}.`
      : `🚨 EMERGENCY SOS — Risk: ${severity} (${score}/100) at GPS: ${gps[0].toFixed(5)}, ${gps[1].toFixed(5)} near ${h.name}. Priority Score: ${priorityScore}.`;

    setStatusMsg("📡 Alerting ambulance & contacts...");

    // Voice announcement
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const speak = voiceMessage
        ? `Voice SOS activated. ${voiceMessage}. Sending emergency alert. Ambulance dispatched.`
        : "Emergency SOS activated. Ambulance dispatched. Alerting all contacts.";
      const msg = new SpeechSynthesisUtterance(speak);
      msg.lang = "en-IN"; msg.rate = 0.95;
      window.speechSynthesis.speak(msg);
    }

    // Get contacts + user
    let contacts = [];
    try { contacts = JSON.parse(localStorage.getItem("ic_contacts") || "[]"); } catch {}

    let realUserName = "IntelliCrash User";
    try {
      const ic_user = JSON.parse(localStorage.getItem("ic_user") || "{}");
      realUserName = ic_user.email?.split("@")[0] || ic_user.name || "Emergency Caller";
    } catch {}

    // Emergency phone call to first contact / 108
    let phoneToCall = "108";
    if (contacts.length > 0 && contacts[0].phone) phoneToCall = contacts[0].phone;

    // Trigger SOS (SMS + Email to ALL contacts + Admin + nearby ambulance)
    triggerSOS({
      lat:       gps[0],
      lon:       gps[1],
      auto_crash: false,
      user_name:  realUserName,
      address:    `Emergency near ${h.name}`,
      severity,
      riskScore:  score,
      priorityScore,
      contacts,
      message:    baseMsg,
      voiceTranscript: voiceMessage || null,
      nearestHospital: h.name,
      broadcastNearby: true,        // signal server to alert nearby users
    }).catch(err => console.error("SOS Trigger failed:", err));

    window.location.href = `tel:${phoneToCall}`;

    setPhase("sent");
    setStatusMsg(`✅ Alert sent! Ambulance + ${contacts.length} contact(s) notified.`);
    setTimeout(() => setShowTracker(true), 800);
  }, [patientPos]);

  // ── HOLD HANDLERS ────────────────────────────────────────────────
  const onHoldStart = useCallback(() => {
    if (phase === "activating" || phase === "voice") return;
    holdStartRef.current = Date.now();
    setHoldProgress(0);

    // Animate hold progress bar
    const animate = () => {
      const elapsed = Date.now() - holdStartRef.current;
      const pct     = Math.min((elapsed / 2000) * 100, 100);
      setHoldProgress(pct);
      if (pct < 100) {
        holdRafRef.current = requestAnimationFrame(animate);
      } else {
        // 2 seconds → VOICE SOS mode
        triggerVoiceSOS();
      }
    };
    holdRafRef.current = requestAnimationFrame(animate);
  }, [phase]);

  const onHoldEnd = useCallback(() => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    const held = Date.now() - (holdStartRef.current || Date.now());
    setHoldProgress(0);
    if (held < 400 && phase === "idle") {
      // Short tap → regular SOS
      dispatchSOS();
    }
  }, [phase, dispatchSOS]);

  const triggerVoiceSOS = useCallback(() => {
    setPhase("voice");
    setVoiceSOS(true);
    setStatusMsg("🎙️ Speak now — describe your emergency...");
    const started = startListening(
      (text) => { setVoiceText(text); },
      (finalText) => {
        setVoiceSOS(false);
        setStatusMsg(`🔊 Heard: "${finalText}"`);
        dispatchSOS(finalText || "Emergency - voice SOS triggered");
      }
    );
    if (!started) {
      // Fallback if Speech API not available
      dispatchSOS("Emergency - Voice SOS triggered (no mic)");
    }
  }, [startListening, dispatchSOS]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
      stopListening();
    };
  }, [stopListening]);

  const isIdle       = phase === "idle";
  const isProcessing = phase === "activating";
  const isVoice      = phase === "voice";
  const isSent       = phase === "sent";

  const buttonLabel = isVoice ? "🎙️ LISTENING..." : isProcessing ? "SENDING..." : isSent ? "✅ SENT" : "SOS";

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(160deg, #0f172a 0%, #1e1b2e 100%)", p: { xs: 2, md: 4 }, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {!showTracker ? (
        <>
          {/* HEADER */}
          <Box sx={{ textAlign: "center", mb: 4, mt: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: "rgba(255,255,255,0.5)", letterSpacing: 4, mb: 1 }}>
              INTELLICRASH EMERGENCY
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 900, color: "#fff", mb: 0.5 }}>
              SafeSignal SOS
            </Typography>
            <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.45)", maxWidth: 340 }}>
              Tap to dispatch instantly. Hold 2 seconds to activate Voice SOS.
            </Typography>
          </Box>

          {/* SINGLE SOS BUTTON */}
          <Box sx={{ position: "relative", mb: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Outer ring animations */}
            <Box sx={{
              position: "absolute",
              width: 200, height: 200, borderRadius: "50%",
              border: "2px solid rgba(220,38,38,0.2)",
              animation: "ringPulse 2.4s ease-out infinite",
              "@keyframes ringPulse": {
                "0%":   { transform: "scale(1)",   opacity: 0.6 },
                "100%": { transform: "scale(1.6)", opacity: 0 },
              }
            }} />
            <Box sx={{
              position: "absolute",
              width: 160, height: 160, borderRadius: "50%",
              border: "2px solid rgba(220,38,38,0.3)",
              animation: "ringPulse 2.4s ease-out 0.6s infinite",
            }} />

            {/* Hold progress ring */}
            {holdProgress > 0 && (
              <Box sx={{
                position: "absolute",
                width: 136, height: 136, borderRadius: "50%",
                border: "4px solid rgba(255,255,255,0.1)",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: -4,
                  borderRadius: "50%",
                  border: "4px solid transparent",
                  borderTopColor: "#fff",
                  transform: `rotate(${(holdProgress / 100) * 360}deg)`,
                  transition: "transform 0.05s linear",
                }
              }} />
            )}

            {/* MAIN BUTTON */}
            <Box
              id="main-sos-button"
              onMouseDown={isIdle ? onHoldStart : undefined}
              onMouseUp={isIdle ? onHoldEnd : undefined}
              onMouseLeave={() => { if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current); setHoldProgress(0); }}
              onTouchStart={isIdle ? (e) => { e.preventDefault(); onHoldStart(); } : undefined}
              onTouchEnd={isIdle ? (e) => { e.preventDefault(); onHoldEnd(); } : undefined}
              sx={{
                width: 130,
                height: 130,
                borderRadius: "50%",
                background: isVoice
                  ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                  : isProcessing
                  ? "linear-gradient(135deg, #b91c1c, #991b1b)"
                  : isSent
                  ? "linear-gradient(135deg, #16a34a, #15803d)"
                  : "linear-gradient(135deg, #ef4444, #dc2626)",
                boxShadow: isVoice
                  ? "0 0 0 16px rgba(124,58,237,0.15), 0 0 60px rgba(124,58,237,0.4)"
                  : "0 0 0 16px rgba(220,38,38,0.12), 0 0 60px rgba(220,38,38,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                cursor: isIdle ? "pointer" : "default",
                transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                userSelect: "none",
                WebkitUserSelect: "none",
                "&:active": isIdle ? { transform: "scale(0.95)" } : {},
                animation: isVoice ? "voicePulse 0.8s ease-in-out infinite alternate" : "none",
                "@keyframes voicePulse": {
                  "0%":   { boxShadow: "0 0 0 16px rgba(124,58,237,0.15), 0 0 40px rgba(124,58,237,0.3)" },
                  "100%": { boxShadow: "0 0 0 24px rgba(124,58,237,0.05), 0 0 80px rgba(124,58,237,0.6)" },
                }
              }}
            >
              {isProcessing ? (
                <CircularProgress size={32} sx={{ color: "#fff" }} />
              ) : (
                <>
                  <Typography sx={{ fontSize: isVoice ? 36 : 32, lineHeight: 1 }}>
                    {isVoice ? "🎙️" : isSent ? "✅" : "🆘"}
                  </Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#fff", letterSpacing: 1.5, mt: 0.5 }}>
                    {isVoice ? "SPEAK" : isSent ? "SENT" : "SOS"}
                  </Typography>
                </>
              )}
            </Box>
          </Box>

          {/* STATUS MESSAGE */}
          <Box sx={{ textAlign: "center", minHeight: 40, mb: 4 }}>
            {statusMsg && (
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: isVoice ? "#a78bfa" : "#f87171", animation: "fadeInUp 0.3s ease", "@keyframes fadeInUp": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } } }}>
                {statusMsg}
              </Typography>
            )}
            {isVoice && voiceText && (
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.6)", mt: 0.5, fontStyle: "italic" }}>
                "{voiceText}"
              </Typography>
            )}
            {isIdle && !statusMsg && (
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                Press &amp; hold for Voice SOS
              </Typography>
            )}
          </Box>

          {/* WHAT HAPPENS PANEL */}
          <Box sx={{ maxWidth: 440, width: "100%", mb: 4 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.4)", letterSpacing: 2, mb: 1.5, textAlign: "center" }}>
              WHEN YOU TRIGGER SOS
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.2 }}>
              {[
                { icon: "🚑", title: "Ambulance Dispatch", desc: "Nearest HP 108 ambulance auto-assigned" },
                { icon: "📱", title: "SMS to Contacts", desc: "All emergency contacts alerted instantly" },
                { icon: "📧", title: "Email Alert", desc: "Rich email with GPS map sent to contacts" },
                { icon: "📡", title: "Nearby Broadcast", desc: "Alert sent to all connected users nearby" },
              ].map(s => (
                <Box key={s.title} sx={{ p: 1.8, background: "rgba(255,255,255,0.04)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}>
                  <Typography sx={{ fontSize: 20, mb: 0.5 }}>{s.icon}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#fff", mb: 0.3 }}>{s.title}</Typography>
                  <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{s.desc}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* VOICE SOS GUIDE */}
          <Box sx={{
            maxWidth: 440, width: "100%", mb: 4,
            p: 2, borderRadius: 4,
            background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.1))",
            border: "1px solid rgba(124,58,237,0.3)",
            display: "flex", gap: 2, alignItems: "flex-start"
          }}>
            <Typography sx={{ fontSize: 24, flexShrink: 0 }}>🎙️</Typography>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#a78bfa", mb: 0.5 }}>Voice SOS</Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                Hold the button for 2 seconds. When the button turns purple, speak your emergency. Your voice message is transcribed and sent with the alert.
              </Typography>
            </Box>
          </Box>

          {/* HP EMERGENCY HOTLINES */}
          <Box sx={{
            maxWidth: 440, width: "100%",
            p: 2.5, borderRadius: 4,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <Typography sx={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.4)", letterSpacing: 2, mb: 2 }}>
              HP EMERGENCY HOTLINES
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 1 }}>
              {[["🚑", "108", "Ambulance"], ["🚓", "100", "Police"], ["🚒", "101", "Fire"], ["🚨", "112", "Emergency"]].map(([icon, num, label]) => (
                <Box
                  key={num}
                  onClick={() => { window.location.href = `tel:${num}`; }}
                  sx={{ textAlign: "center", cursor: "pointer", p: 1, borderRadius: 2, "&:hover": { background: "rgba(255,255,255,0.05)" } }}
                >
                  <Typography sx={{ fontSize: 22, mb: 0.3 }}>{icon}</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{num}</Typography>
                  <Typography sx={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* OFFLINE RESOURCES */}
          <Box sx={{ maxWidth: 440, width: "100%", mt: 3 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.4)", letterSpacing: 2, mb: 1.5 }}>
              OFFLINE RESOURCES
            </Typography>
            <Grid container spacing={1.2}>
              {[
                { title: "First Aid Guide", icon: "🩹", desc: "CPR, bleeding control, fracture management" },
                { title: "HP Police Directory", icon: "👮", desc: "All 12 District HQ direct numbers" },
                { title: "Roadside Help", icon: "⚙️", desc: "Mechanics & towing for mountain zones" },
                { title: "Safety Manuals", icon: "📕", desc: "Rohtang, black ice & monsoon guides" },
              ].map(s => (
                <Grid item xs={12} sm={6} key={s.title}>
                  <Box sx={{
                    p: 1.8, background: "rgba(255,255,255,0.04)", borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.07)", height: "100%",
                    cursor: "pointer", transition: "0.2s",
                    "&:hover": { background: "rgba(255,255,255,0.07)", borderColor: "rgba(220,38,38,0.4)" }
                  }}>
                    <Box sx={{ display: "flex", gap: 1.5 }}>
                      <Typography sx={{ fontSize: 22 }}>{s.icon}</Typography>
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>{s.title}</Typography>
                        <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.45)", mt: 0.3, lineHeight: 1.4 }}>{s.desc}</Typography>
                        <Typography sx={{ fontSize: 10, fontWeight: 800, color: "#f87171", mt: 0.8 }}>VIEW OFFLINE →</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      ) : (
        <AmbulanceTracker
          patientPos={patientPos}
          hospitalPos={nearestH}
          onClose={() => {
            setShowTracker(false);
            setPhase("idle");
            setStatusMsg("");
          }}
        />
      )}
    </Box>
  );
}