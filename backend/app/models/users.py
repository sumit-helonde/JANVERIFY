from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
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


class User(TimestampMixin, Base):
    """System account for citizens, officials, inspectors, contractors and admins.

    `role` is a discriminated single-table column so every account type lives
    in one table (the Phase 3 reference data design). Passwords are stored
    only as salted hashes; raw passwords never persist.
    """

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN "
            "('citizen','department_official','inspector','contractor','admin')",
            name="ck_users_role",
        ),
        CheckConstraint(
            "status IN ('active','suspended','deactivated')",
            name="ck_users_status",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120), index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(24), default="citizen")
    status: Mapped[str] = mapped_column(String(16), default="active", index=True)

    department_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("departments.id", ondelete="SET NULL"),
        index=True,
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )

    department: Mapped[Optional["Department"]] = relationship(
        back_populates="users"
    )
    tenders_created: Mapped[List["Tender"]] = relationship(back_populates="created_by")
    tenders_submitted: Mapped[List["TenderSubmission"]] = relationship(
        back_populates="submitted_by"
    )
    contracts: Mapped[List["Contract"]] = relationship(back_populates="contractor")
    payments_recorded: Mapped[List["Payment"]] = relationship(
        back_populates="recorded_by"
    )
    inspections: Mapped[List["Inspection"]] = relationship(back_populates="inspected_by")
    progress_reports: Mapped[List["ProgressReport"]] = relationship(
        back_populates="recorded_by"
    )
    decisions: Mapped[List["Decision"]] = relationship(back_populates="decision_by")
    citizen_reports: Mapped[List["CitizenReport"]] = relationship(
        back_populates="reported_by"
    )
    evidence: Mapped[List["Evidence"]] = relationship(back_populates="uploaded_by")
    audit_logs: Mapped[List["AuditLog"]] = relationship(back_populates="actor")
