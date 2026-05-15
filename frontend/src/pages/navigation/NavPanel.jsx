import React, { useRef, useCallback, useState } from "react";
import { Box, Typography, IconButton, Tooltip, Chip, Divider, LinearProgress, CircularProgress } from "@mui/material";
import { ChevronLeft, ChevronRight, SwapVert, CameraAlt, KeyboardArrowUp, KeyboardArrowDown } from "@mui/icons-material";
import { T, VP, RC, RL, RCL, RCB, RICONS, ZONE_ICON } from "./navUtils";

// ── Single smart SOS button: tap = instant SOS, hold 2s = voice SOS ──
function SmartSOSButton({ onTap, onVoice }) {
  const holdRafRef   = useRef(null);
  const holdStartRef = useRef(null);
  const recRef       = useRef(null);
  const [holdPct,    setHoldPct]    = useState(0);
  const [voiceMode,  setVoiceMode]  = useState(false);
  const [transcript, setTranscript] = useState("");

  const activateVoice = useCallback(() => {
    setVoiceMode(true);
    setTranscript("");
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      recRef.current = rec;
      rec.lang = "en-IN"; rec.continuous = false; rec.interimResults = true;
      let finalText = "";
      rec.onresult = (e) => {
        finalText = Array.from(e.results).map(r => r[0].transcript).join(" ");
        setTranscript(finalText);
      };
      rec.onend = () => {
        setVoiceMode(false); setHoldPct(0);
        onVoice?.(finalText || "Emergency - Voice SOS");
      };
      rec.onerror = () => {
        setVoiceMode(false); setHoldPct(0);
        onVoice?.("Emergency");
      };
      rec.start();
    } else {
      setVoiceMode(false); setHoldPct(0);
      onVoice?.("Emergency - Voice SOS (no mic)");
    }
  }, [onVoice]);

  const startHold = useCallback(() => {
    if (voiceMode) return;
    holdStartRef.current = Date.now();
    const animate = () => {
      const pct = Math.min(((Date.now() - holdStartRef.current) / 2000) * 100, 100);
      setHoldPct(pct);
      if (pct < 100) {
        holdRafRef.current = requestAnimationFrame(animate);
      } else {
        activateVoice();
      }
    };
    holdRafRef.current = requestAnimationFrame(animate);
  }, [voiceMode, activateVoice]);

  const endHold = useCallback(() => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    const held = Date.now() - (holdStartRef.current || Date.now());
    if (!voiceMode && holdPct < 90) {
      setHoldPct(0);
      if (held < 500) onTap?.();
    }
  }, [voiceMode, holdPct, onTap]);

  const bg = voiceMode
    ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
    : "linear-gradient(135deg,#ef4444,#dc2626)";

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      {holdPct > 0 && (
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 1, borderRadius: "12px 12px 0 0", background: "rgba(0,0,0,0.08)" }}>
          <Box sx={{ height: "100%", width: `${holdPct}%`, background: voiceMode ? "#a78bfa" : "#fff", borderRadius: "12px 12px 0 0", transition: "width 0.05s linear" }} />
        </Box>
      )}
      <button
        id="nav-smart-sos-button"
        onMouseDown={!voiceMode ? startHold : undefined}
        onMouseUp={!voiceMode ? endHold : undefined}
        onMouseLeave={() => { if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current); if (!voiceMode && holdPct > 0 && holdPct < 90) setHoldPct(0); }}
        onTouchStart={!voiceMode ? (e) => { e.preventDefault(); startHold(); } : undefined}
        onTouchEnd={!voiceMode ? (e) => { e.preventDefault(); endHold(); } : undefined}
        style={{
          width: "100%", padding: "14px 10px", borderRadius: 12, border: "none",
          background: bg, color: "#fff", fontWeight: 900, fontSize: 14,
          cursor: voiceMode ? "default" : "pointer",
          boxShadow: voiceMode ? "0 8px 24px rgba(124,58,237,0.4)" : "0 8px 24px rgba(220,38,38,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "all 0.25s", userSelect: "none", WebkitUserSelect: "none",
          animation: voiceMode ? "navVoicePulse 0.8s ease-in-out infinite alternate" : "none",
        }}
      >
        <style>{`@keyframes navVoicePulse { from { box-shadow: 0 8px 24px rgba(124,58,237,0.4); } to { box-shadow: 0 8px 40px rgba(124,58,237,0.7); } }`}</style>
        {voiceMode ? "🎙️ SPEAK YOUR EMERGENCY..." : "🚨 EMERGENCY SOS"}
        {!voiceMode && (
          <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 600 }}>HOLD FOR VOICE</span>
        )}
      </button>
      {voiceMode && transcript && (
        <Typography sx={{ fontSize: 10, color: "#7c3aed", mt: 0.5, textAlign: "center", fontStyle: "italic" }}>"{transcript}"</Typography>
      )}
    </Box>
  );
}

