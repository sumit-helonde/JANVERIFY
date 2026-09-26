"""Alembic migration environment for JANVERIFY (Phase 3).

Single source of truth for the DSN is the application `Settings` object
(app.config), the same URL the FastAPI session engine uses — there is no
second hardcoded copy anywhere. `target_metadata` is `Base.metadata`, populated
by importing `app.models` (all 20 tables register themselves).

Autogenerate strategy (Phase 3 contract):
  * `include_object` keeps only our OWN tables and their columns; PostGIS
    geometry/geography columns render through geoalchemy2 as-is.
  * `compare_type=True` so numeric/precision/scale changes are detected.
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.config import get_settings  # noqa: E402
import app.models  # noqa: E402,F401  populates Base.metadata with all 20 tables  # noqa: E402
from app.models.base import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Always take the URL from Settings — never duplicate it in alembic.ini.
config.set_main_option("sqlalchemy.url", get_settings().database_url)

target_metadata = Base.metadata

# Names that belong to other apps/extensions and must never be migrated.
_IGNORED_PREFIXES = (
    "spatial_ref_sys",
    "geometry_columns",
    "geography_columns",
    "raster_columns",
    "raster_overviews",
    "topology",
    "layer",
    "my_points",
    "my_polys",
)


def _include_object(obj, name, type_, reflected, compare_to):
    """Only our own tables; ignore PostGIS/SQLAlchemy-internal bookkeeping."""
    if type_ == "table":
        return name in target_metadata.tables
    if type_ == "column":
        return obj.table.name in target_metadata.tables
    return True


def _include_name(name, type_, parent_names):
    if type_ == "table":
        return name in target_metadata.tables
    return True


def run_migrations_offline() -> None:
    """Run in 'offline' mode (emit SQL without a live DB connection)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=_include_object,
        include_name=_include_name,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run in 'online' mode (against the live database)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=_include_object,
            include_name=_include_name,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
