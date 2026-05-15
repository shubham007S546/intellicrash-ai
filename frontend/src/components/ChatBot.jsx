import { useState, useRef, useEffect } from "react";
import { Box, Typography, TextField, IconButton, Paper, Avatar, Chip } from "@mui/material";
import { Send, Close, SmartToy, Person, AutoAwesome } from "@mui/icons-material";

const BASE = import.meta.env.VITE_API_URL || ""; // Using empty string to leverage the /api proxy
const STORAGE_KEY = "intellicrash_chat_session_id";
const SUGGESTED = [
  "What are the accident hotspots in Shimla?",
  "How does risk prediction work?",
  "What to do in an emergency on HP roads?",
  "How do I use SOS feature?",
];

export default function ChatBot({ onClose = () => {} }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm IntelliCrash AI Assistant 🛡️\n\nI can help you with:\n• Road safety on HP mountain roads\n• Understanding risk scores\n• Navigation tips\n• Emergency SOS guidance\n\nHow can I help you today?",
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("default");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const storedId = window.localStorage.getItem(STORAGE_KEY) || "default";
    setSessionId(storedId);

    if (storedId !== "default") {
      fetch(`${BASE}/api/chat/history?session_id=${encodeURIComponent(storedId)}&limit=30`)
        .then((res) => {
          if (!res.ok) throw new Error("Unable to load conversation history");
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data.history) && data.history.length) {
            setMessages(
              data.history.map((item) => ({
                role: item.role,
                content: item.content,
                ts: item.timestamp ? new Date(item.timestamp) : new Date(),
              }))
            );
          }
        })
        .catch(() => {
          // Keep default welcome message if history load fails.
        });
    }
  }, []);

  const appendMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content, ts: new Date() }]);
  };

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput("");
    appendMessage("user", msg);
    setLoading(true);

    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_id: sessionId }),
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          detail = body?.detail || body?.error || detail;
        } catch (_) {}
        throw new Error(detail);
      }

      const data = await res.json();
      if (data.session_id && data.session_id !== sessionId) {
        window.localStorage.setItem(STORAGE_KEY, data.session_id);
        setSessionId(data.session_id);
      }
      appendMessage("assistant", data.response || "Sorry, I could not get a response.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection error. Please try again.";
      appendMessage("assistant", `⚠️ ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (ts) =>
    ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 90,
        right: 18,
        zIndex: 9900,
        width: { xs: "calc(100vw - 36px)", sm: 380 },
        height: 600,
        maxHeight: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        overflow: "hidden",
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(249,115,22,0.12)",
        background: "#fff",
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          background: "linear-gradient(135deg,#f97316,#ef4444)",
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SmartToy sx={{ color: "#fff", fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 14,
              color: "#fff",
              fontFamily: "'Syne',sans-serif",
            }}
          >
            IntelliCrash Assistant
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#86efac",
                animation: "pulse 1.4s infinite",
                "@keyframes pulse": {
                  "0%,100%": { opacity: 1 },
                  "50%": { opacity: 0.4 },
                },
              }}
            />
            <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.85)" }}>
              Online · Powered by Groq AI
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#fff" }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* ── Messages ── */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          background: "#f8fafc",
        }}
      >
        {messages.map((m, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              gap: 1,
              flexDirection: m.role === "user" ? "row-reverse" : "row",
              alignItems: "flex-end",
            }}
          >
            <Avatar
              sx={{
                width: 28,
                height: 28,
                flexShrink: 0,
                background:
                  m.role === "user"
                    ? "linear-gradient(135deg,#1d4ed8,#3b82f6)"
                    : "linear-gradient(135deg,#f97316,#ef4444)",
                fontSize: 13,
              }}
            >
              {m.role === "user" ? (
                <Person sx={{ fontSize: 16 }} />
              ) : (
                <SmartToy sx={{ fontSize: 16 }} />
              )}
            </Avatar>
            <Box sx={{ maxWidth: "78%" }}>
              <Paper
                elevation={0}
                sx={{
                  px: 1.5,
                  py: 1,
                  background:
                    m.role === "user"
                      ? "linear-gradient(135deg,#1d4ed8,#3b82f6)"
                      : "#fff",
                  color: m.role === "user" ? "#fff" : "#1f2937",
                  borderRadius:
                    m.role === "user"
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                  border: m.role === "user" ? "none" : "1px solid #e5e7eb",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <Typography
                  sx={{ fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap" }}
                >
                  {m.content}
                </Typography>
              </Paper>
              <Typography
                sx={{
                  fontSize: 9,
                  color: "#9ca3af",
                  mt: 0.3,
                  textAlign: m.role === "user" ? "right" : "left",
                  px: 0.5,
                }}
              >
                {fmt(m.ts)}
              </Typography>
            </Box>
          </Box>
        ))}

        {/* Typing indicator */}
        {loading && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
            <Avatar
              sx={{
                width: 28,
                height: 28,
                background: "linear-gradient(135deg,#f97316,#ef4444)",
                fontSize: 13,
              }}
            >
              <SmartToy sx={{ fontSize: 16 }} />
            </Avatar>
            <Paper
              elevation={0}
              sx={{
                px: 2,
                py: 1.2,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "16px 16px 16px 4px",
              }}
            >
              <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                {[0, 1, 2].map((d) => (
                  <Box
                    key={d}
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#f97316",
                      animation: "bounce 1.2s infinite",
                      animationDelay: `${d * 0.2}s`,
                      "@keyframes bounce": {
                        "0%,100%": { transform: "translateY(0)" },
                        "50%": { transform: "translateY(-5px)" },
                      },
                    }}
                  />
                ))}
              </Box>
            </Paper>
          </Box>
        )}

        {/* Suggested questions — shown only on the first message */}
        {messages.length === 1 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 0.5 }}>
            {SUGGESTED.map((s) => (
              <Chip
                key={s}
                label={s}
                size="small"
                onClick={() => send(s)}
                icon={<AutoAwesome sx={{ fontSize: "12px !important" }} />}
                sx={{
                  fontSize: 11,
                  cursor: "pointer",
                  background: "#fff",
                  border: "1px solid #fed7aa",
                  color: "#ea580c",
                  "&:hover": { background: "#fff7ed", borderColor: "#f97316" },
                  "& .MuiChip-icon": { color: "#f97316" },
                }}
              />
            ))}
          </Box>
        )}

        <div ref={bottomRef} />
      </Box>

      {/* ── Input bar ── */}
      <Box
        sx={{
          p: 1.5,
          background: "#fff",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          gap: 1,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Ask about HP road safety..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          disabled={loading}
          multiline
          maxRows={3}
          inputProps={{ style: { color: "#1f2937" } }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              fontSize: 13,
              backgroundColor: "#fff",
              "&.Mui-focused fieldset": { borderColor: "#f97316" },
            },
            "& .MuiInputBase-input::placeholder": {
              color: "#9ca3af",
              opacity: 1,
            }
          }}
        />
        <IconButton
          onClick={() => send()}
          disabled={!input.trim() || loading}
          sx={{
            background:
              input.trim() && !loading
                ? "linear-gradient(135deg,#f97316,#ef4444)"
                : "#f3f4f6",
            color: input.trim() && !loading ? "#fff" : "#9ca3af",
            borderRadius: 2,
            width: 40,
            height: 40,
            flexShrink: 0,
            "&:hover": {
              background:
                input.trim() && !loading
                  ? "linear-gradient(135deg,#ea6c0a,#dc2626)"
                  : "#f3f4f6",
            },
            transition: "all 0.2s",
          }}
        >
          <Send sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
}