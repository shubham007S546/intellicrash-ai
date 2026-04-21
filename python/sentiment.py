"""
IntelliCrash — Sentiment Analysis Module  (FIXED v4.3.1)
Place this file in: intellicrash/python/sentiment.py

Install dependencies:
    pip install textblob
    python -m textblob.download_corpora

Optional (better multilingual accuracy for Hindi/English mixed reviews):
    pip install transformers torch

FIXES:
  - Score is always clamped to [0.0, 100.0] — never NaN or Infinity
  - Polarity is always clamped to [-1.0, 1.0]
  - All code paths return a valid dict with label/score/polarity
  - Added math.isnan / math.isinf guards throughout
  - TextBlob corpus auto-downloaded if missing
  - Subjectivity exposed in return dict for richer admin display
"""

import re
import math
import logging

logger = logging.getLogger(__name__)


def _safe_score(polarity: float) -> float:
    """Convert polarity [-1,1] to score [0,100], never NaN/Inf."""
    if not isinstance(polarity, (int, float)) or math.isnan(polarity) or math.isinf(polarity):
        return 50.0
    polarity = max(-1.0, min(1.0, polarity))           # clamp first
    score    = (polarity + 1.0) / 2.0 * 100.0
    return round(max(0.0, min(100.0, score)), 1)        # clamp output


def _safe_polarity(p: float) -> float:
    if not isinstance(p, (int, float)) or math.isnan(p) or math.isinf(p):
        return 0.0
    return round(max(-1.0, min(1.0, p)), 3)


def _label_from_polarity(polarity: float, threshold: float = 0.1) -> str:
    if polarity > threshold:
        return "positive"
    if polarity < -threshold:
        return "negative"
    return "neutral"


# ── Try HuggingFace first (better multilingual), fallback to TextBlob ─────────
_USE_TRANSFORMERS = False
_pipeline         = None

try:
    from transformers import pipeline as hf_pipeline
    _pipeline = hf_pipeline(
        "sentiment-analysis",
        model="lxyuan/distilbert-base-multilingual-cased-sentiments-student",
        top_k=None,
    )
    _USE_TRANSFORMERS = True
    logger.info("Sentiment: using HuggingFace multilingual model")
except Exception as _hf_err:
    logger.info(f"HuggingFace not available ({_hf_err}), trying TextBlob …")
    try:
        import textblob
        # Auto-download corpora if missing
        try:
            from textblob import TextBlob
            TextBlob("test").sentiment          # triggers corpus load
        except Exception:
            import subprocess, sys
            subprocess.run(
                [sys.executable, "-m", "textblob.download_corpora"],
                capture_output=True, timeout=60,
            )
        logger.info("Sentiment: using TextBlob")
    except ImportError:
        logger.warning(
            "No NLP library found.\n"
            "  Run: pip install textblob && python -m textblob.download_corpora\n"
            "  Falling back to keyword heuristic."
        )


def _clean(text: str) -> str:
    """Remove URLs and normalise whitespace."""
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ── Keyword sets for last-resort heuristic ───────────────────────────────────
_POS_WORDS = {
    "good", "great", "excellent", "safe", "helpful", "best", "amazing",
    "love", "useful", "perfect", "awesome", "nice", "fantastic", "superb",
    "acha", "badiya", "shukriya", "bahut", "outstanding", "reliable",
}
_NEG_WORDS = {
    "bad", "poor", "worst", "danger", "terrible", "useless", "crash",
    "wrong", "broken", "slow", "hate", "bura", "horrible", "awful",
    "frustrating", "disappointing", "issue", "problem", "error",
}


def analyze_sentiment(text: str) -> dict:
    """
    Analyse sentiment of a review string.

    Returns:
        {
            "label":       "positive" | "neutral" | "negative",
            "score":       0–100  (100 = most positive),   ← NEVER NaN
            "polarity":    -1.0 to 1.0,                    ← NEVER NaN
            "subjectivity": 0.0 to 1.0  (TextBlob only, else None)
        }
    """
    text = _clean(text)
    if not text:
        return {"label": "neutral", "score": 50.0, "polarity": 0.0, "subjectivity": None}

    # ── HuggingFace multilingual ──────────────────────────────────────────────
    if _USE_TRANSFORMERS and _pipeline:
        try:
            results = _pipeline(text[:512])[0]          # list of {label, score}
            scores  = {r["label"].lower(): float(r["score"]) for r in results}
            pos     = scores.get("positive", 0.0)
            neg     = scores.get("negative", 0.0)
            polarity = _safe_polarity(pos - neg)
            label    = _label_from_polarity(polarity, threshold=0.15)
            score    = _safe_score(polarity)
            return {"label": label, "score": score, "polarity": polarity, "subjectivity": None}
        except Exception as _e:
            logger.warning(f"Transformers inference failed, falling back: {_e}")

    # ── TextBlob ──────────────────────────────────────────────────────────────
    try:
        from textblob import TextBlob
        blob        = TextBlob(text)
        raw_pol     = blob.sentiment.polarity
        raw_sub     = blob.sentiment.subjectivity
        polarity    = _safe_polarity(raw_pol)
        subjectivity = round(float(raw_sub), 3) if (
            isinstance(raw_sub, (int, float))
            and not math.isnan(raw_sub)
            and not math.isinf(raw_sub)
        ) else None
        label = _label_from_polarity(polarity, threshold=0.1)
        score = _safe_score(polarity)
        return {"label": label, "score": score, "polarity": polarity, "subjectivity": subjectivity}
    except Exception as _e:
        logger.error(f"TextBlob failed: {_e}")

    # ── Last resort: keyword heuristic ────────────────────────────────────────
    tokens   = set(text.lower().split())
    pos_hits = len(tokens & _POS_WORDS)
    neg_hits = len(tokens & _NEG_WORDS)

    if pos_hits > neg_hits:
        return {"label": "positive", "score": 70.0, "polarity": 0.4, "subjectivity": None}
    if neg_hits > pos_hits:
        return {"label": "negative", "score": 30.0, "polarity": -0.4, "subjectivity": None}
    return {"label": "neutral", "score": 50.0, "polarity": 0.0, "subjectivity": None}


# ── Quick self-test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    samples = [
        "This app saved my life on the Shimla-Manali highway! Excellent risk alerts.",
        "The navigation keeps crashing. Very frustrating experience.",
        "It works okay. Nothing special.",
        "Bahut acha app hai, Himachal roads ke liye perfect!",
        "",                                              # edge: empty string
        "bad y=trip",                                   # edge: your real review
        "goodj",                                         # edge: your real review
    ]
    print(f"{'LABEL':10} {'SCORE':>6}  {'POLARITY':>9}  TEXT")
    print("-" * 70)
    for s in samples:
        r = analyze_sentiment(s)
        assert 0.0 <= r["score"] <= 100.0,  f"score out of range: {r}"
        assert -1.0 <= r["polarity"] <= 1.0, f"polarity out of range: {r}"
        assert r["label"] in ("positive", "neutral", "negative"), f"bad label: {r}"
        print(f"[{r['label'].upper():8}] {r['score']:6.1f}  {r['polarity']:+.3f}  \"{s[:50]}\"")
    print("\nAll assertions passed ✅")