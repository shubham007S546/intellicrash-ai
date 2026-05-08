import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { SupportAgent, Close } from "@mui/icons-material";
import ChatBot from "./ChatBot";

export default function ChatBotButton() {
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);

  // Show tooltip after 4 seconds, hide after 6 seconds
  useEffect(() => {
    const showTimer = setTimeout(() => {
      if (!open) setShowTooltip(true);
    }, 4000);

    const hideTimer = setTimeout(() => {
      setShowTooltip(false);
      setTooltipDismissed(true);
    }, 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleClick = () => {
    setShowTooltip(false);
    setTooltipDismissed(true);
    setOpen((p) => !p);
  };

  return (
    <>
      {open && <ChatBot onClose={() => setOpen(false)} />}

      {/* Tooltip Popup */}
      {showTooltip && !open && (
        <Box
          sx={{
            position: "fixed",
            bottom: 90,
            right: 72,
            zIndex: 9849,
            background: "#fff",
            borderRadius: "16px 16px 4px 16px",
            padding: "12px 16px",
            boxShadow: "0 8px 32px rgba(29,78,216,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            border: "1.5px solid #dbeafe",
            minWidth: 180,
            animation: "tooltipFadeIn 0.4s ease",
            "@keyframes tooltipFadeIn": {
              from: { opacity: 0, transform: "translateY(10px) scale(0.95)" },
              to: { opacity: 1, transform: "translateY(0) scale(1)" },
            },
          }}
        >
          {/* Close X */}
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
              setTooltipDismissed(true);
            }}
            sx={{
              position: "absolute", top: 6, right: 8,
              fontSize: 13, color: "#94a3b8", cursor: "pointer",
              lineHeight: 1, fontWeight: 700,
              "&:hover": { color: "#374151" },
            }}
          >
            ✕
          </Box>

          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent, #1e40af)", mb: 0.4 }}>
            🆘 IntelliCrash Support
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: "var(--text-secondary, #475569)", lineHeight: 1.5 }}>
            Need help? Ask about road safety, emergency routes, or risk scores.
          </Typography>

          {/* Tail */}
          <Box sx={{
            position: "absolute", bottom: -8, right: 18,
            width: 0, height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "8px solid #fff",
            filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.06))",
          }} />
        </Box>
      )}

      {/* Main FAB Button */}
      <Box
        onClick={handleClick}
        sx={{
          position: "fixed",
          bottom: 25,
          right: 25,
          zIndex: 9850,
          width: 64,
          height: 64,
          borderRadius: "20px",
          background: open
            ? "linear-gradient(135deg, #1e293b, #0f172a)"
            : "linear-gradient(135deg, #2563eb, #1d4ed8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 12px 32px rgba(37, 99, 235, 0.3)",
          border: "1px solid rgba(255,255,255,0.2)",
          transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          animation: open ? "none" : "chatFloat 3s ease-in-out infinite",
          "@keyframes chatFloat": {
            "0%, 100%": { transform: "translateY(0)" },
            "50%": { transform: "translateY(-6px)" },
          },
          "&:hover": { 
            transform: "scale(1.1) rotate(5deg)",
            boxShadow: "0 20px 48px rgba(37, 99, 235, 0.5)"
          },
        }}
      >
        {open ? (
          <Close sx={{ color: "#fff", fontSize: 28 }} />
        ) : (
          <SupportAgent sx={{ color: "#fff", fontSize: 28 }} />
        )}
        {!open && (
          <Typography
            sx={{
              fontSize: 9,
              color: "#fff",
              fontWeight: 900,
              letterSpacing: 1,
              mt: -0.5
            }}
          >
            HELP
          </Typography>
        )}
      </Box>
    </>
  );
}