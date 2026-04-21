/**
 * Navigation.jsx v9.3 — IntelliCrash Final
 * ─────────────────────────────────────────────────────────────────
 * Changes from v9.2:
 *  ✅ Post-trip Review modal now calls POST /api/reviews (sentiment analysis)
 *  ✅ Shows sentiment result (positive/negative/neutral) to driver after submit
 *  ✅ Top positive reviews shown in Home page (driver public view)
 *  ✅ All reviews + sentiment stats shown ONLY in Admin dashboard
 *  ✅ All original nav features preserved 100%
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
} from "@mui/material";
import { ChevronLeft, ChevronRight, SwapVert } from "@mui/icons-material";

import {
  geocodePlace, reverseGeocode, initGM, getDirections, addReport,
  getReports, saveSession, saveGM, predictRisk, getWeather,
  searchPlaces, getWeatherForecast,
} from "../services/api";
import "./Navigation.css";

// ── compressImages fallback ──────────────────────────────────────
let compressImages = async (files) =>
  Promise.all(Array.from(files).map(
    (f) => new Promise((res) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f);
    })
  ));
try {
  const m = await import("../services/imageUtils");
  if (m?.compressImages) compressImages = m.compressImages;
} catch (_) {}

// ── Fix Leaflet icons ─────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Design tokens ─────────────────────────────────────────────────
const T = {
  bg:      "#0a0a0f",
  panel:   "#0f0f18",
  card:    "#161622",
  border:  "rgba(255,255,255,0.07)",
  text:    "#f0f0f8",
  textSub: "rgba(255,255,255,0.45)",
  orange:  "#f97316",
  red:     "#ef4444",
  green:   "#22c55e",
  blue:    "#3b82f6",
};

// ── Vehicle profiles ──────────────────────────────────────────────
const VP = {
  car:   { label:"Car",   icon:"🚗", osrm:"driving",  avg:45, factor:1.00, color:"#f97316" },
  bike:  { label:"Bike",  icon:"🏍️", osrm:"driving",  avg:55, factor:0.88, color:"#f97316" },
  walk:  { label:"Walk",  icon:"🚶", osrm:"walking",  avg:5,  factor:1.00, color:"#22c55e" },
  truck: { label:"Truck", icon:"🚛", osrm:"driving",  avg:35, factor:1.25, color:"#8b5cf6" },
  auto:  { label:"Auto",  icon:"🛺", osrm:"driving",  avg:30, factor:1.10, color:"#f97316" },
};

// ── IRAD 2025-26 Himachal Pradesh Hotspots ────────────────────────
const HP_HOTSPOTS = [
  { id:1,  lat:31.10297, lon:77.20796,  name:"Dhalli–Kufri Stretch",      district:"Shimla",   accidents:28, killed:8,  risk:"HIGH"   },
  { id:2,  lat:31.10297, lon:77.169533, name:"Sadar/East Shimla NH-5",    district:"Shimla",   accidents:22, killed:5,  risk:"HIGH"   },
  { id:3,  lat:31.11,    lon:77.143914, name:"Shimla West Bypass",        district:"Shimla",   accidents:18, killed:4,  risk:"HIGH"   },
  { id:4,  lat:31.127,   lon:77.228,    name:"Mashobra Bifurcation",      district:"Shimla",   accidents:9,  killed:7,  risk:"HIGH"   },
  { id:5,  lat:31.20544, lon:77.745944, name:"Rohru–Rampur Corridor",     district:"Shimla",   accidents:16, killed:3,  risk:"MEDIUM" },
  { id:6,  lat:31.32,    lon:77.42,     name:"Narkanda Hairpin Bends",    district:"Shimla",   accidents:12, killed:6,  risk:"HIGH"   },
  { id:7,  lat:31.55129, lon:76.900541, name:"Dhanotu–Sundernagar NH-21", district:"Mandi",    accidents:24, killed:4,  risk:"HIGH"   },
  { id:8,  lat:31.628145,lon:76.938968, name:"Balh Valley NH-21",         district:"Mandi",    accidents:17, killed:6,  risk:"HIGH"   },
  { id:9,  lat:31.576909,lon:76.91335,  name:"Ner Chowk Intersection",    district:"Mandi",    accidents:16, killed:5,  risk:"HIGH"   },
  { id:10, lat:31.83,    lon:77.11,     name:"Mandi City NH-3",           district:"Mandi",    accidents:11, killed:4,  risk:"HIGH"   },
  { id:11, lat:31.1048,  lon:77.1734,   name:"Jhiri–Pandoh",              district:"Mandi",    accidents:5,  killed:2,  risk:"MEDIUM" },
  { id:12, lat:30.898024,lon:77.092678, name:"Sadar Solan NH-5",          district:"Solan",    accidents:23, killed:7,  risk:"HIGH"   },
  { id:13, lat:30.923719,lon:76.797995, name:"Baddi Industrial Belt",     district:"Solan",    accidents:21, killed:11, risk:"HIGH"   },
  { id:14, lat:30.911042,lon:76.836685, name:"Barotiwala–Baddi",          district:"Solan",    accidents:18, killed:5,  risk:"HIGH"   },
  { id:15, lat:30.909,   lon:77.020,    name:"Dharampur NH-5 Stretch",    district:"Solan",    accidents:15, killed:9,  risk:"HIGH"   },
  { id:16, lat:31.039,   lon:76.708403, name:"Nalagarh Bypass",           district:"Solan",    accidents:14, killed:5,  risk:"HIGH"   },
  { id:17, lat:32.114893,lon:76.388175, name:"Nagrota Bagwan NH-503",     district:"Kangra",   accidents:16, killed:3,  risk:"MEDIUM" },
  { id:18, lat:32.09,    lon:76.11,     name:"Dharamshala Bypass",        district:"Kangra",   accidents:13, killed:2,  risk:"MEDIUM" },
  { id:19, lat:32.22,    lon:76.32,     name:"Palampur Hill Road",        district:"Kangra",   accidents:10, killed:4,  risk:"HIGH"   },
  { id:20, lat:32.2396,  lon:77.1887,   name:"Rohtang Pass Approach",     district:"Kullu",    accidents:15, killed:7,  risk:"HIGH"   },
  { id:21, lat:31.957,   lon:77.109,    name:"Kullu–Bhuntar NH-3",        district:"Kullu",    accidents:19, killed:8,  risk:"HIGH"   },
  { id:22, lat:32.05,    lon:77.32,     name:"Manali Approach Bend",      district:"Kullu",    accidents:14, killed:5,  risk:"HIGH"   },
  { id:23, lat:30.449704,lon:77.566616, name:"Poanta Sahib NH-7",         district:"Sirmaur",  accidents:15, killed:4,  risk:"HIGH"   },
  { id:24, lat:30.58,    lon:77.46,     name:"Renuka–Nahan Road",         district:"Sirmaur",  accidents:9,  killed:3,  risk:"MEDIUM" },
  { id:25, lat:31.47,    lon:76.27,     name:"Una Town NH-503",           district:"Una",      accidents:12, killed:3,  risk:"MEDIUM" },
  { id:26, lat:31.68,    lon:76.52,     name:"Hamirpur Bypass",           district:"Hamirpur", accidents:8,  killed:2,  risk:"MEDIUM" },
  { id:27, lat:32.55,    lon:76.12,     name:"Chamba–Dalhousie Road",     district:"Chamba",   accidents:11, killed:5,  risk:"HIGH"   },
  { id:28, lat:32.70,    lon:77.05,     name:"Keylong Lahaul Stretch",    district:"Lahaul",   accidents:7,  killed:4,  risk:"HIGH"   },
  { id:29, lat:30.928968,lon:76.811236, name:"Hotel Classic Barotiwala",  district:"Baddi",    accidents:8,  killed:9,  risk:"HIGH"   },
  { id:30, lat:31.38,    lon:76.83,     name:"Swarghat–Bilaspur",         district:"Bilaspur", accidents:14, killed:6,  risk:"HIGH"   },
];

const CRITICAL_ZONES = [
  { id:"h1", lat:31.1048,  lon:77.1734,  name:"IGMC Shimla",              type:"hospital", warn:"Hospital zone — slow to 30 km/h",           radius:400  },
  { id:"h2", lat:31.7088,  lon:76.9330,  name:"Zonal Hospital Mandi",     type:"hospital", warn:"Hospital zone — slow to 30 km/h",           radius:350  },
  { id:"h3", lat:31.9578,  lon:77.1095,  name:"District Hospital Kullu",  type:"hospital", warn:"Hospital zone — 30 km/h",                   radius:300  },
  { id:"h4", lat:32.0947,  lon:76.1022,  name:"DDU Hospital Dharamshala", type:"hospital", warn:"Hospital zone — 30 km/h",                   radius:300  },
  { id:"h5", lat:30.9050,  lon:77.0950,  name:"Civil Hospital Solan",     type:"hospital", warn:"Hospital zone — 30 km/h",                   radius:300  },
  { id:"s1", lat:31.1020,  lon:77.1680,  name:"Shimla Public School",     type:"school",   warn:"School zone — 20 km/h, watch for children", radius:250  },
  { id:"s2", lat:31.7100,  lon:76.9280,  name:"Govt School Mandi",        type:"school",   warn:"School zone — 20 km/h",                     radius:200  },
  { id:"s3", lat:32.0980,  lon:76.1010,  name:"TCV School Dharamshala",   type:"school",   warn:"School zone — 20 km/h",                     radius:200  },
  { id:"p1", lat:31.1048,  lon:77.1900,  name:"Dhalli Police Naka",       type:"police",   warn:"Police checkpoint — carry documents",        radius:150  },
  { id:"p2", lat:31.5100,  lon:76.9000,  name:"Sundernagar Naka",         type:"police",   warn:"Police naka ahead",                         radius:150  },
  { id:"p3", lat:30.8400,  lon:76.9640,  name:"Parwanoo Check Post",      type:"police",   warn:"Border check post — have ID ready",          radius:200  },
  { id:"b1", lat:31.7100,  lon:76.9200,  name:"Mandi Beas Bridge",        type:"bridge",   warn:"Single-lane bridge — one vehicle at a time", radius:120  },
  { id:"b2", lat:31.5500,  lon:76.8900,  name:"Sundernagar Span",         type:"bridge",   warn:"Narrow bridge — proceed with caution",       radius:100  },
  { id:"b3", lat:31.3800,  lon:76.8300,  name:"Bilaspur Gobind Sagar",    type:"bridge",   warn:"Long bridge — no overtaking",                radius:200  },
  { id:"f1", lat:32.2396,  lon:77.1887,  name:"Rohtang Fog Zone",         type:"fog",      warn:"Dense fog possible — use fog lights",        radius:1000 },
  { id:"f2", lat:31.3200,  lon:77.4200,  name:"Narkanda Ice Zone",        type:"fog",      warn:"Black ice risk — drive below 20 km/h",       radius:800  },
  { id:"r1", lat:30.8400,  lon:76.9700,  name:"Parwanoo Railway Xing",    type:"railway",  warn:"Unmanned railway crossing — look both ways", radius:100  },
];

const SPEED_CAMS = [
  { id:"sc1",  lat:30.840, lon:76.964, name:"Parwanoo Entry",    limit:50, type:"camera" },
  { id:"sc2",  lat:31.108, lon:77.173, name:"Shimla Entry NH-5", limit:40, type:"naka"   },
  { id:"sc3",  lat:31.711, lon:76.933, name:"Mandi NH-3",        limit:60, type:"camera" },
  { id:"sc4",  lat:31.957, lon:77.109, name:"Kullu Entry",       limit:50, type:"naka"   },
  { id:"sc5",  lat:31.039, lon:76.709, name:"Nalagarh",          limit:60, type:"camera" },
  { id:"sc6",  lat:30.910, lon:77.096, name:"Solan NH-5",        limit:60, type:"camera" },
  { id:"sc7",  lat:31.628, lon:76.940, name:"Balh NH-21",        limit:60, type:"camera" },
  { id:"sc8",  lat:30.449, lon:77.567, name:"Poanta Sahib",      limit:50, type:"naka"   },
  { id:"sc9",  lat:32.094, lon:76.102, name:"Dharamshala",       limit:40, type:"camera" },
  { id:"sc10", lat:32.057, lon:77.324, name:"Manali Entry",      limit:30, type:"naka"   },
];

const HP_TOLLS = [
  { id:"t1", lat:30.839, lon:76.963, name:"Parwanoo", highway:"NH-5",   fee_car:65,  fee_truck:200, fee_bike:30 },
  { id:"t2", lat:31.370, lon:76.830, name:"Swarghat", highway:"NH-21",  fee_car:55,  fee_truck:180, fee_bike:25 },
  { id:"t3", lat:31.711, lon:76.932, name:"Mandi",    highway:"NH-3",   fee_car:45,  fee_truck:150, fee_bike:20 },
  { id:"t4", lat:31.958, lon:77.110, name:"Kullu",    highway:"NH-3",   fee_car:60,  fee_truck:190, fee_bike:25 },
  { id:"t5", lat:30.909, lon:77.095, name:"Solan",    highway:"NH-5",   fee_car:60,  fee_truck:190, fee_bike:25 },
  { id:"t6", lat:32.094, lon:76.101, name:"Kangra",   highway:"NH-503", fee_car:45,  fee_truck:155, fee_bike:20 },
];

const HP_PASSES = [
  { lat:32.2396, lon:77.1887, name:"Rohtang Pass",        open_months:[5,6,7,8,9,10], elev:"3978m", alt:"Atal Tunnel (year-round)" },
  { lat:31.9,    lon:77.6,    name:"Spiti (Pin-Parvati)", open_months:[6,7,8,9],       elev:"4550m", alt:"Via Shimla" },
  { lat:31.5,    lon:77.4,    name:"Jalori Pass",         open_months:[4,5,6,7,8,9,10],elev:"3120m", alt:"Via NH" },
  { lat:32.55,   lon:76.62,   name:"Sach Pass",           open_months:[6,7,8,9],       elev:"4390m", alt:"Via Chamba town" },
  { lat:32.70,   lon:77.05,   name:"Baralacha La",        open_months:[6,7,8,9],       elev:"4890m", alt:"Manali–Leh Highway" },
];

// ── Math helpers ─────────────────────────────────────────────────
function hvDist([la1,lo1],[la2,lo2]) {
  const R=6371000, φ1=la1*Math.PI/180, φ2=la2*Math.PI/180,
    Δφ=(la2-la1)*Math.PI/180, Δλ=(lo2-lo1)*Math.PI/180,
    a=Math.sin(Δφ/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function brng([la1,lo1],[la2,lo2]) {
  const φ1=la1*Math.PI/180, φ2=la2*Math.PI/180, Δλ=(lo2-lo1)*Math.PI/180,
    y=Math.sin(Δλ)*Math.cos(φ2),
    x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  return((Math.atan2(y,x)*180/Math.PI)+360)%360;
}

function lerp([la1,lo1],[la2,lo2],t){ return [la1+(la2-la1)*t, lo1+(lo2-lo1)*t]; }

// ── Risk helpers ──────────────────────────────────────────────────
function ensembleScore(rf, lstm) {
  if (rf == null && lstm == null) return 50;
  if (rf == null) return lstm;
  if (lstm == null) return rf;
  return Math.round(rf * 0.55 + lstm * 0.45);
}

const RC  = (s) => s >= 67 ? "#ef4444" : s >= 34 ? "#f59e0b" : "#22c55e";
const RCL = (s) => s >= 67 ? "rgba(239,68,68,0.08)"  : s >= 34 ? "rgba(245,158,11,0.08)"  : "rgba(34,197,94,0.08)";
const RCB = (s) => s >= 67 ? "rgba(239,68,68,0.25)"  : s >= 34 ? "rgba(245,158,11,0.25)"  : "rgba(34,197,94,0.25)";
const RL  = (s) => s >= 67 ? "High Risk" : s >= 34 ? "Medium Risk" : "Low Risk";

function segmentRisk(coord) {
  let maxHS = 0;
  HP_HOTSPOTS.forEach(h => {
    const d = hvDist(coord, [h.lat, h.lon]);
    if (d < 3000) {
      const score = h.risk === "HIGH" ? Math.min(100, 70 + (1 - d/3000)*30)
                                       : Math.min(66, 40 + (1 - d/3000)*26);
      if (score > maxHS) maxHS = score;
    }
  });
  return maxHS;
}

function buildRouteSegments(coords) {
  if (coords.length < 2) return [];
  const segs = [];
  let cur = { color: null, points: [coords[0]] };
  for (let i = 1; i < coords.length; i++) {
    const rs = segmentRisk(coords[i]);
    const color = rs >= 67 ? "#ef4444" : rs >= 34 ? "#f59e0b" : "#22c55e";
    if (cur.color === null) cur.color = color;
    if (color === cur.color) { cur.points.push(coords[i]); }
    else { cur.points.push(coords[i]); segs.push({ ...cur }); cur = { color, points: [coords[i]] }; }
  }
  if (cur.points.length > 1) segs.push(cur);
  return segs;
}

function fmtT(s) { const h=Math.floor(s/3600), m=Math.round((s%3600)/60); return h?`${h}h ${m}m`:`${m} min`; }
function fmtD(m) { return m>=1000?`${(m/1000).toFixed(1)} km`:`${Math.round(m)} m`; }

function mkVehicleIcon(key, hdg = 0, score = 50, moving = false) {
  const v = VP[key] || VP.car;
  const c = RC(score);
  const pulse = moving ? `animation:vp 1.6s ease-in-out infinite;` : "";
  return L.divIcon({
    className: "veh-icon",
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    html: `<div class="veh-rotator" style="transform:rotate(${hdg}deg);${pulse}">
      <div class="veh-body" style="background:${c};box-shadow:0 2px 20px ${c}aa,0 0 0 8px ${c}22;border:3px solid rgba(255,255,255,0.9);"></div>
      <div class="veh-nose" style="border-bottom-color:${c};top:-8px;"></div>
    </div>
    <div class="veh-label">${v.icon}</div>`,
  });
}

const srcIcon = L.divIcon({
  className:"", iconSize:[34,42], iconAnchor:[17,42],
  html:`<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">
    <filter id="gs"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#22c55e" flood-opacity="0.6"/></filter>
    <path d="M17 0C7.61 0 0 7.61 0 17c0 12.73 17 25 17 25S34 29.73 34 17C34 7.61 26.39 0 17 0z" fill="#22c55e" filter="url(#gs)"/>
    <circle cx="17" cy="17" r="7" fill="rgba(255,255,255,0.95)"/>
    <circle cx="17" cy="17" r="3.5" fill="#22c55e"/></svg>`,
});

const dstIcon = L.divIcon({
  className:"", iconSize:[34,42], iconAnchor:[17,42],
  html:`<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">
    <filter id="gd"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#ef4444" flood-opacity="0.6"/></filter>
    <path d="M17 0C7.61 0 0 7.61 0 17c0 12.73 17 25 17 25S34 29.73 34 17C34 7.61 26.39 0 17 0z" fill="#ef4444" filter="url(#gd)"/>
    <circle cx="17" cy="17" r="7" fill="rgba(255,255,255,0.95)"/>
    <circle cx="17" cy="17" r="3.5" fill="#ef4444"/></svg>`,
});

function useLeafletCSS() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ex = document.getElementById("leaflet-css");
    if (ex) { ex.sheet ? setReady(true) : ex.addEventListener("load", ()=>setReady(true), {once:true}); return; }
    const l = document.createElement("link");
    l.id="leaflet-css"; l.rel="stylesheet";
    l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    l.onload=()=>setReady(true); l.onerror=()=>setReady(true);
    document.head.appendChild(l);
  },[]);
  return ready;
}

function MapController({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function TurnArrow({ type="", modifier="" }) {
  const m=`${type} ${modifier}`.toLowerCase();
  if(m.includes("uturn"))       return <span>↩</span>;
  if(m.includes("sharp left"))  return <span>↰</span>;
  if(m.includes("sharp right")) return <span>↱</span>;
  if(m.includes("slight left")) return <span>↖</span>;
  if(m.includes("slight right"))return <span>↗</span>;
  if(m.includes("left"))        return <span>↰</span>;
  if(m.includes("right"))       return <span>↱</span>;
  if(m.includes("arrive"))      return <span>🏁</span>;
  if(m.includes("depart"))      return <span>🚦</span>;
  if(m.includes("roundabout"))  return <span>🔄</span>;
  return <span>↑</span>;
}

function PlaceInput({ value, onChange, placeholder, isSource }) {
  const [sug, setSug]   = useState([]);
  const [open, setOpen] = useState(false);
  const tmr = useRef(null);

  const search = useCallback((q) => {
    if (q.length < 2) { setSug([]); setOpen(false); return; }
    clearTimeout(tmr.current);
    tmr.current = setTimeout(async () => {
      try {
        const d = await searchPlaces(q + " Himachal Pradesh India");
        setSug(d.slice(0,8)); setOpen(d.length>0);
      } catch { setSug([]); }
    }, 280);
  },[]);

  const fmt = (item) => {
    const a = item.address||{};
    const main = a.road||a.village||a.hamlet||a.suburb||a.town||a.city||item.display_name.split(",")[0];
    const district = a.state_district||a.county||"";
    const pin = a.postcode||"";
    const sub = [a.village||a.town||"", district, pin].filter(Boolean).join(" · ");
    return { main, sub, full:[main,district,a.state||"Himachal Pradesh",pin].filter(Boolean).join(", ") };
  };

  return (
    <Box sx={{ position:"relative", flex:1 }}>
      <Box sx={{
        display:"flex", alignItems:"center", gap:1.2, px:1.5, py:1,
        background:"rgba(255,255,255,0.05)", borderRadius:2.5,
        border:"1.5px solid rgba(255,255,255,0.08)",
        "&:focus-within":{ background:"rgba(255,255,255,0.08)", border:"1.5px solid #f97316", boxShadow:"0 0 0 3px rgba(249,115,22,0.15)" },
        transition:"all 0.2s",
      }}>
        <Box sx={{
          width:10, height:10, flexShrink:0,
          borderRadius: isSource?"2px":"50%",
          background: isSource?"transparent":"#ef4444",
          border: isSource?"2.5px solid #22c55e":"none",
          transform: isSource?"rotate(45deg)":"none",
        }} />
        <input value={value} onChange={e=>{ onChange(e.target.value); search(e.target.value); }}
          onFocus={()=>{ if(value.length>1&&sug.length>0) setOpen(true); }}
          onBlur={()=>setTimeout(()=>setOpen(false),200)}
          placeholder={placeholder} autoComplete="off"
          style={{ flex:1, border:"none", outline:"none", fontSize:13, fontWeight:500,
            color:"#f0f0f8", fontFamily:"'DM Sans',sans-serif", background:"transparent",
            padding:0, minWidth:0 }}/>
        {value && (
          <button onClick={()=>{ onChange(""); setSug([]); setOpen(false); }}
            style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.3)", fontSize:18, padding:0, lineHeight:1, flexShrink:0 }}>×</button>
        )}
      </Box>
      {open && sug.length>0 && (
        <Box sx={{
          position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:9000,
          background:"#1a1f2e", borderRadius:2.5, boxShadow:"0 12px 40px rgba(0,0,0,0.6)",
          overflow:"hidden", maxHeight:280, overflowY:"auto", border:"1px solid rgba(255,255,255,0.08)",
        }}>
          {sug.map((s,i) => {
            const {main,sub} = fmt(s);
            return (
              <Box key={i} onMouseDown={e=>{ e.preventDefault(); onChange(fmt(s).full); setSug([]); setOpen(false); }}
                sx={{ px:2, py:1.3, display:"flex", gap:1.5, alignItems:"flex-start", cursor:"pointer",
                  "&:hover":{ background:"rgba(249,115,22,0.08)" },
                  borderBottom:i<sug.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
                <Box sx={{ fontSize:13, color:"rgba(255,255,255,0.3)", mt:0.2, flexShrink:0 }}>📍</Box>
                <Box>
                  <Typography sx={{ fontSize:13, fontWeight:600, color:"#f0f0f8", lineHeight:1.3 }}>{main}</Typography>
                  {sub && <Typography sx={{ fontSize:11, color:"rgba(255,255,255,0.4)", mt:0.2 }}>{sub}</Typography>}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════
// POST-TRIP REVIEW MODAL (replaces old feedback modal)
// ── calls POST /api/reviews → gets NLP sentiment back
// ══════════════════════════════════════════════════════════════════
function TripReviewModal({ open, onClose, tripFrom, tripTo, pointsEarned }) {
  const [name,     setName]     = useState("");
  const [rating,   setRating]   = useState(5);
  const [text,     setText]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null); // sentiment result
  const [error,    setError]    = useState("");

  const sentCfg = {
    positive: { color:"#22c55e", bg:"rgba(34,197,94,0.15)", border:"rgba(34,197,94,0.3)", icon:"😊", msg:"Great! Your positive feedback helps us show what's working." },
    negative: { color:"#ef4444", bg:"rgba(239,68,68,0.12)",  border:"rgba(239,68,68,0.3)",  icon:"😞", msg:"Sorry to hear that. We'll use this to improve IntelliCrash." },
    neutral:  { color:"#f59e0b", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.3)", icon:"😐", msg:"Thanks for your balanced feedback." },
  };

  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 5) { setError("Write at least 5 characters."); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ name: name.trim() || "Anonymous", review_text: text.trim(), rating }),
      });
      const data = await res.json();
      if (res.ok) { setResult(data); }
      else { setError(data.detail || "Submission failed."); }
    } catch { setError("Network error. Is the backend running?"); }
    setLoading(false);
  };

  if (!open) return null;

  const sent = result?.sentiment;
  const cfg  = sentCfg[sent?.label] || sentCfg.neutral;

  return (
    <Box sx={{
      position:"fixed", inset:0, zIndex:9999,
      background:"rgba(0,0,0,0.75)", display:"flex",
      alignItems:"center", justifyContent:"center", p:2,
      backdropFilter:"blur(10px)",
    }}>
      <Box sx={{
        background:"#161622", borderRadius:4, p:3.5,
        maxWidth:400, width:"100%",
        boxShadow:"0 32px 80px rgba(0,0,0,0.7)",
        border:"1px solid rgba(255,255,255,0.08)",
        animation:"modalIn 0.3s cubic-bezier(.22,.68,0,1.2)",
        "@keyframes modalIn":{ from:{ opacity:0, transform:"scale(0.92) translateY(12px)" }, to:{ opacity:1, transform:"none" } },
      }}>

        {/* ─ Result screen ─ */}
        {result ? (
          <Box sx={{ textAlign:"center" }}>
            <Typography sx={{ fontSize:48, mb:1 }}>{cfg.icon}</Typography>
            <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:20, color:"#f0f0f8", mb:0.5 }}>
              Thank you!
            </Typography>
            <Box sx={{ display:"inline-flex", alignItems:"center", gap:0.8, px:2, py:0.8, borderRadius:20,
              background:cfg.bg, border:`1px solid ${cfg.border}`, mb:1.5 }}>
              <Typography sx={{ fontSize:13, fontWeight:700, color:cfg.color, textTransform:"capitalize" }}>
                {sent?.label} sentiment
              </Typography>
              {sent?.score && (
                <Typography sx={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>· {sent.score}%</Typography>
              )}
            </Box>
            <Typography sx={{ fontSize:13, color:"rgba(255,255,255,0.5)", mb:2, lineHeight:1.7 }}>
              {cfg.msg}
            </Typography>
            <Box sx={{ p:1.5, background:"rgba(249,115,22,0.08)", borderRadius:2, border:"1px solid rgba(249,115,22,0.2)", mb:2 }}>
              <Typography sx={{ fontSize:14, fontWeight:900, color:"#f97316" }}>+{pointsEarned} pts earned!</Typography>
              <Typography sx={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{tripFrom?.split(",")[0]} → {tripTo?.split(",")[0]}</Typography>
            </Box>
            <button onClick={onClose} style={{
              width:"100%", padding:"12px", border:"none", borderRadius:12,
              background:"linear-gradient(135deg,#f97316,#ef4444)", color:"#fff",
              fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              boxShadow:"0 6px 20px rgba(249,115,22,0.35)",
            }}>Continue Driving 🛡️</button>
          </Box>
        ) : (
          <>
            {/* ─ Form screen ─ */}
            <Box sx={{ textAlign:"center", mb:2.5 }}>
              <Typography sx={{ fontSize:32, mb:0.5 }}>🏁</Typography>
              <Typography sx={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:18, color:"#f0f0f8", mb:0.3 }}>
                Trip Complete!
              </Typography>
              <Typography sx={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>
                {tripFrom?.split(",")[0]} → {tripTo?.split(",")[0]}
              </Typography>
            </Box>

            {/* Rating */}
            <Box sx={{ display:"flex", justifyContent:"center", mb:2 }}>
              <Rating value={rating} onChange={(_, v) => setRating(v || 1)} size="large"
                sx={{ "& .MuiRating-iconFilled":{ color:"#f97316" }, "& .MuiRating-iconEmpty":{ color:"rgba(255,255,255,0.15)" } }} />
            </Box>

            {/* Name */}
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name (optional)"
              style={{
                width:"100%", boxSizing:"border-box",
                border:"1.5px solid rgba(255,255,255,0.08)", borderRadius:10,
                padding:"10px 14px", fontSize:13, fontFamily:"'DM Sans',sans-serif",
                background:"rgba(255,255,255,0.05)", color:"#f0f0f8",
                outline:"none", marginBottom:10,
              }}
            />

            {/* Review text */}
            <textarea
              value={text} onChange={e => { setText(e.target.value); setError(""); }}
              placeholder="How was your experience? Was IntelliCrash helpful on HP roads?"
              rows={3}
              style={{
                width:"100%", boxSizing:"border-box",
                border:"1.5px solid rgba(255,255,255,0.08)", borderRadius:10,
                padding:"10px 14px", fontSize:13, fontFamily:"'DM Sans',sans-serif",
                resize:"none", outline:"none",
                background:"rgba(255,255,255,0.05)", color:"#f0f0f8",
                marginBottom:10,
              }}
            />

            {error && (
              <Typography sx={{ fontSize:12, color:"#f87171", mb:1 }}>{error}</Typography>
            )}

            <Typography sx={{ fontSize:11, color:"rgba(255,255,255,0.3)", mb:2, textAlign:"center" }}>
              🧠 Your review will be analysed by our NLP sentiment model
            </Typography>

            <Box sx={{ display:"flex", gap:1 }}>
              <button onClick={onClose} style={{
                flex:1, padding:"11px", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10,
                background:"rgba(255,255,255,0.04)", cursor:"pointer", fontSize:13,
                color:"rgba(255,255,255,0.5)", fontFamily:"'DM Sans',sans-serif",
              }}>Skip</button>
              <button onClick={handleSubmit} disabled={loading || !text.trim()} style={{
                flex:2, padding:"11px", border:"none", borderRadius:10,
                background: loading ? "rgba(249,115,22,0.3)" : "linear-gradient(135deg,#f97316,#ef4444)",
                color:"#fff", fontSize:14, fontWeight:800, cursor: loading ? "wait" : "pointer",
                fontFamily:"'DM Sans',sans-serif", boxShadow:"0 4px 18px rgba(249,115,22,0.35)",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              }}>
                {loading ? <><CircularProgress size={14} sx={{ color:"#fff" }} /> Analysing…</> : "Submit Review ⭐"}
              </button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
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
  const fileRef     = useRef(null);
  const alertedZones= useRef(new Set());
  const vehMarkerRef  = useRef(null);
  const scRef         = useRef(50);
  const directionsRef = useRef(null);
  const vehicleRef    = useRef("car");
  const leafletReady= useLeafletCSS();

  const [panelMode, setPanelMode]  = useState("search");
  const [panelOpen, setPanelOpen]  = useState(true);
  const [source,     setSource]     = useState(params.get("from")||"");
  const [dest,       setDest]       = useState(params.get("to")||"");
  const [srcGeoPos,  setSrcGeoPos]  = useState(null);
  const [dstGeoPos,  setDstGeoPos]  = useState(null);
  const [vehicle,    setVehicle]    = useState("car");
  const [loading,    setLoading]    = useState(false);
  const [routeCoords,setRouteCoords]= useState([]);
  const [routeSegs,  setRouteSegs]  = useState([]);
  const [directions, setDirections] = useState(null);
  const [currentStep,setCurrentStep]= useState(0);
  const [routeInfo,  setRouteInfo]  = useState(null);
  const [navigating, setNavigating] = useState(false);
  const [vehPos,   setVehPos]   = useState(null);
  const [vehHdg,   setVehHdg]   = useState(0);
  const [kmLeft,   setKmLeft]   = useState(null);
  const [etaSec,   setEtaSec]   = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [tripPct,  setTripPct]  = useState(0);
  const [drivenIdx,setDrivenIdx]= useState(0);
  const [rfScore,    setRfScore]    = useState(null);
  const [lstmScore,  setLstmScore]  = useState(null);
  const [riskScore,  setRiskScore]  = useState(null);
  const [xaiText,    setXaiText]    = useState("");
  const [xaiFacts,   setXaiFacts]   = useState(null);
  const [alerts,     setAlerts]     = useState([]);
  const [weather,  setWeather]  = useState(null);
  const [forecast, setForecast] = useState(null);
  const [userPos,  setUserPos]  = useState(null);
  const [liveSpd,  setLiveSpd]  = useState(null);
  const [liveOn,   setLiveOn]   = useState(false);
  const [showHS,      setShowHS]      = useState(true);
  const [showZones,   setShowZones]   = useState(true);
  const [showCams,    setShowCams]    = useState(true);
  const [showTolls,   setShowTolls]   = useState(true);
  const [showPasses,  setShowPasses]  = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [voiceOn, setVoiceOn]  = useState(true);
  const [snack,   setSnack]    = useState(null);
  const [mapStyle,setMapStyle] = useState("hot");
  const [nearZone,setNearZone] = useState(null);
  const [reports,    setReports]    = useState([]);
  const [rptType,    setRptType]    = useState("accident");
  const [rptDesc,    setRptDesc]    = useState("");
  const [rptPhotos,  setRptPhotos]  = useState([]);
  const [rptSev,     setRptSev]     = useState("moderate");
  const [rptInjured, setRptInjured] = useState(0);

  // ── New review modal state (replaces old showFB) ───────────────
  const [showReview,   setShowReview]   = useState(false);
  const [pointsEarned, setPointsEarned] = useState(30);

  const [gm, setGM] = useState(() => {
    try { return initGM(); }
    catch { return { points:0, trips:0, reports:0, driverScores:[], badges:[] }; }
  });

  const toast = useCallback((msg,sev="info") => {
    setSnack({msg,sev}); setTimeout(()=>setSnack(null),4500);
  },[]);

  const speak = useCallback((text) => {
    if (!voiceOn||!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang="en-IN"; u.rate=0.9; u.pitch=1.05;
    window.speechSynthesis.speak(u);
  },[voiceOn]);

  const checkZones = useCallback((lat,lon) => {
    CRITICAL_ZONES.forEach(z => {
      const d = hvDist([lat,lon],[z.lat,z.lon]);
      if (d < z.radius+60 && !alertedZones.current.has(z.id)) {
        alertedZones.current.add(z.id);
        setNearZone(z); speak(z.warn);
        toast(`${z.type==="hospital"?"🏥":z.type==="school"?"🏫":z.type==="police"?"👮":z.type==="bridge"?"🌉":z.type==="fog"?"🌫️":"🚂"} ${z.warn}`,"warning");
        setTimeout(()=>{ alertedZones.current.delete(z.id); setNearZone(p=>p?.id===z.id?null:p); },60000);
      }
    });
    HP_HOTSPOTS.forEach(h => {
      const d = hvDist([lat,lon],[h.lat,h.lon]);
      const thresh = h.risk==="HIGH"?2000:1000;
      if (d<thresh && !alertedZones.current.has(`hs_${h.id}`)) {
        alertedZones.current.add(`hs_${h.id}`);
        speak(`Warning! Accident hotspot: ${h.name}. ${h.killed} fatalities. Drive carefully.`);
        setTimeout(()=>alertedZones.current.delete(`hs_${h.id}`),120000);
      }
    });
  },[speak,toast]);

  const calcRisk = useCallback(async (lat, lon, spd=null) => {
    try {
      const wx = await getWeather(lat,lon).catch(()=>null);
      if (wx) setWeather(wx);
      const h = new Date().getHours();
      const timeOfDay = h>=20||h<5?"3":h>=17?"2":h>=9?"1":"0";
      const weatherCode = wx?.snow?"3":wx?.fog?"2":wx?.rain?"1":"0";
      const roadCond = wx?.snow?"2":wx?.rain?"1":"0";
      const v = VP[vehicle];
      const pred = await predictRisk({
        weather:weatherCode, roadType:vehicle==="walk"?"0":vehicle==="truck"?"3":"2",
        timeOfDay, areaType:"0", speed:spd??liveSpd??v.avg, vehicles:2,
        roadCondition:roadCond, lightCondition:timeOfDay==="3"?"1":"0",
        criticalZone:CRITICAL_ZONES.some(z=>hvDist([lat,lon],[z.lat,z.lon])<z.radius)?"1":"0",
        visibility:wx?.fog?"30":"10", dayOfWeek:String(new Date().getDay()===0?6:new Date().getDay()-1),
        vehicle_type:vehicle, hotspot_nearby:HP_HOTSPOTS.some(hs=>hvDist([lat,lon],[hs.lat,hs.lon])<2000)?"1":"0",
      });
      const rf   = pred.rf_score   ?? pred.score ?? 50;
      const lstm = pred.lstm_score ?? pred.score ?? 50;
      const sc   = ensembleScore(rf, lstm);
      setRfScore(Math.round(rf)); setLstmScore(Math.round(lstm)); setRiskScore(sc);
      setXaiText(pred.xai_explanation??""); setXaiFacts(pred.xai_factors??null);
      const al = [];
      if (sc>70)                              al.push("⚠️ High risk — reduce speed now");
      if (wx?.rain)                           al.push("🌧️ Wet roads — brake gently");
      if (wx?.snow)                           al.push("❄️ Snow/ice — chains recommended");
      if (timeOfDay==="3")                    al.push("🌙 Night driving — high risk window");
      if ((spd??liveSpd??0)>(v.avg+20))      al.push(`🚗 Speeding — ${Math.round(spd??liveSpd??0)} km/h`);
      HP_HOTSPOTS.forEach(hs => {
        if (hvDist([lat,lon],[hs.lat,hs.lon])<1500) al.push(`⚠️ Hotspot: ${hs.name} (${hs.killed} killed)`);
      });
      setAlerts(al.slice(0,4));
    } catch(e) { console.warn("Risk calc error:",e.message); }
  },[vehicle,liveSpd]);

  useEffect(()=>{
    getReports().then(d=>setReports(d.reports||[])).catch(()=>{});
    navigator.geolocation?.getCurrentPosition(p=>setUserPos([p.coords.latitude,p.coords.longitude]),()=>{});
    const f=params.get("from"),t=params.get("to");
    if(f&&t) setTimeout(()=>runNavigation(f,t),800);
    // eslint-disable-next-line
  },[]);

  useEffect(()=>{
    if(!liveOn) return;
    const id = setInterval(()=>{
      navigator.geolocation?.getCurrentPosition(p=>{
        const ll=[p.coords.latitude,p.coords.longitude]; setUserPos(ll);
        const spd = p.coords.speed!=null?Math.round(p.coords.speed*3.6):null;
        if(spd!=null) setLiveSpd(spd);
        calcRisk(ll[0],ll[1],spd); checkZones(ll[0],ll[1]);
      },()=>{},{enableHighAccuracy:true,maximumAge:2000,timeout:8000});
    },8000);
    timerRef.current=id;
    return ()=>clearInterval(id);
  },[liveOn,calcRisk,checkZones]);

  useEffect(()=>()=>{
    if(timerRef.current)    clearInterval(timerRef.current);
    if(riskTimerRef.current)clearInterval(riskTimerRef.current);
    if(animRef.current)     cancelAnimationFrame(animRef.current);
  },[]);

  useEffect(() => { scRef.current = riskScore ?? 50; }, [riskScore]);
  useEffect(() => { directionsRef.current = directions; }, [directions]);
  useEffect(() => { vehicleRef.current = vehicle; }, [vehicle]);
  useEffect(() => () => { if (vehMarkerRef.current) { vehMarkerRef.current.remove(); vehMarkerRef.current = null; } }, []);

  const animState = useRef({ running: false });

  const stopAnim = useCallback(() => {
    animState.current.running = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = null;
    setIsMoving(false);
    if (vehMarkerRef.current) { vehMarkerRef.current.remove(); vehMarkerRef.current = null; }
  }, []);

  const startAnim = useCallback((coords, durationMin) => {
    stopAnim();
    if (!coords || coords.length < 2) return;
    const cumM = [0];
    for (let i = 1; i < coords.length; i++)
      cumM.push(cumM[cumM.length-1] + hvDist(coords[i-1], coords[i]));
    const totalM = cumM[cumM.length-1];
    if (totalM < 10) return;
    const SIM_DURATION_MS = Math.min(durationMin * 60 * 1000, 120_000);
    const speedMperMs = totalM / SIM_DURATION_MS;
    let distTravelled = 0, lastTs = null, lastDisplayTs = 0, stepPointer = 0;
    let smoothHdg = brng(coords[0], coords[1]);
    let iconScore = scRef.current;
    const map = mapRef.current;
    setVehPos(coords[0]); setVehHdg(smoothHdg); setIsMoving(true);
    setTripPct(0); setKmLeft(totalM/1000); setEtaSec(durationMin*60); setDrivenIdx(0);
    if (map) {
      if (vehMarkerRef.current) { vehMarkerRef.current.remove(); vehMarkerRef.current = null; }
      vehMarkerRef.current = L.marker(coords[0], {
        icon: mkVehicleIcon(vehicleRef.current, smoothHdg, scRef.current, true),
        zIndexOffset:1200, interactive:false,
      }).addTo(map);
      map.panTo(coords[0], { animate:true, duration:0.6 });
    }
    animState.current = { running:true };
    const frame = (ts) => {
      if (!animState.current.running) return;
      if (lastTs === null) { lastTs = ts; animRef.current = requestAnimationFrame(frame); return; }
      const dt = Math.min(ts - lastTs, 50); lastTs = ts;
      distTravelled += speedMperMs * dt;
      if (distTravelled >= totalM) {
        const fp = coords[coords.length-1];
        if (vehMarkerRef.current) vehMarkerRef.current.setLatLng(fp);
        setVehPos(fp); setKmLeft(0); setEtaSec(0); setTripPct(100);
        stopAnim(); setNavigating(false);
        // ✅ Show review modal instead of old feedback
        setShowReview(true);
        speak("You have arrived at your destination."); toast("🏁 Arrived!","success"); return;
      }
      let si = 0;
      for (let i = 0; i < coords.length-1; i++) {
        if (cumM[i+1] > distTravelled) { si = i; break; }
      }
      const segDist = distTravelled - cumM[si];
      const segLen  = cumM[si+1] - cumM[si];
      const t       = segLen > 0 ? Math.min(segDist/segLen, 1) : 0;
      const pos     = lerp(coords[si], coords[si+1], t);
      const rawHdg  = brng(coords[si], coords[si+1]);
      let hdgDiff = rawHdg - smoothHdg;
      if (hdgDiff > 180) hdgDiff -= 360;
      if (hdgDiff < -180) hdgDiff += 360;
      smoothHdg = (smoothHdg + hdgDiff * 0.08 + 360) % 360;
      if (vehMarkerRef.current) {
        vehMarkerRef.current.setLatLng(pos);
        const el = vehMarkerRef.current.getElement();
        if (el) { const rotator = el.querySelector('.veh-rotator'); if (rotator) rotator.style.transform = `rotate(${smoothHdg}deg)`; }
        const curScore = scRef.current;
        if (curScore !== iconScore) {
          iconScore = curScore;
          vehMarkerRef.current.setIcon(mkVehicleIcon(vehicleRef.current, smoothHdg, curScore, true));
        }
      }
      if (ts - lastDisplayTs > 200) {
        lastDisplayTs = ts;
        const remM = totalM - distTravelled;
        setKmLeft(remM/1000); setEtaSec((remM/totalM)*durationMin*60);
        setTripPct(Math.min(100, (distTravelled/totalM)*100));
        setDrivenIdx(si); setVehPos(pos);
      }
      if (map) {
        try {
          const px = map.latLngToContainerPoint(pos);
          const cx = map.latLngToContainerPoint(map.getCenter());
          const pxDist = Math.sqrt((px.x-cx.x)**2 + (px.y-cx.y)**2);
          if (pxDist > 100) map.panTo(pos, { animate:true, duration:0.5 });
        } catch (_) {}
      }
      checkZones(pos[0], pos[1]);
      const dirs = directionsRef.current;
      if (dirs?.steps?.length) {
        let cumKm = 0; const donKm = distTravelled/1000;
        for (let i = 0; i < dirs.steps.length; i++) {
          cumKm += (dirs.steps[i].distance_m||0)/1000;
          if (cumKm > donKm) {
            if (i !== stepPointer) { stepPointer = i; setCurrentStep(i); speak(dirs.steps[i].instruction||""); }
            break;
          }
        }
      }
      animRef.current = requestAnimationFrame(frame);
    };
    animRef.current = requestAnimationFrame(frame);
  },[stopAnim,speak,toast,checkZones]);

  const runNavigation = useCallback(async(srcOv,dstOv)=>{
    const s=srcOv||source, d=dstOv||dest;
    if(!s.trim()||!d.trim()){ toast("Enter source and destination","warning"); return; }
    setLoading(true); setAlerts([]); alertedZones.current.clear(); stopAnim();
    try {
      let sGeo,dGeo;
      try { [sGeo,dGeo] = await Promise.all([geocodePlace(s),geocodePlace(d)]); }
      catch(e) { toast(`Location not found: ${e.message}`,"error"); setLoading(false); return; }
      setSrcGeoPos([sGeo.lat,sGeo.lon]); setDstGeoPos([dGeo.lat,dGeo.lon]);
      const v = VP[vehicle];
      const [dirR,wxR,fcR] = await Promise.allSettled([
        getDirections(sGeo.lat,sGeo.lon,dGeo.lat,dGeo.lon,v.osrm),
        getWeather(sGeo.lat,sGeo.lon),
        getWeatherForecast(sGeo.lat,sGeo.lon),
      ]);
      const dir = dirR.status==="fulfilled"?dirR.value:null;
      const wx  = wxR.status ==="fulfilled"?wxR.value :null;
      const fc  = fcR.status ==="fulfilled"?fcR.value :null;
      if(wx) setWeather(wx);
      if(fc?.forecast?.length) setForecast(fc.forecast);
      if(!dir||dir.error||!dir.geometry?.coordinates?.length){
        toast("No route found — check your locations","error"); setLoading(false); return;
      }
      const coords = dir.geometry.coordinates.map(([ln,la])=>[la,ln]);
      setRouteCoords(coords); setRouteSegs(buildRouteSegments(coords)); setDrivenIdx(0);
      const adjDur = Math.round((dir.duration_min||0)*v.factor);
      setDirections(dir); setCurrentStep(0); setRouteInfo({distance_km:dir.distance_km, duration_min:adjDur});
      setKmLeft(dir.distance_km); setEtaSec(adjDur*60); setTripPct(0);
      if(mapRef.current&&sGeo&&dGeo)
        mapRef.current.fitBounds([[sGeo.lat,sGeo.lon],[dGeo.lat,dGeo.lon]],{padding:[80,80],animate:true});
      await calcRisk(sGeo.lat,sGeo.lon,v.avg);
      setRiskScore(prevSc=>{
        const sc = prevSc??50;
        const pts = sc<40?50:30;
        setPointsEarned(pts);
        if(sc>=67) speak(`High risk route. ${dir.steps?.[0]?.instruction||"Drive with extreme caution."}`);
        else { speak(`Route to ${d.split(",")[0]}. ${adjDur} minutes. ${RL(sc)}. Starting navigation.`); if(dir?.steps?.[0]) setTimeout(()=>speak(dir.steps[0].instruction),2500); }
        return prevSc;
      });
      setRiskScore(prevSc=>{
        const sc=prevSc??50;
        const ds=Math.max(0,100-(sc>70?25:sc>40?10:0));
        const ng={...gm,trips:gm.trips+1,points:gm.points+(sc<40?50:30),driverScores:[ds,...(gm.driverScores||[])].slice(0,50)};
        setGM(ng); try{saveGM(ng);}catch{}
        try{saveSession({driver_score:ds,risk_score:sc,trip_from:s,trip_to:d,distance_km:dir.distance_km,duration_min:adjDur,avg_speed:v.avg,vehicle_type:vehicle});}catch{}
        return prevSc;
      });
      setLiveOn(true); setNavigating(true); setPanelMode("directions");
      if(riskTimerRef.current) clearInterval(riskTimerRef.current);
      riskTimerRef.current = setInterval(()=>{
        setVehPos(p=>{ if(p) calcRisk(p[0],p[1]); return p; });
      },15000);
      setTimeout(()=>{ if(coords.length>1) startAnim(coords,adjDur); },800);
    } catch(err) {
      console.error("Nav error:",err);
      toast(err.message||"Navigation error — check console","error");
    }
    setLoading(false);
  },[source,dest,vehicle,gm,toast,speak,startAnim,stopAnim,calcRisk]);

  const submitReport = async()=>{
    const center=userPos||vehPos||[31.1048,77.1734];
    try {
      const r={type:rptType,lat:center[0],lon:center[1],description:rptDesc,severity:rptSev,photos:rptPhotos,injured:parseInt(rptInjured)||0};
      await addReport(r);
      setReports(p=>[{id:Date.now(),...r,timestamp:new Date().toISOString()},...p]);
      const ng={...gm,points:gm.points+20,reports:(gm.reports||0)+1};
      setGM(ng); try{saveGM(ng);}catch{}
      toast(`${rptType} reported! +20 pts`,"success");
      speak("Incident reported. Thank you for keeping roads safe.");
      setRptDesc(""); setRptPhotos([]);
      setPanelMode(navigating?"directions":"search");
    } catch{ toast("Saved locally","info"); }
  };

  const handlePhoto = async(e)=>{
    try {
      const c=await compressImages(e.target.files,4,800,0.7);
      setRptPhotos(p=>[...p,...c].slice(0,4));
    } catch {
      const r=Array.from(e.target.files).map(f=>new Promise(res=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.readAsDataURL(f);}));
      Promise.all(r).then(u=>setRptPhotos(p=>[...p,...u].slice(0,4)));
    }
  };

  // ── Derived ────────────────────────────────────────────────────
  const tileUrl = { hot:"https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png", standard:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", topo:"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" }[mapStyle];
  const RCOLORS = {accident:"#ef4444",traffic:"#f59e0b",roadblock:"#3b82f6",hazard:"#a855f7"};
  const RICONS  = {accident:"💥",traffic:"🚦",roadblock:"🚧",hazard:"⚠️",contribution:"💬"};
  const ZONE_ICON={hospital:"🏥",school:"🏫",police:"👮",bridge:"🌉",fog:"🌫️",railway:"🚂"};
  const vp      = VP[vehicle];
  const sc      = riskScore??50;
  const stepClr = RC(sc);

  const vehIcon = useMemo(()=>
    vehPos ? mkVehicleIcon(vehicle,vehHdg,sc,isMoving) : null,
    [vehPos,vehHdg,vehicle,sc,isMoving]
  );

  const remainingCoords = routeCoords.length>0 && drivenIdx>0 ? routeCoords.slice(drivenIdx) : routeCoords;
  const drivenCoords    = routeCoords.length>0 && drivenIdx>0 ? routeCoords.slice(0,drivenIdx+1) : [];

  const routeTolls = useMemo(()=>
    HP_TOLLS.filter(t=>routeCoords.some(([la,lo])=>hvDist([t.lat,t.lon],[la,lo])<5000)),
    [routeCoords]
  );

  const darkCard = { background:T.card, border:`1px solid ${T.border}`, borderRadius:3 };
  const actionBtn = (color) => ({
    flex:1, padding:"7px 4px", borderRadius:2, fontSize:11, fontWeight:700,
    cursor:"pointer", textAlign:"center",
    border:`1px solid ${color}30`, background:`${color}10`, color:color,
    fontFamily:"'DM Sans',sans-serif",
  });

  if(!leafletReady) return (
    <Box sx={{display:"flex",alignItems:"center",justifyContent:"center",height:"calc(100vh - 58px)",background:T.bg,flexDirection:"column",gap:2}}>
      <Box sx={{width:44,height:44,border:"3px solid rgba(255,255,255,0.1)",borderTop:`3px solid ${T.orange}`,borderRadius:"50%",animation:"spin 0.8s linear infinite","@keyframes spin":{to:{transform:"rotate(360deg)"}}}}/>
      <Typography sx={{fontSize:13,color:"rgba(255,255,255,0.4)",fontFamily:"'DM Sans',sans-serif"}}>Loading Navigation…</Typography>
    </Box>
  );

  return (
    <Box sx={{display:"flex",flexDirection:{xs:"column-reverse",md:"row"},height:"calc(100vh - 58px)",fontFamily:"'DM Sans',sans-serif",overflow:"hidden",position:"relative",background:T.bg}}>

      {/* ══════════ SIDE PANEL ══════════ */}
      <Box sx={{
        width:{xs:"100%",md:panelOpen?420:0},
        minWidth:{md:panelOpen?420:0},
        height:{xs:panelOpen?"auto":54,md:"100%"},
        maxHeight:{xs:panelOpen?"84vh":54,md:"none"},
        flexShrink:0, background:T.panel,
        boxShadow:{xs:"0 -4px 40px rgba(0,0,0,0.6)",md:"2px 0 32px rgba(0,0,0,0.5)"},
        display:"flex",flexDirection:"column",overflow:"hidden",zIndex:10,
        transition:"all 0.3s ease",
        borderRadius:{xs:"20px 20px 0 0",md:0},
        borderRight:{md:`1px solid ${T.border}`},
        borderTop:{xs:`1px solid ${T.border}`,md:"none"},
      }}>

        {/* Panel header */}
        <Box sx={{display:"flex",alignItems:"center",gap:1,px:2,py:1.4,borderBottom:`1px solid ${T.border}`,flexShrink:0,background:T.panel}}>
          <Box sx={{display:{xs:"flex",md:"none"},flex:1,flexDirection:"column",alignItems:"center",gap:0.5,cursor:"pointer"}} onClick={()=>setPanelOpen(o=>!o)}>
            <Box sx={{width:40,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)"}}/>
            {!panelOpen && <Typography sx={{fontSize:12,fontWeight:700,color:RC(sc)}}>{RL(sc)} · {sc}/100</Typography>}
          </Box>
          <Box sx={{display:{xs:"none",md:"flex"},flex:1,alignItems:"center",gap:1}}>
            <Typography sx={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:T.text}}>🛡️ IntelliCrash</Typography>
            <Chip label={`${gm.points} pts`} size="small" sx={{background:"rgba(249,115,22,0.15)",color:T.orange,fontWeight:700,fontSize:10,height:18,border:`1px solid rgba(249,115,22,0.25)`}}/>
            {navigating && <Chip label="● LIVE" size="small" sx={{background:"rgba(34,197,94,0.12)",color:"#4ade80",fontWeight:700,fontSize:10,height:18,border:"1px solid rgba(34,197,94,0.2)"}}/>}
          </Box>
          <IconButton size="small" onClick={()=>setPanelOpen(o=>!o)} sx={{color:"rgba(255,255,255,0.3)","&:hover":{color:T.text}}}>
            {panelOpen?<ChevronLeft/>:<ChevronRight/>}
          </IconButton>
        </Box>

        {panelOpen && (
          <Box sx={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column","&::-webkit-scrollbar":{width:"4px"},"&::-webkit-scrollbar-thumb":{background:"rgba(255,255,255,0.1)",borderRadius:"2px"}}}>

            {/* ══ SEARCH MODE ══ */}
            {panelMode==="search" && (
              <Box>
                <Box sx={{p:2,borderBottom:`1px solid ${T.border}`}}>
                  <Box sx={{display:"flex",gap:1.5,alignItems:"center"}}>
                    <Box sx={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",py:"4px",flexShrink:0}}>
                      <Box sx={{width:10,height:10,borderRadius:"2px",border:"2.5px solid #22c55e",background:"transparent",transform:"rotate(45deg)"}}/>
                      <Box sx={{width:2,height:24,background:"linear-gradient(#22c55e,#ef4444)",borderRadius:1}}/>
                      <Box sx={{width:10,height:10,borderRadius:"50%",background:"#ef4444"}}/>
                    </Box>
                    <Box sx={{flex:1,display:"flex",flexDirection:"column",gap:0.8}}>
                      <PlaceInput value={source} onChange={setSource} placeholder="From — your location" isSource/>
                      <PlaceInput value={dest}   onChange={setDest}   placeholder="To — destination" isSource={false}/>
                    </Box>
                    <Tooltip title="Swap">
                      <IconButton size="small" onClick={()=>{const t=source;setSource(dest);setDest(t);setSrcGeoPos(dstGeoPos);setDstGeoPos(srcGeoPos);}} sx={{color:"rgba(255,255,255,0.3)","&:hover":{color:T.orange}}}>
                        <SwapVert fontSize="small"/>
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box sx={{display:"flex",gap:0.8,alignItems:"center",mt:1.5,flexWrap:"wrap"}}>
                    {Object.entries(VP).map(([k,v])=>(
                      <Tooltip key={k} title={v.label} placement="top">
                        <button onClick={()=>setVehicle(k)} style={{padding:"6px 10px",border:"1.5px solid",borderColor:vehicle===k?"rgba(249,115,22,0.6)":"rgba(255,255,255,0.08)",borderRadius:20,fontSize:16,cursor:"pointer",background:vehicle===k?"rgba(249,115,22,0.12)":"rgba(255,255,255,0.04)",transition:"all 0.15s",lineHeight:1}}>{v.icon}</button>
                      </Tooltip>
                    ))}
                    <button onClick={()=>runNavigation()} disabled={loading} style={{marginLeft:"auto",padding:"9px 22px",border:"none",borderRadius:24,background:loading?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#f97316,#ef4444)",color:loading?"rgba(255,255,255,0.3)":"#fff",fontWeight:700,fontSize:14,cursor:loading?"wait":"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:loading?"none":"0 4px 18px rgba(249,115,22,0.4)",transition:"all 0.2s"}}>{loading?"Loading…":`Go ${vp.icon}`}</button>
                  </Box>
                </Box>

                {riskScore!==null && routeInfo && (
                  <Box sx={{mx:2,my:2,p:2,background:RCL(sc),borderRadius:3,border:`1.5px solid ${RCB(sc)}`}}>
                    <Box sx={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",mb:1}}>
                      <Box>
                        <Box sx={{display:"flex",alignItems:"baseline",gap:0.5}}>
                          <Typography sx={{fontFamily:"'Syne',sans-serif",fontSize:36,fontWeight:900,color:RC(sc),lineHeight:1}}>{routeInfo.duration_min}</Typography>
                          <Typography sx={{fontSize:14,color:RC(sc),fontWeight:600}}>min</Typography>
                        </Box>
                        <Typography sx={{fontSize:11,color:"rgba(255,255,255,0.45)",mt:0.3}}>{routeInfo.distance_km} km · {vp.icon} {vp.label} · avg {vp.avg} km/h</Typography>
                      </Box>
                      <Box sx={{textAlign:"right"}}>
                        <Chip label={RL(sc)} sx={{background:RC(sc),color:"#fff",fontWeight:800,fontSize:12,mb:0.5,height:24}}/>
                        <Box sx={{display:"flex",gap:0.5,justifyContent:"flex-end",mt:0.3}}>
                          {rfScore!==null   && <Chip label={`RF ${rfScore}`}   size="small" sx={{height:16,fontSize:9,background:"rgba(59,130,246,0.2)",color:"#60a5fa",fontWeight:700}}/>}
                          {lstmScore!==null && <Chip label={`LSTM ${lstmScore}`} size="small" sx={{height:16,fontSize:9,background:"rgba(168,85,247,0.2)",color:"#c084fc",fontWeight:700}}/>}
                          <Chip label={`${sc}/100`} size="small" sx={{height:16,fontSize:9,background:RC(sc),color:"#fff",fontWeight:800}}/>
                        </Box>
                      </Box>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(sc,100)} sx={{height:8,borderRadius:4,background:"rgba(255,255,255,0.08)",mb:1,"& .MuiLinearProgress-bar":{background:RC(sc),borderRadius:4}}}/>
                    {xaiText && <Typography sx={{fontSize:11,color:"rgba(255,255,255,0.5)",mb:0.8,fontStyle:"italic"}}>🧠 {xaiText}</Typography>}
                    {xaiFacts && (
                      <Box sx={{background:"rgba(255,255,255,0.04)",borderRadius:2,p:1,mb:0.8}}>
                        {Object.entries(xaiFacts).slice(0,4).map(([k,v])=>(
                          <Box key={k} sx={{display:"flex",justifyContent:"space-between",py:0.2}}>
                            <Typography sx={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{k}</Typography>
                            <Typography sx={{fontSize:10,fontWeight:700,color:T.text,maxWidth:180,textAlign:"right"}} noWrap>{v}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                    {routeTolls.length>0 && <Typography sx={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>💰 Tolls: ₹{routeTolls.reduce((s,t)=>s+(vehicle==="truck"?t.fee_truck:vehicle==="bike"?t.fee_bike:t.fee_car),0)} ({routeTolls.map(t=>t.name).join(", ")})</Typography>}
                  </Box>
                )}

                {navigating && kmLeft!==null && (
                  <Box sx={{mx:2,mb:1.5,p:1.2,background:"rgba(249,115,22,0.08)",borderRadius:2,border:"1px solid rgba(249,115,22,0.2)",display:"flex"}}>
                    {[[fmtD((kmLeft||0)*1000),"remaining","#ef4444"],[etaSec?fmtT(etaSec):"--","ETA",T.orange],[`${Math.round(tripPct)}%`,"done","#22c55e"]].map(([val,lbl,clr],i)=>(
                      <Box key={i} sx={{flex:1,textAlign:"center",borderRight:i<2?"1px solid rgba(249,115,22,0.15)":"none",px:1}}>
                        <Typography sx={{fontSize:17,fontWeight:900,color:clr,lineHeight:1}}>{val}</Typography>
                        <Typography sx={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{lbl}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {alerts.length>0 && (
                  <Box sx={{mx:2,mb:1.5,p:1.2,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:2}}>
                    {alerts.map((a,i)=><Typography key={i} sx={{fontSize:12,color:"#fca5a5",lineHeight:1.6}}>→ {a}</Typography>)}
                  </Box>
                )}

                {nearZone && (
                  <Box sx={{mx:2,mb:1.5,p:1.2,background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:2,display:"flex",gap:1,alignItems:"center"}}>
                    <Typography sx={{fontSize:16}}>{ZONE_ICON[nearZone.type]||"📍"}</Typography>
                    <Box>
                      <Typography sx={{fontSize:12,fontWeight:700,color:"#60a5fa"}}>{nearZone.name}</Typography>
                      <Typography sx={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>{nearZone.warn}</Typography>
                    </Box>
                  </Box>
                )}

                <Box sx={{px:2,pb:1.5,display:"flex",gap:0.8,flexWrap:"wrap"}}>
                  {navigating && <button onClick={()=>setPanelMode("directions")} style={{...actionBtn(T.orange),flex:1}}>🧭 Directions</button>}
                  {[["📡 Report",()=>setPanelMode("report"),"#ef4444"],["🗺️ Layers",()=>setPanelMode("layers"),T.orange],["📋 Info",()=>setPanelMode("info"),"#22c55e"]].map(([lbl,fn,clr])=>(
                    <button key={lbl} onClick={fn} style={actionBtn(clr)}>{lbl}</button>
                  ))}
                </Box>

                <Divider sx={{borderColor:T.border}}/>
                <Box sx={{px:2,pt:1,pb:0.5}}>
                  <Typography sx={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:0.8}}>RECENT REPORTS</Typography>
                </Box>
                {reports.slice(0,3).map((r,i)=>(
                  <Box key={i} sx={{mx:2,mb:0.8,p:1,display:"flex",gap:1,background:"rgba(255,255,255,0.03)",borderRadius:2,border:`1px solid ${T.border}`,alignItems:"center"}}>
                    <Typography sx={{fontSize:14}}>{RICONS[r.type]||"⚠️"}</Typography>
                    <Box sx={{flex:1,minWidth:0}}>
                      <Typography sx={{fontSize:12,fontWeight:600,textTransform:"capitalize",color:T.text}}>{r.type}</Typography>
                      <Typography sx={{fontSize:11,color:"rgba(255,255,255,0.35)"}} noWrap>{r.description?.slice(0,40)||r.timestamp?.slice(0,16)}</Typography>
                    </Box>
                    {r.severity&&<Chip label={r.severity} size="small" sx={{height:16,fontSize:9,background:r.severity==="severe"?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.15)",color:r.severity==="severe"?"#f87171":"#fbbf24"}}/>}
                  </Box>
                ))}
                <Box sx={{p:2}}>
                  <button onClick={()=>nav("/sos")} style={{width:"100%",padding:"11px",background:"rgba(239,68,68,0.1)",color:"#f87171",border:"1.5px solid rgba(239,68,68,0.25)",borderRadius:10,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>🚨 SOS Emergency — Call 112</button>
                </Box>
              </Box>
            )}

            {/* ══ DIRECTIONS ══ */}
            {panelMode==="directions" && (
              <Box sx={{flex:1,display:"flex",flexDirection:"column"}}>
                <Box sx={{px:2,py:1.4,display:"flex",alignItems:"center",gap:1,borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
                  <button onClick={()=>setPanelMode("search")} style={{background:"none",border:"none",cursor:"pointer",color:T.orange,fontSize:13,fontWeight:700,padding:0}}>← Back</button>
                  <Typography sx={{fontWeight:700,fontSize:13,flex:1,color:T.text}}>Turn-by-Turn · {vp.icon} {vp.label}</Typography>
                  <button onClick={()=>setVoiceOn(v=>!v)} style={{background:voiceOn?"rgba(249,115,22,0.15)":"rgba(255,255,255,0.05)",border:voiceOn?"1px solid rgba(249,115,22,0.3)":"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"4px 10px",cursor:"pointer",fontSize:11,color:voiceOn?T.orange:"rgba(255,255,255,0.3)"}}>{voiceOn?"🔊":"🔇"}</button>
                </Box>
                {navigating&&(
                  <Box sx={{px:2,py:1,background:"rgba(255,255,255,0.02)",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
                    <LinearProgress variant="determinate" value={tripPct} sx={{height:6,borderRadius:3,background:"rgba(255,255,255,0.07)","& .MuiLinearProgress-bar":{background:RC(sc),borderRadius:3,transition:"width 0.5s ease"}}}/>
                    <Box sx={{display:"flex",justifyContent:"space-between",mt:0.5}}>
                      <Typography sx={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{fmtD((kmLeft||0)*1000)} left</Typography>
                      <Typography sx={{fontSize:10,fontWeight:700,color:RC(sc)}}>{RL(sc)} · {sc}/100</Typography>
                      <Typography sx={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{etaSec?fmtT(etaSec):"--"} ETA</Typography>
                    </Box>
                  </Box>
                )}
                <Box sx={{flex:1,overflowY:"auto"}}>
                  {!directions?.steps?.length ? (
                    <Box sx={{textAlign:"center",py:5}}>
                      <Typography sx={{fontSize:13,color:"rgba(255,255,255,0.3)",mb:2}}>No route yet</Typography>
                      <button onClick={()=>setPanelMode("search")} style={{padding:"8px 20px",border:"none",borderRadius:20,background:"linear-gradient(135deg,#f97316,#ef4444)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>← Enter Route</button>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{m:1.5,p:1.8,background:stepClr,borderRadius:3,color:"#fff",boxShadow:`0 6px 24px ${stepClr}55`}}>
                        <Box sx={{display:"flex",alignItems:"center",gap:1.5,mb:0.5}}>
                          <Box sx={{fontSize:26,lineHeight:1}}><TurnArrow type={directions.steps[currentStep]?.type} modifier={directions.steps[currentStep]?.modifier}/></Box>
                          <Typography sx={{fontWeight:800,fontSize:15,lineHeight:1.3,flex:1}}>{directions.steps[currentStep]?.instruction||"Follow the route"}</Typography>
                        </Box>
                        <Typography sx={{fontSize:11,opacity:0.85}}>in {fmtD(directions.steps[currentStep]?.distance_m||0)} · Step {currentStep+1}/{directions.steps.length}</Typography>
                      </Box>
                      {directions.steps.map((step,i)=>(
                        <Box key={i} onClick={()=>{setCurrentStep(i);speak(step.instruction);}}
                          sx={{display:"flex",gap:1.5,px:2,py:1.1,cursor:"pointer",
                            background:i===currentStep?"rgba(249,115,22,0.08)":"transparent",
                            "&:hover":{background:"rgba(255,255,255,0.03)"},
                            borderBottom:`1px solid ${T.border}`}}>
                          <Box sx={{width:30,height:30,borderRadius:"50%",flexShrink:0,
                            background:i===currentStep?"#f97316":"rgba(255,255,255,0.06)",
                            boxShadow:i===currentStep?"0 0 12px rgba(249,115,22,0.4)":"none",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            color:i===currentStep?"#fff":"rgba(255,255,255,0.4)",fontSize:14}}>
                            <TurnArrow type={step.type} modifier={step.modifier}/>
                          </Box>
                          <Box sx={{flex:1}}>
                            <Typography sx={{fontSize:13,fontWeight:i===currentStep?700:400,color:i===currentStep?T.text:"rgba(255,255,255,0.6)",lineHeight:1.4}}>{step.instruction}</Typography>
                            <Typography sx={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{fmtD(step.distance_m||0)}</Typography>
                          </Box>
                        </Box>
                      ))}
                      <Box sx={{display:"flex",gap:1,p:2}}>
                        <button onClick={()=>setCurrentStep(Math.max(0,currentStep-1))} style={{flex:1,padding:"9px",borderRadius:8,border:`1px solid ${T.border}`,background:"rgba(255,255,255,0.04)",cursor:"pointer",fontSize:12,color:"rgba(255,255,255,0.6)",fontFamily:"'DM Sans',sans-serif"}}>← Prev</button>
                        <button onClick={()=>{const n=Math.min(directions.steps.length-1,currentStep+1);setCurrentStep(n);speak(directions.steps[n]?.instruction||"");}} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#f97316,#ef4444)",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>Next →</button>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            )}

            {/* ══ REPORT ══ */}
            {panelMode==="report" && (
              <Box sx={{p:2}}>
                <Box sx={{display:"flex",alignItems:"center",mb:2}}>
                  <button onClick={()=>setPanelMode(navigating?"directions":"search")} style={{background:"none",border:"none",cursor:"pointer",color:T.orange,fontSize:13,fontWeight:700}}>← Back</button>
                  <Typography sx={{fontWeight:700,ml:1,color:T.text}}>📡 Report Incident</Typography>
                </Box>
                <Box sx={{display:"flex",gap:0.8,mb:1.5,flexWrap:"wrap"}}>
                  {[["accident","💥 Accident"],["traffic","🚦 Traffic"],["roadblock","🚧 Block"],["hazard","⚠️ Hazard"]].map(([v,lbl])=>(
                    <button key={v} onClick={()=>setRptType(v)} style={{flex:"1 1 80px",padding:"7px 4px",border:`1.5px solid ${rptType===v?RCOLORS[v]:"rgba(255,255,255,0.08)"}`,borderRadius:8,background:rptType===v?`${RCOLORS[v]}18`:"rgba(255,255,255,0.04)",color:rptType===v?RCOLORS[v]:"rgba(255,255,255,0.4)",fontSize:12,fontWeight:rptType===v?700:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{lbl}</button>
                  ))}
                </Box>
                <Box sx={{display:"flex",gap:0.8,mb:1.5}}>
                  {[["minor","Minor"],["moderate","Moderate"],["severe","Severe"]].map(([v,lbl])=>(
                    <button key={v} onClick={()=>setRptSev(v)} style={{flex:1,padding:"7px",border:`1.5px solid ${rptSev===v?"#ef4444":"rgba(255,255,255,0.08)"}`,borderRadius:8,background:rptSev===v?"rgba(239,68,68,0.1)":"rgba(255,255,255,0.04)",color:rptSev===v?"#f87171":"rgba(255,255,255,0.4)",fontSize:12,fontWeight:rptSev===v?700:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{lbl}</button>
                  ))}
                </Box>
                {rptType==="accident"&&(
                  <Box sx={{display:"flex",alignItems:"center",gap:1,mb:1}}>
                    <Typography sx={{fontSize:12,fontWeight:600,color:T.text}}>🤕 Injured:</Typography>
                    <input type="number" min="0" max="100" value={rptInjured} onChange={e=>setRptInjured(Math.max(0,parseInt(e.target.value)||0))} style={{width:70,border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"6px 10px",fontSize:13,outline:"none",textAlign:"center",background:"rgba(255,255,255,0.06)",color:"#f0f0f8"}}/>
                    <Typography sx={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>people</Typography>
                  </Box>
                )}
                <textarea value={rptDesc} onChange={e=>setRptDesc(e.target.value)} placeholder="Describe the incident…" rows={3} style={{width:"100%",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"'DM Sans',sans-serif",resize:"none",outline:"none",background:"rgba(255,255,255,0.05)",color:"#f0f0f8",boxSizing:"border-box"}}/>
                <Box sx={{display:"flex",gap:1,mt:1,mb:1.5,flexWrap:"wrap"}}>
                  {rptPhotos.map((p,i)=>(
                    <Box key={i} sx={{position:"relative"}}>
                      <img src={p} alt="" style={{width:56,height:56,objectFit:"cover",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)"}}/>
                      <button onClick={()=>setRptPhotos(ps=>ps.filter((_,j)=>j!==i))} style={{position:"absolute",top:-5,right:-5,background:"#ef4444",border:"none",borderRadius:"50%",width:18,height:18,color:"#fff",fontSize:11,cursor:"pointer"}}>×</button>
                    </Box>
                  ))}
                  {rptPhotos.length<4&&<button onClick={()=>fileRef.current?.click()} style={{width:56,height:56,border:"1.5px dashed rgba(249,115,22,0.4)",borderRadius:8,background:"rgba(249,115,22,0.06)",cursor:"pointer",fontSize:20,color:T.orange}}>📷</button>}
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handlePhoto}/>
                </Box>
                <button onClick={submitReport} style={{width:"100%",padding:"11px",border:"none",borderRadius:10,background:"linear-gradient(135deg,#f97316,#ef4444)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 4px 18px rgba(249,115,22,0.35)"}}>Submit Report (+20 pts)</button>
              </Box>
            )}

            {/* ══ LAYERS ══ */}
            {panelMode==="layers" && (
              <Box sx={{p:2}}>
                <Box sx={{display:"flex",alignItems:"center",mb:2}}>
                  <button onClick={()=>setPanelMode("search")} style={{background:"none",border:"none",cursor:"pointer",color:T.orange,fontSize:13,fontWeight:700}}>← Back</button>
                  <Typography sx={{fontWeight:700,ml:1,color:T.text}}>🗺️ Layers & Style</Typography>
                </Box>
                <Typography sx={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:0.8,mb:1}}>MAP STYLE</Typography>
                <Box sx={{display:"flex",gap:0.8,mb:2}}>
                  {[["hot","🌍 Default"],["standard","🗺️ Standard"],["topo","⛰️ Topo"]].map(([k,lbl])=>(
                    <button key={k} onClick={()=>setMapStyle(k)} style={{flex:1,padding:"7px 4px",border:`1.5px solid ${mapStyle===k?T.orange:"rgba(255,255,255,0.08)"}`,borderRadius:8,background:mapStyle===k?"rgba(249,115,22,0.12)":"rgba(255,255,255,0.04)",color:mapStyle===k?T.orange:"rgba(255,255,255,0.4)",fontSize:12,fontWeight:mapStyle===k?700:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{lbl}</button>
                  ))}
                </Box>
                <Divider sx={{mb:1.5,borderColor:T.border}}/>
                <Typography sx={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:0.8,mb:1}}>OVERLAYS</Typography>
                {[["⚠️ iRAD Hotspots 2025-26",showHS,setShowHS],["🏥 Critical Zones",showZones,setShowZones],["📷 Speed Cameras",showCams,setShowCams],["🛣️ Toll Booths",showTolls,setShowTolls],["⛰️ Mountain Passes",showPasses,setShowPasses],["💥 Incident Reports",showReports,setShowReports]].map(([lbl,val,setter])=>(
                  <Box key={lbl} sx={{display:"flex",justifyContent:"space-between",alignItems:"center",py:1.4,borderBottom:`1px solid ${T.border}`}}>
                    <Typography sx={{fontSize:13,color:T.text}}>{lbl}</Typography>
                    <Box onClick={()=>setter(!val)} sx={{width:42,height:24,borderRadius:12,background:val?T.orange:"rgba(255,255,255,0.1)",position:"relative",cursor:"pointer",transition:"background 0.2s",boxShadow:val?`0 0 12px rgba(249,115,22,0.4)`:"none"}}>
                      <Box sx={{position:"absolute",top:4,left:val?22:4,width:16,height:16,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.4)",transition:"left 0.2s"}}/>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* ══ INFO ══ */}
            {panelMode==="info" && (
              <Box sx={{p:2}}>
                <Box sx={{display:"flex",alignItems:"center",mb:2}}>
                  <button onClick={()=>setPanelMode("search")} style={{background:"none",border:"none",cursor:"pointer",color:T.orange,fontSize:13,fontWeight:700}}>← Back</button>
                  <Typography sx={{fontWeight:700,ml:1,color:T.text}}>📋 Trip Info</Typography>
                </Box>
                {weather&&(
                  <Box sx={{mb:1.5,p:1.2,background:"rgba(255,255,255,0.03)",borderRadius:2,border:`1px solid ${T.border}`}}>
                    <Typography sx={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",mb:0.8,letterSpacing:0.5}}>🌤️ WEATHER</Typography>
                    <Box sx={{display:"flex",gap:1,flexWrap:"wrap"}}>
                      {[`${weather.temp_c}°C`,weather.description,`💨 ${weather.wind_kph}km/h`,weather.rain?"🌧️ Rain":null,weather.snow?"❄️ Snow":null,weather.fog?"🌫️ Fog":null].filter(Boolean).map((v,i)=>(
                        <Chip key={i} label={v} size="small" sx={{fontSize:11,height:20,background:"rgba(255,255,255,0.07)",color:T.text}}/>
                      ))}
                    </Box>
                  </Box>
                )}
                {forecast?.length>0&&(
                  <Box sx={{mb:1.5,p:1.2,background:"rgba(255,255,255,0.03)",borderRadius:2,border:`1px solid ${T.border}`}}>
                    <Typography sx={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",mb:1,letterSpacing:0.5}}>📅 3-DAY FORECAST</Typography>
                    {forecast.slice(0,3).map((d,i)=>(
                      <Box key={i} sx={{display:"flex",justifyContent:"space-between",py:0.6,borderBottom:i<2?`1px solid ${T.border}`:"none"}}>
                        <Typography sx={{fontSize:12,fontWeight:500,color:T.text}}>{new Date(d.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric"})}</Typography>
                        <Box sx={{textAlign:"right"}}>
                          <Typography sx={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{d.description} · {d.temp_min}°–{d.temp_max}°C</Typography>
                          <Typography sx={{fontSize:10,color:d.risk_boost>=22?"#f87171":d.risk_boost>=10?"#fbbf24":"#4ade80",fontWeight:700}}>{d.drive_advice}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                {routeInfo&&(
                  <Box sx={{p:1.2,background:"rgba(255,255,255,0.03)",borderRadius:2,border:`1px solid ${T.border}`}}>
                    <Typography sx={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",mb:0.8,letterSpacing:0.5}}>🚗 ROUTE SUMMARY</Typography>
                    {[["Distance",`${routeInfo.distance_km} km`],["Est. Time",`${routeInfo.duration_min} min`],["Vehicle",`${vp.icon} ${vp.label}`],["Avg Speed",`${vp.avg} km/h`],["Risk Score",`${sc}/100 (${RL(sc)})`],["RF Score",`${rfScore??"-"}/100`],["LSTM Score",`${lstmScore??"-"}/100`],["IRAD Year","2025-26"]].map(([k,v])=>(
                      <Box key={k} sx={{display:"flex",justifyContent:"space-between",py:0.3}}>
                        <Typography sx={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{k}</Typography>
                        <Typography sx={{fontSize:11,fontWeight:700,color:k.includes("Risk")&&sc>=67?"#f87171":k.includes("Risk")&&sc>=34?"#fbbf24":T.text}}>{v}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Desktop panel toggle */}
      <Box sx={{display:{xs:"none",md:"flex"},position:"absolute",left:panelOpen?420:0,top:"50%",transform:"translateY(-50%)",zIndex:1500,transition:"left 0.3s ease"}}>
        <button onClick={()=>setPanelOpen(o=>!o)} style={{width:20,height:64,background:"linear-gradient(135deg,#f97316,#ef4444)",border:"none",cursor:"pointer",borderRadius:panelOpen?"0 8px 8px 0":"8px 0 0 8px",color:"#fff",fontSize:14,boxShadow:"2px 0 12px rgba(249,115,22,0.3)"}}>
          {panelOpen?"‹":"›"}
        </button>
      </Box>

      {/* ══════════ MAP ══════════ */}
      <Box sx={{flex:1,position:"relative",minHeight:{xs:"55vh",md:"auto"},background:"#0d1117"}}>

        {riskScore!==null&&(
          <Box sx={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",zIndex:1200,background:"rgba(10,10,15,0.95)",borderRadius:24,boxShadow:"0 4px 24px rgba(0,0,0,0.5)",px:2,py:0.8,display:"flex",alignItems:"center",gap:1.5,whiteSpace:"nowrap",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.08)"}}>
            <Box sx={{width:9,height:9,borderRadius:"50%",background:RC(sc),boxShadow:`0 0 0 3px ${RC(sc)}44`,animation:"riskPulse 1.8s infinite","@keyframes riskPulse":{"0%,100%":{boxShadow:`0 0 0 3px ${RC(sc)}44`,opacity:1},"50%":{boxShadow:`0 0 0 10px ${RC(sc)}11`,opacity:.7}}}}/>
            <Typography sx={{fontWeight:700,fontSize:13,color:RC(sc)}}>{RL(sc)}</Typography>
            <Typography sx={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:600}}>{sc}/100</Typography>
            {rfScore!==null&&<Chip label={`RF ${rfScore}`} size="small" sx={{height:18,fontSize:9,background:"rgba(59,130,246,0.2)",color:"#60a5fa",fontWeight:700}}/>}
            {lstmScore!==null&&<Chip label={`LSTM ${lstmScore}`} size="small" sx={{height:18,fontSize:9,background:"rgba(168,85,247,0.2)",color:"#c084fc",fontWeight:700}}/>}
            {liveSpd!==null&&<Chip label={`${liveSpd} km/h`} size="small" sx={{height:18,fontSize:10,background:"rgba(34,197,94,0.15)",color:"#4ade80",fontWeight:700}}/>}
            {isMoving&&<Box sx={{width:8,height:8,borderRadius:"50%",background:"#22c55e",animation:"blink 1s infinite","@keyframes blink":{"0%,100%":{opacity:1},"50%":{opacity:0}}}}/>}
          </Box>
        )}

        {navigating&&directions?.steps?.[currentStep]&&(
          <Box sx={{position:"absolute",bottom:{xs:"auto",md:90},top:{xs:56,md:"auto"},left:"50%",transform:"translateX(-50%)",zIndex:1200,background:stepClr,color:"#fff",borderRadius:14,px:2.5,py:1.4,boxShadow:`0 8px 32px ${stepClr}66`,maxWidth:420,textAlign:"center",border:"1px solid rgba(255,255,255,0.15)"}}>
            <Typography sx={{fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:1}}>
              <TurnArrow type={directions.steps[currentStep]?.type} modifier={directions.steps[currentStep]?.modifier}/>
              {directions.steps[currentStep].instruction}
            </Typography>
            <Typography sx={{fontSize:12,opacity:0.85,mt:0.3}}>in {fmtD(directions.steps[currentStep].distance_m||0)} · {Math.round(tripPct)}% done</Typography>
          </Box>
        )}

        {nearZone&&navigating&&(
          <Box sx={{position:"absolute",top:54,left:"50%",transform:"translateX(-50%)",zIndex:1300,background:"rgba(10,10,15,0.95)",border:"1px solid rgba(249,115,22,0.3)",borderRadius:10,px:2,py:1,display:"flex",alignItems:"center",gap:1,boxShadow:"0 2px 16px rgba(0,0,0,0.4)",maxWidth:380,backdropFilter:"blur(8px)"}}>
            <Typography sx={{fontSize:16}}>{ZONE_ICON[nearZone.type]||"⚠️"}</Typography>
            <Typography sx={{fontSize:12,fontWeight:700,color:T.orange}}>{nearZone.warn}</Typography>
          </Box>
        )}

        {navigating&&dstGeoPos&&(
          <Box sx={{position:"absolute",bottom:0,left:0,right:0,zIndex:1100,background:"linear-gradient(0deg,rgba(10,10,15,0.97) 50%,transparent)",px:3,pt:4,pb:2,pointerEvents:"none"}}>
            <Typography sx={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:12,color:"rgba(255,255,255,0.35)",letterSpacing:1.5,textTransform:"uppercase",mb:0.3}}>Delivery Location</Typography>
            <Typography sx={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#fff",letterSpacing:0.2}} noWrap>{dest.split(",")[0]}</Typography>
          </Box>
        )}

        <MapContainer center={userPos||[31.6,77.2]} zoom={9} style={{height:"100%",width:"100%"}} zoomControl={false}>
          <MapController mapRef={mapRef}/>
          <MapClickHandler onMapClick={(lat,lon)=>{
            if(!source){ setSource(`${lat.toFixed(5)}, ${lon.toFixed(5)}`); reverseGeocode(lat,lon).then(a=>setSource(a)).catch(()=>{}); }
          }}/>
          <TileLayer url={tileUrl} attribution="© OSM" maxZoom={19} subdomains="abc"/>

          {!navigating && routeSegs.map((seg,i)=>(
            <Polyline key={i} positions={seg.points} pathOptions={{color:seg.color,weight:8,opacity:0.95,lineCap:"round",lineJoin:"round"}}/>
          ))}
          {navigating && drivenCoords.length>1&&<Polyline positions={drivenCoords} pathOptions={{color:"rgba(100,116,139,0.5)",weight:6,opacity:0.5,dashArray:"10,7"}}/>}
          {navigating && remainingCoords.length>1&&<Polyline positions={remainingCoords} pathOptions={{color:RC(sc),weight:8,opacity:0.95,lineCap:"round",lineJoin:"round"}}/>}

          {srcGeoPos&&<Marker position={srcGeoPos} icon={srcIcon}><Popup><b style={{color:"#22c55e"}}>🟢 Start</b><br/>{source}</Popup></Marker>}
          {dstGeoPos&&<Marker position={dstGeoPos} icon={dstIcon}><Popup><b style={{color:"#ef4444"}}>🔴 Destination</b><br/>{dest}</Popup></Marker>}

          {showHS&&HP_HOTSPOTS.map(h=>(
            <Circle key={h.id} center={[h.lat,h.lon]} radius={h.risk==="HIGH"?(h.killed>=7?3200:h.killed>=4?2200:1600):1100} pathOptions={{color:h.risk==="HIGH"?"#ef4444":"#f59e0b",fillColor:h.risk==="HIGH"?"#ef4444":"#f59e0b",fillOpacity:0.10,weight:1.5,dashArray:"6,5"}}>
              <Popup><div style={{fontFamily:"'DM Sans',sans-serif",minWidth:200}}><b style={{color:h.risk==="HIGH"?"#ef4444":"#f59e0b"}}>{h.risk==="HIGH"?"🔴":"🟡"} {h.name}</b><div style={{fontSize:12,marginTop:4,color:"rgba(255,255,255,0.5)"}}>📍 {h.district} · iRAD 2025-26</div><div style={{display:"flex",gap:6,marginTop:4}}><span style={{background:"rgba(239,68,68,0.15)",color:"#f87171",borderRadius:4,padding:"2px 8px",fontWeight:700}}>⚠️ {h.accidents} acc.</span><span style={{background:"rgba(239,68,68,0.15)",color:"#fca5a5",borderRadius:4,padding:"2px 8px",fontWeight:700}}>💀 {h.killed} killed</span></div></div></Popup>
            </Circle>
          ))}

          {showZones&&CRITICAL_ZONES.map(z=>{
            const clrMap={hospital:"#06b6d4",school:"#f59e0b",police:"#3b82f6",bridge:"#ef4444",fog:"#64748b",railway:"#f97316"};
            const c=clrMap[z.type]||"#64748b";
            const h=new Date().getHours();
            const schoolActive=z.type==="school"&&((h>=7&&h<=9)||(h>=13&&h<=16));
            return(<Circle key={z.id} center={[z.lat,z.lon]} radius={z.radius*(schoolActive?1.5:1)} pathOptions={{color:c,fillColor:c,fillOpacity:schoolActive||z.type==="fog"?0.18:0.08,weight:z.type==="fog"?1:2,dashArray:z.type==="fog"?"8,8":"4,4"}}><Popup><b style={{color:c}}>{ZONE_ICON[z.type]||"📍"} {z.name}</b><br/><span style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>{z.warn}</span></Popup></Circle>);
          })}

          {showCams&&SPEED_CAMS.map(cam=>(
            <Marker key={cam.id} position={[cam.lat,cam.lon]} icon={L.divIcon({className:"",html:`<div style="background:${cam.type==="camera"?"#ef4444":"#8b5cf6"};color:#fff;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;box-shadow:0 2px 12px rgba(0,0,0,0.4);white-space:nowrap">${cam.type==="camera"?"📷":"👮"} ${cam.limit}km/h</div>`})}>
              <Popup><b style={{color:T.text}}>{cam.name}</b><br/><span style={{color:"#f87171",fontWeight:700}}>Limit: {cam.limit} km/h</span></Popup>
            </Marker>
          ))}

          {showTolls&&HP_TOLLS.map(t=>{
            const fee=vehicle==="truck"?t.fee_truck:vehicle==="bike"?t.fee_bike:t.fee_car;
            return(<Marker key={t.id} position={[t.lat,t.lon]} icon={L.divIcon({className:"",html:`<div style="background:#f59e0b;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;color:#451a03;box-shadow:0 2px 12px rgba(0,0,0,0.4);white-space:nowrap">🛣️ ₹${fee}</div>`})}><Popup><b style={{color:T.text}}>{t.name}</b> ({t.highway})<br/>{vp.icon} ₹{fee}</Popup></Marker>);
          })}

          {showPasses&&HP_PASSES.map((p,i)=>{
            const mo=new Date().getMonth()+1, open=p.open_months.includes(mo);
            return(<Marker key={i} position={[p.lat,p.lon]} icon={L.divIcon({className:"",html:`<div style="background:${open?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)"};border:1.5px solid ${open?"#22c55e":"#ef4444"};border-radius:6px;padding:2px 8px;font-size:9px;font-weight:800;color:${open?"#4ade80":"#f87171"};white-space:nowrap;backdrop-filter:blur(4px)">⛰️ ${p.name.split(" ")[0]} — ${open?"OPEN":"CLOSED"}</div>`})}><Popup><b style={{color:T.text}}>{p.name}</b><br/>Elevation: {p.elev}<br/>Status: {open?"✅ Open":"❌ Closed"}{!open&&<><br/>Alt: {p.alt}</>}</Popup></Marker>);
          })}

          {showReports&&reports.map((r,i)=>(
            <Marker key={r.id||i} position={[r.lat||31.1,r.lon||77.1]} icon={L.divIcon({className:"",html:`<div style="background:rgba(10,10,15,0.9);border:2.5px solid ${RCOLORS[r.type]||"rgba(255,255,255,0.1)"};border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 12px rgba(0,0,0,0.4),0 0 8px ${RCOLORS[r.type]||"transparent"}44">${RICONS[r.type]||"⚠️"}</div>`})}>
              <Popup><b style={{textTransform:"capitalize",color:T.text}}>{r.type}</b>{r.description&&<><br/>{r.description}</>}</Popup>
            </Marker>
          ))}

          {userPos&&(<Marker position={userPos} icon={L.divIcon({className:"",html:`<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid rgba(255,255,255,0.9);box-shadow:0 0 0 6px rgba(59,130,246,0.25),0 2px 8px rgba(0,0,0,0.4)"></div>`})}><Popup style={{color:T.text}}>📍 Your GPS{liveSpd!==null?` · ${liveSpd} km/h`:""}</Popup></Marker>)}

          {navigating&&vehPos&&vehIcon&&!isMoving&&(
            <Marker position={vehPos} icon={vehIcon} zIndexOffset={1200}>
              <Popup>{vp.icon} {vp.label}<br/>{kmLeft!==null&&<><b>{fmtD((kmLeft||0)*1000)}</b> remaining<br/></>}{etaSec!==null&&<>ETA: <b>{fmtT(etaSec)}</b><br/></>}Risk: <b style={{color:RC(sc)}}>{RL(sc)} ({sc}/100)</b></Popup>
            </Marker>
          )}
        </MapContainer>

        {/* FABs */}
        <Box sx={{position:"absolute",bottom:navigating?72:24,right:12,zIndex:1000,display:"flex",flexDirection:"column",gap:1}}>
          <Tooltip title="My location" placement="left">
            <button onClick={()=>{
              navigator.geolocation?.getCurrentPosition(async p=>{
                const ll=[p.coords.latitude,p.coords.longitude]; setUserPos(ll);
                if(mapRef.current) mapRef.current.setView(ll,14,{animate:true});
                try{const a=await reverseGeocode(ll[0],ll[1]);if(!source)setSource(a.split(",").slice(0,2).join(",").trim());}catch{}
              },()=>toast("GPS unavailable","warning"),{enableHighAccuracy:true});
            }} style={{width:46,height:46,borderRadius:"50%",background:"rgba(15,15,24,0.95)",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",fontSize:18,boxShadow:"0 4px 16px rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>📍</button>
          </Tooltip>
          <Tooltip title={liveOn?"Stop tracking":"Start live GPS"} placement="left">
            <button onClick={()=>setLiveOn(v=>{ if(!v)toast("Live GPS started","success"); else{toast("Tracking stopped","info");if(timerRef.current)clearInterval(timerRef.current);} return !v; })} style={{width:46,height:46,borderRadius:"50%",background:liveOn?"rgba(34,197,94,0.15)":"rgba(15,15,24,0.95)",border:`1px solid ${liveOn?"rgba(34,197,94,0.3)":"rgba(255,255,255,0.1)"}`,cursor:"pointer",fontSize:13,boxShadow:`0 4px 16px rgba(0,0,0,0.4)${liveOn?",0 0 16px rgba(34,197,94,0.2)":""}`,fontWeight:800,color:liveOn?"#4ade80":"rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>
              {liveOn?"🟢":"⚫"}
            </button>
          </Tooltip>
          {navigating&&<Tooltip title="Centre on vehicle" placement="left"><button onClick={()=>vehPos&&mapRef.current?.setView(vehPos,15,{animate:true})} style={{width:46,height:46,borderRadius:"50%",background:"rgba(249,115,22,0.15)",border:"1.5px solid rgba(249,115,22,0.3)",cursor:"pointer",fontSize:20,boxShadow:"0 4px 16px rgba(0,0,0,0.4),0 0 16px rgba(249,115,22,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>{vp.icon}</button></Tooltip>}
          {navigating&&<Tooltip title="Stop navigation" placement="left"><button onClick={()=>{stopAnim();setNavigating(false);if(riskTimerRef.current)clearInterval(riskTimerRef.current);toast("Navigation stopped","info");setPanelMode("search");}} style={{width:46,height:46,borderRadius:"50%",background:"rgba(239,68,68,0.12)",border:"1.5px solid rgba(239,68,68,0.3)",cursor:"pointer",fontSize:14,boxShadow:"0 4px 16px rgba(0,0,0,0.4)",fontWeight:700,color:"#f87171",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></Tooltip>}
        </Box>

        {/* Legend */}
        <Box sx={{display:{xs:"none",md:"block"},position:"absolute",bottom:20,left:12,zIndex:1000,background:"rgba(10,10,15,0.92)",borderRadius:2,p:"8px 12px",boxShadow:"0 4px 16px rgba(0,0,0,0.4)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.06)"}}>
          {[["#22c55e","Safe (0–33)"],["#f59e0b","Medium (34–66)"],["#ef4444","High Risk (67+)"]].map(([c,l])=>(
            <Box key={l} sx={{display:"flex",alignItems:"center",gap:1,mb:0.4}}>
              <Box sx={{width:20,height:4,borderRadius:2,background:c,boxShadow:`0 0 6px ${c}66`}}/>
              <Typography sx={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{l}</Typography>
            </Box>
          ))}
          <Box sx={{height:"1px",background:"rgba(255,255,255,0.06)",my:0.5}}/>
          <Typography sx={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>⚠️ iRAD · 🏥 Zone · 📷 Cam · 🛣️ Toll · ⛰️ Pass</Typography>
        </Box>
      </Box>

      {/* ✅ POST-TRIP REVIEW MODAL (NLP sentiment) */}
      <TripReviewModal
        open={showReview}
        onClose={() => setShowReview(false)}
        tripFrom={source}
        tripTo={dest}
        pointsEarned={pointsEarned}
      />

      {/* Toast */}
      {snack&&(
        <Box sx={{position:"fixed",bottom:{xs:120,md:24},right:16,left:{xs:16,md:"auto"},zIndex:9999,background:"rgba(10,10,15,0.95)",color:snack.sev==="error"?"#f87171":snack.sev==="success"?"#4ade80":snack.sev==="warning"?"#fbbf24":"#60a5fa",border:`1px solid ${snack.sev==="error"?"rgba(239,68,68,0.3)":snack.sev==="success"?"rgba(34,197,94,0.3)":snack.sev==="warning"?"rgba(245,158,11,0.3)":"rgba(59,130,246,0.3)"}`,px:2,py:1.2,borderRadius:2,fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",animation:"toastIn 0.3s ease","@keyframes toastIn":{from:{transform:"translateY(8px)",opacity:0},to:{transform:"translateY(0)",opacity:1}},maxWidth:320,backdropFilter:"blur(12px)"}}>
          {snack.msg}
        </Box>
      )}
    </Box>
  );
}
