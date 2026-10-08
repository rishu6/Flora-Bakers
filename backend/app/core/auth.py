"""Small signed-cookie session for the single bakery staff account."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from fastapi import HTTPException, Request, status

from app.core.config import settings

SESSION_COOKIE = "flora_staff_session"
SESSION_SECONDS = 12 * 60 * 60


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _key() -> bytes:
    return settings.secret_key.get_secret_value().encode("utf-8")


def issue_session(username: str) -> str:
    payload = _b64(json.dumps({"sub": username, "exp": int(time.time()) + SESSION_SECONDS}, separators=(",", ":")).encode())
    signature = _b64(hmac.new(_key(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{signature}"


def _decode(token: str) -> str | None:
    try:
        payload, signature = token.split(".", 1)
        expected = _b64(hmac.new(_key(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            return None
        raw = base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))
        session = json.loads(raw)
        if int(session["exp"]) <= int(time.time()) or session["sub"] != settings.staff_username:
            return None
        return str(session["sub"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None


def require_staff(request: Request) -> str:
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") not in {value.rstrip("/") for value in settings.cors_origins}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This origin is not allowed to access staff tools.")
    token = request.cookies.get(SESSION_COOKIE, "")
    username = _decode(token)
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to access staff tools.")
    return username
