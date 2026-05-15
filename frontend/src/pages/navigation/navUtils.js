/**
 * navUtils.js — Navigation utilities and constants
 */
import L from "leaflet";

export const RESOLVED_STORAGE_KEY = "intellicrash_resolved_incidents";
export const REPORT_POLL_MS = 15_000;
export const DEFAULT_EXPIRE_MS = 5 * 3600_000;
export const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdYRZnuvommuJrbOytaTcaySne3_3ddLthqnKljvsA_wY47ig/viewform?usp=publish-editor";

export const HINDI_PHRASES = {
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

export const RC = (s) => s >= 67 ? "#dc2626" : s >= 34 ? "#ea580c" : "#16a34a";
export const RL = (s) => s >= 67 ? "HIGH RISK" : s >= 34 ? "MEDIUM RISK" : "LOW RISK";
export const RCL = (s) => s >= 67 ? "rgba(220,38,38,0.05)" : s >= 34 ? "rgba(234,88,12,0.05)" : "rgba(22,163,74,0.05)";
export const RCB = (s) => s >= 67 ? "rgba(220,38,38,0.15)" : s >= 34 ? "rgba(234,88,12,0.15)" : "rgba(22,163,74,0.15)";

export const fmtD = (m) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
export const fmtT = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

export const RCOLORS = { accident: "#dc2626", traffic: "#d97706", roadblock: "#2563eb", hazard: "#9333ea" };
export const RICONS = { accident: "💥", traffic: "🚦", roadblock: "🚧", hazard: "⚠️", contribution: "💬" };
export const ZONE_ICON={fog:"🌫️",bridge:"🌉",police:"👮",landslide:"⛰️",railway:"🚂"};

export function mkVehicleIcon(key,hdg=0,score=50,moving=false) {
  const v=VP[key]||VP.car;const c=RC(score);
  return L.divIcon({
    className:"veh-icon",iconSize:[56,56],iconAnchor:[28,28],
    html:`<div style="transform:rotate(${hdg}deg);width:56px;height:56px;display:flex;align-items:center;justify-content:center;">
      <div style="background:${c};width:36px;height:36px;border-radius:50%;box-shadow:0 2px 12px ${c}88,0 0 0 6px ${c}22;border:3px solid rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;font-size:16px;">${v.icon}</div>
    </div>`,
  });
}

export function translateToHindi(text) {
  if (!text) return "";
  const t_lower = text.toLowerCase();
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
  return result === t_lower ? text : result;
}

export function getSafeBrakingDistance(kph, roadCondCode) {
  const v = kph / 3.6;
  const friction = roadCondCode === 1 ? 0.4 : roadCondCode === 2 ? 0.15 : 0.7;
  const g = 9.8;
  return Math.round((v * v) / (2 * friction * g) + (v * 1.5));
}

export function getHindiVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang === "hi-IN") || voices.find(v => v.lang.startsWith("hi")) || voices.find(v => v.lang === "en-IN") || null;
}

