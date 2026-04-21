// ============================================================
// SOS.jsx — IntelliCrash · Robust Emergency Dashboard
// Fixed: All imports now correctly reference api.js exports
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Box, Container, Typography, Button, Card, CardContent,
  TextField, Chip, LinearProgress, Alert, Snackbar,
  CircularProgress, Grid, Avatar, Stack, IconButton,
  Collapse, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip,
} from "@mui/material";
import {
  Phone, Person, Delete, Add, LocationOn, MyLocation,
  Mic, MicOff, WhatsApp, Email, Speed, Warning,
  WifiOff, Wifi, CachedOutlined, CloudDone,
} from "@mui/icons-material";

// ✅ FIXED: All these are now properly exported from api.js
import {
  triggerSOS,
  getSOSAlerts,
  getContacts,
  addContact,
  deleteContact,
  resolveSOSAlert,
  reverseGeocode,
} from "../services/api";

// ─── Design tokens ─────────────────────────────────────────────────────────
const C = {
  red:        "#E03131",
  redDark:    "#9B1C1C",
  redLight:   "#FEF2F2",
  green:      "#2D6A2D",
  greenLight: "#F0FDF4",
  amber:      "#B45309",
  amberLight: "#FFFBEB",
  blue:       "#1D4ED8",
  blueLight:  "#EFF6FF",
  navy:       "#0F172A",
  bg:         "#F1F5FD",
  surface:    "#FFFFFF",
  border:     "#E2E8F4",
  muted:      "#64748B",
  mono:       "'JetBrains Mono', 'Fira Code', monospace",
  display:    "'Clash Display', 'Syne', sans-serif",
  body:       "'Satoshi', 'DM Sans', sans-serif",
};

// ─── LRU Cache ──────────────────────────────────────────────────────────────
class LRUCache {
  constructor(capacity = 64, ttlMs = 5 * 60 * 1000) {
    this.cap   = capacity;
    this.ttl   = ttlMs;
    this.store = new Map();
  }
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() - item.ts > this.ttl) { this.store.delete(key); return null; }
    this.store.delete(key);
    this.store.set(key, item);
    return item.val;
  }
  set(key, val) {
    if (this.store.has(key)) this.store.delete(key);
    if (this.store.size >= this.cap) this.store.delete(this.store.keys().next().value);
    this.store.set(key, { val, ts: Date.now() });
  }
}

const geoCache      = new LRUCache(128, 10 * 60 * 1000);
const hospitalCache = new LRUCache(32,  30 * 60 * 1000);
const riskCache     = new LRUCache(64,   2 * 60 * 1000);

// ─── Circuit Breaker ────────────────────────────────────────────────────────
class CircuitBreaker {
  constructor(name, threshold = 3, halfOpenMs = 30_000) {
    this.name       = name;
    this.threshold  = threshold;
    this.halfOpenMs = halfOpenMs;
    this.failures   = 0;
    this.state      = "CLOSED";
    this.openedAt   = null;
  }
  async exec(fn) {
    if (this.state === "OPEN") {
      if (Date.now() - this.openedAt > this.halfOpenMs) { this.state = "HALF_OPEN"; }
      else throw new Error(`Circuit OPEN for ${this.name}`);
    }
    try {
      const result = await fn();
      if (this.state === "HALF_OPEN") { this.failures = 0; this.state = "CLOSED"; }
      return result;
    } catch (err) {
      this.failures += 1;
      if (this.failures >= this.threshold) {
        this.state = "OPEN"; this.openedAt = Date.now();
      }
      throw err;
    }
  }
  get isOpen() { return this.state === "OPEN"; }
}

const smsCB   = new CircuitBreaker("SMS",   3, 30_000);
const emailCB = new CircuitBreaker("Email", 3, 30_000);

// ─── Retry with exponential backoff ─────────────────────────────────────────
async function withRetry(fn, maxAttempts = 3, baseDelayMs = 400) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, baseDelayMs * 2 ** (attempt - 1) + Math.random() * 200));
      }
    }
  }
  throw lastErr;
}

// ─── IndexedDB helper ───────────────────────────────────────────────────────
const DB_NAME = "intellicrash_sos";
const DB_VER  = 2;

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("offline_queue"))
        db.createObjectStore("offline_queue", { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains("alert_history"))
        db.createObjectStore("alert_history", { keyPath: "id" });
      if (!db.objectStoreNames.contains("kv"))
        db.createObjectStore("kv", { keyPath: "k" });
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}

async function dbPut(store, value)  {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value).onsuccess = e => res(e.target.result);
    tx.onerror = e => rej(e.target.error);
  });
}
async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = e => res(e.target.result);
    req.onerror = e => rej(e.target.error);
  });
}
async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key).onsuccess = () => res();
    tx.onerror = e => rej(e.target.error);
  });
}
async function kvSet(k, v) { await dbPut("kv", { k, v }); }
async function kvGet(k) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("kv", "readonly");
    const req = tx.objectStore("kv").get(k);
    req.onsuccess = e => res(e.target.result?.v ?? null);
    req.onerror = e => rej(e.target.error);
  });
}

// ─── Offline queue ───────────────────────────────────────────────────────────
async function enqueueOffline(payload) {
  await dbPut("offline_queue", { ...payload, queuedAt: Date.now() });
}
async function flushOfflineQueue(sendFn) {
  const items = await dbGetAll("offline_queue");
  for (const item of items) {
    try { await sendFn(item); await dbDelete("offline_queue", item.id); }
    catch { /* keep in queue */ }
  }
}

// ─── Request dedup map ────────────────────────────────────────────────────────
const inflightRequests = new Map();
function dedupFetch(key, fn) {
  if (inflightRequests.has(key)) return inflightRequests.get(key);
  const p = fn().finally(() => inflightRequests.delete(key));
  inflightRequests.set(key, p);
  return p;
}

// ─── Cached API wrappers ──────────────────────────────────────────────────────
async function cachedReverseGeocode(lat, lon) {
  const key = `geo:${lat.toFixed(4)},${lon.toFixed(4)}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  return dedupFetch(key, async () => {
    const addr = await reverseGeocode(lat, lon);
    geoCache.set(key, addr);
    return addr;
  });
}

async function cachedNearbyHospitals(lat, lon) {
  const key = `hosp:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = hospitalCache.get(key);
  if (hit) return hit;
  return dedupFetch(key, async () => {
    try {
      const res = await withRetry(() =>
        fetch(`http://localhost:8000/api/nearby?lat=${lat}&lon=${lon}&limit=8`)
          .then(r => r.ok ? r.json() : Promise.reject(r.status)), 2
      );
      hospitalCache.set(key, res.nearby || []);
      return res.nearby || [];
    } catch { return []; }
  });
}

