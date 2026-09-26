"""CivicWatch: role-driven civic issue lifecycle.

Roles (never hardcoded on the client; the backend enforces every guard):
  CITIZEN  -> citizen      : report issues, corroborate, verify the fix
  AUTHORITY/WORKER -> inspector : respond, log action, mark work done
  GOVERNMENT/DEPARTMENT -> department_official : read-only oversight dashboards
  JANVERIFY TEAM -> admin   : neutral review of conflicting records + audit

Status flow:
  CITIZEN_SUBMITTED -> (>=3 confirmations) -> AUTHORITY_NOTIFIED
    -> UNDER_ACTION -> WORK_IN_PROGRESS -> MARKED_FIXED
    -> (citizen verdict) CITIZEN_VERIFIED | CONFLICTING
    -> (team decision) RESOLVED | CLOSED | back to CONFLICTING/QUESTIONABLE

TRUSTMESH state lives on the issue (trust_state). The product-level 24-hour
response target (sla_exceeded) is a UX state, never a legal claim.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import select, update

from app.core.db import get_session
from app.api.routes._db import T
from app.api.routes.auth import get_current_user, require_roles
from app.services.audit import record_audit

router = APIRouter(prefix="/api/civicwatch", tags=["civicwatch"])

RESOLVED_STATES = {"MARKED_FIXED", "CITIZEN_VERIFIED", "RESOLVED", "CLOSED"}

# Representative Wikimedia Commons images used when an action is not attached
# to a real photo. Always labelled, never evidence of a specific incident.
DEFAULT_IMAGES = {
    "roads": (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Potholes_on_road.jpg/960px-Potholes_on_road.jpg",
        "Representative potholed road surface (Wikimedia Commons).",
        "KEmel49",
        "CC BY-SA 4.0",
    ),
    "manholes": (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Old_Manhole_cover_in_India.jpg/960px-Old_Manhole_cover_in_India.jpg",
        "Representative damaged manhole cover (Wikimedia Commons).",
        "Sindugab",
        "CC0",
    ),
    "garbage": (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Potholes_on_road.jpg/960px-Potholes_on_road.jpg",
        "Representative civic waste image (Wikimedia Commons).",
        "KEmel49",
        "CC BY-SA 4.0",
    ),
    "water": (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/India_-_Bombay_-_31_-_garbage_dump_%282799575380%29.jpg/960px-India_-_Bombay_-_31_-_garbage_dump_%282799575380%29.jpg",
        "Representative drainage image (Wikimedia Commons).",
        "McKay Savage",
        "CC BY 2.0",
    ),
    "streetlights": (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Potholes_on_road.jpg/960px-Potholes_on_road.jpg",
        "Representative street infrastructure image (Wikimedia Commons).",
        "KEmel49",
        "CC BY-SA 4.0",
    ),
    "other": (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Potholes_on_road.jpg/960px-Potholes_on_road.jpg",
        "Representative infrastructure image (Wikimedia Commons).",
        "KEmel49",
        "CC BY-SA 4.0",
    ),
}

VALID_VERDICTS = {"FIXED", "PARTIALLY_FIXED", "STILL_EXISTS"}
TRUST_STATES = {
    "SUPPORTED",
    "INCOMPLETE",
    "CONFLICTING",
    "QUESTIONABLE",
    "HUMAN_REVIEW_REQUIRED",
    "INSUFFICIENT",
}

# Citizen report categories -> (stored category slug, CivicWatch feed bucket).
CITIZEN_CATEGORIES: dict[str, tuple[str, str]] = {
    "roads": ("roads", "roads"),
    "bridges": ("bridges", "roads"),
    "schools": ("schools", "other"),
    "hospitals": ("hospitals", "other"),
    "water plants": ("water_plants", "water"),
    "water supply": ("water_supply", "water"),
    "public buildings": ("public_buildings", "other"),
    "other infrastructure": ("other", "other"),
}
CATEGORY_ALIASES = {
    "road": "roads",
    "bridge": "bridges",
    "school": "schools",
    "hospital": "hospitals",
    "water plant": "water plants",
    "water plants": "water plants",
    "public building": "public buildings",
    "other": "other infrastructure",
}

# Uploaded citizen photos: dedicated directory, generated filename only.
CIVIC_UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads" / "civicwatch"
CIVIC_UPLOAD_URL_PREFIX = "/api/uploads/civicwatch"
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
# Set on Vercel so photos go to durable object storage instead of the
# read-only, ephemeral serverless filesystem.
BLOB_READ_WRITE_TOKEN = os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip()


def _resolve_category(raw: str | None) -> tuple[str, str]:
    key = (raw or "").strip().lower()
    key = CATEGORY_ALIASES.get(key, key)
    if key not in CITIZEN_CATEGORIES:
        raise HTTPException(
            status_code=422,
            detail="category must be one of: Roads, Bridges, Schools, Hospitals, "
            "Water Plants, Water Supply, Public Buildings, Other Infrastructure.",
        )
    return CITIZEN_CATEGORIES[key]


def _store_citizen_photo(upload) -> tuple[str, str, int]:
    """Persist an uploaded citizen photo under a generated, sanitized name.

    Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set (serverless has no
    persistent disk), otherwise the local uploads directory.
    """
    content_type = (upload.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Photo must be a JPG, PNG or WEBP image.",
        )
    data = upload.file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Photo is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Photo is larger than the 8 MB limit.",
        )
    digest = sha256(data).hexdigest()
    filename = f"{digest}{ALLOWED_IMAGE_TYPES[content_type]}"

    if BLOB_READ_WRITE_TOKEN:
        from vercel_blob import put as blob_put

        result = blob_put(
            f"civicwatch/{filename}",
            data,
            access="public",
            content_type=content_type,
            add_random_suffix=False,
            token=BLOB_READ_WRITE_TOKEN,
        )
        return result.url, digest, len(data)

    CIVIC_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = CIVIC_UPLOAD_DIR / filename
    if not dest.exists():
        dest.write_bytes(data)
    return f"{CIVIC_UPLOAD_URL_PREFIX}/{filename}", digest, len(data)


class CreateIssueRequest(BaseModel):
    title: str
    description: str
    category: str
    category_key: str
    ward: str | None = None
    locality: str | None = None
    city: str = "Nagpur"
    latitude: float | None = None
    longitude: float | None = None
    photo_url: str | None = None
    photo_caption: str | None = None


class TransitionBody(BaseModel):
    note: str = ""
    photo_url: str | None = None
    photo_caption: str | None = None


class VerifyBody(BaseModel):
    verdict: str
    note: str = ""


class ReviewBody(BaseModel):
    decision: str
    note: str = ""


def _location(row) -> str:
    if row["ward"]:
        return f"{row['ward']}, {row['city']}"
    if row["locality"]:
        return f"{row['locality']}, {row['city']}"
    return row["city"]


def _strip(text: str | None) -> str:
    return (text or "").strip()


def _default_image(category_key: str):
    return DEFAULT_IMAGES.get(category_key, DEFAULT_IMAGES["other"])


def _capabilities(role: str) -> dict:
    role = str(role).lower()
    return {
        "can_create": role in {"citizen", "admin"},
        "can_confirm": role in {"citizen", "admin"},
        "can_act": role in {"inspector", "admin"},
        "can_verify": role in {"citizen", "admin"},
        "can_review": role == "admin",
        "can_view": True,
    }


def _issue_out(row, role: str) -> dict:
    sla_exceeded = bool(row["sla_exceeded"])
    if (
        row["status"] in RESOLVED_STATES
        and row["reported_at"]
        and (datetime.now(timezone.utc) - row["reported_at"]).total_seconds() / 3600 < float(row["target_hours"] or 24)
    ):
        sla_exceeded = False
    return {
        "id": row["id"],
        "issue_reference": row["issue_reference"],
        "reported_by_id": row["reported_by_id"],
        "title": row["title"],
        "description": row["description"],
        "category": row["category"],
        "category_key": row["category_key"],
        "ward": row["ward"],
        "locality": row["locality"],
        "city": row["city"],
        "location": _location(row),
        "latitude": float(row["latitude"]) if row["latitude"] is not None else None,
        "longitude": float(row["longitude"]) if row["longitude"] is not None else None,
        "status": row["status"],
        "review_status": "PENDING_REVIEW" if row["status"] == "CITIZEN_SUBMITTED" else "REVIEWED",
        "trust_state": row["trust_state"],
        "confirmations": row["confirmations"],
        "comments_count": row["comments_count"],
        "reported_at": row["reported_at"].isoformat() if row["reported_at"] else None,
        "notified_at": row["notified_at"].isoformat() if row["notified_at"] else None,
        "sla": {
            "target_hours": row["target_hours"],
            "exceeded": sla_exceeded,
            "note": "24-hour response target is a product-level demo state, not a legal deadline.",
        },
        "main_image": {
            "url": row["main_image_url"],
            "caption": row["main_image_caption"],
            "attribution": row["main_image_attribution"],
            "license": row["main_image_license"],
        },
        "evidence": row["evidence"] or [],
        "verdict": row["verdict"],
        "verdict_note": row["verdict_note"],
        "verified_at": row["verified_at"].isoformat() if row["verified_at"] else None,
        "capabilities": _capabilities(role),
    }


def _get_issue(db, issue_id):
    if str(issue_id).isdigit():
        row = db.execute(
            select(T["civic_issues"]).where(T["civic_issues"].c.id == int(issue_id))
        ).mappings().first()
    else:
        row = db.execute(
            select(T["civic_issues"]).where(T["civic_issues"].c.issue_reference == str(issue_id))
        ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Civic issue not found.")
    return row


def _next_reference(db) -> str:
    base = 100
    rows = db.execute(
        select(T["civic_issues"].c.issue_reference)
    ).scalars().all()
    nums = []
    for ref in rows:
        try:
            nums.append(int(ref.split("-")[-1]))
        except (ValueError, IndexError):
            continue
    return f"CW-{max([base] + nums) + 1}"


def _audit(db, user, action: str, issue_id, before, after, ref: str) -> None:
    record_audit(
        db, actor_id=user["id"] if user else None, action=action,
        entity_type="civic_issue", entity_id=issue_id,
        before=before, after=after,
        source_reference=f"REF={ref}",
    )


@router.get("/issues")
async def list_issues(
    limit: int = Query(default=50, le=200),
    status: str | None = None,
    category_key: str | None = None,
    user=Depends(get_current_user),
    db=Depends(get_session),
):
    stmt = select(T["civic_issues"]).order_by(T["civic_issues"].c.reported_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(T["civic_issues"].c.status == status)
    if category_key:
        stmt = stmt.where(T["civic_issues"].c.category_key == category_key)
    rows = db.execute(stmt).mappings().all()
    return {"items": [_issue_out(r, user["role"]) for r in rows]}


@router.get("/issues/{issue_id}")
async def get_issue(
    issue_id: str,
    user=Depends(get_current_user),
    db=Depends(get_session),
):
    row = _get_issue(db, issue_id)
    return _issue_out(row, user["role"])


@router.get("/issues/{issue_id}/timeline")
async def get_issue_timeline(
    issue_id: str,
    user=Depends(get_current_user),
    db=Depends(get_session),
):
    row = _get_issue(db, issue_id)
    rows = db.execute(
        select(T["audit_logs"], T["users"].c.email.label("actor_email"))
        .join(T["users"], T["audit_logs"].c.actor_id == T["users"].c.id, isouter=True)
        .where(T["audit_logs"].c.entity_type == "civic_issue")
        .where(T["audit_logs"].c.entity_id == str(row["id"]))
        .order_by(T["audit_logs"].c.occurred_at.asc())
    ).mappings().all()
    return {
        "items": [
            {
                "timestamp": str(r["occurred_at"]),
                "actor_email": r["actor_email"],
                "action": r["action_type"],
                "before": r["before"],
                "after": r["after"],
                "source": r["source_reference"],
            }
            for r in rows
        ]
    }


@router.post("/issues", status_code=201)
async def create_issue(
    request: Request,
    user=Depends(get_current_user),
    db=Depends(get_session),
):
    """Citizen-only public issue submission.

    Accepts either a JSON body (internal/demo callers) or a multipart form with
    a real uploaded photo. The photo is written to ``backend/uploads/civicwatch``
    under a generated sha256 filename and served from ``/uploads/civicwatch/...``.

    A citizen submission is always stored as CITIZEN_SUBMITTED / PENDING_REVIEW.
    It is never automatically supported or verified.
    """
    if str(user["role"]).lower() != "citizen":
        raise HTTPException(status_code=403, detail="Only a citizen can submit a CivicWatch report.")

    content_type = (request.headers.get("content-type") or "").lower()
    photo_url: str | None = None
    photo_caption: str | None = None
    city = "Nagpur"
    ward: str | None = None
    locality: str | None = None
    latitude: float | None = None
    longitude: float | None = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        raw_category = str(form.get("category") or "")
        description = str(form.get("description") or "").strip()
        location = str(form.get("location") or "").strip()
        title = str(form.get("title") or "").strip()
        city = str(form.get("city") or "Nagpur").strip() or "Nagpur"
        for name, target in (("latitude", "lat"), ("longitude", "lng")):
            value = str(form.get(name) or "").strip()
            if value:
                try:
                    parsed = float(value)
                except ValueError as exc:
                    raise HTTPException(status_code=422, detail="Invalid GPS coordinates.") from exc
                if target == "lat":
                    if not -90 <= parsed <= 90:
                        raise HTTPException(status_code=422, detail="Invalid GPS coordinates.")
                    latitude = parsed
                else:
                    if not -180 <= parsed <= 180:
                        raise HTTPException(status_code=422, detail="Invalid GPS coordinates.")
                    longitude = parsed
        upload = form.get("photo") or form.get("image")
        if upload is None or not getattr(upload, "filename", None):
            raise HTTPException(status_code=422, detail="A photo is required to report an issue.")
        photo_url, _digest, _size = _store_citizen_photo(upload)
        photo_caption = "Citizen-submitted photo."
        if location:
            head, _, tail = location.partition(",")
            ward = head.strip() or None
            locality = tail.strip() or None
    else:
        try:
            payload = CreateIssueRequest.model_validate(await request.json())
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Invalid request body.") from exc
        raw_category = payload.category
        description = payload.description.strip()
        title = payload.title.strip()
        ward = payload.ward
        locality = payload.locality
        city = payload.city
        latitude = payload.latitude
        longitude = payload.longitude
        photo_url = _strip(payload.photo_url) or None
        photo_caption = _strip(payload.photo_caption) or None

    if not description:
        raise HTTPException(status_code=422, detail="description is required.")
    if len(description) > 2000:
        raise HTTPException(status_code=422, detail="description must be 2000 characters or fewer.")
    if len(title) > 200:
        title = title[:200]

    category, category_key = _resolve_category(raw_category)
    title = title or description[:120] or "Civic issue reported by a citizen."

    if photo_url:
        main = (photo_url, photo_caption or "Citizen-submitted photo.", "Citizen submission", "—")
    else:
        main = _default_image(category_key)
    ref = _next_reference(db)
    now = datetime.now(timezone.utc)
    stmt = T["civic_issues"].insert().values(
        issue_reference=ref,
        title=title,
        description=description,
        category=category,
        category_key=category_key,
        ward=_strip(ward) or None,
        locality=_strip(locality) or None,
        city=_strip(city) or "Nagpur",
        latitude=latitude,
        longitude=longitude,
        status="CITIZEN_SUBMITTED",
        trust_state="INSUFFICIENT",
        confirmations=0,
        comments_count=0,
        reported_by_id=user["id"],
        reported_at=now,
        notified_at=None,
        target_hours=24,
        sla_exceeded=False,
        main_image_url=main[0],
        main_image_caption=main[1],
        main_image_attribution=main[2],
        main_image_license=main[3],
        evidence=[
            {
                "url": main[0],
                "caption": main[1],
                "kind": "citizen_report",
                "by_role": "citizen",
                "attribution": main[2],
                "license": main[3],
                "at": now.isoformat(),
            }
        ],
        verdict=None,
        verdict_note=None,
        verified_by_id=None,
        verified_at=None,
        created_at=now,
        updated_at=now,
    )
    result = db.execute(stmt)
    db.commit()
    issue_id = result.inserted_primary_key[0]
    _audit(db, user, "citizen_submit", issue_id, None, "created", ref)
    row = _get_issue(db, issue_id)
    return _issue_out(row, user["role"])


@router.post("/issues/{issue_id}/confirm")
async def confirm_issue(
    issue_id: str,
    user=Depends(require_roles("citizen")),
    db=Depends(get_session),
):
    row = _get_issue(db, issue_id)
    if row["status"] == "CLOSED":
        raise HTTPException(status_code=409, detail="Issue is closed.")
    confirmations = int(row["confirmations"] or 0) + 1
    new_status = row["status"]
    notified_at = row["notified_at"]
    if confirmations >= 3 and row["status"] in {"CITIZEN_SUBMITTED", "UNDER_PUBLIC_REVIEW"}:
        new_status = "AUTHORITY_NOTIFIED"
        notified_at = notified_at or datetime.now(timezone.utc)
    db.execute(
        update(T["civic_issues"])
        .where(T["civic_issues"].c.id == issue_id)
        .values(
            confirmations=confirmations,
            status=new_status,
            notified_at=notified_at,
            updated_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    _audit(
        db, user, "update", row["id"],
        {"confirmations": row["confirmations"]},
        {"confirmations": confirmations, "status": new_status},
        row["issue_reference"],
    )
    row = _get_issue(db, issue_id)
    return _issue_out(row, user["role"])


@router.post("/issues/{issue_id}/action")
async def record_action(
    issue_id: str,
    body: TransitionBody,
    user=Depends(require_roles("inspector")),
    db=Depends(get_session),
):
    row = _get_issue(db, issue_id)
    allowed = {"CITIZEN_SUBMITTED", "UNDER_PUBLIC_REVIEW", "AUTHORITY_NOTIFIED", "UNDER_ACTION", "WORK_IN_PROGRESS"}
    if row["status"] not in allowed:
        raise HTTPException(status_code=409, detail=f"Cannot start action from state {row['status']}.")
    return _transition(db, user, row, "UNDER_ACTION", body, row["issue_reference"])


@router.post("/issues/{issue_id}/progress")
async def mark_progress(
    issue_id: str,
    body: TransitionBody,
    user=Depends(require_roles("inspector")),
    db=Depends(get_session),
):
    row = _get_issue(db, issue_id)
    if row["status"] not in {"UNDER_ACTION", "WORK_IN_PROGRESS"}:
        raise HTTPException(status_code=409, detail=f"Cannot log progress from state {row['status']}.")
    return _transition(db, user, row, "WORK_IN_PROGRESS", body, row["issue_reference"])


@router.post("/issues/{issue_id}/mark-fixed")
async def mark_fixed(
    issue_id: str,
    body: TransitionBody,
    user=Depends(require_roles("inspector")),
    db=Depends(get_session),
):
    row = _get_issue(db, issue_id)
    if row["status"] not in {"UNDER_ACTION", "WORK_IN_PROGRESS", "MARKED_FIXED"}:
        raise HTTPException(status_code=409, detail=f"Cannot mark fixed from state {row['status']}.")
    return _transition(db, user, row, "MARKED_FIXED", body, row["issue_reference"])


def _transition(db, user, row, target_status: str, body: TransitionBody, ref: str) -> dict:
    now = datetime.now(timezone.utc)
    photo_url = _strip(body.photo_url) or None
    if photo_url:
        img = (photo_url, _strip(body.photo_caption) or "Evidence photo (Wikimedia Commons).", "—", "—")
    else:
        img = _default_image(row["category_key"])
    evidence = list(row["evidence"] or [])
    evidence.append(
        {
            "url": img[0],
            "caption": img[1],
            "kind": "completion",
            "by_role": "authority",
            "attribution": img[2],
            "license": img[3],
            "note": _strip(body.note) or None,
            "at": now.isoformat(),
        }
    )
    sla_exceeded = False if target_status in RESOLVED_STATES else bool(row["sla_exceeded"])
    db.execute(
        update(T["civic_issues"])
        .where(T["civic_issues"].c.id == row["id"])
        .values(
            status=target_status,
            evidence=evidence,
            sla_exceeded=sla_exceeded,
            updated_at=now,
        )
    )
    db.commit()
    _audit(
        db, user, "update", row["id"],
        {"status": row["status"]},
        {"status": target_status, "note": _strip(body.note) or None},
        ref,
    )
    updated = _get_issue(db, row["id"])
    return _issue_out(updated, user["role"])


@router.post("/issues/{issue_id}/verify")
async def verify_issue(
    issue_id: str,
    body: VerifyBody,
    user=Depends(require_roles("citizen")),
    db=Depends(get_session),
):
    row = _get_issue(db, issue_id)
    verdict = body.verdict.upper()
    if verdict not in VALID_VERDICTS:
        raise HTTPException(status_code=422, detail="verdict must be one of: FIXED, PARTIALLY_FIXED, STILL_EXISTS.")
    if row["status"] not in {"MARKED_FIXED", "CITIZEN_VERIFIED", "CONFLICTING"}:
        raise HTTPException(status_code=409, detail=f"Cannot verify from state {row['status']}.")
    now = datetime.now(timezone.utc)
    if verdict == "STILL_EXISTS":
        status, trust = "CONFLICTING", "CONFLICTING"
    elif verdict == "PARTIALLY_FIXED":
        status, trust = "CITIZEN_VERIFIED", "QUESTIONABLE"
    else:
        status, trust = "CITIZEN_VERIFIED", "SUPPORTED"
    db.execute(
        update(T["civic_issues"])
        .where(T["civic_issues"].c.id == issue_id)
        .values(
            status=status,
            trust_state=trust,
            verdict=verdict,
            verdict_note=_strip(body.note) or None,
            verified_by_id=user["id"],
            verified_at=now,
            updated_at=now,
        )
    )
    db.commit()
    _audit(
        db, user, "verify", issue_id,
        {"status": row["status"]},
        {"verdict": verdict, "status": status, "trust_state": trust},
        row["issue_reference"],
    )
    updated = _get_issue(db, issue_id)
    return _issue_out(updated, user["role"])


@router.post("/issues/{issue_id}/review")
async def review_issue(
    issue_id: str,
    body: ReviewBody,
    user=Depends(require_roles("admin")),
    db=Depends(get_session),
):
    row = _get_issue(db, issue_id)
    decision = body.decision.upper().replace(" ", "_")
    if decision not in TRUST_STATES:
        raise HTTPException(status_code=422, detail=f"decision must be one of: {sorted(TRUST_STATES)}.")
    status = row["status"]
    if decision == "SUPPORTED":
        status = "RESOLVED"
    elif decision == "CONFLICTING":
        status = "CONFLICTING"
    elif status == "CONFLICTING" and decision in {"INSUFFICIENT", "INCOMPLETE"}:
        status = "AUTHORITY_NOTIFIED"
    db.execute(
        update(T["civic_issues"])
        .where(T["civic_issues"].c.id == issue_id)
        .values(
            trust_state=decision,
            status=status,
            verdict_note=_strip(body.note) or row["verdict_note"],
            updated_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    _audit(
        db, user, "decision", issue_id,
        {"trust_state": row["trust_state"], "status": row["status"]},
        {"decision": decision, "status": status},
        row["issue_reference"],
    )
    updated = _get_issue(db, issue_id)
    return _issue_out(updated, user["role"])


@router.get("/summary")
async def civic_summary(
    user=Depends(get_current_user),
    db=Depends(get_session),
):
    rows = db.execute(select(T["civic_issues"].c.status)).scalars().all()
    total = len(rows)
    resolved = sum(1 for s in rows if s in {"RESOLVED", "CITIZEN_VERIFIED"})
    under_action = sum(1 for s in rows if s in {"UNDER_ACTION", "WORK_IN_PROGRESS"})
    awaiting = sum(1 for s in rows if s == "MARKED_FIXED")
    new_or_notified = sum(1 for s in rows if s in {"CITIZEN_SUBMITTED", "UNDER_PUBLIC_REVIEW", "AUTHORITY_NOTIFIED"})
    conflicting = sum(1 for s in rows if s == "CONFLICTING")
    return {
        "total": total,
        "new_reports": new_or_notified,
        "under_action": under_action,
        "awaiting_verification": awaiting,
        "resolved": resolved,
        "conflicting": conflicting,
    }