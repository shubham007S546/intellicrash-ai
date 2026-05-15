import React, { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Box, Typography, Tooltip, Divider } from "@mui/material";
import { T, RC, RL, RCL, RCB, VP, HP_HOTSPOTS, CRITICAL_ZONES, SPEED_CAMS, HP_TOLLS, RCOLORS, RICONS, ZONE_ICON, hvDist, mkVehicleIcon, mkSrcPinIcon, mkDstPinIcon, mkUserPinIcon, mkHotspotIcon, mkAdaptiveHotspotIcon, mkZoneMarkerIcon } from "./navUtils";



const MapController = ({ mapRef }) => {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
};

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
};

const NavMap = ({
  userPos, setUserPos,
  vehPos, vehHdg, isMoving,
  routeCoords, drivenIdx, remainingCoords, drivenCoords, routeSegs,
  srcGeoPos, dstGeoPos,
  selectedRouteIdx, allRoutes, altRouteColors,
  showHS, showLearned, showZones, showCams, showTolls, showReports,
  reports, confirmedLearnedHotspots,
  riskScore,
  mapStyle, tileUrl,
  directions, currentStep,
  nearZone,
  activeCommunityHotspot,
  liveOn, setLiveOn,
  navigating, setNavigating,
  panelOpen,
  mapRef, userMarkerRef,
  onMapClick,
  vehicle,
  kmLeft, etaSec, tripPct,
  stopAnim,
  toast,
  source,
  currentRiskParams,
  hindiOn,
  translateToHindi,
  getSafeBrakingDistance,
  XAIOverlay,
  TurnArrow,
  stepClr,
  fmtD,
  fmtT,
  liveSpd,
  rfScore,
  lstmScore,
  xaiText,
  xaiFacts,
  leafletReady,
}) => {
  const sc = riskScore ?? 50;
  const vp = VP[vehicle] || VP.car;
  
  // Memoized icons
  const vIcon = useMemo(
    () => (vehPos ? mkVehicleIcon(vehicle, vehHdg, sc, isMoving) : null),
    [vehPos, vehHdg, vehicle, sc, isMoving]
  );
  const srcPin = useMemo(() => mkSrcPinIcon(), []);
  const dstPin = useMemo(() => mkDstPinIcon(), []);
  const userPin = useMemo(() => mkUserPinIcon(sc), [sc]);

  // Spatial Clustering for HP_HOTSPOTS (iRAD 2020-25) — Grid-based clustering
  const clusteredHS = useMemo(() => {
    const clusters = [];
    const GRID_SIZE = 0.008; // Roughly 800m-1km grid
    HP_HOTSPOTS.forEach(h => {
      const gridX = Math.floor(h.lat / GRID_SIZE);
      const gridY = Math.floor(h.lon / GRID_SIZE);
      const clusterId = `${gridX}_${gridY}`;
      
      const existing = clusters.find(c => c.id === clusterId);
      if (existing) {
        existing.accidents += h.accidents;
        existing.killed += h.killed;
        if (h.risk === "HIGH") existing.risk = "HIGH";
        else if (h.risk === "MEDIUM" && existing.risk === "LOW") existing.risk = "MEDIUM";
        if (!existing.names.includes(h.name)) existing.names.push(h.name);
        existing.count++;
      } else {
        clusters.push({ ...h, id: clusterId, names: [h.name], count: 1 });
      }
    });
    return clusters;
  }, []);
  // Proximity filtering logic for "Simple Everything" vision
  // Only show markers within 2km of user or vehicle
  const activePos = navigating ? vehPos : userPos;
  
  const filterByDist = (list, radius = 5000) => {
    if (!activePos) return list;
    return list.filter(item => {
      const d = hvDist(activePos, [item.lat, item.lon]);
      return d <= radius;
    });
  };

  const filteredHS = useMemo(() => filterByDist(clusteredHS, 15000), [clusteredHS, activePos]);
  const filteredAdaptive = useMemo(() => filterByDist(confirmedLearnedHotspots, 15000), [confirmedLearnedHotspots, activePos]);
  const filteredZones = useMemo(() => filterByDist(CRITICAL_ZONES, 15000), [activePos]);
  const filteredCams = useMemo(() => filterByDist(SPEED_CAMS, 15000), [activePos]);
  const filteredTolls = useMemo(() => filterByDist(HP_TOLLS, 15000), [activePos]);
  const filteredReports = useMemo(() => filterByDist(reports, 15000), [reports, activePos]);


  if (!leafletReady) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#e2e8f0" }}>
        <Box sx={{ width: 40, height: 40, border: "3px solid rgba(0,0,0,0.08)", borderTop: "3px solid #ea580c", borderRadius: "50%", animation: "spin 0.8s linear infinite", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} />
        <Typography sx={{ ml: 2, fontSize: 13, color: T.textSub }}>Initializing Map Core…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, position: "relative", height: "100%", width: "100%", background: "#e2e8f0" }}>

      {/* Ultra-Premium Glassmorphic Top Monitor */}
      <Box sx={{
        position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 1100, display: "flex", gap: 1.5, alignItems: "center",
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(24px) saturate(180%)",
        px: 2.5, py: 1.2, borderRadius: "24px",
        boxShadow: "0 12px 48px rgba(0,0,0,0.15)",
        border: "1px solid rgba(255,255,255,0.5)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      }}>
        <Box sx={{ 
          width: 14, height: 14, borderRadius: "50%", 
          background: RC(sc), 
          boxShadow: `0 0 15px ${RC(sc)}`,
          animation: sc >= 67 ? "pulseRisk 1.5s infinite" : "none",
          "@keyframes pulseRisk": { "0%,100%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.6, transform: "scale(1.2)" } }
        }} />
        
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography sx={{ fontWeight: 900, fontSize: 13, color: T.text, lineHeight: 1 }}>
            {RL(sc)}: <span style={{ color: RC(sc) }}>{sc}/100</span>
          </Typography>
          <Typography sx={{ fontSize: 9, fontWeight: 700, color: T.textSub, textTransform: "uppercase", mt: 0.2 }}>
            Real-time Safety Intelligence
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 1, opacity: 0.3 }} />
        
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box sx={{ background: "rgba(37,99,235,0.06)", color: "#2563eb", px: 1.2, py: 0.6, borderRadius: "10px", border: "1px solid rgba(37,99,235,0.1)" }}>
            <Typography sx={{ fontSize: 8, fontWeight: 900, opacity: 0.7, mb: -0.2 }}>RF MODEL</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 900 }}>{rfScore || "—"}</Typography>
          </Box>
          <Box sx={{ background: "rgba(147,51,234,0.06)", color: "#9333ea", px: 1.2, py: 0.6, borderRadius: "10px", border: "1px solid rgba(147,51,234,0.1)" }}>
            <Typography sx={{ fontSize: 8, fontWeight: 900, opacity: 0.7, mb: -0.2 }}>LSTM AI</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 900 }}>{lstmScore || "—"}</Typography>
          </Box>
        </Box>

        <Box sx={{ 
          ml: 1, width: 32, height: 32, borderRadius: "50%", 
          background: RCB(sc), display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, border: `1px solid ${RC(sc)}22`
        }}>
          {sc >= 67 ? "🚨" : sc >= 34 ? "⚠️" : "🛡️"}
        </Box>
      </Box>

      {/* XAI overlay removed — moved to Sidebar as per user request */}

      {/* Premium Navigation Guidance Pill */}
      {navigating && directions?.steps?.[currentStep] && (
        <Box sx={{
          position: "absolute",
          bottom: { xs: 24, md: 32 },
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1200,
          background: stepClr,
          color: "#fff",
          borderRadius: 24,
          px: 2.5, py: 1,
          boxShadow: `0 6px 20px ${stepClr}66`,
          maxWidth: "85%",
          minWidth: 220,
          display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 2,
          border: "1px solid rgba(255,255,255,0.2)",
          backdropFilter: "blur(8px)",
        }}>
          <Box sx={{ fontSize: 24, display: "flex", alignItems: "center" }}>
            <TurnArrow type={directions.steps[currentStep]?.type} modifier={directions.steps[currentStep]?.modifier} />
          </Box>
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontWeight: 800, fontSize: 13, lineHeight: 1.1 }}>
              {directions.steps[currentStep].instruction}
            </Typography>
            {hindiOn && (
              <Typography sx={{ fontSize: 10, opacity: 0.9, mt: 0.2 }}>
                {translateToHindi(directions.steps[currentStep].instruction)}
              </Typography>
            )}
            <Typography sx={{ fontSize: 11, opacity: 0.85, mt: 0.3, fontWeight: 700 }}>
              in {fmtD(directions.steps[currentStep].distance_m || 0)} · {Math.round(tripPct)}% done
            </Typography>
          </Box>
        </Box>
      )}

      {/* Near zone alert */}
      {nearZone && navigating && (
        <Box sx={{ position: "absolute", top: { xs: 120, md: 54 }, left: "50%", transform: "translateX(-50%)", zIndex: 1300, background: "rgba(255,255,255,0.98)", border: "2px solid #ea580c", borderRadius: 12, px: 2, py: 1, display: "flex", alignItems: "center", gap: 1, boxShadow: "0 4px 20px rgba(234,88,12,0.2)", maxWidth: "85%", backdropFilter: "blur(8px)" }}>
          <Typography sx={{ fontSize: 20 }}>{ZONE_ICON[nearZone.type] || "⚠️"}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#ea580c" }}>{nearZone.warn}</Typography>
        </Box>
      )}

      <MapContainer
        className="navmap-leaflet"
        center={userPos || [31.1048, 77.1734]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        whenReady={() => { if(typeof leafletReady === 'function') leafletReady(); }}
      >
        <MapController mapRef={mapRef} />
        <MapClickHandler onMapClick={onMapClick} />
        <TileLayer url={tileUrl} attribution="&copy; OSM" maxZoom={19} />

        {/* Alt routes */}
        {allRoutes.map((route, idx) => {
          if (idx === selectedRouteIdx) return null;
          const coords = route.geometry.coordinates.map(([ln, la]) => [la, ln]);
          return <Polyline key={`alt_${idx}`} positions={coords} pathOptions={{ color: altRouteColors[idx % altRouteColors.length], weight: 5, opacity: 0.4, dashArray: "8,6" }} />;
        })}

        {/* Main route (Segmented for Risk) */}
        {!navigating && routeSegs.length > 0 ? (
          routeSegs.map((seg, i) => (
            <Polyline key={`seg_${i}`} positions={seg.points} pathOptions={{ color: seg.color, weight: 8, opacity: 0.9, lineCap: "round" }} />
          ))
        ) : !navigating && routeCoords.length > 0 && (
          <Polyline positions={routeCoords} pathOptions={{ color: RC(sc), weight: 8, opacity: 0.9, lineCap: "round" }} />
        )}

        {/* Navigation path */}
        {navigating && drivenCoords.length > 1 && <Polyline positions={drivenCoords} pathOptions={{ color: "#94a3b8", weight: 6, opacity: 0.6, dashArray: "10,7" }} />}
        {navigating && remainingCoords.length > 1 && <Polyline positions={remainingCoords} pathOptions={{ color: RC(sc), weight: 8, opacity: 0.95, lineCap: "round" }} />}

        {/* Journey Markers */}
        {srcGeoPos && <Marker position={srcGeoPos} icon={srcPin}><Popup><Typography sx={{ fontWeight: 800, fontSize: 12 }}>Starting Point</Typography><Typography sx={{ fontSize: 11 }}>{source}</Typography></Popup></Marker>}
        {dstGeoPos && <Marker position={dstGeoPos} icon={dstPin}><Popup><Typography sx={{ fontWeight: 800, fontSize: 12 }}>Destination</Typography></Popup></Marker>}
        
        {/* User Location */}
        {userPos && !navigating && <Marker position={userPos} icon={userPin} zIndexOffset={1000} />}

        {/* Clustered iRAD 2020-25 Hotspots — compact popup */}
        {showHS && filteredHS.map((h, i) => (
          <Circle
            key={`clustered_hs_${i}`}
            center={[h.lat, h.lon]}
            radius={h.risk === "HIGH" ? 600 : h.risk === "MEDIUM" ? 400 : 250}
            pathOptions={{
              color: h.risk === "HIGH" ? "#dc2626" : h.risk === "MEDIUM" ? "#ea580c" : "#16a34a",
              fillColor: h.risk === "HIGH" ? "#dc2626" : h.risk === "MEDIUM" ? "#ea580c" : "#16a34a",
              fillOpacity: 0.15,
              weight: 2,
              dashArray: h.risk === "HIGH" ? "10,10" : "5,5"
            }}
          >
            <Popup>
              <div style={{ padding: "6px 8px", fontSize: 12, lineHeight: 1.5, maxWidth: 180 }}>
                <div style={{ fontWeight: 900, color: h.risk === "HIGH" ? "#dc2626" : h.risk === "MEDIUM" ? "#ea580c" : "#16a34a", marginBottom: 2 }}>
                  {h.risk === "HIGH" ? "🔴" : h.risk === "MEDIUM" ? "🟠" : "🟢"} {h.names?.[0] || "Accident Hotspot"}
                  {h.names?.length > 1 ? ` +${h.names.length-1}` : ""}
                </div>
                <div style={{ color: "#374151" }}>
                  {h.killed > 0 && <span style={{ color: "#dc2626", fontWeight: 800 }}>{h.killed} fatal · </span>}
                  {h.accidents} accidents · <strong>{h.risk}</strong>
                </div>
                <div style={{ color: "#9ca3af", fontSize: 10, marginTop: 2 }}>iRAD 2020–25 data</div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Adaptive/Community Hotspots — compact popup, correct count */}
        {showLearned && filteredAdaptive.map((h, i) => {
          const sc   = h.risk_score || h.weighted_score || h.score || 50;
          const c    = sc >= 67 ? "#9333ea" : sc >= 34 ? "#2563eb" : "#0891b2";
          // total incidents = all incidents stored, community count = h.count
          const totalIncidents  = h.incidents?.length || (h.count ?? 0);
          const communityCount  = h.count ?? 0;
          const backendCount    = totalIncidents - communityCount;
          const srcLabel        = h.source === "backend_seed" && communityCount === 0
            ? `${backendCount} iRAD-seeded record${backendCount !== 1 ? "s" : ""}`
            : `${communityCount} community report${communityCount !== 1 ? "s" : ""}${backendCount > 0 ? ` + ${backendCount} iRAD` : ""}`;
          return (
            <Circle
              key={`lh_${i}`}
              center={[h.lat, h.lon]}
              radius={Math.min(600, Math.max(150, 150 + sc * 5))}
              pathOptions={{ color: c, fillColor: c, fillOpacity: 0.1, weight: 2, dashArray: "6,8" }}
            >
              <Popup>
                <div style={{ padding: "6px 8px", fontSize: 12, lineHeight: 1.5, maxWidth: 170 }}>
                  <div style={{ fontWeight: 900, color: c, marginBottom: 2 }}>🧠 Adaptive Zone</div>
                  <div style={{ color: "#374151" }}>
                    Risk: <strong style={{ color: c }}>{Math.round(sc)}/100</strong>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{srcLabel}</div>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* Critical Zones — compact */}
        {showZones && filteredZones.map(z => (
          <React.Fragment key={z.id}>
            <Circle center={[z.lat, z.lon]} radius={z.radius} pathOptions={{ color: "#64748b", fillColor: "#64748b", fillOpacity: 0.07, weight: 1, dashArray: "5,5" }} />
            <Marker position={[z.lat, z.lon]} icon={mkZoneMarkerIcon(z.type)}>
              <Popup>
                <div style={{ padding: "4px 6px", fontSize: 11, maxWidth: 150 }}>
                  <div style={{ fontWeight: 800, marginBottom: 1 }}>{ZONE_ICON[z.type] || "⚠️"} {z.name}</div>
                  <div style={{ color: "#6b7280" }}>{z.warn}</div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Speed Cams — compact */}
        {showCams && filteredCams.map(cam => (
          <Marker key={cam.id} position={[cam.lat, cam.lon]} icon={L.divIcon({ className: "", iconSize: [40, 40], iconAnchor: [20, 20], html: `
            <div style="width:40px;height:40px;border-radius:50%;background:${cam.type === "camera" ? "#dc2626" : "#7c3aed"};color:#fff;border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 3px 10px rgba(0,0,0,0.2);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;">
              <div style="font-size:9px;">${cam.type === "camera" ? "📷" : "👮"}</div>
              <div style="font-size:12px;line-height:1;">${cam.limit}</div>
            </div>` })}>
            <Popup>
              <div style={{ padding: "4px 6px", fontSize: 11, maxWidth: 140 }}>
                <div style={{ fontWeight: 800 }}>{cam.name}</div>
                <div style={{ color: "#6b7280" }}>{cam.limit} km/h · {cam.type === "camera" ? "📷 Speed Cam" : "👮 Police Naka"}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {showTolls && filteredTolls.map(t => (
          <Marker key={t.id} position={[t.lat, t.lon]} icon={L.divIcon({ className: "", html: `<div style="background:#d97706;border-radius:6px;padding:3px 7px;font-size:11px;font-weight:900;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.12);white-space:nowrap;">🛣️ ₹${vehicle === "truck" ? t.fee_truck : vehicle === "bike" ? t.fee_bike : t.fee_car}</div>` })} />
        ))}

        {/* Live Community Reports — compact popup */}
        {showReports && filteredReports.map((r, i) => (
          <Marker key={r.id || i} position={[r.lat, r.lon]} icon={L.divIcon({ className: "", html: `<div style="background:#fff;border:2.5px solid ${RCOLORS[r.type] || "#64748b"};border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px 12px rgba(0,0,0,0.15)">${RICONS[r.type] || "⚠️"}</div>` })}>
            <Popup>
              <div style={{ padding: "4px 6px", fontSize: 11, maxWidth: 150 }}>
                <div style={{ fontWeight: 800, color: RCOLORS[r.type] || "#374151" }}>{r.type.toUpperCase()}</div>
                {r.description && <div style={{ color: "#6b7280", marginTop: 2 }}>{r.description}</div>}
              </div>
            </Popup>
          </Marker>
        ))}

      {/* Active Vehicle */}
        {navigating && vehPos && vIcon && <Marker position={vehPos} icon={vIcon} zIndexOffset={1200} />}
      </MapContainer>




      {/* Float actions */}
      <Box sx={{ position: "absolute", bottom: navigating ? { xs: "38vh", md: 90 } : { xs: "12vh", md: 32 }, right: 16, zIndex: 1000, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Tooltip title="Locate Me" placement="left">
          <button onClick={() => { navigator.geolocation?.getCurrentPosition((p) => { const ll = [p.coords.latitude, p.coords.longitude]; setUserPos(ll); mapRef.current?.setView(ll, 15, { animate: true }); }, () => toast("GPS error", "warning"), { enableHighAccuracy: true }); }} style={{ width: 50, height: 50, borderRadius: "50%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", fontSize: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>📍</button>
        </Tooltip>
        <Tooltip title={liveOn ? "Disable GPS" : "Enable GPS"} placement="left">
          <button onClick={() => setLiveOn(!liveOn)} style={{ width: 50, height: 50, borderRadius: "50%", background: liveOn ? "rgba(22,163,74,0.1)" : "#fff", border: `2.5px solid ${liveOn ? "#16a34a" : "rgba(0,0,0,0.1)"}`, cursor: "pointer", fontSize: 14, fontWeight: 900, color: liveOn ? "#16a34a" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>{liveOn ? "🟢" : "GPS"}</button>
        </Tooltip>
        {navigating && (
          <Tooltip title="Auto-Follow" placement="left">
            <button onClick={() => { if (vehPos) mapRef.current?.setView(vehPos, 15, { animate: true }); }} style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(234,88,12,0.1)", border: "2px solid #ea580c", cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(234,88,12,0.2)" }}>{vp.icon}</button>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default NavMap;
