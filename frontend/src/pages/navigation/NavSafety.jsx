import React, { useState } from "react";
import { Box, Typography, Chip, LinearProgress, Collapse, IconButton } from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import { RC, RL } from "./navUtils";

const NavSafety = ({ panelOpen, xaiFacts, xaiText, rfScore, lstmScore, riskScore, riskParams }) => {
  const [expanded, setExpanded] = useState(false);
  if (riskScore === null || riskScore === undefined) return null;
  const sc = riskScore;
  const m = riskParams?._meta || {};

  // Simplified RF model inputs for "Simple Everything" vision
  const inputs = [
    ["Road/Type",    `${m.roadTypeLabel || "Mountain"} · ${m.roadCondLabel || "Dry"}`],
    ["Environment",  `${m.weatherLabel || "Clear"} · ${m.lightLabel || "Daylight"}`],
    ["Current Spd",  riskParams?.speed != null ? `${Math.round(riskParams.speed)} km/h` : "42 km/h"],
    ["iRAD Safety",  m.nearHotspot ? `⚠️ ${m.nearHotspot.name}` : "🛡️ Clear Zone"],
  ];

  return (
    <Box sx={{
      position: "absolute",
      left: { xs: 8, md: panelOpen ? 432 : 12 },
      top: { xs: 80, md: 24 },
      zIndex: 1200,
      width: { xs: 220, md: 280 }, // Slightly narrower
      transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      background: "rgba(255,255,255,0.95)",
      borderRadius: "24px", // More rounded for modern feel
      boxShadow: "0 12px 48px rgba(0,0,0,0.12)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.4)",
      overflow: "hidden",
    }}>
      {/* Header — click to expand */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1.5, cursor: "pointer", background: "rgba(248,250,252,0.5)", borderBottom: "1px solid rgba(0,0,0,0.04)" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box component="span" sx={{ fontSize: 16 }}>🧠</Box>
          <Typography sx={{ fontWeight: 900, fontSize: 11, color: "#1e293b", letterSpacing: 1, textTransform: "uppercase" }}>AI Safety Insights</Typography>
        </Box>
        <IconButton size="small" sx={{ p: 0 }}>{expanded ? <ExpandLess fontSize="small"/> : <ExpandMore fontSize="small"/>}</IconButton>
      </Box>

      {/* Score chips — Simplified */}
      <Box sx={{ px: 2, py: 1.2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: RC(sc), boxShadow: `0 0 10px ${RC(sc)}` }} />
          <Typography sx={{ fontSize: 10, fontWeight: 900, color: "#64748b" }}>{RL(sc)}</Typography>
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 900, color: RC(sc), letterSpacing: -0.5 }}>
          {sc}<Box component="span" sx={{ fontSize: 10, opacity: 0.6, fontWeight: 700 }}>/100</Box>
        </Typography>
      </Box>

      {/* Expanded details */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2, pb: 2, pt: 1.5 }}>
          {xaiText && (
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#475569", mb: 2, lineHeight: 1.5, p: 1.5, background: "rgba(0,0,0,0.02)", borderRadius: 2 }}>
              {xaiText}
            </Typography>
          )}

          <Typography sx={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 1, mb: 1, textTransform: "uppercase" }}>INPUTS TO RF MODEL</Typography>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {inputs.map(([label, value], i) => (
                <tr key={i} style={{ borderBottom: i < inputs.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <td style={{ fontSize: 11, color: "#94a3b8", padding: "5px 0" }}>{label}</td>
                  <td style={{ fontSize: 11, color: "#334155", fontWeight: 700, textAlign: "right", padding: "5px 0" }}>{String(value)}</td>
                </tr>
              ))}
              {/* Extra xai facts */}
              {xaiFacts && Object.entries(xaiFacts)
                .filter(([k]) => !["RF Base Score","HP Calibration Boost","LSTM Sequential Score","Ensemble Weights","Season","Speed Limit","Time of Day","Road Condition","Critical Zone"].includes(k))
                .slice(0, 4)
                .map(([k, v], i) => (
                  <tr key={`xai_${i}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ fontSize: 11, color: "#94a3b8", padding: "5px 0" }}>{k}</td>
                    <td style={{ fontSize: 11, color: "#334155", fontWeight: 700, textAlign: "right" }}>{String(v)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </Box>
      </Collapse>
    </Box>
  );
};

export default NavSafety;
