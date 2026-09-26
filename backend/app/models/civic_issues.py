from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixin import TimestampMixin


class CivicIssue(TimestampMixin, Base):
    """A citizen-reported public infrastructure issue tracked end-to-end.

    CivicWatch is the public-accountability loop: a citizen reports an issue,
    the community corroborates it with confirmations, the authority is
    notified, work is recorded (UNDER ACTION -> WORK IN PROGRESS ->
    MARKED FIXED), the citizen verifies the fix (FIXED / PARTIALLY FIXED /
    STILL EXISTS), and the JANVERIFY neutral team reviews cases where the
    records conflict (TRUSTMESH CONFLICTING). No status change is ever
    un-audited.

    ``sla_exceeded`` reflects only a *product-level* 24-hour response target;
    it is never a legal claim about any authority's obligations.
    """

    __tablename__ = "civic_issues"
    __table_args__ = (
        CheckConstraint(
            "status IN "
            "('CITIZEN_SUBMITTED','UNDER_PUBLIC_REVIEW','AUTHORITY_NOTIFIED',"
            "'UNDER_ACTION','WORK_IN_PROGRESS','MARKED_FIXED',"
            "'CITIZEN_VERIFIED','RESOLVED','CONFLICTING','CLOSED')",
            name="ck_civic_issues_status",
        ),
        CheckConstraint(
            "trust_state IN "
            "('SUPPORTED','INCOMPLETE','CONFLICTING','QUESTIONABLE',"
            "'HUMAN_REVIEW_REQUIRED','INSUFFICIENT')",
            name="ck_civic_issues_trust_state",
        ),
        CheckConstraint(
            "char_length(title) > 0", name="ck_civic_issues_title"
        ),
        CheckConstraint(
            "latitude IS NULL OR latitude BETWEEN -90 AND 90",
            name="ck_civic_issues_latitude",
        ),
        CheckConstraint(
            "longitude IS NULL OR longitude BETWEEN -180 AND 180",
            name="ck_civic_issues_longitude",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    issue_reference: Mapped[str] = mapped_column(
        String(64), unique=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(String(2000))
    # category is the fine-grained key (e.g. "pothole"); category_key the
    # coarse filter bucket (e.g. "roads") used by the feed filters.
    category: Mapped[str] = mapped_column(String(24), index=True)
    category_key: Mapped[str] = mapped_column(String(24), index=True)
    ward: Mapped[Optional[str]] = mapped_column(String(64))
    locality: Mapped[Optional[str]] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(64), default="Nagpur", index=True)
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), index=True)
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), index=True)

    status: Mapped[str] = mapped_column(
        String(32), default="CITIZEN_SUBMITTED", index=True
    )
    trust_state: Mapped[str] = mapped_column(
        String(32), default="INSUFFICIENT", index=True
    )
    confirmations: Mapped[int] = mapped_column(Integer, default=0, index=True)
    comments_count: Mapped[int] = mapped_column(Integer, default=0)

    reported_by_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    reported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True
    )
    notified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), index=True
    )
    target_hours: Mapped[int] = mapped_column(Integer, default=24)
    sla_exceeded: Mapped[bool] = mapped_column(Boolean, default=False)

    # Representative Wikimedia Commons photo (never evidence of a specific
    # incident) plus a growing list of {url, kind, by_role, caption, note, at}
    # evidence snapshots attached as the workflow advances.
    main_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    main_image_caption: Mapped[Optional[str]] = mapped_column(String(300))
    main_image_attribution: Mapped[Optional[str]] = mapped_column(String(200))
    main_image_license: Mapped[Optional[str]] = mapped_column(String(100))
    evidence: Mapped[Optional[List[dict]]] = mapped_column(JSON)

    # Citizen verification verdict for the resolution claim.
    verdict: Mapped[Optional[str]] = mapped_column(String(24))  # FIXED|PARTIALLY_FIXED|STILL_EXISTS
    verdict_note: Mapped[Optional[str]] = mapped_column(String(500))
    verified_by_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), index=True
    )