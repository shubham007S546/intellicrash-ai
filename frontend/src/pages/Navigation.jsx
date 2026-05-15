/**
 * Navigation.jsx v14.0 — MODULARIZED IntelliCrash
 */

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MapContainer, TileLayer, Marker, Popup,
  Circle, Polyline, useMap, useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  Box, Typography, Chip, LinearProgress,
  IconButton, Tooltip, Divider, Rating, CircularProgress,
  Collapse,
} from "@mui/material";
import { ChevronLeft, ChevronRight, SwapVert, ExpandMore, ExpandLess } from "@mui/icons-material";

import {
  geocodePlace, reverseGeocode, initGM, getDirections, addReport,
  getReports, saveSession, saveGM, predictRisk, getWeather,
  searchPlaces, getWeatherForecast,
  reportAccidentToHotspotLearner, getLearnedHotspots,
  seedLearnedHotspotsFromBackend,
  getRealDeviceLocation, triggerSOS, getContacts,
  getHotspotsML, getHotspotsDynamic, getHotspotsDynamicV2,
} from "../services/api";


import {
  loadGM, saveGM as saveGMUnified,
  awardTripPoints, awardReportPoints,
  checkAndUnlockBadges,
} from "../services/gamification";

import AmbulanceTracker from "../components/AmbulanceTracker";
import { 
  T, RC, RL, RCL, RCB, fmtD, fmtT, 
  RESOLVED_STORAGE_KEY, REPORT_POLL_MS, DEFAULT_EXPIRE_MS,
  HP_HOTSPOTS, CRITICAL_ZONES, SPEED_CAMS, HP_TOLLS, HP_PASSES, VP,
  hvDist, brng, lerp, getNearestHotspot, inferRoadType, inferAreaType,
  wxCodeToBackend, wxToVisibility, translateToHindi, getSafeBrakingDistance, getHindiVoice,
  RCOLORS, RICONS, ZONE_ICON
} from "./navigation/navUtils";
import NavMap from "./navigation/NavMap";
import NavPanel from "./navigation/NavPanel";
import NavSafety from "./navigation/NavSafety";

import "./Navigation.css";

