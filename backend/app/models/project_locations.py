from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Identity,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.models.base import Base
from app.models.mixin import TimestampMixin


class ProjectLocation(TimestampMixin, Base):
    """PostGIS georeference for a project footprint.

    `geom` is a PostGIS geometry (SRID 4326, WGS 84). Prefer points for the
    project centroid; line/polygon geometries are supported by the geometry
    type when the department supplies a full site boundary or alignment
    (e.g. a road corridor).
    """

    __tablename__ = "project_locations"
    __table_args__ = (
        CheckConstraint(
            "char_length(location_name) > 0 OR location_name IS NULL",
            name="ck_project_locations_name",
        ),
        CheckConstraint(
            "longitude IS NULL OR longitude BETWEEN -180 AND 180",
            name="ck_project_locations_longitude",
        ),
        CheckConstraint(
            "latitude IS NULL OR latitude BETWEEN -90 AND 90",
            name="ck_project_locations_latitude",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    location_name: Mapped[Optional[str]] = mapped_column(String(200), index=True)
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), index=True)
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), index=True)
    geom: Mapped[Optional[object]] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False), index=True
    )

    project: Mapped["Project"] = relationship(back_populates="locations")
