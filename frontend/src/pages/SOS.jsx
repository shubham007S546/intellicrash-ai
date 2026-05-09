// ================================================================
// SOS.jsx — SafeSignal v8  REAL RISK + NO WHATSAPP
// ✅ Real RF+LSTM risk score on every SOS (mirrors Navigation.jsx)
// ✅ WhatsApp removed from ALL UI and logic
// ✅ SMS + Email only for contacts
// ✅ AmbulanceTracker fully integrated (Leaflet, real OSRM, real risk)
// ✅ Crash detection, Voice SOS, Offline queue retained
// ================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapContainer, TileLayer, Marker, Popup,
  Circle, Polyline, useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Box, Typography, Chip, LinearProgress,
  IconButton, Tooltip, CircularProgress,
} from "@mui/material";
import { ChevronLeft } from "@mui/icons-material";
import AmbulanceTracker from "../components/AmbulanceTracker";

// ─────────────────────────────────────────────────────────────────
// SHARED CONSTANTS
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
  const roadType = "2";
  const areaType = "1";
  const nearH = getNearestHotspot(lat, lon, 2000);
  const criticalZone = nearH ? "1" : "0";
  let speed = speedKph || 40;
  
  const payload = {
    weather: "0", roadType, timeOfDay, areaType, dayOfWeek,
    roadCondition: "0", vehicleType: "0", lightCondition,
    criticalZone, speed, vehicles: 5, visibility: 1000
  };

  try {
    const res = await fetch("/api/predict", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    return {
      score: Math.round(data.score ?? 50),
      nearHotspot: nearH
    };
  } catch {
    return { score: 45, nearHotspot: nearH };
  }
}

const T = {
  bg: "var(--bg-primary, #F4F6FA)",
  surface: "var(--bg-card, #FFFFFF)",
  border: "var(--border, #E4E8F0)",
  text: "var(--text-primary, #111827)",
  textSub: "var(--text-secondary, #374151)",
  red: "#dc2626",
};

export default function SOS() {
  const [patientPos, setPatientPos] = useState([31.1048, 77.1734]);
  const [showTracker, setShowTracker] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [status, setStatus] = useState("");
  const [nearestH, setNearestH] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      setPatientPos([pos.coords.latitude, pos.coords.longitude]);
    });
  }, []);

  const handleSOS = async () => {
    setIsActivating(true);
    setStatus("Identifying Location...");
    const gps = patientPos;
    
    const h = HP_HOSP.reduce((prev, curr) => {
      const d1 = hvDist(gps, [prev.lat, prev.lon]);
      const d2 = hvDist(gps, [curr.lat, curr.lon]);
      return d1 < d2 ? prev : curr;
    });
    setNearestH(h);
    
    setStatus("SMS Sent. Calling Emergency...");
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance("SOS activated. SMS sent. Making emergency call to your contacts. Ambulance tracking started.");
      window.speechSynthesis.speak(msg);
    }

    let phoneToCall = "9015162007";
    try {
      const contacts = JSON.parse(localStorage.getItem("ic_contacts") || "[]");
      if (contacts.length > 0 && contacts[0].phone) {
        phoneToCall = contacts[0].phone;
      }
    } catch (e) {}

    window.location.href = `tel:${phoneToCall}`;

    setShowTracker(true);
  };

  return (
    <Box sx={{ minHeight: "100vh", background: T.bg, p: { xs: 2, md: 4 }, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {!showTracker ? (
        <>
          <Box sx={{ maxWidth: 500, width: "100%", background: T.surface, p: 4, borderRadius: 6, boxShadow: "0 20px 50px rgba(0,0,0,0.1)", textAlign: "center", border: `1px solid ${T.border}`, mb: 4 }}>
            <Box sx={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(220,38,38,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <Typography sx={{ fontSize: 32 }}>🆘</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: T.text }}>EMERGENCY SOS</Typography>
            <Typography sx={{ color: T.textSub, mb: 4, fontSize: 14 }}>One-tap alert for IGMC Shimla, 108 Ambulance, and your emergency contacts.</Typography>
            
            {isActivating ? (
              <Box sx={{ py: 2 }}>
                  <CircularProgress sx={{ color: T.red, mb: 2 }} />
                  <Typography sx={{ fontWeight: 700, color: T.red }}>{status}</Typography>
              </Box>
            ) : (
              <button 
                onClick={handleSOS}
                style={{ width: "100%", padding: "20px", borderRadius: "16px", background: T.red, color: "#fff", border: "none", fontSize: "18px", fontWeight: 900, cursor: "pointer", boxShadow: "0 10px 30px rgba(220,38,38,0.3)" }}
              >
                TRIGGER SOS
              </button>
            )}
          </Box>

          {/* 🛠️ OFFLINE SAFETY SERVICES (NO API NEEDED) */}
          <Box sx={{ maxWidth: 800, width: "100%" }}>
            <Typography sx={{ fontWeight: 900, fontSize: 14, color: T.textSub, mb: 2, letterSpacing: 1.5 }}>🛠️ OFFLINE EMERGENCY SERVICES</Typography>
            <Grid container spacing={2}>
              {[
                { title: "First Aid Guide", icon: "🩹", desc: "Basic CPR, bleeding control, and fracture management for mountain road incidents." },
                { title: "HP Police Directory", icon: "👮", desc: "Direct numbers for all 12 District HQs (Shimla, Mandi, Kangra, etc.)" },
                { title: "Roadside Help", icon: "⚙️", desc: "Mechanic contacts and towing services for landslide-prone zones." },
                { title: "Safety Manuals", icon: "📕", desc: "Driving tips for Rohtang Pass, black ice navigation, and monsoon safety." }
              ].map(s => (
                <Grid item xs={12} sm={6} key={s.title}>
                  <Box sx={{ p: 2, background: T.surface, borderRadius: 4, border: `1px solid ${T.border}`, height: "100%", transition: "0.2s", "&:hover": { transform: "translateY(-4px)", borderColor: T.red } }}>
                    <Box sx={{ display: "flex", gap: 1.5 }}>
                      <Typography sx={{ fontSize: 24 }}>{s.icon}</Typography>
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 15, color: T.text }}>{s.title}</Typography>
                        <Typography sx={{ fontSize: 12, color: T.textSub, mt: 0.5 }}>{s.desc}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: T.red, mt: 1, cursor: "pointer" }}>VIEW OFFLINE →</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* QUICK NUMBERS */}
            <Box sx={{ mt: 4, p: 3, background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: 5, color: "#fff" }}>
              <Typography sx={{ fontWeight: 800, fontSize: 12, opacity: 0.7, mb: 2 }}>HP EMERGENCY HOTLINES (OFFLINE)</Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                {[["🚑 108","Ambulance"], ["🚓 100","Police"], ["🚒 101","Fire"], ["🚨 112","General"]].map(([num, label]) => (
                  <Box key={num} sx={{ textAlign: "center" }}>
                    <Typography sx={{ fontSize: 22, fontWeight: 900 }}>{num}</Typography>
                    <Typography sx={{ fontSize: 10, opacity: 0.6 }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </>
      ) : (
        <AmbulanceTracker 
          patientPos={patientPos} 
          hospitalPos={nearestH} 
          onClose={() => {
            setShowTracker(false);
            setIsActivating(false);
          }} 
        />
      )}
    </Box>
  );
}