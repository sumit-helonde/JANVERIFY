"""AuthN + RBAC + audit logging. Uses the existing reflected schema (users, audit_logs).

Dev-only synthetic credentials (clearly labelled, NOT real passwords — seeded hashes are
sha256("synth:<role>:<n>"), so the documented dev password is literally `<role>:<n>`):
  ADMIN     synthetic.admin.001@janverify.test / admin:1
  REVIEWER  synthetic.admin.002@janverify.test / admin:2   (role seeded as admin = can review too)
  INSPECTOR synthetic.inspector.001@janverify.test / inspector:1
  CITIZEN   synthetic.citizen.001@janverify.test / citizen:1
Token signing uses settings.jwt_secret (loaded from environment / backend/.env — never hardcoded).
Passwords are never stored or logged in plaintext.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select

from app.config import get_settings
from app.core.db import get_session
from app.api.routes._db import T
from app.services.audit import record_audit

router = APIRouter(prefix="/api/auth", tags=["auth"])

ROLE_PERMISSIONS = {
    "citizen": {"submit_citizen", "view_public"},
    "inspector": {"submit_inspection", "view_public"},
    "reviewer": {"review", "view_review", "view_public"},
    "admin": {"submit_inspection", "review", "view_review", "audit", "view_public"},
}

_REVOKED_SIGS: set[str] = set()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return "pbkdf2$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(dk).decode()


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("pbkdf2$"):
        try:
            _, salt_b64, dk_b64 = stored.split("$")
            salt = base64.b64decode(salt_b64)
            expected = base64.b64decode(dk_b64)
            candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
            return hmac.compare_digest(candidate, expected)
        except Exception:
            return False
    # Legacy synthetic-seed hashes (Phase 4). Documented dev-only credentials.
    return hmac.compare_digest(hashlib.sha256(f"synth:{password}".encode()).hexdigest(), stored)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def _sign(payload: str) -> str:
    secret = get_settings().jwt_secret.encode()
    return hmac.new(secret, payload.encode(), hashlib.sha256).hexdigest()


def create_token(user_id: int) -> str:
    exp = int(time.time()) + 12 * 60 * 60
    payload = _b64(json.dumps({"uid": user_id, "exp": exp}).encode())
    return f"{payload}.{_sign(payload)}"


def decode_token(token: str) -> int:
    try:
        payload_b64, sig = token.split(".")
        if sig in _REVOKED_SIGS:
            raise ValueError("revoked")
        if not hmac.compare_digest(_sign(payload_b64), sig):
            raise ValueError("bad signature")
        data = json.loads(_unb64(payload_b64))
        if data.get("exp", 0) < time.time():
            raise ValueError("expired")
        return int(data["uid"])
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session.") from exc


def get_current_user(authorization: str | None = Header(default=None), db=Depends(get_session)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    uid = decode_token(authorization.split(" ", 1)[1].strip())
    row = db.execute(select(T["users"]).where(T["users"].c.id == uid)).mappings().first()
    if not row or str(row["status"]).lower() != "active":
        raise HTTPException(status_code=401, detail="Account inactive or not found.")
    return row


def require_roles(*roles: str):
    allowed = set(roles)
    if not allowed or "admin" not in allowed:
        allowed.add("admin")

    def dep(user=Depends(get_current_user)):
        if str(user["role"]).lower() not in allowed:
            raise HTTPException(status_code=403, detail=f"Requires role: {'/'.join(sorted(allowed))}.")
        return user

    return dep


def has_perm(user, perm: str) -> bool:
    return perm in ROLE_PERMISSIONS.get(str(user["role"]).lower(), set())


def _user_out(u) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "full_name": u["full_name"],
        "role": u["role"],
        "status": u["status"],
    }


class LoginRequest(BaseModel):
    email: str
    password: str


def _try_login(db, email: str, password: str):
    if not email or not password:
        return None
    row = db.execute(select(T["users"]).where(T["users"].c.email == email.strip().lower())).mappings().first()
    if not row or not verify_password(password, row["password_hash"]):
        return None
    if str(row["status"]).lower() != "active":
        return None
    return row


@router.post("/login")
async def login(body: LoginRequest, request: Request, db=Depends(get_session)):
    user = _try_login(db, body.email, body.password)
    if not user:
        record_audit(db, actor_id=None, action="update",
                     entity_type="auth_attempt", entity_id=None,
                     before=None, after="failed",
                     source_reference=getattr(request.client, "host", None))
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    db.execute(T["users"].update().where(T["users"].c.id == user["id"]).values(last_login_at=datetime.now(timezone.utc)))
    db.commit()
    record_audit(db, actor_id=user["id"], action="create", entity_type="auth_session",
                 entity_id=user["id"], after="logged_in",
                 source_reference=getattr(request.client, "host", None))
    return {"token": create_token(user["id"]), "user": _user_out(user)}


@router.post("/logout")
async def logout(authorization: str | None = Header(default=None), db=Depends(get_session)):
    user = get_current_user(authorization, db)
    if authorization:
        parts = authorization.split(" ")
        if len(parts) == 2:
            _REVOKED_SIGS.add(parts[1].split(".")[-1])
    record_audit(db, actor_id=user["id"], action="update", entity_type="auth_session",
                 entity_id=user["id"], after="logged_out")
    return {"ok": True}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return _user_out(user)