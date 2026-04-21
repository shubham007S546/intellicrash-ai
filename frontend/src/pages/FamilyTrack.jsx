/**
 * FamilyTrack.jsx — View live location of a shared trip
 * Access: /track/:shareId
 * Family members open this link to see driver's live location + risk
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import { Box, Typography, Card, CardContent, Chip, LinearProgress, Alert } from "@mui/material";
import { getTracking } from "../services/api";

const RC = (s) => s >= 67 ? "#ea4335" : s >= 34 ? "#f9ab00" : "#34a853";
const RL = (s) => s >= 67 ? "HIGH RISK" : s >= 34 ? "MEDIUM RISK" : "SAFE";

export default function FamilyTrack() {
  const { shareId } = useParams();
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSeen,setLastSeen]= useState(null);

  const load = async () => {
    try {
      const d = await getTracking(shareId);
      setData(d);
      setLastSeen(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000); // refresh every 10s
    return () => clearInterval(t);
  }, [shareId]);

  if (loading) return (
    <Box sx={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:2 }}>
      <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18 }}>🛡️ IntelliCrash Family Tracker</Typography>
      <LinearProgress sx={{ width:200 }} />
      <Typography sx={{ fontSize:13, color:"#80868b" }}>Loading live location...</Typography>
    </Box>
  );

  if (error) return (
    <Box sx={{ p:4, textAlign:"center" }}>
      <Typography sx={{ fontSize:36, mb:2 }}>📍</Typography>
      <Alert severity="error" sx={{ maxWidth:400, mx:"auto" }}>
        Location not found for ID: <b>{shareId}</b><br/>
        The driver may not have enabled family tracking, or the share link has expired.
      </Alert>
    </Box>
  );

  const risk = data?.risk_score || 0;
  const lat  = data?.lat || 31.1048;
  const lon  = data?.lon || 77.1734;

  return (
    <Box sx={{ height:"100vh", display:"flex", flexDirection:"column", fontFamily:"'DM Sans',sans-serif" }}>
      {/* Header */}
      <Box sx={{ background:"linear-gradient(135deg,#1a73e8,#0097a7)", py:2, px:3, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <Box>
          <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#fff", fontSize:16 }}>🛡️ IntelliCrash Live Tracker</Typography>
          <Typography sx={{ color:"rgba(255,255,255,0.8)", fontSize:12 }}>Tracking: <b>{data?.user_name || "Driver"}</b></Typography>
        </Box>
        <Box sx={{ textAlign:"right" }}>
          <Chip label={RL(risk)} sx={{ background:RC(risk), color:"#fff", fontWeight:700 }} />
          <Typography sx={{ color:"rgba(255,255,255,0.7)", fontSize:10, mt:0.5 }}>Updates every 10s</Typography>
        </Box>
      </Box>

      {/* Map */}
      <Box sx={{ flex:1, position:"relative" }}>
        <MapContainer center={[lat, lon]} zoom={14} style={{ height:"100%", width:"100%" }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; Carto &copy; OSM" maxZoom={19} subdomains="abcd" />
          <Marker position={[lat, lon]}
            icon={L.divIcon({ className:"", html:`<div style="background:${RC(risk)};width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 6px ${RC(risk)}33,0 2px 8px rgba(0,0,0,0.2)"></div>` })}>
            <Popup>
              <b>{data?.user_name}</b><br/>
              Speed: {data?.speed?.toFixed(0) || 0} km/h<br/>
              Risk: {risk?.toFixed(1)}/100<br/>
              {data?.updated_at?.slice(0,19).replace("T"," ")}
            </Popup>
          </Marker>
          <Circle center={[lat, lon]} radius={200} pathOptions={{ color:RC(risk), fillColor:RC(risk), fillOpacity:0.1, weight:2 }} />
        </MapContainer>
      </Box>

      {/* Info strip */}
      <Box sx={{ background:"#fff", borderTop:"1px solid #e3eaf5", p:2, display:"flex", gap:2, flexWrap:"wrap" }}>
        {[
          ["👤 Driver", data?.user_name || "—"],
          ["📍 GPS", `${lat.toFixed(5)}, ${lon.toFixed(5)}`],
          ["🚗 Speed", `${data?.speed?.toFixed(0) || 0} km/h`],
          ["⚠️ Risk", `${risk.toFixed(1)}/100 — ${RL(risk)}`],
          ["🕐 Last Update", lastSeen ? lastSeen.toLocaleTimeString() : "—"],
        ].map(([lbl, val]) => (
          <Box key={lbl} sx={{ flex:"1 1 140px", p:1, background:"#f8faff", borderRadius:2, border:"1px solid #e3eaf5" }}>
            <Typography sx={{ fontSize:10, color:"#80868b" }}>{lbl}</Typography>
            <Typography sx={{ fontSize:13, fontWeight:700, color:"#1a1a1a" }}>{val}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
