// src/components/ThemeToggle.jsx
import React from "react";
import { useTheme } from "../hooks/useTheme";
import { RiSunLine } from "react-icons/ri";

// Simple button that toggles between light and dark themes.
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const buttonStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-primary)",
    fontSize: 20,
    lineHeight: 1,
  };

  return (
    <button 
      onClick={toggleTheme} 
      style={buttonStyle} 
      aria-label="Toggle light/dark mode"
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <RiSunLine />
    </button>
  );
}
