// src/hooks/useTheme.js
import { useEffect, useState } from "react";

const THEME_KEY = "intellicrash-theme";

export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.className = theme; // Also set class on body for global CSS targeting
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === THEME_KEY && e.newValue) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleTheme = () => setTheme(prev => (prev === "light" ? "dark" : "light"));

  return { theme, toggleTheme };
};
