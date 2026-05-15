import React, { useState, useEffect } from "react";
import { Box, Typography, Container, Grid, Chip, Divider, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Share, BookmarkBorder, AccessTime, LocationOn, LocalFireDepartment } from "@mui/icons-material";

const T = {
  bg: "#fff",
  text: "#0f172a",
  textSub: "#64748b",
  accent: "#ea580c",
  border: "#e2e8f0",
  blue: "#2563eb",
  red: "#dc2626"
};

const NEWS_DATA = [
  {
    id: 1,
    category: "URGENT",
    title: "National Highway 5 Blockage: Landslide Near Jhakri Affects Shimla-Kinnaur Connectivity",
    summary: "Heavy rainfall triggered a major landslide early this morning. BRO teams are on-site, but clearance is expected to take at least 12 hours. Drivers are advised to use alternate rural routes.",
    author: "IntelliCrash Alert Team",
    time: "2h ago",
    location: "Kinnaur Corridor",
    image: "https://images.unsplash.com/photo-1545153996-e1799787a70a?auto=format&fit=crop&q=80&w=800",
    isHero: true
  },
  {
    id: 2,
    category: "SAFETY TECH",
    title: "Himachal Police to Deploy 50 New AI-Powered Speed Cameras on NH-21",
    summary: "In a bid to reduce high-speed accidents in the Mandi-Kullu stretch, the state police is integrating IntelliCrash API data with new automated enforcement systems.",
    author: "Tech Bureau",
    time: "5h ago",
    location: "Mandi District",
    image: "https://images.unsplash.com/photo-1518131343132-722137976660?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 3,
    category: "WEATHER",
    title: "Dense Fog Warning for Atal Tunnel Approach Roads for the Next 48 Hours",
    summary: "Visibility is expected to drop below 10 meters during night hours. The Lahaul-Spiti administration has issued a high-risk advisory for all light motor vehicles.",
    author: "Weather Desk",
    time: "8h ago",
    location: "Rohtang / Atal Tunnel",
    image: "https://images.unsplash.com/photo-1494548162494-384bba4ab999?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 4,
    category: "INFRASTRUCTURE",
    title: "Work Begins on 4-Lane Bridge at Sundernagar to Eliminate 'S-Curve' Death Trap",
    summary: "The long-awaited infrastructure project aims to flatten the dangerous curve that has seen over 20 fatal accidents in the last three years.",
    author: "Local Correspondent",
    time: "1d ago",
    location: "Sundernagar",
    image: "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 5,
    category: "COMMUNITY",
    title: "Local Residents of Bilaspur Awarded for 'Golden Hour' Rescue of Accident Victims",
    summary: "Three youths were honored by the DC for their swift action in rescuing a family after their car veered off the road into a gorge.",
    author: "Civic News",
    time: "1d ago",
    location: "Bilaspur",
    image: "https://images.unsplash.com/photo-1527525443983-6e60c75efe46?auto=format&fit=crop&q=80&w=400"
  }
];

const FLASH_NEWS = [
  "🚧 Rampur-Sarahan road reopened after 3 days.",
  "🚓 Special checkpost established at Swarghat for heavy vehicles.",
  "🌨️ Light snowfall reported at Jalori Pass; carry chains.",
  "⛽ New electric charging station opened near Bilaspur bypass."
];

