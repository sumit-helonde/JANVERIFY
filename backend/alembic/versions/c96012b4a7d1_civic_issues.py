"""civic_issues table for CivicWatch role-driven workflow

Revision ID: c96012b4a7d1
Revises: 05a3e57096d8
Create Date: 2026-09-24 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c96012b4a7d1'
down_revision = '929b474cac8e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('civic_issues',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('issue_reference', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('description', sa.String(length=2000), nullable=False),
    sa.Column('category', sa.String(length=24), nullable=False),
    sa.Column('category_key', sa.String(length=24), nullable=False),
    sa.Column('ward', sa.String(length=64), nullable=True),
    sa.Column('locality', sa.String(length=200), nullable=True),
    sa.Column('city', sa.String(length=64), nullable=False),
    sa.Column('latitude', sa.Numeric(9, 6), nullable=True),
    sa.Column('longitude', sa.Numeric(9, 6), nullable=True),
    sa.Column('status', sa.String(length=32), nullable=False),
    sa.Column('trust_state', sa.String(length=32), nullable=False),
    sa.Column('confirmations', sa.Integer(), nullable=False),
    sa.Column('comments_count', sa.Integer(), nullable=False),
    sa.Column('reported_by_id', sa.BigInteger(), nullable=True),
    sa.Column('reported_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('notified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('target_hours', sa.Integer(), nullable=False),
    sa.Column('sla_exceeded', sa.Boolean(), nullable=False),
    sa.Column('main_image_url', sa.String(length=500), nullable=True),
    sa.Column('main_image_caption', sa.String(length=300), nullable=True),
    sa.Column('main_image_attribution', sa.String(length=200), nullable=True),
    sa.Column('main_image_license', sa.String(length=100), nullable=True),
    sa.Column('evidence', sa.JSON(), nullable=True),
    sa.Column('verdict', sa.String(length=24), nullable=True),
    sa.Column('verdict_note', sa.String(length=500), nullable=True),
    sa.Column('verified_by_id', sa.BigInteger(), nullable=True),
    sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("status IN ('CITIZEN_SUBMITTED','UNDER_PUBLIC_REVIEW','AUTHORITY_NOTIFIED','UNDER_ACTION','WORK_IN_PROGRESS','MARKED_FIXED','CITIZEN_VERIFIED','RESOLVED','CONFLICTING','CLOSED')", name=op.f('ck_civic_issues_status')),
    sa.CheckConstraint("trust_state IN ('SUPPORTED','INCOMPLETE','CONFLICTING','QUESTIONABLE','HUMAN_REVIEW_REQUIRED','INSUFFICIENT')", name=op.f('ck_civic_issues_trust_state')),
    sa.CheckConstraint('char_length(title) > 0', name=op.f('ck_civic_issues_title')),
    sa.CheckConstraint('latitude IS NULL OR latitude BETWEEN -90 AND 90', name=op.f('ck_civic_issues_latitude')),
    sa.CheckConstraint('longitude IS NULL OR longitude BETWEEN -180 AND 180', name=op.f('ck_civic_issues_longitude')),
    sa.ForeignKeyConstraint(['reported_by_id'], ['users.id'], name=op.f('fk_civic_issues_users_reported_by_id'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['verified_by_id'], ['users.id'], name=op.f('fk_civic_issues_users_verified_by_id'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_civic_issues'))
    )
    op.create_index(op.f('ix_civic_issues_category'), 'civic_issues', ['category'], unique=False)
    op.create_index(op.f('ix_civic_issues_category_key'), 'civic_issues', ['category_key'], unique=False)
    op.create_index(op.f('ix_civic_issues_city'), 'civic_issues', ['city'], unique=False)
    op.create_index(op.f('ix_civic_issues_confirmations'), 'civic_issues', ['confirmations'], unique=False)
    op.create_index(op.f('ix_civic_issues_created_at'), 'civic_issues', ['created_at'], unique=False)
    op.create_index(op.f('ix_civic_issues_issue_reference'), 'civic_issues', ['issue_reference'], unique=True)
    op.create_index(op.f('ix_civic_issues_latitude'), 'civic_issues', ['latitude'], unique=False)
    op.create_index(op.f('ix_civic_issues_longitude'), 'civic_issues', ['longitude'], unique=False)
    op.create_index(op.f('ix_civic_issues_notified_at'), 'civic_issues', ['notified_at'], unique=False)
    op.create_index(op.f('ix_civic_issues_reported_at'), 'civic_issues', ['reported_at'], unique=False)
    op.create_index(op.f('ix_civic_issues_reported_by_id'), 'civic_issues', ['reported_by_id'], unique=False)
    op.create_index(op.f('ix_civic_issues_status'), 'civic_issues', ['status'], unique=False)
    op.create_index(op.f('ix_civic_issues_trust_state'), 'civic_issues', ['trust_state'], unique=False)
    op.create_index(op.f('ix_civic_issues_verified_at'), 'civic_issues', ['verified_at'], unique=False)
    op.create_index(op.f('ix_civic_issues_verified_by_id'), 'civic_issues', ['verified_by_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_civic_issues_verified_by_id'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_verified_at'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_trust_state'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_status'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_reported_by_id'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_reported_at'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_notified_at'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_longitude'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_latitude'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_issue_reference'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_created_at'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_confirmations'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_city'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_category_key'), table_name='civic_issues')
    op.drop_index(op.f('ix_civic_issues_category'), table_name='civic_issues')
    op.drop_table('civic_issues')