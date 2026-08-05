import hashlib
import hmac
import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

load_dotenv()

app = FastAPI(title="Findora Email Verification API", version="2.0.0")

allowed_origins = [origin.strip() for origin in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,https://findora.wisedev.online"
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

SECRET_KEY = os.environ["SECRET_KEY"]
RESEND_API_KEY = os.environ["RESEND_API_KEY"].strip()
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "noreply@wisedev.online")
DB_PATH = os.getenv("DB_PATH", "/tmp/email_verification.db")
OTP_TTL_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60
MAX_OTP_ATTEMPTS = 5


class EmailRequest(BaseModel):
    email: EmailStr


class OTPVerificationRequest(EmailRequest):
    code: str


def connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                email TEXT PRIMARY KEY,
                is_verified INTEGER NOT NULL DEFAULT 0,
                otp_hash TEXT,
                otp_expires_at TEXT,
                otp_attempts INTEGER NOT NULL DEFAULT 0,
                otp_sent_at TEXT,
                created_at TEXT NOT NULL,
                verified_at TEXT
            )
        """)
        # Supports upgrades from the original token-based SQLite database.
        columns = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
        for name, definition in {
            "otp_hash": "TEXT",
            "otp_expires_at": "TEXT",
            "otp_attempts": "INTEGER NOT NULL DEFAULT 0",
            "otp_sent_at": "TEXT",
        }.items():
            if name not in columns:
                conn.execute(f"ALTER TABLE users ADD COLUMN {name} {definition}")


init_db()


def now() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: datetime) -> str:
    return value.isoformat()


def get_user(email: str) -> Optional[sqlite3.Row]:
    with connection() as conn:
        return conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()


def hash_otp(email: str, code: str) -> str:
    return hmac.new(
        SECRET_KEY.encode(), f"{email.lower()}:{code}".encode(), hashlib.sha256
    ).hexdigest()


def create_otp(email: str) -> str:
    code = f"{secrets.randbelow(1_000_000):06d}"
    issued_at = now()
    with connection() as conn:
        conn.execute("""
            INSERT INTO users (email, is_verified, otp_hash, otp_expires_at, otp_attempts, otp_sent_at, created_at)
            VALUES (?, 0, ?, ?, 0, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                otp_hash = excluded.otp_hash,
                otp_expires_at = excluded.otp_expires_at,
                otp_attempts = 0,
                otp_sent_at = excluded.otp_sent_at
        """, (email.lower(), hash_otp(email, code), iso(issued_at + timedelta(minutes=OTP_TTL_MINUTES)), iso(issued_at), iso(issued_at)))
    return code


def send_otp_email(email: str, code: str) -> bool:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#17211d">
      <h1 style="margin:0 0 16px">Verify your Findora email</h1>
      <p>Enter this verification code in Findora:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:28px 0">{code}</p>
      <p>This code expires in {OTP_TTL_MINUTES} minutes. Do not share it with anyone.</p>
    </div>"""
    response = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={
            "from": f"Findora <{RESEND_FROM_EMAIL}>",
            "to": [email],
            "subject": "Your Findora verification code",
            "html": html,
            "reply_to": RESEND_FROM_EMAIL,
        },
        timeout=30,
    )
    return response.status_code in (200, 201)


def request_otp(email: str, message: str) -> dict:
    user = get_user(email)
    if user and user["is_verified"]:
        raise HTTPException(status_code=409, detail="Email already verified")
    if user and user["otp_sent_at"]:
        sent_at = datetime.fromisoformat(user["otp_sent_at"])
        if now() - sent_at < timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS):
            raise HTTPException(status_code=429, detail="Please wait one minute before requesting another code")
    code = create_otp(email)
    if not send_otp_email(email, code):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to send verification code")
    return {"status": "success", "message": message, "data": {"email": email}}


@app.get("/health")
def health_check():
    return {"status": "healthy", "resend_configured": bool(RESEND_API_KEY)}


@app.post("/request-otp")
def request_otp_endpoint(request: EmailRequest):
    return request_otp(str(request.email), "Verification code sent")


@app.post("/resend-otp")
def resend_otp_endpoint(request: EmailRequest):
    return request_otp(str(request.email), "Verification code resent")


@app.post("/verify-otp")
def verify_otp(request: OTPVerificationRequest):
    email = str(request.email).lower()
    code = request.code.strip()
    if not (len(code) == 6 and code.isdigit()):
        raise HTTPException(status_code=400, detail="Enter the six-digit verification code")
    user = get_user(email)
    if not user or not user["otp_hash"] or not user["otp_expires_at"]:
        raise HTTPException(status_code=400, detail="Request a new verification code")
    if user["is_verified"]:
        return {"success": True, "message": "Email already verified", "email": email, "is_verified": True}
    if now() > datetime.fromisoformat(user["otp_expires_at"]):
        raise HTTPException(status_code=400, detail="This verification code has expired")
    if user["otp_attempts"] >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new verification code")
    if not hmac.compare_digest(user["otp_hash"], hash_otp(email, code)):
        with connection() as conn:
            conn.execute("UPDATE users SET otp_attempts = otp_attempts + 1 WHERE email = ?", (email,))
        raise HTTPException(status_code=400, detail="Incorrect verification code")
    with connection() as conn:
        conn.execute("""UPDATE users SET is_verified = 1, verified_at = ?, otp_hash = NULL,
            otp_expires_at = NULL, otp_attempts = 0 WHERE email = ?""", (iso(now()), email))
    return {"success": True, "message": "Email verified successfully", "email": email, "is_verified": True}


@app.get("/status/{email}")
def check_status(email: EmailStr):
    user = get_user(str(email))
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"success": True, "message": "Status retrieved", "email": str(email), "is_verified": bool(user["is_verified"])}
