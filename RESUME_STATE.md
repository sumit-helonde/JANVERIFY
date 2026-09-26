# JANVERIFY — RESUME STATE (SAVED AT PAUSE)

> JANVERIFY DEVELOPMENT PAUSED TEMPORARILY.

Phase 3 remains **NOT VERIFIED** and is parked for later migration bootstrap
verification. Its verdict file (`%TEMP%\janv_p3_verdict.txt`) is preserved
as-is; Phase 3 was NOT marked verified and NO Phase 3 status was changed.

Phase 4 has been **started and is still IN PROGRESS / NOT VERIFIED**. It must
resume from its current saved state and must NOT be restarted from scratch
unless the existing data or DB is missing/corrupted.

Phase 5 must NOT start until Phase 4 is genuinely verified.

## Phase 4 resume point (as saved)

- Stage: research/read-only preparation. No seed script run, no Phase 4 rows
  written to the database yet.
- Database `janverify` confirmed usable: 22 tables (20 domain +
  `alembic_version` + `spatial_ref_sys`), PostGIS extension present
  (`postgis` 3.6.2), `spatial_ref_sys` populated (8500 rows), ORM models all
  importable from the SQLAlchemy layer.
- NOT yet started: Phase 4 synthetic seed generation, Phase 4 write, Phase 4
  verification (counts / relationships / NRD-204 values / labeling /
  integrity / reproducibility / read-back).

## Phase 4 data requirements (from tasks.md / user brief, verbatim intent)

- 50+ projects, 10 departments, 15 contractors/vendors, 50+ tenders/models,
  100+ payments, 100+ evidence records, 50 inspections, 50 progress reports,
  50 claims, supporting documents, project locations with valid coordinates.
- Project categories: Roads, Bridges, Government Schools, Government
  Hospitals, Water Plants, Water Supply, Public Buildings, Other
  Infrastructure.
- Killer synthetic project **NRD-204 “Ward 24 Road Development”** with exact
  values (ALL must be reproduced exactly):
  - Sanctioned: .rupee 50 Cr
  - Contract: .rupee 47.8 Cr
  - Released: .rupee 42 Cr
  - Recorded expenditure: .rupee 39 Cr
  - Government progress: 85%
  - Earlier independent inspection: 63%
  - Latest independent inspection: 82%
  - Financial documentation requiring review: .rupee 8.2 Cr
- All synthetic records labelled `SYNTHETIC HACKATHON DATA`.
- Neutrally worded evidence states; do NOT auto-declare fraud/corruption
  (use CONFLICTING / HUMAN_REVIEW_REQUIRED / documentation needs review).
- Create the underlying evidence relationships that Phase 8 TRUSTMESH /
  FRAUDSCOPE will later consume: supports / contradicts / updates /
  documents / paid_by / inspected_by / related_project / related_contract
  with a full evidence graph (project → claim → inspection → latest
  inspection → photos → financial record → decision).

## Preservation guarantees

- No Phase 3 migration files were deleted or modified.
- No schema/model/config changes were made.
- No existing seeded/generated data was removed or reset.
- Phase 3 was NOT marked verified; Phase 4 is NOT marked verified.
