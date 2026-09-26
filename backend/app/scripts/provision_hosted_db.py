"""Provision a hosted PostgreSQL database for JANVERIFY.

Run this once against a fresh Vercel/Neon database:

    python -m app.scripts.provision_hosted_db "postgresql://user:pass@host/db"

It enables PostGIS, applies the Alembic migrations, and seeds the demo login
accounts. Safe to re-run.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))


def main() -> int:
    arg = sys.argv[1] if len(sys.argv) > 1 else ""
    url = (arg or os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        print("usage: python -m app.scripts.provision_hosted_db <database-url>")
        return 2
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    os.environ["DATABASE_URL"] = url
    os.environ.setdefault("JWT_SECRET", "provisioning-only")

    import psycopg
    from sqlalchemy import create_engine, text

    plain = url.replace("postgresql+psycopg://", "postgresql://", 1)

    local = any(h in plain for h in ("localhost", "127.0.0.1", "/cloudsql/"))
    sslmode = "prefer" if local else "require"

    print("1/4 connecting...")
    with psycopg.connect(plain, sslmode=sslmode) as conn:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        conn.commit()
        print("    postgis ready")

    print("2/4 applying migrations...")
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")

    print("3/4 seeding demo accounts...")
    engine = create_engine(url, pool_pre_ping=True)
    with engine.connect() as conn:
        count = conn.execute(
            text("select count(*) from information_schema.tables where table_schema='public'")
        ).scalar()
    print(f"    tables present: {count}")

    from app.core.db import SessionLocal
    from app.scripts.seed_civic_demo import seed_users

    db = SessionLocal()
    try:
        seed_users(db)
        db.commit()
    finally:
        db.close()
    print("    demo users ready (citizen@janverify.demo / authority@janverify.demo / demo1234)")

    print("4/4 verifying...")
    with engine.connect() as conn:
        conn.execute(text("select 1"))
    engine.dispose()
    print("PROVISIONED OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
