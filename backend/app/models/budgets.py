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


class Budget(TimestampMixin, Base):
    """Budget envelope for a project, following the public finance vocabulary
    (Sanctioned / Allocated / Released / Spent).

    Phase 3 reference data intentionally keeps one budget row per project so
    historical snapshots can be introduced later without schema churn.
    """

    __tablename__ = "budgets"
    __table_args__ = (
        CheckConstraint(
            "allocated_amount >= 0 AND sanctioned_amount >= 0",
            name="ck_budgets_amounts_nonnegative",
        ),
        CheckConstraint(
            "allocated_amount <= sanctioned_amount",
            name="ck_budgets_allocated_le_sanctioned",
        ),
        CheckConstraint(
            "released_amount >= 0 AND spent_amount >= 0",
            name="ck_budgets_movements_nonnegative",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    financial_year: Mapped[str] = mapped_column(String(16), index=True)
    sanctioned_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    allocated_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    released_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0)
    spent_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0)

    project: Mapped["Project"] = relationship(back_populates="budget")
