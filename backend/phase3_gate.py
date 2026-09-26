"""Phase 3 gate: import the whole models package, then check the metadata.

Writes a deterministic verdict file so the caller can read ground truth without
relying on console interleaving.
"""
import os
import traceback

EXPECTED_TABLES = [
    "users",
    "departments",
    "project_categories",
    "projects",
    "project_locations",
    "budgets",
    "tenders",
    "contracts",
    "vendors",
    "payments",
    "documents",
    "evidence",
    "inspections",
    "progress_reports",
    "claims",
    "anomalies",
    "decisions",
    "citizen_reports",
    "audit_logs",
    "project_relationships",
]

out_file = os.path.join(os.environ["TEMP"], "janv_models_gate.txt")

lines = []
try:
    import app.models  # noqa: F401  (populates Base.metadata)
    from app.models.base import Base

    actual = set(Base.metadata.tables.keys())
    missing = [t for t in EXPECTED_TABLES if t not in actual]
    extra = sorted(actual - set(EXPECTED_TABLES))
    lines.append(f"TABLE_COUNT {len(actual)}")
    lines.append(f"MISSING {','.join(missing) if missing else 'none'}")
    lines.append(f"EXTRA {','.join(extra) if extra else 'none'}")
    lines.append("VERDICT " + ("PASS" if not missing else "FAIL"))
except Exception:
    lines.append("IMPORT_FAILED")
    lines.append(traceback.format_exc())

with open(out_file, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))

print("done")
