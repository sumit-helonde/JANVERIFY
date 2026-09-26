"""Reviewer/Admin routes: citizen evidence review + admin audit log view."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select

from app.core.db import get_session
from app.api.routes._db import T
from app.api.routes.auth import get_current_user, require_roles
from app.services.audit import record_audit

router = APIRouter(prefix="/api", tags=["admin"])

STATUS_MAP = {
    "under_review": "under_review",
    "verified": "verified",
    "rejected": "rejected",
}


class ReviewRequest(BaseModel):
    review_status: str


@router.post("/citizen-reports/{report_id}/review")
async def review_citizen_report(
    report_id: int,
    body: ReviewRequest,
    user=Depends(require_roles("reviewer")),
    db=Depends(get_session),
):
    if body.review_status.lower() not in STATUS_MAP:
        raise HTTPException(status_code=422, detail="review_status must be one of: under_review, verified, rejected.")
    row = db.execute(select_from_report(report_id)).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Citizen report not found.")
    target = STATUS_MAP[body.review_status.lower()]
    before = row["status"]
    db.execute(
        T["citizen_reports"].update()
        .where(T["citizen_reports"].c.id == report_id)
        .values(status=target)
    )
    db.commit()
    record_audit(
        db, actor_id=user["id"],
        action="update" if target == "under_review" else ("approve" if target == "verified" else "reject"),
        entity_type="citizen_report",
        entity_id=report_id, before=before, after=target, project_id=row["project_id"],
        source_reference=f"REF={row['report_reference']}",
    )
    return {
        "report_id": report_id,
        "reference": row["report_reference"],
        "status": target.upper(),
        "review_status": "PENDING_REVIEW" if target == "under_review" else ("ACCEPTED" if target == "verified" else "REJECTED"),
        "reviewed_by": user["id"],
        "origin": "citizen_submitted",
    }


@router.get("/audit-logs")
async def list_audit_logs(
    limit: int = Query(default=100, le=500),
    user=Depends(require_roles("reviewer", "admin")),
    db=Depends(get_session),
):
    rows = db.execute(
        select(T["audit_logs"], T["users"].c.email.label("actor_email"), T["users"].c.role.label("actor_role"))
        .join(T["users"], T["audit_logs"].c.actor_id == T["users"].c.id, isouter=True)
        .order_by(T["audit_logs"].c.occurred_at.desc())
        .limit(limit)
    ).mappings().all()
    return {
        "items": [
            {
                "id": r["id"],
                "timestamp": str(r["occurred_at"]),
                "actor_email": r["actor_email"],
                "actor_role": r["actor_role"],
                "action": r["action_type"],
                "entity": r["entity_type"],
                "entity_id": r["entity_id"],
                "project_id": r["project_id"],
                "before": r["before"],
                "after": r["after"],
                "source": r["source_reference"],
            }
            for r in rows
        ]
    }


def select_from_report(report_id: int):
    from sqlalchemy import select
    return select(T["citizen_reports"]).where(T["citizen_reports"].c.id == report_id)