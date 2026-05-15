// ================================================================
// server.js — SafeSignal SOS  v8  REAL GPS  (Twilio SMS + Gmail only)
// ✅ FIXED: Removed Infobip WhatsApp — only Twilio SMS + Gmail active
//           No more hardcoded lat/lon fallback
//           All coord defaults removed — client MUST send real GPS
// ================================================================
"use strict";
require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const path    = require("path");
const https   = require("https");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "build")));

// ── ENV ───────────────────────────────────────────────────────────
const {
  TWILIO_SID,
  TWILIO_TOKEN,
  TWILIO_FROM,
  TWILIO_MESSAGING_SERVICE_SID,

  GMAIL_USER,
  GMAIL_PASS,

  ADMIN_PHONE,
  ADMIN_EMAIL,

  PORT = 3001,
} = process.env;

// ── Boot status ───────────────────────────────────────────────────
function bootCheck() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SafeSignal SOS v8 — Channel Status");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Twilio SMS   : ${TWILIO_SID && TWILIO_TOKEN && (TWILIO_FROM || TWILIO_MESSAGING_SERVICE_SID)
    ? "✅ READY  " + (TWILIO_FROM ? "from=" + TWILIO_FROM : "msgService=" + TWILIO_MESSAGING_SERVICE_SID)
    : "❌ MISSING — check TWILIO_SID / TWILIO_TOKEN / TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID"}`);
  console.log(`  Gmail        : ${GMAIL_USER && GMAIL_PASS
    ? "✅ READY  user=" + GMAIL_USER
    : "❌ MISSING — check GMAIL_USER / GMAIL_PASS"}`);
  console.log(`  Admin Phone  : ${ADMIN_PHONE || "⚠️  NOT SET"}`);
  console.log(`  Admin Email  : ${ADMIN_EMAIL || "⚠️  NOT SET"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// ── Number helpers ────────────────────────────────────────────────
function toDigits(num) {
  if (!num) return null;
  return String(num).replace(/\D/g, "") || null;
}
function toE164(num) {
  const d = toDigits(num);
  return d ? "+" + d : null;
}

// ── Circular in-memory log ────────────────────────────────────────
const sosLog = [];
function appendLog(entry) {
  if (sosLog.length >= 200) sosLog.shift();
  sosLog.push({ ts: Date.now(), ...entry });
}

// ── Haversine distance (km) ───────────────────────────────────────
function haversine(la1, lo1, la2, lo2) {
  const R = 6371, dL = (la2-la1)*Math.PI/180, dO = (lo2-lo1)*Math.PI/180;
  const a = Math.sin(dL/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)**2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

// ── Validate that coords look real (not zero, not outside HP) ──
function validateCoords(lat, lon) {
  const la = parseFloat(lat);
  const lo = parseFloat(lon);

  if (isNaN(la) || isNaN(lo))       return "lat/lon are required and must be numbers";
  if (la === 0   && lo === 0)        return "lat/lon are (0,0) — GPS not acquired";

  // Himachal Pradesh bounding box (generous)
  if (la < 30.2 || la > 33.2)       return `lat ${la} is outside Himachal Pradesh`;
  if (lo < 75.5 || lo > 79.0)       return `lon ${lo} is outside Himachal Pradesh`;

  return null; // valid
}

// ── HP Hospital DB ────────────────────────────────────────────────
const HOSPITALS = [
  { name:"IGMC Shimla",           type:"hospital", phone:"0177-2804251", lat:31.1048, lon:77.1734 },
  { name:"DDU Hospital Shimla",   type:"hospital", phone:"0177-2656190", lat:31.1100, lon:77.1650 },
  { name:"Kamla Nehru Hospital",  type:"hospital", phone:"0177-2620210", lat:31.0990, lon:77.1800 },
  { name:"Civil Hospital Solan",  type:"hospital", phone:"01792-223001", lat:30.9045, lon:77.0967 },
  { name:"RH Sundernagar",        type:"hospital", phone:"01907-265060", lat:31.5337, lon:76.8833 },
  { name:"Zonal Hosp Mandi",      type:"hospital", phone:"01905-235252", lat:31.7080, lon:76.9318 },
  { name:"Civil Hosp Kullu",      type:"hospital", phone:"01902-222340", lat:32.0985, lon:77.1090 },
  { name:"RH Dharamshala",        type:"hospital", phone:"01892-224498", lat:32.2188, lon:76.3225 },
  { name:"Civil Hosp Bilaspur",   type:"hospital", phone:"01978-222264", lat:31.3423, lon:76.7570 },
  { name:"Civil Hosp Hamirpur",   type:"hospital", phone:"01972-222029", lat:31.6862, lon:76.5214 },
  { name:"Civil Hosp Una",        type:"hospital", phone:"01975-226100", lat:31.4660, lon:76.2699 },
  { name:"HP Police (112)",       type:"police",   phone:"112",          lat:31.1048, lon:77.1734 },
  { name:"HP Ambulance (108)",    type:"ambulance",phone:"108",          lat:31.1048, lon:77.1734 },
  { name:"Fire Brigade (101)",    type:"fire",     phone:"101",          lat:31.1048, lon:77.1734 },
  { name:"Disaster Relief",       type:"rescue",   phone:"1070",         lat:31.1048, lon:77.1734 },
];

function nearestHospitals(lat, lon, limit = 6) {
  return HOSPITALS
    .map(h => ({ ...h, dist: haversine(lat, lon, h.lat, h.lon) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);
}

// ── Background fire-and-forget ────────────────────────────────────
function bg(label, fn) {
  setImmediate(() =>
    fn().catch(e => console.error(`[BG ERR][${label}]`, e.message))
  );
}

// ══════════════════════════════════════════════════════════════════
//  1. TWILIO SMS
// ══════════════════════════════════════════════════════════════════
async function sendSMS(rawTo, text) {
  const to = toE164(rawTo);
  if (!TWILIO_SID || !TWILIO_TOKEN || (!TWILIO_FROM && !TWILIO_MESSAGING_SERVICE_SID)) {
    console.warn(`[SMS SKIP] Twilio not configured — to=${to}`);
    return;
  }
  if (!to) { console.warn("[SMS SKIP] Bad number:", rawTo); return; }

  const params = { To: to, Body: text };
  if (TWILIO_FROM) params.From = TWILIO_FROM;
  else if (TWILIO_MESSAGING_SERVICE_SID) params.MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;

  const body = new URLSearchParams(params).toString();
  const auth  = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.twilio.com",
      path:     `/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      method:   "POST",
      headers: {
        "Authorization":  `Basic ${auth}`,
        "Content-Type":   "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    }, res => {
      let raw = "";
      res.on("data", d => raw += d);
      res.on("end", () => {
        let parsed = {};
        try { parsed = JSON.parse(raw); } catch {}
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ [Twilio SMS] to=${to} sid=${parsed.sid}`);
          resolve(parsed);
        } else {
          const msg = `Twilio ${res.statusCode} code=${parsed.code} — ${parsed.message}`;
          console.error(`❌ [Twilio SMS] to=${to} | ${msg}`);
          reject(new Error(msg));
        }
      });
    });
    req.on("error", e => { console.error(`❌ [Twilio SMS] network: ${e.message}`); reject(e); });
    req.write(body);
    req.end();
  });
}

