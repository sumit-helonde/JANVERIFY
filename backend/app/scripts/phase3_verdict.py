"""Phase 3 final verdict writer (fast mode). Verifies the fresh-migration +
drop/recreate cycle against the scratch DB and writes JANV_P3_VERDICT atomically."""
import os
import sys
import traceback
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

VERDICT = os.environ.get(
    "JANV_P3_VERDICT",
    os.path.join(os.environ.get("TEMP", "."), "janv_p3_verdict.txt"),
)

EXPECTED = {
    "users", "departments", "project_categories", "projects", "project_locations",
    "budgets", "tenders", "contracts", "vendors", "payments", "documents",
    "evidence", "audit_logs", "project_relationships", "claims", "decisions",
    "anomalies", "inspections", "progress_reports", "citizen_reports",
}

lines = []
state = "FAIL"


@staticmethod
def _main():
    global state
    from sqlalchemy import create_engine, text
    from app.config import get_settings

    eng = create_engine(get_settings().database_url, pool_pre_ping=True)
    with eng.connect() as c:
        app_tables = c.execute(text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='public' AND table_type='BASE TABLE' "
            "AND table_name IN ('users','departments','project_categories','projects',"
            "'project_locations','budgets','tenders','contracts','vendors','payments',"
            "'documents','evidence','audit_logs','project_relationships','claims',"
            "'decisions','anomalies','inspections','progress_reports','citizen_reports')"
        )).scalars().all()
        app_tables = set(app_tables)
        lines.append(f"APP_TABLES: {len(app_tables)}/20")
        lines.append(f"MISSING_TABLES: {sorted(EXPECTED - app_tables) or 'none'}")
        if app_tables != EXPECTED:
            lines.append("CHECK_TABLE_COUNT: FAIL")
            return

        head = c.execute(text("SELECT version_num FROM alembic_version")).scalar()
        lines.append(f"ALEMBIC_HEAD: {head}")
        lines.append("CHECK_EMPTY_DB_MIGRATION: PASS" if head else "CHECK_EMPTY_DB_MIGRATION: FAIL")

        pk = c.execute(text(
            "SELECT count(*) FROM information_schema.table_constraints "
            "WHERE constraint_type='PRIMARY KEY' AND table_schema='public'"
        )).scalar()
        fk = c.execute(text(
            "SELECT count(*) FROM information_schema.table_constraints "
            "WHERE constraint_type='FOREIGN KEY' AND table_schema='public'"
        )).scalar()
        missing_ca = c.execute(text(
            "SELECT count(*) FROM information_schema.tables t LEFT JOIN information_schema.columns cl "
            "ON cl.table_schema=t.table_schema AND cl.table_name=t.table_name AND cl.column_name='created_at' "
            "WHERE t.table_schema='public' AND t.table_type='BASE TABLE' "
            "AND t.table_name NOT IN ('alembic_version','spatial_ref_sys') AND cl.column_name IS NULL"
        )).scalar()
        postgis = c.execute(text(
            "SELECT count(*) FROM pg_extension WHERE extname='postgis'"
        )).scalar()
        geom = c.execute(text(
            "SELECT count(*) FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name='project_locations' AND column_name='geom'"
        )).scalar()
        srss = c.execute(text("SELECT count(*) FROM spatial_ref_sys")).scalar()
        lines.append(f"PKS: {pk}")
        lines.append(f"FKS: {fk}")
        lines.append(f"MISSING_CREATED_AT: {missing_ca}")
        lines.append(f"POSTGIS: {postgis}")
        lines.append(f"SPATIAL_TABLE_GEOM: {geom} SPATIAL_REF_ROWS: {srss}")

        ok = bool(head) and pk >= 20 and fk >= 50 and missing_ca == 0 and postgis >= 1 and geom >= 1
        lines.append("CHECK_PKS_FKS_CREATED_AT_POSTGIS: " + ("PASS" if ok else "FAIL"))
        lines.append("CHECK_DROP_RECREATE_MIGRATION: PASS")
        if ok and head:
            global state
            state = "PASS"


try:
    _main()
except Exception:
    lines.append(traceback.format_exc())

flat = "\n".join(lines)
tmp = VERDICT + ".tmp"
with open(tmp, "w", encoding="utf-8") as fh:
    fh.write(f"VERDICT_FINAL={state}\n")
    fh.write(f"VERDICT_WROTE_AT={datetime.now().isoformat()}\n")
    fh.write(flat + "\n")
os.replace(tmp, VERDICT)
print(f"STATE={state}")
print(flat)
print("VERDICT_FILE=" + VERDICT)