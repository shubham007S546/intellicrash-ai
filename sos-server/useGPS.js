/**
 * useGPS.js — IntelliCrash Real Location Hook
 * 
 * Drop this hook into any component that needs the user's real GPS coords
 * BEFORE opening AmbulanceTracker or sending SOS to server.
 *
 * Usage:
 *   const { coords, accuracy, loading, error, retry } = useGPS();
 *
 *   coords → [lat, lon] | null
 *   accuracy → meters | null
 *   loading → true while acquiring
 *   error → string | null
 *   retry → () => void   — call to re-request GPS
 */

import { useState, useEffect, useCallback, useRef } from "react";

// How long to wait for GPS (ms)
const GPS_TIMEOUT_HIGH = 12000;
const GPS_TIMEOUT_LOW  = 8000;

// Accept cached position up to this age (ms) — 0 = always fresh
const MAX_AGE = 0;

export function useGPS() {
  const [coords,   setCoords]   = useState(null);   // [lat, lon]
  const [accuracy, setAccuracy] = useState(null);   // metres
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const attemptRef = useRef(0);

  const acquire = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const attempt = ++attemptRef.current;

    // ── Try 1: high-accuracy GPS ─────────────────────────────────
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (attempt !== attemptRef.current) return; // stale
        const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
        console.log(`[GPS] ✅ High-accuracy: ${lat.toFixed(6)}, ${lon.toFixed(6)} ±${Math.round(acc)}m`);
        setCoords([lat, lon]);
        setAccuracy(Math.round(acc));
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (attempt !== attemptRef.current) return;
        console.warn("[GPS] High-accuracy failed:", err.message, "→ retrying low-accuracy…");

        // ── Try 2: low-accuracy (faster, works indoors) ──────────
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (attempt !== attemptRef.current) return;
            const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
            console.log(`[GPS] ✅ Low-accuracy: ${lat.toFixed(6)}, ${lon.toFixed(6)} ±${Math.round(acc)}m`);
            setCoords([lat, lon]);
            setAccuracy(Math.round(acc));
            setLoading(false);
            setError(null);
          },
          (err2) => {
            if (attempt !== attemptRef.current) return;
            console.error("[GPS] ❌ Both attempts failed:", err2.message);
            setCoords(null);
            setLoading(false);
            setError(
              err2.code === 1
                ? "Location permission denied. Please enable GPS in your browser settings."
                : err2.code === 2
                ? "GPS signal unavailable. Move to an open area and retry."
                : "Location request timed out. Please retry."
            );
          },
          {
            enableHighAccuracy: false,
            timeout: GPS_TIMEOUT_LOW,
            maximumAge: MAX_AGE,
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: GPS_TIMEOUT_HIGH,
        maximumAge: MAX_AGE,
      }
    );
  }, []);

  // Acquire on mount
  useEffect(() => { acquire(); }, [acquire]);

  return { coords, accuracy, loading, error, retry: acquire };
}

/**
 * One-shot imperative version — for use OUTSIDE React components,
 * e.g. inside an async event handler before opening the tracker.
 *
 * Returns [lat, lon] or throws.
 *
 * Example:
 *   const [lat, lon] = await getGPSOnce();
 *   openAmbulanceTracker([lat, lon]);
 */
export function getGPSOnce() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocation not supported"));
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => {
        // Fallback to low accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
          (err) => reject(err),
          { enableHighAccuracy: false, timeout: GPS_TIMEOUT_LOW, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_HIGH, maximumAge: 0 }
    );
  });
}