export function hvDist([la1, lo1], [la2, lo2]) {
  const R = 6371000, φ1 = la1 * Math.PI / 180, φ2 = la2 * Math.PI / 180,
    Δφ = (la2 - la1) * Math.PI / 180, Δλ = (lo2 - lo1) * Math.PI / 180,
    a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function brng([la1, lo1], [la2, lo2]) {
  const φ1 = la1 * Math.PI / 180, φ2 = la2 * Math.PI / 180, Δλ = (lo2 - lo1) * Math.PI / 180,
    y = Math.sin(Δλ) * Math.cos(φ2),
    x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

export function lerp([la1, lo1], [la2, lo2], t) { return [la1 + (la2 - la1) * t, lo1 + (lo2 - lo1) * t]; }

export function getNearestHotspot(lat, lon, hotspots, radiusM = 2000) {
  let nearest = null, minDist = Infinity;
  for (const h of hotspots) {
    const d = hvDist([lat, lon], [h.lat, h.lon]);
    if (d < radiusM && d < minDist) { minDist = d; nearest = { ...h, distanceM: Math.round(d) }; }
  }
  return nearest;
}

export function inferRoadType(lat, lon) {
  const nhCorridors = [
    { lat1: 30.83, lon1: 76.95, lat2: 31.12, lon2: 77.20 }, { lat1: 31.12, lon1: 77.20, lat2: 31.96, lon2: 77.11 },
    { lat1: 31.55, lon1: 76.89, lat2: 31.96, lon2: 77.11 }, { lat1: 31.70, lon1: 76.92, lat2: 31.83, lon2: 77.12 },
    { lat1: 32.09, lon1: 76.10, lat2: 32.24, lon2: 76.39 }, { lat1: 30.44, lon1: 77.55, lat2: 30.58, lon2: 77.47 },
  ];
  for (const c of nhCorridors) {
    if (lat >= Math.min(c.lat1, c.lat2) - 0.05 && lat <= Math.max(c.lat1, c.lat2) + 0.05 &&
        lon >= Math.min(c.lon1, c.lon2) - 0.05 && lon <= Math.max(c.lon1, c.lon2) + 0.05) return "2";
  }
  if (lat > 30.88 && lat < 30.95 && lon > 76.77 && lon < 76.85) return "3";
  return "1";
}

export function inferAreaType(lat, lon) {
  const urbanCenters = [
    [31.1048, 77.1734, 8000], [31.7088, 76.9330, 5000], [31.9578, 77.1095, 4000],
    [32.0947, 76.1022, 5000], [30.9050, 77.0950, 4000], [30.9237, 76.7980, 6000],
    [30.4497, 77.5666, 4000], [31.4700, 76.2700, 3000],
  ];
  for (const [clat, clon, r] of urbanCenters) {
    if (hvDist([lat, lon], [clat, clon]) < r) return "1";
  }
  return "0";
}

export function wxCodeToBackend(wx) {
  if (!wx) return "0";
  const code = wx.weathercode ?? 0;
  if (code === 0 || code <= 3) return "0";
  if (code >= 45 && code <= 48) return "2";
  if (code >= 71 && code <= 77) return "3";
  if (code >= 85 && code <= 86) return "3";
  if (code >= 95) return "4";
  if (code >= 51 && code <= 82) return "1";
  return "0";
}

export function wxToVisibility(wx) {
  if (!wx) return 1000;
  const code = wx.weathercode ?? 0;
  if (code >= 45 && code <= 48) return 200;
  if (code >= 95) return 150;
  if (code >= 71 && code <= 77) return 300;
  if (code >= 85 && code <= 86) return 250;
  return 1000;
}

export const HP_HOTSPOTS = [
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

export const CRITICAL_ZONES = [
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
  { id:"s1", lat:31.104,  lon:77.173,  name:"Shimla Public School Zone",    type:"school",    warn:"School zone ahead — children crossing, reduce to 20 km/h",      radius:300  },
  { id:"s2", lat:31.708,  lon:76.932,  name:"Mandi Model School Zone",      type:"school",    warn:"Quiet zone — school nearby, no honking, reduce speed",         radius:250  },
  { id:"h1", lat:31.091,  lon:77.174,  name:"IGMC Hospital Zone",           type:"hospital",  warn:"Hospital zone — ambulance entry/exit, maintain silence",        radius:400  },
];

export const SPEED_CAMS = [
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

export const HP_TOLLS = [
  { id:"t1", lat:30.839, lon:76.963, name:"Parwanoo", highway:"NH-5",   fee_car:65,  fee_truck:200, fee_bike:30 },
  { id:"t2", lat:31.370, lon:76.830, name:"Swarghat", highway:"NH-21",  fee_car:55,  fee_truck:180, fee_bike:25 },
  { id:"t3", lat:31.711, lon:76.932, name:"Mandi",    highway:"NH-3",   fee_car:45,  fee_truck:150, fee_bike:20 },
  { id:"t4", lat:31.958, lon:77.110, name:"Kullu",    highway:"NH-3",   fee_car:60,  fee_truck:190, fee_bike:25 },
  { id:"t5", lat:30.909, lon:77.095, name:"Solan",    highway:"NH-5",   fee_car:60,  fee_truck:190, fee_bike:25 },
  { id:"t6", lat:32.094, lon:76.101, name:"Kangra",   highway:"NH-503", fee_car:45,  fee_truck:155, fee_bike:20 },
];

export const HP_PASSES = [
  { lat:32.2396, lon:77.1887, name:"Rohtang Pass",        open_months:[5,6,7,8,9,10], elev:"3978m", alt:"Atal Tunnel (year-round)" },
  { lat:31.9,    lon:77.6,    name:"Spiti (Pin-Parvati)", open_months:[6,7,8,9],       elev:"4550m", alt:"Via Shimla" },
  { lat:31.5,    lon:77.4,    name:"Jalori Pass",         open_months:[4,5,6,7,8,9,10],elev:"3120m", alt:"Via NH" },
  { lat:32.55,   lon:76.62,   name:"Sach Pass",           open_months:[6,7,8,9],       elev:"4390m", alt:"Via Chamba town" },
  { lat:32.70,   lon:77.05,   name:"Baralacha La",        open_months:[6,7,8,9],       elev:"4890m", alt:"Manali–Leh Highway" },
];

export const VP = {
  car:   { label:"Car",   icon:"🚗", osrm:"driving", avg:45, factor:1.00, vehicleType:"0" },
  bike:  { label:"Bike",  icon:"🏍️", osrm:"driving", avg:55, factor:0.88, vehicleType:"2" },
  walk:  { label:"Walk",  icon:"🚶", osrm:"walking", avg:5,  factor:1.00, vehicleType:"0" },
  truck: { label:"Truck", icon:"🚛", osrm:"driving", avg:35, factor:1.25, vehicleType:"1" },
  auto:  { label:"Auto",  icon:"🛺", osrm:"driving", avg:30, factor:1.10, vehicleType:"0" },
};

export const T = {
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

// ─── Risk colour helpers ──────────────────────────────────────────
export const RISK_META = {
  HIGH:   { color:"#dc2626", bg:"#fef2f2", border:"#fca5a5", icon:"☠️", label:"HIGH RISK",   pulse:true  },
  MEDIUM: { color:"#d97706", bg:"#fffbeb", border:"#fcd34d", icon:"⚠️", label:"MEDIUM RISK", pulse:false },
  LOW:    { color:"#16a34a", bg:"#f0fdf4", border:"#86efac", icon:"✓",  label:"LOW RISK",    pulse:false },
};

/**
 * mkHotspotIcon — creates a circular pin with risk-level colour, icon, and
 * optional pulsing ring for HIGH-risk hotspots.
 */
export function mkHotspotIcon(risk = "MEDIUM", killed = 0, accidents = 0) {
  const meta = RISK_META[risk] || RISK_META.MEDIUM;
  const size  = risk === "HIGH" ? 38 : 32;
  const pulse = risk === "HIGH"
    ? `<div style="position:absolute;inset:0;border-radius:50%;border:2px solid ${meta.color};animation:hsring 1.6s ease-out infinite;opacity:0.5;pointer-events:none;"></div>
       <div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${meta.color};animation:hsring 1.6s ease-out 0.5s infinite;opacity:0.3;pointer-events:none;"></div>`
    : "";
  return L.divIcon({
    className: "",
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <style>
        @keyframes hsring{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.4);opacity:0}}
      </style>
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${pulse}
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:linear-gradient(135deg, ${meta.color}, ${meta.color}dd);
          border:3px solid #fff;
          box-shadow:0 4px 15px ${meta.color}aa, inset 0 0 10px rgba(0,0,0,0.1);
          display:flex;align-items:center;justify-content:center;
          font-size:${risk==="HIGH"?15:13}px;
          font-weight:900;
          color:#fff;
          z-index:2;
          transition: transform 0.2s;
        ">${meta.icon}</div>
      </div>`,
  });
}

/**
 * mkAdaptiveHotspotIcon — for ML/community-learned hotspots from backend.
 * Shows a circle with radar pulse ring to distinguish from static iRAD hotspots.
 * Adaptive = blue; score shown inside.
 */
export function mkAdaptiveHotspotIcon(score = 50) {
  const c = score >= 67 ? "#9333ea" : score >= 34 ? "#2563eb" : "#0891b2";
  const size = 36;
  return L.divIcon({
    className: "",
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <style>
        @keyframes adaptRing{0%{transform:scale(1);opacity:0.7}100%{transform:scale(2.0);opacity:0}}
      </style>
      <div style="position:relative;width:${size}px;height:${size}px;">
        <!-- Pulse ring 1 -->
        <div style="position:absolute;inset:0;border-radius:50%;border:2px solid ${c};animation:adaptRing 2s ease-out infinite;opacity:0.6;pointer-events:none;"></div>
        <!-- Pulse ring 2 (delayed) -->
        <div style="position:absolute;inset:0;border-radius:50%;border:2px solid ${c};animation:adaptRing 2s ease-out 0.7s infinite;opacity:0.3;pointer-events:none;"></div>
        <!-- Circle body -->
        <div style="
          position:absolute;inset:4px;
          border-radius:50%;
          background:${c};
          border:2.5px solid #fff;
          box-shadow:0 2px 12px ${c}88;
          display:flex;align-items:center;justify-content:center;
          z-index:2;
        ">
          <div style="color:#fff;font-size:9px;font-weight:900;font-family:'Outfit',sans-serif;line-height:1;">${score}</div>
        </div>
      </div>`,
  });
}

/**
 * mkZoneMarkerIcon — creates a pill marker for critical zones (fog, bridge, police, etc.)
 */
export function mkZoneMarkerIcon(type = "fog") {
  const ZONE_STYLE = {
    fog:       { icon:"🌫️", bg:"#64748b", label:"Fog"     },
    bridge:    { icon:"🌉", bg:"#ea580c", label:"Bridge"  },
    police:    { icon:"👮", bg:"#1d4ed8", label:"Naka"    },
    landslide: { icon:"⛰️", bg:"#7c3aed", label:"Slide"   },
    railway:   { icon:"🚂", bg:"#f59e0b", label:"Rail"    },
    hospital:  { icon:"🏥", bg:"#16a34a", label:"Hospital"},
    school:    { icon:"🏫", bg:"#16a34a", label:"School"  },
    college:   { icon:"🎓", bg:"#4f46e5", label:"College" },
    market:    { icon:"🛒", bg:"#059669", label:"Market"  },
  };
  const s = ZONE_STYLE[type] || { icon:"⚠️", bg:"#64748b", label:"Zone" };
  return L.divIcon({
    className: "",
    iconSize:   [80, 32],
    iconAnchor: [40, 16],
    html: `<div style="
      background: ${s.bg};
      color: #fff;
      border-radius: 12px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 900;
      box-shadow: 0 8px 24px ${s.bg}44, inset 0 1px 1px rgba(255,255,255,0.4);
      border: 1.5px solid rgba(255,255,255,0.25);
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      backdrop-filter: blur(4px);
    ">
      <span style="font-size: 14px;">${s.icon}</span>
      <span>${s.label}</span>
    </div>`,
  });
}

/**
 * mkSrcPinIcon — green teardrop pin for journey start
 */
export function mkSrcPinIcon() {
  return L.divIcon({
    className: "",
    iconSize:   [34, 44],
    iconAnchor: [17, 44],
    html: `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
      <filter id="s1"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#16a34a44"/></filter>
      <path d="M17 0C7.61 0 0 7.61 0 17c0 12.73 17 27 17 27S34 29.73 34 17C34 7.61 26.39 0 17 0z" fill="#16a34a" filter="url(#s1)"/>
      <circle cx="17" cy="17" r="8" fill="white"/>
      <circle cx="17" cy="17" r="4" fill="#16a34a"/>
    </svg>`,
  });
}

/**
 * mkDstPinIcon — red teardrop pin for journey destination
 */
export function mkDstPinIcon() {
  return L.divIcon({
    className: "",
    iconSize:   [34, 44],
    iconAnchor: [17, 44],
    html: `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
      <filter id="s2"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#dc262644"/></filter>
      <path d="M17 0C7.61 0 0 7.61 0 17c0 12.73 17 27 17 27S34 29.73 34 17C34 7.61 26.39 0 17 0z" fill="#dc2626" filter="url(#s2)"/>
      <circle cx="17" cy="17" r="8" fill="white"/>
      <circle cx="17" cy="17" r="4" fill="#dc2626"/>
    </svg>`,
  });
}

/**
 * mkUserPinIcon — blue pulsing dot for live GPS position
 */
export function mkUserPinIcon() {
  return L.divIcon({
    className: "",
    iconSize:   [22, 22],
    iconAnchor: [11, 11],
    html: `<style>@keyframes userpulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:0.7}}</style>
      <div style="
        width:22px;height:22px;border-radius:50%;
        background:#2563eb;border:3px solid #fff;
        box-shadow:0 0 0 4px rgba(37,99,235,0.3);
        animation:userpulse 2s ease-in-out infinite;
      "></div>`,
  });
}
