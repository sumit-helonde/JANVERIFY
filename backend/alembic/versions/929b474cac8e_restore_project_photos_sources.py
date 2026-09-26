"""bridge: restore lost migration history (project_photos + project_sources)

Revision ID: 929b474cac8e
Revises: 05a3e57096d8
Create Date: 2026-09-24 10:00:00.000000

The live database (and the projects API) contains two extra tables --
``project_photos`` and ``project_sources`` -- that were originally added by a
later migration whose file was pruned from the repository. This bridge
recreates that migration from the *live* schema (reflected 2026-09-24) so the
Alembic history chain stays linear and a fresh database can be replayed to the
same head. It is a no-op for any database already stamped at 929b474cac8e.

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '929b474cac8e'
down_revision = '05a3e57096d8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        'project_photos',
        sa.Column('id', sa.Integer(), sa.Identity(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=False),
        sa.Column('image_file_page', sa.Text(), nullable=False),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('source_name', sa.Text(), nullable=True),
        sa.Column('source_title', sa.Text(), nullable=True),
        sa.Column('attribution', sa.Text(), nullable=True),
        sa.Column('license_info', sa.Text(), nullable=True),
        sa.Column('image_date', sa.Text(), nullable=True),
        sa.Column('is_representative', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('source_type', sa.Text(), server_default=sa.text("'REAL_PUBLIC'"), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('source_organization', sa.Text(), nullable=True),
        sa.Column('image_type', sa.Text(), server_default=sa.text("'REPRESENTATIVE_IMAGE'"), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id', name='project_photos_pkey'),
    )
    op.create_table(
        'project_sources',
        sa.Column('id', sa.Integer(), sa.Identity(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('source_order', sa.Integer(), nullable=True),
        sa.Column('organization', sa.Text(), nullable=True),
        sa.Column('document_type', sa.Text(), nullable=True),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('published_date', sa.Text(), nullable=True),
        sa.Column('retrieved_date', sa.Text(), nullable=True),
        sa.Column('source_type', sa.Text(), server_default=sa.text("'REAL_PUBLIC'"), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id', name='project_sources_pkey'),
    )


def downgrade() -> None:
    op.drop_table('project_sources')
    op.drop_table('project_photos')