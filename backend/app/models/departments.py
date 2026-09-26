from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Identity,
    String,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)
from sqlalchemy.schema import CheckConstraint as SCCheck

from app.models.base import Base
from app.models.mixin import TimestampMixin


class Department(TimestampMixin, Base):
    """Government department (e.g. Water Resources) that owns projects.

    `code` is the stable short identifier used in public project references
    (e.g. ``NRD`` in ``NRD-204``). Departments can form a hierarchy via
    ``parent_department_id``.
    """

    __tablename__ = "departments"
    __table_args__ = (
        CheckConstraint("char_length(name) > 0", name="ck_departments_name"),
        CheckConstraint("char_length(code) > 0", name="ck_departments_code"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    code: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(400))

    parent_department_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    parent: Mapped[Optional["Department"]] = relationship(
        back_populates="children",
        remote_side="Department.id",
    )
    children: Mapped[List["Department"]] = relationship(
        back_populates="parent",
    )

    # one-to-many links resolved by string names at mapper configuration time
    users: Mapped[List["User"]] = relationship(back_populates="department")
    projects: Mapped[List["Project"]] = relationship(back_populates="department")
    tenders: Mapped[List["Tender"]] = relationship(back_populates="department")
    contracts: Mapped[List["Contract"]] = relationship(back_populates="department")