export default function RoadNews() {
  const nav = useNavigate();

  return (
    <Box sx={{ background: T.bg, minHeight: "100vh", pb: 8 }}>
      {/* Newspaper Header */}
      <Box sx={{ borderBottom: `2px solid ${T.text}`, pt: 6, pb: 2, textAlign: "center", mb: 4 }}>
        <Container maxWidth="lg">
          <Typography sx={{ 
            fontFamily: "'Playfair Display', serif", 
            fontSize: { xs: 32, md: 56 }, 
            fontWeight: 900, 
            letterSpacing: -1,
            color: T.text,
            lineHeight: 1
          }}>
            THE INTELLICRASH BULLETIN
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, borderTop: `1px solid ${T.border}`, pt: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.textSub, textTransform: "uppercase" }}>
              Himachal Pradesh Edition
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.textSub, textTransform: "uppercase" }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.accent, textTransform: "uppercase" }}>
              Live Safety Updates
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Flash News Ticker */}
        <Box sx={{ 
          background: "#000", color: "#fff", py: 1, px: 2, mb: 4, borderRadius: 1,
          display: "flex", gap: 3, overflow: "hidden", whiteSpace: "nowrap"
        }}>
          <Typography sx={{ fontWeight: 900, fontSize: 12, color: T.accent, flexShrink: 0 }}>FLASH NEWS:</Typography>
          <Box sx={{ display: "flex", gap: 4, animation: "ticker 30s linear infinite", "@keyframes ticker": { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } } }}>
            {[...FLASH_NEWS, ...FLASH_NEWS].map((msg, i) => (
              <Typography key={i} sx={{ fontSize: 12, fontWeight: 600 }}>{msg}</Typography>
            ))}
          </Box>
        </Box>

        <Grid container spacing={4}>
          {/* Main Content Area */}
          <Grid item xs={12} md={8}>
            {/* Hero Story */}
            {NEWS_DATA.filter(n => n.isHero).map(hero => (
              <Box key={hero.id} sx={{ mb: 6, cursor: "pointer" }} onClick={() => nav(`/news/${hero.id}`)}>
                <Box sx={{ 
                  width: "100%", height: { xs: 240, md: 400 }, 
                  borderRadius: 2, overflow: "hidden", mb: 2,
                  position: "relative"
                }}>
                  <img src={hero.image} alt={hero.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <Chip 
                    label={hero.category} 
                    sx={{ position: "absolute", top: 16, left: 16, background: T.red, color: "#fff", fontWeight: 900, borderRadius: 1 }} 
                  />
                </Box>
                <Typography variant="h3" sx={{ 
                  fontFamily: "'Playfair Display', serif", 
                  fontWeight: 900, mb: 1.5, fontSize: { xs: 24, md: 36 },
                  "&:hover": { color: T.blue }
                }}>
                  {hero.title}
                </Typography>
                <Typography sx={{ color: T.textSub, fontSize: 16, lineHeight: 1.6, mb: 2 }}>
                  {hero.summary}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800 }}>BY {hero.author}</Typography>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: T.textSub }}>
                    <AccessTime sx={{ fontSize: 14 }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{hero.time}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: T.textSub, ml: "auto" }}>
                    <IconButton size="small"><Share sx={{ fontSize: 18 }} /></IconButton>
                    <IconButton size="small"><BookmarkBorder sx={{ fontSize: 18 }} /></IconButton>
                  </Box>
                </Box>
              </Box>
            ))}

            <Divider sx={{ mb: 4 }} />

            {/* Sub Stories Grid */}
            <Grid container spacing={3}>
              {NEWS_DATA.filter(n => !n.isHero).map(news => (
                <Grid item xs={12} sm={6} key={news.id}>
                  <Box sx={{ cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }} onClick={() => nav(`/news/${news.id}`)}>
                    <Box sx={{ width: "100%", height: 180, borderRadius: 1.5, overflow: "hidden", mb: 1.5 }}>
                      <img src={news.image} alt={news.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </Box>
                    <Typography sx={{ fontSize: 10, fontWeight: 900, color: T.blue, letterSpacing: 1, mb: 0.5 }}>{news.category}</Typography>
                    <Typography sx={{ 
                      fontFamily: "'Playfair Display', serif", 
                      fontWeight: 800, fontSize: 18, mb: 1,
                      "&:hover": { color: T.blue }
                    }}>
                      {news.title}
                    </Typography>
                    <Typography sx={{ color: T.textSub, fontSize: 13, lineHeight: 1.5, mb: 2, flex: 1 }}>
                      {news.summary.slice(0, 100)}...
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: T.textSub }}>
                      <LocationOn sx={{ fontSize: 12 }} />
                      <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{news.location}</Typography>
                      <Typography sx={{ fontSize: 11, ml: "auto" }}>{news.time}</Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Sidebar Area */}
          <Grid item xs={12} md={4}>
            {/* Live Stats Card */}
            <Box sx={{ background: "#f8fafc", p: 3, borderRadius: 2, border: `1px solid ${T.border}`, mb: 4 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 14, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <LocalFireDepartment sx={{ color: T.red }} /> LIVE SAFETY PULSE
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Active Reports</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 900, color: T.blue }}>14 Today</Typography>
                </Box>
                <Box sx={{ height: 4, background: "#e2e8f0", borderRadius: 2 }}>
                  <Box sx={{ width: "65%", height: "100%", background: T.blue, borderRadius: 2 }} />
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Avg. Risk Level</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 900, color: T.accent }}>Moderate (42)</Typography>
                </Box>
                <Box sx={{ height: 4, background: "#e2e8f0", borderRadius: 2 }}>
                  <Box sx={{ width: "42%", height: "100%", background: T.accent, borderRadius: 2 }} />
                </Box>
              </Box>
              <button style={{ 
                width: "100%", padding: "10px", borderRadius: 8, border: "none", 
                background: T.text, color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" 
              }}>
                VIEW LIVE MAP →
              </button>
            </Box>

            {/* Trending Sections */}
            <Typography sx={{ fontWeight: 900, fontSize: 12, color: T.textSub, letterSpacing: 1, mb: 2, textTransform: "uppercase" }}>Trending Topics</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4 }}>
              {["NH-5 Landslide", "Atal Tunnel Fog", "Shimla Traffic", "iRAD Data 2024", "Road Safety Week"].map(tag => (
                <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" sx={{ borderRadius: 1, fontWeight: 700, fontSize: 10, cursor: "pointer", "&:hover": { background: "#f1f5f9" } }} />
              ))}
            </Box>

            {/* Quick Links */}
            <Box sx={{ p: 2, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 2 }}>Safety Resources</Typography>
              {[
                { l: "Emergency Contacts", c: T.red },
                { l: "District Wise Tolls", c: T.text },
                { l: "Weather Forecast", c: T.blue },
                { l: "Report a Hazard", c: T.accent }
              ].map((item, i) => (
                <Box key={i} sx={{ py: 1.5, borderTop: i > 0 ? `1px solid ${T.border}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", "&:hover": { pl: 0.5, transition: "0.2s" } }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{item.l}</Typography>
                  <Typography sx={{ fontSize: 16, color: item.c }}>→</Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