// ══════════════════════════════════════════════════════════════════
//  2. GMAIL EMAIL
// ══════════════════════════════════════════════════════════════════
let _mailer = null;
function getMailer() {
  if (_mailer) return _mailer;
  if (GMAIL_USER && GMAIL_PASS) {
    try {
      _mailer = require("nodemailer").createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
        pool: true,
        maxConnections: 5,
      });
    } catch (e) {
      console.warn("⚠️  [Gmail] createTransport failed:", e.message);
    }
  }
  return _mailer;
}

function buildEmailHtml(d) {
  const sc   = d.severity === "HIGH" ? "#E8284A" : d.severity === "MEDIUM" ? "#D97706" : "#1A9B5E";
  const risk = parseFloat(d.riskScore || 0);
  const map  = d.mapsLink || `https://maps.google.com/?q=${d.lat},${d.lon}`;
  const bang = d.isAutoCrash
    ? `<div style="background:#FFF0F3;border-left:4px solid #E8284A;padding:12px 16px;border-radius:8px;margin-bottom:18px;font-weight:700;color:#E8284A;">💥 AUTO CRASH DETECTED — Vehicle speed dropped suddenly</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#F4F6FA;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:580px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E4E8F0;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#E8284A 0%,#9B1C1C 100%);padding:32px;text-align:center;">
    <div style="font-size:52px;margin-bottom:8px;">🚨</div>
    <h1 style="color:#FFFFFF;font-size:26px;margin:0;font-weight:900;letter-spacing:0.08em;">EMERGENCY SOS ALERT</h1>
    <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:12px;font-family:monospace;">SafeSignal · IntelliCrash Emergency System</p>
  </div>
  <div style="padding:28px 32px;">
    ${bang}
    <table style="width:100%;border-collapse:separate;border-spacing:0;margin-bottom:20px;">
      <tr>
        <td style="padding:14px 16px;background:#F8F9FC;border-radius:10px 0 0 10px;border:1px solid #E4E8F0;width:50%;vertical-align:top;">
          <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Sender</div>
          <div style="font-weight:800;font-size:18px;color:#111827;">${d.userName || "Unknown"}</div>
        </td>
        <td style="padding:14px 16px;background:${sc}0F;border-radius:0 10px 10px 0;border:1px solid ${sc}33;width:50%;text-align:right;vertical-align:top;">
          <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Risk Level</div>
          <div style="font-weight:900;font-size:22px;color:${sc};">${d.severity || "UNKNOWN"}</div>
        </td>
      </tr>
    </table>
    <div style="background:#F8F9FC;border-radius:10px;padding:14px 16px;margin-bottom:16px;border:1px solid #E4E8F0;">
      <div style="font-size:10px;color:#6B7280;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.1em;">Risk Score</div>
      <div style="background:#E4E8F0;border-radius:4px;height:8px;overflow:hidden;">
        <div style="width:${Math.min(risk,100)}%;background:${sc};height:100%;border-radius:4px;"></div>
      </div>
      <div style="font-size:12px;color:#6B7280;margin-top:6px;font-family:monospace;">${risk.toFixed(1)} / 100${d.speed ? ` · Speed: ~${d.speed} km/h` : ""}</div>
    </div>
    <div style="background:#F8F9FC;border-radius:10px;padding:14px 16px;margin-bottom:16px;border:1px solid #E4E8F0;">
      <div style="font-size:10px;color:#6B7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.1em;">GPS Location</div>
      <div style="font-size:13px;color:#374151;font-family:monospace;">
        Lat: <strong>${d.lat}</strong> · Lon: <strong>${d.lon}</strong>
        ${d.gpsAccuracy ? `<br/><span style="color:#6B7280;font-size:11px;">Accuracy: ±${d.gpsAccuracy}m</span>` : ""}
      </div>
    </div>
    <div style="background:#F8F9FC;border-radius:10px;padding:14px 16px;margin-bottom:20px;border:1px solid #E4E8F0;">
      <div style="font-size:10px;color:#6B7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.1em;">Message</div>
      <div style="font-size:13px;color:#374151;line-height:1.75;">${d.message || "Emergency SOS triggered"}</div>
    </div>
    <a href="${map}" style="display:block;background:#2563EB;color:#FFFFFF;text-align:center;padding:16px;border-radius:10px;text-decoration:none;font-weight:800;font-size:15px;margin-bottom:20px;">
      📍 OPEN LIVE LOCATION IN GOOGLE MAPS
    </a>
    <table style="width:100%;border-collapse:separate;border-spacing:6px;margin-bottom:16px;">
      <tr>
        ${[["🚨","Emergency","112"],["🚑","Ambulance","108"],["🔥","Fire","101"],["⛑️","Disaster","1070"]].map(([e,l,n]) =>
          `<td style="width:25%;background:#F8F9FC;border:1px solid #E4E8F0;border-radius:8px;padding:10px;text-align:center;">
            <div style="font-size:20px;">${e}</div>
            <div style="font-size:10px;color:#6B7280;margin-top:2px;">${l}</div>
            <div style="font-weight:700;font-size:13px;color:#111827;">${n}</div>
          </td>`).join("")}
      </tr>
    </table>
    <div style="font-size:11px;color:#9CA3AF;text-align:center;line-height:1.8;border-top:1px solid #E4E8F0;padding-top:16px;">
      Sent by <strong style="color:#374151;">SafeSignal SOS</strong> ·
      Please call <strong style="color:#111827;">${d.userName || "sender"}</strong> immediately<br/>
      This is an automated emergency alert.
    </div>
  </div>
</div>
</body></html>`;
}

