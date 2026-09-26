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
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.models.base import Base
from app.models.mixin import TimestampMixin


class Inspection(TimestampMixin, Base):
    """Physical verification visit to a project site by a qualified inspector.

    `inspection_reference` is the public work-order code (e.g. ``INSP-NRD-204-007``).
    A ``failure`` inspection (physical or virtual) detracts from the project's
    verified/proven progress, so inspectors are independent of both the
    department (owner) and the contractor (vendor) to avoid tender-capture.
    """

    __tablename__ = "inspections"
    __table_args__ = (
        CheckConstraint(
            "inspection_type IN "
            "('pre_construction','materials_sampling','site_inspection',"
            "'completion_review','defect_liability_review','special_audit')",
            name="ck_inspections_type",
        ),
        CheckConstraint(
            "outcome IN "
            "('passed','passed_with_recommendations','failed','aborted')",
            name="ck_inspections_outcome",
        ),
        CheckConstraint(
            "latitude IS NULL OR latitude BETWEEN -90 AND 90",
            name="ck_inspections_latitude",
        ),
        CheckConstraint(
            "longitude IS NULL OR longitude BETWEEN -180 AND 180",
            name="ck_inspections_longitude",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    inspection_reference: Mapped[str] = mapped_column(
        String(48), unique=True, index=True
    )
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    inspector_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    contractor_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("vendors.id", ondelete="SET NULL"),
        index=True,
    )

    scheduled_date: Mapped[Optional[date]] = mapped_column(DateTime(timezone=True))
    conducted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )

    geom: Mapped[Optional[object]] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        index=True,
    )
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), index=True)
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), index=True)

    findings: Mapped[Optional[str]] = mapped_column(String(6000))
    inspection_type: Mapped[str] = mapped_column(
        String(32), default="site_inspection", index=True
    )
    outcome: Mapped[str] = mapped_column(String(32), default="passed")
    report_document_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("documents.id", ondelete="SET NULL"),
        index=True,
    )

    evidence: Mapped[List["Evidence"]] = relationship(back_populates="inspection")
    report_document: Mapped[Optional["Document"]] = relationship(
        back_populates="inspection_reports"
    )
    project: Mapped["Project"] = relationship(back_populates="inspections")
    inspector: Mapped[Optional["User"]] = relationship(
        back_populates="inspections_conducted"
    )
