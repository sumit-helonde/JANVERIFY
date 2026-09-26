from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.models.base import Base
from app.models.mixin import TimestampMixin


class CitizenReport(TimestampMixin, Base):
    """A ground truth signal filed by a citizen against a public project.

    Citizens are the cheapest and most-diffuse sensor in the network; multiple
    corroborating citizen reports can *initiate* a decision while a single
    report never settles one. Reports carry a PostGIS point (`location_geom`)
    so the public can cross-check "did this person actually visit the site
    with a phone camera?" against the project's own registered footprint.
    """

    __tablename__ = "citizen_reports"
    __table_args__ = (
        CheckConstraint(
            "report_type IN "
            "('photo','document','complaint','observation','verify_request')",
            name="ck_citizen_reports_type",
        ),
        CheckConstraint(
            "status IN ('submitted','under_review','verified','disputed',"
            "'rejected','merged')",
            name="ck_citizen_reports_status",
        ),
        CheckConstraint(
            "char_length(description) > 0",
            name="ck_citizen_reports_description",
        ),
        CheckConstraint(
            "latitude IS NULL OR latitude BETWEEN -90 AND 90",
            name="ck_citizen_reports_latitude",
        ),
        CheckConstraint(
            "longitude IS NULL OR longitude BETWEEN -180 AND 180",
            name="ck_citizen_reports_longitude",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    report_reference: Mapped[str] = mapped_column(
        String(64), unique=True, index=True
    )
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    department_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("departments.id", ondelete="SET NULL"),
        index=True,
    )
    reported_by_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    location_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("project_locations.id", ondelete="SET NULL"),
        index=True,
    )

    report_type: Mapped[str] = mapped_column(String(24), index=True)
    description: Mapped[str] = mapped_column(String(4000))
    reported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True
    )
    status: Mapped[str] = mapped_column(String(24), default="submitted", index=True)

    # PostGIS point, SRID 4326 (WGS84)
    location_geom: Mapped[Optional[object]] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False), index=True
    )

    latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), index=True)
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), index=True)

    # up to 5 photos/attachments, each referenced by document id
    photo_document_ids: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(BigInteger)
    )

    claim_source_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("claims.id", ondelete="SET NULL"),
        index=True,
    )

    is_location_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    project: Mapped["Project"] = relationship(back_populates="citizen_reports")
    department: Mapped[Optional["Department"]] = relationship(
        back_populates="citizen_reports"
    )
    reported_by: Mapped[Optional["User"]] = relationship(
        back_populates="citizen_reports"
    )
    location: Mapped[Optional["ProjectLocation"]] = relationship(
        back_populates="citizen_reports"
    )
    source_claim: Mapped[Optional["Claim"]] = relationship(
        back_populates="citizen_reports"
    )