async function sendEmail(to, subject, data) {
  const m = getMailer();
  if (!m)  { console.warn(`[EMAIL SKIP] Gmail not configured — to=${to}`); return; }
  if (!to) { console.warn("[EMAIL SKIP] No recipient"); return; }
  try {
    const info = await m.sendMail({
      from:    `"SafeSignal SOS 🚨" <${GMAIL_USER}>`,
      to,
      subject,
      text:    data.message || "Emergency SOS triggered",
      html:    buildEmailHtml(data),
    });
    console.log(`✅ [Gmail] to=${to} messageId=${info.messageId}`);
    return info;
  } catch (e) {
    console.error(`❌ [Gmail] to=${to}: ${e.message}`);
    throw e;
  }
}

// ══════════════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════════════

// ── POST /api/sos ─────────────────────────────────────────────────
app.post("/api/sos", (req, res) => {
  const {
    lat,
    lon,
    gpsAccuracy,
    userName,
    severity       = "HIGH",
    riskScore      = 50,
    priorityScore  = 0,
    message,
    speed,
    isAutoCrash,
    mapsLink,
    contacts       = [],
    voiceTranscript,
    broadcastNearby,
    nearestHospital,
  } = req.body;

  // ── Validate GPS coords ────────────────────────────────────────
  const coordError = validateCoords(lat, lon);
  if (coordError) {
    console.error(`[SOS REJECTED] Bad coords: lat=${lat} lon=${lon} — ${coordError}`);
    return res.status(400).json({
      ok: false,
      error: `Invalid location: ${coordError}. Please ensure GPS is enabled and try again.`,
      code:  "GPS_REQUIRED",
    });
  }

  const la = parseFloat(lat);
  const lo = parseFloat(lon);

  console.log(`[SOS] ✅ Real GPS: ${la.toFixed(5)}, ${lo.toFixed(5)} ±${gpsAccuracy || "?"}m`);
  console.log(`[SOS] Priority Score: ${priorityScore || "N/A"} | Severity: ${severity} | Risk: ${riskScore}`);
  if (voiceTranscript) console.log(`[SOS] 🎙️ Voice SOS: "${voiceTranscript}"`);
  if (broadcastNearby) console.log(`[SOS] 📡 Nearby broadcast requested`);

  appendLog({ lat: la, lon: lo, gpsAccuracy, userName, severity, riskScore, priorityScore, isAutoCrash, voiceTranscript, ts: new Date().toISOString() });

  const hospitals = nearestHospitals(la, lo);

  // Instant ACK
  res.json({ ok: true, queued: true, hospitals, alertCount: contacts.length, priorityScore });

  const mapUrl  = mapsLink || `https://maps.google.com/?q=${la},${lo}`;
  const accText = gpsAccuracy ? ` (±${gpsAccuracy}m)` : "";
  const voiceNote = voiceTranscript ? `\n🎙️ Voice: "${voiceTranscript}"` : "";
  const priorityTag = priorityScore ? ` | Priority: ${priorityScore}` : "";
  const smsBody = `🚨 SOS from ${userName || "Unknown"} | Risk: ${severity}${priorityTag} | Speed: ${speed || 0} km/h${voiceNote}\nGPS${accText}: ${la.toFixed(5)},${lo.toFixed(5)}\nNearby: ${nearestHospital || "HP Emergency"}\nMap: ${mapUrl}\nCall 112 NOW!`;
  const subject = `🚨 SOS from ${userName || "Unknown"} — ${severity} Risk (Priority: ${priorityScore || "N/A"})`;

  // Notify all contacts via SMS + Email
  for (const c of contacts) {
    if (c.phone) bg(`SMS→${c.phone}`, () => sendSMS(c.phone, smsBody));
    if (c.email) bg(`Email→${c.email}`, () => sendEmail(c.email, subject, { ...req.body, lat: la, lon: lo, mapsLink: mapUrl }));
  }

  // Admin fallback (HP Ambulance + Admin)
  if (ADMIN_PHONE) bg("SMS→admin",   () => sendSMS(ADMIN_PHONE, smsBody));
  if (ADMIN_EMAIL) bg("Email→admin", () => sendEmail(ADMIN_EMAIL, subject, { ...req.body, lat: la, lon: lo, mapsLink: mapUrl }));

  // Log nearby broadcast request
  if (broadcastNearby) {
    console.log(`[SOS BROADCAST] Nearby alert requested — ${la.toFixed(4)}, ${lo.toFixed(4)}`);
    // Future: send via WebSocket/push to nearby connected drivers
  }
});


