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


class Payment(TimestampMixin, Base):
    """Money disbursed to a contractor against a contract.

    A payment only ever flows through a contract (advance, milestone, final,
    retention or supplementary), never directly to a bare project reference,
    so the ad-hoc spending narrative stays traceable.
    """

    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(
            "amount > 0", name="ck_payments_amount_positive"
        ),
        CheckConstraint(
            "payment_type IN "
            "('advance','milestone','final','retention','supplementary')",
            name="ck_payments_type",
        ),
        CheckConstraint(
            "status IN ('recorded','pending','approved','rejected','reversed')",
            name="ck_payments_status",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    payment_reference: Mapped[str] = mapped_column(
        String(64), unique=True, index=True
    )
    contract_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("contracts.id", ondelete="CASCADE"),
        index=True,
    )
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    vendor_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("vendors.id", ondelete="RESTRICT"),
        index=True,
    )
    recorded_by_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    supporting_document_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("documents.id", ondelete="SET NULL"),
        index=True,
    )

    amount: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    payment_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), index=True
    )
    payment_type: Mapped[str] = mapped_column(String(24), default="milestone")
    status: Mapped[str] = mapped_column(String(24), default="recorded", index=True)

    contract: Mapped["Contract"] = relationship(back_populates="payments")
    project: Mapped["Project"] = relationship(back_populates="payments")
    vendor: Mapped["Vendor"] = relationship(back_populates="payments")
    recorded_by: Mapped[Optional["User"]] = relationship(
        back_populates="payments_recorded"
    )
    supporting_document: Mapped[Optional["Document"]] = relationship(
        back_populates="payment"
    )
