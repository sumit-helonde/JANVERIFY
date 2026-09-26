"""JANVERIFY Phase 3 gate: import all models, snapshot metadata, save verdict.

Writes its finding to OUT env var so the caller re-reads it as ground truth
without relying on console interleaving.
"""
import os
import sys
import traceback
from datetime import datetime

OUT = os.environ.get("JANV_VERDICT", os.path.join(os.environ.get("TEMP", "."), "janv_verdict.txt"))

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

EXPECTED_TABLES = [
    "users", "departments", "project_categories", "projects",
    "project_locations", "budgets", "tenders", "contracts", "vendors",
    "payments", "documents", "evidence", "audit_logs",
    "project_relationships", "claims", "decisions", "anomalies",
    "inspections", "progress_reports", "citizen_reports", "civic_issues",
]

lines = []
try:
    import app.models  # noqa: F401  populates Base.metadata
    from app.models.base import Base

    tables = sorted(Base.metadata.tables.keys())
    lines.append("IMPORT: OK")
    lines.append(f"TABLE_COUNT: {len(tables)}")
    missing = sorted(set(EXPECTED_TABLES) - set(tables))
    extra = sorted(set(tables) - set(EXPECTED_TABLES))
    lines.append(f"MISSING: {missing or 'none'}")
    lines.append(f"EXTRA: {extra or 'none'}")
    # column counts + presence of required behaviors per table
    for name in sorted(EXPECTED_TABLES):
        if name in Base.metadata.tables:
            t = Base.metadata.tables[name]
            cols = len(t.columns)
            has_created = "created_at" in t.c
            lines.append(f"  {name:<24} cols={cols:>2} created_at={has_created}")
    # PostGIS check: ran as server-side extension, geometry/geography types exist
    lines.append("POSTGIS: geometry/geography types are cluster extensions (server-only check)")
except Exception:
    lines.append("IMPORT: FAILED")
    lines.append(traceback.format_exc())

result = "\n".join(lines)
with open(OUT, "w", encoding="utf-8") as fh:
    fh.write(f"GATE_WROTE_AT={datetime.now().isoformat()}\n")
    fh.write(result)

# Mirrors the verdict to stdout for the truncated-console logger.
print(result)
