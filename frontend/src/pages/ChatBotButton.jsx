import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { SmartToy, Close } from "@mui/icons-material";
import ChatBot from "./ChatBot";

export default function ChatBotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatBot onClose={() => setOpen(false)} />}
      <Box
        onClick={() => setOpen((p) => !p)}
        sx={{
          position: "fixed", bottom: 22, right: 88, zIndex: 9850,
          width: 56, height: 56, borderRadius: "50%",
          background: open
            ? "linear-gradient(135deg,#374151,#111827)"
            : "linear-gradient(135deg,#1d4ed8,#3b82f6)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          cursor: "pointer", gap: 0.2,
          boxShadow: "0 4px 20px rgba(29,78,216,0.45)",
          border: "3px solid rgba(255,255,255,0.25)",
          transition: "all 0.22s",
          animation: open ? "none" : "chatPulse 3s ease-in-out infinite",
          "@keyframes chatPulse": {
            "0%,100%": { boxShadow: "0 0 0 0 rgba(29,78,216,0.4), 0 4px 20px rgba(29,78,216,0.45)" },
            "50%": { boxShadow: "0 0 0 10px rgba(29,78,216,0.04), 0 4px 24px rgba(29,78,216,0.55)" },
          },
          "&:hover": { transform: "scale(1.08)" },
        }}
      >
        {open
          ? <Close sx={{ color: "#fff", fontSize: 22 }} />
          : <SmartToy sx={{ color: "#fff", fontSize: 22 }} />
        }
        <Typography sx={{ fontSize: 8, color: "rgba(255,255,255,0.9)", fontWeight: 800, letterSpacing: "0.5px", lineHeight: 1 }}>
          {open ? "" : "AI"}
        </Typography>
      </Box>
    </>
  );
}