async function sendSMS(to, message) {
  return smsCB.exec(() =>
    withRetry(() =>
      fetch("http://localhost:3001/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message }),
      }).then(r => r.ok ? r.json() : Promise.reject(`SMS ${r.status}`))
    )
  );
}

async function sendEmail(to, name, payload) {
  return emailCB.exec(() =>
    withRetry(() =>
      fetch("http://localhost:3001/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, name, ...payload }),
      }).then(r => r.ok ? r.json() : Promise.reject(`Email ${r.status}`))
    )
  );
}

// ─── Offline HP hospitals fallback ───────────────────────────────────────────
const HP_HOSPITALS = [
  { name:"IGMC Shimla",          type:"hospital", lat:31.1048, lon:77.1734, phone:"0177-2804251" },
  { name:"DDU Hospital Shimla",  type:"hospital", lat:31.0995, lon:77.1661, phone:"0177-2650685" },
  { name:"Zonal Hospital Mandi", type:"hospital", lat:31.7088, lon:76.9330, phone:"01905-222170" },
  { name:"RH Sundernagar",       type:"hospital", lat:31.5349, lon:76.9009, phone:"01907-262080" },
  { name:"District Hosp. Kullu", type:"hospital", lat:31.9578, lon:77.1095, phone:"01902-222069" },
  { name:"Zonal Hosp. Solan",    type:"hospital", lat:30.9045, lon:77.0967, phone:"01792-223565" },
  { name:"HP Police HQ",         type:"police",   lat:31.1048, lon:77.1734, phone:"100" },
  { name:"HP Ambulance",         type:"hospital", lat:31.1048, lon:77.1734, phone:"108" },
  { name:"HP Emergency Ctrl",    type:"police",   lat:31.1048, lon:77.1734, phone:"112" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const distKm = (la1,lo1,la2,lo2) => {
  const R=6371, dL=(la2-la1)*Math.PI/180, dO=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};
const sevColor = s => s==="3"?C.red    : s==="2"?C.amber  : C.green;
const sevLabel = s => s==="3"?"HIGH"   : s==="2"?"MEDIUM" : "LOW";
const nColor   = t => t==="hospital"?C.red : t==="police"?C.blue : C.amber;
const nEmoji   = t => t==="hospital"?"🏥"  : t==="police"?"👮"   : "🚒";

// ─── Leaflet icons ────────────────────────────────────────────────────────────
const userPinIcon = L.divIcon({
  className:"", iconSize:[24,24], iconAnchor:[12,12],
  html:`<div style="width:18px;height:18px;border-radius:50%;background:#E03131;border:3px solid #fff;box-shadow:0 0 0 8px rgba(224,49,49,0.18),0 0 0 18px rgba(224,49,49,0.07);"></div>`,
});
const nearbyIcon = type => L.divIcon({
  className:"", iconSize:[32,32], iconAnchor:[16,16],
  html:`<div style="width:28px;height:28px;border-radius:50%;background:${nColor(type)};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.22);">${nEmoji(type)}</div>`,
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 14, { animate: true }); }, [center, map]);
  return null;
}

const PHASE = { IDLE:"idle", LOCATING:"locating", AI:"ai", SENT:"sent" };

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConnectionStatus({ online, cacheHits }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {online
        ? <Chip icon={<Wifi sx={{fontSize:13,color:"#fff !important"}}/>} label="Online" sx={{background:"rgba(45,106,45,0.9)",color:"#fff",fontWeight:700,fontSize:11,height:24}}/>
        : <Chip icon={<WifiOff sx={{fontSize:13,color:"#fff !important"}}/>} label="Offline — queued" sx={{background:"rgba(180,83,9,0.9)",color:"#fff",fontWeight:700,fontSize:11,height:24}}/>
      }
      {cacheHits > 0 && (
        <Tooltip title={`${cacheHits} cached responses used`}>
          <Chip icon={<CachedOutlined sx={{fontSize:13,color:"#1D4ED8 !important"}}/>} label={`${cacheHits} cached`} sx={{background:C.blueLight,color:C.blue,fontWeight:700,fontSize:11,height:24}}/>
        </Tooltip>
      )}
    </Stack>
  );
}

