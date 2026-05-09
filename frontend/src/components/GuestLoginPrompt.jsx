/**
 * GuestLoginPrompt.jsx — IntelliCrash
 * Shows a small, non-intrusive sign-in nudge banner at the BOTTOM of the screen
 * for non-logged-in users — ONCE per session, only on Home page.
 * Clicking "Sign In" routes to /login. Dismissing sets sessionStorage flag.
 * No fake Google popup, no account list simulation.
 */

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function GuestLoginPrompt() {
  const [show, setShow]     = useState(false);
  const navigate            = useNavigate();
  const location            = useLocation();

  useEffect(() => {
    // Only show on Home page
    if (location.pathname !== "/" && location.pathname !== "/home") return;

    // Already dismissed this session
    if (sessionStorage.getItem("ic_signin_nudge_done") === "true") return;

    // Check auth — if logged in, never show
    const isGuest = !localStorage.getItem("sb-vutcmqsvshmsmqrlyvwt-auth-token") &&
                    localStorage.getItem("ic_guest") !== "false";

    if (!isGuest) return;

    // Show after 90 seconds on Home (1.5 minutes explore time)
    const timer = setTimeout(() => setShow(true), 90000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem("ic_signin_nudge_done", "true");
  };

  const handleSignIn = () => {
    setShow(false);
    sessionStorage.setItem("ic_signin_nudge_done", "true");
    navigate("/login");
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="signin-nudge"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1.5px solid rgba(234, 88, 12, 0.3)",
            borderRadius: 40,
            boxShadow: "0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.5)",
            padding: "10px 10px 10px 18px",
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
            maxWidth: "calc(100vw - 32px)",
          }}
        >
          {/* Icon */}
          <span style={{ fontSize: 20 }}>🛡️</span>

          {/* Text */}
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#37474f" }}>
            Sign in to unlock navigation & SOS features
          </span>

          {/* Sign In button */}
          <button
            onClick={handleSignIn}
            style={{
              padding: "8px 20px",
              borderRadius: 30,
              border: "none",
              background: "linear-gradient(135deg,#f4511e,#ff7043)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 3px 12px rgba(244,81,30,0.3)",
              flexShrink: 0,
            }}
          >
            Sign In
          </button>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.06)",
              color: "#90a4ae",
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
