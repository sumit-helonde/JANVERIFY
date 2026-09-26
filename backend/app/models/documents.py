from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixin import TimestampMixin


class Document(TimestampMixin, Base):
    """A stored file (PDF, XLSX, image) attached to a project or contract.

    Storage is never a bare URL: the artifact bytes live in object storage and
    `storage_key` is the opaque handle; `checksum_sha256` lets an auditor
    prove a document was not tampered with in transport.
    """

    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint(
            "char_length(title) > 0", name="ck_documents_title"
        ),
        CheckConstraint(
            "document_type IN "
            "('report','financial','bidding','agreement','design','proof','notice','other')",
            name="ck_documents_type",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    project_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("projects.id", ondelete="SET NULL"),
        index=True,
    )
    contract_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("contracts.id", ondelete="SET NULL"),
        index=True,
    )
    uploader_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    tender_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("tenders.id", ondelete="SET NULL"),
        index=True,
    )

    title: Mapped[str] = mapped_column(String(320))
    document_type: Mapped[str] = mapped_column(String(32), default="report")
    storage_key: Mapped[str] = mapped_column(String(512), unique=True)
    checksum_sha256: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    content_type: Mapped[Optional[str]] = mapped_column(String(128))
    byte_size: Mapped[Optional[int]] = mapped_column(BigInteger)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    visibility: Mapped[str] = mapped_column(
        String(24), default="public", index=True
    )

    project: Mapped[Optional["Project"]] = relationship(back_populates="documents")
    contract: Mapped[Optional["Contract"]] = relationship(
        back_populates="documents"
    )
    tender: Mapped[Optional["Tender"]] = relationship(back_populates="documents")
    uploader: Mapped[Optional["User"]] = relationship(back_populates="documents")
    linked_evidence: Mapped[List["Evidence"]] = relationship(
        back_populates="linked_document"
    )
