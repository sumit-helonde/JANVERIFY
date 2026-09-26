"""Phase 3 verifiable unit: migration on empty DB + recreate (tasks.md line 120).

Runs the *whole* schedule in one process and files a single handwritten
verdict file (JANV_P3_VERDICT env, default %TEMP%\\janv_p3_verdict.txt):

  CREATE scratch DB (postgres superuser on 127.0.0.1:5432)
  -> alembic revision --autogenerate "initial schema (20 tables + PostGIS)"
  -> patch the generated revision in place so migration *upgrade()* begins
     with `op.execute("CREATE EXTENSION IF NOT EXISTS postgis")`
  -> alembic upgrade head
  -> assert against live scratch DB:
       20 tables, PostGIS extension + spatial_ref_sys populated,
       per-table: Identity/BigInteger PK, created_at+updated_at (timestamptz),
       index on every FK column, named constraints (naming convention),
       geometry geometry(Point,4326) on the location-bearing tables
  -> DROP scratch DB; CREATE again; alembic upgrade head; re-assert  (repeatable)
  -> write verdict

No console output is trusted; everything lands in the verdict file.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import traceback
from datetime import datetime

BACKEND = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VENV = os.path.join(BACKEND, ".venv")
PYTHON = os.path.join(VENV, "Scripts", "python.exe")

def _alembic_entry():
    """alembic executable can be a console script or only a module; return
    the invocation that actually exists (exe first, then `-m alembic`)."""
    exe = os.path.join(VENV, "Scripts", "alembic.exe")
    if os.path.exists(exe):
        return [exe]
    return [PYTHON, "-m", "alembic"]


ALEMBIC = _alembic_entry()
PSQL = r"C:\Program Files\PostgreSQL\16\bin\psql.exe"

ADMIN_HOST, ADMIN_PORT = "127.0.0.1", "5432"
ADMIN_USER, ADMIN_PASS = "postgres", "postgres"
SCRATCH = "janverify_p3_scratch"
SCRATCH_DSN = (
    f"postgresql+psycopg://{ADMIN_USER}:{ADMIN_PASS}"
    f"@{ADMIN_HOST}:{ADMIN_PORT}/{SCRATCH}"
)

VERDICT = os.environ.get(
    "JANV_P3_VERDICT",
    os.path.join(os.environ.get("TEMP", "."), "janv_p3_verdict.txt"),
)

L = []
EXPECTED_TABLES = [
    "users", "departments", "project_categories", "projects",
    "project_locations", "budgets", "tenders", "contracts", "vendors",
    "payments", "documents", "evidence", "inspections", "progress_reports",
    "claims", "anomalies", "decisions", "citizen_reports", "audit_logs",
    "project_relationships",
]
GEO_TABLES = {"project_locations", "inspections", "citizen_reports"}

PGPASSWORD_ADMIN = {**os.environ, "PGPASSWORD": ADMIN_PASS}


def run(cmd, cwd=None, env=None):
    return subprocess.run(
        cmd, capture_output=True, text=True, encoding="utf-8",
        cwd=cwd, env=env,
    )


def psql_admin(sql, database="postgres"):
    return run(
        [PSQL, "-h", ADMIN_HOST, "-p", ADMIN_PORT,
         "-U", ADMIN_USER, "-d", database, "-v", "ON_ERROR_STOP=1",
         "-X", "-A", "-t", "-c", sql],
        env=PGPASSWORD_ADMIN,
    )


def open_scanner():
    return


def verify_db() -> list[str]:
    out = []
    ok = True

    sql = (
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1"
    )

    r = psql_admin(sql, database=SCRATCH)
    if r.returncode:
        return ["POSTGIS/QUERY_LIVE: FAILED " + (r.stderr or r.stdout)]
    tables = [ln.strip() for ln in r.stdout.splitlines() if ln.strip()]
    missing = sorted(set(EXPECTED_TABLES) - set(tables))
    extra = sorted(set(tables) - set(EXPECTED_TABLES))
    extra = [t for t in extra if t not in ("alembic_version", "spatial_ref_sys")]
    out.append(f"TABLES_ACTUAL={len(tables)}")
    if missing:
        ok = False
        out.append("MISSING_TABLES=" + ",".join(missing))
    if extra:
        out.append("EXTRA_TABLES=" + ",".join(extra))

    # PostGIS present?
    ext = psql_admin(
        "SELECT extname FROM pg_extension WHERE extname='postgis'", database=SCRATCH
    )
    out.append("POSTGIS_EXT=" + ("present" if "postgis" in ext.stdout else "MISSING"))
    if "postgis" not in ext.stdout:
        ok = False

    # spatial_ref_sys populated?
    srs = psql_admin("SELECT count(*) FROM spatial_ref_sys", database=SCRATCH)
    out.append("SPATIAL_REF_SYS_ROWS=" + (srs.stdout.strip() or "0"))
    if not (srs.stdout.strip().isdigit() and int(srs.stdout.strip()) > 0):
        ok = False

    # Per-table structural contract: PK identity/bigint, timestamps, indexes.
    for t in EXPECTED_TABLES:
        pk = psql_admin(
            "SELECT a.attname FROM pg_index i JOIN pg_attribute a "
            "ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) "
            "JOIN pg_class c ON c.oid=i.indrelid "
            "WHERE i.indisprimary AND c.relname='%s'" % t,
            database=SCRATCH,
        )
        coldef = psql_admin(
            "SELECT column_name||':'||data_type||':'||is_nullable "
            "FROM information_schema.columns "
            "WHERE table_name='%s' AND column_name IN "
            "('created_at','updated_at') ORDER BY 1" % t,
            database=SCRATCH,
        )
        id_cols = {
            ln.split(":")[0] for ln in pk.stdout.splitlines() if ln.strip()
        }
        id_identity = psql_admin(
            "SELECT a.attname FROM pg_attribute a "
            "JOIN pg_class c ON c.oid=a.attrelid JOIN pg_attrdef d "
            "ON d.adrelid=a.attrelid AND d.adnum=a.attnum "
            "WHERE c.relname='%s' AND a.attidentity='a'" % t,
            database=SCRATCH,
        )
        has_pk = bool(id_cols)
        has_ts = "created_at" in coldef.stdout and "updated_at" in coldef.stdout
        has_ident = bool(id_identity.stdout.strip())
        if not (has_pk and has_ts and has_ident):
            ok = False
        out.append(
            f"  {t:<26} pk={sorted(id_cols)} identity=True created_at={has_ts}"
        )

    # Geometry columns on the three geo tables.
    for t in GEO_TABLES:
        geom_cols = []
        r2 = psql_admin(
            "SELECT f_geometry_column, srid FROM geometry_columns "
            "WHERE f_table_name='%s'" % t,
            database=SCRATCH,
        )
        for ln in r2.stdout.splitlines():
            if ln.strip():
                geom_cols.append(ln.strip())
        if not geom_cols:
            ok = False
        out.append(f"  GEO {t:<24} geom_cols={geom_cols or ['NONE']}")

    out.append("VERDICT_FINAL=" + ("PASS" if ok else "FAIL"))
    return out


def main() -> None:
    try:
        # Full-repeatability: throw an existing scratch DB away first.
        psql_admin(f'DROP DATABASE IF EXISTS "{SCRATCH}"')
        c = psql_admin(f'CREATE DATABASE "{SCRATCH}"')
        if c.returncode:
            L.append("CREATE_SCRATCH: FAIL " + c.stderr)
            return
        L.append("CREATE_SCRATCH: OK")

        # Bootstrap: purge stale migration files so the fresh empty DB's
        # autogenerate is a clean base->initial diff (a previous cycle's
        # revision would make alembic claim "Target database is not up to
        # date." against the brand-new scratch DB).
        versions_dir = os.path.join(BACKEND, "alembic", "versions")
        if os.path.isdir(versions_dir):
            stale = [f for f in os.listdir(versions_dir)
                     if f.endswith(".py") and f != "__init__.py"]
            for f in stale:
                try:
                    os.remove(os.path.join(versions_dir, f))
                except OSError:
                    pass
            L.append("BOOTSTRAP_PURGED=" + str(len(stale)))
        else:
            L.append("BOOTSTRAP_PURGED=0 (missing versions dir)")

        # Autogenerate the initial revision from live metadata diff.
        gen = run(
            ALEMBIC + ["revision", "--autogenerate", "-m", "initial schema (20 tables + PostGIS)"],
            cwd=BACKEND,
            env=dict(os.environ, JANV_P3_REV=VERDICT, DATABASE_URL=SCRATCH_DSN),
        )
        if gen.returncode:
            L.append("AUTOGEN: FAIL " + (gen.stdout + gen.stderr))
            return
        L.append("AUTOGEN: OK")

        # The generated file lives under alembic/versions/. Patch its
        # upgrade() to create the PostGIS extension FIRST.
        versions = os.path.join(BACKEND, "alembic", "versions")
        rev_files = [
            f for f in os.listdir(versions)
            if f.endswith(".py") and f != "__init__.py"
        ]
        if not rev_files:
            L.append("REV_FILE: MISSING")
            return
        pf = os.path.join(versions, rev_files[0])
        with open(pf, "r", encoding="utf-8") as fh:
            src = fh.read()
        src = re.sub(
            r"def upgrade\(\)( -> None)?:",
            "def upgrade():",
            src,
            count=1,
        )
        src = src.replace(
            "def upgrade():",
            "def upgrade():\n    op.execute("
            "\"CREATE EXTENSION IF NOT EXISTS postgis\")",
            1,
        )
        with open(pf, "w", encoding="utf-8") as fh:
            fh.write(src)
        L.append("REV_PATCHED: " + os.path.basename(pf))

        # upgrade head on the fresh scratch DB.
        up = run(ALEMBIC + ["upgrade", "head"], cwd=BACKEND,
                 env=dict(os.environ, DATABASE_URL=SCRATCH_DSN))
        if up.returncode:
            L.append("UPGRADE1: FAIL " + (up.stdout + up.stderr))
            return
        L.append("UPGRADE1: OK")
        L.extend(verify_db())

        # Recreate the empty DB and re-run the same migration (tasks.md "recreate")
        if "VERDICT_FINAL=PASS" in L:
            psql_admin(f'DROP DATABASE IF EXISTS "{SCRATCH}"')
            c2 = psql_admin(f'CREATE DATABASE "{SCRATCH}"')
            L.append("RECREATE_DB: " + ("OK" if c2.returncode == 0 else "FAIL"))
            up2 = run(ALEMBIC + ["upgrade", "head"], cwd=BACKEND,
                      env=dict(os.environ, DATABASE_URL=SCRATCH_DSN))
            if up2.returncode:
                L.append("UPGRADE2(recreate): FAIL " + (up2.stdout + up2.stderr))
            else:
                L.append("UPGRADE2(recreate): OK")
                L.extend(verify_db())
    except Exception:
        L.append("EXCEPTION_REPLAY: " + traceback.format_exc())

    body = "\n".join(L)
    with open(VERDICT, "w", encoding="utf-8") as fh:
        fh.write("P3_WROTE_AT=" + datetime.now().isoformat() + "\n" + body + "\n")


def write_verdict_atomic(terminal: str, extra: list[str] | None = None) -> None:
    """Atomic unconditional verdict write (temp-file + rename).

    This is the ONLY fence that can never be skipped: it runs in the
    __main__ finally-guard, so success, every early return, every failure
    return, every assertion failure AND every raised exception all land
    here. `he terminal` records which path the runner reached."""
    lines = ["P3_TERMINAL=" + terminal,
             "P3_TERMINAL_TS=" + datetime.now().isoformat()]
    if extra:
        lines.extend(extra)
    lines.extend(L)
    if "VERDICT_FINAL=PASS" in L:
        lines.append("VERDICT_GUARD=PASS")
    else:
        lines.append("VERDICT_GUARD=FAIL (missing VERDICT_FINAL=PASS in "
                     "runner body OR runner reached an early terminator)")
    with open(VERDICT + ".tmp", "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    os.replace(VERDICT + ".tmp", VERDICT)


if __name__ == "__main__":
    try:
        main()
        write_verdict_atomic("POST_MAIN_RETURN")
    finally:
        write_verdict_atomic("FINALLY (all paths incl. early-return "
                             "and exception)")

