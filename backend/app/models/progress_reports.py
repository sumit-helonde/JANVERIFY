from datetime import datetime
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


class ProgressReport(TimestampMixin, Base):
    """Systematic periodic report the department posts against a project.

    The two progress figures are the heart of JANVERIFY's reconciliation:
    ``physical_progress`` is what the department claims it achieved, while
    ``verified_progress`` is the value independently corroborated by site work
    (inspections, evidence, progress bills). The gap between the two is what
    anomaly detection flags; ``anomalies`` back-references this table.
    """

    __tablename__ = "progress_reports"
    __table_args__ = (
        CheckConstraint(
            "report_period IN ('monthly','quarterly','half_yearly','yearly')",
            name="ck_progress_reports_period",
        ),
        CheckConstraint(
            "financial_progress IS NULL OR "
            "financial_progress BETWEEN 0 AND 100",
            name="ck_progress_reports_financial",
        ),
        CheckConstraint(
            "physical_progress IS NULL OR "
            "physical_progress BETWEEN 0 AND 100",
            name="ck_progress_reports_physical",
        ),
        CheckConstraint(
            "verified_progress IS NULL OR "
            "verified_progress BETWEEN 0 AND 100",
            name="ck_progress_reports_verified",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    report_reference: Mapped[str] = mapped_column(
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
    reporter_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )

    report_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True
    )
    report_period: Mapped[str] = mapped_column(
        String(24), default="monthly", index=True
    )
    financial_progress: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    physical_progress: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    verified_progress: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    narrative: Mapped[Optional[str]] = mapped_column(String(6000))

    project: Mapped["Project"] = relationship(back_populates="progress_reports")
    contract: Mapped[Optional["Contract"]] = relationship(
        back_populates="progress_reports"
    )
    reporter: Mapped[Optional["User"]] = relationship(
        back_populates="progress_reports_recorded"
    )
