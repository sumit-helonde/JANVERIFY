from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Integer,
    JSON,
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixin import TimestampMixin


class AuditLog(TimestampMixin, Base):
    """Immutable, append-only trail of every material ledger transition.

    Rows are created when: evidence is uploaded/verified, a claim is decided,
    a payment is recorded/reversed, an inspection outcome is published, or
    a citizen report is accepted for review. Nothing is ever updated or
    deleted here — a new row supersedes. `before`/`after` store only the
    changed *columns* (never full rows, never credentials).

    This is the audit ground truth that lets a later forensic pass guarantee
    "every published decision traceable to an exact evidence+source chain".
    """

    __tablename__ = "audit_logs"
    __table_args__ = (
        CheckConstraint(
            "action_type IN "
            "('create','update','delete','verify','approve','reject',"
            "'escalate','reverse','withdraw','decision','citizen_submit')",
            name="ck_audit_logs_action",
        ),
        CheckConstraint(
            "char_length(entity_type) > 0", name="ck_audit_logs_entity_type"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(64), index=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    action_type: Mapped[str] = mapped_column(String(32), index=True)
    actor_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    project_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="SET NULL"),
        index=True,
    )
    before: Mapped[Optional[dict]] = mapped_column(JSON)
    after: Mapped[Optional[dict]] = mapped_column(JSON)
    source_reference: Mapped[Optional[str]] = mapped_column(String(64))
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True
    )

    actor: Mapped[Optional["User"]] = relationship(back_populates="audit_logs")
    project: Mapped[Optional["Project"]] = relationship(
        back_populates="audit_logs"
    )
