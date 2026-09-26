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


class Tender(TimestampMixin, Base):
    """Public tender inviting bids for a project's execution work.

    A single project can issue many tenders (one per work package). Sanctioned
    and contracted amounts on the project itself drive the public "progress vs
    budget" reconciliation, so tenders carry their own estimated value.
    """

    __tablename__ = "tenders"
    __table_args__ = (
        CheckConstraint(
            "estimated_value IS NULL OR estimated_value > 0",
            name="ck_tenders_estimated_value",
        ),
        CheckConstraint(
            "status IN "
            "('draft','published','under_evaluation','awarded','cancelled','expired')",
            name="ck_tenders_status",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    tender_reference: Mapped[str] = mapped_column(
        String(64), unique=True, index=True
    )
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    department_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("departments.id", ondelete="SET NULL"),
    )
    title: Mapped[str] = mapped_column(String(320))
    description: Mapped[Optional[str]] = mapped_column(String(2000))
    estimated_value: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    publication_date: Mapped[Optional[date]] = mapped_column(
        DateTime(timezone=True)
    )
    submission_deadline: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
    status: Mapped[str] = mapped_column(String(24), default="draft", index=True)

    project: Mapped["Project"] = relationship(back_populates="tenders")
    bids: Mapped[List["Bid"]] = relationship(back_populates="tender")
    contract: Mapped[Optional["Contract"]] = relationship(
        back_populates="tender",
        uselist=False,
    )
