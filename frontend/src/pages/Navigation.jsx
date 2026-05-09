/**
 * Navigation.jsx v13.5 — IntelliCrash LIGHT THEME + ALTERNATE ROUTES + HINDI VOICE
 *
 * NEW vs v13.4:
 *  ✅ Hindi voice support — toggle 🔊/हिंदी button in directions panel
 *  ✅ HINDI_PHRASES static map for all navigation instructions
 *  ✅ speak() speaks English first, then Hindi if hindiOn
 *  ✅ translateToHindi() converts common nav phrases dynamically
 *  ✅ Prefers hi-IN voice on device, falls back to any available
 *  ✅ All v13.4 features retained
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
  getRealDeviceLocation, triggerSOS,
  getHotspotsML, getHotspotsDynamic, getHotspotsDynamicV2,
} from "../services/api";

import {
  loadGM, saveGM as saveGMUnified,
  awardTripPoints, awardReportPoints,
  checkAndUnlockBadges,
} from "../services/gamification";

import AmbulanceTracker from "../components/AmbulanceTracker";

import "./Navigation.css";

// ── Shared storage key with CommunityBulletin ─────────────────────────
const RESOLVED_STORAGE_KEY = "intellicrash_resolved_incidents";
const REPORT_POLL_MS = 15_000;
const DEFAULT_EXPIRE_MS = 5 * 3600_000;

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

// ══════════════════════════════════════════════════════════════════
// HINDI VOICE SYSTEM
// ══════════════════════════════════════════════════════════════════

/**
 * Static phrase map — common navigation instructions → Hindi.
 * Keys are lowercase substrings to match against English text.
 */
const HINDI_PHRASES = {
  // Maneuvers
  "turn left":                   "बायें मुड़ें",
  "turn right":                  "दायें मुड़ें",
  "slight left":                 "थोड़ा बायें",
  "slight right":                "थोड़ा दायें",
  "sharp left":                  "तेज़ बायें मुड़ें",
  "sharp right":                 "तेज़ दायें मुड़ें",
  "u-turn":                      "यू-टर्न लें",
  "uturn":                       "यू-टर्न लें",
  "keep left":                   "बायीं तरफ रहें",
  "keep right":                  "दायीं तरफ रहें",
  "continue straight":           "सीधे चलते रहें",
  "continue on":                 "आगे बढ़ें",
  "head out":                    "आगे बढ़ें",
  "merge":                       "मिलाएं",
  "take the ramp":               "रैम्प लें",
  "take the exit":               "निकास लें",
  "take the left fork":          "बायाँ रास्ता लें",
  "take the right fork":         "दायाँ रास्ता लें",
  "enter the roundabout":        "गोलचक्कर में प्रवेश करें",
  "at the roundabout":           "गोलचक्कर पर",
  "take the first exit":         "पहला निकास लें",
  "take the second exit":        "दूसरा निकास लें",
  "take the third exit":         "तीसरा निकास लें",
  "destination is on the left":  "गंतव्य बाईं ओर है",
  "destination is on the right": "गंतव्य दाईं ओर है",
  "you have arrived":            "आप पहुँच गए हैं",

  "arrive at your destination":  "आप अपने गंतव्य पर पहुँच गए हैं",

  // Risk & safety
  "high risk":                   "उच्च जोखिम",
  "medium risk":                 "मध्यम जोखिम",
  "low risk":                    "कम जोखिम",
  "warning":                     "चेतावनी",
  "caution":                     "सावधान",
  "accident hotspot":            "दुर्घटना क्षेत्र",
  "drive carefully":             "सावधानी से चलाएं",
  "drive with extreme caution":  "अत्यधिक सावधानी से चलाएं",
  "landslide":                   "भूस्खलन",
  "rockfall":                    "पत्थर गिरना",
  "bridge":                      "पुल",
  "police":                      "पुलिस",
  "minutes":                     "मिनट",
  "reduce speed":                "गति कम करें",
  "risk score":                  "जोखिम स्कोर",
  "out of 100":                  "में से 100",
  "starting navigation":         "नेविगेशन शुरू हो रहा है",
  "sos activated":               "एसओएस सक्रिय",
  "ambulance has been notified": "एम्बुलेंस को सूचित किया गया है",
  "stay calm":                   "शांत रहें",
  "fog":                         "कोहरा",
  "black ice":                   "काली बर्फ",
  "fatalities recorded":         "मौतें दर्ज की गई हैं",
  "incident reported":           "घटना रिपोर्ट की गई",
  "thank you for keeping hp roads safe": "एचपी सड़कों को सुरक्षित रखने के लिए धन्यवाद",
  "community-verified accident zone ahead": "आगे सामुदायिक-सत्यापित दुर्घटना क्षेत्र है",
  "confirmed reports":           "पुष्टि की गई रिपोर्टें",
  "route to":                    "मार्ग",
};

/**
 * Translate English nav text to Hindi.
 * UPGRADED: Handles distances, times, and segmental replacement.
 */
function translateToHindi(text) {
  if (!text) return "";
  const t_lower = text.toLowerCase();
  
  // Handle numbers/units first
  let result = t_lower;
  result = result.replace(/(\d+)\s*meters?/g, "$1 मीटर");
  result = result.replace(/(\d+)\s*km/g, "$1 किलोमीटर");
  result = result.replace(/(\d+)\s*min(utes?)?/g, "$1 मिनट");

  const sortedPhrases = Object.keys(HINDI_PHRASES).sort((a, b) => b.length - a.length);
  for (const phrase of sortedPhrases) {
    if (result.includes(phrase)) {
      result = result.replace(new RegExp(phrase, "g"), HINDI_PHRASES[phrase]);
    }
  }

  // If no translation occurred, fallback to original title-cased English
  if (result === t_lower) return text;
  
  return result;
}

/** 
 * Calculate safe braking distance (meters)
 * Based on speed (kph) and friction coefficient
 */
function getSafeBrakingDistance(kph, roadCondCode) {
  const v = kph / 3.6; // m/s
  const friction = roadCondCode === 1 ? 0.4 : roadCondCode === 2 ? 0.15 : 0.7;
  const g = 9.8;
  const dist = (v * v) / (2 * friction * g) + (v * 1.5); // braking + reaction
  return Math.round(dist);
}

/** Get best available Hindi voice, or null */
function getHindiVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => v.lang === "hi-IN") ||
    voices.find(v => v.lang.startsWith("hi")) ||
    voices.find(v => v.lang === "en-IN") ||
    null
  );
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

// ── LIGHT THEME Design tokens ─────────────────────────────────────
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
  shadow:  "rgba(0,0,0,0.1)",
  inputBg: "var(--bg-soft)",
  accent:  "var(--accent)",
};

const VP = {
  car:   { label:"Car",   icon:"🚗", osrm:"driving", avg:45, factor:1.00, vehicleType:"0" },
  bike:  { label:"Bike",  icon:"🏍️", osrm:"driving", avg:55, factor:0.88, vehicleType:"2" },
  walk:  { label:"Walk",  icon:"🚶", osrm:"walking", avg:5,  factor:1.00, vehicleType:"0" },
  truck: { label:"Truck", icon:"🚛", osrm:"driving", avg:35, factor:1.25, vehicleType:"1" },
  auto:  { label:"Auto",  icon:"🛺", osrm:"driving", avg:30, factor:1.10, vehicleType:"0" },
};

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
  { id:11, lat:31.38,    lon:76.83,     name:"Swarghat–Bilaspur",         district:"Bilaspur", accidents:14, killed:6,  risk:"HIGH"   },
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
  { id:29, lat:30.928968,lon:76.811236, name:"Hotel Classic Barotiwala",  district:"Solan",    accidents:8,  killed:9,  risk:"HIGH"   },
  { id:30, lat:31.712,   lon:76.932,    name:"Mandi–Rewalsar Road",       district:"Mandi",    accidents:8,  killed:3,  risk:"MEDIUM" },
  { id:31, lat:31.53,    lon:76.76,     name:"Bilaspur–Swarghat Road",    district:"Bilaspur", accidents:11, killed:5,  risk:"HIGH"   },
  { id:32, lat:31.58,    lon:78.10,     name:"Rampur–Reckong Peo NH-5",   district:"Kinnaur",  accidents:9,  killed:5,  risk:"HIGH"   },
  { id:33, lat:31.45,    lon:78.27,     name:"Karcham–Powari Kinnaur",    district:"Kinnaur",  accidents:8,  killed:6,  risk:"HIGH"   },
  { id:34, lat:30.94,    lon:76.81,     name:"Baddi EPIP Zone Road",      district:"Solan",    accidents:18, killed:7,  risk:"HIGH"   },
  { id:35, lat:30.96,    lon:76.84,     name:"Nalagarh–Baddi Industrial", district:"Solan",    accidents:15, killed:6,  risk:"HIGH"   },
  { id:36, lat:31.90,    lon:77.19,     name:"Patlikuhl–Anni Road",       district:"Kullu",    accidents:7,  killed:3,  risk:"MEDIUM" },
  { id:37, lat:32.062,   lon:75.98,     name:"Kangra–Jawalamukhi Road",   district:"Kangra",   accidents:9,  killed:3,  risk:"MEDIUM" },
  { id:38, lat:30.67,    lon:77.30,     name:"Pachhad–Rajgarh Stretch",   district:"Sirmaur",  accidents:6,  killed:3,  risk:"MEDIUM" },
];

