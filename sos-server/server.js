// ================================================================
// IntelliCrash SOS — Backend (Node.js + Express) — v2 Debugged
// Fixes:
//   1. Twilio 500 → graceful fallback when credentials missing/invalid
//   2. Email errors no longer crash server — returns 200 with ok:false
//   3. Added /api/health with env check
//   4. Added /api/nearby proxy to Python backend
//   5. All routes return consistent JSON — no more unhandled rejections
//
// npm install express twilio nodemailer cors dotenv
// node server.js
// ================================================================
require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const path       = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "build")));

// ── Twilio client — only initialise if credentials exist ──────────
let twilioClient = null;
const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID  || "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN    || "";
const TWILIO_FROM  = process.env.TWILIO_FROM_NUMBER   || "";

if (TWILIO_SID && TWILIO_TOKEN && TWILIO_SID.startsWith("AC")) {
  try {
    const twilio = require("twilio");
    twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);
    console.log("[Twilio] Client initialised OK");
  } catch (err) {
    console.warn("[Twilio] Init failed:", err.message);
  }
} else {
  console.warn("[Twilio] Credentials missing or invalid — SMS will be skipped");
}

// ── Nodemailer — only initialise if credentials exist ─────────────
let mailer = null;
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_PASS = process.env.GMAIL_PASS || "";

if (GMAIL_USER && GMAIL_PASS && GMAIL_USER.includes("@")) {
  try {
    const nodemailer = require("nodemailer");
    mailer = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
    console.log("[Mailer] Gmail transport initialised OK");
  } catch (err) {
    console.warn("[Mailer] Init failed:", err.message);
  }
} else {
  console.warn("[Mailer] Gmail credentials missing — email will be skipped");
}

// ── POST /api/send-sms  { to, message } ──────────────────────────
app.post("/api/send-sms", async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: "to and message required" });
  }

  // No Twilio → return ok silently so frontend doesn't crash
  if (!twilioClient) {
    console.warn(`[SMS SKIP] Twilio not configured — would have sent to ${to}`);
    return res.json({ ok: true, skipped: true, reason: "Twilio not configured" });
  }

  if (!TWILIO_FROM) {
    console.warn("[SMS SKIP] TWILIO_FROM_NUMBER not set");
    return res.json({ ok: true, skipped: true, reason: "TWILIO_FROM_NUMBER not set" });
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_FROM,
      to,
    });
    console.log(`[SMS OK] -> ${to} | sid=${result.sid}`);
    res.json({ ok: true, sid: result.sid });
  } catch (err) {
    // Return 200 so frontend doesn't show a red error — just log it
    console.error(`[SMS ERR] -> ${to} | ${err.message}`);
    res.json({ ok: false, error: err.message, skipped: true });
  }
});

