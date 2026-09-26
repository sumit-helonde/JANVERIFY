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
from geoalchemy2 import Geometry

from app.models.base import Base
from app.models.mixin import TimestampMixin


class Evidence(TimestampMixin, Base):
    """A claim-verifying piece of ground truth: photo, GPS fix, document scan.

    Evidence is the single most audited table in JANVERIFY. Each row pins a
    physical capture (``capture_geom`` PostGIS point) to a project, an
    uploader, and at most one target claim/decision so the verification chain
    (claim -> evidence -> decision) stays one-directional and tamper-proof via
    ``checksum_sha256``.
    """

    __tablename__ = "evidence"
    __table_args__ = (
        CheckConstraint(
            "source_type IN "
            "('citizen_photo','citizen_report','document','inspection','claim','decision')",
            name="ck_evidence_source_type",
        ),
        CheckConstraint(
            "status IN "
            "('pending','verified','disputed','rejected','superseded')",
            name="ck_evidence_status",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    project_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    uploaded_by_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    document_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("documents.id", ondelete="SET NULL"),
        index=True,
    )
    claim_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("claims.id", ondelete="SET NULL"),
        index=True,
    )

    capture_geom: Mapped[Optional[object]] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        index=True,
    )
    captured_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), index=True
    )
    description: Mapped[Optional[str]] = mapped_column(String(2000))
    source_type: Mapped[str] = mapped_column(String(24), default="inspection")
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    checksum_sha256: Mapped[Optional[str]] = mapped_column(
        String(64), index=True
    )
    chain_trace: Mapped[Optional[str]] = mapped_column(String(400))

    project: Mapped["Project"] = relationship(back_populates="evidence")
    uploaded_by: Mapped["User"] = relationship(back_populates="evidence")
    document: Mapped[Optional["Document"]] = relationship(
        back_populates="linked_evidence"
    )
    claim: Mapped[Optional["Claim"]] = relationship(back_populates="evidence")