const CRITICAL_ZONES = [
  { id:"f1", lat:32.2396, lon:77.1887, name:"Rohtang Fog & Ice Zone",       type:"fog",       warn:"Dense fog/black ice — reduce to 20 km/h, use fog lights",      radius:1200 },
  { id:"f2", lat:31.32,   lon:77.42,   name:"Narkanda Ice Zone",            type:"fog",       warn:"Black ice risk on hairpin bends — max 20 km/h",                 radius:900  },
  { id:"f3", lat:32.70,   lon:77.05,   name:"Keylong–Baralacha Fog Belt",   type:"fog",       warn:"Sudden fog above 3000m — hazard lights mandatory",              radius:1500 },
  { id:"f4", lat:31.58,   lon:78.10,   name:"Rampur–Kinnaur Gorge Fog",     type:"fog",       warn:"Gorge fog common at dawn — proceed with extreme caution",        radius:800  },
  { id:"f5", lat:32.55,   lon:76.12,   name:"Chamba–Dalhousie Cloud Zone",  type:"fog",       warn:"Low cloud / fog on mountain bends",                             radius:700  },
  { id:"b1", lat:31.71,   lon:76.92,   name:"Mandi Beas Bridge (NH-3)",     type:"bridge",    warn:"Single-lane bridge — one vehicle at a time, max 20 km/h",       radius:150  },
  { id:"b2", lat:31.55,   lon:76.89,   name:"Sundernagar Pong Span",        type:"bridge",    warn:"Narrow bridge with blind approach — sound horn",                 radius:120  },
  { id:"b3", lat:31.38,   lon:76.83,   name:"Bilaspur Gobind Sagar Bridge", type:"bridge",    warn:"Long exposed bridge — no overtaking, no stopping",               radius:250  },
  { id:"b4", lat:30.93,   lon:76.81,   name:"Baddi Industrial Road Bridge", type:"bridge",    warn:"Heavy vehicle bridge — vibrations, surface cracks",              radius:100  },
  { id:"b5", lat:31.20,   lon:77.74,   name:"Rohru Pabbar River Crossing",  type:"bridge",    warn:"Flood-prone crossing Jul–Sep — check water level",               radius:180  },
  { id:"b6", lat:31.45,   lon:78.27,   name:"Karcham Sutlej Gorge Bridge",  type:"bridge",    warn:"Extremely narrow — trucks use alternate timing system",           radius:200  },
  { id:"p1", lat:30.840,  lon:76.964,  name:"Parwanoo Entry Check Post",    type:"police",    warn:"HP border check post — carry valid ID and vehicle papers",       radius:200  },
  { id:"p2", lat:31.108,  lon:77.173,  name:"Shimla Entry Naka (NH-5)",     type:"police",    warn:"Police naka — speed check, documents required",                  radius:150  },
  { id:"p3", lat:31.510,  lon:76.900,  name:"Sundernagar Police Naka",      type:"police",    warn:"Checkpoint — overloaded vehicles stopped here",                  radius:150  },
  { id:"p4", lat:32.094,  lon:76.102,  name:"Dharamshala Entry Naka",       type:"police",    warn:"Tourist season checkpoint — carry permit for Rohtang",           radius:150  },
  { id:"p5", lat:32.224,  lon:77.189,  name:"Rohtang NGT Permit Naka",      type:"police",    warn:"NGT permit required beyond this point — diesel vehicles barred",  radius:200  },
  { id:"p6", lat:30.449,  lon:77.566,  name:"Poanta Sahib HP-Uttarakhand",  type:"police",    warn:"State border check — commercial vehicles need permit",           radius:200  },
  { id:"l1", lat:31.127,  lon:77.228,  name:"Mashobra Landslide Zone",      type:"landslide", warn:"Active landslide zone — debris falls common Jul–Sep",            radius:600  },
  { id:"l2", lat:31.628,  lon:76.939,  name:"Balh–Sundernagar Slide Zone",  type:"landslide", warn:"Hillside cuts unstable — watch for falling rocks",               radius:500  },
  { id:"l3", lat:32.05,   lon:77.32,   name:"Manali Approach Slide Zone",   type:"landslide", warn:"Rock fall zone — do not stop, pass quickly",                    radius:700  },
  { id:"l4", lat:31.58,   lon:78.10,   name:"Kinnaur Gorge Slide Belt",     type:"landslide", warn:"Frequent rockfalls — check HRTC advisories before travel",      radius:1000 },
  { id:"l5", lat:32.70,   lon:77.05,   name:"Lahaul Valley Debris Zone",    type:"landslide", warn:"Glacial debris on road — bulldozers clear daily in season",     radius:900  },
  { id:"r1", lat:30.840,  lon:76.970,  name:"Kalka–Shimla Railway Xing",    type:"railway",   warn:"Heritage railway crossing — train every 2 hrs, look both ways",  radius:100  },
  { id:"r2", lat:31.470,  lon:76.270,  name:"Una Railway Level Crossing",   type:"railway",   warn:"Unmanned level crossing — stop and check before crossing",        radius:100  },
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

function getNearestHotspot(lat,lon,radiusM=2000) {
  let nearest=null,minDist=Infinity;
  for(const h of HP_HOTSPOTS){
    const d=hvDist([lat,lon],[h.lat,h.lon]);
    if(d<radiusM&&d<minDist){minDist=d;nearest={...h,distanceM:Math.round(d)};}
  }
  return nearest;
}
function inferRoadType(lat,lon) {
  const nhCorridors=[
    {lat1:30.83,lon1:76.95,lat2:31.12,lon2:77.20},{lat1:31.12,lon1:77.20,lat2:31.96,lon2:77.11},
    {lat1:31.55,lon1:76.89,lat2:31.96,lon2:77.11},{lat1:31.70,lon1:76.92,lat2:31.83,lon2:77.12},
    {lat1:32.09,lon1:76.10,lat2:32.24,lon2:76.39},{lat1:30.44,lon1:77.55,lat2:30.58,lon2:77.47},
  ];
  for(const c of nhCorridors){
    const latOk=lat>=Math.min(c.lat1,c.lat2)-0.05&&lat<=Math.max(c.lat1,c.lat2)+0.05;
    const lonOk=lon>=Math.min(c.lon1,c.lon2)-0.05&&lon<=Math.max(c.lon1,c.lon2)+0.05;
    if(latOk&&lonOk)return"2";
  }
  if(lat>30.88&&lat<30.95&&lon>76.77&&lon<76.85)return"3";
  return"1";
}
function inferAreaType(lat,lon) {
  const urbanCenters=[
    [31.1048,77.1734,8000],[31.7088,76.9330,5000],[31.9578,77.1095,4000],
    [32.0947,76.1022,5000],[30.9050,77.0950,4000],[30.9237,76.7980,6000],
    [30.4497,77.5666,4000],[31.4700,76.2700,3000],
  ];
  for(const [clat,clon,r] of urbanCenters){
    if(hvDist([lat,lon],[clat,clon])<r)return"1";
  }
  return"0";
}
function wxCodeToBackend(wx) {
  if(!wx)return"0";
  const code=wx.weathercode??0;
  if(code===0||code<=3)return"0";
  if(code>=45&&code<=48)return"2";
  if(code>=71&&code<=77)return"3";
  if(code>=85&&code<=86)return"3";
  if(code>=95)return"4";
  if(code>=51&&code<=82)return"1";
  return"0";
}
function wxToVisibility(wx) {
  if(!wx)return 1000;
  const code=wx.weathercode??0;
  if(code>=45&&code<=48)return 200;
  if(code>=95)return 150;
  if(code>=71&&code<=77)return 300;
  if(code>=85&&code<=86)return 250;
  if(code>=51&&code<=82)return 700;
  return 1000;
}

function buildRiskParams({lat,lon,weather,vehicle,currentSpeedKph,nearestLearnedHotspot}) {
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
  const nearIradHotspot=getNearestHotspot(lat,lon,2000);
  const criticalZone=(nearIradHotspot||nearestLearnedHotspot)?"1":"0";
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

const RC  = s=>s>=67?"#dc2626":s>=34?"#d97706":"#16a34a";
const RCL = s=>s>=67?"rgba(220,38,38,0.08)":s>=34?"rgba(217,119,6,0.08)":"rgba(22,163,74,0.08)";
const RCB = s=>s>=67?"rgba(220,38,38,0.2)":s>=34?"rgba(217,119,6,0.2)":"rgba(22,163,74,0.2)";
const RL  = s=>s>=67?"High Risk":s>=34?"Medium Risk":"Low Risk";

function segmentRisk(coord) {
  let maxScore=0;
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
  return maxScore;
}
function buildRouteSegments(coords) {
  if(coords.length<2)return[];
  const segs=[];let cur={color:null,points:[coords[0]]};
  for(let i=1;i<coords.length;i++){
    const rs=segmentRisk(coords[i]);
    const color=rs>=67?"#dc2626":rs>=34?"#d97706":"#16a34a";
    if(cur.color===null)cur.color=color;
    if(color===cur.color){cur.points.push(coords[i]);}
    else{cur.points.push(coords[i]);segs.push({...cur});cur={color,points:[coords[i]]};}
  }
  if(cur.points.length>1)segs.push(cur);
  return segs;
}

function fmtT(s){const h=Math.floor(s/3600),m=Math.round((s%3600)/60);return h?`${h}h ${m}m`:`${m} min`;}
function fmtD(m){return m>=1000?`${(m/1000).toFixed(1)} km`:`${Math.round(m)} m`;}

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
    l.onload=()=>setReady(true);l.onerror=()=>setReady(true);
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

function XAIOverlay({xaiFacts,xaiText,rfScore,lstmScore,riskScore,riskParams}) {
  const[expanded,setExpanded]=useState(false);
  if(!xaiText&&!xaiFacts)return null;
  const sc=riskScore??50;
  return(
    <Box sx={{position:"absolute",top:56,right:12,zIndex:1200,maxWidth:300,width:"calc(100% - 120px)"}}>
      <Box onClick={()=>setExpanded(e=>!e)} sx={{background:"rgba(255,255,255,0.97)",border:`1px solid ${RC(sc)}33`,borderRadius:2,px:1.5,py:1,cursor:"pointer",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",gap:1,boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>
        <Typography sx={{fontSize:11,fontWeight:700,color:T.textSub,letterSpacing:0.6}}>🧠 XAI</Typography>
        <Typography sx={{fontSize:11,color:T.textSub,flex:1}} noWrap>{xaiText?.slice(0,42)}…</Typography>
        {expanded?<ExpandLess sx={{fontSize:14,color:T.textSub}}/>:<ExpandMore sx={{fontSize:14,color:T.textSub}}/>}
      </Box>
      <Collapse in={expanded}>
        <Box sx={{background:"rgba(255,255,255,0.98)",border:`1px solid ${T.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",p:1.5,backdropFilter:"blur(12px)",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>
          <Box sx={{display:"flex",gap:0.8,mb:1,flexWrap:"wrap"}}>
            {rfScore!=null&&<Chip label={`RF ${rfScore}/100`} size="small" sx={{height:18,fontSize:9,background:"rgba(37,99,235,0.1)",color:"#2563eb",fontWeight:700}}/>}
            {lstmScore!=null&&<Chip label={`LSTM ${lstmScore}/100`} size="small" sx={{height:18,fontSize:9,background:"rgba(124,58,237,0.1)",color:"#7c3aed",fontWeight:700}}/>}
            <Chip label={`Score ${sc}/100`} size="small" sx={{height:18,fontSize:9,background:RC(sc),color:"#fff",fontWeight:800}}/>
          </Box>
          {xaiText&&<Typography sx={{fontSize:10,color:T.textSub,mb:1,fontStyle:"italic",lineHeight:1.5}}>{xaiText}</Typography>}
          {riskParams&&(
            <Box sx={{mb:1}}>
              <Typography sx={{fontSize:9,fontWeight:700,color:T.textSub,letterSpacing:0.8,mb:0.5}}>INPUTS TO RF MODEL</Typography>
              {[["Road Type",riskParams._meta?.roadTypeLabel],["Time",riskParams._meta?.timeLabel],["Weather",riskParams._meta?.weatherLabel],["Speed",`${Math.round(riskParams.speed)} km/h`],["iRAD Hotspot",riskParams.criticalZone==="1"?`⚠️ ${riskParams._meta?.nearHotspot?.name||"Zone"}`:"Clear"],["Light",riskParams._meta?.lightLabel],["Road Surface",riskParams._meta?.roadCondLabel],["Vehicle",VP[riskParams._vehicleKey||"car"]?.label||"Car"]].map(([k,v])=>(
                <Box key={k} sx={{display:"flex",justifyContent:"space-between",py:0.2}}>
                  <Typography sx={{fontSize:9,color:T.textSub}}>{k}</Typography>
                  <Typography sx={{fontSize:9,fontWeight:700,color:T.text,maxWidth:150,textAlign:"right"}} noWrap>{v}</Typography>
                </Box>
              ))}
            </Box>
          )}
          {xaiFacts&&Object.entries(xaiFacts).slice(0,5).map(([k,v])=>(
            <Box key={k} sx={{display:"flex",justifyContent:"space-between",py:0.2,borderTop:`1px solid ${T.border}`}}>
              <Typography sx={{fontSize:9,color:T.textSub}}>{k.replace(/_/g," ")}</Typography>
              <Typography sx={{fontSize:9,fontWeight:600,color:T.text,maxWidth:160,textAlign:"right"}} noWrap>{String(v)}</Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
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

function awardPoints(pts) {
  const gm=loadGM();
  const next={...gm,points:gm.points+pts,totalEarned:(gm.totalEarned||0)+pts};
  saveGMUnified(next);
  return next;
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
  const fileRef     = useRef(null);
  const alertedZones= useRef(new Set());
  const vehMarkerRef= useRef(null);
  const userMarkerRef = useRef(null);
  const scRef       = useRef(50);
  const directionsRef=useRef(null);
  const vehicleRef  = useRef("car");
  const weatherRef  = useRef(null);
  const leafletReady= useLeafletCSS();
  const calcRiskRef = useRef(null);
  const resolvedIdsRef = useRef(getResolvedIds());
  const rawReportsRef = useRef([]);
  const reportPollRef = useRef(null);
  // ── Hindi voice refs (stable across re-renders) ────────────────
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
  // ── Voice states ───────────────────────────────────────────────
  const [voiceOn, setVoiceOn]=useState(true);
  const [hindiOn, setHindiOn]=useState(false);  // ✅ NEW: Hindi voice toggle
  // ──────────────────────────────────────────────────────────────
  const [snack,   setSnack]  =useState(null);
  const [mapStyle,setMapStyle]=useState("standard");
  const [nearZone,setNearZone]=useState(null);
  const [reports, setReports]=useState([]);
  const [rptType,    setRptType]   =useState("accident");
  const [rptDesc,    setRptDesc]   =useState("");
  const [rptPhotos,  setRptPhotos] =useState([]);
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

  const [allRoutes,      setAllRoutes]      = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeRiskScores,  setRouteRiskScores]  = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const [showAmbulance, setShowAmbulance] = useState(false);
  const [sosPatientPos, setSosPatientPos] = useState(null);
  const [sosGpsLoading, setSosGpsLoading] = useState(false);

  // Keep refs in sync with state so animation callbacks always have latest
  useEffect(()=>{ voiceOnRef.current = voiceOn; }, [voiceOn]);
  useEffect(()=>{ hindiOnRef.current = hindiOn; }, [hindiOn]);

  const toast=useCallback((msg,sev="info")=>{setSnack({msg,sev});setTimeout(()=>setSnack(null),4500);},[]);

  // ══════════════════════════════════════════════════════════════
  // ✅ HINDI-AWARE speak() — speaks English, then Hindi if enabled
  // ══════════════════════════════════════════════════════════════
  const speak = useCallback((text) => {
    if (!voiceOnRef.current || !window.speechSynthesis) return;

    // Check for voice availability
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Re-queue after voices are likely loaded
      setTimeout(() => speak(text), 500);
      return;
    }

    window.speechSynthesis.cancel();

    if (hindiOnRef.current) {
      const hindiText = translateToHindi(text);
      if (!hindiText || hindiText === text) {
        const enU = new SpeechSynthesisUtterance(text);
        enU.lang = "en-IN";
        enU.rate = 0.95;
        window.speechSynthesis.speak(enU);
      } else {
        const hiU = new SpeechSynthesisUtterance(hindiText);
        const hiVoice = getHindiVoice();
        if (hiVoice) hiU.voice = hiVoice;
        hiU.lang = "hi-IN";
        hiU.rate = 0.85;
        window.speechSynthesis.speak(hiU);
      }
    } else {
      const enU = new SpeechSynthesisUtterance(text);
      enU.lang = "en-IN";
      enU.rate = 0.95;
      enU.pitch = 1.0;
      window.speechSynthesis.speak(enU);
    }
  }, []);


  // Preload voices on mount
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  useEffect(() => {
    if (window.speechSynthesis) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) setVoicesLoaded(true);
      };
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
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
    const handleStorageChange = (e) => {
      if (e.key === RESOLVED_STORAGE_KEY) applyReportsFilter(rawReportsRef.current);
    };
    const handleResolveEvent = () => applyReportsFilter(rawReportsRef.current);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("intellicrash_report_resolved", handleResolveEvent);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("intellicrash_report_resolved", handleResolveEvent);
    };
  }, [applyReportsFilter]);

  const handleSOS = useCallback(async () => {
    const ok = window.confirm("🚨 TRIGGER SOS? Ambulance and local officials will be notified.");
    if (!ok) return;
    
    setSosGpsLoading(true);
    try {
      let pos = await getRealDeviceLocation();
      if (!pos && userPos) pos = userPos;
      if (!pos && vehPos) pos = vehPos;
      
      const [lat, lon] = pos || [31.1048, 77.1734];
      
      // Trigger backend alert
      await triggerSOS({
        lat, lon, auto_crash: false,
        user_name: "IntelliCrash Driver (Nav)",
        address: "HP Mountain Road Navigation"
      });

      setSosPatientPos([lat, lon]);
      setShowAmbulance(true);
      
      toast("🚨 SOS triggered — ambulance dispatched", "error");
      speak("SOS activated. Help is on the way. Stay calm.");
      
    } catch (err) {
      console.error("[SOS error]", err);
      toast("Error dispatching ambulance. Please retry.", "error");
    } finally {
      setSosGpsLoading(false);
    }
  }, [userPos, vehPos, toast, speak]);

  const checkZones=useCallback((lat,lon)=>{
    const curHour = new Date().getHours();

    // ── Critical zones (fog, bridge, police, landslide, railway) ─────
    CRITICAL_ZONES.forEach(z=>{
      const d=hvDist([lat,lon],[z.lat,z.lon]);
      if(d<z.radius+80&&!alertedZones.current.has(z.id)){
        alertedZones.current.add(z.id);
        setNearZone({...z, distanceM: Math.round(d)});
        const icon=z.type==="fog"?"🌫️":z.type==="bridge"?"🌉":z.type==="police"?"👮":z.type==="landslide"?"⛰️":z.type==="railway"?"🚂":"⚠️";
        const distTxt = d < 100 ? "You are in" : `${Math.round(d)}m ahead —`;
        const fullWarn = `${distTxt} ${z.warn}`;
        speak(fullWarn);
        toast(`${icon} ${fullWarn}`,"warning");
        setTimeout(()=>{alertedZones.current.delete(z.id);setNearZone(p=>p?.id===z.id?null:p);},90000);
      }
    });

    // ── Toll booth proximity alerts ──────────────────────────────────
    HP_TOLLS.forEach(t=>{
      const d=hvDist([lat,lon],[t.lat,t.lon]);
      const veh=vehicleRef.current||"car";
      const fee=veh==="truck"?t.fee_truck:veh==="bike"?t.fee_bike:t.fee_car;
      if(d<500&&!alertedZones.current.has(`toll_${t.id}`)){
        alertedZones.current.add(`toll_${t.id}`);
        const tollMsg=`Toll booth ahead: ${t.name} on ${t.highway}. Fee: ₹${fee}. Prepare exact change.`;
        speak(tollMsg);
        toast(`🛣️ ${tollMsg}`,"info");
        setNearZone({id:`toll_${t.id}`,name:`${t.name} Toll`,type:"toll",warn:`${t.highway} toll — ₹${fee} for your vehicle. Have cash ready.`,distanceM:Math.round(d)});
        setTimeout(()=>{alertedZones.current.delete(`toll_${t.id}`);setNearZone(p=>p?.id===`toll_${t.id}`?null:p);},120000);
      }
    });

    // ── iRAD accident hotspots (GPS-proven past accidents) ───────────
    HP_HOTSPOTS.forEach(h=>{
      const d=hvDist([lat,lon],[h.lat,h.lon]);
      const thresh=h.risk==="HIGH"?1200:700;
      if(d<thresh&&!alertedZones.current.has(`hs_${h.id}`)){
        alertedZones.current.add(`hs_${h.id}`);
        const msg=h.risk==="HIGH"
          ?`Warning! High-risk accident hotspot: ${h.name}. ${h.killed} fatalities recorded here. Drive with extreme caution.`
          :`Caution! Accident-prone zone: ${h.name}. ${h.accidents} accidents recorded. Slow down.`;
        speak(msg);
        if(h.risk==="HIGH")toast(`🔴 ${msg}`,"error");else toast(`🟡 ${msg}`,"warning");
        setTimeout(()=>alertedZones.current.delete(`hs_${h.id}`),120000);
      }
    });

    // ── Adaptive community-learned hotspots (real user reports + decay) ─
    learnedHotspots.filter(h=>h.is_hotspot).forEach(h=>{
      const d=hvDist([lat,lon],[h.lat,h.lon]);
      if(d<800&&!alertedZones.current.has(`lh_${h.grid_key}`)){
        alertedZones.current.add(`lh_${h.grid_key}`);
        const riskLabel=h.risk==="HIGH"?"High-risk":h.risk==="MEDIUM"?"Medium-risk":"Reported";
        const fatalNote=h.fatals>0?` ${h.fatals} fatal incidents.`:"";
        const msg=`Caution! ${riskLabel} community hotspot ahead — ${h.count} driver reports.${fatalNote} Risk score: ${h.weighted_score?.toFixed?.(0)??"—"}.`;
        speak(msg);
        toast(`⚠️ ${riskLabel} hotspot: ${h.count} community reports here`,h.risk==="HIGH"?"error":"warning");
        setTimeout(()=>alertedZones.current.delete(`lh_${h.grid_key}`),120000);
      }
    });
  },[speak,toast,learnedHotspots]);

  const calcRisk=useCallback(async(lat,lon,currentSpeedKph=null)=>{
    try{
      let wx=weatherRef.current;
      if(!wx){try{wx=await getWeather(lat,lon);weatherRef.current=wx;setWeather(wx);}catch(_){}}
      let nearestLearned=null;
      try{
        const confirmed=learnedHotspots.filter(h=>h.is_hotspot);
        for(const h of confirmed){const d=hvDist([lat,lon],[h.lat,h.lon]);if(d<2000){nearestLearned=h;break;}}
      }catch(_){}
      const riskParams=buildRiskParams({lat,lon,weather:wx,vehicle:vehicleRef.current,currentSpeedKph,nearestLearnedHotspot:nearestLearned});
      setCurrentRiskParams(riskParams);
      const{_meta,_vehicleKey,...payload}=riskParams;
      const pred=await predictRisk(payload);
      const rf=pred.rf_boosted??pred.rf_score??pred.score??50;
      const lstm=pred.lstm_score??null;
      const sc=Math.round(pred.score??rf);
      setRfScore(Math.round(rf));setLstmScore(lstm!=null?Math.round(lstm):null);
      setRiskScore(sc);setXaiText(pred.xai_explanation??"");setXaiFacts(pred.xai_factors??null);setRiskCalcErr(null);
      const al=[];
      if(sc>=67)al.push(`⚠️ High risk — score ${sc}/100 on this road`);
      if(wx?.rain)al.push("🌧️ Wet roads — increase following distance");
      if(wx?.snow)al.push("❄️ Snow/ice on road — chains recommended, max 30 km/h");
      if(wx?.fog)al.push("🌫️ Fog detected — use fog lights, max 30 km/h");
      if(riskParams.lightCondition==="1")al.push("🌙 Night driving — reduced visibility, higher risk");
      if(currentSpeedKph&&currentSpeedKph>80)al.push(`🚗 Speed ${Math.round(currentSpeedKph)} km/h — excessive for HP mountain roads`);
      if(riskParams.criticalZone==="1"){const hs=riskParams._meta?.nearHotspot||nearestLearned;al.push(`⚠️ Hotspot nearby: ${hs?.name||hs?.grid_key||"Accident zone"}`);}
      if(parseInt(riskParams.roadCondition)===2)al.push("🧊 Icy road surface — brake very gently");
      setAlerts(al.slice(0,4));
    }catch(e){console.error("Risk calc error:",e.message);setRiskCalcErr(e.message);}
  },[learnedHotspots]);

  useEffect(()=>{calcRiskRef.current=calcRisk;},[calcRisk]);
  useEffect(()=>{weatherRef.current=weather;},[weather]);
  useEffect(()=>{vehicleRef.current=vehicle;},[vehicle]);

  useEffect(()=>{
    fetchAndFilterReports();
    reportPollRef.current = setInterval(fetchAndFilterReports, REPORT_POLL_MS);
    navigator.geolocation?.getCurrentPosition(p=>setUserPos([p.coords.latitude,p.coords.longitude]),()=>{});
    getLearnedHotspots().then(h=>setLearnedHotspots(h)).catch(()=>{});
    seedLearnedHotspotsFromBackend().then(()=>{
      getLearnedHotspots().then(h=>setLearnedHotspots(h)).catch(()=>{});
    }).catch(()=>{});
    const f=params.get("from"),t=params.get("to");
    if(f&&t)setTimeout(()=>runNavigation(f,t),800);
    return () => {
      if (reportPollRef.current) clearInterval(reportPollRef.current);
    };
    // eslint-disable-next-line
  },[]);

  useEffect(()=>{
    if(!liveOn){
      if(userMarkerRef.current){
        try{userMarkerRef.current.remove();}catch(_){}
        userMarkerRef.current=null;
      }
      return;
    }
    const updateLoc=()=>{
      navigator.geolocation?.getCurrentPosition(
        (p)=>{
          const lat=p.coords.latitude,lon=p.coords.longitude,ll=[lat,lon];
          setUserPos(ll);
          const spd=p.coords.speed!=null?Math.round(p.coords.speed*3.6):null;
          if(spd!=null)setLiveSpd(spd);
          const map=mapRef.current;
          if(map){
            const dotHTML=`<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 5px rgba(37,99,235,0.2),0 2px 8px rgba(0,0,0,0.15)"></div>`;
            const dotIcon=L.divIcon({className:"",html:dotHTML,iconSize:[14,14],iconAnchor:[7,7]});
            if(!userMarkerRef.current){try{userMarkerRef.current=L.marker(ll,{icon:dotIcon,zIndexOffset:900}).addTo(map);userMarkerRef.current.bindPopup(`📍 Your GPS${spd!=null?` · ${spd} km/h`:""}`);}catch(_){}}
            else{try{userMarkerRef.current.setLatLng(ll);userMarkerRef.current.setPopupContent(`📍 Your GPS${spd!=null?` · ${spd} km/h`:""}`);}catch(_){}}
            if(!navigating){try{map.panTo(ll,{animate:true,duration:0.8});}catch(_){}}
          }
          calcRiskRef.current?.(lat,lon,spd);checkZones(lat,lon);
        },
        (err)=>{ console.warn("[LiveGPS]",err.message); },
        {enableHighAccuracy:true,maximumAge:0,timeout:10000}
      );
    };
    updateLoc();
    const id=setInterval(updateLoc,5000);
    timerRef.current=id;
    return()=>clearInterval(id);
  },[liveOn,navigating,checkZones]);

  useEffect(()=>()=>{
    if(timerRef.current)clearInterval(timerRef.current);
    if(riskTimerRef.current)clearInterval(riskTimerRef.current);
    if(reportPollRef.current)clearInterval(reportPollRef.current);
    if(animRef.current)cancelAnimationFrame(animRef.current);
    if(vehMarkerRef.current){try{vehMarkerRef.current.remove();}catch(_){}vehMarkerRef.current=null;}
    if(userMarkerRef.current){try{userMarkerRef.current.remove();}catch(_){}userMarkerRef.current=null;}
  },[]);

  useEffect(()=>{scRef.current=riskScore??50;},[riskScore]);
  useEffect(()=>{directionsRef.current=directions;},[directions]);

  const animState=useRef({running:false});

  const stopAnim=useCallback(()=>{
    animState.current.running=false;
    if(animRef.current){cancelAnimationFrame(animRef.current);animRef.current=null;}
    setIsMoving(false);
    if(vehMarkerRef.current){try{vehMarkerRef.current.remove();}catch(_){}vehMarkerRef.current=null;}
  },[]);

  const startAnim=useCallback((coords,durationMin)=>{
    stopAnim();
    if(!coords||coords.length<2)return;
    const cumM=[0];
    for(let i=1;i<coords.length;i++)cumM.push(cumM[cumM.length-1]+hvDist(coords[i-1],coords[i]));
    const totalM=cumM[cumM.length-1];if(totalM<10)return;
    const SIM_DURATION_MS=Math.min(durationMin*60*1000,120_000);
    const speedMperMs=totalM/SIM_DURATION_MS;
    let distTravelled=0,lastTs=null,lastDisplayTs=0,stepPointer=0;
    let smoothHdg=brng(coords[0],coords[1]);let iconScore=scRef.current;
    const map=mapRef.current;
    setVehPos(coords[0]);setVehHdg(smoothHdg);setIsMoving(true);
    setTripPct(0);setKmLeft(totalM/1000);setEtaSec(durationMin*60);setDrivenIdx(0);
    if(map){
      if(vehMarkerRef.current){try{vehMarkerRef.current.remove();}catch(_){}vehMarkerRef.current=null;}
      try{vehMarkerRef.current=L.marker(coords[0],{icon:mkVehicleIcon(vehicleRef.current,smoothHdg,scRef.current,true),zIndexOffset:1200,interactive:false}).addTo(map);}catch(_){}
      try{map.panTo(coords[0],{animate:true,duration:0.6});}catch(_){}
    }
    animState.current={running:true};let lastRiskCalcDist=0;
    const frame=(ts)=>{
      if(!animState.current.running)return;
      if(lastTs===null){lastTs=ts;animRef.current=requestAnimationFrame(frame);return;}
      const dt=Math.min(ts-lastTs,50);lastTs=ts;distTravelled+=speedMperMs*dt;
      if(distTravelled>=totalM){
        const fp=coords[coords.length-1];
        if(vehMarkerRef.current){try{vehMarkerRef.current.setLatLng(fp);}catch(_){}}
        setVehPos(fp);setKmLeft(0);setEtaSec(0);setTripPct(100);
        stopAnim();setNavigating(false);setShowReview(true);
        speak("You have arrived at your destination.");toast("🏁 Arrived!","success");return;
      }
      let si=0;for(let i=0;i<coords.length-1;i++){if(cumM[i+1]>distTravelled){si=i;break;}}
      const segDist=distTravelled-cumM[si];const segLen=cumM[si+1]-cumM[si];
      const t=segLen>0?Math.min(segDist/segLen,1):0;const pos=lerp(coords[si],coords[si+1],t);
      const rawHdg=brng(coords[si],coords[si+1]);let hdgDiff=rawHdg-smoothHdg;
      if(hdgDiff>180)hdgDiff-=360;if(hdgDiff<-180)hdgDiff+=360;
      smoothHdg=(smoothHdg+hdgDiff*0.08+360)%360;
      if(vehMarkerRef.current){
        try{vehMarkerRef.current.setLatLng(pos);}catch(_){}
        const curScore=scRef.current;
        if(curScore!==iconScore){iconScore=curScore;try{vehMarkerRef.current.setIcon(mkVehicleIcon(vehicleRef.current,smoothHdg,curScore,true));}catch(_){}}
      }
      if(ts-lastDisplayTs>200){lastDisplayTs=ts;const remM=totalM-distTravelled;setKmLeft(remM/1000);setEtaSec((remM/totalM)*durationMin*60);setTripPct(Math.min(100,(distTravelled/totalM)*100));setDrivenIdx(si);setVehPos(pos);}
      if(map){try{const px=map.latLngToContainerPoint(pos);const cx=map.latLngToContainerPoint(map.getCenter());const pxDist=Math.sqrt((px.x-cx.x)**2+(px.y-cx.y)**2);if(pxDist>100)map.panTo(pos,{animate:true,duration:0.5});}catch(_){}}
      checkZones(pos[0],pos[1]);
      const kmTravelled=distTravelled/1000;
      if(kmTravelled-lastRiskCalcDist>=5){lastRiskCalcDist=kmTravelled;const simSpeed=(totalM/1000/durationMin)*60;calcRiskRef.current?.(pos[0],pos[1],simSpeed);}
      const dirs=directionsRef.current;
      if(dirs?.steps?.length){let cumKm=0;const donKm=distTravelled/1000;for(let i=0;i<dirs.steps.length;i++){cumKm+=(dirs.steps[i].distance_m||0)/1000;if(cumKm>donKm){if(i!==stepPointer){stepPointer=i;setCurrentStep(i);speak(dirs.steps[i].instruction||"");}break;}}}
      animRef.current=requestAnimationFrame(frame);
    };
    animRef.current=requestAnimationFrame(frame);
  },[stopAnim,speak,toast,checkZones]);

  const selectRoute = useCallback((idx) => {
    if (!allRoutes[idx]) return;
    const route = allRoutes[idx];
    const vp = VP[vehicle];
    const coords = route.geometry.coordinates.map(([ln, la]) => [la, ln]);
    setSelectedRouteIdx(idx);
    setRouteCoords(coords);
    setRouteSegs(buildRouteSegments(coords));
    setDrivenIdx(0);
    const adjDur = Math.round(route.duration_min * vp.factor);
    setDirections(route);
    setCurrentStep(0);
    setRouteInfo({ distance_km: route.distance_km, duration_min: adjDur });
    setKmLeft(route.distance_km);
    setEtaSec(adjDur * 60);
    setTripPct(0);
    if (mapRef.current && srcGeoPos && dstGeoPos) {
      try { mapRef.current.fitBounds([srcGeoPos, dstGeoPos], { padding: [80, 80], animate: true }); } catch (_) {}
    }
    toast(`Route ${idx + 1} selected — ${route.distance_km} km, ${adjDur} min`, "success");
  }, [allRoutes, vehicle, srcGeoPos, dstGeoPos, toast]);

  const runNavigation=useCallback(async(srcOv,dstOv)=>{
    const s=srcOv||source,d=dstOv||dest;
    if(!s.trim()||!d.trim()){toast("Enter source and destination","warning");return;}
    setLoading(true);setLoadingRoutes(true);setAlerts([]);alertedZones.current.clear();stopAnim();
    try{
      let sGeo,dGeo;
      try{[sGeo,dGeo]=await Promise.all([geocodePlace(s),geocodePlace(d)]);}
      catch(e){toast(`Location not found: ${e.message}`,"error");setLoading(false);setLoadingRoutes(false);return;}
      setSrcGeoPos([sGeo.lat,sGeo.lon]);setDstGeoPos([dGeo.lat,dGeo.lon]);
      const vp=VP[vehicle];
      let routes = [];
      try { routes = await getMultipleRoutes(sGeo.lat, sGeo.lon, dGeo.lat, dGeo.lon, vp.osrm); }
      catch(e) { toast("No route found — check your locations", "error"); setLoading(false); setLoadingRoutes(false); return; }
      const [wxR, fcR] = await Promise.allSettled([getWeather(sGeo.lat, sGeo.lon), getWeatherForecast(sGeo.lat, sGeo.lon)]);
      const wx=wxR.status==="fulfilled"?wxR.value:null;
      const fc=fcR.status==="fulfilled"?fcR.value:null;
      if(wx){setWeather(wx);weatherRef.current=wx;}
      if(fc?.forecast?.length)setForecast(fc.forecast);
      setAllRoutes(routes);setLoadingRoutes(false);
      const primaryRoute = routes[0];
      const coords = primaryRoute.geometry.coordinates.map(([ln, la]) => [la, ln]);
      const adjDur = Math.round(primaryRoute.duration_min * vp.factor);
      setRouteCoords(coords);setRouteSegs(buildRouteSegments(coords));setDrivenIdx(0);
      setDirections(primaryRoute);setCurrentStep(0);
      setRouteInfo({ distance_km: primaryRoute.distance_km, duration_min: adjDur });
      setKmLeft(primaryRoute.distance_km);setEtaSec(adjDur * 60);setTripPct(0);setSelectedRouteIdx(0);
      if (mapRef.current && sGeo && dGeo) {
        try { mapRef.current.fitBounds([[sGeo.lat, sGeo.lon], [dGeo.lat, dGeo.lon]], { padding: [80, 80], animate: true }); } catch (_) {}
      }
      await calcRisk(sGeo.lat, sGeo.lon, vp.avg);
      const riskScores = [];
      for (const route of routes) {
        const coords2 = route.geometry.coordinates.map(([ln, la]) => [la, ln]);
        const p1 = coords2[Math.floor(coords2.length * 0.25)] || coords2[0];
        const p2 = coords2[Math.floor(coords2.length * 0.5)] || coords2[0];
        const p3 = coords2[Math.floor(coords2.length * 0.75)] || coords2[0];
        
        let totalScore = 0;
        let count = 0;
        for (const pt of [p1, p2, p3]) {
          try {
            const rp = buildRiskParams({ lat: pt[0], lon: pt[1], weather: wx, vehicle, currentSpeedKph: vp.avg, nearestLearnedHotspot: null });
            const { _meta, _vehicleKey, ...payload } = rp;
            const pred = await predictRisk(payload);
            let s = pred.score ?? pred.rf_boosted ?? 50;
            totalScore += s;
            count++;
          } catch (_) {}
        }
        riskScores.push(count > 0 ? Math.round(totalScore / count) : 50);
      }
      
      // Break ties for alternate routes to ensure visual distinction
      for (let i = 1; i < riskScores.length; i++) {
        if (riskScores[i] === riskScores[0]) {
          const distDiff = routes[i].distance_km - routes[0].distance_km;
          if (distDiff > 0) riskScores[i] += Math.min(5, Math.ceil(distDiff));
          else if (distDiff < 0) riskScores[i] -= Math.min(5, Math.ceil(-distDiff));
          else riskScores[i] += (i % 2 === 0 ? 2 : -2); // tie-breaker if even distance is same
        }
      }
      setRouteRiskScores(riskScores);
      const currentSc = scRef.current;
      const driverScore = Math.max(0, 100 - (currentSc > 70 ? 25 : currentSc > 40 ? 10 : 0));
      const { gm: updatedGM, pts } = awardTripPoints(currentSc, driverScore);
      const { gm: withBadges } = checkAndUnlockBadges(updatedGM);
      setPointsEarned(pts);setGMState(withBadges);
      try { saveSession({ driver_score: driverScore, risk_score: currentSc, trip_from: s, trip_to: d, distance_km: primaryRoute.distance_km, duration_min: adjDur, avg_speed: vp.avg, vehicle_type: vehicle }); } catch (_) {}
      if (currentSc >= 67) speak(`Warning! High risk route detected. Risk score ${currentSc} out of 100. Drive with extreme caution.`);
      else {
        speak(`Route to ${d.split(",")[0]}. ${adjDur} minutes. ${RL(currentSc)}. Starting navigation.`);
        if (primaryRoute?.steps?.[0]) setTimeout(() => speak(primaryRoute.steps[0].instruction), 2500);
      }
      if (routes.length > 1) toast(`${routes.length} routes found — tap Alternate Routes to compare`, "info");
      setLiveOn(true); setNavigating(true); setPanelMode("directions");
      if (riskTimerRef.current) clearInterval(riskTimerRef.current);
      riskTimerRef.current = setInterval(() => {
        setVehPos(p => { if (p) calcRiskRef.current?.(p[0], p[1]); return p; });
      }, 15000);
      setTimeout(() => { if (coords.length > 1) startAnim(coords, adjDur); }, 800);
    } catch(err) {
      console.error("Nav error:", err);
      toast(err.message || "Navigation error", "error");
    }
    setLoading(false);
  }, [source, dest, vehicle, toast, speak, startAnim, stopAnim, calcRisk]);

  const submitReport=async()=>{
    const center=userPos||vehPos||[31.1048,77.1734];
    const descOk=rptDesc.trim().length>=10;
    const photosOk=rptPhotos.length>0;
    if(!descOk&&!photosOk){setRptValidErr("Please add a description (at least 10 characters) or attach at least one photo.");return;}
    setRptValidErr("");
    const nearH = getNearestHotspot(center[0], center[1], 5000);
    const landmark = buildLandmark(center[0], center[1], nearH, source, dest);
    const road = buildRoad(directionsRef.current, currentStep, nearH);
    const enrichedDesc = rptDesc.trim().length >= 5
      ? rptDesc.trim()
      : `${rptType.charAt(0).toUpperCase() + rptType.slice(1)} reported near ${landmark}`;
    const expiresAt = new Date(Date.now() + 6 * 3600_000).toISOString();
    try{
      const reportPayload={
        type: rptType, lat: center[0], lon: center[1], description: enrichedDesc,
        severity: rptSev, photos: rptPhotos, injured: parseInt(rptInjured)||0,
        reporter: "IntelliCrash Driver", landmark, road,
        expires_at: expiresAt, status: "active", source: "navigation",
      };
      const savedReport=await addReport(reportPayload);
      const newReport = {id:savedReport?.id||Date.now(),...reportPayload,timestamp:new Date().toISOString()};
      rawReportsRef.current = [newReport, ...rawReportsRef.current];
      applyReportsFilter(rawReportsRef.current);
      if(rptType==="accident"||rptType==="hazard"){
        const result=await reportAccidentToHotspotLearner({lat:center[0],lon:center[1],severity:rptSev,fatal:rptFatal||rptInjured>2,description:enrichedDesc,source:"community"}).catch(()=>null);
        if(result?.alreadyReported){setRptCooldown(true);toast("📍 Location already reported recently — 30-min cooldown","info");setTimeout(()=>setRptCooldown(false),5000);}
        else if(result){getLearnedHotspots().then(h=>setLearnedHotspots(h)).catch(()=>{});if(result.is_hotspot)toast(`⚠️ Verified hotspot (score ${result.risk_score?.toFixed(0)}) — added to live map`,"warning");}
      }
      if(rptSev==="severe"){
        fetch("/api/sos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_name:"IntelliCrash Driver",lat:center[0],lon:center[1],address:`SEVERE ${rptType.toUpperCase()}: ${enrichedDesc.slice(0,120)}`,speed:0,weather:"0",roadType:"1",timeOfDay:"1",areaType:"0",vehicles:2,message:`SEVERE ${rptType.toUpperCase()} REPORTED\nDesc: ${enrichedDesc}\nInjured: ${rptInjured}\nFatal: ${rptFatal}`})}).catch(()=>{});
      }
      setGMState(withBadges);
      toast(`${rptType} reported! +20 pts`,"success");
      speak("Incident reported. Thank you for keeping HP roads safe.");
      // SYNC WITH BULLETIN
      window.dispatchEvent(new Event("intellicrash_new_report"));
      setRptDesc("");setRptPhotos([]);setRptFatal(false);setRptValidErr("");
      setPanelMode(navigating?"directions":"search");
    }catch(err){
      console.error("Report error:",err);
      const localReport = {id:Date.now(),type:rptType,lat:center[0],lon:center[1],description:enrichedDesc,severity:rptSev,photos:rptPhotos,injured:parseInt(rptInjured)||0,reporter:"IntelliCrash Driver",landmark,road,expires_at:new Date(Date.now()+6*3600_000).toISOString(),status:"active",source:"navigation",timestamp:new Date().toISOString()};
      rawReportsRef.current = [localReport, ...rawReportsRef.current];
      applyReportsFilter(rawReportsRef.current);
      toast("Saved locally — will sync when online","info");
      setRptDesc("");setRptPhotos([]);setRptFatal(false);setRptValidErr("");
      setPanelMode(navigating?"directions":"search");
    }
  };

  const handlePhoto=async(e)=>{
    try{const c=await compressImages(e.target.files,4,800,0.7);setRptPhotos(p=>[...p,...c].slice(0,4));}
    catch{const r=Array.from(e.target.files).map(f=>new Promise(res=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.readAsDataURL(f);}));Promise.all(r).then(u=>setRptPhotos(p=>[...p,...u].slice(0,4)));}
  };

  const tileUrl = {
    standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    topo:     "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    satellite:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  }[mapStyle] || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const RCOLORS={accident:"#dc2626",traffic:"#d97706",roadblock:"#2563eb",hazard:"#9333ea"};
  const RICONS ={accident:"💥",traffic:"🚦",roadblock:"🚧",hazard:"⚠️",contribution:"💬"};
  const ZONE_ICON={fog:"🌫️",bridge:"🌉",police:"👮",landslide:"⛰️",railway:"🚂"};
  const vp=VP[vehicle];const sc=riskScore??50;const stepClr=RC(sc);
  const vehIcon=useMemo(()=>vehPos?mkVehicleIcon(vehicle,vehHdg,sc,isMoving):null,[vehPos,vehHdg,vehicle,sc,isMoving]);
  const remainingCoords=routeCoords.length>0&&drivenIdx>0?routeCoords.slice(drivenIdx):routeCoords;
  const drivenCoords=routeCoords.length>0&&drivenIdx>0?routeCoords.slice(0,drivenIdx+1):[];
  const routeTolls=useMemo(()=>HP_TOLLS.filter(t=>routeCoords.some(([la,lo])=>hvDist([t.lat,t.lon],[la,lo])<5000)),[routeCoords]);

  const descOk=rptDesc.trim().length>=10;
  const hasPhoto=rptPhotos.length>0;
  const canSubmit=descOk||hasPhoto;

  const confirmedLearnedHotspots=useMemo(()=>learnedHotspots.filter(h=>h.is_hotspot),[learnedHotspots]);
  const altRouteColors = ["#2563eb","#9333ea","#0d9488"];
  const panelBorder = `1px solid ${T.border}`;

  if(!leafletReady)return(
    <Box sx={{display:"flex",alignItems:"center",justifyContent:"center",height:"calc(100vh - 70px)",flex:1,background:T.bg,flexDirection:"column",gap:2}}>
      <Box sx={{width:44,height:44,border:`3px solid rgba(0,0,0,0.08)`,borderTop:`3px solid ${T.orange}`,borderRadius:"50%",animation:"spin 0.8s linear infinite","@keyframes spin":{to:{transform:"rotate(360deg)"}}}}/>
      <Typography sx={{fontSize:13,color:T.textSub,fontFamily:"'DM Sans',sans-serif"}}>Loading Navigation…</Typography>
    </Box>
  );

  return(
    <Box sx={{display:"flex",flexDirection:{xs:"column",md:"row"},height:"calc(100vh - 70px)",flex:1,fontFamily:"'DM Sans',sans-serif",overflow:"hidden",position:"relative",background:T.bg}}>

      {showAmbulance && (
        <AmbulanceTracker
          patientPos={sosPatientPos}
          onClose={() => { setShowAmbulance(false); setSosPatientPos(null); }}
        />
      )}

      {/* ══ SIDE PANEL ══ */}
      <Box sx={{
        width:{xs:"100%",md:panelOpen?420:0},minWidth:{md:panelOpen?420:0},
        height:{xs:panelOpen?"60vh":54,md:"100%"},
        position:{xs:"absolute",md:"relative"},
        bottom:0,left:0,
        flexShrink:0,background:T.panel,
        boxShadow:{xs:"0 -4px 24px rgba(0,0,0,0.12)",md:"2px 0 24px rgba(0,0,0,0.06)"},
        display:"flex",flexDirection:"column",overflow:"hidden",zIndex:2000,
        transition:"all 0.3s ease",borderRadius:{xs:"20px 20px 0 0",md:0},
        borderRight:{md:panelBorder},borderTop:{xs:panelBorder,md:"none"},
      }}>
        <Box sx={{display:"flex",alignItems:"center",gap:1,px:2,py:1.4,borderBottom:panelBorder,flexShrink:0,background:"#fff"}}>
          <Box sx={{display:{xs:"flex",md:"none"},flex:1,flexDirection:"column",alignItems:"center",gap:0.5,cursor:"pointer"}} onClick={()=>setPanelOpen(o=>!o)}>
            <Box sx={{width:40,height:4,borderRadius:2,background:T.border}}/>
            {!panelOpen&&<Typography sx={{fontSize:12,fontWeight:700,color:RC(sc)}}>{RL(sc)} · {sc}/100</Typography>}
          </Box>
          <Box sx={{display:{xs:"none",md:"flex"},flex:1,alignItems:"center",gap:1}}>
            <Typography sx={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:T.text}}>🛡️ IntelliCrash</Typography>
            <Chip label={`${gm.points} pts`} size="small" sx={{background:"rgba(234,88,12,0.1)",color:T.orange,fontWeight:700,fontSize:10,height:18,border:"1px solid rgba(234,88,12,0.2)"}}/>
            {confirmedLearnedHotspots.length>0&&<Chip label={`${confirmedLearnedHotspots.length} verified`} size="small" sx={{background:"rgba(147,51,234,0.08)",color:"#7c3aed",fontWeight:700,fontSize:10,height:18}}/>}
            {navigating&&<Chip label="● LIVE" size="small" sx={{background:"rgba(22,163,74,0.1)",color:"#16a34a",fontWeight:700,fontSize:10,height:18,border:"1px solid rgba(22,163,74,0.2)"}}/>}
          </Box>
          <IconButton size="small" onClick={()=>setPanelOpen(o=>!o)} sx={{color:T.textSub}}>
            {panelOpen?<ChevronLeft/>:<ChevronRight/>}
          </IconButton>
        </Box>

        {panelOpen&&(
          <Box sx={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",background:T.bg,"&::-webkit-scrollbar":{width:"4px"},"&::-webkit-scrollbar-thumb":{background:"rgba(0,0,0,0.1)",borderRadius:"2px"}}}>

            {/* ══ SEARCH ══ */}
            {panelMode==="search"&&(
              <Box>
                <Box sx={{p:2,borderBottom:panelBorder,background:"#fff"}}>
                  <Box sx={{display:"flex",gap:1.5,alignItems:"center"}}>
                    <Box sx={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",py:"4px",flexShrink:0}}>
                      <Box sx={{width:10,height:10,borderRadius:"2px",border:`2.5px solid #16a34a`,background:"transparent",transform:"rotate(45deg)"}}/>
                      <Box sx={{width:2,height:24,background:`linear-gradient(#16a34a,#dc2626)`,borderRadius:1}}/>
                      <Box sx={{width:10,height:10,borderRadius:"50%",background:"#dc2626"}}/>
                    </Box>
                    <Box sx={{flex:1,display:"flex",flexDirection:"column",gap:0.8}}>
                      <PlaceInput value={source} onChange={setSource} placeholder="From — your location" isSource/>
                      <PlaceInput value={dest}   onChange={setDest}   placeholder="To — destination"    isSource={false}/>
                    </Box>
                    <Tooltip title="Swap"><IconButton size="small" onClick={()=>{const t=source;setSource(dest);setDest(t);setSrcGeoPos(dstGeoPos);setDstGeoPos(srcGeoPos);}} sx={{color:T.textSub,"&:hover":{color:T.orange}}}><SwapVert fontSize="small"/></IconButton></Tooltip>
                  </Box>
                  <Box sx={{display:"flex",gap:0.8,alignItems:"center",mt:1.5,flexWrap:"wrap"}}>
                    {Object.entries(VP).map(([k,v])=>(<Tooltip key={k} title={v.label} placement="top"><button onClick={()=>setVehicle(k)} style={{padding:"6px 10px",border:"1.5px solid",borderColor:vehicle===k?"rgba(234,88,12,0.6)":"rgba(0,0,0,0.1)",borderRadius:20,fontSize:16,cursor:"pointer",background:vehicle===k?"rgba(234,88,12,0.08)":"rgba(0,0,0,0.02)",transition:"all 0.15s",lineHeight:1}}>{v.icon}</button></Tooltip>))}
                    <button onClick={()=>runNavigation()} disabled={loading} style={{marginLeft:"auto",padding:"9px 22px",border:"none",borderRadius:24,background:loading?"rgba(0,0,0,0.06)":"linear-gradient(135deg,#ea580c,#dc2626)",color:loading?"rgba(0,0,0,0.3)":"#fff",fontWeight:700,fontSize:14,cursor:loading?"wait":"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:loading?"none":"0 4px 18px rgba(234,88,12,0.3)",transition:"all 0.2s"}}>{loading?"Loading…":`Go ${vp.icon}`}</button>
                  </Box>
                </Box>

                {riskCalcErr&&(<Box sx={{mx:2,my:1,p:1.4,background:"rgba(220,38,38,0.05)",border:"1px solid rgba(220,38,38,0.15)",borderRadius:2}}><Typography sx={{fontSize:12,color:"#dc2626",fontWeight:700}}>⚠️ ML Model Error</Typography><Typography sx={{fontSize:11,color:T.textSub,mt:0.3,wordBreak:"break-all"}}>{riskCalcErr}</Typography></Box>)}

                {riskScore!==null&&routeInfo&&(
                  <Box sx={{mx:2,my:2,p:2,background:RCL(sc),borderRadius:3,border:`1.5px solid ${RCB(sc)}`}}>
                    <Box sx={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",mb:1}}>
                      <Box>
                        <Box sx={{display:"flex",alignItems:"baseline",gap:0.5}}>
                          <Typography sx={{fontFamily:"'Syne',sans-serif",fontSize:36,fontWeight:900,color:RC(sc),lineHeight:1}}>{routeInfo.duration_min}</Typography>
                          <Typography sx={{fontSize:14,color:RC(sc),fontWeight:600}}>min</Typography>
                        </Box>
                        <Typography sx={{fontSize:11,color:T.textSub,mt:0.3}}>{routeInfo.distance_km} km · {vp.icon} {vp.label}</Typography>
                      </Box>
                      <Box sx={{textAlign:"right"}}>
                        <Chip label={RL(sc)} sx={{background:RC(sc),color:"#fff",fontWeight:800,fontSize:12,mb:0.5,height:24}}/>
                        <Box sx={{display:"flex",gap:0.5,justifyContent:"flex-end",mt:0.3}}>
                          {rfScore!==null&&<Chip label={`RF ${rfScore}`} size="small" sx={{height:16,fontSize:9,background:"rgba(37,99,235,0.1)",color:"#2563eb",fontWeight:700}}/>}
                          {lstmScore!==null&&<Chip label={`LSTM ${lstmScore}`} size="small" sx={{height:16,fontSize:9,background:"rgba(124,58,237,0.1)",color:"#7c3aed",fontWeight:700}}/>}
                          <Chip label={`${sc}/100`} size="small" sx={{height:16,fontSize:9,background:RC(sc),color:"#fff",fontWeight:800}}/>
                        </Box>
                      </Box>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(sc,100)} sx={{height:8,borderRadius:4,background:"rgba(0,0,0,0.08)",mb:1,"& .MuiLinearProgress-bar":{background:RC(sc),borderRadius:4}}}/>
                    {xaiText&&<Typography sx={{fontSize:11,color:T.textSub,mb:0.8,fontStyle:"italic"}}>🧠 {xaiText}</Typography>}
                    {routeTolls.length>0&&<Typography sx={{fontSize:11,color:T.textSub}}>💰 Tolls: ₹{routeTolls.reduce((s,t)=>s+(vehicle==="truck"?t.fee_truck:vehicle==="bike"?t.fee_bike:t.fee_car),0)}</Typography>}
                    <Box sx={{mt:1,p:1,background:"rgba(234,88,12,0.06)",borderRadius:1.5,border:"1px solid rgba(234,88,12,0.15)",display:"flex",alignItems:"center",gap:1}}>
                      <Typography sx={{fontSize:13,fontWeight:800,color:T.orange}}>+{pointsEarned} pts</Typography>
                      <Typography sx={{fontSize:11,color:T.textSub}}>earned for this trip</Typography>
                    </Box>
                  </Box>
                )}

                {allRoutes.length > 1 && (
                  <Box sx={{mx:2,mb:1.5}}>
                    <Typography sx={{fontSize:10,fontWeight:700,color:T.textSub,letterSpacing:0.8,mb:1,textTransform:"uppercase"}}>{allRoutes.length} Routes Found</Typography>
                    {allRoutes.map((route, idx) => {
                      const adjDur = Math.round(route.duration_min * (VP[vehicle]?.factor || 1));
                      const rs = routeRiskScores[idx] ?? 50;
                      const isSelected = idx === selectedRouteIdx;
                      return (
                        <Box key={idx} onClick={() => selectRoute(idx)} sx={{p:1.5,mb:0.8,borderRadius:2.5,cursor:"pointer",border:`2px solid ${isSelected ? altRouteColors[idx % altRouteColors.length] : T.border}`,background:isSelected?"#fff":T.card,boxShadow:isSelected?"0 2px 12px rgba(0,0,0,0.08)":"none",transition:"all 0.18s","&:hover":{background:"#fff",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}}>
                          <Box sx={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <Box sx={{display:"flex",alignItems:"center",gap:1}}>
                              <Box sx={{width:12,height:12,borderRadius:"50%",background:altRouteColors[idx%altRouteColors.length]}}/>
                              <Typography sx={{fontWeight:700,fontSize:13,color:T.text}}>{idx === 0 ? "Fastest Route" : idx === 1 ? "Alternate Route" : `Route ${idx+1}`}</Typography>
                              {isSelected && <Chip label="Selected" size="small" sx={{height:16,fontSize:9,background:altRouteColors[idx%altRouteColors.length],color:"#fff",fontWeight:700}}/>}
                            </Box>
                            <Chip label={RL(rs)} size="small" sx={{height:18,fontSize:9,background:RC(rs),color:"#fff",fontWeight:700}}/>
                          </Box>
                          <Box sx={{display:"flex",gap:2,mt:0.5}}>
                            <Typography sx={{fontSize:12,color:T.textSub}}>⏱ {adjDur} min</Typography>
                            <Typography sx={{fontSize:12,color:T.textSub}}>📍 {route.distance_km} km</Typography>
                            <Typography sx={{fontSize:12,fontWeight:700,color:RC(rs)}}>Risk {rs}/100</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {navigating&&kmLeft!==null&&(<Box sx={{mx:2,mb:1.5,p:1.2,background:"#fff",borderRadius:2,border:`1px solid ${T.border}`,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:"flex"}}>{[[fmtD((kmLeft||0)*1000),"remaining","#dc2626"],[etaSec?fmtT(etaSec):"--","ETA",T.orange],[`${Math.round(tripPct)}%`,"done","#16a34a"]].map(([val,lbl,clr],i)=>(<Box key={i} sx={{flex:1,textAlign:"center",borderRight:i<2?`1px solid ${T.border}`:"none",px:1}}><Typography sx={{fontSize:17,fontWeight:900,color:clr,lineHeight:1}}>{val}</Typography><Typography sx={{fontSize:10,color:T.textSub}}>{lbl}</Typography></Box>))}</Box>)}
                {alerts.length>0&&(<Box sx={{mx:2,mb:1.5,p:1.2,background:"rgba(220,38,38,0.04)",border:"1px solid rgba(220,38,38,0.12)",borderRadius:2}}>{alerts.map((a,i)=><Typography key={i} sx={{fontSize:12,color:"#dc2626",lineHeight:1.6}}>→ {a}</Typography>)}</Box>)}
                {nearZone&&(<Box sx={{mx:2,mb:1.5,p:1.2,background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.15)",borderRadius:2,display:"flex",gap:1,alignItems:"center"}}><Typography sx={{fontSize:16}}>{ZONE_ICON[nearZone.type]||"⚠️"}</Typography><Box><Typography sx={{fontSize:12,fontWeight:700,color:"#2563eb"}}>{nearZone.name}</Typography><Typography sx={{fontSize:11,color:T.textSub}}>{nearZone.warn}</Typography></Box></Box>)}

                <Box sx={{px:2,pb:1,display:"flex",gap:0.8,flexWrap:"wrap"}}>
                  {navigating&&<button onClick={()=>setPanelMode("directions")} style={{flex:1,padding:"7px 4px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",border:`1px solid rgba(234,88,12,0.2)`,background:"rgba(234,88,12,0.06)",color:T.orange,fontFamily:"'DM Sans',sans-serif"}}>🧭 Directions</button>}
                  {allRoutes.length > 1 && <button onClick={()=>setPanelMode("routes")} style={{flex:1,padding:"7px 4px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",border:`1px solid rgba(37,99,235,0.2)`,background:"rgba(37,99,235,0.05)",color:"#2563eb",fontFamily:"'DM Sans',sans-serif"}}>🔀 Routes</button>}
                  {[["📡 Report",()=>setPanelMode("report"),"#dc2626"],["🗺️ Layers",()=>setPanelMode("layers"),T.orange],["📋 Info",()=>setPanelMode("info"),"#16a34a"]].map(([lbl,fn,clr])=>(<button key={lbl} onClick={fn} style={{flex:1,padding:"7px 4px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",border:`1px solid ${clr}22`,background:`${clr}08`,color:clr,fontFamily:"'DM Sans',sans-serif"}}>{lbl}</button>))}
                </Box>

                <Divider sx={{borderColor:T.border}}/>
                <Box sx={{px:2,pt:1,pb:0.5,background:"#fff"}}><Typography sx={{fontSize:10,fontWeight:700,color:T.textSub,letterSpacing:0.8}}>RECENT REPORTS</Typography></Box>
                {reports.slice(0,3).map((r,i)=>(<Box key={r.id||i} sx={{mx:2,mb:0.8,p:1,display:"flex",gap:1,background:"#fff",borderRadius:2,border:`1px solid ${T.border}`,alignItems:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}><Typography sx={{fontSize:14}}>{RICONS[r.type]||"⚠️"}</Typography><Box sx={{flex:1,minWidth:0}}><Typography sx={{fontSize:12,fontWeight:600,textTransform:"capitalize",color:T.text}}>{r.type}</Typography><Typography sx={{fontSize:11,color:T.textSub}} noWrap>{r.description?.slice(0,40)||r.timestamp?.slice(0,16)}</Typography></Box>{r.severity&&<Chip label={r.severity} size="small" sx={{height:16,fontSize:9,background:r.severity==="severe"?"rgba(220,38,38,0.1)":"rgba(217,119,6,0.1)",color:r.severity==="severe"?"#dc2626":"#d97706"}}/>}</Box>))}

              </Box>
            )}

            {/* ══ ALTERNATE ROUTES PANEL ══ */}
            {panelMode==="routes"&&(
              <Box sx={{p:2}}>
                <Box sx={{display:"flex",alignItems:"center",mb:2}}>
                  <button onClick={()=>setPanelMode("search")} style={{background:"none",border:"none",cursor:"pointer",color:T.orange,fontSize:13,fontWeight:700}}>← Back</button>
                  <Typography sx={{fontWeight:700,ml:1,color:T.text,fontSize:14}}>🔀 Compare Routes</Typography>
                </Box>
                {loadingRoutes && (<Box sx={{textAlign:"center",py:4}}><CircularProgress size={28} sx={{color:T.orange}}/><Typography sx={{fontSize:13,color:T.textSub,mt:1}}>Calculating alternate routes…</Typography></Box>)}
                {!loadingRoutes && allRoutes.map((route, idx) => {
                  const adjDur = Math.round(route.duration_min * (VP[vehicle]?.factor || 1));
                  const rs = routeRiskScores[idx] ?? 50;
                  const isSelected = idx === selectedRouteIdx;
                  const color = altRouteColors[idx % altRouteColors.length];
                  return (
                    <Box key={idx} sx={{mb:1.5,p:2,borderRadius:3,border:`2px solid ${isSelected ? color : T.border}`,background:isSelected?"#fff":T.card,boxShadow:isSelected?"0 4px 16px rgba(0,0,0,0.08)":"none",transition:"all 0.2s"}}>
                      <Box sx={{display:"flex",alignItems:"center",justifyContent:"space-between",mb:1}}>
                        <Box sx={{display:"flex",alignItems:"center",gap:1}}>
                          <Box sx={{width:14,height:14,borderRadius:"50%",background:color,border:"2px solid #fff",boxShadow:`0 0 0 2px ${color}`}}/>
                          <Typography sx={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:T.text}}>{idx === 0 ? "⚡ Fastest" : idx === 1 ? "🔀 Alternate" : `Route ${idx + 1}`}</Typography>
                        </Box>
                        <Chip label={RL(rs)} sx={{background:RC(rs),color:"#fff",fontWeight:800,fontSize:11,height:22}}/>
                      </Box>
                      <Box sx={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:1,mb:1.5}}>
                        {[["⏱ Time",`${adjDur} min`],["📍 Distance",`${route.distance_km} km`],["⚠️ Risk",`${rs}/100`]].map(([label,val])=>(
                          <Box key={label} sx={{textAlign:"center",p:0.8,background:T.bg,borderRadius:2}}><Typography sx={{fontSize:10,color:T.textSub,mb:0.2}}>{label}</Typography><Typography sx={{fontSize:13,fontWeight:700,color:T.text}}>{val}</Typography></Box>
                        ))}
                      </Box>
                      <LinearProgress variant="determinate" value={Math.min(rs,100)} sx={{height:6,borderRadius:3,background:"rgba(0,0,0,0.08)",mb:1.5,"& .MuiLinearProgress-bar":{background:RC(rs),borderRadius:3}}}/>
                      <button onClick={()=>{selectRoute(idx);setPanelMode(navigating?"directions":"search");setNavigating(true);if(allRoutes[idx]){const coords=allRoutes[idx].geometry.coordinates.map(([ln,la])=>[la,ln]);setTimeout(()=>startAnim(coords,adjDur),400);}}} style={{width:"100%",padding:"10px",border:`2px solid ${color}`,borderRadius:8,background:isSelected?color:"#fff",color:isSelected?"#fff":color,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s"}}>
                        {isSelected ? "✓ Currently Selected" : `Use This Route`}
                      </button>
                    </Box>
                  );
                })}
                {!loadingRoutes && allRoutes.length === 0 && (<Box sx={{textAlign:"center",py:4}}><Typography sx={{fontSize:13,color:T.textSub}}>No routes calculated yet. Enter source & destination first.</Typography></Box>)}
              </Box>
            )}

            {/* ══ DIRECTIONS ══ */}
            {panelMode==="directions"&&(
              <Box sx={{flex:1,display:"flex",flexDirection:"column"}}>
                {/* ── Directions header with voice + Hindi toggles ─────── */}
                <Box sx={{px:2,py:1.4,display:"flex",alignItems:"center",gap:1,borderBottom:panelBorder,flexShrink:0,background:"#fff"}}>
                  <button onClick={()=>setPanelMode("search")} style={{background:"none",border:"none",cursor:"pointer",color:T.orange,fontSize:13,fontWeight:700}}>← Back</button>
                  <Typography sx={{fontWeight:700,fontSize:13,flex:1,color:T.text}}>Turn-by-Turn · {vp.icon} {vp.label}</Typography>

                  {/* ✅ English voice toggle */}
                  <button
                    onClick={()=>setVoiceOn(v=>!v)}
                    title={voiceOn?"Mute English voice":"Enable English voice"}
                    style={{
                      background:voiceOn?"rgba(234,88,12,0.08)":"rgba(0,0,0,0.04)",
                      border:voiceOn?"1px solid rgba(234,88,12,0.25)":"1px solid rgba(0,0,0,0.08)",
                      borderRadius:20,padding:"4px 10px",cursor:"pointer",fontSize:11,
                      color:voiceOn?T.orange:T.textSub,fontFamily:"'DM Sans',sans-serif",
                    }}>
                    {voiceOn?"🔊 EN":"🔇"}
                  </button>

                  {/* ✅ NEW: Hindi voice toggle */}
                  {/* ✅ Hindi Active Badge */}
                  {hindiOn && (
                    <Box sx={{
                      mb: 1.5, p: 1, background: "rgba(22,163,74,0.1)", borderRadius: 2, 
                      display: "flex", alignItems: "center", gap: 1, border: "1px solid rgba(22,163,74,0.2)"
                    }}>
                      <Typography sx={{fontSize:16}}>🔊</Typography>
                      <Box>
                        <Typography sx={{fontSize:11,fontWeight:800,color:T.green}}>HINDI VOICE ACTIVE</Typography>
                        <Typography sx={{fontSize:10,color:T.textSub}}>Multi-lingual navigation engaged</Typography>
                      </Box>
                    </Box>
                  )}

                  <button
                    onClick={()=>setHindiOn(h=>!h)}

                    title={hindiOn?"Disable Hindi voice":"Enable Hindi voice (हिंदी)"}
                    style={{
                      background:hindiOn?"rgba(37,99,235,0.10)":"rgba(0,0,0,0.04)",
                      border:hindiOn?"1px solid rgba(37,99,235,0.3)":"1px solid rgba(0,0,0,0.08)",
                      borderRadius:20,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700,
                      color:hindiOn?"#2563eb":T.textSub,fontFamily:"'DM Sans',sans-serif",
                      transition:"all .15s",
                    }}>
                    {hindiOn?"🔊 हिंदी":"हिंदी"}
                  </button>
                </Box>

                {/* ✅ Hindi active indicator banner */}
                {hindiOn && (
                  <Box sx={{px:2,py:0.8,background:"rgba(37,99,235,0.05)",borderBottom:`1px solid rgba(37,99,235,0.12)`,display:"flex",alignItems:"center",gap:1,flexShrink:0}}>
                    <Box sx={{width:7,height:7,borderRadius:"50%",background:"#2563eb",animation:"blink 1.5s infinite","@keyframes blink":{"0%,100%":{opacity:1},"50%":{opacity:0.3}}}}/>
                    <Typography sx={{fontSize:11,fontWeight:600,color:"#2563eb"}}>
                      हिंदी आवाज़ सक्रिय — Hindi voice active
                    </Typography>
                  </Box>
                )}

                {navigating&&(<Box sx={{px:2,py:1,background:"rgba(0,0,0,0.02)",borderBottom:panelBorder,flexShrink:0}}>
                  <LinearProgress variant="determinate" value={tripPct} sx={{height:6,borderRadius:3,background:"rgba(0,0,0,0.08)","& .MuiLinearProgress-bar":{background:RC(sc),borderRadius:3,transition:"width 0.5s ease"}}}/>
                  <Box sx={{display:"flex",justifyContent:"space-between",mt:0.5}}>
                    <Typography sx={{fontSize:10,color:T.textSub}}>{fmtD((kmLeft||0)*1000)} left</Typography>
                    <Typography sx={{fontSize:10,fontWeight:700,color:RC(sc)}}>{RL(sc)} · {sc}/100</Typography>
                    <Typography sx={{fontSize:10,color:T.textSub}}>{etaSec?fmtT(etaSec):"--"} ETA</Typography>
                  </Box>
                </Box>)}
                <Box sx={{flex:1,overflowY:"auto",background:T.bg}}>
                  {!directions?.steps?.length?(
                    <Box sx={{textAlign:"center",py:5}}>
                      <Typography sx={{fontSize:13,color:T.textSub,mb:2}}>No route yet</Typography>
                      <button onClick={()=>setPanelMode("search")} style={{padding:"8px 20px",border:"none",borderRadius:20,background:"linear-gradient(135deg,#ea580c,#dc2626)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>← Enter Route</button>
                    </Box>
                  ):(
                    <>
                      <Box sx={{m:1.5,p:1.8,background:stepClr,borderRadius:3,color:"#fff",boxShadow:`0 6px 24px ${stepClr}44`}}>
                        <Box sx={{display:"flex",alignItems:"center",gap:1.5,mb:0.5}}>
                          <Box sx={{fontSize:26,lineHeight:1}}><TurnArrow type={directions.steps[currentStep]?.type} modifier={directions.steps[currentStep]?.modifier}/></Box>
                          <Box sx={{flex:1}}>
                            <Typography sx={{fontWeight:800,fontSize:15,lineHeight:1.3}}>
                              {directions.steps[currentStep]?.instruction||"Follow the route"}
                            </Typography>
                            {/* ✅ Hindi translation shown in card when hindiOn */}
                            {hindiOn && directions.steps[currentStep]?.instruction && (
                              <Typography sx={{fontSize:12,opacity:0.85,mt:0.3,fontStyle:"italic"}}>
                                {translateToHindi(directions.steps[currentStep].instruction)}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Typography sx={{fontSize:11,opacity:0.85}}>in {fmtD(directions.steps[currentStep]?.distance_m||0)} · Step {currentStep+1}/{directions.steps.length}</Typography>
                      </Box>
                      {directions.steps.map((step,i)=>(<Box key={i} onClick={()=>{setCurrentStep(i);speak(step.instruction);}} sx={{display:"flex",gap:1.5,px:2,py:1.1,cursor:"pointer",background:i===currentStep?"rgba(234,88,12,0.05)":"transparent","&:hover":{background:"rgba(0,0,0,0.02)"},borderBottom:`1px solid ${T.border}`}}>
                        <Box sx={{width:30,height:30,borderRadius:"50%",flexShrink:0,background:i===currentStep?T.orange:"rgba(0,0,0,0.06)",display:"flex",alignItems:"center",justifyContent:"center",color:i===currentStep?"#fff":T.textSub,fontSize:14}}><TurnArrow type={step.type} modifier={step.modifier}/></Box>
                        <Box sx={{flex:1}}>
                          <Typography sx={{fontSize:13,fontWeight:i===currentStep?700:400,color:i===currentStep?T.text:T.textSub,lineHeight:1.4}}>{step.instruction}</Typography>
                          {/* Hindi sub-label in step list */}
                          {hindiOn && (
                            <Typography sx={{fontSize:11,color:"#2563eb",opacity:0.75}}>
                              {translateToHindi(step.instruction)}
                            </Typography>
                          )}
                          <Typography sx={{fontSize:11,color:T.textSub}}>{fmtD(step.distance_m||0)}</Typography>
                        </Box>
                      </Box>))}
                      <Box sx={{display:"flex",gap:1,p:2}}>
                        <button onClick={()=>setCurrentStep(Math.max(0,currentStep-1))} style={{flex:1,padding:"9px",borderRadius:8,border:`1px solid ${T.border}`,background:"#fff",cursor:"pointer",fontSize:12,color:T.textSub,fontFamily:"'DM Sans',sans-serif"}}>← Prev</button>
                        <button onClick={()=>{const n=Math.min(directions.steps.length-1,currentStep+1);setCurrentStep(n);speak(directions.steps[n]?.instruction||"");}} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#ea580c,#dc2626)",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>Next →</button>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            )}

            {/* ══ REPORT PANEL ══ */}
            {panelMode==="report"&&(
              <Box sx={{p:2,background:T.bg}}>
                <Box sx={{display:"flex",alignItems:"center",mb:2}}>
                  <button onClick={()=>{setPanelMode(navigating?"directions":"search");setRptValidErr("");}} style={{background:"none",border:"none",cursor:"pointer",color:T.orange,fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>← Back</button>
                  <Typography sx={{fontWeight:700,ml:1,color:T.text,fontSize:14}}>📡 Report Incident</Typography>
                </Box>
                {rptCooldown&&(<Box sx={{mb:1.5,p:1.2,background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.15)",borderRadius:8,display:"flex",gap:1,alignItems:"center"}}><Typography sx={{fontSize:13}}>⏳</Typography><Typography sx={{fontSize:12,color:"#2563eb"}}>Already reported nearby (30-min cooldown)</Typography></Box>)}
                {(userPos||vehPos)&&(<Box sx={{mb:1.5,display:"flex",alignItems:"center",gap:1,px:1.5,py:0.8,background:"rgba(22,163,74,0.06)",border:"1px solid rgba(22,163,74,0.15)",borderRadius:20}}><Box sx={{width:7,height:7,borderRadius:"50%",background:"#16a34a",flexShrink:0}}/><Typography sx={{fontSize:11,color:"#16a34a",fontWeight:600}}>📍 GPS locked: {((userPos||vehPos)?.[0]||0).toFixed(4)}, {((userPos||vehPos)?.[1]||0).toFixed(4)}</Typography></Box>)}
                <Box sx={{display:"flex",gap:0.8,mb:1.5,flexWrap:"wrap"}}>
                  {[["accident","💥 Accident"],["traffic","🚦 Traffic"],["roadblock","🚧 Block"],["hazard","⚠️ Hazard"]].map(([v,lbl])=>(
                    <button key={v} onClick={()=>setRptType(v)} style={{flex:"1 1 80px",padding:"8px 4px",border:`1.5px solid ${rptType===v?(RCOLORS[v]||T.orange):"rgba(0,0,0,0.1)"}`,borderRadius:8,background:rptType===v?`${RCOLORS[v]||T.orange}08`:"#fff",color:rptType===v?(RCOLORS[v]||T.orange):T.textSub,fontSize:12,fontWeight:rptType===v?700:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all .15s"}}>{lbl}</button>
                  ))}
                </Box>
                <Box sx={{display:"flex",gap:0.8,mb:1.5}}>
                  {[["minor","Minor","#16a34a"],["moderate","Moderate","#d97706"],["severe","Severe ⚠️","#dc2626"]].map(([v,lbl,clr])=>(
                    <button key={v} onClick={()=>setRptSev(v)} style={{flex:1,padding:"7px",border:`1.5px solid ${rptSev===v?clr:"rgba(0,0,0,0.1)"}`,borderRadius:8,background:rptSev===v?`${clr}08`:"#fff",color:rptSev===v?clr:T.textSub,fontSize:12,fontWeight:rptSev===v?700:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{lbl}</button>
                  ))}
                </Box>
                {rptType==="accident"&&(
                  <Box sx={{display:"flex",alignItems:"center",gap:1.5,mb:1.5,p:1.2,background:"rgba(220,38,38,0.04)",border:"1px solid rgba(220,38,38,0.1)",borderRadius:10}}>
                    <Typography sx={{fontSize:12,fontWeight:600,color:T.text}}>🤕 Injured:</Typography>
                    <input type="number" min="0" max="100" value={rptInjured} onChange={e=>setRptInjured(Math.max(0,parseInt(e.target.value)||0))} style={{width:60,border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 8px",fontSize:13,outline:"none",textAlign:"center",background:"#fff",color:T.text,fontFamily:"'DM Sans',sans-serif"}}/>
                    <Typography sx={{fontSize:11,color:T.textSub}}>people</Typography>
                    <Box sx={{display:"flex",alignItems:"center",gap:0.5,ml:"auto"}}>
                      <input type="checkbox" id="fatal-cb" checked={rptFatal} onChange={e=>setRptFatal(e.target.checked)} style={{cursor:"pointer",accentColor:"#dc2626"}}/>
                      <label htmlFor="fatal-cb" style={{fontSize:12,color:"#dc2626",cursor:"pointer",userSelect:"none",fontWeight:600}}>Fatal</label>
                    </Box>
                  </Box>
                )}
                <Box sx={{mb:1.2}}>
                  <Box sx={{display:"flex",justifyContent:"space-between",mb:0.5}}>
                    <Typography sx={{fontSize:10,fontWeight:700,color:T.textSub,textTransform:"uppercase",letterSpacing:"0.06em"}}>Description {!hasPhoto&&<span style={{color:"#dc2626"}}>*</span>}</Typography>
                    <Typography sx={{fontSize:10,color:descOk?"#16a34a":rptDesc.length>0?"#d97706":T.textSub}}>{rptDesc.trim().length} {descOk?"✓":"/ 10 min"}</Typography>
                  </Box>
                  <textarea value={rptDesc} onChange={e=>{setRptDesc(e.target.value);if(rptValidErr)setRptValidErr("");}} placeholder={`Describe the ${rptType} — location, severity, road condition`} rows={3} style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${rptValidErr&&!descOk?"#dc2626":descOk?"#16a34a":T.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,fontFamily:"'DM Sans',sans-serif",resize:"none",outline:"none",background:"#fff",color:T.text,transition:"border-color .15s"}}/>
                </Box>
                <Box sx={{mb:1.5}}>
                  <Typography sx={{fontSize:10,fontWeight:700,color:T.textSub,textTransform:"uppercase",letterSpacing:"0.06em",mb:0.8}}>📷 Photos {!descOk&&<span style={{color:"#dc2626"}}>*</span>}</Typography>
                  <Box sx={{display:"flex",gap:1,flexWrap:"wrap",alignItems:"center"}}>
                    {rptPhotos.map((p,i)=>(<Box key={i} sx={{position:"relative"}}><img src={p} alt="" style={{width:58,height:58,objectFit:"cover",borderRadius:9,border:"2px solid #16a34a",display:"block"}}/><button onClick={()=>setRptPhotos(ps=>ps.filter((_,j)=>j!==i))} style={{position:"absolute",top:-6,right:-6,background:"#dc2626",border:"2px solid #fff",borderRadius:"50%",width:20,height:20,color:"#fff",fontSize:11,cursor:"pointer",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></Box>))}
                    {rptPhotos.length<4&&(<button onClick={()=>fileRef.current?.click()} style={{width:58,height:58,border:`2px dashed ${hasPhoto?"rgba(22,163,74,0.4)":"rgba(234,88,12,0.3)"}`,borderRadius:9,background:hasPhoto?"rgba(22,163,74,0.04)":"rgba(234,88,12,0.03)",cursor:"pointer",fontSize:22,color:hasPhoto?"#16a34a":T.orange,display:"flex",alignItems:"center",justifyContent:"center"}} title="Add photo">📷</button>)}
                    <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handlePhoto}/>
                  </Box>
                </Box>
                {rptValidErr&&(<Box sx={{mb:1.5,p:1.2,background:"rgba(220,38,38,0.05)",border:"1px solid rgba(220,38,38,0.15)",borderRadius:9,display:"flex",gap:1,alignItems:"flex-start"}}><span style={{fontSize:14,flexShrink:0}}>❌</span><Typography sx={{fontSize:12,color:"#dc2626",lineHeight:1.5}}>{rptValidErr}</Typography></Box>)}
                <button onClick={submitReport} disabled={!canSubmit} style={{width:"100%",padding:"13px",border:"none",borderRadius:10,background:canSubmit?"linear-gradient(135deg,#ea580c,#dc2626)":"rgba(0,0,0,0.06)",color:canSubmit?"#fff":"rgba(0,0,0,0.3)",fontSize:14,fontWeight:700,cursor:canSubmit?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif",boxShadow:canSubmit?"0 4px 18px rgba(234,88,12,0.25)":"none",transition:"all .2s"}}>
                  {canSubmit?"Submit Report (+20 pts)":"Add description or photo to enable reporting"}
                </button>
                <Box sx={{my:2,height:1,background:T.border}}/>
                <Box sx={{p:1.8,background:"rgba(22,163,74,0.04)",border:"1px solid rgba(22,163,74,0.12)",borderRadius:12}}>
                  <Typography sx={{fontSize:12,fontWeight:700,color:"#16a34a",mb:0.5}}>📋 Need to add more detail?</Typography>
                  <Typography sx={{fontSize:11,color:T.textSub,mb:1.2,lineHeight:1.7}}>Use our detailed form to include vehicle numbers, witness info, or request official action.</Typography>
                  <a href={GOOGLE_FORM_URL} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:20,background:"#16a34a",color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none",fontFamily:"'DM Sans',sans-serif"}}>📝 Open Detailed Report Form →</a>
                </Box>
              </Box>
            )}

            {/* ══ LAYERS ══ */}
            {panelMode==="layers"&&(
              <Box sx={{p:2,background:T.bg}}>
                <Box sx={{display:"flex",alignItems:"center",mb:2}}><button onClick={()=>setPanelMode("search")} style={{background:"none",border:"none",cursor:"pointer",color:T.orange,fontSize:13,fontWeight:700}}>← Back</button><Typography sx={{fontWeight:700,ml:1,color:T.text}}>🗺️ Layers & Style</Typography></Box>
                <Typography sx={{fontSize:10,fontWeight:700,color:T.textSub,letterSpacing:0.8,mb:1}}>MAP STYLE</Typography>
                <Box sx={{display:"flex",gap:0.8,mb:2}}>{[["standard","🗺️ Standard"],["topo","⛰️ Topo"],["satellite","🛰️ Satellite"]].map(([k,lbl])=>(<button key={k} onClick={()=>setMapStyle(k)} style={{flex:1,padding:"7px 4px",border:`1.5px solid ${mapStyle===k?T.orange:T.border}`,borderRadius:8,background:mapStyle===k?"rgba(234,88,12,0.06)":"#fff",color:mapStyle===k?T.orange:T.textSub,fontSize:12,fontWeight:mapStyle===k?700:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{lbl}</button>))}</Box>

                {/* ✅ Voice Settings section in Layers panel */}
                <Divider sx={{mb:1.5,borderColor:T.border}}/>
                <Typography sx={{fontSize:10,fontWeight:700,color:T.textSub,letterSpacing:0.8,mb:1}}>🔊 VOICE SETTINGS</Typography>
                {[
                  ["🔊 English Voice", voiceOn, setVoiceOn, "en-IN navigation instructions"],
                  ["🔊 हिंदी Voice", hindiOn, setHindiOn, "Hindi translation after each instruction"],
                ].map(([lbl, val, setter, desc])=>(
                  <Box key={lbl} sx={{display:"flex",justifyContent:"space-between",alignItems:"center",py:1.4,borderBottom:`1px solid ${T.border}`}}>
                    <Box>
                      <Typography sx={{fontSize:13,color:T.text}}>{lbl}</Typography>
                      <Typography sx={{fontSize:10,color:T.textSub}}>{desc}</Typography>
                    </Box>
                    <Box onClick={()=>setter(!val)} sx={{width:42,height:24,borderRadius:12,background:val?T.orange:"rgba(0,0,0,0.1)",position:"relative",cursor:"pointer",transition:"background 0.2s",boxShadow:val?`0 0 8px rgba(234,88,12,0.3)`:"none"}}><Box sx={{position:"absolute",top:4,left:val?22:4,width:16,height:16,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"left 0.2s"}}/></Box>
                  </Box>
                ))}

                <Divider sx={{mb:1.5,mt:1.5,borderColor:T.border}}/>
                <Typography sx={{fontSize:10,fontWeight:700,color:T.textSub,letterSpacing:0.8,mb:1}}>OVERLAYS</Typography>
                {[["⚠️ iRAD Hotspots 2025-26",showHS,setShowHS],[`🧠 Verified Adaptive (${confirmedLearnedHotspots.length})`,showLearned,setShowLearned],["🌫️ Fog/Bridge/Slide Zones",showZones,setShowZones],["📷 Speed Cameras/Nakas",showCams,setShowCams],["🛣️ Toll Booths",showTolls,setShowTolls],["⛰️ Mountain Passes",showPasses,setShowPasses],["💥 Incident Reports",showReports,setShowReports]].map(([lbl,val,setter])=>(<Box key={lbl} sx={{display:"flex",justifyContent:"space-between",alignItems:"center",py:1.4,borderBottom:`1px solid ${T.border}`}}><Typography sx={{fontSize:13,color:T.text}}>{lbl}</Typography><Box onClick={()=>setter(!val)} sx={{width:42,height:24,borderRadius:12,background:val?T.orange:"rgba(0,0,0,0.1)",position:"relative",cursor:"pointer",transition:"background 0.2s",boxShadow:val?`0 0 8px rgba(234,88,12,0.3)`:"none"}}><Box sx={{position:"absolute",top:4,left:val?22:4,width:16,height:16,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"left 0.2s"}}/></Box></Box>))}
              </Box>
            )}

            {/* ══ INFO ══ */}
            {panelMode==="info"&&(
              <Box sx={{p:2,background:T.bg}}>
                <Box sx={{display:"flex",alignItems:"center",mb:2}}><button onClick={()=>setPanelMode("search")} style={{background:"none",border:"none",cursor:"pointer",color:T.orange,fontSize:13,fontWeight:700}}>← Back</button><Typography sx={{fontWeight:700,ml:1,color:T.text}}>📋 Trip Info</Typography></Box>
                {weather&&(<Box sx={{mb:1.5,p:1.2,background:"#fff",borderRadius:2,border:`1px solid ${T.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}><Typography sx={{fontSize:10,fontWeight:700,color:T.textSub,mb:0.8,letterSpacing:0.5}}>🌤️ WEATHER</Typography><Box sx={{display:"flex",gap:1,flexWrap:"wrap"}}>{[`${weather.temp_c}°C`,weather.description,`💨 ${weather.wind_kph}km/h`,weather.rain?"🌧️ Rain":null,weather.snow?"❄️ Snow":null,weather.fog?"🌫️ Fog":null].filter(Boolean).map((v,i)=>(<Chip key={i} label={v} size="small" sx={{fontSize:11,height:20,background:"rgba(0,0,0,0.06)",color:T.text}}/>))}</Box></Box>)}
                {forecast?.length>0&&(<Box sx={{mb:1.5,p:1.2,background:"#fff",borderRadius:2,border:`1px solid ${T.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}><Typography sx={{fontSize:10,fontWeight:700,color:T.textSub,mb:1,letterSpacing:0.5}}>📅 3-DAY FORECAST</Typography>{forecast.slice(0,3).map((d,i)=>(<Box key={i} sx={{display:"flex",justifyContent:"space-between",py:0.6,borderBottom:i<2?`1px solid ${T.border}`:"none"}}><Typography sx={{fontSize:12,fontWeight:500,color:T.text}}>{new Date(d.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric"})}</Typography><Box sx={{textAlign:"right"}}><Typography sx={{fontSize:11,color:T.textSub}}>{d.description} · {d.temp_min}°–{d.temp_max}°C</Typography><Typography sx={{fontSize:10,color:d.risk_boost>=22?"#dc2626":d.risk_boost>=10?"#d97706":"#16a34a",fontWeight:700}}>{d.drive_advice}</Typography></Box></Box>))}</Box>)}
                {routeInfo&&(<Box sx={{p:1.2,background:"#fff",borderRadius:2,border:`1px solid ${T.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}><Typography sx={{fontSize:10,fontWeight:700,color:T.textSub,mb:0.8,letterSpacing:0.5}}>🚗 ROUTE SUMMARY</Typography>{[["Distance",`${routeInfo.distance_km} km`],["Est. Time",`${routeInfo.duration_min} min`],["Vehicle",`${vp.icon} ${vp.label}`],["Avg Speed",`${vp.avg} km/h`],["RF Score",`${rfScore??"-"}/100`],["LSTM Score",`${lstmScore??"-"}/100`],["Ensemble",`${sc}/100 (${RL(sc)})`],["Trip Points",`+${pointsEarned} pts`],["iRAD Dataset","2025-26 HP (38 hotspots)"],["Model","RF + LSTM Ensemble + XAI"],["Adaptive","v3 — decay+dedup+cooldown"],["Routes Found",`${allRoutes.length} (${allRoutes.length > 1 ? "alternates available" : "single route"})`],["Voice",`English ${voiceOn?"ON":"OFF"} · Hindi ${hindiOn?"ON":"OFF"}`]].map(([k,v])=>(<Box key={k} sx={{display:"flex",justifyContent:"space-between",py:0.3,borderBottom:`1px solid ${T.border}`}}><Typography sx={{fontSize:11,color:T.textSub}}>{k}</Typography><Typography sx={{fontSize:11,fontWeight:700,color:T.text}}>{v}</Typography></Box>))}</Box>)}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Desktop panel toggle */}
      <Box sx={{display:{xs:"none",md:"flex"},position:"absolute",left:panelOpen?420:0,top:"50%",transform:"translateY(-50%)",zIndex:1500,transition:"left 0.3s ease"}}>
        <button onClick={()=>setPanelOpen(o=>!o)} style={{width:20,height:64,background:"linear-gradient(135deg,#ea580c,#dc2626)",border:"none",cursor:"pointer",borderRadius:panelOpen?"0 8px 8px 0":"8px 0 0 8px",color:"#fff",fontSize:14,boxShadow:"2px 0 12px rgba(234,88,12,0.2)"}}>{panelOpen?"‹":"›"}</button>
      </Box>

      {/* ══ MAP ══ */}
      <Box sx={{flex:1,position:"relative",minHeight:{xs:"55vh",md:"auto"},background:T.bg}}>
        {riskScore!==null&&(<Box sx={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",zIndex:1200,background:"rgba(255,255,255,0.97)",borderRadius:24,boxShadow:"0 4px 24px rgba(0,0,0,0.1)",px:2,py:0.8,display:"flex",alignItems:"center",gap:1.5,whiteSpace:"nowrap",backdropFilter:"blur(12px)",border:`1px solid ${T.border}`}}>
          <Box sx={{width:9,height:9,borderRadius:"50%",background:RC(sc),boxShadow:`0 0 0 3px ${RC(sc)}33`}}/>
          <Typography sx={{fontWeight:700,fontSize:13,color:RC(sc)}}>{RL(sc)}</Typography>
          <Typography sx={{fontSize:12,color:T.textSub,fontWeight:600}}>{sc}/100</Typography>
          {rfScore!==null&&<Chip label={`RF ${rfScore}`} size="small" sx={{height:18,fontSize:9,background:"rgba(37,99,235,0.1)",color:"#2563eb",fontWeight:700}}/>}
          {lstmScore!==null&&<Chip label={`LSTM ${lstmScore}`} size="small" sx={{height:18,fontSize:9,background:"rgba(124,58,237,0.1)",color:"#7c3aed",fontWeight:700}}/>}
          {liveSpd!==null&&<Chip label={`${liveSpd} km/h`} size="small" sx={{height:18,fontSize:10,background:"rgba(22,163,74,0.1)",color:"#16a34a",fontWeight:700}}/>}
          {liveSpd > 10 && <Chip label={`🛑 ${getSafeBrakingDistance(liveSpd, currentRiskParams?.roadCondition||0)}m Gap`} size="small" sx={{height:18,fontSize:10,background:"rgba(220,38,38,0.08)",color:"#dc2626",fontWeight:800,border:"1px solid rgba(220,38,38,0.15)"}} title="Safe braking distance needed"/>}
          {currentRiskParams?.criticalZone==="1"&&<Chip label="⚠️ HOTSPOT" size="small" sx={{height:18,fontSize:9,background:"rgba(220,38,38,0.1)",color:"#dc2626",fontWeight:800}}/>}
          {isMoving&&<Box sx={{width:8,height:8,borderRadius:"50%",background:"#16a34a",animation:"blink 1s infinite","@keyframes blink":{"0%,100%":{opacity:1},"50%":{opacity:0}}}}/>}
          {/* ✅ Hindi voice indicator on map ribbon */}
          {hindiOn&&<Chip label="हि" size="small" sx={{height:18,fontSize:9,background:"rgba(37,99,235,0.12)",color:"#2563eb",fontWeight:800,border:"1px solid rgba(37,99,235,0.2)"}}/>}
        </Box>)}

        {navigating&&<XAIOverlay xaiFacts={xaiFacts} xaiText={xaiText} rfScore={rfScore} lstmScore={lstmScore} riskScore={riskScore} riskParams={currentRiskParams}/>}

        {navigating&&directions?.steps?.[currentStep]&&(<Box sx={{position:"absolute",bottom:{xs:"auto",md:90},top:{xs:56,md:"auto"},left:"50%",transform:"translateX(-50%)",zIndex:1200,background:stepClr,color:"#fff",borderRadius:14,px:2.5,py:1.4,boxShadow:`0 8px 32px ${stepClr}55`,maxWidth:420,textAlign:"center",border:"1px solid rgba(255,255,255,0.2)"}}>
          <Typography sx={{fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:1}}><TurnArrow type={directions.steps[currentStep]?.type} modifier={directions.steps[currentStep]?.modifier}/>{directions.steps[currentStep].instruction}</Typography>
          {/* Hindi in floating nav card */}
          {hindiOn && (
            <Typography sx={{fontSize:11,opacity:0.88,mt:0.2,fontStyle:"italic"}}>
              {translateToHindi(directions.steps[currentStep].instruction)}
            </Typography>
          )}
          <Typography sx={{fontSize:12,opacity:0.9,mt:0.3}}>in {fmtD(directions.steps[currentStep].distance_m||0)} · {Math.round(tripPct)}% done</Typography>
        </Box>)}

        {nearZone&&navigating&&(<Box sx={{position:"absolute",top:54,left:"50%",transform:"translateX(-50%)",zIndex:1300,background:"rgba(255,255,255,0.97)",border:`1px solid rgba(234,88,12,0.2)`,borderRadius:10,px:2,py:1,display:"flex",alignItems:"center",gap:1,boxShadow:"0 2px 16px rgba(0,0,0,0.1)",maxWidth:380,backdropFilter:"blur(8px)"}}>
          <Typography sx={{fontSize:16}}>{ZONE_ICON[nearZone.type]||"⚠️"}</Typography>
          <Typography sx={{fontSize:12,fontWeight:700,color:T.orange}}>{nearZone.warn}</Typography>
        </Box>)}

        {navigating&&dstGeoPos&&(<Box sx={{position:"absolute",bottom:0,left:0,right:0,zIndex:1100,background:"linear-gradient(0deg,rgba(255,255,255,0.97) 50%,transparent)",px:3,pt:4,pb:2,pointerEvents:"none"}}>
          <Typography sx={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:12,color:T.textSub,letterSpacing:1.5,textTransform:"uppercase",mb:0.3}}>Destination</Typography>
          <Typography sx={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:T.text,letterSpacing:0.2}} noWrap>{dest.split(",")[0]}</Typography>
        </Box>)}

        <MapContainer center={userPos||[31.6,77.2]} zoom={9} style={{height:"100%",width:"100%"}} zoomControl={false}>
          <MapController mapRef={mapRef}/>
          <MapClickHandler onMapClick={(lat,lon)=>{
            if(!source){
              setSource(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
              reverseGeocode(lat,lon).then(a=>setSource(a.split(",").slice(0,2).join(",").trim())).catch(()=>{});
            }
          }}/>
          <TileLayer url={tileUrl} attribution="© OSM" maxZoom={19} subdomains="abc"/>

          {allRoutes.map((route, idx) => {
            if (idx === selectedRouteIdx) return null;
            const coords = route.geometry.coordinates.map(([ln, la]) => [la, ln]);
            return (<Polyline key={`alt_${idx}`} positions={coords} pathOptions={{ color: altRouteColors[idx % altRouteColors.length], weight: 5, opacity: 0.45, dashArray: "8,6", lineCap: "round" }} eventHandlers={{ click: () => selectRoute(idx) }}/>);
          })}

          {!navigating&&routeSegs.map((seg,i)=>(<Polyline key={i} positions={seg.points} pathOptions={{color:seg.color,weight:8,opacity:0.95,lineCap:"round",lineJoin:"round"}}/>))}
          {navigating&&drivenCoords.length>1&&<Polyline positions={drivenCoords} pathOptions={{color:"rgba(100,116,139,0.4)",weight:6,opacity:0.5,dashArray:"10,7"}}/>}
          {navigating&&remainingCoords.length>1&&<Polyline positions={remainingCoords} pathOptions={{color:RC(sc),weight:8,opacity:0.95,lineCap:"round",lineJoin:"round"}}/>}

          {srcGeoPos&&<Marker position={srcGeoPos} icon={srcIcon}><Popup><b style={{color:"#16a34a"}}>🟢 Start</b><br/>{source}</Popup></Marker>}
          {dstGeoPos&&<Marker position={dstGeoPos} icon={dstIcon}><Popup><b style={{color:"#dc2626"}}>🔴 Destination</b><br/>{dest}</Popup></Marker>}

          {showHS&&HP_HOTSPOTS.map(h=>(<Circle key={h.id} center={[h.lat,h.lon]} radius={h.risk==="HIGH"?(h.killed>=7?900:h.killed>=4?650:450):320} pathOptions={{color:h.risk==="HIGH"?"#dc2626":"#d97706",fillColor:h.risk==="HIGH"?"#dc2626":"#d97706",fillOpacity:0.13,weight:2,dashArray:"6,4"}}><Popup><div style={{fontFamily:"'DM Sans',sans-serif",minWidth:200}}><b style={{color:h.risk==="HIGH"?"#dc2626":"#d97706"}}>{h.risk==="HIGH"?"🔴":"🟡"} {h.name}</b><div style={{fontSize:12,marginTop:4,color:"#666"}}>📍 {h.district} · iRAD 2025-26</div><div style={{display:"flex",gap:6,marginTop:4}}><span style={{background:"rgba(220,38,38,0.1)",color:"#dc2626",borderRadius:4,padding:"2px 8px",fontWeight:700}}>⚠️ {h.accidents} acc.</span><span style={{background:"rgba(220,38,38,0.1)",color:"#dc2626",borderRadius:4,padding:"2px 8px",fontWeight:700}}>💀 {h.killed} killed</span></div></div></Popup></Circle>))}

          {showLearned&&confirmedLearnedHotspots.map((h,i)=>{
            const ws = typeof h.weighted_score === "number" && isFinite(h.weighted_score) ? h.weighted_score : 15;
            // Radius: 150m base + 25m per weighted score point, capped at 600m — driven by actual reported incidents
            const radius = Math.min(600, Math.max(150, 150 + ws * 18));
            return(<Circle key={`lh_${i}`} center={[h.lat,h.lon]} radius={radius} pathOptions={{color:h.color||"#9333ea",fillColor:h.color||"#9333ea",fillOpacity:0.14,weight:2,dashArray:"4,3"}}><Popup><div style={{fontFamily:"'DM Sans',sans-serif",minWidth:200}}><b style={{color:h.color||"#9333ea"}}>🧠 Adaptive Verified Hotspot</b><div style={{fontSize:12,marginTop:4,color:"#666"}}>Risk: {h.risk} · Score: {ws?.toFixed?.(1)??ws}</div><div style={{fontSize:12,color:"#666"}}>Reports: {h.count} community · {h.fatals} fatal incidents</div><div style={{fontSize:11,color:"#9333ea",marginTop:4}}>Radius: {Math.round(radius)}m — based on incident weight</div></div></Popup></Circle>);
          })}

          {showZones&&CRITICAL_ZONES.map(z=>{const clrMap={fog:"#64748b",bridge:"#dc2626",police:"#2563eb",landslide:"#9333ea",railway:"#ea580c"};const c=clrMap[z.type]||"#64748b";return(<Circle key={z.id} center={[z.lat,z.lon]} radius={z.radius} pathOptions={{color:c,fillColor:c,fillOpacity:0.07,weight:z.type==="fog"?1:1.5,dashArray:z.type==="fog"?"8,8":"4,4"}}><Popup><b style={{color:c}}>{ZONE_ICON[z.type]||"⚠️"} {z.name}</b><br/><span style={{fontSize:12,color:"#666"}}>{z.warn}</span></Popup></Circle>);})}

          {showCams&&SPEED_CAMS.map(cam=>(<Marker key={cam.id} position={[cam.lat,cam.lon]} icon={L.divIcon({className:"",html:`<div style="background:${cam.type==="camera"?"#dc2626":"#7c3aed"};color:#fff;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;box-shadow:0 2px 12px rgba(0,0,0,0.15);white-space:nowrap">${cam.type==="camera"?"📷":"👮"} ${cam.limit}km/h</div>`})}><Popup><b>{cam.name}</b><br/><span style={{color:"#dc2626",fontWeight:700}}>Limit: {cam.limit} km/h</span></Popup></Marker>))}

          {showTolls&&HP_TOLLS.map(t=>{const fee=vehicle==="truck"?t.fee_truck:vehicle==="bike"?t.fee_bike:t.fee_car;return(<Marker key={t.id} position={[t.lat,t.lon]} icon={L.divIcon({className:"",html:`<div style="background:#d97706;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;color:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.12);white-space:nowrap">🛣️ ₹${fee}</div>`})}><Popup><b>{t.name}</b> ({t.highway})<br/>{vp.icon} ₹{fee}</Popup></Marker>);})}

          {showPasses&&HP_PASSES.map((p,i)=>{const mo=new Date().getMonth()+1,open=p.open_months.includes(mo);return(<Marker key={i} position={[p.lat,p.lon]} icon={L.divIcon({className:"",html:`<div style="background:${open?"rgba(22,163,74,0.12)":"rgba(220,38,38,0.1)"};border:1.5px solid ${open?"#16a34a":"#dc2626"};border-radius:6px;padding:2px 8px;font-size:9px;font-weight:800;color:${open?"#16a34a":"#dc2626"};white-space:nowrap">⛰️ ${p.name.split(" ")[0]} — ${open?"OPEN":"CLOSED"}</div>`})}><Popup><b>{p.name}</b><br/>Elevation: {p.elev}<br/>Status: {open?"✅ Open":"❌ Closed"}{!open&&<><br/>Alt: {p.alt}</>}</Popup></Marker>);})}

          {showReports && reports.map((r, i) => (
            <Marker key={r.id || i} position={[r.lat || 31.1, r.lon || 77.1]} icon={L.divIcon({ className: "", html: `<div style="background:#fff;border:2.5px solid ${RCOLORS[r.type] || "rgba(0,0,0,0.1)"};border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 12px rgba(0,0,0,0.1)">${RICONS[r.type] || "⚠️"}</div>` })}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <b style={{ textTransform: "capitalize", color: RCOLORS[r.type] }}>{RICONS[r.type]} {r.type}</b>
                  <div style={{ fontSize: 12, margin: "4px 0", color: "#444" }}>{r.description || "No details"}</div>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 8 }}>Reported by: {r.reporter || "User"}</div>
                  
                  {/* Admin Resolve Action */}
                  {(() => {
                    try {
                      const user = JSON.parse(localStorage.getItem("ic_user") || "{}");
                      if (user.role === "admin" || user.email?.includes("admin")) {
                        return (
                          <button 
                            onClick={async () => {
                              if (!window.confirm("Resolve this incident?")) return;
                              try {
                                await fetch(`${import.meta.env.VITE_API_URL}/api/reports/${r.id}/resolve`, { method: "POST" });
                                const ids = new Set([...resolvedIdsRef.current, r.id]);
                                localStorage.setItem(RESOLVED_STORAGE_KEY, JSON.stringify([...ids]));
                                window.dispatchEvent(new Event("intellicrash_report_resolved"));
                                toast("Incident resolved and removed from map", "success");
                              } catch (e) {
                                toast("Failed to resolve", "error");
                              }
                            }}
                            style={{ width: "100%", padding: "6px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700, fontSize: 11 }}
                          >
                            ✓ RESOLVE ACCIDENT
                          </button>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                </div>
              </Popup>
            </Marker>
          ))}

          {navigating&&vehPos&&vehIcon&&!isMoving&&(<Marker position={vehPos} icon={vehIcon} zIndexOffset={1200}><Popup>{vp.icon} {vp.label}<br/>{kmLeft!==null&&<><b>{fmtD((kmLeft||0)*1000)}</b> remaining<br/></>}{etaSec!==null&&<>ETA: <b>{fmtT(etaSec)}</b><br/></>}Risk: <b style={{color:RC(sc)}}>{RL(sc)} ({sc}/100)</b></Popup></Marker>)}
        </MapContainer>

        {/* FABs */}
        <Box sx={{position:"absolute",bottom:navigating?72:24,right:12,zIndex:1000,display:"flex",flexDirection:"column",gap:1}}>
          <Tooltip title="My location" placement="left">
            <button onClick={()=>{
              navigator.geolocation?.getCurrentPosition(
                async(p)=>{
                  const ll=[p.coords.latitude,p.coords.longitude];
                  setUserPos(ll);
                  const map=mapRef.current;
                  if(map){
                    try{map.setView(ll,15,{animate:true});}catch(_){}
                    const dotHTML=`<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 5px rgba(37,99,235,0.2),0 2px 8px rgba(0,0,0,0.15)"></div>`;
                    const dotIcon=L.divIcon({className:"",html:dotHTML,iconSize:[14,14],iconAnchor:[7,7]});
                    if(!userMarkerRef.current){try{userMarkerRef.current=L.marker(ll,{icon:dotIcon,zIndexOffset:900}).addTo(map);}catch(_){}}
                    else{try{userMarkerRef.current.setLatLng(ll);}catch(_){}}
                  }
                  try{const a=await reverseGeocode(ll[0],ll[1]);if(!source)setSource(a.split(",").slice(0,2).join(",").trim());}catch(_){}
                },
                ()=>toast("GPS unavailable","warning"),
                {enableHighAccuracy:true,maximumAge:0,timeout:8000}
              );
            }} style={{width:46,height:46,borderRadius:"50%",background:"#fff",border:`1px solid ${T.border}`,cursor:"pointer",fontSize:18,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>📍</button>
          </Tooltip>
          <Tooltip title={liveOn?"Stop tracking":"Start live GPS"} placement="left">
            <button onClick={()=>setLiveOn(v=>{if(!v)toast("Live GPS started","success");else{toast("Tracking stopped","info");if(timerRef.current)clearInterval(timerRef.current);}return !v;})} style={{width:46,height:46,borderRadius:"50%",background:liveOn?"rgba(22,163,74,0.1)":"#fff",border:`1px solid ${liveOn?"rgba(22,163,74,0.3)":T.border}`,cursor:"pointer",fontSize:13,fontWeight:800,color:liveOn?"#16a34a":T.textSub,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>{liveOn?"🟢":"⚫"}</button>
          </Tooltip>
          {navigating&&<Tooltip title="Centre on vehicle" placement="left"><button onClick={()=>{if(vehPos&&mapRef.current){try{mapRef.current.setView(vehPos,15,{animate:true});}catch(_){}}}} style={{width:46,height:46,borderRadius:"50%",background:"rgba(234,88,12,0.08)",border:"1.5px solid rgba(234,88,12,0.2)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>{vp.icon}</button></Tooltip>}
          {navigating&&<Tooltip title="Stop navigation" placement="left"><button onClick={()=>{stopAnim();setNavigating(false);if(riskTimerRef.current)clearInterval(riskTimerRef.current);toast("Navigation stopped","info");setPanelMode("search");}} style={{width:46,height:46,borderRadius:"50%",background:"rgba(220,38,38,0.08)",border:"1.5px solid rgba(220,38,38,0.2)",cursor:"pointer",fontSize:14,fontWeight:700,color:"#dc2626",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>✕</button></Tooltip>}
        </Box>

        {/* Legend */}
        <Box sx={{display:{xs:"none",md:"block"},position:"absolute",bottom:20,left:12,zIndex:1000,background:"rgba(255,255,255,0.96)",borderRadius:2,p:"8px 12px",boxShadow:"0 4px 16px rgba(0,0,0,0.08)",backdropFilter:"blur(8px)",border:`1px solid ${T.border}`}}>
          {[["#16a34a","Safe (0–33)"],["#d97706","Medium (34–66)"],["#dc2626","High Risk (67+)"],["#9333ea","Adaptive verified"],["#2563eb","Alternate route"]].map(([c,l])=>(<Box key={l} sx={{display:"flex",alignItems:"center",gap:1,mb:0.4}}><Box sx={{width:20,height:4,borderRadius:2,background:c}}/><Typography sx={{fontSize:10,color:T.textSub}}>{l}</Typography></Box>))}
          <Box sx={{height:"1px",background:T.border,my:0.5}}/>
          <Typography sx={{fontSize:9,color:T.textSub}}>⚠️ iRAD · 🌫️ Fog/Slide · 📷 Cam · 🛣️ Toll · ⛰️ Pass</Typography>
          {hindiOn&&<Typography sx={{fontSize:9,color:"#2563eb",fontWeight:700,mt:0.5}}>🔊 हिंदी आवाज़ सक्रिय</Typography>}
        </Box>
      </Box>

      <TripReviewModal open={showReview} onClose={()=>setShowReview(false)} tripFrom={source} tripTo={dest} pointsEarned={pointsEarned}/>

      {snack&&(<Box sx={{position:"fixed",bottom:{xs:120,md:24},right:16,left:{xs:16,md:"auto"},zIndex:9999,background:"#fff",color:snack.sev==="error"?"#dc2626":snack.sev==="success"?"#16a34a":snack.sev==="warning"?"#d97706":"#2563eb",border:`1px solid ${snack.sev==="error"?"rgba(220,38,38,0.2)":snack.sev==="success"?"rgba(22,163,74,0.2)":snack.sev==="warning"?"rgba(217,119,6,0.2)":"rgba(37,99,235,0.2)"}`,px:2,py:1.2,borderRadius:2,fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.1)",maxWidth:320,backdropFilter:"blur(12px)"}}>{snack.msg}</Box>)}
    </Box>
  );
}