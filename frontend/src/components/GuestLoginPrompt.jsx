/**
 * GuestLoginPrompt.jsx — IntelliCrash GUEST CONVERSION
 * Aesthetic: Mimics Google One Tap (Sign-in popup)
 * Trigger: Appears after 5 minutes for guests
 */

import React, { useState, useEffect } from "react";
import { Box, Typography, Avatar, IconButton } from "@mui/material";
import { Close } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function GuestLoginPrompt() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is a guest and hasn't dismissed the prompt in this session
    const isGuest = localStorage.getItem("ic_guest") === "true" || !localStorage.getItem("sb-vutcmqsvshmsmqrlyvwt-auth-token");
    const dismissed = sessionStorage.getItem("ic_login_prompt_dismissed");

    if (isGuest && !dismissed) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 300000); // 5 minutes = 300,000ms
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    sessionStorage.setItem("ic_login_prompt_dismissed", "true");
  };

  const handleLogin = () => {
    setShow(false);
    navigate("/login");
  };

  return (
    <AnimatePresence>
      {show && (
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          sx={{
            position: "fixed",
            top: 24,
            right: 24,
            width: 360,
            zIndex: 10000,
            background: "#1e1e24",
            borderRadius: "16px",
            boxShadow: "0 12px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
            overflow: "hidden",
            color: "#fff",
            fontFamily: "'Satoshi', sans-serif",
          }}
        >
          {/* Header */}
          <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ width: 24, height: 24, background: "#fff", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                Sign in to intellicrash.com
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleClose} sx={{ color: "rgba(255,255,255,0.5)", "&:hover": { color: "#fff", background: "rgba(255,255,255,0.1)" } }}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* Account List (Simulated) */}
          <Box sx={{ p: 1 }}>
            {[
              { name: "Shubham", email: "shubhamabhi004@gmail.com", avatar: "S" },
              { name: "Shubham", email: "kullushubham007@gmail.com", avatar: "S" },
            ].map((acc, i) => (
              <Box
                key={i}
                onClick={handleLogin}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 1.5,
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": { background: "rgba(255,255,255,0.05)" },
                }}
              >
                <Avatar sx={{ width: 40, height: 40, bgcolor: i === 0 ? "#10b981" : "#8b5cf6", fontSize: 16, fontWeight: 800 }}>{acc.avatar}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{acc.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{acc.email}</Typography>
                </Box>
              </Box>
            ))}
            
            <Box
              onClick={handleLogin}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 1.5,
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": { background: "rgba(255,255,255,0.05)" },
              }}
            >
              <Avatar sx={{ width: 40, height: 40, bgcolor: "rgba(255,255,255,0.08)", fontSize: 18 }}>👤</Avatar>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#3b82f6" }}>Use another account</Typography>
            </Box>
          </Box>

          {/* Footer */}
          <Box sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.1)" }}>
            <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
              To continue, Google will share your name, email address, and profile picture with IntelliCrash.
            </Typography>
          </Box>
        </Box>
      )}
    </AnimatePresence>
  );
}
