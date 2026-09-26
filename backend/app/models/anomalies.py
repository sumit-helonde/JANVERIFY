from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixin import TimestampMixin


class Anomaly(TimestampMixin, Base):
    """Detected inconsistency worth public attention on a project.

    ``anomaly_type`` is the *kind* of mismatch found (e.g. a drift between
    progress billed and progress physically on the ground), and ``severity``
    grades how much further scrutiny the anomaly triggers. An anomaly is
    never a verdict — that belongs to `decisions` — it is the *signal* that a
    decision needs to be made.
    """

    __tablename__ = "anomalies"
    __table_args__ = (
        CheckConstraint(
            "anomaly_type IN "
            "('cost_overrun','schedule_delay','progress_discrepancy',"
            "'payment_anomaly','documentation_gap','evidence_conflict',"
            "'vendor_violation','other')",
            name="ck_anomalies_type",
        ),
        CheckConstraint(
            "severity IN ('info','notice','warning','critical')",
            name="ck_anomalies_severity",
        ),
        CheckConstraint(
            "status IN ('open','investigating','confirmed','resolved',"
            "'dismissed','escalated')",
            name="ck_anomalies_status",
        ),
        CheckConstraint(
            "confidence IS NULL OR confidence BETWEEN 0 AND 1",
            name="ck_anomalies_confidence",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    anomaly_reference: Mapped[str] = mapped_column(
        String(64), unique=True, index=True
    )
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    contract_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("contracts.id", ondelete="SET NULL"),
        index=True,
    )
    evidence_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("evidence.id", ondelete="SET NULL"),
        index=True,
    )
    detected_by_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )

    anomaly_type: Mapped[str] = mapped_column(
        String(32), default="other", index=True
    )
    severity: Mapped[str] = mapped_column(
        String(16), default="notice", index=True
    )
    status: Mapped[str] = mapped_column(
        String(24), default="open", index=True
    )
    confidence: Mapped[Optional[float]] = mapped_column(Numeric(4, 3))

    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True
    )
    description: Mapped[Optional[str]] = mapped_column(String(4000))
    resolution_note: Mapped[Optional[str]] = mapped_column(String(2000))
    resolution_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )

    project: Mapped["Project"] = relationship(back_populates="anomalies")
    contract: Mapped[Optional["Contract"]] = relationship(
        back_populates="anomalies"
    )
    evidence: Mapped[Optional["Evidence"]] = relationship(
        back_populates="anomalies"
    )
    detected_by: Mapped[Optional["User"]] = relationship(
        back_populates="anomalies_detected"
    )