// ── POST /api/send-sms ────────────────────────────────────────────
app.post("/api/send-sms", (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "to and message required" });
  res.json({ ok: true, queued: true });
  bg("SMS→manual", () => sendSMS(to, message));
});

// ── POST /api/send-email ──────────────────────────────────────────
app.post("/api/send-email", (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: "to required" });
  res.json({ ok: true, queued: true });
  const sub = `🚨 SOS from ${req.body.userName || "Unknown"} — ${req.body.severity || "UNKNOWN"} Risk`;
  bg("Email→manual", () => sendEmail(to, sub, req.body));
});

// ── GET /api/nearby ───────────────────────────────────────────────
app.get("/api/nearby", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  const coordError = validateCoords(lat, lon);
  if (coordError) {
    return res.status(400).json({ error: `Invalid location: ${coordError}`, code: "GPS_REQUIRED" });
  }

  try {
    const { default: fetch } = await import("node-fetch");
    const r = await Promise.race([
      fetch(`http://127.0.0.1:8000/api/nearby?lat=${lat}&lon=${lon}`),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 2000)),
    ]);
    return res.json(await r.json());
  } catch {
    const nearby = nearestHospitals(lat, lon);
    return res.json({ nearby, count: nearby.length, source: "static_db" });
  }
});

// ── GET /api/health ───────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    ok:          true,
    version:     "v8-sms-email-only",
    ts:          new Date().toISOString(),
    uptime_s:    Math.round(process.uptime()),
    twilio_sms:  !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM),
    twilio_from: TWILIO_FROM  || "NOT SET",
    gmail:       !!getMailer(),
    gmail_user:  GMAIL_USER   || "NOT SET",
    admin_phone: ADMIN_PHONE  || "NOT SET",
    admin_email: ADMIN_EMAIL  || "NOT SET",
    hospital_db: HOSPITALS.length,
    gps_policy:  "client_must_send_real_coords — no server fallback",
  });
});

