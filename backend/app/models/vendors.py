from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Identity,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixin import TimestampMixin


class Vendor(TimestampMixin, Base):
    """Registered vendor/contractor eligible to bid for public works.

    `registration_number` is the government-issued registration identifier;
    `pan_number` is the GST/PAN used on payments. A vendor may be blacklisted
    or suspended, which blocks new tender awards.
    """

    __tablename__ = "vendors"
    __table_args__ = (
        CheckConstraint(
            "char_length(name) > 0", name="ck_vendors_name"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    vendor_code: Mapped[str] = mapped_column(
        String(32), unique=True, index=True
    )
    registration_number: Mapped[Optional[str]] = mapped_column(
        String(64), unique=True, index=True
    )
    pan_number: Mapped[Optional[str]] = mapped_column(String(32), index=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String(32), index=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(120))
    contact_email: Mapped[Optional[str]] = mapped_column(String(320))
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20))
    address: Mapped[Optional[str]] = mapped_column(String(400))
    status: Mapped[str] = mapped_column(
        String(24),
        CheckConstraint(
            "status IN ('active','blacklisted','suspended','deregistered')",
            name="ck_vendors_status",
        ),
        default="active",
        index=True,
    )

    contracts: Mapped[List["Contract"]] = relationship(back_populates="vendor")
    bids: Mapped[List["Bid"]] = relationship(back_populates="vendor")
    payments: Mapped[List["Payment"]] = relationship(back_populates="vendor")
    submitted_evidence: Mapped[List["Evidence"]] = relationship(
        back_populates="vendor"
    )