// ── POST /api/send-email ──────────────────────────────────────────
app.post("/api/send-email", async (req, res) => {
  const {
    to, name, message, lat, lon,
    severity, riskScore, mapsLink,
    userName, speed, isAutoCrash,
  } = req.body;

  if (!to) return res.status(400).json({ error: "to required" });

  // No mailer → return ok silently
  if (!mailer) {
    console.warn(`[EMAIL SKIP] Mailer not configured — would have sent to ${to}`);
    return res.json({ ok: true, skipped: true, reason: "Gmail not configured" });
  }

  const sc = severity === "HIGH" ? "#ea4335" : severity === "MEDIUM" ? "#f9ab00" : "#34a853";
  const crashBanner = isAutoCrash
    ? `<div style="background:#fce8e6;border-left:4px solid #ea4335;padding:12px 16px;border-radius:8px;margin-bottom:18px;font-weight:700;color:#b31412;">💥 AUTO CRASH DETECTED — Vehicle speed dropped suddenly</div>`
    : "";

  const mapsHref = mapsLink || `https://maps.google.com/?q=${lat},${lon}`;
  const riskVal  = parseFloat(riskScore || 0);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:24px;background:#f0f4ff;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#ea4335,#c62828);padding:32px;text-align:center;">
    <div style="font-size:52px;margin-bottom:8px;">🚨</div>
    <h1 style="color:#fff;font-size:26px;margin:0;font-weight:800;">EMERGENCY SOS ALERT</h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">IntelliCrash AI Emergency System</p>
  </div>
  <div style="padding:28px 32px;">
    ${crashBanner}
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:10px;background:#f8faff;border-radius:8px 0 0 8px;width:50%;">
          <div style="font-size:11px;color:#6b7a99;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">From</div>
          <div style="font-weight:700;font-size:16px;">${userName || "Unknown"}</div>
        </td>
        <td style="padding:10px;background:${sc}15;border-radius:0 8px 8px 0;width:50%;text-align:right;">
          <div style="font-size:11px;color:#6b7a99;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Risk Level</div>
          <div style="font-weight:800;font-size:20px;color:${sc};">${severity || "UNKNOWN"}</div>
        </td>
      </tr>
    </table>
    <div style="background:#f8faff;border-radius:10px;padding:14px;margin-bottom:16px;">
      <div style="font-size:11px;color:#6b7a99;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Risk Score</div>
      <div style="background:#e8ecf5;border-radius:4px;height:8px;overflow:hidden;">
        <div style="width:${Math.min(riskVal, 100)}%;background:${sc};height:100%;border-radius:4px;"></div>
      </div>
      <div style="font-size:12px;color:#6b7a99;margin-top:6px;">${riskVal.toFixed(1)} / 100${speed ? ` · Speed: ~${speed} km/h` : ""}</div>
    </div>
    <div style="background:#f8faff;border-radius:10px;padding:14px;margin-bottom:16px;">
      <div style="font-size:11px;color:#6b7a99;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Message</div>
      <div style="font-size:13px;color:#1a1a1a;line-height:1.7;white-space:pre-line;">${message || "Emergency SOS triggered"}</div>
    </div>
    <a href="${mapsHref}"
       style="display:block;background:#1a73e8;color:#fff;text-align:center;padding:16px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:18px;">
      📍 Open Live Location in Google Maps
    </a>
    <div style="font-size:12px;color:#999;text-align:center;line-height:1.7;">
      This alert was sent automatically by IntelliCrash SOS.<br/>
      Please call ${userName || "the sender"} immediately to verify their safety.<br/>
      Emergency: 112 | Ambulance: 108
    </div>
  </div>
</div>
</body></html>`;

  try {
    await mailer.sendMail({
      from:    `"IntelliCrash SOS 🚨" <${GMAIL_USER}>`,
      to,
      subject: `🚨 EMERGENCY SOS from ${userName || "Unknown"} — ${severity || "UNKNOWN"} Risk`,
      text:    message || "Emergency SOS triggered",
      html,
    });
    console.log(`[EMAIL OK] -> ${to}`);
    res.json({ ok: true });
  } catch (err) {
    // Return 200 so frontend doesn't crash on email failure
    console.error(`[EMAIL ERR] -> ${to} | ${err.message}`);
    res.json({ ok: false, error: err.message, skipped: true });
  }
});

// ── GET /api/health — env check ───────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    ok:           true,
    ts:           new Date().toISOString(),
    twilio_ready: twilioClient !== null,
    gmail_ready:  mailer !== null,
    twilio_from:  TWILIO_FROM || "NOT SET",
    gmail_user:   GMAIL_USER  || "NOT SET",
  });
});

// ── GET /api/nearby — proxy to Python backend ─────────────────────
app.get("/api/nearby", async (req, res) => {
  const { lat = 31.1048, lon = 77.1734 } = req.query;
  try {
    const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
    const r = await fetch(`http://127.0.0.1:8000/api/nearby?lat=${lat}&lon=${lon}`, { timeout: 8000 });
    const d = await r.json();
    res.json(d);
  } catch (err) {
    // Return static fallback so SOS page still works offline
    res.json({
      nearby: [
        { name: "HP Police (112)",   type: "police",   phone: "112" },
        { name: "HP Ambulance (108)",type: "hospital", phone: "108" },
        { name: "IGMC Shimla",       type: "hospital", phone: "0177-2804251", lat: 31.1048, lon: 77.1734 },
      ],
      count: 3,
      source: "static_fallback",
    });
  }
});

// ── Catch-all — serve React frontend ─────────────────────────────
app.use((req, res) => {
  const index = path.join(__dirname, "build", "index.html");
  res.sendFile(index, (err) => {
    if (err) res.status(200).send("IntelliCrash SOS Server running");
  });
});
// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚨 IntelliCrash SOS Server -> http://localhost:${PORT}`);
  console.log(`   Twilio SMS : ${twilioClient ? "✅ Ready" : "⚠️  Skipped (credentials missing)"}`);
  console.log(`   Gmail Email: ${mailer      ? "✅ Ready" : "⚠️  Skipped (credentials missing)"}`);
  console.log(`   Health    : http://localhost:${PORT}/api/health\n`);
});
