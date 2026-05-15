/**
 * critical_zones_hp.js — IntelliCrash v12.0
 * ─────────────────────────────────────────────────────────────────
 * Complete HP Critical Zones Dataset
 * Covers: Hospitals, Schools, Colleges, Police Nakas, Bridges,
 *         Fog Zones, Railway Crossings, Bus Stands, Market Areas
 * Source: HP govt records + OSM + field data 2025
 */

export const CRITICAL_ZONES = [

  // ══════════════════════════════════════════════════════════
  // HOSPITALS & MEDICAL (slow to 30 km/h)
  // ══════════════════════════════════════════════════════════
  { id:"h1",  lat:31.1048,  lon:77.1734,  name:"IGMC Shimla",              type:"hospital",  warn:"Tertiary Care — IGMC Shimla nearby. Specialized trauma center.", radius:500,  speedLimit:30, level:1, beds:710 },
  { id:"h2",  lat:31.0995,  lon:77.1661,  name:"DDU Hospital Shimla",      type:"hospital",  warn:"Secondary Care — DDU Hospital Shimla. Multi-specialty.",    radius:350,  speedLimit:30, level:2, beds:300 },
  { id:"h3",  lat:31.7088,  lon:76.9330,  name:"Zonal Hospital Mandi",     type:"hospital",  warn:"District Trauma Center — Zonal Hospital Mandi.",           radius:350,  speedLimit:30, level:2, beds:250 },
  { id:"h4",  lat:31.9578,  lon:77.1095,  name:"District Hospital Kullu",  type:"hospital",  warn:"District Hospital Kullu — Secondary medical care.",         radius:300,  speedLimit:30, level:2, beds:200 },
  { id:"h5",  lat:32.0947,  lon:76.1022,  name:"DDU Hospital Dharamshala", type:"hospital",  warn:"DDU Dharamshala — Critical care & diagnostics available.",  radius:300,  speedLimit:30, level:2, beds:220 },
  { id:"h6",  lat:30.9050,  lon:77.0950,  name:"Civil Hospital Solan",     type:"hospital",  warn:"Civil Hospital Solan — Primary/Secondary care.",            radius:300,  speedLimit:30, level:2, beds:150 },
  { id:"h7",  lat:30.9237,  lon:76.7980,  name:"Civil Hospital Baddi",     type:"hospital",  warn:"Hospital zone — ambulance access.",                        radius:250,  speedLimit:30, level:3, beds:100 },
  { id:"h8",  lat:31.5349,  lon:76.9009,  name:"Regional Hospital Sundernagar", type:"hospital", warn:"Regional medical center Sundernagar.",                   radius:280,  speedLimit:30, level:2, beds:180 },
  { id:"h9",  lat:32.2200,  lon:76.3200,  name:"Civil Hospital Palampur",  type:"hospital",  warn:"Civil Hospital Palampur — 24/7 Emergency.",                 radius:250,  speedLimit:30, level:3, beds:80 },
  { id:"h10", lat:30.4497,  lon:77.5666,  name:"Civil Hospital Poanta Sahib", type:"hospital", warn:"Border medical center Poanta Sahib.",                    radius:250,  speedLimit:30, level:3, beds:100 },
  { id:"h11", lat:32.5500,  lon:76.1200,  name:"District Hospital Chamba", type:"hospital",  warn:"District Hospital Chamba — Secondary care.",               radius:280,  speedLimit:30, level:2, beds:150 },
  { id:"h12", lat:31.4700,  lon:76.2700,  name:"Civil Hospital Una",       type:"hospital",  warn:"Civil Hospital Una — Emergency services.",                  radius:250,  speedLimit:30, level:3, beds:90 },
  { id:"h13", lat:31.5414,  lon:76.8912,  name:"Suket Hospital Sundernagar", type:"hospital", warn:"Suket Hospital — Multi-specialty private facility.",       radius:300,  speedLimit:30, level:2, beds:120 },
  { id:"h14", lat:31.5385,  lon:76.8950,  name:"Sunder Nagar CH",          type:"hospital",  warn:"Community Health Center — Basic emergency care.",          radius:200,  speedLimit:30, level:3, beds:50 },

  // ══════════════════════════════════════════════════════════
  // SCHOOLS (slow to 20 km/h, active 7-9 AM & 1-4 PM)
  // ══════════════════════════════════════════════════════════
  { id:"s1",  lat:31.1020,  lon:77.1680,  name:"Shimla Public School",     type:"school",    warn:"School zone — 20 km/h, children crossing",                  radius:250,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },
  { id:"s2",  lat:31.1085,  lon:77.1750,  name:"Auckland House School Shimla", type:"school", warn:"School zone — 20 km/h, slow down",                        radius:200,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },
  { id:"s3",  lat:31.0990,  lon:77.1690,  name:"Bishop Cotton School",     type:"school",    warn:"School zone — 20 km/h, peak hours caution",                 radius:220,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },
  { id:"s4",  lat:31.7100,  lon:76.9280,  name:"Govt School Mandi",        type:"school",    warn:"School zone — 20 km/h",                                     radius:200,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },
  { id:"s5",  lat:32.0980,  lon:76.1010,  name:"TCV School Dharamshala",   type:"school",    warn:"School zone — 20 km/h",                                     radius:200,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },
  { id:"s6",  lat:31.9600,  lon:77.1100,  name:"Govt School Kullu",        type:"school",    warn:"School zone — 20 km/h",                                     radius:180,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },
  { id:"s7",  lat:30.9237,  lon:76.7990,  name:"Govt School Baddi",        type:"school",    warn:"School zone — 20 km/h",                                     radius:180,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },
  { id:"s8",  lat:31.5349,  lon:76.9020,  name:"Govt School Sundernagar",  type:"school",    warn:"School zone — 20 km/h",                                     radius:180,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },
  { id:"s9",  lat:31.4700,  lon:76.2710,  name:"Govt School Una",          type:"school",    warn:"School zone — 20 km/h",                                     radius:180,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },
  { id:"s10", lat:30.8984,  lon:77.0926,  name:"Solan Public School",      type:"school",    warn:"School zone — 20 km/h",                                     radius:200,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },
  { id:"s11", lat:32.5500,  lon:76.1210,  name:"Govt School Chamba",       type:"school",    warn:"School zone — 20 km/h",                                     radius:180,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },
  { id:"s12", lat:32.0600,  lon:75.9800,  name:"Govt School Kangra",       type:"school",    warn:"School zone — 20 km/h",                                     radius:180,  speedLimit:20, activeHours:[{start:7,end:9},{start:13,end:16}] },

  // ══════════════════════════════════════════════════════════
  // COLLEGES & UNIVERSITIES (slow to 25 km/h)
  // ══════════════════════════════════════════════════════════
  { id:"c1",  lat:31.1048,  lon:77.1700,  name:"Himachal Pradesh University", type:"college", warn:"University zone — 25 km/h, student crossings",            radius:350,  speedLimit:25 },
  { id:"c2",  lat:31.1060,  lon:77.1720,  name:"Govt College Shimla",      type:"college",   warn:"College zone — 25 km/h",                                    radius:280,  speedLimit:25 },
  { id:"c3",  lat:31.7090,  lon:76.9310,  name:"Govt College Mandi",       type:"college",   warn:"College zone — 25 km/h",                                    radius:260,  speedLimit:25 },
  { id:"c4",  lat:32.0960,  lon:76.1050,  name:"CUHP Dharamshala",         type:"college",   warn:"University zone — 25 km/h, students on road",               radius:320,  speedLimit:25 },
  { id:"c5",  lat:31.9580,  lon:77.1090,  name:"NIT Hamirpur",             type:"college",   warn:"College zone — 25 km/h",                                    radius:300,  speedLimit:25 },
  { id:"c6",  lat:31.6800,  lon:76.5200,  name:"Hamirpur Govt College",    type:"college",   warn:"College zone — 25 km/h",                                    radius:250,  speedLimit:25 },
  { id:"c7",  lat:31.4700,  lon:76.2720,  name:"Govt College Una",         type:"college",   warn:"College zone — 25 km/h",                                    radius:250,  speedLimit:25 },
  { id:"c8",  lat:30.9060,  lon:77.0930,  name:"Govt College Solan",       type:"college",   warn:"College zone — 25 km/h",                                    radius:260,  speedLimit:25 },
  { id:"c9",  lat:30.4500,  lon:77.5670,  name:"Govt College Poanta Sahib",type:"college",   warn:"College zone — 25 km/h",                                    radius:230,  speedLimit:25 },
  { id:"c10", lat:32.5500,  lon:76.1220,  name:"Govt College Chamba",      type:"college",   warn:"College zone — 25 km/h",                                    radius:250,  speedLimit:25 },
  { id:"c11", lat:31.2000,  lon:77.7450,  name:"Raza Govt College Rampur", type:"college",   warn:"College zone — 25 km/h",                                    radius:230,  speedLimit:25 },
  { id:"c12", lat:32.2200,  lon:76.3210,  name:"Govt College Palampur",    type:"college",   warn:"College zone — 25 km/h",                                    radius:240,  speedLimit:25 },

  // ══════════════════════════════════════════════════════════
  // POLICE NAKAS & CHECKPOSTS
  // ══════════════════════════════════════════════════════════
  { id:"p1",  lat:31.1048,  lon:77.1900,  name:"Dhalli Police Naka",       type:"police",    warn:"Police checkpoint — have licence & papers ready",            radius:150,  speedLimit:30 },
  { id:"p2",  lat:31.5100,  lon:76.9000,  name:"Sundernagar Naka",         type:"police",    warn:"Police naka — reduce speed, document check",                 radius:150,  speedLimit:30 },
  { id:"p3",  lat:30.8400,  lon:76.9640,  name:"Parwanoo Border Check Post",type:"police",   warn:"HP border checkpoint — carry ID, vehicle papers",            radius:200,  speedLimit:25 },
  { id:"p4",  lat:31.1048,  lon:77.1650,  name:"Shimla Traffic Naka",      type:"police",    warn:"Traffic naka — follow signals, no overtaking",               radius:120,  speedLimit:30 },
  { id:"p5",  lat:31.7100,  lon:76.9320,  name:"Mandi City Police Naka",   type:"police",    warn:"Police checkpoint ahead",                                    radius:150,  speedLimit:30 },
  { id:"p6",  lat:30.9237,  lon:76.7985,  name:"Baddi Industrial Naka",    type:"police",    warn:"Industrial zone naka — heavy vehicle check",                 radius:180,  speedLimit:30 },
  { id:"p7",  lat:32.0980,  lon:76.1000,  name:"Gaggal Airport Naka",      type:"police",    warn:"Airport security zone — have ID ready",                      radius:250,  speedLimit:30 },
  { id:"p8",  lat:31.9600,  lon:77.1095,  name:"Kullu Bypass Naka",        type:"police",    warn:"Police naka — tourist vehicle check",                        radius:150,  speedLimit:30 },
  { id:"p9",  lat:32.2400,  lon:77.1880,  name:"Rohtang NGT Permit Check", type:"police",    warn:"NGT permit check — private vehicles need permit",            radius:300,  speedLimit:20 },
  { id:"p10", lat:30.4497,  lon:77.5668,  name:"Poanta Sahib UP Border",   type:"police",    warn:"State border check — have documents ready",                  radius:200,  speedLimit:25 },
  { id:"p11", lat:31.4700,  lon:76.2715,  name:"Una Punjab Border Naka",   type:"police",    warn:"HP-Punjab border check — vehicle inspection",               radius:200,  speedLimit:25 },
  { id:"p12", lat:31.3800,  lon:76.8300,  name:"Swarghat Naka",            type:"police",    warn:"Police naka — carry documents",                              radius:150,  speedLimit:30 },

  // ══════════════════════════════════════════════════════════
  // BRIDGES (single lane / narrow)
  // ══════════════════════════════════════════════════════════
  { id:"b1",  lat:31.7100,  lon:76.9200,  name:"Mandi Beas Bridge",        type:"bridge",    warn:"Single-lane bridge — one vehicle at a time",                 radius:120,  speedLimit:20 },
  { id:"b2",  lat:31.5500,  lon:76.8900,  name:"Sundernagar Span Bridge",  type:"bridge",    warn:"Narrow bridge — proceed with caution, no overtaking",        radius:100,  speedLimit:20 },
  { id:"b3",  lat:31.3800,  lon:76.8300,  name:"Bilaspur Gobind Sagar Bridge",type:"bridge", warn:"Long bridge — no overtaking, maintain lane",                 radius:200,  speedLimit:40 },
  { id:"b4",  lat:31.9500,  lon:77.1000,  name:"Kullu Beas Bridge",        type:"bridge",    warn:"Narrow bridge — one-way movement, wait for signal",          radius:100,  speedLimit:20 },
  { id:"b5",  lat:31.1048,  lon:77.1700,  name:"Shimla Cart Road Bridge",  type:"bridge",    warn:"Old bridge — weight restricted, no heavy vehicles",           radius:100,  speedLimit:20 },
  { id:"b6",  lat:30.4500,  lon:77.5660,  name:"Yamuna Bridge Poanta Sahib",type:"bridge",   warn:"River bridge — no overtaking, 40 km/h limit",               radius:150,  speedLimit:40 },
  { id:"b7",  lat:32.2400,  lon:77.1500,  name:"Atal Tunnel North Portal", type:"bridge",    warn:"Tunnel entry — switch on headlights, 60 km/h max",           radius:200,  speedLimit:60 },
  { id:"b8",  lat:32.2350,  lon:77.2400,  name:"Atal Tunnel South Portal", type:"bridge",    warn:"Tunnel exit — beware of ice on road ahead",                  radius:200,  speedLimit:40 },
  { id:"b9",  lat:31.6300,  lon:76.9400,  name:"Pandoh Dam Bridge",        type:"bridge",    warn:"Dam bridge — restricted entry, one way movement",            radius:200,  speedLimit:30 },
  { id:"b10", lat:31.1040,  lon:77.2000,  name:"Jhiri Bridge",             type:"bridge",    warn:"Narrow mountain bridge — caution",                           radius:100,  speedLimit:20 },

  // ══════════════════════════════════════════════════════════
  // FOG & ICE ZONES
  // ══════════════════════════════════════════════════════════
  { id:"f1",  lat:32.2396,  lon:77.1887,  name:"Rohtang Pass Fog Zone",    type:"fog",       warn:"Dense fog/snowfall — use fog lights, drive below 20 km/h",  radius:1000, speedLimit:20 },
  { id:"f2",  lat:31.3200,  lon:77.4200,  name:"Narkanda Ice Zone",        type:"fog",       warn:"Black ice risk Nov-Mar — chains mandatory, below 20 km/h",  radius:800,  speedLimit:20 },
  { id:"f3",  lat:32.7000,  lon:77.0500,  name:"Keylong Valley Fog",       type:"fog",       warn:"Morning fog common — use fog lights",                        radius:600,  speedLimit:30 },
  { id:"f4",  lat:31.9500,  lon:77.6000,  name:"Spiti Valley Snow Zone",   type:"fog",       warn:"Snow/ice on road — 4WD recommended",                        radius:800,  speedLimit:20 },
  { id:"f5",  lat:32.0600,  lon:75.9800,  name:"Kangra Valley Winter Fog", type:"fog",       warn:"Dense fog Dec-Feb — headlights on, 30 km/h",                radius:500,  speedLimit:30 },
  { id:"f6",  lat:31.1048,  lon:77.3000,  name:"Theog-Kufri Snow Zone",    type:"fog",       warn:"Snow on road Dec-Feb — slow down, snow chains needed",      radius:600,  speedLimit:25 },

  // ══════════════════════════════════════════════════════════
  // RAILWAY LEVEL CROSSINGS
  // ══════════════════════════════════════════════════════════
  { id:"r1",  lat:30.8400,  lon:76.9700,  name:"Parwanoo Railway Crossing",type:"railway",   warn:"Unmanned railway crossing — STOP, look both ways before crossing", radius:100, speedLimit:10 },
  { id:"r2",  lat:30.9237,  lon:77.0000,  name:"Solan Railway Crossing",   type:"railway",   warn:"Kalka-Shimla railway — STOP at gate, watch for toy train",   radius:80,   speedLimit:10 },
  { id:"r3",  lat:31.0500,  lon:77.1200,  name:"Taradevi Railway Crossing",type:"railway",   warn:"Heritage railway crossing — STOP, toy train may pass",       radius:80,   speedLimit:10 },
  { id:"r4",  lat:32.0800,  lon:76.1500,  name:"Kangra Valley Railway",    type:"railway",   warn:"Kangra valley railway crossing — stop and look",             radius:80,   speedLimit:10 },
  { id:"r5",  lat:31.9000,  lon:76.2000,  name:"Pathankot-Jogindernagar Rail",type:"railway", warn:"Narrow gauge railway crossing — STOP before crossing",       radius:80,   speedLimit:10 },

  // ══════════════════════════════════════════════════════════
  // BUS STANDS & CROWDED MARKET ZONES
  // ══════════════════════════════════════════════════════════
  { id:"m1",  lat:31.1048,  lon:77.1700,  name:"Shimla ISBT",              type:"market",    warn:"Bus stand — heavy pedestrian traffic, 20 km/h",              radius:200,  speedLimit:20 },
  { id:"m2",  lat:31.7090,  lon:76.9310,  name:"Mandi Bus Stand",          type:"market",    warn:"Bus stand area — watch for passengers",                      radius:150,  speedLimit:20 },
  { id:"m3",  lat:31.9580,  lon:77.1090,  name:"Kullu Bus Stand",          type:"market",    warn:"Crowded tourist area — 20 km/h",                             radius:150,  speedLimit:20 },
  { id:"m4",  lat:32.0970,  lon:76.1020,  name:"Dharamshala Market",       type:"market",    warn:"Tourist market zone — heavy pedestrians, 20 km/h",           radius:200,  speedLimit:20 },
  { id:"m5",  lat:30.9060,  lon:77.0960,  name:"Solan Market",             type:"market",    warn:"Market zone — pedestrian crossings, 20 km/h",               radius:150,  speedLimit:20 },
  { id:"m6",  lat:32.2000,  lon:77.2500,  name:"Old Manali Market",        type:"market",    warn:"Tourist zone — heavy foot traffic, 15 km/h",                radius:180,  speedLimit:15 },
  { id:"m7",  lat:31.4700,  lon:76.2700,  name:"Una Market",               type:"market",    warn:"Busy market — watch for pedestrians",                        radius:150,  speedLimit:20 },
];

