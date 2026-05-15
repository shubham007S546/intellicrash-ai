
import sys
import os

# Add the python directory to the path so we can import sentiment
sys.path.append(os.path.abspath("python"))

try:
    from dotenv import load_dotenv
    load_dotenv("python/.env")
except ImportError:
    pass

try:
    from sentiment import analyze_sentiment
    print("SUCCESS: Imported analyze_sentiment")
except ImportError as e:
    print(f"ERROR: Could not import analyze_sentiment: {e}")
    sys.exit(1)

test_texts = [
    "This app is amazing and very helpful!",
    "I hate this, it keeps crashing.",
    "It is okay, just another map app.",
    "Bahut acha app hai, Himachal roads ke liye perfect!"
]

print(f"{'LABEL':10} {'SCORE':>6}  {'POLARITY':>9}  TEXT")
print("-" * 70)
for t in test_texts:
    res = analyze_sentiment(t)
    print(f"[{res['label'].upper():8}] {res['score']:6.1f}  {res['polarity']:+.3f}  \"{t}\"")
