// IntelliCrash — ReviewSection Component
// Place at: intellicrash/frontend/src/components/ReviewSection.jsx
//
// Usage in Home.jsx — add near the bottom of the page:
//   import ReviewSection from "../components/ReviewSection";
//   ...
//   <ReviewSection />

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Rating,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Skeleton,
} from "@mui/material";
import RateReviewIcon from "@mui/icons-material/RateReview";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ReviewCard from "./ReviewCard";

const API_BASE = "/api"; // Vite proxy forwards to :8000

// ── Skeleton loader for cards ────────────────────────────────────────────────
const ReviewSkeleton = () => (
  <Box
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 3,
      p: 2.5,
      height: "100%",
    }}
  >
    <Box display="flex" gap={1.5} mb={1.5}>
      <Skeleton variant="circular" width={38} height={38} />
      <Box flex={1}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} sx={{ mt: 0.5 }} />
      </Box>
    </Box>
    <Skeleton width="30%" height={12} sx={{ mb: 1 }} />
    <Skeleton height={14} />
    <Skeleton height={14} />
    <Skeleton width="70%" height={14} sx={{ mb: 1.5 }} />
    <Skeleton width="40%" height={24} sx={{ borderRadius: 10 }} />
  </Box>
);

// ── Main component ───────────────────────────────────────────────────────────
const ReviewSection = () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [topReviews, setTopReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [form, setForm] = useState({
    user_name: "",
    review_text: "",
    rating: 5,
    route: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // { label, score } or null
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ── Fetch top reviews ──────────────────────────────────────────────────────
  const fetchTopReviews = useCallback(async () => {
    setLoadingReviews(true);
    setFetchError("");
    try {
      const res = await fetch(`${API_BASE}/reviews/top?limit=6`);
      if (!res.ok) throw new Error("Failed to load reviews");
      const data = await res.json();
      setTopReviews(data);
    } catch (err) {
      setFetchError("Could not load reviews. Please refresh.");
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    fetchTopReviews();
  }, [fetchTopReviews]);

  // ── Handle form input ──────────────────────────────────────────────────────
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSubmitError("");
  };

  // ── Submit review ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.review_text.trim() || form.review_text.trim().length < 5) {
      setSubmitError("Please write at least 5 characters.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitResult(null);

    try {
      const res = await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: form.user_name.trim() || "Anonymous",
          review_text: form.review_text.trim(),
          rating: form.rating,
          route: form.route.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Submission failed");
      }

      const data = await res.json();
      setSubmitResult({ label: data.sentiment, score: data.sentiment_score });
      setSubmitted(true);
      setForm({ user_name: "", review_text: "", rating: 5, route: "" });

      // Refresh top reviews after a short delay so new positive ones appear
      setTimeout(fetchTopReviews, 800);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Sentiment result banner ────────────────────────────────────────────────
  const SentimentBanner = () => {
    if (!submitResult) return null;
    const map = {
      positive: {
        severity: "success",
        msg: `Thanks! Your review scored ${submitResult.score.toFixed(0)}% positive and may appear in top reviews.`,
      },
      neutral: {
        severity: "info",
        msg: `Thanks for the feedback! Your review was analysed as neutral (score: ${submitResult.score.toFixed(0)}%).`,
      },
      negative: {
        severity: "warning",
        msg: `We're sorry to hear that. Your feedback helps us improve IntelliCrash.`,
      },
    };
    const { severity, msg } = map[submitResult.label] || map.neutral;
    return (
      <Alert
        severity={severity}
        icon={<CheckCircleOutlineIcon />}
        sx={{ mt: 2, borderRadius: 2 }}
        onClose={() => setSubmitResult(null)}
      >
        {msg}
      </Alert>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ mt: 6, mb: 4 }}>
      {/* Section header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={1}>
        <StarIcon sx={{ color: "#f59e0b", fontSize: 28 }} />
        <Typography variant="h5" fontWeight={700}>
          What Drivers Are Saying
        </Typography>
        <Chip
          label="HP Roads"
          size="small"
          sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 600, fontSize: 11 }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Real reviews from Himachal Pradesh drivers — analysed by our NLP sentiment model.
      </Typography>

      {/* ── Top reviews grid ── */}
      {fetchError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {fetchError}
        </Alert>
      ) : (
        <Grid container spacing={2} mb={4}>
          {loadingReviews
            ? Array.from({ length: 3 }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <ReviewSkeleton />
                </Grid>
              ))
            : topReviews.length === 0
            ? (
                <Grid item xs={12}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                    py={4}
                  >
                    No reviews yet — be the first to share your experience!
                  </Typography>
                </Grid>
              )
            : topReviews.map((review) => (
                <Grid item xs={12} sm={6} md={4} key={review.id}>
                  <ReviewCard review={review} compact />
                </Grid>
              ))}
        </Grid>
      )}

      <Divider sx={{ mb: 4 }} />

      {/* ── Submit form ── */}
      <Box
        sx={{
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
          maxWidth: 680,
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2.5}>
          <RateReviewIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Share Your Experience
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Name */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Your Name (optional)"
              name="user_name"
              value={form.user_name}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={submitting}
              placeholder="e.g. Raj Sharma"
            />
          </Grid>

          {/* Route */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Route (optional)"
              name="route"
              value={form.route}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={submitting}
              placeholder="e.g. Shimla → Manali"
            />
          </Grid>

          {/* Rating */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Typography variant="body2" color="text.secondary">
                Rating:
              </Typography>
              <Rating
                name="rating"
                value={form.rating}
                onChange={(_, val) =>
                  setForm((p) => ({ ...p, rating: val || 1 }))
                }
                size="medium"
                disabled={submitting}
                sx={{ color: "#f59e0b" }}
              />
              <Typography variant="body2" color="text.secondary">
                ({form.rating}/5)
              </Typography>
            </Box>
          </Grid>

          {/* Review text */}
          <Grid item xs={12}>
            <TextField
              label="Your Review"
              name="review_text"
              value={form.review_text}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              size="small"
              disabled={submitting}
              placeholder="Tell us how IntelliCrash helped you on HP mountain roads…"
              inputProps={{ maxLength: 1000 }}
              helperText={`${form.review_text.length}/1000 characters · Sentiment analysed automatically`}
            />
          </Grid>

          {/* Error */}
          {submitError && (
            <Grid item xs={12}>
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {submitError}
              </Alert>
            </Grid>
          )}

          {/* Success banner */}
          {submitted && submitResult && (
            <Grid item xs={12}>
              <SentimentBanner />
            </Grid>
          )}

          {/* Submit button */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || !form.review_text.trim()}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <RateReviewIcon />
                )
              }
              sx={{ borderRadius: 2, px: 3, textTransform: "none", fontWeight: 600 }}
            >
              {submitting ? "Analysing sentiment…" : "Submit Review"}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ReviewSection;
