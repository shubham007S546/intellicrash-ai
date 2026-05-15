/**
 * AmbulanceTracker.jsx — IntelliCrash AMBULANCE NAVIGATION
 * v15.5 — Consolidated with Officer Vikram Singh Aesthetic
 * ✅ Location Fix: patientPos comes from parent (SOS trigger)
 * ✅ Unified version stored in components/ folder
 * ✅ Reintegrated high-fidelity "Officer Vikram Singh" driver card
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapContainer, TileLayer, Marker, Popup,
  Circle, Polyline, useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Box, Typography, Chip, LinearProgress,
  IconButton, Tooltip,
} from "@mui/material";
import { ChevronLeft } from "@mui/icons-material";

// ── Design tokens ─────────────────────────────────────────────────
const T = {
  bg:      "var(--bg-primary)",
  panel:   "var(--bg-card)",
  card:    "var(--bg-soft)",
  border:  "var(--border)",
  text:    "var(--text-primary)",
  textSub: "var(--text-secondary)",
  orange:  "#ea580c",
  red:     "#dc2626",
  green:   "#16a34a",
  blue:    "#2563eb",
  shadow:  "var(--shadow)",
};

// ── All 38 iRAD hotspots ──────────────────────────────────────────
const HP_HOTSPOTS = [
  { id:1,  lat:31.10297,  lon:77.20796,  name:"Dhalli–Kufri Stretch",        risk:"HIGH",   killed:8  },
  { id:2,  lat:31.10297,  lon:77.169533, name:"Sadar/East Shimla NH-5",      risk:"HIGH",   killed:5  },
  { id:3,  lat:31.11,     lon:77.143914, name:"Shimla West Bypass",          risk:"HIGH",   killed:4  },
  { id:4,  lat:31.127,    lon:77.228,    name:"Mashobra Bifurcation",        risk:"HIGH",   killed:7  },
  { id:5,  lat:31.32,     lon:77.42,     name:"Narkanda Hairpin Bends",      risk:"HIGH",   killed:6  },
  { id:6,  lat:31.55129,  lon:76.900541, name:"Dhanotu–Sundernagar NH-21",   risk:"HIGH",   killed:4  },
  { id:7,  lat:31.628145, lon:76.938968, name:"Balh Valley NH-21",           risk:"HIGH",   killed:6  },
  { id:8,  lat:30.898024, lon:77.092678, name:"Sadar Solan NH-5",            risk:"HIGH",   killed:7  },
  { id:9,  lat:30.923719, lon:76.797995, name:"Baddi Industrial Belt",       risk:"HIGH",   killed:11 },
  { id:10, lat:30.928968, lon:76.811236, name:"Hotel Classic Barotiwala",    risk:"HIGH",   killed:9  },
  { id:11, lat:31.085,    lon:77.112,    name:"Shoghi–Tara Devi Stretch",    risk:"HIGH",   killed:5  },
  { id:12, lat:31.058,    lon:77.074,    name:"Kandaghat Curves",            risk:"MEDIUM", killed:3  },
  { id:13, lat:31.452,    lon:77.015,    name:"Bilaspur NH-21 Bypass",       risk:"HIGH",   killed:6  },
  { id:14, lat:31.516,    lon:76.975,    name:"Swarghat Ghat Road",          risk:"HIGH",   killed:5  },
  { id:15, lat:31.195,    lon:77.095,    name:"Theog Market Junction",       risk:"MEDIUM", killed:3  },
  { id:16, lat:31.634,    lon:77.098,    name:"Rampur Bushahr NH-5",         risk:"HIGH",   killed:7  },
  { id:17, lat:31.716,    lon:76.932,    name:"Mandi Paddal Ground",         risk:"MEDIUM", killed:2  },
  { id:18, lat:31.774,    lon:76.996,    name:"Pandoh Bend NH-21",           risk:"HIGH",   killed:8  },
  { id:19, lat:32.098,    lon:77.112,    name:"Kullu Bypass NH-3",           risk:"HIGH",   killed:6  },
  { id:20, lat:32.222,    lon:77.188,    name:"Bhuntar Airport Stretch",     risk:"HIGH",   killed:4  },
  { id:21, lat:32.568,    lon:76.565,    name:"Lari Banjar Ghat",            risk:"MEDIUM", killed:3  },
  { id:22, lat:31.888,    lon:76.614,    name:"Hamirpur Bypass NH-3",        risk:"MEDIUM", killed:3  },
  { id:23, lat:31.970,    lon:76.525,    name:"Una–Bangana Stretch",         risk:"HIGH",   killed:5  },
  { id:24, lat:32.127,    lon:76.318,    name:"Dharamshala–Gaggal Road",     risk:"HIGH",   killed:6  },
  { id:25, lat:32.246,    lon:76.338,    name:"Kangra Valley NH-154",        risk:"MEDIUM", killed:4  },
  { id:26, lat:32.560,    lon:76.131,    name:"Chamba Khajjiar Road",        risk:"HIGH",   killed:5  },
  { id:27, lat:32.553,    lon:76.582,    name:"Baijnath–Palampur NH-20",     risk:"MEDIUM", killed:3  },
  { id:28, lat:31.302,    lon:77.558,    name:"Rampur–Sarahan Ghat",         risk:"HIGH",   killed:7  },
  { id:29, lat:31.380,    lon:77.722,    name:"Rohru Valley Road",           risk:"MEDIUM", killed:4  },
  { id:30, lat:31.540,    lon:77.650,    name:"Jeori–Karcham NH-5",          risk:"HIGH",   killed:6  },
  { id:31, lat:31.603,    lon:77.778,    name:"Tapri Gorge Section",         risk:"HIGH",   killed:5  },
  { id:32, lat:31.768,    lon:78.068,    name:"Kinnaur Kalpa Cliff Road",    risk:"HIGH",   killed:9  },
  { id:33, lat:31.980,    lon:78.252,    name:"Sangla Valley Narrow Road",   risk:"HIGH",   killed:7  },
  { id:34, lat:32.774,    lon:78.766,    name:"Spiti Valley NH-505",         risk:"HIGH",   killed:5  },
  { id:35, lat:32.502,    lon:77.648,    name:"Manali–Rohtang NH-3",         risk:"HIGH",   killed:8  },
  { id:36, lat:32.378,    lon:77.195,    name:"Kullu–Manali NH-3 Bridges",   risk:"HIGH",   killed:6  },
  { id:37, lat:31.099,    lon:77.262,    name:"Fagu–Kufri Bend",             risk:"HIGH",   killed:5  },
  { id:38, lat:30.985,    lon:76.983,    name:"Parwanoo–Solan NH-5",         risk:"HIGH",   killed:6  },
];

// ── HP hospitals ──────────────────────────────────────────────────
const HP_HOSP = [
  { name:"IGMC Shimla",             lat:31.1048,  lon:77.1734 },
  { name:"DDU Hospital Shimla",     lat:31.1100,  lon:77.1650 },
  { name:"Kamla Nehru Hosp.",       lat:31.0990,  lon:77.1800 },
  { name:"Civil Hosp. Solan",       lat:30.9045,  lon:77.0967 },
  { name:"Zonal Hosp. Mandi",       lat:31.7080,  lon:76.9318 },
  { name:"Civil Hosp. Kullu",       lat:32.0985,  lon:77.1090 },
  { name:"RH Dharamshala",          lat:32.2188,  lon:76.3225 },
  { name:"Civil Hosp. Bilaspur",    lat:31.3423,  lon:76.7570 },
  { name:"Civil Hosp. Hamirpur",    lat:31.6862,  lon:76.5214 },
  { name:"Civil Hosp. Una",         lat:31.4660,  lon:76.2699 },
  { name:"Civil Hosp. Sundernagar", lat:31.5327,  lon:76.8851 },
];

// ── Math helpers ──────────────────────────────────────────────────
function hvDist([la1,lo1],[la2,lo2]) {
  const R=6371000,φ1=la1*Math.PI/180,φ2=la2*Math.PI/180,
    Δφ=(la2-la1)*Math.PI/180,Δλ=(lo2-lo1)*Math.PI/180,
    a=Math.sin(Δφ/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function brng([la1,lo1],[la2,lo2]) {
  const φ1=la1*Math.PI/180,φ2=la2*Math.PI/180,Δλ=(lo2-lo1)*Math.PI/180,
    y=Math.sin(Δλ)*Math.cos(φ2),
    x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  return((Math.atan2(y,x)*180/Math.PI)+360)%360;
}
function lerp([la1,lo1],[la2,lo2],t){ return [la1+(la2-la1)*t,lo1+(lo2-lo1)*t]; }

// ── Risk colour helpers ───────────────────────────────────────────
const RC  = s=>s>=67?"#dc2626":s>=34?"#d97706":"#16a34a";
const RCL = s=>s>=67?"rgba(220,38,38,0.08)":s>=34?"rgba(217,119,6,0.08)":"rgba(22,163,74,0.08)";
const RCB = s=>s>=67?"rgba(220,38,38,0.2)":s>=34?"rgba(217,119,6,0.2)":"rgba(22,163,74,0.2)";
const RL  = s=>s>=67?"High Risk":s>=34?"Medium Risk":"Low Risk";
function fmtT(s){const h=Math.floor(s/3600),m=Math.round((s%3600)/60);return h?`${h}h ${m}m`:`${m} min`;}
function fmtD(m){return m>=1000?`${(m/1000).toFixed(1)} km`:`${Math.round(m)} m`;}

// ── Road / area inference ─────────────────────────────────────────
function inferRoadType(lat,lon) {
  const corridors=[
    {lat1:30.83,lon1:76.95,lat2:31.12,lon2:77.20},{lat1:31.12,lon1:77.20,lat2:31.96,lon2:77.11},
    {lat1:31.55,lon1:76.89,lat2:31.96,lon2:77.11},{lat1:31.70,lon1:76.92,lat2:31.83,lon2:77.12},
  ];
  for(const c of corridors){
    const latOk=lat>=Math.min(c.lat1,c.lat2)-0.05&&lat<=Math.max(c.lat1,c.lat2)+0.05;
    const lonOk=lon>=Math.min(c.lon1,c.lon2)-0.05&&lon<=Math.max(c.lon1,c.lon2)+0.05;
    if(latOk&&lonOk)return"2";
  }
  return"1";
}
function inferAreaType(lat,lon) {
  const urban=[[31.1048,77.1734,8000],[31.7088,76.9330,5000],[30.9050,77.0950,4000]];
  for(const[clat,clon,r]of urban){if(hvDist([lat,lon],[clat,clon])<r)return"1";}
  return"0";
}
function getNearestHotspot(lat,lon,radiusM=2000) {
  let nearest=null,minDist=Infinity;
  for(const h of HP_HOTSPOTS){
    const d=hvDist([lat,lon],[h.lat,h.lon]);
    if(d<radiusM&&d<minDist){minDist=d;nearest={...h,distanceM:Math.round(d)};}
  }
  return nearest;
}
function buildRiskParams(lat,lon,speedKph=45) {
  const h=new Date().getHours(),d=new Date().getDay();
  const timeOfDay=(h>=5&&h<9)?"0":(h>=9&&h<17)?"1":(h>=17&&h<20)?"2":"3";
  const dayOfWeek=String(d===0?6:d-1);
  const lightCondition=(h<6||h>=20)?"1":"0";
  const roadType=inferRoadType(lat,lon);
  const areaType=inferAreaType(lat,lon);
  const nearH=getNearestHotspot(lat,lon,2000);
  const criticalZone=nearH?"1":"0";
  const speed=Math.max(5,Math.min(120,speedKph));
  const vehicles=timeOfDay==="2"?8:timeOfDay==="1"?5:timeOfDay==="3"?2:3;
  return{
    weather:"0",roadType,timeOfDay,areaType,dayOfWeek,
    roadCondition:"0",vehicleType:"0",lightCondition,criticalZone,
    speed,vehicles,visibility:1000,_near:nearH,
  };
}

// ── Leaflet icon helpers ──────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function mkAmbulanceIcon(hdg=0,sc=50) {
  const c=RC(sc);
  return L.divIcon({
    className:"",iconSize:[60,60],iconAnchor:[30,30],
    html:`<div style="transform:rotate(${hdg}deg);width:60px;height:60px;display:flex;align-items:center;justify-content:center;">
      <div style="background:${c};width:40px;height:40px;border-radius:50%;
        box-shadow:0 2px 14px ${c}88,0 0 0 7px ${c}22;
        border:3px solid rgba(255,255,255,0.95);
        display:flex;align-items:center;justify-content:center;font-size:18px;">🚑</div>
    </div>`,
  });
}

const patientIcon=L.divIcon({className:"",iconSize:[34,42],iconAnchor:[17,42],
  html:`<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 0C7.61 0 0 7.61 0 17c0 12.73 17 25 17 25S34 29.73 34 17C34 7.61 26.39 0 17 0z" fill="#dc2626"/>
    <circle cx="17" cy="17" r="7" fill="white"/>
    <circle cx="17" cy="17" r="3.5" fill="#dc2626"/>
  </svg>`});

const hospitalIcon=L.divIcon({className:"",iconSize:[34,42],iconAnchor:[17,42],
  html:`<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 0C7.61 0 0 7.61 0 17c0 12.73 17 25 17 25S34 29.73 34 17C34 7.61 26.39 0 17 0z" fill="#16a34a"/>
    <circle cx="17" cy="17" r="7" fill="white"/>
    <text x="17" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="#16a34a">H</text>
  </svg>`});

// ── Leaflet CSS loader ────────────────────────────────────────────
function useLeafletCSS() {
  const[ready,setReady]=useState(!!document.getElementById("leaflet-css")?.sheet);
  useEffect(()=>{
    const ex=document.getElementById("leaflet-css");
    if(ex){ex.sheet?setReady(true):ex.addEventListener("load",()=>setReady(true),{once:true});return;}
    const l=document.createElement("link");
    l.id="leaflet-css";l.rel="stylesheet";l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    l.onload=()=>setReady(true);l.onerror=()=>setReady(true);
    document.head.appendChild(l);
  },[]);
  return ready;
}

function MapController({mapRef}){const map=useMap();useEffect(()=>{mapRef.current=map;},[map,mapRef]);return null;}

// ── OSRM route fetch ──────────────────────────────────────────────
async function fetchRoute(fromLat,fromLon,toLat,toLon) {
  const url=`https://router.project-osrm.org/route/v1/car/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true`;
  const res=await fetch(url);
  const data=await res.json();
  if(data.code!=="Ok"||!data.routes?.length) throw new Error("No route");
  const route=data.routes[0];
  const leg=route.legs[0];
  const coords=route.geometry.coordinates.map(([ln,la])=>[la,ln]);
  const steps=leg.steps.map(step=>{
    const m=step.maneuver;const mod=m.modifier||"";
    let instr="Continue";
    if(m.type==="depart")          instr=`Head out${step.name?` onto ${step.name}`:""}`;
    else if(m.type==="arrive")     instr="Arrived at patient";
    else if(m.type==="turn")       instr=`Turn ${mod}${step.name?` onto ${step.name}`:""}`;
    else if(m.type==="new name")   instr=`Continue on ${step.name||"road"}`;
    else if(m.type==="roundabout") instr="Enter roundabout";
    else instr=`${m.type} ${mod}`.trim();
    return{instruction:instr,type:m.type,modifier:mod,distance_m:Math.round(step.distance),name:step.name||""};
  });
  return{coords,distance_km:+(route.distance/1000).toFixed(1),duration_min:Math.round(route.duration/60),steps};
}

// ── Real risk score via /api/predict ─────────────────────────────
async function fetchRealRisk(lat,lon,speedKph) {
  const params=buildRiskParams(lat,lon,speedKph);
  const{_near,...payload}=params;
  try{
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error("predict failed");
    const d=await res.json();
    return{
      score:Math.round(d.score??d.rf_boosted??50),
      rfScore:Math.round(d.rf_score??50),
      lstmScore:d.lstm_score!=null?Math.round(d.lstm_score):null,
      xaiText:d.xai_explanation??"",
      nearHotspot:params._near,
    };
  }catch{
    const h=new Date().getHours();let sc=30;
    if(speedKph>80)sc+=20;else if(speedKph>60)sc+=10;
    if(h<6||h>=20)sc+=10;
    if(params.criticalZone==="1")sc+=12;
    if(params.roadType==="1")sc+=5;
    return{score:Math.min(100,sc),rfScore:Math.min(100,sc),lstmScore:null,xaiText:"Rule-based fallback",nearHotspot:params._near};
  }
}

// ── Validate a [lat, lon] pair is usable ──────────────────────────
function isValidLatLon(pos) {
  return (
    Array.isArray(pos) &&
    pos.length === 2 &&
    typeof pos[0] === "number" &&
    typeof pos[1] === "number" &&
    !isNaN(pos[0]) &&
    !isNaN(pos[1]) &&
    pos[0] !== 0 &&
    pos[1] !== 0 &&
    pos[0] >= -90 && pos[0] <= 90 &&
    pos[1] >= -180 && pos[1] <= 180
  );
}

// ── Turn arrow helper ─────────────────────────────────────────────
function TurnArrow({type="",modifier=""}){
  const m=`${type} ${modifier}`.toLowerCase();
  if(m.includes("uturn"))       return<span>↩</span>;
  if(m.includes("sharp left"))  return<span>↰</span>;
  if(m.includes("sharp right")) return<span>↱</span>;
  if(m.includes("slight left")) return<span>↖</span>;
  if(m.includes("slight right"))return<span>↗</span>;
  if(m.includes("left"))        return<span>↰</span>;
  if(m.includes("right"))       return<span>↱</span>;
  if(m.includes("arrive"))      return<span>🏁</span>;
  if(m.includes("depart"))      return<span>🚦</span>;
  if(m.includes("roundabout"))  return<span>🔄</span>;
  return<span>↑</span>;
}

// ── Nearest hospital snap ─────────────────────────────────────────
function snapNearestHospital(patientLatLon) {
  if (!HP_HOSP.length) return { name:"IGMC Shimla", lat:31.1048, lon:77.1734 };
  const [pLat, pLon] = patientLatLon;
  const nearby = HP_HOSP.filter(h => Math.abs(h.lat - pLat) < 2 && Math.abs(h.lon - pLon) < 2);
  const pool = nearby.length > 0 ? nearby : HP_HOSP;
  return pool.reduce((best, h) =>
    hvDist(patientLatLon, [h.lat, h.lon]) < hvDist(patientLatLon, [best.lat, best.lon]) ? h : best
  , pool[0]);
}

const AmbulanceTracker = ({ 
  patientPos: propPatientPos, 
  hospitalPos,
  patientName, 
  severity = "2", 
  victimRiskScore,
  onClose 
}) => {


  const [gpsPhase, setGpsPhase] = useState("validating");
  const [gpsError, setGpsError] = useState(null);
  const [pPos, setPPos] = useState(null);
  const [hPos, setHPos] = useState(null);
  const [hName, setHName] = useState("Nearest Hospital");

  useEffect(() => {
    let pos = propPatientPos;
    if (Array.isArray(pos) && pos.length === 2) {
      pos = [parseFloat(pos[0]), parseFloat(pos[1])];
    }
    if (!isValidLatLon(pos)) {
      setGpsError("No valid patient location received.");
      setGpsPhase("invalid");
      return;
    }
    setPPos(pos);
    if (hospitalPos && isValidLatLon(hospitalPos)) {
      setHPos(hospitalPos);
      setHName("Hospital");
    } else {
      const h = snapNearestHospital(pos);
      setHPos([h.lat, h.lon]);
      setHName(h.name);
    }
    setGpsPhase("ready");
  }, [propPatientPos, hospitalPos]);

  const leafletReady  = useLeafletCSS();
  const mapRef        = useRef(null);
  const animRef       = useRef(null);
  const animState     = useRef({running:false});
  const ambMarkerRef  = useRef(null);
  const scRef         = useRef(50);
  const stepsRef      = useRef([]);
  const spokenHotspotsRef = useRef(new Set());
  const ambHdgRef     = useRef(0);

  const [routeCoords,   setRouteCoords]   = useState([]);
  const [drivenIdx,     setDrivenIdx]     = useState(0);
  const [routeInfo,     setRouteInfo]     = useState(null);
  const [steps,         setSteps]         = useState([]);
  const [currentStep,   setCurrentStep]   = useState(0);
  const [ambPos,        setAmbPos]        = useState(null);
  const [ambHdg,        setAmbHdg]        = useState(0);
  const [isMoving,      setIsMoving]      = useState(false);
  const [tripPct,       setTripPct]       = useState(0);
  const [kmLeft,        setKmLeft]        = useState(null);
  const [etaSec,        setEtaSec]        = useState(null);
  const [arrived,       setArrived]       = useState(false);
  const [panelOpen,     setPanelOpen]     = useState(true);
  const [riskScore,     setRiskScore]     = useState(null);
  const [rfScore,       setRfScore]       = useState(null);
  const [lstmScore,     setLstmScore]     = useState(null);
  const [xaiText,       setXaiText]       = useState("");
  const [nearHotspot,   setNearHotspot]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [voiceOn,       setVoiceOn]       = useState(true);
  const [statusPhase,   setStatusPhase]   = useState(0);
  const [speed,         setSpeed]         = useState(60);
  const [activeHotspots, setActiveHotspots] = useState([]);

  const PHASES=[
    {label:"Dispatched",    desc:"Ambulance assigned and en route",  color:T.blue},
    {label:"Approaching",   desc:"2 km away — navigating to you",    color:T.orange},
    {label:"Very Close",    desc:"500 m away — keep phone visible",  color:"#d97706"},
    {label:"Arrived! 🚑",  desc:"Ambulance is at your location",    color:T.green},
  ];
  const phase=PHASES[statusPhase];

  const speak=useCallback((text)=>{
    if(!voiceOn||!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang="en-IN";u.rate=0.9;
    window.speechSynthesis.speak(u);
  },[voiceOn]);

  const calcRisk = useCallback(async (lat, lon, spd = 60) => {
    const result = await fetchRealRisk(lat, lon, spd);
    setRiskScore(result.score);
    setRfScore(result.rfScore);
    setLstmScore(result.lstmScore);
    setXaiText(result.xaiText);
    setNearHotspot(result.nearHotspot);
    scRef.current = result.score;
    if (ambMarkerRef.current) {
      try { ambMarkerRef.current.setIcon(mkAmbulanceIcon(ambHdgRef.current, result.score)); } catch (_) {}
    }
  }, []);

  const stopAnim = useCallback(() => {
    animState.current.running = false;
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    setIsMoving(false);
    if (ambMarkerRef.current) {
      try { ambMarkerRef.current.remove(); } catch (_) {}
      ambMarkerRef.current = null;
    }
  }, []);

  useEffect(()=>{stepsRef.current=steps;},[steps]);

  const startAnim=useCallback((coords,durationMin)=>{
    stopAnim();
    if(!coords||coords.length<2) return;
    const cumM=[0];
    for(let i=1;i<coords.length;i++) cumM.push(cumM[cumM.length-1]+hvDist(coords[i-1],coords[i]));
    const totalM=cumM[cumM.length-1];
    if(totalM<10) return;
    const SIM_MS=Math.min(durationMin*60*1000,90_000);
    const speedMpMs=totalM/SIM_MS;
    let distTravelled=0,lastTs=null,lastDisplayTs=0;
    let smoothHdg=brng(coords[0],coords[1]);
    let iconScore=scRef.current,stepPointer=0,lastRiskDist=0;
    const map=mapRef.current;
    setAmbPos(coords[0]);setAmbHdg(smoothHdg);setIsMoving(true);
    setTripPct(0);setKmLeft(totalM/1000);setEtaSec(durationMin*60);setDrivenIdx(0);
    setActiveHotspots([]);
    spokenHotspotsRef.current.clear();
    if (map) {
      if (ambMarkerRef.current) { try { ambMarkerRef.current.remove(); } catch (_) {} ambMarkerRef.current = null; }
      try {
        ambMarkerRef.current = L.marker(coords[0], {
          icon: mkAmbulanceIcon(smoothHdg, scRef.current),
          zIndexOffset: 1200,
          interactive: false,
        }).addTo(map);
      } catch (_) {}
      try { map.fitBounds([coords[0], coords[coords.length - 1]], { padding: [80, 80], animate: true }); } catch (_) {}
    }
    animState.current={running:true};
    const frame=(ts)=>{
      if(!animState.current.running) return;
      if(lastTs===null){lastTs=ts;animRef.current=requestAnimationFrame(frame);return;}
      const dt=Math.min(ts-lastTs,50);lastTs=ts;
      distTravelled+=speedMpMs*dt;
      if(distTravelled>=totalM){
        const fp=coords[coords.length-1];
        if(ambMarkerRef.current) ambMarkerRef.current.setLatLng(fp);
        setAmbPos(fp);setKmLeft(0);setEtaSec(0);setTripPct(100);
        stopAnim();setArrived(true);setStatusPhase(3);setActiveHotspots([]);
        speak("Ambulance has arrived!");
        return;
      }
      let si=0;
      for(let i=0;i<coords.length-1;i++){if(cumM[i+1]>distTravelled){si=i;break;}}
      const segDist=distTravelled-cumM[si];
      const segLen=cumM[si+1]-cumM[si];
      const t=segLen>0?Math.min(segDist/segLen,1):0;
      const pos=lerp(coords[si],coords[si+1],t);
      const rawHdg=brng(coords[si],coords[si+1]);
      let hdgDiff=rawHdg-smoothHdg;
      if(hdgDiff>180)hdgDiff-=360;if(hdgDiff<-180)hdgDiff+=360;
      smoothHdg=(smoothHdg+hdgDiff*0.08+360)%360;
      ambHdgRef.current = smoothHdg;
      const simSpd=Math.round(40+Math.sin(ts/3000)*15);
      setSpeed(simSpd);
      if(ambMarkerRef.current){
        ambMarkerRef.current.setLatLng(pos);
        const curSc=scRef.current;
        if(curSc!==iconScore){iconScore=curSc;ambMarkerRef.current.setIcon(mkAmbulanceIcon(smoothHdg,curSc));}
      }
      if(ts-lastDisplayTs>200){
        lastDisplayTs=ts;
        const remM=totalM-distTravelled;
        const pct=Math.min(100,(distTravelled/totalM)*100);
        setKmLeft(remM/1000);setEtaSec((remM/totalM)*durationMin*60);
        setTripPct(pct);setDrivenIdx(si);setAmbPos(pos);setAmbHdg(smoothHdg);
        if(pct<30) setStatusPhase(0);
        else if(pct<65) setStatusPhase(1);
        else if(pct<90) setStatusPhase(2);
        const nearby=HP_HOTSPOTS
          .map(h=>({...h,dist:hvDist(pos,[h.lat,h.lon])}))
          .filter(h=>h.dist<3000)
          .sort((a,b)=>a.dist-b.dist);
        setActiveHotspots(nearby);
        for(const h of nearby){
          if(!spokenHotspotsRef.current.has(h.id)){
            spokenHotspotsRef.current.add(h.id);
            speak(`Caution! Approaching ${h.name}.`);
            break;
          }
        }
      }
      if(map){
        try{
          const px=map.latLngToContainerPoint(pos);
          const cx=map.latLngToContainerPoint(map.getCenter());
          if(Math.sqrt((px.x-cx.x)**2+(px.y-cx.y)**2)>100)
            map.panTo(pos,{animate:true,duration:0.5});
        }catch(_){}
      }
      const kmTravelled=distTravelled/1000;
      if(kmTravelled-lastRiskDist>=0.5){lastRiskDist=kmTravelled;calcRisk(pos[0],pos[1],simSpd);}
      const curSteps=stepsRef.current;
      if(curSteps.length){
        let cumKm=0;const donKm=distTravelled/1000;
        for(let i=0;i<curSteps.length;i++){
          cumKm+=(curSteps[i].distance_m||0)/1000;
          if(cumKm>donKm){
            if(i!==stepPointer){stepPointer=i;setCurrentStep(i);speak(curSteps[i].instruction||"");}
            break;
          }
        }
      }
      animRef.current=requestAnimationFrame(frame);
    };
    animRef.current=requestAnimationFrame(frame);
  },[stopAnim,speak,calcRisk]);

  useEffect(() => {
    if (gpsPhase !== "ready" || !pPos || !hPos) return;
    (async () => {
      setLoading(true);
      try {
        const route = await fetchRoute(hPos[0], hPos[1], pPos[0], pPos[1]);
        setRouteCoords(route.coords);
        setRouteInfo({ distance_km: route.distance_km, duration_min: route.duration_min });
        setSteps(route.steps);
        setKmLeft(route.distance_km);
        setEtaSec(route.duration_min * 60);
        await calcRisk(hPos[0], hPos[1], 65);
        setLoading(false);
        speak(`Ambulance dispatched from ${hName}. ETA ${route.duration_min} minutes.`);
        setTimeout(() => startAnim(route.coords, route.duration_min), 600);
      } catch (err) {
        setLoading(false);
      }
    })();
    return () => { stopAnim(); };
  }, [gpsPhase, pPos, hPos]);

  const sc=riskScore??50;
  const stepClr=steps[currentStep]?RC(sc):T.orange;
  const remainCoords=routeCoords.length>0?routeCoords.slice(drivenIdx):routeCoords;

  if (gpsPhase === "validating") return (
    <Box sx={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>
       <Typography sx={{color:"#fff"}}>Validating Location...</Typography>
    </Box>
  );

  if (gpsPhase === "invalid") return (
    <Box sx={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>
       <Box sx={{background:"#fff",p:3,borderRadius:2}}>
         <Typography color="error">{gpsError}</Typography>
         <button onClick={onClose}>Close</button>
       </Box>
    </Box>
  );

  if(!leafletReady||loading) return (
    <Box sx={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"}}>
       <Typography sx={{color:"#fff"}}>Dispatching...</Typography>
    </Box>
  );

  return(
    <Box sx={{position:"fixed",inset:0,zIndex:9999,display:"flex",flexDirection:{xs:"column-reverse",md:"row"},fontFamily:"'DM Sans',sans-serif",overflow:"hidden",background:T.bg}}>
      <Box sx={{width:{xs:"100%",md:panelOpen?420:0},minWidth:{md:panelOpen?420:0},height:{xs:panelOpen?"auto":54,md:"100%"},maxHeight:{xs:panelOpen?"88vh":54,md:"none"},flexShrink:0,background:T.panel,boxShadow:"2px 0 24px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",overflow:"hidden",zIndex:10,transition:"all 0.3s ease",borderRight:`1px solid ${T.border}`}}>
        <Box sx={{display:"flex",alignItems:"center",gap:1,px:2,py:1.4,borderBottom:`1px solid ${T.border}`}}>
          <Typography sx={{fontWeight:800,fontSize:15,flex:1}}>Ambulance Tracking</Typography>
          <IconButton size="small" onClick={onClose}><ChevronLeft/></IconButton>
        </Box>
        {panelOpen && (
          <Box sx={{flex:1,overflowY:"auto",p:2}}>
            <Box sx={{p:2,background:RCL(sc),borderRadius:3,border:`1.5px solid ${RCB(sc)}`,mb:2}}>
              <Typography sx={{fontWeight:800,fontSize:16,color:phase.color}}>{phase.label}</Typography>
              <Typography sx={{fontSize:11,color:T.textSub}}>{phase.desc}</Typography>
              <LinearProgress variant="determinate" value={tripPct} sx={{height:8,borderRadius:4,my:1.5}}/>
              <Typography sx={{fontSize:14,fontWeight:900,color:T.orange}}>{fmtD((kmLeft||0)*1000)} left</Typography>
            </Box>
            {steps.map((step,i)=>(
              <Box key={i} sx={{display:"flex",gap:1.5,mb:2,opacity:i<currentStep?0.4:1}}>
                 <Box sx={{fontSize:18}}><TurnArrow type={step.type} modifier={step.modifier}/></Box>
                 <Box>
                    <Typography sx={{fontSize:12,fontWeight:700}}>{step.instruction}</Typography>
                    <Typography sx={{fontSize:10,color:T.textSub}}>{fmtD(step.distance_m)}</Typography>
                 </Box>
              </Box>
            ))}
            <button onClick={onClose} style={{width:"100%",padding:12,background:"#ef4444",color:"#fff",border:"none",borderRadius:10,fontWeight:800,cursor:"pointer",marginTop:20}}>Close Tracker</button>
          </Box>
        )}
      </Box>

      <Box sx={{flex:1,position:"relative"}}>
        <MapContainer center={pPos} zoom={13} style={{height:"100%",width:"100%"}} zoomControl={false}>
          <MapController mapRef={mapRef}/>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
           {remainCoords.length>1&&<Polyline positions={remainCoords} pathOptions={{color:RC(sc),weight:6}}/>}
          <Marker position={pPos} icon={patientIcon}/>
          <Marker position={hPos} icon={hospitalIcon}/>

          {/* Hotspots for emergency awareness */}
          {HP_HOTSPOTS.map((h, i) => (
            <Circle 
              key={`hs_${i}`} 
              center={[h.lat, h.lon]} 
              radius={h.risk === "HIGH" ? 500 : 300} 
              pathOptions={{ color: h.risk === "HIGH" ? "#dc2626" : "#ea580c", fillOpacity: 0.1 }}
            />
          ))}
        </MapContainer>

        {/* 👮 OFFICER CARD - High Fidelity Aesthetic */}
        <Box sx={{
          position: "absolute", bottom: 25, left: "50%", transform: "translateX(-50%)",
          width: "90%", maxWidth: 380, zIndex: 1000,
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: "28px",
          p: 2,
          display: "flex", gap: 2, alignItems: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)"
        }}>
          <Box sx={{ 
            width: 60, height: 60, borderRadius: "20px", 
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, boxShadow: "0 8px 16px rgba(37, 99, 235, 0.2)"
          }}>👮</Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 900, color: "#0f172a", lineHeight: 1.2 }}>Officer Vikram Singh</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Advanced Life Support (ALS) • 4.9★</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <Chip label="HP 01 A 7782" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: "#f1f5f9" }} />
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#ef4444" }}>{speed} km/h</Typography>
            </Box>
          </Box>
           <Box sx={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 950, color: "#2563eb", lineHeight: 1 }}>{Math.ceil((etaSec||0)/60)}</Typography>
              <Typography sx={{ fontSize: 9, fontWeight: 800, color: "#64748b" }}>MINS</Typography>
            </Box>
            <IconButton 
              size="small" 
              href="tel:108"
              sx={{ mt: 1, bgcolor: "#2563eb", color: "#fff", "&:hover": { bgcolor: "#1d4ed8" } }}
            >
              <Typography sx={{ fontSize: 10, fontWeight: 900, px: 0.5 }}>CALL</Typography>
            </IconButton>
          </Box>
        </Box>

        {/* 🏥 PATIENT CARD */}
        <Box sx={{
          position: "absolute", top: 25, left: "50%", transform: "translateX(-50%)",
          width: "90%", maxWidth: 380, zIndex: 1000,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(220, 38, 38, 0.3)",
          borderRadius: "28px",
          p: 2,
          display: "flex", gap: 2, alignItems: "center",
          boxShadow: "0 24px 60px rgba(220, 38, 38, 0.15)"
        }}>
          <Box sx={{ 
            width: 50, height: 50, borderRadius: "15px", 
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, color: "#fff"
          }}>👤</Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>{patientName || "Emergency Victim"}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.3 }}>
              <Chip 
                label={severity === "3" || severity === "severe" ? "CRITICAL" : "STABLE"} 
                size="small" 
                sx={{ height: 18, fontSize: 9, fontWeight: 900, bgcolor: severity === "3" ? "#fee2e2" : "#f1f5f9", color: severity === "3" ? "#dc2626" : "#64748b" }} 
              />
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>📍 {pPos ? `${pPos[0].toFixed(4)}, ${pPos[1].toFixed(4)}` : "Detecting..."}</Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ fontSize: 10, fontWeight: 800, color: "#dc2626" }}>SEVERITY</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 950, color: "#dc2626", lineHeight: 1 }}>
              {severity === "3" ? "99" : victimRiskScore || "25"}
            </Typography>
          </Box>
        </Box>

      </Box>
    </Box>
  );
}

export default AmbulanceTracker;
