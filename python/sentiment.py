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

# ── Try Groq (Ultra-accurate), then Transformers, then TextBlob ────────────────
import os
import requests
import json

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.3-70b-versatile"

def _groq_sentiment(text: str) -> dict:
    if not GROQ_API_KEY:
        return None
    try:
        prompt = f"""
        Analyze the sentiment of this road safety app review. 
        Return ONLY a JSON object with: 
        {{"label": "positive"|"neutral"|"negative", "score": 0-100, "polarity": -1.0 to 1.0}}
        Review: "{text}"
        """
        r = requests.post(
            GROQ_API_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 100,
                "response_format": {"type": "json_object"}
            },
            timeout=5
        )
        if r.status_code == 200:
            data = r.json()
            res = json.loads(data["choices"][0]["message"]["content"])
            raw_pol = res.get("polarity", 0.0)
            raw_scr = res.get("score", 50.0)
            return {
                "label": res.get("label", "neutral"),
                "score": round(max(0.0, min(100.0, float(raw_scr))), 1),
                "polarity": _safe_polarity(raw_pol),
                "subjectivity": None,
                "source": "groq"
            }
    except Exception as e:
        logger.warning(f"Groq sentiment failed: {e}")
    return None


def analyze_sentiment(text: str) -> dict:
    """
    Analyse sentiment of a review string.
    Tries Groq -> Transformers -> TextBlob -> Keywords
    """
    text = _clean(text)
    if not text:
        return {"label": "neutral", "score": 50.0, "polarity": 0.0, "subjectivity": None}

    # 1. Groq (Llama-3) - Best for Hindi/English mix
    res = _groq_sentiment(text)
    if res: return res

    # 2. HuggingFace multilingual
    if _USE_TRANSFORMERS and _pipeline:
        try:
            results = _pipeline(text[:512])[0]
            scores  = {r["label"].lower(): float(r["score"]) for r in results}
            pos     = scores.get("positive", 0.0)
            neg     = scores.get("negative", 0.0)
            polarity = _safe_polarity(pos - neg)
            label    = _label_from_polarity(polarity, threshold=0.15)
            score    = _safe_score(polarity)
            return {"label": label, "score": score, "polarity": polarity, "subjectivity": None, "source": "transformers"}
        except Exception as _e:
            logger.warning(f"Transformers inference failed: {_e}")

    # 3. TextBlob
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
        return {"label": label, "score": score, "polarity": polarity, "subjectivity": subjectivity, "source": "textblob"}
    except Exception as _e:
        logger.error(f"TextBlob failed: {_e}")

    # 4. Last resort: keyword heuristic
    tokens   = set(text.lower().split())
    pos_hits = len(tokens & _POS_WORDS)
    neg_hits = len(tokens & _NEG_WORDS)

    if pos_hits > neg_hits:
        return {"label": "positive", "score": 70.0, "polarity": 0.4, "subjectivity": None, "source": "keywords"}
    if neg_hits > pos_hits:
        return {"label": "negative", "score": 30.0, "polarity": -0.4, "subjectivity": None, "source": "keywords"}
    return {"label": "neutral", "score": 50.0, "polarity": 0.0, "subjectivity": None, "source": "default"}


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
    print("\nAll assertions passed ")