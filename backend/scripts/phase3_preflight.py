"""Phase 3 preflight: confirm we can create/drop scratch DBs and enable PostGIS
against the local PostgreSQL server using the maintenance 'postgres' DB."""
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.config import get_settings

results: list[str] = []
ok = True


def check(label: str, cond: bool) -> None:
    global ok
    ok = ok and cond
    results.append(("OK   " if cond else "FAIL ") + label)


def main() -> int:
    url = make_url(get_settings().database_url)
    maint = url.set(database="postgres")
    engine = create_engine(maint, isolation_level="AUTOCOMMIT")
    scratch = "janverify_phase3_scratch"
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT current_user, current_database(), rolsuper FROM pg_roles WHERE rolname = current_user")
            ).one()
            check(f"connected as {row[0]} on {row[1]}", True)
            check("role is superuser", bool(row[2]))

            conn.execute(text(f'DROP DATABASE IF EXISTS "{scratch}"'))
            conn.execute(text(f'CREATE DATABASE "{scratch}"'))
            check("create scratch DB", True)
            check(
                "has postgis availability",
                conn.execute(
                    text("SELECT count(*) FROM pg_available_extensions WHERE name = 'postgis'")
                ).scalar()
                == 1,
            )
    finally:
        engine.dispose()

    # Connect to scratch and enable PostGIS + check the extension really installs.
    engine2 = create_engine(url.set(database=scratch), isolation_level="AUTOCOMMIT")
    try:
        with engine2.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            check("CREATE EXTENSION postgis succeeds", True)
            v = conn.execute(text("SELECT PostGIS_Version()")).scalar()
            check("PostGIS_Version() is " + (v or "?"), bool(v))
            check(
                "spatial_ref_sys populated",
                conn.execute(text("SELECT count(*) FROM spatial_ref_sys")).scalar() > 0,
            )
    finally:
        engine2.dispose()

    engine3 = create_engine(maint, isolation_level="AUTOCOMMIT")
    try:
        with engine3.connect() as conn:
            conn.execute(text(f'DROP DATABASE IF EXISTS "{scratch}"'))
        check("drop scratch DB", True)
    finally:
        engine3.dispose()

    print("\n".join(results))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
