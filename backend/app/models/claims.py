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


class Claim(TimestampMixin, Base):
    """Formal request by a contractor for money/progress that they allege is due.

    Claims are the input side of JANVERIFY's decision engine: every claim is
    eventually LODGED/VERIFIED/SUPPORTED (or rejected), and a SUPPORTED claim
    can only be realised on the *sanctioned/released* ledger once corroborated
    by inspections/evidence — the TRUSTMESH/DECISION loop.
    """

    __tablename__ = "claims"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','lodged','under_review','supported',"
            "'partially_supported','rejected')",
            name="ck_claims_status",
        ),
        CheckConstraint(
            "claimed_amount IS NULL OR claimed_amount > 0",
            name="ck_claims_claimed_positive",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    claim_reference: Mapped[str] = mapped_column(
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
    claimant_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    vendor_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("vendors.id", ondelete="SET NULL"),
        index=True,
    )

    claim_type: Mapped[str] = mapped_column(
        String(32),
        default="progress_payment",
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(String(4000))
    claimed_amount: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    claimed_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), index=True
    )
    status: Mapped[str] = mapped_column(String(24), default="draft", index=True)

    project: Mapped["Project"] = relationship(back_populates="claims")
    contract: Mapped[Optional["Contract"]] = relationship(
        back_populates="claims"
    )
    claimant: Mapped[Optional["User"]] = relationship(
        back_populates="claims_made"
    )
    vendor: Mapped[Optional["Vendor"]] = relationship(
        back_populates="claims"
    )
    evidences: Mapped[List["Evidence"]] = relationship(back_populates="claim")
    decisions: Mapped[List["Decision"]] = relationship(back_populates="claim")
