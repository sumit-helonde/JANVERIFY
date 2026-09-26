from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    ARRAY,
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


class Decision(TimestampMixin, Base):
    """Adjudication reached for a claim, grounded in verified evidence.

    ``decision_state`` encodes JANVERIFY's trust grading — an honest public
    body must be able to say "we don't know yet" (INCOMPLETE /
    HUMAN_REVIEW_REQUIRED) as loudly as it can say PROVEN-SUPPORTED.
    ``sources`` / ``dates`` are JSON string arrays (PostgreSQL ``TEXT[]``)
    straight from the public register so the reasoning is re-auditable row by
    row.
    """

    __tablename__ = "decisions"
    __table_args__ = (
        CheckConstraint(
            "decision_state IN "
            "('PROVEN_SUPPORTED','PROVEN_REJECTED','INCOMPLETE',"
            "'CONFLICTING','QUESTIONABLE','HUMAN_REVIEW_REQUIRED',"
            "'INSUFFICIENT')",
            name="ck_decisions_state",
        ),
        CheckConstraint(
            "source IS NULL OR char_length(source) = 64",
            name="ck_decisions_source_len",
        ),
        CheckConstraint(
            "event_date IS NULL OR decision_date IS NULL OR "
            "event_date <= decision_date",
            name="ck_decisions_event_before_decision",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    decision_reference: Mapped[str] = mapped_column(
        String(64), unique=True, index=True
    )
    claim_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("claims.id", ondelete="CASCADE"),
        index=True,
    )
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    adjudicator_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )

    decision_state: Mapped[str] = mapped_column(
        String(32), index=True
    )
    source: Mapped[Optional[str]] = mapped_column(String(64))
    reason: Mapped[Optional[str]] = mapped_column(String(4000))

    # JSON arrays of supporting/conflicting evidence identifiers and dates,
    # stored as PostgreSQL text arrays so the reasoning tool-chains can read
    # them without a join.
    supporting_evidence: Mapped[Optional[list]] = mapped_column(ARRAY(String(64)))
    conflicting_evidence: Mapped[Optional[list]] = mapped_column(ARRAY(String(64)))
    missing_information: Mapped[Optional[list]] = mapped_column(ARRAY(String(400)))
    sources: Mapped[Optional[list]] = mapped_column(ARRAY(String(200)))
    dates: Mapped[Optional[list]] = mapped_column(ARRAY(String(32)))

    decision_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True
    )
    event_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )

    claim: Mapped["Claim"] = relationship(back_populates="decisions")
    project: Mapped["Project"] = relationship(back_populates="decisions")
    adjudicator: Mapped[Optional["User"]] = relationship(
        back_populates="decisions_made"
    )