function SOSButton({ phase, onClick, cbStatus }) {
  const isBusy   = phase===PHASE.LOCATING || phase===PHASE.AI;
  const isActive = phase===PHASE.SENT;
  const allOpen  = cbStatus.sms && cbStatus.email;
  return (
    <Box sx={{ position:"relative", width:180, mx:"auto" }}>
      {allOpen && (
        <Chip label="⚠ Channels degraded" size="small"
          sx={{position:"absolute",top:-28,left:"50%",transform:"translateX(-50%)",background:C.amberLight,color:C.amber,fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}/>
      )}
      <Box
        onClick={phase===PHASE.IDLE ? onClick : undefined}
        sx={{
          width:180, height:180, borderRadius:"50%",
          background:isActive
            ? `linear-gradient(135deg,${C.redDark},#7F1D1D)`
            : `linear-gradient(135deg,${C.red},${C.redDark})`,
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          cursor:phase===PHASE.IDLE?"pointer":"default",
          userSelect:"none",
          transition:"all 0.3s ease",
          animation:isActive
            ? "sosBeat 1.4s ease-in-out infinite"
            : isBusy ? "none" : "sosPulse 2.8s ease-in-out infinite",
          "&:hover": phase===PHASE.IDLE ? { transform:"scale(1.05)", filter:"brightness(1.08)" } : {},
          "&:active": phase===PHASE.IDLE ? { transform:"scale(0.96)" } : {},
          "@keyframes sosPulse": {
            "0%,100%":{ boxShadow:"0 0 0 14px rgba(224,49,49,0.10)" },
            "50%":    { boxShadow:"0 0 0 32px rgba(224,49,49,0.18)" },
          },
          "@keyframes sosBeat": {
            "0%,100%":{ transform:"scale(1)",    boxShadow:"0 0 0 24px rgba(224,49,49,0.12)" },
            "50%":    { transform:"scale(1.045)", boxShadow:"0 0 0 40px rgba(224,49,49,0.06)" },
          },
        }}
      >
        {isBusy
          ? <CircularProgress size={52} sx={{color:"rgba(255,255,255,0.9)"}}/>
          : <>
              <Typography sx={{fontSize:40,lineHeight:1}}>🚨</Typography>
              <Typography sx={{color:"#fff",fontFamily:C.display,fontWeight:800,fontSize:26,letterSpacing:2,mt:0.5}}>SOS</Typography>
              <Typography sx={{color:"rgba(255,255,255,0.6)",fontSize:9,fontFamily:C.mono,letterSpacing:1.5,mt:0.3}}>
                {phase===PHASE.IDLE?"TAP TO ACTIVATE":"ACTIVE"}
              </Typography>
            </>
        }
      </Box>
    </Box>
  );
}

function ChannelRow({ label, status, cbOpen }) {
  const dotColor =
    cbOpen                        ? "#F97316" :
    status.startsWith("Sent")     ? C.blue    :
    status === "Ready"            ? C.green   :
    status === "Standby"          ? C.amber   : C.red;
  return (
    <Box sx={{display:"flex",alignItems:"center",gap:1,py:0.5}}>
      <Box sx={{width:7,height:7,borderRadius:"50%",background:dotColor,flexShrink:0}}/>
      <Typography sx={{fontFamily:C.mono,fontSize:11.5,color:C.muted,flex:1}}>{label}</Typography>
      <Typography sx={{fontFamily:C.mono,fontSize:10.5,color:cbOpen?"#F97316":dotColor}}>
        {cbOpen ? "⚠ Circuit Open" : status}
      </Typography>
    </Box>
  );
}

function CrashOverlay({ show, remaining, onSafe, onSendNow }) {
  if (!show) return null;
  return (
    <Box sx={{
      position:"fixed",inset:0,zIndex:9999,
      background:"rgba(0,0,0,0.96)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,
    }}>
      <Warning sx={{fontSize:60,color:C.red}}/>
      <Typography variant="h4" sx={{fontFamily:C.display,fontWeight:800,color:C.red}}>
        Crash Detected!
      </Typography>
      <Typography sx={{color:"#aaa",textAlign:"center",maxWidth:360,lineHeight:1.75}}>
        Sudden speed drop detected. Are you okay?<br/>
        SOS auto-sends to all contacts if no response.
      </Typography>
      <Box sx={{
        width:156,height:156,borderRadius:"50%",
        border:`4px solid ${C.red}`,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      }}>
        <Typography sx={{fontFamily:C.mono,fontSize:60,fontWeight:500,color:C.red,lineHeight:1}}>
          {remaining}
        </Typography>
        <Typography sx={{fontSize:11,color:"#777",fontFamily:C.mono}}>seconds</Typography>
      </Box>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" color="success" size="large" onClick={onSafe}
          sx={{borderRadius:30,fontWeight:700,px:4,fontSize:15}}>✅ I'm Safe</Button>
        <Button variant="contained" color="error" size="large" onClick={onSendNow}
          sx={{borderRadius:30,fontWeight:700,px:4,fontSize:15}}>🚨 Send Now</Button>
      </Stack>
    </Box>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function SOS() {

  const [phase,          setPhase]          = useState(PHASE.IDLE);
  const [userPos,        setUserPos]        = useState(null);
  const [address,        setAddress]        = useState("");
  const [result,         setResult]         = useState(null);
  const [nearby,         setNearby]         = useState([]);
  const [contacts,       setContacts]       = useState([]);
  const [alerts,         setAlerts]         = useState([]);
  const [userName,       setUserName]       = useState(() => localStorage.getItem("ic_username") || "User");
  const [newC,           setNewC]           = useState({ name:"", phone:"", email:"", relation:"Family" });
  const [adding,         setAdding]         = useState(false);
  const [snack,          setSnack]          = useState(null);
  const [gmailOpen,      setGmailOpen]      = useState(false);
  const [sentCounts,     setSentCounts]     = useState({ sms:0, email:0 });
  const [cacheHits,      setCacheHits]      = useState(0);
  const [online,         setOnline]         = useState(navigator.onLine);
  const [offlineQueue,   setOfflineQueue]   = useState(0);
  const [channelStatus,  setChannelStatus]  = useState({
    push:"Ready", sms:"Ready", email:"Ready", voice:"Standby", whatsapp:"Ready",
  });
  const [cbStatus, setCbStatus] = useState({ sms: false, email: false });

  const [listening,  setListening]  = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognRef = useRef(null);

  const [crashOn,       setCrashOn]       = useState(false);
  const [currentSpeed,  setCurrentSpeed]  = useState(0);
  const [movingStatus,  setMovingStatus]  = useState("Idle");
  const [showCountdown, setShowCountdown] = useState(false);
  const [coRemaining,   setCoRemaining]   = useState(30);

  const trackRef       = useRef(null);
  const crashWatchRef  = useRef(null);
  const coTimerRef     = useRef(null);
  const speedHistory   = useRef([]);
  const crashTriggered = useRef(false);
  const sosDedup       = useRef(null);
  const lastGpsPos     = useRef(null);
  const prefetchedNear = useRef(null);

  useEffect(() => {
    const up   = () => { setOnline(true);  flushOfflineQueue(dispatchToChannel); };
    const down = () => setOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  useEffect(() => {
    getContacts().then(d => setContacts(d.contacts || [])).catch(() => {
      kvGet("contacts_cache").then(v => { if (v) setContacts(v); });
    });
    getSOSAlerts().then(d => setAlerts(d.alerts || [])).catch(() => {
      dbGetAll("alert_history").then(setAlerts);
    });
    dbGetAll("offline_queue").then(q => setOfflineQueue(q.length));
    tryLoc();
    return () => {
      clearInterval(trackRef.current);
      clearInterval(coTimerRef.current);
      navigator.geolocation?.clearWatch(crashWatchRef.current);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setCbStatus({ sms: smsCB.isOpen, email: emailCB.isOpen });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const toast = useCallback((msg, sev="info") => {
    setSnack({ msg, sev });
    setTimeout(() => setSnack(null), 5500);
  }, []);

  const tryLoc = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(ll);
        lastGpsPos.current = ll;
        cachedReverseGeocode(ll[0], ll[1])
          .then(a => { setAddress(a); setCacheHits(h => h+1); })
          .catch(() => {});
        cachedNearbyHospitals(ll[0], ll[1])
          .then(n => { prefetchedNear.current = n; })
          .catch(() => {});
      },
      () => {},
      { enableHighAccuracy:true, timeout:8000 },
    );
  }, []);

  const toggleCrash = () => {
    if (crashOn) {
      setCrashOn(false);
      navigator.geolocation?.clearWatch(crashWatchRef.current);
      setCurrentSpeed(0); setMovingStatus("Idle");
      toast("Crash detection disabled.", "info");
    } else {
      setCrashOn(true);
      startCrashMonitor();
      toast("🛡️ Crash detection ON", "success");
    }
  };

  const startCrashMonitor = useCallback(() => {
    if (!navigator.geolocation) { toast("GPS unavailable.", "warning"); return; }
    crashWatchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const spd = pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed * 3.6 : 0;
        const now = Date.now();
        const ll  = [pos.coords.latitude, pos.coords.longitude];
        if (lastGpsPos.current) {
          const d = distKm(lastGpsPos.current[0],lastGpsPos.current[1],ll[0],ll[1]) * 1000;
          if (d > 5) { setUserPos(ll); lastGpsPos.current = ll; }
        } else { setUserPos(ll); lastGpsPos.current = ll; }
        setCurrentSpeed(Math.round(spd));
        setMovingStatus(spd > 4 ? "Moving 🟢" : "Stopped 🔴");
        speedHistory.current = [
          ...speedHistory.current.filter(s => now - s.ts < 10_000),
          { speed: spd, ts: now },
        ];
        checkCrash(spd);
      },
      () => {},
      { enableHighAccuracy:true, maximumAge:0 },
    );
  }, []);

  const checkCrash = speed => {
    if (crashTriggered.current) return;
    const hist = speedHistory.current;
    if (hist.length < 3) return;
    const recent = hist.filter(s => Date.now() - s.ts < 5_000 && s.speed > 40);
    if (!recent.length) return;
    const maxPrev = Math.max(...recent.map(s => s.speed));
    if (speed < 15 && maxPrev - speed > 35) {
      crashTriggered.current = true;
      beginCountdown();
    }
  };

  const beginCountdown = () => {
    setShowCountdown(true); setCoRemaining(30);
    window.speechSynthesis?.speak(Object.assign(
      new SpeechSynthesisUtterance("Crash detected! SOS auto-sends in 30 seconds."),
      { lang:"en-IN", rate:0.9 }
    ));
    navigator.vibrate?.([600,200,600,200,600]);
    let r = 30;
    coTimerRef.current = setInterval(() => {
      r -= 1; setCoRemaining(r);
      if (r <= 0) { clearInterval(coTimerRef.current); setShowCountdown(false); crashTriggered.current=false; handleSOS(true); }
    }, 1000);
  };

  const confirmSafe = () => {
    clearInterval(coTimerRef.current);
    setShowCountdown(false);
    crashTriggered.current = false;
    speedHistory.current = [];
    toast("✅ Confirmed safe.", "success");
  };

  const dispatchToChannel = useCallback(async ({ type, to, name, smsBody, emailPayload }) => {
    if (type === "sms") {
      try {
        await sendSMS(to, smsBody);
        return { ok:true, type:"sms" };
      } catch (err) {
        if (!navigator.onLine) await enqueueOffline({ type:"sms", to, smsBody });
        throw err;
      }
    }
    if (type === "email") {
      try {
        await sendEmail(to, name, emailPayload);
        return { ok:true, type:"email" };
      } catch (err) {
        if (!navigator.onLine) await enqueueOffline({ type:"email", to, name, emailPayload });
        throw err;
      }
    }
  }, []);

  const handleSOS = useCallback(async (isAuto = false) => {
    if (phase !== PHASE.IDLE) return;
    if (sosDedup.current) return;
    sosDedup.current = true;
    setTimeout(() => { sosDedup.current = false; }, 3000);

    setPhase(PHASE.LOCATING);
    setChannelStatus(p => ({ ...p, push:"Sending…" }));

    let lat  = userPos?.[0] ?? 31.1048;
    let lon  = userPos?.[1] ?? 77.1734;
    let addr = address;

    if (!addr && lat && lon) {
      try { addr = await cachedReverseGeocode(lat, lon); setAddress(addr); setCacheHits(h=>h+1); }
      catch {}
    }

    await new Promise(resolve => {
      const timer = setTimeout(resolve, 5000);
      navigator.geolocation?.getCurrentPosition(
        async pos => {
          clearTimeout(timer);
          lat = pos.coords.latitude; lon = pos.coords.longitude;
          setUserPos([lat, lon]); lastGpsPos.current = [lat, lon];
          try { addr = await cachedReverseGeocode(lat, lon); setAddress(addr); } catch {}
          resolve();
        },
        () => { clearTimeout(timer); resolve(); },
        { enableHighAccuracy:true, timeout:5000 },
      );
    });

    setPhase(PHASE.AI);

    const mapsLink = `https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`;
    const tag      = isAuto ? "[AUTO CRASH] " : "";
    const smsBody  =
      `🚨 ${tag}EMERGENCY SOS from ${userName}!\n` +
      `📍 ${mapsLink}\n` +
      `📌 ${addr || "HP Region"}\n` +
      `⚡ Speed: ~${currentSpeed} km/h\n` +
      `Please call immediately or send help!`;

    let res = null;
    const riskKey = `risk:${lat.toFixed(3)},${lon.toFixed(3)},${currentSpeed}`;
    const riskHit = riskCache.get(riskKey);

    if (riskHit) {
      res = riskHit; setCacheHits(h=>h+1);
      setChannelStatus(p => ({ ...p, push:"Cached ✓" }));
    } else {
      try {
        res = await withRetry(() => triggerSOS({
          user_name:userName, lat, lon, address:addr,
          speed:currentSpeed||60, weather:"1", roadType:"1",
          timeOfDay:String(new Date().getHours()>=20||new Date().getHours()<5?3:1),
          areaType:"0", vehicles:2, auto_crash:isAuto,
        }), 3, 300);
        riskCache.set(riskKey, res);
        setChannelStatus(p => ({ ...p, push:"Sent ✓" }));
      } catch (err) {
        toast(`Risk API error (${err.message}). Dispatching anyway.`, "warning");
        setChannelStatus(p => ({ ...p, push:"Fallback" }));
      }
    }

    const severity = res?.severity ?? (isAuto ? "3" : "2");
    setResult(res ?? { severity, risk_score: isAuto ? 82 : 55 });
    setPhase(PHASE.SENT);

    if (prefetchedNear.current?.length) {
      setNearby(prefetchedNear.current);
      setCacheHits(h=>h+1);
    } else if (res?.nearby?.length) {
      setNearby(res.nearby);
    } else {
      const fresh = await cachedNearbyHospitals(lat, lon);
      setNearby(fresh.length ? fresh : HP_HOSPITALS.map(h=>({...h,_d:distKm(lat,lon,h.lat,h.lon)})).sort((a,b)=>a._d-b._d).slice(0,6));
    }

    let smsSent = 0, emailSent = 0;
    const alertContacts = contacts.filter(c => c.phone || c.email);
    const emailPayload = {
      message:smsBody, lat, lon, severity:sevLabel(severity),
      riskScore:res?.risk_score??75, mapsLink, userName, speed:currentSpeed, isAutoCrash:isAuto,
    };

    const jobs = alertContacts.flatMap(c => {
      const tasks = [];
      if (c.phone) tasks.push(dispatchToChannel({ type:"sms",   to:c.phone, smsBody }));
      if (c.email) tasks.push(dispatchToChannel({ type:"email", to:c.email, name:c.name, emailPayload }));
      return tasks;
    });

    const results = await Promise.allSettled(jobs);
    results.forEach(r => {
      if (r.status === "fulfilled") {
        if (r.value?.type === "sms")   smsSent   += 1;
        if (r.value?.type === "email") emailSent += 1;
      }
    });

    setSentCounts({ sms:smsSent, email:emailSent });
    setChannelStatus(p => ({
      ...p,
      sms:   smsSent   > 0 ? `Sent (${smsSent})`   : smsCB.isOpen   ? "⚠ CB Open" : "Failed",
      email: emailSent > 0 ? `Sent (${emailSent})` : emailCB.isOpen ? "⚠ CB Open" : "Failed",
    }));
    setCbStatus({ sms:smsCB.isOpen, email:emailCB.isOpen });

    const alertRecord = { id:Date.now(), user_name:userName, severity, lat, lon, addr, ts:new Date().toISOString(), status:"active" };
    dbPut("alert_history", alertRecord);
    setAlerts(p => [alertRecord, ...p]);
    dbGetAll("offline_queue").then(q => setOfflineQueue(q.length));

    clearInterval(trackRef.current);
    trackRef.current = setInterval(() => {
      navigator.geolocation?.getCurrentPosition(pos => {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        if (!lastGpsPos.current || distKm(lastGpsPos.current[0],lastGpsPos.current[1],ll[0],ll[1]) > 0.005) {
          setUserPos(ll); lastGpsPos.current = ll;
        }
      });
    }, 5000);

    const riskLabel = severity==="3"?"High":severity==="2"?"Medium":"Low";
    window.speechSynthesis?.speak(Object.assign(
      new SpeechSynthesisUtterance(`SOS sent. Risk ${riskLabel}. ${smsSent} SMS, ${emailSent} emails dispatched.`),
      { lang:"en-IN" }
    ));
    toast(`🚨 SOS SENT! Risk: ${sevLabel(severity)} — ${smsSent} SMS, ${emailSent} emails.`, "error");
  }, [phase, userPos, address, contacts, currentSpeed, userName, dispatchToChannel]);

  const cancelSOS = () => {
    setPhase(PHASE.IDLE);
    clearInterval(trackRef.current);
    setResult(null); setNearby([]); setSentCounts({ sms:0, email:0 });
    setChannelStatus({ push:"Ready", sms:"Ready", email:"Ready", voice:"Standby", whatsapp:"Ready" });
    toast("SOS cancelled. Stay safe!", "success");
  };

  const shareWA = () => {
    const pos   = userPos ? `${userPos[0].toFixed(6)},${userPos[1].toFixed(6)}` : "unknown";
    const score = result?.risk_score?.toFixed(1) || "?";
    const msg   = encodeURIComponent(
      `🚨 SOS ALERT from ${userName}!\n📍 https://maps.google.com/?q=${pos}\n` +
      `📌 ${address||"HP Region"}\n🤖 Risk: ${sevLabel(result?.severity??"2")} (${score}/100)\n` +
      `⚡ Speed: ~${currentSpeed} km/h\nPlease call immediately!`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("Voice not supported.", "warning"); return; }
    const r = new SR();
    r.lang="en-IN"; r.continuous=false; r.interimResults=true;
    r.onstart  = () => setListening(true);
    r.onresult = e => setTranscript([...e.results].map(r=>r[0].transcript).join(" "));
    r.onend    = () => setListening(false);
    recognRef.current = r; r.start();
  };
  const stopVoice = () => { recognRef.current?.stop(); setListening(false); };

  const handleAddContact = async () => {
    if (!newC.name) { toast("Name required.", "warning"); return; }
    try {
      await addContact(newC);
      const d = await getContacts();
      setContacts(d.contacts || []);
      await kvSet("contacts_cache", d.contacts || []);
      setNewC({ name:"", phone:"", email:"", relation:"Family" });
      setAdding(false);
      toast("Contact added!", "success");
    } catch (e) { toast(`Failed: ${e.message}`, "error"); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ background:C.bg, minHeight:"calc(100vh - 58px)", fontFamily:C.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=DM+Sans:wght@400;600;700;800&display=swap');
      `}</style>

      <CrashOverlay show={showCountdown} remaining={coRemaining}
        onSafe={confirmSafe}
        onSendNow={() => { confirmSafe(); handleSOS(true); }}
      />

      {/* HEADER */}
      <Box sx={{ background:`linear-gradient(135deg,${C.red} 0%,${C.redDark} 100%)`, py:2.5, px:3 }}>
        <Container maxWidth="xl">
          <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:1 }}>
            <Box>
              <Typography variant="h5" sx={{ fontFamily:C.display, fontWeight:800, color:"#fff", letterSpacing:-0.5 }}>
                🚨 SafeSignal SOS
              </Typography>
              <Typography sx={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontFamily:C.mono, mt:0.2 }}>
                LRU Cache · IndexedDB Queue · Circuit Breakers · Retry · Prefetch
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <ConnectionStatus online={online} cacheHits={cacheHits} />
              {offlineQueue > 0 && (
                <Chip label={`${offlineQueue} queued`} icon={<CloudDone sx={{fontSize:12,color:"#fff !important"}}/>}
                  sx={{background:"rgba(255,255,255,0.2)",color:"#fff",fontWeight:700,fontSize:11,height:24}}/>
              )}
              {crashOn && (
                <Chip icon={<Speed sx={{fontSize:13,color:"#fff !important"}}/>}
                  label={`${currentSpeed} km/h`}
                  sx={{background:"rgba(255,255,255,0.18)",color:"#fff",fontWeight:700,fontFamily:C.mono,fontSize:12}}/>
              )}
              <Chip
                label={phase===PHASE.IDLE?"Ready":phase===PHASE.LOCATING?"Locating…":phase===PHASE.AI?"AI…":"🔴 ACTIVE"}
                sx={{
                  background:phase===PHASE.SENT?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.18)",
                  color:phase===PHASE.SENT?C.red:"#fff",
                  fontWeight:700, fontFamily:C.mono, fontSize:12,
                }}
              />
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py:3 }}>
        <Grid container spacing={3}>

          {/* LEFT */}
          <Grid item xs={12} md={5}>
            <Stack spacing={2.5}>

              {/* SOS Button */}
              <Card elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:3, background:C.surface, textAlign:"center", p:3 }}>
                <Typography sx={{ fontFamily:C.display, fontWeight:700, fontSize:18, mb:0.5 }}>Emergency SOS</Typography>
                <Typography sx={{ fontSize:12, color:C.muted, mb:3, lineHeight:1.65 }}>
                  GPS · AI risk · Multi-channel alerts · Offline queue · Auto-retry
                </Typography>
                <SOSButton phase={phase} onClick={() => handleSOS(false)} cbStatus={cbStatus} />
                {phase===PHASE.LOCATING && <Typography sx={{color:C.amber,mt:2,fontSize:12,fontFamily:C.mono}}>📍 Locking GPS…</Typography>}
                {phase===PHASE.AI       && <Typography sx={{color:C.blue, mt:2,fontSize:12,fontFamily:C.mono}}>🧠 AI scoring…</Typography>}
                {phase===PHASE.SENT && (
                  <Stack spacing={1.5} sx={{ mt:2.5 }}>
                    <Button variant="outlined" color="success" onClick={cancelSOS} sx={{borderRadius:20,fontWeight:600}}>
                      ✅ I'm Safe — Cancel SOS
                    </Button>
                    <Button variant="contained" onClick={shareWA} startIcon={<WhatsApp/>}
                      sx={{borderRadius:20,fontWeight:600,background:"#25D366","&:hover":{background:"#1DA851"}}}>
                      Share via WhatsApp
                    </Button>
                  </Stack>
                )}
              </Card>

              {/* Crash Detection */}
              <Card elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:3, background:C.surface }}>
                <CardContent>
                  <Box sx={{display:"flex",alignItems:"center",justifyContent:"space-between",mb:1.5}}>
                    <Box sx={{display:"flex",alignItems:"center",gap:1}}>
                      <Speed sx={{color:C.red,fontSize:18}}/>
                      <Typography sx={{fontWeight:600,fontSize:14}}>Auto Crash Detection</Typography>
                    </Box>
                    <Button variant={crashOn?"contained":"outlined"} color={crashOn?"success":"inherit"}
                      size="small" onClick={toggleCrash}
                      sx={{borderRadius:20,fontSize:11,minWidth:80,fontFamily:C.mono}}>
                      {crashOn ? "✅ ON" : "Enable"}
                    </Button>
                  </Box>
                  <Box sx={{display:"flex",alignItems:"center",gap:2,background:"#F8FAFF",borderRadius:2,p:1.5,mb:1.5}}>
                    <Box>
                      <Box sx={{display:"flex",alignItems:"baseline",gap:0.5}}>
                        <Typography sx={{fontFamily:C.mono,fontSize:32,fontWeight:500,lineHeight:1}}>
                          {crashOn ? currentSpeed : "—"}
                        </Typography>
                        <Typography sx={{fontSize:12,color:C.muted,fontFamily:C.mono}}>km/h</Typography>
                      </Box>
                      <Typography sx={{fontSize:12,color:C.muted,mt:0.5,fontFamily:C.mono}}>
                        {crashOn ? movingStatus : "Detection off"}
                      </Typography>
                    </Box>
                    <Box sx={{flex:1}}>
                      <Box sx={{height:6,background:C.border,borderRadius:4,overflow:"hidden"}}>
                        <Box sx={{
                          height:"100%", borderRadius:4,
                          width:`${Math.min((currentSpeed/120)*100,100)}%`,
                          background: currentSpeed>80?C.red:currentSpeed>40?C.amber:C.green,
                          transition:"width 0.5s ease, background 0.3s",
                        }}/>
                      </Box>
                      <Typography sx={{fontSize:10,color:C.muted,mt:0.5,fontFamily:C.mono}}>0 ——— 120 km/h</Typography>
                    </Box>
                  </Box>
                  <Typography sx={{fontSize:12,color:C.muted,lineHeight:1.7}}>
                    Auto-sends SOS on &gt;35 km/h drop within 5 s. <strong>30 s</strong> to confirm safety.
                  </Typography>
                </CardContent>
              </Card>

              {/* Channel Status */}
              <Card elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:3, background:C.surface }}>
                <CardContent>
                  <Typography sx={{fontWeight:700,fontSize:11,mb:1.5,fontFamily:C.mono,color:C.muted,textTransform:"uppercase",letterSpacing:0.9}}>
                    Alert Channels
                  </Typography>
                  <ChannelRow label="Push (FCM)"      status={channelStatus.push}     cbOpen={false} />
                  <ChannelRow label="Twilio SMS"      status={channelStatus.sms}      cbOpen={cbStatus.sms} />
                  <ChannelRow label="Gmail email"     status={channelStatus.email}    cbOpen={cbStatus.email} />
                  <ChannelRow label="Voice fallback"  status={channelStatus.voice}    cbOpen={false} />
                  <ChannelRow label="WhatsApp"        status={channelStatus.whatsapp} cbOpen={false} />
                  {offlineQueue > 0 && (
                    <Box sx={{mt:1.5,p:1,background:C.amberLight,borderRadius:2,border:`1px solid rgba(180,83,9,0.2)`}}>
                      <Typography sx={{fontSize:11,color:C.amber,fontFamily:C.mono}}>
                        ⚠ {offlineQueue} alert(s) in offline queue
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Voice SOS */}
              <Card elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:3, background:C.surface }}>
                <CardContent>
                  <Typography sx={{fontWeight:600,mb:0.5}}>🎤 Voice SOS</Typography>
                  <Typography sx={{fontSize:12,color:C.muted,mb:1.5}}>
                    Speak your emergency — transcribed and sent with GPS.
                  </Typography>
                  <Button fullWidth variant={listening?"contained":"outlined"} color="error"
                    startIcon={listening?<MicOff/>:<Mic/>}
                    onClick={listening?stopVoice:startVoice}
                    sx={{borderRadius:20,fontWeight:600,mb:1.5}}>
                    {listening ? "🔴 Listening…" : "Start Voice SOS"}
                  </Button>
                  {transcript && (
                    <Box sx={{background:"#F0F4FF",borderRadius:2,p:1.5,mb:1.5}}>
                      <Typography sx={{fontSize:12,color:"#1A1A1A",lineHeight:1.55}}>{transcript}</Typography>
                    </Box>
                  )}
                  {transcript && !listening && (
                    <Button fullWidth variant="contained" color="error" onClick={() => handleSOS(false)}
                      sx={{borderRadius:20,fontWeight:600}}>🚨 Send SOS with message</Button>
                  )}
                </CardContent>
              </Card>

              {/* AI Risk */}
              {result && (
                <Card elevation={0} sx={{ border:`2px solid ${sevColor(result.severity)}44`, borderRadius:3, background:C.surface }}>
                  <CardContent>
                    <Typography sx={{fontFamily:C.display,fontWeight:700,fontSize:16,mb:2}}>🧠 AI Risk Assessment</Typography>
                    <Grid container spacing={1.5} sx={{mb:1.5}}>
                      {[
                        ["Risk Score", `${result.risk_score?.toFixed(1)??"—"}/100`, sevColor(result.severity)],
                        ["Severity",   sevLabel(result.severity),                   sevColor(result.severity)],
                      ].map(([k,v,clr]) => (
                        <Grid item xs={6} key={k}>
                          <Box sx={{textAlign:"center",background:"#F8FAFF",border:`1px solid ${clr}33`,borderRadius:2,p:1.5}}>
                            <Typography sx={{fontFamily:C.mono,fontSize:22,fontWeight:500,color:clr}}>{v}</Typography>
                            <Typography sx={{fontSize:11,color:C.muted,mt:0.3}}>{k}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                    <LinearProgress variant="determinate" value={Math.min(result.risk_score??0,100)}
                      sx={{height:8,borderRadius:4,background:"#F0F4FF",mb:2,
                        "& .MuiLinearProgress-bar":{background:sevColor(result.severity),borderRadius:4},
                      }}/>
                    <Stack spacing={0.5}>
                      <Typography sx={{fontSize:12,color:C.green}}>📱 {sentCounts.sms} SMS sent via Twilio</Typography>
                      <Typography sx={{fontSize:12,color:C.blue}}>📧 {sentCounts.email} Emails sent via Gmail</Typography>
                      <Typography sx={{fontSize:11,color:C.muted,fontFamily:C.mono}}>
                        🗄 Cache hits: {cacheHits}
                      </Typography>
                      {sentCounts.sms===0 && sentCounts.email===0 && (
                        <Button size="small" startIcon={<Email/>} onClick={()=>setGmailOpen(true)}
                          sx={{mt:0.5,fontSize:11,color:C.red,justifyContent:"flex-start",p:0}}>
                          Fix Gmail / Twilio setup →
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Location */}
              <Card elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:3, background:C.surface }}>
                <CardContent>
                  <Box sx={{display:"flex",alignItems:"center",gap:1,mb:1.5}}>
                    <LocationOn sx={{color:C.red,fontSize:20}}/>
                    <Typography sx={{fontWeight:600}}>Your Location</Typography>
                    <Button size="small" onClick={tryLoc} startIcon={<MyLocation/>} sx={{ml:"auto",borderRadius:20,fontSize:11}}>
                      Refresh
                    </Button>
                  </Box>
                  {userPos
                    ? <>
                        <Typography sx={{fontSize:13,color:C.blue,fontFamily:C.mono,mb:0.5}}>
                          {userPos[0].toFixed(6)}, {userPos[1].toFixed(6)}
                        </Typography>
                        {address && <Typography sx={{fontSize:12,color:C.muted,lineHeight:1.5}}>{address.slice(0,90)}…</Typography>}
                      </>
                    : <Typography sx={{fontSize:13,color:C.muted,fontFamily:C.mono}}>Waiting for GPS…</Typography>
                  }
                  <TextField label="Your name" value={userName} size="small" fullWidth sx={{mt:1.5}}
                    onChange={e => { setUserName(e.target.value); localStorage.setItem("ic_username",e.target.value); }}/>
                </CardContent>
              </Card>

              {/* Quick Calls */}
              <Card elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:3, background:C.surface }}>
                <CardContent>
                  <Box sx={{display:"flex",alignItems:"center",gap:1,mb:1.5}}>
                    <Phone sx={{color:C.red,fontSize:18}}/><Typography sx={{fontWeight:600}}>Quick Calls</Typography>
                  </Box>
                  <Grid container spacing={1}>
                    {[["🚑 Ambulance","108",C.red],["👮 Police","100",C.blue],["🚒 Fire","101",C.amber],["⛑️ Relief","1077",C.green]].map(([l,n,clr])=>(
                      <Grid item xs={6} key={n}>
                        <Button component="a" href={`tel:${n}`} variant="outlined" fullWidth size="small"
                          sx={{borderColor:clr,color:clr,borderRadius:2,fontWeight:600,fontSize:12,"&:hover":{background:`${clr}10`}}}>
                          {l}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>

            </Stack>
          </Grid>

          {/* RIGHT */}
          <Grid item xs={12} md={7}>
            <Stack spacing={2.5}>

              {/* Map */}
              <Card elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:3, overflow:"hidden" }}>
                <Box sx={{ height:340 }}>
                  <MapContainer center={userPos||[31.1048,77.1734]} zoom={13} style={{height:"100%",width:"100%"}}>
                    {userPos && <MapController center={userPos}/>}
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OSM contributors"/>
                    {userPos && <Marker position={userPos} icon={userPinIcon}><Popup><strong>🚨 You</strong><br/>{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</Popup></Marker>}
                    {userPos && phase===PHASE.SENT && <Circle center={userPos} radius={600} pathOptions={{color:C.red,fillColor:C.red,fillOpacity:0.06,weight:1.5}}/>}
                    {nearby.map((n,i)=>(
                      <Marker key={i} position={[n.lat,n.lon]} icon={nearbyIcon(n.type)}>
                        <Popup><strong>{n.name}</strong><br/>{n.type?.replace(/_/g," ")}{n.phone&&<><br/>📞 {n.phone}</>}{n._d&&<><br/>📍 {n._d.toFixed(1)} km</>}</Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </Box>
                {nearby.length>0 && (
                  <Alert severity="info" sx={{borderRadius:0,fontSize:11,fontFamily:C.mono}}>
                    📍 {nearby.length} nearest HP emergency services
                  </Alert>
                )}
              </Card>

              {/* Nearby Services */}
              {nearby.length>0 && (
                <Card elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:3, background:C.surface }}>
                  <CardContent>
                    <Typography sx={{fontWeight:700,mb:1.5,fontFamily:C.display}}>🏥 Nearby Services ({nearby.length})</Typography>
                    {nearby.map((n,i)=>(
                      <Box key={i} sx={{display:"flex",alignItems:"center",gap:1.5,p:1,mb:0.5,background:"#F8FAFF",borderRadius:2}}>
                        <Avatar sx={{background:nColor(n.type),width:34,height:34,fontSize:16}}>{nEmoji(n.type)}</Avatar>
                        <Box sx={{flex:1}}>
                          <Typography sx={{fontSize:13,fontWeight:600}}>{n.name}</Typography>
                          <Typography sx={{fontSize:11,color:C.muted,textTransform:"capitalize"}}>
                            {n.type?.replace(/_/g," ")}{n._d?` · ${n._d.toFixed(1)} km`:""}
                          </Typography>
                        </Box>
                        {n.phone && <Button component="a" href={`tel:${n.phone}`} size="small" variant="outlined" color="success" sx={{fontSize:10,borderRadius:20,minWidth:52}}>Call</Button>}
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Contacts */}
              <Card elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:3, background:C.surface }}>
                <CardContent>
                  <Box sx={{display:"flex",justifyContent:"space-between",alignItems:"center",mb:1.5}}>
                    <Box sx={{display:"flex",alignItems:"center",gap:1}}>
                      <Person sx={{color:C.blue,fontSize:20}}/>
                      <Typography sx={{fontWeight:700}}>Emergency Contacts ({contacts.length})</Typography>
                    </Box>
                    <Button size="small" variant="contained" startIcon={<Add/>} onClick={()=>setAdding(p=>!p)} sx={{borderRadius:20,fontSize:11}}>
                      {adding?"Cancel":"+ Add"}
                    </Button>
                  </Box>
                  <Collapse in={adding}>
                    <Box sx={{background:"#F0F4FF",border:"1px solid #C7D7F5",borderRadius:2,p:2,mb:1.5}}>
                      <Grid container spacing={1.5}>
                        {[{f:"name",l:"Name *"},{f:"phone",l:"Phone"},{f:"email",l:"Email"},{f:"relation",l:"Relation"}].map(({f,l})=>(
                          <Grid item xs={6} key={f}>
                            <TextField size="small" fullWidth label={l} value={newC[f]}
                              onChange={e=>setNewC(p=>({...p,[f]:e.target.value}))}/>
                          </Grid>
                        ))}
                      </Grid>
                      <Button variant="contained" onClick={handleAddContact} sx={{mt:1.5,borderRadius:20,fontWeight:600}}>Save Contact</Button>
                    </Box>
                  </Collapse>
                  {contacts.length===0 && !adding && (
                    <Typography sx={{fontSize:13,color:C.muted,textAlign:"center",py:2}}>
                      Add contacts — they'll receive SOS SMS + email alerts.
                    </Typography>
                  )}
                  {contacts.map(c=>(
                    <Box key={c.id} sx={{display:"flex",alignItems:"center",gap:1.5,p:1,mb:0.5,background:"#F8FAFF",borderRadius:2}}>
                      <Avatar sx={{background:C.blue,width:34,height:34,fontSize:13,fontWeight:600}}>
                        {c.name?.[0]?.toUpperCase()||"?"}
                      </Avatar>
                      <Box sx={{flex:1}}>
                        <Typography sx={{fontSize:13,fontWeight:600}}>
                          {c.name} <Chip label={c.relation} size="small" sx={{height:16,fontSize:9,ml:0.5}}/>
                        </Typography>
                        <Typography sx={{fontSize:11,color:C.muted}}>
                          {[c.phone,c.email].filter(Boolean).join(" · ")}
                        </Typography>
                      </Box>
                      <IconButton size="small" sx={{color:C.red}}
                        onClick={()=>deleteContact(c.id).then(()=>setContacts(p=>p.filter(x=>x.id!==c.id)))}>
                        <Delete fontSize="small"/>
                      </IconButton>
                    </Box>
                  ))}
                </CardContent>
              </Card>

              {/* Alert History */}
              {alerts.length>0 && (
                <Card elevation={0} sx={{ border:`1px solid ${C.border}`, borderRadius:3, background:C.surface }}>
                  <CardContent>
                    <Typography sx={{fontWeight:700,mb:1.5,fontFamily:C.display}}>📋 Alert History</Typography>
                    {alerts.slice(0,5).map((a,i)=>(
                      <Box key={a.id||i} sx={{display:"flex",alignItems:"center",gap:1.5,p:1,mb:0.5,background:"#F8FAFF",borderRadius:2}}>
                        <Box sx={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:a.status==="active"?C.red:C.green}}/>
                        <Box sx={{flex:1}}>
                          <Typography sx={{fontSize:12,fontWeight:600}}>
                            {a.user_name||userName} — <span style={{color:sevColor(a.severity)}}>{sevLabel(a.severity)}</span>
                          </Typography>
                          <Typography sx={{fontSize:11,color:C.muted,fontFamily:C.mono}}>
                            {(a.timestamp||a.ts)?.slice(0,19).replace("T"," ")}
                          </Typography>
                        </Box>
                        {a.status==="active"
                          ? <Button size="small" variant="outlined" color="success"
                              onClick={()=>resolveSOSAlert(a.id).then(()=>{setAlerts(p=>p.map(x=>x.id===a.id?{...x,status:"resolved"}:x)); if(phase===PHASE.SENT)cancelSOS();})}
                              sx={{fontSize:10,borderRadius:20,minWidth:68}}>Resolve</Button>
                          : <Chip label="✓ Safe" size="small" color="success" sx={{fontSize:10}}/>
                        }
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              )}

            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* Gmail/Twilio Dialog */}
      <Dialog open={gmailOpen} onClose={()=>setGmailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{fontFamily:C.display,fontWeight:700}}>📧 Fix Gmail + Twilio Setup</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{mb:2}}>
            Backend <code>server.js</code> must be running on port 3001.
          </Alert>
          {[
            {title:"Gmail",steps:[
              "myaccount.google.com → Security",
              "Enable 2-Step Verification",
              "Search 'App passwords' → Create → Mail",
              "Copy 16-char code",
              "Set GMAIL_USER + GMAIL_PASS in .env",
            ]},
            {title:"Twilio SMS",steps:[
              "Sign up at twilio.com/try-twilio",
              "Get Account SID + Auth Token from Console",
              "Buy or use trial phone number",
              "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in .env",
              "node server.js in the sos-server folder",
            ]},
          ].map(({title,steps})=>(
            <Box key={title}>
              <Typography sx={{fontWeight:700,mt:2,mb:1,fontSize:14}}>{title}</Typography>
              {steps.map((s,i)=>(
                <Box key={i} sx={{display:"flex",gap:1.5,mb:1,alignItems:"flex-start"}}>
                  <Chip label={`Step ${i+1}`} size="small" sx={{fontWeight:700,fontSize:10,flexShrink:0}}/>
                  <Typography sx={{fontSize:13}}>{s}</Typography>
                </Box>
              ))}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>window.open("https://myaccount.google.com/apppasswords","_blank")}>Google App Passwords</Button>
          <Button onClick={()=>window.open("https://www.twilio.com/try-twilio","_blank")}>Twilio Sign Up</Button>
          <Button onClick={()=>setGmailOpen(false)} variant="contained">Got it</Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      {snack && (
        <Snackbar open autoHideDuration={5500} onClose={()=>setSnack(null)}
          anchorOrigin={{vertical:"top",horizontal:"center"}}>
          <Alert severity={snack.sev} variant="filled" sx={{fontWeight:600}}>{snack.msg}</Alert>
        </Snackbar>
      )}
    </Box>
  );
}
