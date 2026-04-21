// IntelliCrash — Admin Sentiment Analytics Component
// Place at: intellicrash/frontend/src/components/AdminSentimentChart.jsx
//
// Usage in Admin.jsx — add inside your existing Admin page layout:
//   import AdminSentimentChart from "../components/AdminSentimentChart";
//   ...
//   <AdminSentimentChart />

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from "@mui/material";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import ReviewsIcon from "@mui/icons-material/Reviews";

const API_BASE = "/api";

// ── Color map ────────────────────────────────────────────────────────────────
const SENTIMENT_STYLES = {
  positive: {
    color: "#2e7d32",
    bg: "#e8f5e9",
    icon: <SentimentVerySatisfiedIcon />,
    label: "Positive",
  },
  neutral: {
    color: "#616161",
    bg: "#f5f5f5",
    icon: <SentimentNeutralIcon />,
    label: "Neutral",
  },
  negative: {
    color: "#c62828",
    bg: "#fce4ec",
    icon: <SentimentVeryDissatisfiedIcon />,
    label: "Negative",
  },
};

// ── Simple bar chart (pure CSS, no extra library) ────────────────────────────
const BarChart = ({ data, total }) => {
  if (!data || data.length === 0) return null;
  return (
    <Box>
      {data.map((item) => {
        const style = SENTIMENT_STYLES[item.sentiment] || SENTIMENT_STYLES.neutral;
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <Box key={item.sentiment} mb={1.5}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Box display="flex" alignItems="center" gap={0.75}>
                <Box sx={{ color: style.color, display: "flex", fontSize: 18 }}>
                  {style.icon}
                </Box>
                <Typography variant="body2" fontWeight={600}>
                  {style.label}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {item.count} reviews · avg score {item.avg_score}%
              </Typography>
            </Box>
            <Box
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: "#f0f0f0",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  width: `${pct}%`,
                  bgcolor: style.color,
                  borderRadius: 5,
                  transition: "width 0.6s ease",
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {pct}% of all reviews
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

// ── Sparkline: last 30 days trend (pure SVG) ─────────────────────────────────
const Sparkline = ({ data, color, field }) => {
  if (!data || data.length < 2) return null;
  const values = data.map((d) => d[field] || 0);
  const max = Math.max(...values, 1);
  const W = 200, H = 40, PAD = 4;
  const points = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v / max) * (H - PAD * 2));
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, bg, icon }) => (
  <Paper
    elevation={0}
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 3,
      p: 2,
      bgcolor: bg,
      height: "100%",
    }}
  >
    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
      <Box sx={{ color, fontSize: 22, display: "flex" }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
    </Box>
    <Typography variant="h4" fontWeight={700} sx={{ color }}>
      {value}
    </Typography>
    {sub && (
      <Typography variant="caption" color="text.secondary">
        {sub}
      </Typography>
    )}
  </Paper>
);

// ── Main component ───────────────────────────────────────────────────────────
const AdminSentimentChart = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/reviews/stats`);
        if (!res.ok) throw new Error("Failed to load stats");
        setStats(await res.json());
      } catch (e) {
        setError("Could not load sentiment stats.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error}
      </Alert>
    );
  if (!stats) return null;

  const posCount =
    stats.breakdown.find((b) => b.sentiment === "positive")?.count || 0;
  const negCount =
    stats.breakdown.find((b) => b.sentiment === "negative")?.count || 0;
  const neutCount =
    stats.breakdown.find((b) => b.sentiment === "neutral")?.count || 0;
  const posAvgRating =
    stats.breakdown.find((b) => b.sentiment === "positive")?.avg_rating || 0;
  const satisfactionPct =
    stats.total > 0 ? Math.round((posCount / stats.total) * 100) : 0;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <ReviewsIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          User Review Sentiment Analysis
        </Typography>
        <Chip
          label={`${stats.total} total`}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Positive"
            value={posCount}
            sub={`avg rating ${Number(posAvgRating).toFixed(1)} ★`}
            color="#2e7d32"
            bg="#e8f5e9"
            icon={<SentimentVerySatisfiedIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Neutral"
            value={neutCount}
            sub="No strong sentiment"
            color="#616161"
            bg="#f5f5f5"
            icon={<SentimentNeutralIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Negative"
            value={negCount}
            sub="Needs attention"
            color="#c62828"
            bg="#fce4ec"
            icon={<SentimentVeryDissatisfiedIcon />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Satisfaction"
            value={`${satisfactionPct}%`}
            sub="Positive / total"
            color="#1565c0"
            bg="#e3f2fd"
            icon={<ReviewsIcon />}
          />
        </Grid>
      </Grid>

      {/* Breakdown bars */}
      <Paper
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 2.5, mb: 2.5 }}
      >
        <Typography variant="subtitle2" fontWeight={600} mb={2}>
          Sentiment Breakdown
        </Typography>
        <BarChart data={stats.breakdown} total={stats.total} />
      </Paper>

      {/* 30-day sparklines */}
      {stats.last_30_days && stats.last_30_days.length > 1 && (
        <Paper
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 2.5 }}
        >
          <Typography variant="subtitle2" fontWeight={600} mb={2}>
            Last 30 Days Trend
          </Typography>
          <Grid container spacing={2}>
            {[
              { field: "positive", label: "Positive reviews", color: "#2e7d32" },
              { field: "neutral",  label: "Neutral reviews",  color: "#9e9e9e" },
              { field: "negative", label: "Negative reviews", color: "#c62828" },
            ].map(({ field, label, color }) => (
              <Grid item xs={12} sm={4} key={field}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Sparkline
                  data={stats.last_30_days}
                  color={color}
                  field={field}
                />
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ mt: 2, mb: 1 }} />
          <Typography variant="caption" color="text.secondary">
            Trend data helps you correlate road safety improvements with user satisfaction.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default AdminSentimentChart;
