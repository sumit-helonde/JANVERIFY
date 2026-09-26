from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Identity,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixin import TimestampMixin


class ProjectCategory(TimestampMixin, Base):
    """Typology bucket projects are grouped under for public browsing.

    For example: Roads, Bridges, Schools, Hospitals, Water Plants, Water
    Supply, Public Buildings, Other Infrastructure. `slug` is the URL-safe
    identifier unique within a department.
    """

    __tablename__ = "project_categories"
    __table_args__ = (
        CheckConstraint(
            "char_length(name) > 0", name="ck_project_categories_name"
        ),
        CheckConstraint(
            "char_length(slug) > 0", name="ck_project_categories_slug"
        ),
        UniqueConstraint("department_id", "slug", name="uq_project_categories_dep_slug"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    slug: Mapped[str] = mapped_column(String(64), index=True)
    department_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("departments.id", ondelete="CASCADE"),
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(String(400))

    department: Mapped["Department"] = relationship(back_populates="project_categories")
    projects: Mapped[List["Project"]] = relationship(back_populates="category")
