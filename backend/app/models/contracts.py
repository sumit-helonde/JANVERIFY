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


class Contract(TimestampMixin, Base):
    """Executed agreement between the department and a contractor.

    Reference `contract_reference` is the canonical public identifier
    (e.g. ``CTR-204``) and doubles as the work-order reference. A contract
    carries its own financial envelope (award, escalation, variation  a/o
    revised) used for the public sanctioned/released/spent ledger.
    """

    __tablename__ = "contracts"
    __table_args__ = (
        CheckConstraint(
            "award_amount > 0", name="ck_contracts_award_amount"
        ),
        CheckConstraint(
            "status IN "
            "('draft','active','completed','terminated','on_hold','disputed')",
            name="ck_contracts_status",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    contract_reference: Mapped[str] = mapped_column(
        String(32), unique=True, index=True
    )
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    award_tender_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("tenders.id", ondelete="SET NULL"),
        index=True,
    )
    contractor_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("vendors.id", ondelete="RESTRICT"),
        index=True,
    )
    awarding_department_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("departments.id", ondelete="RESTRICT"),
        index=True,
    )
    authorizing_official_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )

    title: Mapped[Optional[str]] = mapped_column(String(320))
    scope_of_work: Mapped[Optional[str]] = mapped_column(String(4000))

    award_date: Mapped[Optional[date]] = mapped_column(
        DateTime(timezone=True)
    )
    start_date: Mapped[Optional[date]] = mapped_column(
        DateTime(timezone=True)
    )
    completion_date: Mapped[Optional[date]] = mapped_column(
        DateTime(timezone=True)
    )
    actual_completion_date: Mapped[Optional[date]] = mapped_column(
        DateTime(timezone=True)
    )

    status: Mapped[str] = mapped_column(String(24), default="draft", index=True)

    award_amount: Mapped[float] = mapped_column(Numeric(20, 2))
    escalation_amount: Mapped[Optional[float]] = mapped_column(
        Numeric(20, 2), default=0
    )
    variation_amount: Mapped[Optional[float]] = mapped_column(
        Numeric(20, 2), default=0
    )
    revised_amount: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))

    project: Mapped["Project"] = relationship(back_populates="contracts")
    award_tender: Mapped[Optional["Tender"]] = relationship(
        back_populates="contract"
    )
    contractor: Mapped["Vendor"] = relationship(back_populates="contracts")
    awarding_department: Mapped["Department"] = relationship(
        back_populates="contracts"
    )
    authorizing_official: Mapped[Optional["User"]] = relationship(
        back_populates="contracts_authorized"
    )
    payments: Mapped[List["Payment"]] = relationship(back_populates="contract")
    inspections: Mapped[List["Inspection"]] = relationship(
        back_populates="contract"
    )
    progress_reports: Mapped[List["ProgressReport"]] = relationship(
        back_populates="contract"
    )
    documents: Mapped[List["Document"]] = relationship(back_populates="contract")
    claims: Mapped[List["Claim"]] = relationship(back_populates="contract")
    anomalies: Mapped[List["Anomaly"]] = relationship(
        back_populates="contract"
    )
    anomalies: Mapped[List["Anomaly"]] = relationship(
        back_populates="contract"
    )
