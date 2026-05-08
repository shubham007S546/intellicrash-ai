"""
Test Email Connection
Verify Gmail credentials are working
"""
import os
import smtplib
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# Load environment variables
env_path = find_dotenv()
load_dotenv(env_path, override=True)

GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_PASS = os.getenv("GMAIL_PASS", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")

print("=" * 60)
print("🧪 IntelliCrash Email Test")
print("=" * 60)

# Check if credentials are loaded
print(f"\n📧 Gmail User: {GMAIL_USER}")
print(f"📧 Admin Email: {ADMIN_EMAIL}")
print(f"🔑 Password loaded: {'✅ Yes' if GMAIL_PASS else '❌ No'}")

if not GMAIL_USER or not GMAIL_PASS:
    print("\n❌ ERROR: Gmail credentials not found in .env file!")
    print("Make sure GMAIL_USER and GMAIL_PASS are set in .env")
    exit(1)

# Test SMTP connection
print("\n⏳ Testing SMTP connection...")
try:
    # Try SSL first
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
        server.login(GMAIL_USER, GMAIL_PASS)
        print("✅ SSL Connection: SUCCESS (Port 465)")
except Exception as e:
    print(f"❌ SSL Connection failed: {e}")
    try:
        # Try TLS
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(GMAIL_USER, GMAIL_PASS)
            print("✅ TLS Connection: SUCCESS (Port 587)")
    except Exception as e2:
        print(f"❌ TLS Connection failed: {e2}")
        print("\n⚠️  TROUBLESHOOTING:")
        print("1. Check Gmail credentials are correct")
        print("2. Use App Password (not regular Gmail password)")
        print("   → https://myaccount.google.com/apppasswords")
        print("3. Allow less secure apps if using regular password")
        exit(1)

print("\n✅ Email Configuration: READY")
print("=" * 60)
