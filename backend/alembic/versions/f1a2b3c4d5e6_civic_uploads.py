"""civic_uploads table for storing citizen-submitted photos in the database

Revision ID: f1a2b3c4d5e6
Revises: c96012b4a7d1
Create Date: 2026-09-27 09:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "f1a2b3c4d5e6"
down_revision = "c96012b4a7d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "civic_uploads",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("filename", sa.String(length=120), nullable=False),
        sa.Column("content_type", sa.String(length=60), nullable=False),
        sa.Column("byte_length", sa.Integer(), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sha256", name="uq_civic_uploads_sha256"),
    )
    op.create_index("ix_civic_uploads_sha256", "civic_uploads", ["sha256"])


def downgrade() -> None:
    op.drop_index("ix_civic_uploads_sha256", table_name="civic_uploads")
    op.drop_table("civic_uploads")
