from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Float,
    ForeignKey,
    Identity,
    Numeric,
    String,
    Date,
    DateTime,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixin import TimestampMixin


class Project(TimestampMixin, Base):
    """A public works project (e.g. ``NRD-204``) flagged by a department."""

    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "total_budget_sanctioned >= 0",
            name="ck_projects_sanctioned_nonnegative",
        ),
        CheckConstraint(
            "char_length(reference_number) > 0",
            name="ck_projects_reference_not_empty",
        ),
        CheckConstraint(
            "status IN ('planned','in_progress','completed','halted','delayed')",
            name="ck_projects_status",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    reference_number: Mapped[str] = mapped_column(
        String(32), unique=True, index=True
    )
    name: Mapped[str] = mapped_column(String(320), index=True)
    description: Mapped[Optional[str]] = mapped_column(String(4000))

    category_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("project_categories.id", ondelete="SET NULL"),
        index=True,
    )

    department_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("departments.id", ondelete="SET NULL"),
        index=True,
    )

    # Physical footprint center point (WGS84). PostGIS POINT, SRID 4326.
    X: Mapped[Optional[float]] = mapped_column(
        Float,
        CheckConstraint(
            "x_coordinate IS NULL OR x_coordinate BETWEEN -180 AND 180",
            name="ck_projects_x_range",
        ),
    )
    y_coordinate: Mapped[Optional[float]] = mapped_column(
        Float,
        CheckConstraint(
            "y_coordinate IS NULL OR y_coordinate BETWEEN -90 AND 90",
            name="ck_projects_y_range",
        ),
    )

    # Textual addresses for humans; geography retained in project_locations.
    city: Mapped[Optional[str]] = mapped_column(String(120), index=True)
    state: Mapped[Optional[str]] = mapped_column(String(64), index=True)

    # Project lifecycle (NOT the address `state` column).
    status: Mapped[str] = mapped_column(
        String(32), default="planned", server_default="planned", index=True
    )

    total_budget_sanctioned: Mapped[Optional[float]] = mapped_column(
        Numeric(20, 2)
    )
    total_budget_released: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))

    start_date: Mapped[Optional[date]] = mapped_column(Date)
    expected_completion_date: Mapped[Optional[date]] = mapped_column(Date)
    actual_completion_date: Mapped[Optional[date]] = mapped_column(Date)

    # Physical progress reported by the department / independent evidence.
    department_reported_progress: Mapped[Optional[float]] = mapped_column(
        Numeric(6, 4),
        CheckConstraint(
            "department_reported_progress IS NULL OR "
            "department_reported_progress BETWEEN 0 AND 1",
            name="ck_projects_dept_progress",
        ),
    )
    verified_progress: Mapped[Optional[float]] = mapped_column(
        Numeric(6, 4),
        CheckConstraint(
            "verified_progress IS NULL OR verified_progress BETWEEN 0 AND 1",
            name="ck_projects_verified_progress",
        ),
    )

    budget: Mapped[Optional["Budget"]] = relationship(back_populates="project")
    locations: Mapped[List["ProjectLocation"]] = relationship(
        back_populates="project"
    )
    tenders: Mapped[List["Tender"]] = relationship(back_populates="project")
    contracts: Mapped[List["Contract"]] = relationship(back_populates="project")
    payments: Mapped[List["Payment"]] = relationship(back_populates="project")
    documents: Mapped[List["Document"]] = relationship(back_populates="project")
    evidence: Mapped[List["Evidence"]] = relationship(back_populates="project")
    inspections: Mapped[List["Inspection"]] = relationship(back_populates="project")
    progress_reports: Mapped[List["ProgressReport"]] = relationship(
        back_populates="project"
    )
    claims: Mapped[List["Claim"]] = relationship(back_populates="project")
    anomalies: Mapped[List["Anomaly"]] = relationship(back_populates="project")
    decisions: Mapped[List["Decision"]] = relationship(back_populates="project")
    citizen_reports: Mapped[List["CitizenReport"]] = relationship(
        back_populates="project"
    )
    related_projects: Mapped[List["ProjectRelationship"]] = relationship(
        back_populates="project",
        foreign_keys="[ProjectRelationship.project_id]",
    )
    related_to: Mapped[List["ProjectRelationship"]] = relationship(
        back_populates="related_project",
        foreign_keys="[ProjectRelationship.related_project_id]",
    )