const NavPanel = ({
  panelOpen, setPanelOpen,
  panelMode, setPanelMode,
  navigating, setNavigating,
  source, setSource,
  dest, setDest,
  srcGeoPos, setSrcGeoPos,
  dstGeoPos, setDstGeoPos,
  vehicle, setVehicle,
  loading,
  riskScore,
  routeInfo,
  allRoutes,
  selectedRouteIdx,
  selectRoute,
  kmLeft,
  etaSec,
  tripPct,
  reports,
  gm,
  voiceOn, setVoiceOn,
  hindiOn, setHindiOn,
  fmtD,
  fmtT,
  runNavigation,
  startAnim,
  stopAnim,
  PlaceInput,
  panelBorder,
  translateToHindi,
  TurnArrow,
  stepClr,
  directions,
  currentStep,
  user,
  emergencyContacts,
  userPos,
  sosActive,
  setTrackerOpen,
  rptType, setRptType,
  rptDesc, setRptDesc,
  rptSev, setRptSev,
  rptPhotos, handlePhoto,

  rptVideo, setRptVideo,
  rptInjured, setRptInjured,
  rptFatal, setRptFatal,
  submitReport,
  mapStyle, setMapStyle,
  showHS, setShowHS,
  showZones, setShowZones,
  showCams, setShowCams,
  showReports, setShowReports,
  showLearned, setShowLearned,
  showTolls, setShowTolls,
  showPasses, setShowPasses,
  handleSOS,
  riskCalcErr,
  rfScore,
  lstmScore,
  xaiText,
  xaiFacts,
  riskHistory = [],
  recHospital,
  GOOGLE_FORM_URL,
}) => {
  const vp = VP[vehicle] || VP.car;
  const sc = riskScore ?? 50;

  return (
    <Box sx={{
      width: "100%",
      height: "100%",
      background: "#fff",
      boxShadow: { xs: "0 -8px 32px rgba(0,0,0,0.15)", md: "2px 0 24px rgba(0,0,0,0.06)" },
      display: "flex", flexDirection: "column", overflow: "hidden",
      borderRadius: { xs: "24px 24px 0 0", md: 0 },
      borderRight: { md: panelBorder },
    }}>
      {/* Mobile Handle */}
      <Box 
        sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", justifyContent: "center", py: 1, cursor: "pointer" }}
        onClick={() => setPanelOpen(o => !o)}
      >
        <Box sx={{ width: 40, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.1)" }} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, pb: 1.5, borderBottom: panelBorder, flexShrink: 0, background: "#fff" }}>
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: T.text }}>🛡️ IntelliCrash</Typography>
          <Chip label={`${gm.points} pts`} size="small" sx={{ background: "rgba(234,88,12,0.1)", color: T.orange, fontWeight: 700, fontSize: 10, height: 18 }} />
        </Box>
        <IconButton size="small" onClick={() => setPanelOpen(o => !o)} sx={{ display: { xs: "none", md: "flex" }, color: T.textSub }}>
          {panelOpen ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
        <IconButton size="small" onClick={() => setPanelOpen(o => !o)} sx={{ display: { xs: "flex", md: "none" }, color: T.textSub }}>
          {panelOpen ? <KeyboardArrowDown /> : <KeyboardArrowUp />}
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
        {panelMode === "search" && (
          <Box>
            <Box sx={{ p: 2, borderBottom: panelBorder, background: "#fff" }}>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", py: "4px", flexShrink: 0 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "2px", border: `2.5px solid #16a34a`, background: "transparent", transform: "rotate(45deg)" }} />
                  <Box sx={{ width: 2, height: 24, background: `linear-gradient(#16a34a,#dc2626)`, borderRadius: 1 }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626" }} />
                </Box>
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.8 }}>
                  <PlaceInput value={source} onChange={setSource} placeholder="From — your location" isSource />
                  <PlaceInput value={dest} onChange={setDest} placeholder="To — destination" isSource={false} />
                </Box>
                <Tooltip title="Swap"><IconButton size="small" onClick={() => { const t = source; setSource(dest); setDest(t); setSrcGeoPos(dstGeoPos); setDstGeoPos(srcGeoPos); }} sx={{ color: T.textSub }}><SwapVert fontSize="small" /></IconButton></Tooltip>
              </Box>
              <Box sx={{ display: "flex", gap: 0.8, alignItems: "center", mt: 1.5 }}>
                {Object.entries(VP).map(([k, v]) => (<Tooltip key={k} title={v.label} placement="top"><button onClick={() => setVehicle(k)} style={{ padding: "8px 12px", border: "1.5px solid", borderColor: vehicle === k ? T.orange : "rgba(0,0,0,0.1)", borderRadius: 20, fontSize: 18, cursor: "pointer", background: vehicle === k ? "rgba(234,88,12,0.08)" : "transparent" }}>{v.icon}</button></Tooltip>))}
                <button onClick={() => runNavigation()} disabled={loading} style={{ marginLeft: "auto", padding: "10px 24px", border: "none", borderRadius: 24, background: loading ? "rgba(0,0,0,0.1)" : "linear-gradient(135deg,#ea580c,#dc2626)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 12px rgba(234,88,12,0.3)" }}>{loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : `Go ${vp.icon}`}</button>
              </Box>
            
            {riskCalcErr && (
              <Box sx={{ mx: 2, mt: 1, p: 1.5, background: "#fff1f2", borderRadius: 3, border: "1px solid #fecaca", display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Typography sx={{ fontSize: 18 }}>⚠️</Typography>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#991b1b" }}>ML Model Error</Typography>
                  <Typography sx={{ fontSize: 10, color: "#b91c1c" }}>{riskCalcErr}</Typography>
                </Box>
              </Box>
            )}
            </Box>

            {riskScore !== null && routeInfo && (
              <Box sx={{
                mx: 2, my: 2, p: 2.5,
                background: "#fff",
                borderRadius: 5,
                border: `1.1px solid ${T.border}`,
                boxShadow: "0 10px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)",
                position: "relative",
                overflow: "hidden"
              }}>
                <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 4, background: RC(riskScore) }} />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                      <Typography sx={{ fontSize: 36, fontWeight: 900, color: T.text, lineHeight: 1 }}>{routeInfo.duration_min}</Typography>
                      <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.textSub }}>min</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: T.textSub, mt: 0.8, fontWeight: 600 }}>
                      {routeInfo.distance_km} km · {vp.label}
                    </Typography>
                    {navigating && etaSec !== null && (
                      <Typography sx={{ fontSize: 12, color: T.orange, mt: 0.5, fontWeight: 800, letterSpacing: 0.3 }}>
                        ARRIVAL: {new Date(Date.now() + etaSec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                    <Chip 
                      label={RL(riskScore)} 
                      size="small" 
                      sx={{ 
                        background: RC(riskScore), 
                        color: "#fff", 
                        fontWeight: 900, 
                        fontSize: 10,
                        letterSpacing: 0.5,
                        boxShadow: `0 4px 12px ${RC(riskScore)}44`
                      }} 
                    />
                    {riskScore >= 67 && (
                      <Chip label="ALT RECOMMENDED" size="small" variant="outlined" sx={{ height: 18, fontSize: 8, fontWeight: 800, color: T.red, borderColor: T.red }} />
                    )}
                  </Box>
                </Box>
                <Box sx={{ position: "relative", mb: 2.5 }}>
                   <LinearProgress 
                    variant="determinate" 
                    value={riskScore} 
                    sx={{ 
                      height: 10, borderRadius: 5, background: "rgba(0,0,0,0.05)", 
                      "& .MuiLinearProgress-bar": { 
                        background: `linear-gradient(90deg, ${RC(riskScore)}dd, ${RC(riskScore)})`,
                        borderRadius: 5
                      } 
                    }} 
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                    <Typography sx={{ fontSize: 9, fontWeight: 700, color: T.textSub }}>SAFE</Typography>
                    <Typography sx={{ fontSize: 9, fontWeight: 700, color: T.textSub }}>DANGER</Typography>
                  </Box>
                </Box>
                <Box sx={{ 
                  background: "rgba(234,88,12,0.04)", borderRadius: 3, p: 1.5, mb: 2.5, 
                  border: "1px solid rgba(234,88,12,0.1)",
                  display: "flex", gap: 1.5, alignItems: "flex-start"
                }}>
                  <Box sx={{ fontSize: 18 }}>🧠</Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography sx={{ fontSize: 9, fontWeight: 900, color: T.orange, letterSpacing: 1 }}>SAFETY INSIGHT</Typography>
                      <Tooltip title={xaiText || "Calculating safety factors..."} arrow>
                        <IconButton size="small" sx={{ p: 0, color: T.orange }}><Box sx={{ fontSize: 12 }}>ℹ️</Box></IconButton>
                      </Tooltip>
                    </Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: T.text, lineHeight: 1.4 }}>
                      {xaiText ? xaiText.split(".")[0] + "." : "Monitoring road conditions and driver behavior for real-time risk assessment."}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 1, mb: 2.5, flexWrap: "wrap" }}>
                  <Box sx={{ display: "flex", alignItems: "center", background: "rgba(37,99,235,0.06)", px: 1, py: 0.4, borderRadius: 1.5, border: "1px solid rgba(37,99,235,0.15)" }}>
                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: "#2563eb", mr: 1 }}>RF MODEL</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#2563eb" }}>{rfScore ?? "—"}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", background: "rgba(147,51,234,0.06)", px: 1, py: 0.4, borderRadius: 1.5, border: "1px solid rgba(147,51,234,0.15)" }}>
                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: "#9333ea", mr: 1 }}>LSTM AI</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#9333ea" }}>{lstmScore ?? "—"}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", background: RC(riskScore), px: 1, py: 0.4, borderRadius: 1.5, boxShadow: `0 2px 8px ${RC(riskScore)}44` }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>{riskScore}/100</Typography>
                  </Box>
                </Box>
                {!navigating ? (
                  <button 
                    onClick={() => { setNavigating(true); setTimeout(() => { const r = allRoutes[selectedRouteIdx]; const c = r.geometry.coordinates.map(([ln, la]) => [la, ln]); startAnim(c, r.duration_min); }, 500); }} 
                    style={{ 
                      width: "100%", padding: "16px", border: "none", borderRadius: 14, 
                      background: "linear-gradient(135deg, #16a34a, #15803d)", 
                      color: "#fff", fontWeight: 900, fontSize: 17, cursor: "pointer", 
                      boxShadow: "0 8px 25px rgba(22,163,74,0.35)", 
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                      transition: "transform 0.2s, box-shadow 0.2s"
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(22,163,74,0.45)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(22,163,74,0.35)"; }}
                  >
                    🚀 START TRIP
                  </button>
                ) : (
                  <Box sx={{ textAlign: "center", py: 1, background: "rgba(0,0,0,0.03)", borderRadius: 3 }}>
                    <Typography sx={{ fontSize: 12, color: T.textSub, fontWeight: 800, letterSpacing: 0.5 }}>
                      NAVIGATION ACTIVE · MONITORING HAZARDS
                    </Typography>
                    <LinearProgress variant="determinate" value={tripPct} sx={{ height: 4, borderRadius: 2, mt: 1, mx: 2, background: "rgba(0,0,0,0.05)", "& .MuiLinearProgress-bar": { background: T.orange } }} />
                  </Box>
                )}
              </Box>
            )}

            <Box sx={{ px: 2, pb: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
              <button onClick={() => setPanelMode("report")} style={{ padding: "10px", borderRadius: 12, fontSize: 11, fontWeight: 700, border: `1px solid #dc262633`, color: "#dc2626", background: panelMode==="report"?"#fee2e2":"#fff", cursor: "pointer" }}>📡 Report</button>
              <button onClick={() => setPanelMode("sos")} style={{ padding: "10px", borderRadius: 12, fontSize: 11, fontWeight: 700, border: `1px solid #ea580c33`, color: "#ea580c", background: panelMode==="sos"?"#ffedd5":"#fff", cursor: "pointer" }}>🚨 SOS</button>
              <button onClick={() => setPanelMode("layers")} style={{ padding: "10px", borderRadius: 12, fontSize: 11, fontWeight: 700, border: `1px solid rgba(0,0,0,0.1)`, color: T.textSub, background: panelMode==="layers"?"#f1f5f9":"#fff", cursor: "pointer" }}>🗺️ Layers</button>
            </Box>
            <Divider />
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: T.textSub, mb: 1.5, letterSpacing: 0.5, textTransform: "uppercase" }}>Safety Feed & Risk Alerts</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {riskHistory.length > 0 && riskHistory.map((h, i) => (
                  <Box key={i} sx={{ p: 1.2, display: "flex", gap: 1.5, background: i === 0 ? RC(h.score) + "08" : "#fff", borderRadius: 3, border: `1px solid ${i === 0 ? RC(h.score) + "33" : T.border}`, alignItems: "center" }}>
                    <Typography sx={{ fontSize: 18 }}>{h.score >= 67 ? "🔴" : h.score >= 34 ? "🟠" : "🟢"}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 900, color: RC(h.score) }}>{h.level}</Typography>
                        <Typography sx={{ fontSize: 9, fontWeight: 700, color: T.textSub }}>{h.ts}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 10, color: T.textSub }}>Risk Score: {h.score}/100 (RF: {h.rf}, AI: {h.lstm ? Math.round(h.lstm) : "—"})</Typography>
                    </Box>
                  </Box>
                ))}
                
                {recHospital && (
                  <Box sx={{ p: 1.2, background: "rgba(22,163,74,0.08)", borderRadius: 3, border: "1px solid rgba(22,163,74,0.2)", display: "flex", gap: 1, alignItems: "center" }}>
                    <Typography sx={{ fontSize: 18 }}>🏥</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#16a34a" }}>RECOMMENDED FACILITY</Typography>
                        <Chip label={`Level ${recHospital.level}`} size="small" sx={{ height: 16, fontSize: 8, fontWeight: 800, background: "#16a34a", color: "#fff" }} />
                      </Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{recHospital.name}</Typography>
                      <Typography sx={{ fontSize: 10, color: T.textSub }}>{fmtD(recHospital.distM)} away · {recHospital.beds} beds · HP Govt Verified</Typography>
                    </Box>
                  </Box>
                )}

                {reports.length > 0 ? reports.slice(0, 3).map((r, i) => (
                  <Box key={i} sx={{ p: 1.2, display: "flex", gap: 1.5, background: "#fff", borderRadius: 3, border: `1px solid ${T.border}`, alignItems: "center" }}>
                    <Typography sx={{ fontSize: 18 }}>{RICONS[r.type] || "⚠️"}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{r.type.toUpperCase()}</Typography>
                        <Typography sx={{ fontSize: 9, fontWeight: 700, color: T.textSub }}>NEARBY</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 11, color: T.textSub }} noWrap>{r.description}</Typography>
                    </Box>
                  </Box>
                )) : (
                  <Typography sx={{ fontSize: 11, color: T.textSub, textAlign: "center", py: 1, border: `1px dashed ${T.border}`, borderRadius: 2 }}>No active incidents reported nearby.</Typography>
                )}
                
                <button 
                  onClick={() => window.open("/bulletin", "_blank")}
                  style={{ 
                    width: "100%", padding: "10px", borderRadius: 10, border: "none", 
                    background: "rgba(37,99,235,0.08)", color: "#2563eb", 
                    fontWeight: 800, fontSize: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    marginTop: 8
                  }}
                >
                  📢 Open Full Live Bulletin →
                </button>
              </Box>
            </Box>
          </Box>
        )}

        {panelMode === "sos" && (
          <Box sx={{ px: 2, py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <IconButton size="small" onClick={() => setPanelMode("search")}><ChevronLeft /></IconButton>
              <Typography sx={{ fontWeight: 800, fontSize: 15 }}>🚨 Emergency Support</Typography>
            </Box>
            <Box sx={{ p: 1.5, background: "#fff", borderRadius: 3, border: `1px solid ${T.border}`, mb: 2 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: T.textSub, mb: 1 }}>CURRENT LOCATION</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 900, color: T.text }}>{userPos ? `${userPos[0].toFixed(5)}, ${userPos[1].toFixed(5)}` : "Detecting..."}</Typography>
              <Typography sx={{ fontSize: 10, color: T.textSub }}>Himachal Pradesh, India</Typography>
            </Box>
            <SmartSOSButton onTap={handleSOS} onVoice={handleSOS} />
            <Box sx={{ mt: 1.5 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: T.textSub, mb: 1.5, textTransform: "uppercase", letterSpacing: 1 }}>Official Emergency Services</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
              {[
                { n: "Ambulance Dispatch", p: "108", i: "🚑", d: "Primary Medical Support" },
                { n: "Police Control", p: "100", i: "👮", d: "HP State Police Assistance" },
              ].map((c, i) => (
                <Box key={i} component="a" href={`tel:${c.p}`} sx={{ 
                  p: 1.5, background: "#fff", borderRadius: 3, border: `1px solid ${T.border}`, 
                  display: "flex", alignItems: "center", gap: 2, textDecoration: "none",
                  transition: "all 0.2s", "&:hover": { background: "#f8fafc", borderColor: T.orange }
                }}>
                  <Box sx={{ 
                    width: 44, height: 44, borderRadius: "12px", background: "rgba(220,38,38,0.08)", 
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 
                  }}>{c.i}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text }}>{c.n}</Typography>
                    <Typography sx={{ fontSize: 10, color: T.textSub, fontWeight: 500 }}>{c.d}</Typography>
                    <Typography sx={{ fontSize: 11, color: T.orange, fontWeight: 800, mt: 0.2 }}>{c.p}</Typography>
                  </Box>
                  <Box sx={{ 
                    width: 32, height: 32, borderRadius: "50%", background: "rgba(22,163,74,0.1)", 
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" 
                  }}>📞</Box>
                </Box>
              ))}
            </Box>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: T.textSub, mb: 1.5, textTransform: "uppercase", letterSpacing: 1 }}>My Emergency Circle</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
              {(emergencyContacts?.length > 0 ? emergencyContacts : [
                { name: "Family Primary", phone: "9015162007", relation: "Family" },
                { name: "Emergency Admin", phone: "112", relation: "Support" }
              ]).map((c, i) => (
                <Box key={i} component="a" href={`tel:${c.phone}`} sx={{ 
                  p: 1.5, background: "#fff", borderRadius: 3, border: `1px solid ${T.border}`, 
                  display: "flex", alignItems: "center", gap: 2, textDecoration: "none",
                  transition: "all 0.2s", "&:hover": { background: "#f8fafc", borderColor: "#2563eb" }
                }}>
                  <Box sx={{ 
                    width: 44, height: 44, borderRadius: "12px", background: "rgba(37,99,235,0.08)", 
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 
                  }}>👤</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text }}>{c.name}</Typography>
                    <Typography sx={{ fontSize: 10, color: T.textSub, fontWeight: 500 }}>{c.relation || c.type || "Personal Contact"}</Typography>
                    <Typography sx={{ fontSize: 11, color: "#2563eb", fontWeight: 800, mt: 0.2 }}>{c.phone}</Typography>
                  </Box>
                  <Box sx={{ 
                    width: 32, height: 32, borderRadius: "50%", background: "rgba(22,163,74,0.1)", 
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" 
                  }}>📞</Box>
                </Box>
              ))}
            </Box>
            {sosActive && (
              <Box sx={{ 
                p: 2, background: "rgba(22,163,74,0.06)", borderRadius: 4, border: "1px solid rgba(22,163,74,0.15)", 
                textAlign: "center", animation: "glow 2s infinite ease-in-out",
                "@keyframes glow": { "0%,100%": { boxShadow: "0 0 0 0 rgba(22,163,74,0.1)" }, "50%": { boxShadow: "0 0 20px 0 rgba(22,163,74,0.2)" } }
              }}>
                <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#16a34a", mb: 0.5 }}>🚑 AMBULANCE EN ROUTE</Typography>
                <Typography sx={{ fontSize: 10, color: T.textSub, mb: 1.5 }}>Real-time GPS tracking active</Typography>
                <button 
                  onClick={() => setTrackerOpen(true)} 
                  style={{ 
                    width: "100%", padding: "12px", borderRadius: 12, border: "none", 
                    background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", 
                    fontWeight: 900, fontSize: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 12px rgba(22,163,74,0.3)"
                  }}
                >
                  📡 View Live Tracking Map
                </button>
              </Box>
            )}
          </Box>
        )}

        {panelMode === "report" && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <IconButton size="small" onClick={() => setPanelMode("search")}><ChevronLeft /></IconButton>
              <Typography sx={{ fontWeight: 800, fontSize: 15 }}>🚨 Report Incident</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.2, mb: 2, borderRadius: 3, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", boxShadow: "0 0 0 3px rgba(22,163,74,0.2)", animation: "pulse 2s infinite", "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.5 } } }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>📍 GPS locked</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
              {[["accident","💥","Accident"],["traffic","🚦","Traffic"],["roadblock","🚧","Block"],["hazard","⚠️","Hazard"]].map(([k,ico,lbl]) => (
                <button key={k} onClick={() => setRptType(k)} style={{ flex: "1 1 70px", padding: "10px 6px", borderRadius: 12, border: `2px solid ${rptType===k ? "#ea580c" : "rgba(0,0,0,0.1)"}`, background: rptType===k ? "rgba(234,88,12,0.08)" : "#fff", cursor: "pointer", fontSize: 11, fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: rptType===k ? "#ea580c" : "#64748b", transition: "all 0.15s" }}>
                  <span style={{ fontSize: 18 }}>{ico}</span>{lbl}
                </button>
              ))}
            </Box>
            <Typography sx={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 1, mb: 0.8, textTransform: "uppercase" }}>Severity</Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              {[["minor","Minor","#16a34a"],["moderate","Moderate","#d97706"],["severe","Severe ⚠️","#dc2626"]].map(([v,lbl,clr]) => (
                <button key={v} onClick={() => setRptSev(v)} style={{ flex: 1, padding: "10px 6px", borderRadius: 12, border: `2px solid ${rptSev===v ? clr : "rgba(0,0,0,0.08)"}`, background: rptSev===v ? `${clr}12` : "#fff", color: rptSev===v ? clr : "#64748b", fontWeight: 800, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>{lbl}</button>
              ))}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, p: 1.5, borderRadius: 3, background: "#fff8f5", border: "1px solid rgba(234,88,12,0.15)" }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>🤕 Injured:</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <button onClick={() => setRptInjured(i => Math.max(0,i-1))} style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)", background: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                <Typography sx={{ fontSize: 16, fontWeight: 900, minWidth: 28, textAlign: "center" }}>{rptInjured}</Typography>
                <button onClick={() => setRptInjured(i => i+1)} style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.1)", background: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </Box>
              <Typography sx={{ fontSize: 12, color: "#94a3b8", ml: 0.5 }}>people</Typography>
              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.8 }}>
                <input type="checkbox" id="fatal-chk" checked={rptFatal} onChange={e => setRptFatal(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#dc2626", cursor: "pointer" }} />
                <label htmlFor="fatal-chk" style={{ fontSize: 12, fontWeight: 700, color: rptFatal ? "#dc2626" : "#94a3b8", cursor: "pointer" }}>Fatal</label>
              </Box>
            </Box>
            <Box sx={{ mb: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Description *</Typography>
                <Typography sx={{ fontSize: 10, color: "#94a3b8" }}>{rptDesc.length} / 10 min</Typography>
              </Box>
              <textarea value={rptDesc} onChange={e => setRptDesc(e.target.value)} placeholder="Describe the accident — location, severity, road condition" rows={3} style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "12px 14px", fontFamily: "inherit", fontSize: 13, outline: "none", background: "#fff", resize: "none", boxSizing: "border-box" }} />
            </Box>
            <Box sx={{ mb: 1.5 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, mb: 0.8 }}>📷 Photos *</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {rptPhotos.map((p,i) => (
                  <Box key={i} sx={{ width: 56, height: 56, borderRadius: 2, overflow: "hidden", border: "2px solid rgba(234,88,12,0.3)", position: "relative" }}>
                    <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </Box>
                ))}
                <button onClick={() => document.getElementById("photo-in").click()} style={{ width: 56, height: 56, borderRadius: 8, border: "2px dashed rgba(0,0,0,0.15)", background: "#f8fafc", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <CameraAlt sx={{ fontSize: 18, color: "#94a3b8" }} />
                </button>
                <input id="photo-in" type="file" multiple accept="image/*" hidden onChange={handlePhoto} />
              </Box>
            </Box>
            <button onClick={submitReport} disabled={!rptDesc.trim() && rptPhotos.length === 0} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: (!rptDesc.trim() && rptPhotos.length===0) ? "rgba(0,0,0,0.08)" : "linear-gradient(135deg,#ea580c,#dc2626)", color: (!rptDesc.trim() && rptPhotos.length===0) ? "#94a3b8" : "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: (!rptDesc.trim() && rptPhotos.length===0) ? "none" : "0 4px 16px rgba(220,38,38,0.25)", marginBottom: 10 }}>
              {(!rptDesc.trim() && rptPhotos.length===0) ? "Add description or photo to enable reporting" : "Submit Report 🚨"}
            </button>
            <Box sx={{ p: 2, borderRadius: 3, background: "rgba(22,163,74,0.05)", border: "1px solid rgba(22,163,74,0.15)" }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#16a34a", mb: 0.5 }}>📋 Sync External Reports</Typography>
              <Typography sx={{ fontSize: 11, color: "#64748b", mb: 1 }}>Filing via Google Form? Native reports are instant, but external form data syncs every few minutes.</Typography>
              <button 
                onClick={() => {
                  window.open("https://docs.google.com/forms/d/e/1FAIpQLSdYRZnuvommuJrbOytaTcaySne3_3ddLthqnKljvsA_wY47ig/viewform", "_blank");
                  toast("Syncing external reports... please wait.", "info");
                }} 
                style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
              >
                📝 Open Detailed Form & Sync →
              </button>
            </Box>
          </Box>
        )}


        {panelMode === "layers" && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <IconButton size="small" onClick={() => setPanelMode("search")}><ChevronLeft /></IconButton>
              <Typography sx={{ fontWeight: 800 }}>Map Layers</Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {[["Standard View", "standard"], ["Topographic Map", "topo"], ["Satellite Imagery", "satellite"]].map(([lbl, val]) => (
                <Box key={val} onClick={() => setMapStyle(val)} sx={{ p: 1.8, borderRadius: 3, border: `2px solid ${mapStyle === val ? T.orange : "rgba(0,0,0,0.05)"}`, background: mapStyle === val ? "rgba(234,88,12,0.05)" : "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: mapStyle === val ? T.orange : T.text }}>{lbl}</Typography>
                  {mapStyle === val && <Box sx={{ width: 20, height: 20, borderRadius: "50%", background: T.orange, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</Box>}
                </Box>
              ))}
            </Box>
            <Divider sx={{ my: 3 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: T.textSub, mb: 1.5, letterSpacing: 0.5, textTransform: "uppercase" }}>Visibility Toggles</Typography>
            {[["Accident Hotspots", showHS, setShowHS], ["Critical Zones", showZones, setShowZones], ["Speed Cameras", showCams, setShowCams], ["Live Community Reports", showReports, setShowReports], ["Adaptive Hotspots", showLearned, setShowLearned], ["Toll Booths", showTolls, setShowTolls], ["Seasonal Passes", showPasses, setShowPasses]].map(([lbl, val, set]) => (
              <Box key={lbl} sx={{ display: "flex", justifyContent: "space-between", py: 1.2, alignItems: "center" }}>
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{lbl}</Typography>
                <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} style={{ width: 20, height: 20, accentColor: T.orange }} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NavPanel;
