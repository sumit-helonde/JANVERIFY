"""Audit logging helper backed by the existing audit_logs table."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import insert

from app.api.routes._db import T


def record_audit(
    db,
    actor_id: int | None,
    action: str,
    entity_type: str,
    entity_id,
    before=None,
    after=None,
    project_id=None,
    source_reference=None,
):
    """Insert one audit entry. Never store passwords or secrets in 'before'/'after'."""
    if actor_id is not None:
        actor_id = int(actor_id)
    db.execute(
        insert(T["audit_logs"]).values(
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            action_type=action,
            actor_id=actor_id,
            project_id=int(project_id) if project_id is not None else None,
            before=before,
            after=after,
            source_reference=source_reference,
            occurred_at=datetime.now(timezone.utc),
        )
    )
    db.commit()