function getResolvedIds() {
  try {
    const stored = localStorage.getItem(RESOLVED_STORAGE_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

function isReportExpired(report) {
  if (report.status === "expired" || report.resolved) return true;
  if (report.expires_at) return new Date(report.expires_at).getTime() < Date.now();
  if (report.timestamp)  return new Date(report.timestamp).getTime() + DEFAULT_EXPIRE_MS < Date.now();
  return false;
}

function filterActiveReports(reports, resolvedIds) {
  return reports.filter(r => !resolvedIds.has(r.id) && !isReportExpired(r));
}

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdYRZnuvommuJrbOytaTcaySne3_3ddLthqnKljvsA_wY47ig/viewform?usp=publish-editor";

let compressImages = async (files) =>
  Promise.all(Array.from(files).map(f => new Promise(res => {
    const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f);
  })));
try {
  const m = await import("../services/imageUtils");
  if (m?.compressImages) compressImages = m.compressImages;
} catch (_) {}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function segmentRisk(coord, learnedHS = [], reports = []) {
  let maxScore=0;
  let isAdaptive = false;

  // Check learned hotspots (Adaptive)
  for (const h of learnedHS) {
    const d = hvDist(coord, [h.lat, h.lon]);
    if (d < 1500) {
      isAdaptive = true;
      if (h.risk_score > maxScore) maxScore = h.risk_score;
    }
  }

  // Check community reports clusters
  const nearbyReports = reports.filter(r => hvDist(coord, [r.lat, r.lon]) < 1200);
  if (nearbyReports.length >= 3) {
    isAdaptive = true;
    const clusterScore = Math.min(90, 45 + nearbyReports.length * 4);
    if (clusterScore > maxScore) maxScore = clusterScore;
  }

  for(const h of HP_HOTSPOTS){
    const d=hvDist(coord,[h.lat,h.lon]);
    const thresh=h.risk==="HIGH"?2500:1500;
    if(d<thresh){
      const proximity=1-(d/thresh);
      const severity=h.risk==="HIGH"?Math.min(100,65+proximity*35+(h.killed>=7?10:0)):Math.min(65,40+proximity*25);
      if(severity>maxScore)maxScore=severity;
    }
  }
  for(const z of CRITICAL_ZONES){
    const d=hvDist(coord,[z.lat,z.lon]);
    if(d<z.radius*1.5){
      const zScore=z.type==="fog"?58:z.type==="landslide"?62:z.type==="bridge"?50:42;
      if(zScore>maxScore)maxScore=zScore;
    }
  }
  return { score: maxScore, isAdaptive };
}
function buildRouteSegments(coords, learnedHS = [], reports = []) {
  if(coords.length<2)return[];
  const segs=[];let cur={color:null,points:[coords[0]]};
  for(let i=1;i<coords.length;i++){
    const { score: rs, isAdaptive } = segmentRisk(coords[i], learnedHS, reports);
    let color=rs>=67?"#dc2626":rs>=34?"#d97706":"#16a34a";
    if (isAdaptive) color = "#9333ea"; // Purple for Adaptive Verified
    
    if(cur.color===null)cur.color=color;
    if(color===cur.color){cur.points.push(coords[i]);}
    else{cur.points.push(coords[i]);segs.push({...cur});cur={color,points:[coords[i]]};}
  }
  if(cur.points.length>1)segs.push(cur);
  return segs;
}

function mkVehicleIcon(key,hdg=0,score=50,moving=false) {
  const v=VP[key]||VP.car;const c=RC(score);
  return L.divIcon({
    className:"veh-icon",iconSize:[56,56],iconAnchor:[28,28],
    html:`<div style="transform:rotate(${hdg}deg);width:56px;height:56px;display:flex;align-items:center;justify-content:center;">
      <div style="background:${c};width:36px;height:36px;border-radius:50%;box-shadow:0 2px 12px ${c}88,0 0 0 6px ${c}22;border:3px solid rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;font-size:16px;">${v.icon}</div>
    </div>`,
  });
}
const srcIcon=L.divIcon({className:"",iconSize:[34,42],iconAnchor:[17,42],html:`<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg"><path d="M17 0C7.61 0 0 7.61 0 17c0 12.73 17 25 17 25S34 29.73 34 17C34 7.61 26.39 0 17 0z" fill="#16a34a"/><circle cx="17" cy="17" r="7" fill="white"/><circle cx="17" cy="17" r="3.5" fill="#16a34a"/></svg>`});
const dstIcon=L.divIcon({className:"",iconSize:[34,42],iconAnchor:[17,42],html:`<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg"><path d="M17 0C7.61 0 0 7.61 0 17c0 12.73 17 25 17 25S34 29.73 34 17C34 7.61 26.39 0 17 0z" fill="#dc2626"/><circle cx="17" cy="17" r="7" fill="white"/><circle cx="17" cy="17" r="3.5" fill="#dc2626"/></svg>`});

function useLeafletCSS() {
  const[ready,setReady]=useState(false);
  useEffect(()=>{
    const ex=document.getElementById("leaflet-css");
    if(ex){ex.sheet?setReady(true):ex.addEventListener("load",()=>setReady(true),{once:true});return;}
    const l=document.createElement("link");
    l.id="leaflet-css";l.rel="stylesheet";l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    l.onload=()=>setReady(true);
    l.onerror=()=>setReady(true);
    document.head.appendChild(l);
  },[]);
  return ready;
}

function MapController({mapRef}){const map=useMap();useEffect(()=>{mapRef.current=map;},[map,mapRef]);return null;}
function MapClickHandler({onMapClick}){useMapEvents({click:(e)=>onMapClick(e.latlng.lat,e.latlng.lng)});return null;}

function TurnArrow({type="",modifier=""}){
  const m=`${type} ${modifier}`.toLowerCase();
  if(m.includes("uturn"))return<span>↩</span>;if(m.includes("sharp left"))return<span>↰</span>;
  if(m.includes("sharp right"))return<span>↱</span>;if(m.includes("slight left"))return<span>↖</span>;
  if(m.includes("slight right"))return<span>↗</span>;if(m.includes("left"))return<span>↰</span>;
  if(m.includes("right"))return<span>↱</span>;if(m.includes("arrive"))return<span>🏁</span>;
  if(m.includes("depart"))return<span>🚦</span>;if(m.includes("roundabout"))return<span>🔄</span>;
  return<span>↑</span>;
}

async function getMultipleRoutes(originLat, originLon, destLat, destLon, profile = "driving") {
  const osrmProfile = profile === "foot" || profile === "walking" ? "foot" : "car";
  const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("No route found");
  return data.routes.map((route, idx) => {
    const leg = route.legs[0];
    return {
      routeIndex: idx,
      geometry: route.geometry,
      distance_km: parseFloat((route.distance / 1000).toFixed(1)),
      duration_min: Math.round(route.duration / 60),
      steps: leg.steps.map(step => ({
        instruction: osrmInstructionLocal(step),
        type: step.maneuver.type,
        modifier: step.maneuver.modifier || "",
        distance_m: Math.round(step.distance),
        duration_s: Math.round(step.duration),
        name: step.name || "",
        geometry: step.geometry,
        maneuver: step.maneuver,
        reporter: "Nav-Active",
        source: "navigation"
      })),
    };
  });
}

function osrmInstructionLocal(step) {
  const m = step.maneuver;
  const street = step.name ? `onto ${step.name}` : "";
  const mod = m.modifier || "";
  switch (m.type) {
    case "depart": return `Head out ${street || "on the road"}`;
    case "arrive": return `Arrive at your destination`;
    case "turn":   return `Turn ${mod} ${street}`.trim();
    case "new name": return `Continue on ${step.name || "the road"}`;
    case "merge":  return `Merge ${mod} ${street}`.trim();
    case "on ramp": return `Take the ramp ${mod} ${street}`.trim();
    case "off ramp": return `Take the exit ${mod} ${street}`.trim();
    case "fork":   return `Take the ${mod} fork ${street}`.trim();
    case "roundabout":
    case "rotary": return `Enter the roundabout, then exit ${street}`.trim();
    default:       return `Continue ${street}`.trim();
  }
}

function PlaceInput({value,onChange,placeholder,isSource}) {
  const[sug,setSug]=useState([]);const[open,setOpen]=useState(false);const tmr=useRef(null);
  const search=useCallback((q)=>{
    if(q.length<2){setSug([]);setOpen(false);return;}
    clearTimeout(tmr.current);
    tmr.current=setTimeout(async()=>{
      try{const d=await searchPlaces(q+" Himachal Pradesh India");setSug(d.slice(0,8));setOpen(d.length>0);}
      catch{setSug([]);}
    },280);
  },[]);
  const fmt=(item)=>{
    const a=item.address||{};
    const main=a.road||a.village||a.hamlet||a.suburb||a.town||a.city||item.display_name.split(",")[0];
    const district=a.state_district||a.county||"";const pin=a.postcode||"";
    const sub=[a.village||a.town||"",district,pin].filter(Boolean).join(" · ");
    return{main,sub,full:[main,district,a.state||"Himachal Pradesh",pin].filter(Boolean).join(", ")};
  };
  return(
    <Box sx={{position:"relative",flex:1}}>
      <Box sx={{display:"flex",alignItems:"center",gap:1.2,px:1.5,py:1,background:T.inputBg,borderRadius:2.5,border:`1.5px solid ${T.border}`,"&:focus-within":{background:"#fff",border:`1.5px solid ${T.orange}`,boxShadow:`0 0 0 3px rgba(234,88,12,0.12)`},transition:"all 0.2s"}}>
        <Box sx={{width:10,height:10,flexShrink:0,borderRadius:isSource?"2px":"50%",background:isSource?"transparent":"#dc2626",border:isSource?"2.5px solid #16a34a":"none",transform:isSource?"rotate(45deg)":"none"}}/>
        <input value={value} onChange={e=>{onChange(e.target.value);search(e.target.value);}} onFocus={()=>{if(value.length>1&&sug.length>0)setOpen(true);}} onBlur={()=>setTimeout(()=>setOpen(false),200)} placeholder={placeholder} autoComplete="off" style={{flex:1,border:"none",outline:"none",fontSize:13,fontWeight:500,color:T.text,fontFamily:"'DM Sans',sans-serif",background:"transparent",padding:0,minWidth:0}}/>
        {value&&(<button onClick={()=>{onChange("");setSug([]);setOpen(false);}} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(0,0,0,0.3)",fontSize:18,padding:0,lineHeight:1,flexShrink:0}}>×</button>)}
      </Box>
      {open&&sug.length>0&&(
        <Box sx={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:9000,background:"#fff",borderRadius:2.5,boxShadow:"0 8px 32px rgba(0,0,0,0.12)",overflow:"hidden",maxHeight:280,overflowY:"auto",border:`1px solid ${T.border}`}}>
          {sug.map((s,i)=>{const{main,sub}=fmt(s);return(
            <Box key={i} onMouseDown={e=>{e.preventDefault();onChange(fmt(s).full);setSug([]);setOpen(false);}} sx={{px:2,py:1.3,display:"flex",gap:1.5,alignItems:"flex-start",cursor:"pointer","&:hover":{background:"rgba(234,88,12,0.05)"},borderBottom:i<sug.length-1?`1px solid ${T.border}`:"none"}}>
              <Box sx={{fontSize:13,color:"rgba(0,0,0,0.3)",mt:0.2,flexShrink:0}}>📍</Box>
              <Box><Typography sx={{fontSize:13,fontWeight:600,color:T.text,lineHeight:1.3}}>{main}</Typography>{sub&&<Typography sx={{fontSize:11,color:T.textSub,mt:0.2}}>{sub}</Typography>}</Box>
            </Box>
          );})}
        </Box>
      )}
    </Box>
  );
}

function TripReviewModal({open,onClose,tripFrom,tripTo,pointsEarned}) {
  const[name,setName]=useState("");const[rating,setRating]=useState(5);const[text,setText]=useState("");
  const[loading,setLoading]=useState(false);const[result,setResult]=useState(null);const[error,setError]=useState("");
  const sentCfg={
    positive:{color:"#16a34a",bg:"rgba(22,163,74,0.08)",border:"rgba(22,163,74,0.2)",icon:"😊",msg:"Great! Your positive feedback helps us show what's working."},
    negative:{color:"#dc2626",bg:"rgba(220,38,38,0.06)",border:"rgba(220,38,38,0.2)",icon:"😞",msg:"Sorry to hear that. We'll use this to improve IntelliCrash."},
    neutral:{color:"#d97706",bg:"rgba(217,119,6,0.08)",border:"rgba(217,119,6,0.2)",icon:"😐",msg:"Thanks for your balanced feedback."},
  };
  const handleSubmit=async()=>{
    if(!text.trim()||text.trim().length<5){setError("Write at least 5 characters.");return;}
    setError("");setLoading(true);
    try{
      const res=await fetch("/api/reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_name:name.trim()||"Anonymous",review_text:text.trim(),rating})});
      const data=await res.json();
      if(res.ok)setResult(data);else setError(data.detail||"Submission failed.");
    }catch{setError("Network error. Is the backend running?");}
    setLoading(false);
  };
  if(!open)return null;
  const sent=result?.sentiment;const cfg=sentCfg[sent?.label||"neutral"]||sentCfg.neutral;
  const inputStyle={width:"100%",boxSizing:"border-box",border:`1.5px solid ${T.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,fontFamily:"'DM Sans',sans-serif",background:T.inputBg,color:T.text,outline:"none",marginBottom:10};
  return(
    <Box sx={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",p:2,backdropFilter:"blur(8px)"}}>
      <Box sx={{background:"#fff",borderRadius:4,p:3.5,maxWidth:400,width:"100%",boxShadow:"0 32px 80px rgba(0,0,0,0.15)",border:`1px solid ${T.border}`}}>
        {result?(
          <Box sx={{textAlign:"center"}}>
            <Typography sx={{fontSize:48,mb:1}}>{cfg.icon}</Typography>
            <Typography sx={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:20,color:T.text,mb:0.5}}>Thank you!</Typography>
            <Box sx={{display:"inline-flex",alignItems:"center",gap:0.8,px:2,py:0.8,borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.border}`,mb:1.5}}>
              <Typography sx={{fontSize:13,fontWeight:700,color:cfg.color,textTransform:"capitalize"}}>{result.sentiment} sentiment</Typography>
            </Box>
            <Typography sx={{fontSize:13,color:T.textSub,mb:2,lineHeight:1.7}}>{cfg.msg}</Typography>
            <Box sx={{p:1.5,background:"rgba(234,88,12,0.06)",borderRadius:2,border:"1px solid rgba(234,88,12,0.15)",mb:2}}>
              <Typography sx={{fontSize:14,fontWeight:900,color:T.orange}}>+{pointsEarned} pts earned this trip!</Typography>
            </Box>
            <button onClick={onClose} style={{width:"100%",padding:"12px",border:"none",borderRadius:12,background:"linear-gradient(135deg,#ea580c,#dc2626)",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Continue Driving 🛡️</button>
          </Box>
        ):(
          <>
            <Box sx={{textAlign:"center",mb:2.5}}>
              <Typography sx={{fontSize:32,mb:0.5}}>🏁</Typography>
              <Typography sx={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:18,color:T.text,mb:0.3}}>Trip Complete!</Typography>
              <Typography sx={{fontSize:13,fontWeight:800,color:T.orange,mt:0.5}}>+{pointsEarned} pts earned!</Typography>
            </Box>
            <Box sx={{display:"flex",justifyContent:"center",mb:2}}>
              <Rating value={rating} onChange={(_,v)=>setRating(v||1)} size="large" sx={{"& .MuiRating-iconFilled":{color:T.orange},"& .MuiRating-iconEmpty":{color:"rgba(0,0,0,0.15)"}}}/>
            </Box>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name (optional)" style={inputStyle}/>
            <textarea value={text} onChange={e=>{setText(e.target.value);setError("");}} placeholder="How was your experience?" rows={3} style={{...inputStyle,resize:"none"}}/>
            {error&&<Typography sx={{fontSize:12,color:"#dc2626",mb:1}}>{error}</Typography>}
            <Box sx={{display:"flex",gap:1}}>
              <button onClick={onClose} style={{flex:1,padding:"11px",border:`1px solid ${T.border}`,borderRadius:10,background:T.inputBg,cursor:"pointer",fontSize:13,color:T.textSub,fontFamily:"'DM Sans',sans-serif"}}>Skip</button>
              <button onClick={handleSubmit} disabled={loading||!text.trim()} style={{flex:2,padding:"11px",border:"none",borderRadius:10,background:loading?"rgba(234,88,12,0.3)":"linear-gradient(135deg,#ea580c,#dc2626)",color:"#fff",fontSize:14,fontWeight:800,cursor:loading?"wait":"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {loading?<><CircularProgress size={14} sx={{color:"#fff"}}/> Analysing…</>:"Submit Review ⭐"}
              </button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

function buildLandmark(lat, lon, nearestHotspot, srcLabel, dstLabel) {
  if (nearestHotspot?.name) return nearestHotspot.name;
  if (srcLabel && dstLabel) return `${srcLabel.split(",")[0]} → ${dstLabel.split(",")[0]}`;
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

function buildRoad(directions, currentStep, nearestHotspot) {
  const step = directions?.steps?.[currentStep];
  if (step?.name) return step.name;
  if (nearestHotspot?.district) return `${nearestHotspot.district} HP`;
  return "HP Mountain Road";
}

function isHumanReport(r) {
  const desc = (r.description || "").trim();
  const rep  = (r.reporter    || "").trim();
  const lm   = (r.landmark    || "").trim();
  if (rep === "IntelliCrash Driver") return true;
  if (rep.toLowerCase().includes("adaptive"))        return false;
  if (desc.startsWith("[AutoLearned]"))              return false;
  if (/^count=\d+/.test(desc))                       return false;
  if (/^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(desc))  return false;
  return lm.length >= 1 || desc.length >= 5;
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function Navigation() {
  const nav         = useNavigate();
  const [params]    = useSearchParams();
  const mapRef      = useRef(null);
  const timerRef    = useRef(null);
  const riskTimerRef= useRef(null);
  const animRef     = useRef(null);
  const animState   = useRef({ running: false });
  const fileRef     = useRef(null);
  const alertedZones= useRef(new Set());
  const vehMarkerRef= useRef(null);
  const userMarkerRef = useRef(null);
  const scRef       = useRef(50);
  const directionsRef=useRef(null);
  const currentStepRef=useRef(0);
  const vehicleRef  = useRef("car");
  const weatherRef  = useRef(null);
  const leafletReady= useLeafletCSS();
  const calcRiskRef = useRef(null);
  const resolvedIdsRef = useRef(getResolvedIds());
  const rawReportsRef = useRef([]);
  const reportPollRef = useRef(null);
  const voiceOnRef  = useRef(true);
  const hindiOnRef  = useRef(false);

  const [panelMode, setPanelMode] = useState("search");
  const [panelOpen, setPanelOpen] = useState(true);
  const [source,    setSource]    = useState(params.get("from")||"");
  const [dest,      setDest]      = useState(params.get("to")||"");
  const [srcGeoPos, setSrcGeoPos] = useState(null);
  const [dstGeoPos, setDstGeoPos] = useState(null);
  const [vehicle,   setVehicle]   = useState("car");
  const [loading,   setLoading]   = useState(false);
  const [routeCoords,setRouteCoords]=useState([]);
  const [routeSegs,  setRouteSegs] = useState([]);
  const [directions, setDirections]=useState(null);
  const [currentStep,setCurrentStep]=useState(0);
  const [routeInfo,  setRouteInfo] =useState(null);
  const [navigating, setNavigating]=useState(false);
  const [vehPos,  setVehPos]  =useState(null);
  const [vehHdg,  setVehHdg]  =useState(0);
  const [kmLeft,  setKmLeft]  =useState(null);
  const [etaSec,  setEtaSec]  =useState(null);
  const [isMoving,setIsMoving]=useState(false);
  const [tripPct, setTripPct] =useState(0);
  const [drivenIdx,setDrivenIdx]=useState(0);
  const [rfScore,   setRfScore]  =useState(null);
  const [lstmScore, setLstmScore]=useState(null);
  const [riskScore, setRiskScore]=useState(null);
  const [xaiText,   setXaiText]  =useState("");
  const [xaiFacts,  setXaiFacts] =useState(null);
  const [currentRiskParams,setCurrentRiskParams]=useState(null);
  const [alerts,    setAlerts]   =useState([]);
  const [weather,   setWeather]  =useState(null);
  const [forecast,  setForecast] =useState(null);
  const [userPos,   setUserPos]  =useState(null);
  const [liveSpd,   setLiveSpd]  =useState(null);
  const [liveOn,    setLiveOn]   =useState(false);
  const [showHS,      setShowHS]     =useState(true);
  const [showZones,   setShowZones]  =useState(true);
  const [showCams,    setShowCams]   =useState(true);
  const [showTolls,   setShowTolls]  =useState(true);
  const [showPasses,  setShowPasses] =useState(true);
  const [showReports, setShowReports]=useState(true);
  const [showLearned, setShowLearned]=useState(true);
  const [voiceOn, setVoiceOn]=useState(true);
  const [hindiOn, setHindiOn]=useState(false);
  const [snack,   setSnack]  =useState(null);
  const [mapStyle,setMapStyle]=useState("standard");
  const [nearZone,setNearZone]=useState(null);
  const [reports, setReports]=useState([]);
  const [rptType,    setRptType]   =useState("accident");
  const [rptDesc,    setRptDesc]   =useState("");
  const [rptPhotos,  setRptPhotos] =useState([]);
  const [rptVideo,   setRptVideo]  =useState("");
  const [rptSev,     setRptSev]    =useState("moderate");
  const [rptInjured, setRptInjured]=useState(0);
  const [rptFatal,   setRptFatal]  =useState(false);
  const [rptValidErr,setRptValidErr]=useState("");
  const [rptCooldown,setRptCooldown]=useState(false);
  const [showReview,   setShowReview]  =useState(false);
  const [pointsEarned, setPointsEarned]=useState(30);
  const [riskCalcErr,  setRiskCalcErr] =useState(null);
  const [learnedHotspots,setLearnedHotspots]=useState([]);
  const [gm,setGMState]=useState(()=>loadGM());
  const [realHotspots, setRealHotspots]=useState([]);
  const [activeCommunityHotspot, setActiveCommunityHotspot] = useState(null);
  const [nearIradHotspot, setNearIradHotspot] = useState(null); // iRAD proximity banner
  const [recHospital, setRecHospital] = useState(null);
  const [riskHistory, setRiskHistory] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem("ic_user");
    if (u) setUser(JSON.parse(u));
    
    const loadContacts = async () => {
      try {
        const res = await getContacts();
        if (res?.contacts) setEmergencyContacts(res.contacts);
      } catch (e) { console.error("Failed to load contacts:", e); }
    };
    loadContacts();
  }, []);


  useEffect(() => {
    const handleRiskEvent = (e) => {
      if (e.detail?.score) {
        setRiskScore(e.detail.score);
        if (e.detail.level) {
          setRiskHistory(prev => [{
            score: e.detail.score,
            level: e.detail.level,
            ts: new Date().toLocaleTimeString(),
            rf: "SOS",
            lstm: "ACTIVE"
          }, ...prev].slice(0, 5));
        }
      }
    };
    window.addEventListener("intellicrash_risk_update", handleRiskEvent);
    return () => window.removeEventListener("intellicrash_risk_update", handleRiskEvent);
  }, []);

  const [allRoutes,      setAllRoutes]      = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeRiskScores,  setRouteRiskScores]  = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const [showAmbulance, setShowAmbulance] = useState(false);
  const [sosPatientPos, setSosPatientPos] = useState(null);
  const [sosGpsLoading, setSosGpsLoading] = useState(false);

  // Throttled risk calc for simulation
  const lastCalcTs = useRef(0);

  useEffect(()=>{ voiceOnRef.current = voiceOn; }, [voiceOn]);
  useEffect(()=>{ hindiOnRef.current = hindiOn; }, [hindiOn]);

  const toast=useCallback((msg,sev="info")=>{setSnack({msg,sev});setTimeout(()=>setSnack(null),4500);},[]);

  const speak = useCallback((text) => {
    if (!voiceOnRef.current || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) { setTimeout(() => speak(text), 500); return; }
    window.speechSynthesis.cancel();
    if (hindiOnRef.current) {
      const hindiText = translateToHindi(text);
      if (!hindiText || hindiText === text) {
        const enU = new SpeechSynthesisUtterance(text); enU.lang = "en-IN"; enU.rate = 0.95;
        window.speechSynthesis.speak(enU);
      } else {
        const hiU = new SpeechSynthesisUtterance(hindiText);
        const hiVoice = getHindiVoice(); if (hiVoice) hiU.voice = hiVoice;
        hiU.lang = "hi-IN"; hiU.rate = 0.85;
        window.speechSynthesis.speak(hiU);
      }
    } else {
      const enU = new SpeechSynthesisUtterance(text); enU.lang = "en-IN"; enU.rate = 0.95;
      window.speechSynthesis.speak(enU);
    }
  }, []);

  const applyReportsFilter = useCallback((rawReports) => {
    const ids = getResolvedIds();
    resolvedIdsRef.current = ids;
    const filtered = filterActiveReports(rawReports, ids).filter(isHumanReport);
    setReports(filtered);
  }, []);

  const fetchAndFilterReports = useCallback(async () => {
    try {
      const data = await getReports();
      const raw = data.reports || [];
      rawReportsRef.current = raw;
      applyReportsFilter(raw);
    } catch (_) {}
  }, [applyReportsFilter]);

  useEffect(() => {
    const handleStorageChange = (e) => { if (e.key === RESOLVED_STORAGE_KEY) applyReportsFilter(rawReportsRef.current); };
    const handleResolveEvent = () => applyReportsFilter(rawReportsRef.current);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("intellicrash_report_resolved", handleResolveEvent);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("intellicrash_report_resolved", handleResolveEvent);
    };
  }, [applyReportsFilter]);

  const handleSOS = useCallback(async (voiceMessage = "") => {
    // SOS must be faster — removed window.confirm for one-click emergency action
    setSosGpsLoading(true);
    try {
      // PREFER CONTINUOUSLY TRACKED userPos FOR ACCURACY (Sundarnagar fix)
      let pos = userPos || vehPos;
      if (!pos) pos = await getRealDeviceLocation();
      const [lat, lon] = pos || [31.5312, 76.8921]; // Sundarnagar Fallback

      // Calculate priority score per Intelligent Dispatch algorithm
      const curScore = 99; // Force critical for SOS
      setRiskScore(curScore); // UPDATE GLOBAL STATE

      const severity = "HIGH";
      const severityWeight = 80; // High weight
      const crashBonus = voiceMessage ? 30 : 0;
      const priorityScore = curScore + severityWeight + crashBonus;


      const baseMsg = voiceMessage
        ? `🗣️ Voice SOS: "${voiceMessage}" — Risk: ${severity} (${curScore}/100). Priority: ${priorityScore}`
        : `🚨 SOS from IntelliCrash Navigator — Risk: ${severity} (${curScore}/100). Priority: ${priorityScore}`;

      // Get contacts
      let contacts = [];
      try { contacts = JSON.parse(localStorage.getItem("ic_contacts") || "[]"); } catch {}

      await triggerSOS({
        lat, lon,
        auto_crash: false,
        user_name: "IntelliCrash Driver (Nav)",
        address: "HP Mountain Road Navigation",
        severity,
        riskScore: curScore,
        priorityScore,
        contacts,
        message: baseMsg,
        voiceTranscript: voiceMessage || null,
        broadcastNearby: true,
      });

      setSosPatientPos([lat, lon]);
      setShowAmbulance(true);
      setRiskScore(99); // FORCE CRITICAL
      
      // TRIGGER PHONE CALL IMMEDIATELY
      const emergencyPhone = contacts[0]?.phone || "108";
      window.location.href = `tel:${emergencyPhone}`;

      toast("✅ SOS BROADCAST SUCCESSFUL (200 OK)", "success");
      speak(voiceMessage
        ? `Voice SOS activated. ${voiceMessage}. Help is on the way. Stay calm.`
        : "SOS activated. Calling emergency services now. Help is on the way. Stay calm.");

    } catch (err) { toast("Error dispatching ambulance. Please retry.", "error"); }

    finally { setSosGpsLoading(false); }
  }, [userPos, vehPos, riskScore, toast, speak]);


  const checkZones=useCallback((lat,lon)=>{
    CRITICAL_ZONES.forEach(z=>{
      const d=hvDist([lat,lon],[z.lat,z.lon]);
      if(d<z.radius+80&&!alertedZones.current.has(z.id)){
        alertedZones.current.add(z.id);
        setNearZone({...z, distanceM: Math.round(d)});
        const fullWarn = `${d < 100 ? "You are in" : `${Math.round(d)}m ahead —`} ${z.warn}`;
        speak(fullWarn); toast(fullWarn,"warning");
        setTimeout(()=>{alertedZones.current.delete(z.id);setNearZone(p=>p?.id===z.id?null:p);},90000);
      }
    });
    HP_TOLLS.forEach(t=>{
      const d=hvDist([lat,lon],[t.lat,t.lon]);
      if(d<500&&!alertedZones.current.has(`toll_${t.id}`)){
        alertedZones.current.add(`toll_${t.id}`);
        const fee=VP[vehicleRef.current||"car"]?.[`fee_${vehicleRef.current}`]||t.fee_car;
        const msg=`Toll booth ahead: ${t.name}. Fee: ₹${fee}.`;
        speak(msg); toast(msg,"info");
        setTimeout(()=>{alertedZones.current.delete(`toll_${t.id}`);setNearZone(p=>p?.id===`toll_${t.id}`?null:p);},120000);
      }
    });
    HP_HOTSPOTS.forEach(h=>{
      const d=hvDist([lat,lon],[h.lat,h.lon]);
      const thresh=2000; // Early warning at 2km as requested
      if(d<thresh&&!alertedZones.current.has(`hs_${h.id}`)){
        alertedZones.current.add(`hs_${h.id}`);
        setNearIradHotspot(h); // Show proximity banner
        const msg=`${h.risk==="HIGH"?"Warning! High-risk accident hotspot":"Caution! Accident-prone zone"}: ${h.name}.`;
        speak(msg); toast(msg, h.risk==="HIGH"?"error":"warning");
        setTimeout(()=>{ alertedZones.current.delete(`hs_${h.id}`); setNearIradHotspot(p=>p?.id===h.id?null:p); },90000);
      }
    });

    // Check Learned/Community Hotspots
    learnedHotspots.forEach((h, i) => {
      const d = hvDist([lat, lon], [h.lat, h.lon]);
      if (d < 800 && !alertedZones.current.has(`lh_${i}`)) {
        alertedZones.current.add(`lh_${i}`);
        setActiveCommunityHotspot(h);
        const msg = `Entering verified community hotspot: ${h.count} incidents reported here.`;
        speak(msg); toast(msg, "warning");
        setTimeout(() => { alertedZones.current.delete(`lh_${i}`); setActiveCommunityHotspot(p => p?.lat === h.lat ? null : p); }, 60000);
      }
    });

    // Check Reports Clusters
    const nearbyReports = reports.filter(r => hvDist([lat, lon], [r.lat, r.lon]) < 1000);
    if (nearbyReports.length >= 3 && !alertedZones.current.has("report_cluster")) {
      alertedZones.current.add("report_cluster");
      const cluster = { lat, lon, count: nearbyReports.length, type: "Community Cluster" };
      setActiveCommunityHotspot(cluster);
      const msg = `Caution! High density of community-reported incidents nearby (${nearbyReports.length} reports).`;
      speak(msg); toast(msg, "error");
      setTimeout(() => { alertedZones.current.delete("report_cluster"); setActiveCommunityHotspot(p => p?.type === "Community Cluster" ? null : p); }, 60000);
    }
  },[speak,toast,learnedHotspots,reports]);

  const predictRouteRisk = useCallback(async (route) => {
    if (!route || !route.geometry) return 50;
    try {
      const coords = route.geometry.coordinates;
      const indices = [0, 0.25, 0.5, 0.75, 0.95].map(p => Math.floor(coords.length * p));
      let total = 0;
      const confirmed=learnedHotspots.filter(h=>h.is_hotspot);
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        if (!coords[idx]) continue;
        const [lon, lat] = coords[idx];
        let nearestLearned=null;
        for(const h of confirmed){if(hvDist([lat,lon],[h.lat,h.lon])<2000){nearestLearned=h;break;}}
        const rp = buildRiskParams({ lat, lon, weather: weatherRef.current, vehicle: vehicleRef.current, nearestLearnedHotspot: nearestLearned, reports });
        const { _meta, _vehicleKey, ...payload } = rp;
        const p = await predictRisk(payload);
        total += (p.score ?? 50);
        // Set initial scores from the first point
        if (i === 0) {
          setRfScore(Math.round(p.rf_boosted || p.rf_score || 50));
          setLstmScore(p.lstm_score ? Math.round(p.lstm_score) : null);
          setXaiText(p.xai_explanation || "");
          setXaiFacts(p.xai_factors || null);
        }
      }
      return Math.round(total / indices.length);
    } catch { return 50; }
  }, [learnedHotspots]);

  const calcRisk=useCallback(async(lat,lon,currentSpeedKph=null)=>{
    try{
      let wx=weatherRef.current;
      if(!wx){try{wx=await getWeather(lat,lon);weatherRef.current=wx;setWeather(wx);}catch(_){}}
      let nearestLearned=null;
      const confirmed=learnedHotspots.filter(h=>h.is_hotspot);
      for(const h of confirmed){if(hvDist([lat,lon],[h.lat,h.lon])<2000){nearestLearned=h;break;}}
      const rp=buildRiskParams({lat,lon,weather:wx,vehicle:vehicleRef.current,currentSpeedKph,nearestLearnedHotspot:nearestLearned,reports});
      setCurrentRiskParams(rp);
      const{_meta,_vehicleKey,...payload}=rp;
      const pred=await predictRisk(payload);
      const rf=pred.rf_boosted??pred.rf_score??pred.score??50;
      const sc=Math.round(pred.score??rf);
      setRfScore(Math.round(rf)); setLstmScore(pred.lstm_score?Math.round(pred.lstm_score):null);
      
      // Update history if level changed
      setRiskHistory(prev => {
        const last = prev[0];
        const curLevel = RL(sc);
        if (!last || last.level !== curLevel) {
          return [{ ts: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }), level: curLevel, score: sc, rf: Math.round(rf), lstm: pred.lstm_score }, ...prev].slice(0, 10);
        }
        return prev;
      });

      setRiskScore(sc); setXaiText(pred.xai_explanation??""); setXaiFacts(pred.xai_factors??null);

      // Auto-Recommend Hospital if high risk
      if (sc >= 60) {
        const hosps = CRITICAL_ZONES.filter(z => z.type === "hospital");
        const scored = hosps.map(h => {
          const d = hvDist([lat, lon], [h.lat, h.lon]);
          const score = (10000 / (d + 100)) * (4 - (h.level || 3)); // Closer + Higher Level (1 is best)
          return { ...h, distM: d, recScore: score };
        }).sort((a,b) => b.recScore - a.recScore);
        if (scored[0] && scored[0].distM < 5000) setRecHospital(scored[0]);
        else setRecHospital(null);
      } else {
        setRecHospital(null);
      }

      return sc;
    }catch(e){setRiskCalcErr(e.message); return 50;}
  },[learnedHotspots, reports]);
  useEffect(() => { calcRiskRef.current = calcRisk; }, [calcRisk]);

  useEffect(()=>{
    fetchAndFilterReports();
    reportPollRef.current = setInterval(fetchAndFilterReports, REPORT_POLL_MS);
    
    // Fetch learned hotspots and seed from backend
    const loadHotspots = async () => {
      try {
        const learned = await getLearnedHotspots();
        setLearnedHotspots(learned);
        
        await seedLearnedHotspotsFromBackend();
        const updated = await getLearnedHotspots();
        setLearnedHotspots(updated);
        
        // Fetch ML-scored real-world hotspots
        const mlData = await getHotspotsML();
        if (mlData?.hotspots) setRealHotspots(mlData.hotspots);
      } catch (e) { console.error("Hotspot sync failed:", e); }
    };
    
    loadHotspots();

    const f=params.get("from"),t=params.get("to");
    if(f&&t)setTimeout(()=>runNavigation(f,t),800);
    return () => { if (reportPollRef.current) clearInterval(reportPollRef.current); };
  },[]);

  useEffect(() => {
    const watchId = navigator.geolocation?.watchPosition(
      (p) => {
        const { latitude: lat, longitude: lon, speed } = p.coords;
        const ll = [lat, lon];
        setUserPos(ll);
        const kmh = speed != null ? Math.round(speed * 3.6) : (vehPos ? 42 : 0);
        setLiveSpd(kmh);
        calcRiskRef.current?.(lat, lon, kmh); 
        checkZones(lat, lon);
      },
      (err) => { 
        console.error("[GPS] Watch failed:", err); 
        toast("GPS Signal Weak — check permissions", "warning");
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [liveOn, checkZones, toast]);

  // Auto-center map on user position when live mode is on
  useEffect(() => {
    if (liveOn && userPos && !navigating && mapRef.current && leafletReady) {
      mapRef.current.panTo(userPos, { animate: true, duration: 1.0 });
    }
  }, [liveOn, userPos, navigating, leafletReady]);

  const stopAnim=useCallback(()=>{
    animState.current.running=false;
    if(animRef.current){cancelAnimationFrame(animRef.current);animRef.current=null;}
    setIsMoving(false);
  },[]);

  const startAnim = useCallback((coords, durationMin) => {
    stopAnim(); if (!coords || coords.length < 2) return;
    
    // Smooth initial map centering
    if (mapRef.current) {
      try { mapRef.current.flyTo(coords[0], 16, { animate: true, duration: 1.5 }); } catch (_) {}
    }

    const totalM = coords.reduce((acc, curr, idx) => idx > 0 ? acc + hvDist(coords[idx - 1], curr) : 0, 0);
    const SIM_DURATION_MS = Math.min(durationMin * 60 * 1000, 150_000); // Max 2.5 min sim
    const speedMperMs = totalM / SIM_DURATION_MS;
    
    let distTravelled = 0;
    let lastTs = null;
    let lastPanPos = coords[0];
    
    animState.current = { running: true };
    
    const frame = (ts) => {
      if (!animState.current.running) return;
      if (lastTs === null) { lastTs = ts; animRef.current = requestAnimationFrame(frame); return; }
      
      const dt = Math.min(ts - lastTs, 64); // Smooth cap at ~15fps if lagging
      lastTs = ts;
      distTravelled += speedMperMs * dt;

      if (distTravelled >= totalM) {
        setVehPos(coords[coords.length - 1]);
        setNavigating(false);
        
        // Award points on completion
        const { pts, gm: nextGM } = awardTripPoints(riskScore || 50, null, gm.userEmail);
        setPointsEarned(pts);
        setGMState(nextGM);
        checkAndUnlockBadges(nextGM, gm.userEmail);
        
        setShowReview(true);
        speak("Journey completed safely.");
        stopAnim();
        return;
      }


      // High-precision segment tracking
      let si = 0, d = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        const seg = hvDist(coords[i], coords[i + 1]);
        if (d + seg > distTravelled) { si = i; break; }
        d += seg;
      }
      
      const segLen = hvDist(coords[si], coords[si + 1]);
      const t = segLen > 0 ? Math.max(0, Math.min(1, (distTravelled - d) / segLen)) : 0;
      const pos = lerp(coords[si], coords[si + 1], t);

      // SILK-SMOOTH UPDATES
      setVehPos(pos);
      setVehHdg(brng(coords[si], coords[si + 1]));
      setDrivenIdx(si);
      setTripPct((distTravelled / totalM) * 100);
      setKmLeft((totalM - distTravelled) / 1000);
      setEtaSec(((totalM - distTravelled) / speedMperMs) / 1000);

      // Adaptive Map Panning (reduces jitter)
      const movedM = hvDist(lastPanPos, pos);
      if (mapRef.current && movedM > 6) {
        try { 
          mapRef.current.panTo(pos, { animate: true, duration: 0.6, noMoveStart: true, easeLinearity: 0.25 }); 
        } catch (_) {}
        lastPanPos = pos;
      }

      // Throttled XAI Risk calc & Auto-Reroute
      const nowTs = Date.now();
      if (nowTs - lastCalcTs.current > 4000) {
        lastCalcTs.current = nowTs;
        (async () => {
          const curRisk = await calcRiskRef.current?.(pos[0], pos[1], Math.round(speedMperMs * 3600));
          checkZones(pos[0], pos[1]);

          // Auto-Reroute Logic: Switch if high risk and better alternate exists
          if (curRisk >= 67 || reports.some(r => r.type === "roadblock" && hvDist(pos, [r.lat, r.lon]) < 800)) {
            const safest = allRoutes.reduce((best, curr, idx) => 
              (curr.risk_score < best.risk_score) ? { score: curr.risk_score, idx } : best, 
              { score: 100, idx: -1 }
            );
            if (safest.idx !== -1 && safest.idx !== selectedRouteIdx && safest.score < 50) {
              const msg = `⚠️ High risk detected! Automatically switching to a safer alternate route.`;
              speak(msg); toast(msg, "warning");
              selectRoute(safest.idx);
            }
          }
        })();
      }
      
      // Update current step and trigger voice
      if (directions?.steps) {
        let stepDistAcc = 0;
        let newStep = 0;
        for (let i = 0; i < directions.steps.length; i++) {
          stepDistAcc += directions.steps[i].distance_m;
          if (distTravelled < stepDistAcc) {
            newStep = i;
            break;
          }
          if (i === directions.steps.length - 1) newStep = i;
        }
        if (newStep !== currentStepRef.current) {
          currentStepRef.current = newStep;
          setCurrentStep(newStep);
          const step = directions.steps[newStep];
          if (step) {
            const msg = `${step.instruction}. In ${fmtD(step.distance_m)}.`;
            speak(msg);
          }
        }
      }
      
      animRef.current = requestAnimationFrame(frame);
    };
    
    animRef.current = requestAnimationFrame(frame);
  }, [stopAnim, speak, checkZones]);

  const runNavigation=useCallback(async(srcOv,dstOv)=>{
    const s=srcOv||source,d=dstOv||dest;
    if(!s.trim()||!d.trim())return;
    setLoading(true); setRiskCalcErr(null); setAlerts([]); stopAnim();
    try{
      const [sG,dG]=await Promise.all([geocodePlace(s),geocodePlace(d)]);
      const sLL = [sG.lat, sG.lon];
      const dLL = [dG.lat, dG.lon];
      setSrcGeoPos(sLL); setDstGeoPos(dLL);
      const routes=await getMultipleRoutes(sG.lat,sG.lon,dG.lat,dG.lon,VP[vehicle].osrm);
      
      // Calculate risk for all routes
      const scoredRoutes = await Promise.all(routes.map(async (r) => {
        const sc = await predictRouteRisk(r);
        return { ...r, risk_score: sc };
      }));
      
      setAllRoutes(scoredRoutes); 
      const r = scoredRoutes[0];
      const c = r.geometry.coordinates.map(([ln,la])=>[la,ln]);
      setRouteCoords(c); setRouteSegs(buildRouteSegments(c, learnedHotspots, reports));
      setDirections(r); 
      setRiskScore(r.risk_score); 
      setRouteInfo({distance_km:r.distance_km,duration_min:Math.round(r.duration_min*VP[vehicle].factor)});
      // setNavigating(true) and startAnim are now handled by START TRIP button
      if(mapRef.current){try{mapRef.current.setView(sLL,14,{animate:true});}catch(_){}}
    }catch(err){toast(err.message,"error");}
    finally{setLoading(false);}
  },[source,dest,vehicle,startAnim,stopAnim]);

  const submitReport=async()=>{
    const center=userPos||vehPos||[31.1048,77.1734];
    try{
      const payload={
        type:rptType,
        lat:center[0],
        lon:center[1],
        description:rptDesc,
        severity:rptSev,
        photos:rptPhotos,
        video_url: rptVideo, // Add video URL
        reporter:"IntelliCrash Driver",
        source:"navigation",
        status:"active"
      };
      await addReport(payload); 
      toast("Report submitted!","success");
      // Dispatch global event for Bulletin/Safety Feed synchronization
      window.dispatchEvent(new Event("intellicrash_new_report"));
      setRptDesc("");setRptPhotos([]); setRptVideo(""); setPanelMode(navigating?"directions":"search");
    }catch(_){toast("Error submitting report","error");}
  };

  const handlePhoto=async(e)=>{
    const files=Array.from(e.target.files);
    const res=await Promise.all(files.map(f=>new Promise(r=>{const rd=new FileReader();rd.onload=()=>r(rd.result);rd.readAsDataURL(f);})));
    setRptPhotos(p=>[...p,...res].slice(0,4));
  };

  const tileUrl={standard:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",topo:"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",satellite:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"}[mapStyle];

  // NOTE: leafletReady is passed as prop to NavMap — it handles its own loading state

  const drivenCoords = (routeCoords || []).slice(0, (drivenIdx || 0) + 1);
  const remainingCoords = (routeCoords || []).slice(drivenIdx || 0);
  const stepClr = directions?.steps?.[currentStep] ? RC(riskScore || 50) : T.orange;

  return(
    <Box sx={{
      display: "flex",
      flexDirection: { xs: "column", md: "row" },
      height: "calc(100vh - 70px)",
      width: "100%",
      overflow: "hidden",
      position: "relative",
      background: T.bg
    }}>
      {showAmbulance && (
        <AmbulanceTracker 
          patientPos={sosPatientPos} 
          patientName={user?.name || "IntelliCrash Driver"} 
          severity="3"
          victimRiskScore={riskScore}
          onClose={()=>{setShowAmbulance(false);setSosPatientPos(null);}}
        />
      )}

      
      <Box sx={{
        width: { xs: "100%", md: 420 },
        height: { xs: panelOpen ? "65vh" : "60px", md: "100%" },
        position: "fixed",
        bottom: 0, left: 0,
        zIndex: 3000,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: { md: panelOpen ? "translateX(0)" : "translateX(-100%)" },
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0
      }}>
        <NavPanel 
          panelOpen={panelOpen} setPanelOpen={setPanelOpen}
          panelMode={panelMode} setPanelMode={setPanelMode}
          navigating={navigating} setNavigating={setNavigating}
          source={source} setSource={setSource}
          dest={dest} setDest={setDest}
          srcGeoPos={srcGeoPos} setSrcGeoPos={setSrcGeoPos}
          dstGeoPos={dstGeoPos} setDstGeoPos={setDstGeoPos}
          vehicle={vehicle} setVehicle={setVehicle}
          user={user}
          emergencyContacts={emergencyContacts}
          userPos={userPos}
          sosActive={showAmbulance}
          setTrackerOpen={setShowAmbulance}

          riskHistory={riskHistory}
          recHospital={recHospital}
          reports={reports}
          handleSOS={handleSOS}
          onSubmitReport={submitReport}
          loading={loading}
          riskScore={riskScore}
          routeInfo={routeInfo}
          allRoutes={allRoutes}
          selectedRouteIdx={selectedRouteIdx}
          selectRoute={(i)=>{setSelectedRouteIdx(i);const r=allRoutes[i];const c=r.geometry.coordinates.map(([ln,la])=>[la,ln]);setRouteCoords(c);setRouteSegs(buildRouteSegments(c, learnedHotspots, reports));setDirections(r);setRiskScore(r.risk_score);setRouteInfo({distance_km:r.distance_km,duration_min:Math.round(r.duration_min*VP[vehicle].factor)});setTimeout(()=>startAnim(c,r.duration_min),500);}}
          kmLeft={kmLeft} etaSec={etaSec} tripPct={tripPct}
          reports={reports}
          voiceOn={voiceOn} setVoiceOn={setVoiceOn}
          hindiOn={hindiOn} setHindiOn={setHindiOn}
          runNavigation={runNavigation}
          startAnim={startAnim}
          stopAnim={stopAnim}
          PlaceInput={PlaceInput}
          directions={directions}
          currentStep={currentStep}
          rptType={rptType} setRptType={setRptType}
          rptDesc={rptDesc} setRptDesc={setRptDesc}
          rptSev={rptSev} setRptSev={setRptSev}
          rptPhotos={rptPhotos} handlePhoto={handlePhoto}
          rptVideo={rptVideo} setRptVideo={setRptVideo}
          rptInjured={rptInjured} setRptInjured={setRptInjured}
          rptFatal={rptFatal} setRptFatal={setRptFatal}
          submitReport={submitReport}
          mapStyle={mapStyle} setMapStyle={setMapStyle}
          showHS={showHS} setShowHS={setShowHS}
          showZones={showZones} setShowZones={setShowZones}
          showCams={showCams} setShowCams={setShowCams}
          showReports={showReports} setShowReports={setShowReports}
          showLearned={showLearned} setShowLearned={setShowLearned}
          showTolls={showTolls} setShowTolls={setShowTolls}
          showPasses={showPasses} setShowPasses={setShowPasses}
          handleSOS={handleSOS}
          gm={gm}
          fmtD={fmtD}
          fmtT={fmtT}
          translateToHindi={translateToHindi}
          TurnArrow={TurnArrow}
          stepClr={stepClr}
          panelBorder={`1px solid ${T.border}`}
          riskCalcErr={riskCalcErr}
          rfScore={rfScore}
          lstmScore={lstmScore}
          xaiText={xaiText}
          xaiFacts={xaiFacts}
          currentRiskParams={currentRiskParams}
          riskHistory={riskHistory}
          recHospital={recHospital}
          GOOGLE_FORM_URL={GOOGLE_FORM_URL}
        />
      </Box>

      <Box sx={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        height: "100%",
        width: "100%"
      }}>
        <NavMap 
          userPos={userPos} setUserPos={setUserPos}
          vehPos={vehPos} vehHdg={vehHdg} isMoving={isMoving}
          routeCoords={routeCoords} drivenIdx={drivenIdx} remainingCoords={remainingCoords} drivenCoords={drivenCoords} routeSegs={routeSegs}
          srcGeoPos={srcGeoPos} dstGeoPos={dstGeoPos}
          selectedRouteIdx={selectedRouteIdx} allRoutes={allRoutes} altRouteColors={["#2563eb","#9333ea","#0d9488"]}
          showHS={showHS} showLearned={showLearned} showZones={showZones} showCams={showCams} showTolls={showTolls} showPasses={showPasses} showReports={showReports}
          reports={reports} confirmedLearnedHotspots={[...learnedHotspots, ...realHotspots]}
          riskScore={riskScore}
          mapStyle={mapStyle} tileUrl={tileUrl}
          directions={directions} currentStep={currentStep}
          nearZone={nearZone}
          activeCommunityHotspot={activeCommunityHotspot}
          liveOn={liveOn} setLiveOn={setLiveOn}
          navigating={navigating} setNavigating={setNavigating}
          panelOpen={panelOpen}
          mapRef={mapRef} userMarkerRef={userMarkerRef}
          onMapClick={(lat,lon)=>{ if(!source){ setSource(`${lat.toFixed(5)}, ${lon.toFixed(5)}`); reverseGeocode(lat,lon).then(a=>setSource(a.split(",").slice(0,2).join(",").trim())).catch(()=>{}); } }}
          vehicle={vehicle}
          kmLeft={kmLeft} etaSec={etaSec} tripPct={tripPct}
          stopAnim={stopAnim}
          toast={toast}
          source={source}
          currentRiskParams={currentRiskParams}
          hindiOn={hindiOn}
          translateToHindi={translateToHindi}
          XAIOverlay={NavSafety}
          TurnArrow={TurnArrow}
          stepClr={stepClr}
          leafletReady={leafletReady}
          leafletReadyCallback={() => setLeafletReady(true)}
          fmtD={fmtD}
          fmtT={fmtT}
          rfScore={rfScore}
          lstmScore={lstmScore}
          xaiText={xaiText}
          xaiFacts={xaiFacts}
          liveSpd={liveSpd}
          getSafeBrakingDistance={getSafeBrakingDistance}
        />
      </Box>

      {/* Modern Floating Sidebar Toggle */}
      <Box sx={{
        display: { xs: "none", md: "flex" },
        position: "fixed",
        left: panelOpen ? 420 : 0,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 4000,
        transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
      }}>
        <button 
          onClick={() => setPanelOpen(o => !o)} 
          style={{
            width: 28, height: 72,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderLeft: "none",
            borderRadius: "0 12px 12px 0",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "6px 0 20px rgba(0,0,0,0.06)",
            color: "#64748b",
            fontSize: 20,
            fontWeight: 900,
            transition: "all 0.2s"
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = T.orange; e.currentTarget.style.width = "32px"; }}
          onMouseOut={(e) => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.width = "28px"; }}
        >
          {panelOpen ? "‹" : "›"}
        </button>
      </Box>



      <TripReviewModal open={showReview} onClose={()=>setShowReview(false)} tripFrom={source} tripTo={dest} pointsEarned={pointsEarned}/>



      {snack&&(<Box sx={{position:"fixed",bottom:{xs:120,md:24},right:16,left:{xs:16,md:"auto"},zIndex:9999,background:"#fff",color:snack.sev==="error"?"#dc2626":snack.sev==="success"?"#16a34a":snack.sev==="warning"?"#d97706":"#2563eb",border:`1px solid ${snack.sev==="error"?"rgba(220,38,38,0.2)":snack.sev==="success"?"rgba(22,163,74,0.2)":snack.sev==="warning"?"rgba(217,119,6,0.2)":"rgba(37,99,235,0.2)"}`,px:2,py:1.2,borderRadius:2,fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.1)",maxWidth:320,backdropFilter:"blur(12px)"}}>{snack.msg}</Box>)}
    </Box>
  );
}

function buildRiskParams({lat,lon,weather,vehicle,currentSpeedKph,nearestLearnedHotspot,reports=[]}) {
  const vp=VP[vehicle]||VP.car;
  const h=new Date().getHours(),d=new Date().getDay();
  const timeOfDay=(h>=5&&h<9)?"0":(h>=9&&h<17)?"1":(h>=17&&h<20)?"2":"3";
  const dayOfWeek=String(d===0?6:d-1);
  const weatherCode=wxCodeToBackend(weather);
  let roadCondition="0";
  if(weather?.snow)roadCondition="2";
  else if(weather?.rain)roadCondition="1";
  const lightCondition=(h<6||h>=20)?"1":"0";
  const roadType=vehicle==="walk"?"0":inferRoadType(lat,lon);
  const areaType=inferAreaType(lat,lon);
  const nearIradHotspot=getNearestHotspot(lat, lon, HP_HOTSPOTS, 2000);
  const nearCommunityReport = reports.some(r => hvDist([lat, lon], [r.lat, r.lon]) < 1000);
  const criticalZone=(nearIradHotspot || nearestLearnedHotspot || nearCommunityReport) ? "1" : "0";
  let speed=currentSpeedKph;
  if(speed==null||!isFinite(speed)||isNaN(speed))speed=vp.avg;
  speed=Math.max(5,Math.min(120,speed));
  let vehicles=3;
  if(timeOfDay==="2")vehicles=8;
  else if(timeOfDay==="1")vehicles=5;
  else if(timeOfDay==="3")vehicles=2;
  if(roadType==="2")vehicles=Math.round(vehicles*1.5);
  vehicles=Math.max(1,Math.min(50,vehicles));
  const visibility=Math.min(1000,wxToVisibility(weather));
  return {
    weather:weatherCode,roadType,timeOfDay,areaType,dayOfWeek,
    roadCondition,vehicleType:vp.vehicleType,lightCondition,criticalZone,
    speed,vehicles,visibility,
    _vehicleKey:vehicle,
    _meta:{
      nearHotspot:nearIradHotspot,nearLearnedHotspot:nearestLearnedHotspot,
      roadTypeLabel:["Village/Rural","Mountain Road","National Highway","Highway/Expressway"][parseInt(roadType)]||"Mountain Road",
      timeLabel:["Morning (5–9)","Day (9–17)","Evening (17–20)","Night (20–5)"][parseInt(timeOfDay)],
      weatherLabel:["Clear","Rain","Fog","Snow/Ice","Storm"][parseInt(weatherCode)]||"Clear",
      lightLabel:lightCondition==="1"?"🌙 Dark/Night":"☀️ Daylight",
      roadCondLabel:["Dry","Wet","Icy","Under Repair"][parseInt(roadCondition)]||"Dry",
    },
  };
}