// ── Helper: get active zones given current position ─────────────
export function getNearbyZones(lat, lon, radiusMultiplier = 1.0) {
  const R = 6371000;
  return CRITICAL_ZONES.filter(z => {
    const φ1 = lat * Math.PI / 180, φ2 = z.lat * Math.PI / 180;
    const Δφ = (z.lat - lat) * Math.PI / 180, Δλ = (z.lon - lon) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    const d = 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return d < z.radius * radiusMultiplier + 60;
  });
}

// ── Helper: is school/college zone currently active? ────────────
export function isZoneActiveNow(zone) {
  if (!zone.activeHours) return true;
  const h = new Date().getHours();
  return zone.activeHours.some(({ start, end }) => h >= start && h <= end);
}

// ── Zone type metadata ───────────────────────────────────────────
export const ZONE_META = {
  hospital: { icon: "🏥", color: "#16a34a", label: "Hospital",    bgColor: "rgba(22,163,74,0.12)" },
  school:   { icon: "🏫", color: "#f9ab00", label: "School",      bgColor: "rgba(249,171,0,0.12)"  },
  college:  { icon: "🎓", color: "#7c3aed", label: "College",     bgColor: "rgba(124,58,237,0.12)" },
  police:   { icon: "👮", color: "#1a73e8", label: "Police Naka", bgColor: "rgba(26,115,232,0.12)" },
  bridge:   { icon: "🌉", color: "#ea4335", label: "Bridge",      bgColor: "rgba(234,67,53,0.12)"  },
  fog:      { icon: "🌫️", color: "#607d8b", label: "Fog/Ice",    bgColor: "rgba(96,125,139,0.12)" },
  railway:  { icon: "🚂", color: "#f97316", label: "Railway",     bgColor: "rgba(249,115,22,0.12)" },
  market:   { icon: "🛒", color: "#34a853", label: "Market/ISBT", bgColor: "rgba(52,168,83,0.12)"  },
};
