from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixin import TimestampMixin


class ProjectRelationship(TimestampMixin, Base):
    """Named dependency between two projects' public work packages.

    Relationships are how JANVERIFY tracks claims of cross-project
    duplication, corridor nesting, or sequential dependencies (a resurfacing
    package that only makes sense if the drainage package beneath it is
    complete). `relationship_type` values below are the documented set;
    `inverse_relationship_id` keeps symmetric pairs in one row.
    """

    __tablename__ = "project_relationships"
    __table_args__ = (
        CheckConstraint(
            "relationship_type IN "
            "('independent','corridor_shared','overlapping_footprint',"
            "'same_vendor','sequential_dependency','duplicate_scope',"
            "'nested_package','superseded_by')",
            name="ck_project_relationships_type",
        ),
        CheckConstraint(
            "status IN ('proposed','verified','rejected','expired')",
            name="ck_project_relationships_status",
        ),
        CheckConstraint(
            "project_id <> related_project_id",
            name="ck_project_relationships_directed",
        ),
        UniqueConstraint(
            "project_id",
            "related_project_id",
            "relationship_type",
            name="uq_project_relationships_directed",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    related_project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    relationship_type: Mapped[str] = mapped_column(String(32), index=True)
    status: Mapped[str] = mapped_column(
        String(24), default="proposed", index=True
    )
    rationale: Mapped[Optional[str]] = mapped_column(String(2000))
    evidence_refs: Mapped[Optional[str]] = mapped_column(String(4000))
    detected_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
    validated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
    inverse_relationship_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("project_relationships.id", ondelete="SET NULL"),
    )

    project: Mapped["Project"] = relationship(
        back_populates="relationships"
    )
    related_project: Mapped["Project"] = relationship(
        back_populates="incoming_relationships"
    )
