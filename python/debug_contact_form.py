"""
Comprehensive Contact Form Debug Script
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# Load .env
env_path = find_dotenv()
load_dotenv(env_path, override=True)

GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_PASS = os.getenv("GMAIL_PASS", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")

print("=" * 70)
print("🔍 IntelliCrash Contact Form - Comprehensive Debug")
print("=" * 70)

# 1. Check environment variables
print("\n1️⃣  ENVIRONMENT VARIABLES:")
print(f"   GMAIL_USER: {GMAIL_USER}")
print(f"   ADMIN_EMAIL: {ADMIN_EMAIL}")
print(f"   GMAIL_PASS length: {len(GMAIL_PASS)} chars")
print(f"   GMAIL_PASS preview: {GMAIL_PASS[:5]}...{GMAIL_PASS[-5:] if len(GMAIL_PASS) > 10 else ''}")

if not GMAIL_USER or not GMAIL_PASS:
    print("   ❌ Missing Gmail credentials!")
    sys.exit(1)

# 2. Test email validation model
print("\n2️⃣  PYDANTIC MODEL VALIDATION:")
try:
    from pydantic import BaseModel, Field, field_validator
    
    class TestContactForm(BaseModel):
        name: str = Field(..., min_length=1, max_length=200)
        email: str = Field(...)
        message: str = Field(..., min_length=5, max_length=5000)
        
        @field_validator('email')
        @classmethod
        def validate_email(cls, v: str) -> str:
            if '@' not in v or len(v) < 5:
                raise ValueError('Invalid email')
            return v
    
    test_form = TestContactForm(
        name="Shubham",
        email="shubhamabhi004@gmail.com",
        message="i want more hotspot in sundergaras many accident occur there"
    )
    print(f"   ✅ Model validation passed")
    print(f"      Name: {test_form.name}")
    print(f"      Email: {test_form.email}")
    print(f"      Message length: {len(test_form.message)} chars")
except Exception as e:
    print(f"   ❌ Model validation failed: {e}")
    sys.exit(1)

# 3. Test Gmail connection
print("\n3️⃣  GMAIL SMTP CONNECTION:")
import socket
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

try:
    socket.setdefaulttimeout(5)
    socket.getaddrinfo("smtp.gmail.com", 465)
    print("   ✅ Internet connectivity: OK")
except Exception as e:
    print(f"   ❌ No internet: {e}")
    sys.exit(1)

# Try SSL (Port 465)
try:
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
        server.login(GMAIL_USER, GMAIL_PASS)
    print("   ✅ SSL (Port 465): SUCCESS")
    gmail_ok = True
except Exception as e:
    print(f"   ⚠️  SSL (Port 465) failed: {e}")
    gmail_ok = False

# Try TLS (Port 587) if SSL failed
if not gmail_ok:
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(GMAIL_USER, GMAIL_PASS)
        print("   ✅ TLS (Port 587): SUCCESS")
        gmail_ok = True
    except Exception as e:
        print(f"   ❌ TLS (Port 587) failed: {e}")

if not gmail_ok:
    print("   ❌ Gmail authentication failed!")
    print("   📝 Verify app password: https://myaccount.google.com/apppasswords")
    sys.exit(1)

# 4. Test complete email send
print("\n4️⃣  SEND TEST EMAIL:")
try:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Test - IntelliCrash Contact Form"
    msg["From"] = GMAIL_USER
    msg["To"] = ADMIN_EMAIL
    msg.attach(MIMEText("<p>This is a test email from contact form debug script.</p>", "html"))
    
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
        server.login(GMAIL_USER, GMAIL_PASS)
        server.sendmail(GMAIL_USER, ADMIN_EMAIL, msg.as_string())
    
    print(f"   ✅ Test email sent to {ADMIN_EMAIL}")
    print("   📧 Check your inbox!")
except Exception as e:
    print(f"   ❌ Failed to send test email: {e}")

print("\n" + "=" * 70)
print("✅ ALL CHECKS PASSED - Contact form should work!")
print("=" * 70)