// ── GET /api/logs ─────────────────────────────────────────────────
app.get("/api/logs", (_req, res) => {
  res.json({ ok: true, count: sosLog.length, logs: [...sosLog].reverse() });
});

// ── GET /api/test ─────────────────────────────────────────────────
app.get("/api/test", (_req, res) => {
  const testLat = 31.1048, testLon = 77.1734;
  const mapUrl  = `https://maps.google.com/?q=${testLat},${testLon}`;
  const smsBody = `🚨 [TEST] SafeSignal SOS v8 check — channels working | ${mapUrl}`;
  const subject = "🚨 [TEST] SafeSignal SOS v8 System Check";
  const testData = { userName:"TEST", severity:"HIGH", riskScore:99, message:"System test", lat:testLat, lon:testLon, mapsLink: mapUrl };

  res.json({ ok: true, message: "Test alerts fired — check console + your phone/email" });

  if (ADMIN_PHONE) bg("SMS→test",   () => sendSMS(ADMIN_PHONE, smsBody));
  if (ADMIN_EMAIL) bg("Email→test", () => sendEmail(ADMIN_EMAIL, subject, testData));

  console.log("🧪 [TEST] Fired to admin channels (SMS + Email)");
});

// ── Catch-all → React SPA ─────────────────────────────────────────
app.use((_req, res) => {
  const idx = path.join(__dirname, "build", "index.html");
  res.sendFile(idx, err => { if (err) res.status(200).send("SafeSignal SOS ✅"); });
});

app.use((err, _req, res, _next) => {
  console.error("[ERR]", err.message);
  if (!res.headersSent) res.status(500).json({ ok: false, error: "Internal error" });
});

process.on("unhandledRejection", r => console.error("[UnhandledRejection]", r));

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚨 SafeSignal SOS v8  →  http://localhost:${PORT}`);
  console.log(`   Health : GET  /api/health`);
  console.log(`   Test   : GET  /api/test`);
  console.log(`   SOS    : POST /api/sos  (lat+lon REQUIRED)`);
  console.log(`   Nearby : GET  /api/nearby?lat=X&lon=Y  (required)`);
  bootCheck();
  getMailer();
});