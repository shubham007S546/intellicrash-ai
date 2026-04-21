// IntelliCrash — ReviewCard Component
// Place at: intellicrash/frontend/src/components/ReviewCard.jsx

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Rating,
  Avatar,
} from "@mui/material";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import RouteIcon from "@mui/icons-material/Route";

// ── Sentiment config ─────────────────────────────────────────────────────────
const SENTIMENT_CONFIG = {
  positive: {
    color: "success",
    icon: <SentimentVerySatisfiedIcon fontSize="small" />,
    label: "Positive",
    bgColor: "#e8f5e9",
    textColor: "#2e7d32",
  },
  neutral: {
    color: "default",
    icon: <SentimentNeutralIcon fontSize="small" />,
    label: "Neutral",
    bgColor: "#f5f5f5",
    textColor: "#616161",
  },
  negative: {
    color: "error",
    icon: <SentimentVeryDissatisfiedIcon fontSize="small" />,
    label: "Negative",
    bgColor: "#fce4ec",
    textColor: "#c62828",
  },
};

// ── Helper: initials avatar color from name ──────────────────────────────────
const stringToColor = (str = "") => {
  const colors = ["#1976d2", "#388e3c", "#f57c00", "#7b1fa2", "#0288d1", "#c62828"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name = "Anonymous") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ── ReviewCard ───────────────────────────────────────────────────────────────
/**
 * Props:
 *   review {
 *     id, user_name, review_text, rating,
 *     sentiment, sentiment_score, route, created_at
 *   }
 *   compact  boolean — smaller card for homepage grid
 */
const ReviewCard = ({ review, compact = false }) => {
  const {
    user_name = "Anonymous",
    review_text = "",
    rating = 5,
    sentiment = "positive",
    sentiment_score = 80,
    route,
    created_at,
  } = review || {};

  const config = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral;

  const formattedDate = created_at
    ? new Date(created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.2s, transform 0.2s",
        "&:hover": {
          boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: compact ? 2 : 2.5 }}>
        {/* Header row: avatar + name + date */}
        <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
          <Avatar
            sx={{
              width: 38,
              height: 38,
              bgcolor: stringToColor(user_name),
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {getInitials(user_name)}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography
              variant="subtitle2"
              fontWeight={600}
              noWrap
              sx={{ lineHeight: 1.3 }}
            >
              {user_name}
            </Typography>
            {formattedDate && (
              <Typography variant="caption" color="text.secondary">
                {formattedDate}
              </Typography>
            )}
          </Box>
          {/* Sentiment score pill */}
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 10,
              bgcolor: config.bgColor,
              color: config.textColor,
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {sentiment_score.toFixed(0)}%
          </Box>
        </Box>

        {/* Star rating */}
        <Rating
          value={rating}
          readOnly
          size="small"
          sx={{ mb: 1, color: "#f59e0b" }}
        />

        {/* Review text */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            lineHeight: 1.6,
            display: "-webkit-box",
            WebkitLineClamp: compact ? 3 : 5,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            mb: 1.5,
          }}
        >
          "{review_text}"
        </Typography>

        {/* Footer: sentiment badge + route */}
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Chip
            icon={config.icon}
            label={config.label}
            size="small"
            sx={{
              bgcolor: config.bgColor,
              color: config.textColor,
              fontWeight: 600,
              fontSize: 11,
              height: 24,
              "& .MuiChip-icon": { color: config.textColor },
            }}
          />
          {route && (
            <Chip
              icon={<RouteIcon fontSize="small" />}
              label={route}
              size="small"
              variant="outlined"
              sx={{ fontSize: 11, height: 24 }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ReviewCard;
