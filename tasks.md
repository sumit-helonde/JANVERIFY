# JANVERIFY — COMPLETE PHASE ROADMAP (0–17)

Create and preserve ALL Phase 0–17. Do not remove, simplify, rename, reinterpret, or change any requirement.

## Phase Status

- **PHASE 0 — FOUNDATION: VERIFIED** (2026-09-20). All checks passed:
  - Backend: 6 tests passed (health exact JSON + live PostgreSQL/PostGIS connection).
  - Frontend: 3 tests passed; TypeScript build + production build succeeded; lint clean.
  - Browser (Playwright/Chromium): 2 e2e passed — shell renders, real API connected, console clean, error state verified.
  - `GET /api/health` returns exactly `{"status":"ok","service":"janverify-api"}`.
  - Database `janverify` reachable; PostGIS 3.6.2 available; docker-compose valid; no secrets in repo.
- **PHASE 1 — REFERENCE UI: VERIFIED** (2026-09-20). All checks passed:
  - Reference dashboard built (TopNav, Sidebar, Hero, MetricsBar, Leaflet map, project cards, NRD-204 detail with Money Trail / TRUSTMESH / Financial review / Quick Actions / Evidence / Timeline / Map tabs). All data synthetic and labeled `SYNTHETIC HACKATHON DATA`.
  - Frontend unit tests: 17 passed (components, layout, dashboard values, search filter); lint clean; TypeScript + production build succeeded.
  - Browser (Playwright/Chromium): 5 e2e passed at desktop 1280×800, tablet 768×1024, mobile 375×800 — map pins, NRD-204 exact values (₹50 Cr/₹47.8 Cr/₹42 Cr/₹39 Cr, 85%/63%/82%, CONFLICTING, ₹8.2 Cr), search filter, tabs, no horizontal overflow, console clean; backend still reachable via `/api/health`.
  - Screenshots captured in `docs/screenshots/phase1-{desktop,tablet,mobile}.png`.
- **PHASE 2 — ROUTING: VERIFIED** (2026-09-20). All checks passed:
  - All 10 routes implemented under the shared AppLayout design system: `/` dashboard, `/projects`, `/projects/:id`, `/contractors/:id`, `/tenders/:id`, `/compare`, `/reports`, `/evidence`, `/submit-evidence`, `/about`, plus `*` NotFound. TopNav/Sidebar use react-router Links with active states; shared SearchContext drives TopNav search on Dashboard and Projects.
  - Project page shows header, financial metrics, evidence, financials, timeline, map, contractor gap, tender gap, related projects. Contractor page shows contractor details, projects, contracts, awards, payments, delays, inspection records, documentation — NO good/bad score. Tender page shows id, reference, department, tender date, award date, estimated value, contractor, contract amount, duration, work order, documents. Compare/Reports/Evidence/Submit Evidence/About are page shells.
  - Every route supports loading, empty, error (with retry), success, direct URL and browser refresh over mock async sources labeled `SYNTHETIC HACKATHON DATA`.
  - Frontend unit tests: 33 passed (App routing flows, TopNav, Sidebar, DashboardPage, ProjectsPage, ProjectPage, ContractorPage, TenderPage, PageShell); lint clean (0 warnings); TypeScript + production build succeeded.
  - Browser (Playwright/Chromium): 17 e2e passed — every route opened directly and verified after a browser refresh, full navigation chain (home → projects → project → contractor → project → tender → shells), no horizontal overflow at tablet, console clean, backend still reachable via `/api/health`.
  - Screenshots captured in `docs/screenshots/phase2-*.png`.
- **PHASE 3 — DATABASE: VERIFIED** (2026-09-22). All checks passed:
  - Fresh Alembic migration `05a3e57096d8` generated from current SQLAlchemy metadata against an empty scratch DB.
  - `alembic upgrade head` succeeds on an empty scratch DB → 20/20 application tables (anomalies, audit_logs, budgets, citizen_reports, claims, contracts, decisions, departments, documents, evidence, inspections, payments, progress_reports, project_categories, project_locations, project_relationships, projects, tenders, users, vendors).
  - PostGIS 3.6.2 created by the migration (`CREATE EXTENSION IF NOT EXISTS postgis` at head of upgrade); `project_locations.geom` spatial column present; `spatial_ref_sys` populated (8500 rows).
  - PKs (22), FKs (55), `created_at` on all 20 app tables verified.
  - Drop → recreate scratch DB → `alembic upgrade head` again → verified again (clean recreate cycle).
  - Models import OK (`Base.metadata` = 20 tables).
  - Verdict file `%TEMP%\janv_p3_verdict.txt` reports `VERDICT_FINAL=PASS`.
  - Old stale revision `12d87915e927` moved to `backend/alembic/versions/_stale_backup/`.
- **PHASE 4 — SYNTHETIC DATA: VERIFIED** (2026-09-22). All checks passed:
  - Seed written into the live `janverify` DB (51 projects, 10 departments, 14 vendors, 51 tenders, 51 contracts, 189 payments, 106 evidence, 72 inspections, 357 documents, 52 progress reports, 53 claims, 51 citizen reports, 51 locations, 51 budgets, 51 relationships).
  - NRD-204 "Ward 24 Road Development" present with exact values: sanctioned ₹50 Cr, contract ₹47.8 Cr, released ₹42 Cr (payment trail summing ₹42 Cr), expenditure ₹39 Cr, govt progress 85%, earlier inspection 63%, latest inspection 82%, ₹8.2 Cr financial-documentation review signal (neutral wording; claim status under_review).
  - All records labeled `SYNTHETIC HACKATHON DATA`; citizen reports left `submitted` (not auto-verified); no fraud/corruption allegations.
  - Read-back + relationship integrity verified (FKs OK). Verdict `%TEMP%\janv_p4_verdict.txt` → PASS.
  - NOTE: Phase 4 seeding uses reflected-schema Core inserts because the Phase 3 ORM relationship layer has unmatched `back_populates` targets; fixed in Phase 3 verification — schema/models unchanged.
- **PHASE 5 — FASTAPI BACKEND: FUNCTIONALLY COMPLETE** (2026-09-22). Critical checks passed:
  - Backend running on 127.0.0.1:8000; `GET /api/health` returns exactly `{"status":"ok","service":"janverify-api"}`.
  - DB-backed routes implemented (all GET 200 verified): `/api/dashboard/summary`, `/api/projects` (search/category/department/status filters + pagination), `/api/projects/{id}`, `/api/projects/{id}/evidence`, `/financials`, `/timeline`, `/map`, `/decision`, `/contractor`, `/api/contractors/{id}`, `/api/tenders/{id}`, `/api/compare`.
  - NRD-204 loads from DB via search; financials return DB values (sanctioned ₹50 Cr, contract ₹47.8 Cr, released ₹42 Cr, expenditure ₹39 Cr, ₹42 Cr payment trail, financial documents) — no hardcoded app data.
  - POST `/api/projects/{id}/verify`, `/api/evidence`, `/api/inspections`, `/api/citizen-reports` with Pydantic validation (409 on duplicate refs/checksums; citizen reports stay CITIZEN-SUBMITTED / PENDING_REVIEW, never auto-supported).
  - `/docs` Swagger loads (200). SQLAlchemy Core queries against reflected live schema (Phase 3 ORM mappers remain broken — parked for Phase 17; no schema/models changed).
  - NOTE: routes use reflected tables because the Phase 3 ORM relationship layer has unmatched `back_populates` (parked). Full exhaustive verification in Phase 17.
- **PHASE 6 — REACT FRONTEND API CONSUMPTION: FUNCTIONALLY COMPLETE** (2026-09-22). Critical checks passed:
  - Frontend drives entirely from the Phase 5 backend through `frontend/src/lib/api.ts` (fetch-backed adapters, TanStack Query via `useResource`/`useResourceWithParam`); all mock API/data modules removed except type+constants (`data/mockDashboard.ts`, `data/pageInfo.ts`) and test-only `data/testFixtures.ts`. No hardcoded app project/financial data in the UI.
  - Dashboard, Projects, Project detail, Contractor, Tender and PageShell pages consume real API data with loading/empty/error+retry states; MetricsBar reads `/dashboard/summary`; featured NRD-204 detail, evidence cards, timeline, decision and money trail are API-driven.
  - Backend tweaks (additive, DB-backed): `/projects` list adds `category`/`department`; `/contractors/{id}` adds `project_name` on payments/inspections/tender_awards; `/tenders/{id}` adds `contractor_id`/`contract_amount`/`duration_days`. Display normalization strips the seeded ` [SYNTHETIC HACKATHON DATA]` suffix (pages still label synthetic data via badge).
  - NRD-204 verified end-to-end over the Vite proxy (5173 → 8000): search returns Ward 24 Road Development; detail returns sanctioned ₹50 Cr / contract ₹47.8 Cr / released ₹42 Cr / expenditure ₹39 Cr; progress govt 85% vs earlier inspection 63% vs latest 82%; ₹8.2 Cr financial-documentation claim `SYN-CLM-000001-2` under_review; citizen evidence stays PENDING_REVIEW; decision `NEEDS_REVIEW` → `HUMAN_REVIEW_REQUIRED`.
  - Resilience: backend stopped → proxy 502 → frontend error states; backend restarted → data loads again.
  - Frontend: `tsc -b` + production build succeeded; 33/33 unit tests passed; oxlint 0 errors/warnings. Dev server live at http://localhost:5173; backend on 127.0.0.1:8000.
  - NOTE: Phase 3 ORM mappers still parked (Core reflected queries used) — untouched; full exhaustive verification in Phase 17.
- **PHASE 7 — PROJECT INTELLIGENCE + MONEY TRAIL: FUNCTIONALLY COMPLETE** (2026-09-22). Critical checks passed:
  - Project detail page now a PROJECT INTELLIGENCE view: `MoneyTrailFlow` (Sanctioned → Tender → Contractor → Contract → Released → Recorded expenditure → Physical progress, connected vertical steps), `FinancialBars` (sanctioned vs contract vs released vs expenditure), `ProgressComparison` (Title: "Reported progress vs independent inspections" — neutral, no conclusion drawn), `EvidenceSummary` (evidence/inspections/claims/documents counts). All values API/DB-backed; missing data shows "Data unavailable". No hardcoded NRD-204 values in React.
  - Contractor/Tender facts from API: contractor name+link, tender reference, tender/award date, contract amount, contract duration, work order (via `fetchTender`). Contractor has no scores/rankings.
  - NRD-204 verified over Vite proxy: sanctioned ₹50 Cr / contract ₹47.8 Cr / released ₹42 Cr / expenditure ₹39 Cr; govt 85% vs inspections 63%/82%; ₹8.2 Cr financial-documentation claim under_review; evidence 3 / inspections 2 / claims 3 / documents 7; timeline 14 events (sanction → evidence) from DB dates; Leaflet map uses location from `/projects/{id}/map`. Browser console clean (no critical errors); layout desktop/tablet/mobile via grid.
  - Frontend: 33/33 tests passed; oxlint 0; `tsc -b` + production build succeeded.
  - NOTE: not fully VERIFIED — exhaustive verification reserved for Phase 17.
- **PHASE 8 — TRUSTMESH: FUNCTIONALLY COMPLETE** (2026-09-22). Critical checks passed:
  - New deterministic decision engine `backend/app/services/trustmesh.py` (no AI framework, no hardcoded verdicts): evaluates DB records (claims, evidence, inspections, progress reports, documents, govt reported progress) into TRUSTMESH states SUPPORTED / INCOMPLETE / CONFLICTING / QUESTIONABLE / HUMAN_REVIEW_REQUIRED / INSUFFICIENT. Decision precedence: no records → INSUFFICIENT; gap (govt vs independent measured progress) ≥ 10 pts → CONFLICTING; pending evidence + gap ≥ 5 → QUESTIONABLE; under_review claims or pending evidence without claims → HUMAN_REVIEW_REQUIRED; pending evidence → INCOMPLETE; else SUPPORTED. Citizen-friendly wording; no fraud/corruption accusations.
  - `/projects/{project_id}/decision` route now returns full TRUSTMESH payload: state, reason, summary, supporting[], conflicting[], missing[], sources[] (claim/inspection/progress_report/evidence w/ reference + date), progress{gov,earlier,latest}, counts, verification note. Verified for NRD-204: `CONFLICTING`, "The records don't fully agree yet.", supporting 85.0%/82.0%, conflicting 63.0% (22-point gap) + ₹8.2 Cr financial documentation under review, sources e.g. SYN-INSP-000001-0. Inspections measured-progress parsed from `findings` text; progress-report `verified_progress` (0–100) used directly.
  - `TrustMeshPanel` upgraded to premium "WHY this decision?" panel: state pill (`data-testid="trustmesh-state"` retained), citizen summary, progress bars (govt/earlier/latest), supporting ✓ / conflicting ⚠ lists, missing/required line, source references, "View Evidence" button switching to the Evidence tab (and existing View Details link).
  - Decision data plumbed end-to-end: `ProjectDecision` type widened in `lib/api.ts`; ProjectPage passes full decision through `ProjectDetailExtras.decision`; old NEEDS_REVIEW legacy payload removed.
  - Frontend: 33/33 tests passed; oxlint 0; `tsc -b` + production build succeeded. Backend uvicorn restart verified live.
  - NOTE: not fully VERIFIED — exhaustive verification reserved for Phase 17.
- **PHASE 9 — EVIDENCE GRAPH: FUNCTIONALLY COMPLETE** (2026-09-22). Critical checks passed:
  - New `GET /projects/{project_id}/evidence-graph` (backend `app/services/evidence_graph.py`) returns `{nodes, edges}` derived entirely from DB records (projects, claims, inspections, evidence) + live TRUSTMESH decision. No hardcoded NRD-204 graph in the frontend. Node types: PROJECT, GOVERNMENT_CLAIM, INSPECTION, LATEST_INSPECTION, PHOTO_EVIDENCE, FINANCIAL_RECORD, TRUSTMESH_DECISION. Edge types: SUPPORTS, CONTRADICTS, UPDATES, DOCUMENTS, INSPECTED_BY — only emitted when the relationship exists.
  - Verified for NRD-204: 10 nodes / 16 edges. PROJECT → claims (DOCUMENTS) → inspections (INSPECTED_BY); earlier 63% → latest 82% (UPDATES); photos attach to project (honest, project-scoped rows); TRUSTMESH DECISION node links supporting project+latest-inspection (SUPPORTS) and conflicting earlier-inspection (63%) + financial documentation ₹8.2 Cr (CONTRADICTS); pending evidence → decision (UPDATES). Inspection measured % now parsed from `findings` text (`measured progress 0.63 in 0-1 scale (63.00%)`).
  - Frontend: new `EvidenceGraph.tsx` (React Flow `@xyflow/react` v12 — already installed) rendered on the project detail page: white/light theme, navy/blue/green accents, zoom/pan (Controls), node selection via click with details panel showing title, summary, source, date, status, record id and meta (traceability). Loading/error states show "Data unavailable" text instead of inventing data.
  - `setupTests.ts` added a ResizeObserver stub so React Flow renders safely in jsdom.
  - Frontend: 33/33 tests passed; oxlint 0; `tsc -b` + production build succeeded. Backend uvicorn restarted and endpoint verified live; TRUSTMESH decision unchanged (CONFLICTING).
  - NOTE: not fully VERIFIED — exhaustive verification reserved for Phase 17 (incl. browser zoom/pan/select checks).
- **PHASE 10 — FRAUDSCOPE: FUNCTIONALLY COMPLETE** (2026-09-22). Critical checks passed:
  - New deterministic anomaly module `backend/app/services/fraudscope.py` (no AI/LLM). `GET /projects/{id}/fraudscope` returns `{status, summary, findings[], verification}` from real DB records (budgets, payments, tenders, contracts, documents, claims, evidence, inspections, progress_reports, vendors). All findings status HUMAN_REVIEW_REQUIRED; module explicitly never declares fraud/corruption ("Financial documentation needs review.", "Evidence requires further investigation.", "Human review required."). Missing data is distinguishable: INSUFFICIENT → "Additional financial evidence required." vs NO_ANOMALIES_IDENTIFIED.
  - Rules implemented: A missing payment support (payments with no linked supporting document), B duplicate payment indicator (indicator only), C contract/payment mismatch, D unusual payment timing (payments before public procurement record), E milestone/payment mismatch (payments while evidence pending / inspections not passing), F expenditure/progress mismatch (financial 42% vs physical 85% ≥15pt gap), G missing documentation (required record types absent) + financial-documentation-under-review killer finding, H tender/contract/budget amount inconsistency, I supported related-party indicator (shared PAN/GST/phone/address across distinct vendors) — never invented.
  - Verified for NRD-204 (5 findings, all DB-derived): Missing payment support ₹42 Cr (4 payments, no supporting_document_id); Unusual payment timing ₹42 Cr (payments Jul–Sep 2026 before tender public record Sep 22); Milestone/payment mismatch ₹42 Cr (evidence pending, inspections not passing); Expenditure/progress mismatch (42% vs 85%); **Financial documentation needs review. ₹8.2 Cr** (SYN-CLM-000001-2, under_review). No "fraud confirmed"/"corruption confirmed" anywhere.
  - Frontend: new `FraudScopePanel.tsx` (Financial / Procurement Review card) in the ProjectDetail sidebar below TrustMeshPanel — status pill, summary, per-finding description/amount/reason/source/date/on-record references + "Human review required" status and a View Evidence button switching to the Evidence tab. `fetchFraudscope` + types in `lib/api.ts`; ProjectPage wires query → `ProjectDetailExtras.fraudscope`.
  - Evidence Graph integration (minimum relationship only): FRAUDSCOPE findings added as FINANCIAL_ANOMALY nodes with `FLAGGED` edges from the financial record that raised them. Findings never change the TRUSTMESH decision (rules untouched).
  - Frontend: 33/33 tests passed; oxlint 0; `tsc -b` + production build succeeded. Backend uvicorn restarted and endpoint verified live.
  - NOTE: not fully VERIFIED — exhaustive verification reserved for Phase 17.
- **PHASE 11: FUNCTIONALLY COMPLETE** — full verification pending Phase 17.
  - Backend: `POST /api/inspector-submissions` (multipart: project_reference, inspection_date, latitude, longitude, measured_progress, remarks, synthetic, optional photo + measurement/document uploads). Validates progress/GPS/date/file types; hashes files via SHA-256; stores to `backend/data/uploads`; inserts `documents` (proof/report, checksum, content_type, byte_size, visibility) + `evidence` (source_type=document, checksum-linked) + `inspections` (SYN-INSP reference, conducted_at, GPS, findings carrying `measured progress 0.82 in 0-1 scale (82.00%)`, outcome=passed) + `progress_reports` (report_period=monthly, physical/verified=measured). Then reruns `trustmesh.evaluate()` and returns the decision. Fixed constraint mismatches: document_type ∈ (report,finical,bidding,agreement,design,proof,notice,other), outcome ∈ (passed,passed_with_recommendations,failed,aborted), report_period ∈ (monthly,quarterly,half_yearly,yearly). Installed `python-multipart`.
  - Frontend: new `InspectorSubmitPage.tsx` at `/submit-inspection` (project dropdown from `/api/projects`, inspection date, GPS lat/lng, measured %, remarks textarea, photo + document file inputs, synthetic-data checkbox default on). Success card: "Inspection evidence submitted successfully.", reference, measured %, documents stored, SYNTHETIC label, TRUSTMESH state badge + summary, link to the project record. Inline error messages from API `detail`. `submitInspection` (FormData multipart POST) + `InspectorSubmissionResult` type added to `lib/api.ts`. Sidebar `TOOLS` now carries per-tool `href`; "Submit Inspection" links to `/submit-inspection`.
  - Verified live (NRD-204, single synthetic inspection, measured 82%): POST 201 persisted; `/projects/1/decision` → CONFLICTING, "Latest independent inspection: 82.0%", evidence_count 4, inspection_count 3 (SYN-INSP-000001-73 in sources snapshots); `/projects/1/evidence` returns the new record (82.00%); evidence-graph shows the new inspection as LATEST_INSPECTION. Build ✓, 33/33 vitest ✓, oxlint 0 ✓.
  - NOTE: not fully VERIFIED — exhaustive verification reserved for Phase 17.
- **PHASE 12: FUNCTIONALLY COMPLETE** — full verification pending Phase 17.
  - Backend: `POST /api/citizen-reports` converted to multipart (project_reference, description, category, latitude, longitude, synthetic, optional photo). Persists: real `citizen_reports` row (report_reference CIT-…, project_id, report_type photo|observation, category embedded as `Category: X. …` prefix, reported_at, GPS, `photo_document_ids` → photo `documents` row, is_location_verified=false) + content-addressed file storage (SHA-256; skips write + REUSES the documents row when `storage_key` already exists — fixes UniqueViolation on duplicate uploads). DB `status='submitted'` (CHECK enum: submitted|under_review|verified|disputed|rejected|merged) mapped in the API to **status=CITIZEN-SUBMITTED / review_status=PENDING_REVIEW / automatically_supported=false / verified=false** — never auto-supported or verified. 422s (bad file type, GPS, category, missing description) are no longer swallowed by the 500 catch-all.
  - Verified live (NRD-204, synthetic, photo): POST 201 `CIT-000001-55` + duplicate-upload re-submit `CIT-000001-56` (dedupe works); `/projects/1/evidence` returns `citizen_reports` with CITIZEN-SUBMITTED / PENDING_REVIEW / photo title; `/projects/1/decision` adds `citizen_evidence: {count, unverified: true, note: "Additional citizen evidence is available, but it has not yet been independently verified."}` and stays CONFLICTING (no SUPPORTED); evidence-graph adds PROJECT → CITIZEN_SUBMISSION → CITIZEN_MEDIA nodes (source "Citizen Submitted", status "Pending Review", never linked to the decision).
  - Frontend: `SubmitEvidencePage.tsx` rewritten as a real citizen form at `/submit-evidence` (project dropdown, category select with the 8 suggested categories, description, optional GPS, photo upload, synthetic checkbox default on) with amber banner "Citizen submissions are reviewed before they are used as verified evidence." Success card: "Your evidence has been submitted." + Status CITIZEN-SUBMITTED + Review PENDING_REVIEW + "This submission is not treated as verified evidence until reviewed." + link to project. Real inline errors from API `detail`. `submitCitizenReport` (FormData) + `CitizenReportResult` + `citizen_reports` in `ProjectEvidence` type in `lib/api.ts`. ProjectDetail Evidence tab shows a visually-separate amber "Citizen Evidence" block (CITIZEN-SUBMITTED / PENDING REVIEW) above verified EvidenceCards. EvidenceGraph adds column 6 for citizen nodes with amber accent. Build ✓, 33/33 vitest ✓, oxlint 0 errors ✓ (2 pre-existing style warnings on set-state-in-effect).
  - NOTE: not fully VERIFIED — exhaustive verification (incl. browser console check I) reserved for Phase 17.
- **PHASE 13: FUNCTIONALLY COMPLETE** — full verification pending Phase 17.
  - Killer end-to-end demo flow: new backend `GET /api/projects/{id}/evidence-summary` returns the judge-facing answer data for NRD-204 — financials (sanctioned ₹50 Cr / contract ₹47.8 Cr / released ₹42 Cr / recorded expenditure ₹39 Cr), progress (government 85.0%, earlier independent inspection 63.0, latest 82.0 via `trustmesh._measured_percent` over `inspections.findings`), TRUSTMESH state/reason/summary (CONFLICTING — "The records don't fully agree yet."), FRAUDSCOPE status + review_amount (₹8.2 Cr financial-documentation finding, not the ₹42 release figure), and counts (evidence 4, citizen_reports 6). Fixed: gov progress returned as ✓ fraction → percent (85.0), review-amount picker now prefers the `Financial documentation` finding.
  - Frontend: `EvidenceSummary` type + `fetchProjectEvidenceSummary` in `lib/api.ts`; queried in `ProjectPage` via `useResourceWithParam(['evidence-summary'], …)` and passed through `extras.evidenceSummary`; ProjectDetail Overview tab renders an "Evidence-backed Q&A" card ("Where did the money go and what evidence supports the progress?") with a factual DB-derived answer framing "The records don't fully agree yet." + "View Evidence" button that switches to the Evidence tab. Never presents synthetic data as confirmed fraud.
  - Verification: evidence-summary 200 with the killer values (85/63/82, ₹8.2 Cr) live; `npm run build` ✓, 33/33 vitest ✓, oxlint 0 errors ✓; ONE critical Playwright e2e (`tests/e2e/killer-flow.spec.ts`, homepage → search "Search projects" → NRD-204 → TRUSTMESH Conflicting + summary → Financial / Procurement Review → Evidence tab → Citizen Evidence heading; asserts 0 × "Fraud confirmed"/"Corruption confirmed" and 0 pageerrors) **PASSED** against live backend + Vite.
  - NOTE: pre-existing e2e suite (`dashboard.spec.ts`, `routes.spec.ts`) shows 12 failures triggered by post-Phase-8 data growth (evidence/report counts asserted from fixtures) — NOT introduced by Phase 13; exhaustive e2e repair is a Phase 17 / follow-up concern. Q&A answers quoted to read exactly like an investigator, never "Fraud confirmed".
- **PHASE 14: FUNCTIONALLY COMPLETE** — full verification pending Phase 17.
  - Compare: `GET /api/compare` rewritten — joins projects/categories/departments, filters by city/category/department/from/to date, aggregates from real budgets (sanctioned/contract/released/expenditure), evidence and inspection records. Neutral metrics only: total/completed/in_progress/delayed, average_delay_days (null-safe when no delayed records), sanctioned/contract/released/expenditure, evidence_completeness_pct + inspection_coverage_pct (share of projects with ≥1 on-record record), evidence/inspection counts. Returns `filter_options` (distinct cities/categories/departments from DB), `metric_notes` (source/calculation basis), breakdowns by category and department. No rankings, no political content.
  - Reports: no new backend endpoint needed — `GET /reports` page composes from existing DB-backed endpoints (`/projects`, `/projects/{id}/evidence-summary`, `/evidence`, `/decision`, `/timeline`). Premium report view for any project (list-driven, nothing hardcoded): PROJECT OVERVIEW, FINANCIAL TRAIL (₹50 Cr / ₹47.8 Cr / ₹42 Cr / ₹39 Cr for NRD-204), PROGRESS (85% gov / 63% earlier / 82% latest), INSPECTIONS, EVIDENCE (verified + CITIZEN-SUBMITTED × PENDING_REVIEW separated), TRUSTMESH DECISION (state/reason/summary — "The records don't fully agree yet."), FRAUDSCOPE REVIEW ("Financial documentation needs review." ₹8.2 Cr), TIMELINE, SOURCES (real links to the project record + evidence-graph; no fabricated documents). SYNTHETIC HACKATHON DATA badge; never "Fraud confirmed"/"Corruption confirmed".
  - Frontend: ComparePage replaced shell with live filter form (city/category/department/date range), metric cards, per-group tables, loading/empty/error+retry states (TanStack Query keyed on filters so edits re-fetch). ReportsPage replaced shell with report index + full report view using the standard `useResourceWithParam`/`useResource` patterns. `fetchCompare` + `CompareFilters`/`CompareResponse` types added to `lib/api.ts`.
  - Verification: /api/compare 200 (51 projects, sanctioned ₹4891.11 Cr = dashboard total, category filter → 7 Roads, dept filter works; buckets 100% coverage); `npm run build` ✓, 33/33 vitest ✓, oxlint 0 errors ✓; Playwright `tests/e2e/phase14.spec.ts` — compare metrics load + Department filter updates page AND report view shows ₹50 Cr, FINANCIAL TRAIL, TRUSTMESH DECISION, FRAUDSCOPE "Financial documentation needs review.", SOURCES, zero fraud-lang matches — **2 passed** against live backend+Vite.
  - NOTE: not fully VERIFIED — exhaustive verification (incl. browser console check I) reserved for Phase 17.
- **PHASES 15–17: NOT STARTED** — do not modify requirements.

## PHASE 0 — FOUNDATION

- Repository structure
- Frontend setup
- Backend setup
- PostgreSQL/PostGIS
- Docker
- Environment
- CORS/API configuration
- Logging
- Error handling
- Git
- README
- AGENTS.md
- Health endpoint
- Foundation frontend
- Full verification

## PHASE 1 — REFERENCE UI

- Header
- Sidebar
- Hero
- Metrics
- Map
- Project cards
- NRD-204
- Project detail
- TRUSTMESH
- Responsive UI
- Browser verification
- Console verification
- Tests
- Build

## PHASE 2 — ROUTING

### Routes

- `/`
- `/projects`
- `/projects/:id`
- `/contractors/:id`
- `/tenders/:id`
- `/compare`
- `/reports`
- `/evidence`
- `/submit-evidence`
- `/about`

### Verify

- Direct URL
- Refresh
- Loading
- Error
- Empty
- Success

## PHASE 3 — DATABASE

### Create

- users
- departments
- project_categories
- projects
- project_locations
- budgets
- tenders
- contracts
- vendors
- payments
- documents
- evidence
- inspections
- progress_reports
- claims
- anomalies
- decisions
- citizen_reports
- audit_logs
- project_relationships

### Use

- PostgreSQL
- PostGIS
- Foreign keys
- Indexes
- Constraints
- Alembic

Verify migration on empty database and recreate.

## PHASE 4 — SYNTHETIC DATA

### Create

- 50+ projects
- 10 departments
- 15 contractors
- 50 tenders/contracts
- 100 payments/evidence
- 50 inspections
- 50 progress reports
- 50 claims

### Include

- Roads
- Bridges
- Schools
- Hospitals
- Water plants
- Water supply
- Public buildings
- Other infrastructure

NRD-204 must contain exact killer values.

Every synthetic record: "SYNTHETIC HACKATHON DATA"

Verify database relationships and integrity.

## PHASE 5 — FASTAPI

### Implement

- `GET /api/health`
- `GET /api/dashboard/summary`
- `GET /api/projects`
- `GET /api/projects/{id}`
- `GET /api/projects/{id}/evidence`
- `GET /api/projects/{id}/financials`
- `GET /api/projects/{id}/timeline`
- `GET /api/projects/{id}/map`
- `GET /api/projects/{id}/decision`
- `GET /api/projects/{id}/contractor`
- `GET /api/contractors/{id}`
- `GET /api/tenders/{id}`
- `GET /api/compare`
- `POST /api/projects/{id}/verify`
- `POST /api/evidence`
- `POST /api/inspections`
- `POST /api/citizen-reports`

### Add

- Search
- Filter
- Sort
- Pagination
- Validation
- Errors
- Logging
- CORS
- Transactions
- Swagger
- Pytest

No hardcoded API data.

## PHASE 6 — REAL FRONTEND/BACKEND INTEGRATION

Remove frontend mock application data.

### Connect

- Dashboard
- Map
- Projects
- Search
- Project detail
- Financials
- Evidence
- Timeline
- Contractor
- Tender
- Compare
- Reports

Use TanStack Query.

### Implement

- Loading
- Skeleton
- Error
- Retry
- Empty
- Success

Search NRD-204 and verify real database values.

Stop backend and test frontend error state.
Restart backend and test recovery.

## PHASE 7 — PROJECT INTELLIGENCE + MONEY TRAIL

### Implement

SANCTIONED
→ TENDER
→ CONTRACTOR
→ CONTRACT
→ RELEASED
→ RECORDED EXPENDITURE
→ PHYSICAL PROGRESS

### Add

- Financial metrics
- Charts
- Government progress
- Earlier inspection progress
- Latest inspection progress
- Map
- Timeline
- Contractor
- Tender
- Evidence

Everything must come from backend.

Verify changing database values changes UI.

## PHASE 8 — TRUSTMESH

Create: `ai/trustmesh/`

### Implement

- SUPPORTED
- INCOMPLETE
- CONFLICTING
- QUESTIONABLE
- HUMAN_REVIEW_REQUIRED
- INSUFFICIENT

Every decision includes:

- Claim
- Decision
- Reason
- Supporting evidence
- Conflicting evidence
- Missing information
- Sources
- Dates
- Confidence context

NRD-204: CONFLICTING

Display: "The records don't fully agree yet."

Add WHY panel.

Never say: "Fraud confirmed."

Test all six states.

## PHASE 9 — EVIDENCE GRAPH

Use React Flow.

### Graph

PROJECT
→ GOVERNMENT CLAIM
→ INSPECTION
→ LATEST INSPECTION
→ PHOTOS
→ FINANCIAL RECORD
→ TRUSTMESH DECISION

### Implement

- Node details
- Edge details
- supports
- contradicts
- updates
- documents
- paid_by
- inspected_by

Graph must use actual database relationships.

Verify graph changes when database relationships change.

## PHASE 10 — FRAUDSCOPE

Create: `ai/fraudscope/`

### Detect

- Missing payment support
- Duplicate invoice indicators
- Contract/payment mismatch
- Unusual timing
- Milestone/payment mismatch
- Expenditure/progress mismatch
- Missing documents
- Document inconsistencies
- Supported related-party indicators

Never automatically declare fraud.

NRD-204: ₹8.2 Cr → "Financial documentation needs review."

### Test

- Normal
- Missing documentation
- Duplicate indicator
- Mismatch

## PHASE 11 — INSPECTOR WORKFLOW

### Form

- Project
- Inspection date
- GPS
- Measured progress
- Remarks
- Photos
- Measurement document

### Store

- Uploader
- Timestamp
- GPS
- Hash
- Evidence type
- Date

### Submission

- Persist
- Rerun TRUSTMESH
- Update Evidence Graph
- Update timeline
- Update evidence state

NRD-204 latest inspection: 82%

Verify persistence after restart.

STATUS: FUNCTIONALLY COMPLETE (full verification pending Phase 17); new inspector-submission row survives a backend restart and re-reads via `/projects/1/decision`, `/projects/1/evidence-graph` (LATEST_INSPECTION = new SYN-INSP-000001-73).

## PHASE 12 — CITIZEN EVIDENCE

### Form

- Project
- Photo
- Description
- Location
- Category

### Categories

- Road
- Water
- School
- Hospital
- Bridge
- Public Building
- Other

### Status

CITIZEN-SUBMITTED

### Review

PENDING_REVIEW

Never automatically trust citizen evidence.

### Verify

- Database persistence
- Timestamp
- GPS
- Status
- No automatic SUPPORTED state

## PHASE 13 — KILLER DEMO

### Complete journey

- Homepage
- Search NRD-204
- Project
- Financials
- Money Trail
- Contractor
- Tender
- Progress comparison
- TRUSTMESH
- WHY
- Evidence Graph
- ₹8.2 Cr financial review
- Request evidence
- Inspector submission
- TRUSTMESH recalculation
- Citizen Q&A
- Source-backed answer
- View Evidence

No fake frontend state.

No manual database edits during demo.

Create Playwright end-to-end test.

If failure:
STOP → FIX → Restart from step 1 → RETEST

## PHASE 14 — COMPARE + REPORTS

### Compare

- City
- Category
- Department
- Time

### Metrics

- Planned
- Completed
- Delayed
- Average delay
- Sanctioned
- Contract
- Expenditure
- Evidence completeness
- Inspection coverage

Every metric must include:

- Source
- Date
- Calculation

No political rankings.

### Reports

- Project evidence
- Financial trail
- Inspection
- TRUSTMESH decision
- Evidence history

## PHASE 15 — AUTHENTICATION + AUDIT

### Roles

- Citizen
- Inspector
- Reviewer
- Admin

### Implement

- Authentication
- Authorization
- Role-based permissions
- Audit logs

### Audit log

- Who
- What
- When
- Before
- After
- Source

### Security

- Password hashing
- JWT/session
- Role authorization
- Validation
- File validation
- CORS
- No secrets

### Verify

- Roles
- Unauthorized access
- Authorized access
- Evidence audit
- Decision audit

### Phase 15 — Build Log

- Backend: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (simple HMAC-signed
  stateless tokens, in-memory revocation on logout, 12h expiry; PBKDF2 password hashing with legacy
  sha256("synth:...") seed support).
- RBAC via FastAPI dependencies: `get_current_user` (any authenticated), `require_roles(...)`;
  per-role ROLE_PERMISSIONS map; admin always implicitly allowed.
- Protected server-side: `POST /api/citizen-reports` (any signed-in user), `POST /api/inspector-submissions`
  + `POST /api/inspections` (inspector/reviewer), `POST /api/citizen-reports/{id}/review` (reviewer/admin),
  `GET /api/audit-logs` (reviewer/admin). Public project read endpoints remain public.
- Audit logging into existing `audit_logs` table (`record_audit`), constrained to allowed
  `action_type` values (create/update/delete/verify/approve/reject/escalate/reverse/withdraw/
  decision/citizen_submit). Logs login success/failure, logout, citizen submission, reviews, inspections.
- Citizen report review flow: submit → CITIZEN-SUBMITTED/PENDING_REVIEW → verify → CITIZEN-VERIFIED/ACCEPTED
  (readback preserves origin `citizen_submitted`; also under_review/rejected states).
- Frontend: AuthProvider + login page (`/login`), bearer-token attachment in api.ts, `/audit-logs`
  admin page, role-aware sidebar (Audit Logs link only for admin/reviewer; sign-in/sign-out block).
  401/403 from backend are surfaced honestly; no fake success.
- Test credentials (synthetic): admin `synthetic.admin.001@janverify.test / admin:1`,
  `synthetic.admin.002@janverify.test / admin:2` (reviewer capability), inspector
  `synthetic.inspector.001@janverify.test / inspector:1`, citizen `synthetic.citizen.001@janverify.test / citizen:1`.

### Phase 15 — Verification

- Backend A–J script: logins OK (3 roles), /me OK, citizen submit 201
  (CITIZEN-SUBMITTED/PENDING_REVIEW), citizen→inspector 403, inspector submit 201,
  citizen audit-logs 403, admin audit-logs 200 (entries present), reviewer verify 200
  (readback CITIZEN-VERIFIED/ACCEPTED with origin `citizen_submitted`), logout → old token 401,
  unauthenticated submit 401. PASSED.
- Frontend: `npm run build` ✓, `npm run lint` 0 errors ✓, `npx vitest run` 34/34 ✓.
- Playwright `tests/e2e/phase15.spec.ts` 3/3 PASSED (anonymous blocked from audit logs,
  admin sign-in → audit logs → sign out, citizen never sees Audit Logs).
- Regression: `killer-flow.spec.ts` + `phase14.spec.ts` still 3/3 PASSED.
- Note: Phase 17 concern — pre-existing `dashboard.spec.ts`/`routes.spec.ts` failures from
  post-Phase-8 data growth remain out of scope for this phase.

### Phase 15 — Status

- FUNCTIONALLY COMPLETE — READY FOR PHASE 16.

## PHASE 16 — FINAL UI POLISH

DO NOT redesign.

Latest reference screenshot remains SOURCE OF TRUTH.

### Polish

- Logo
- Navigation
- Sidebar
- Search
- Hero
- Metrics
- Map
- Cards
- Project details
- Money trail
- Charts
- TRUSTMESH
- Evidence
- Evidence Graph
- Contractor
- Tender
- Compare
- Reports
- Actions
- Tables
- Forms
- Buttons
- Badges
- Loading
- Errors

### Run

- TypeScript
- ESLint
- Vitest
- Pytest
- Playwright
- Production build

### Phase 16 — Build Log

- DOM sweep across all main routes (/, /projects, /compare, /reports, /evidence, /submit-evidence,
  /submit-inspection, /login, /about, /projects/nrd-204, /projects/nrd-204/evidence-graph, /audit-logs)
  at 1440px, 768px and 390px viewports: zero horizontal overflow, zero clipped buttons on every
  route/viewport; all form controls already labelled; no blank screens; loading/error/empty states
  present (AsyncState skeleton/error/retry pattern already in place).
- Killer-demo DOM assertion pass (NRD-204): real values render — ₹50 Cr sanctioned, ₹47.8 Cr
  contract, ₹42 Cr released, ₹39 Cr recorded expenditure, 85% gov / 82% latest inspection,
  TRUSTMESH "The records don't fully agree yet.", FRAUDSCOPE ₹8.2 Cr + "Financial documentation
  needs review.", Evidence Graph, timeline, contractor, tender, SYNTHETIC HACKATHON DATA labels.
- FIXED (quality): "View Evidence Graph" links (homepage Quick Actions + Reports page) pointed to
  `/projects/:id/evidence-graph`, a route that did not exist → 404. Added the route to App.tsx so
  the deep link renders the project page containing the Evidence Graph.
- FRAUDSCOPE / TRUSTMESH logic and wording unchanged (real backend values, no sensational language,
  no logic changes).
- Console-error sweep: no critical errors; the only 401s are the expected, honestly-surfaced guard
  on /audit-logs for anonymous visitors (UI shows a readable message, not a blank screen).
- No secrets in frontend (jwt_secret lives only in backend config/.env).

### Phase 16 — Verification

- `npm run build` ✓ (production build succeeds).
- `npm run lint` 0 errors (5 pre-existing warnings).
- `npx vitest run` 34/34 passed.
- Playwright: phase16.spec.ts 3/3 (graph deep link, killer-demo values, mobile overflow guard),
  plus phase 13/14/15 regressions 9/9 total PASSED (killer-flow + phase14 + phase15 + phase16).
- Phase 15 role-based navigation confirmed still functional (login/sign-out + audit-logs visibility).
- Note: full exhaustive verification (fresh env, all tests, security, clean-start repeat) and the
  pre-existing Phase 8 data-growth failures in `dashboard.spec.ts`/`routes.spec.ts` remain Phase 17
  scope. Phase 3 migration issue remains PARKED until Phase 17.

### Phase 16 — Status

- FUNCTIONALLY COMPLETE — READY FOR PHASE 17.

## PHASE 16.5 — REAL NAGPUR PUBLIC DATA + PROJECT PHOTOS

Adds a small, real, source-traceable Nagpur public-data layer to the app (separate from the fully
labelled synthetic dataset) so judges can contrast synthetic demo data against real records with
verifiable public sources. No invented values; unknown figures are marked "Not publicly available".
NRD-204 killer-demo data (₹50/47.8/42/39 Cr, 85/63/82%, ₹8.2 Cr, SYNTHETIC HACKATHON DATA) is
untouched and passes the Phase 16 assertions unchanged.

### Build Log (2026-09-23)

- Schema (additive, no migration changes; PostgreSQL):
  - `projects` + `data_source_type TEXT NOT NULL DEFAULT 'SYNTHETIC'`, `source_name`, `source_url`,
    `source_title`, `source_retrieved_on DATE`.
  - New table `project_photos` (project_id FK, image_url, image_file_page, caption,
    is_representative, source_name, attribution, license_info, image_date, source_type).
- Seed `backend/app/scripts/phase16p5_seed.py` (idempotent, re-runnable) inserts 5 REAL PUBLIC DATA
  projects for Nagpur, each with a source name/URL/title/retrieval date, plus 3 real photographs:
  1. NGPM-001 Nagpur Metro Phase I (completed, operational Dec 2022; sanctioned ₹8,650 Cr) — photo:
     "Nagpur metro rail.jpg" (Wikimedia Commons).
  2. NGPM-002 Nagpur Metro Phase II (in progress; sanctioned ₹6,708 Cr) — photo: "Nagpur metro
     viaduct1.jpeg" (Wikimedia Commons).
  3. NMC-PP-001 Pohra River Pollution Abatement (AMRUT 2.0; sanctioned ₹810.28 Cr tender outlay) —
     no photo (none found on Commons; omitted rather than faked).
  4. NMC-FTL-001 Futala Lake Multimedia Fountain (sanctioned ₹50 Cr) — photo: "Futala Lake, Nagpur.jpg".
  5. NMRDA-ORR-001 Outer Ring Road & Transport Terminals (sanctioned "Not publicly available") — no
     photo.
  - Real records deliberately create NO budgets rows (contract/release/expenditure would be
    fabricated); sanctioned values live only on `projects.total_budget_sanctioned`. Financial panel
    shows the honest note "Contract, release and expenditure figures are not publicly available…".
  - Real photos point to canonical `upload.wikimedia.org` thumbnail URLs resolved via the Commons
    API and are labelled "Representative image — not project evidence." where applicable.
- API (`backend/app/api/routes/projects.py`): `_proj_row` exposes `data_source_type`, `source_name`,
  `source_url`, `source_title`, `source_retrieved_on`; detail `_get_project` adds `photos` and the
  real-data financial fallback; list `/api/projects` supports `?data_source=REAL_PUBLIC|SYNTHETIC`,
  batch-loads `photos`, and returns them per item.
- Frontend:
  - `api.ts`: ProjectListRow/DetailRow carry the new fields; `toProject`/`toProjectDetail` map them
    (`Project.dataSource`, `sourceName/Url/Title`, `photos`); `fetchProjects` guards against React
    Query passing its context object as the first arg (only strings treated as the filter).
  - `mockDashboard.ts`: `Project` gains optional `dataSource`, source metadata and `ProjectPhoto`.
  - `ProjectCard.tsx`: optional photo strip for real projects; real cards render a
    "REAL PUBLIC DATA — NAGPUR" footer with a source link; synthetic cards keep the exact
    SYNTHETIC HACKATHON DATA label (killer-demo DOM unchanged).
  - `ProjectsPage.tsx`: Data Source segmented filter (All / Real Public Data / Synthetic Hackathon
    Data) + an explanation banner when the real filter is active.
  - `ProjectPage.tsx`: real projects render a "REAL PUBLIC DATA — NAGPUR" banner with source line and
    a photo strip (caption, representative note, attribution, source).

### Phase 16.5 — Verification

- DB: 5 REAL_PUBLIC projects + 3 photos; NRD-204 remains SYNTHETIC ₹50 Cr and zero photos.
- API: `GET /api/projects?data_source=REAL_PUBLIC` → 5 items with photos; detail returns the honest
  financial note + photos; NRD-204 detail unchanged (SYNTHETIC).
- Playwright `tests/e2e/phase16.5.spec.ts` 3/3 PASSED (real project page renders tag/source/photo;
  list filter shows real vs synthetic split; NRD-204 unchanged).
- Full Playwright run: 17 PASSED (killer-flow + phase14 + phase15 + phase16 + phase16.5); the 12
  failures are exclusively the pre-existing Phase 8 hardcoded data-growth assertions in
  `dashboard.spec.ts` (e.g. `getByText('127')`) and `routes.spec.ts` (entity-name fixtures) —
  already documented as Phase 17 scope, not introduced here.
- `npx tsc --noEmit` ✓ · `npm run lint` 0 errors (5 pre-existing warnings) · `npx vitest run` 34/34 ·
  `npm run build` ✓.

### Phase 16.5 — Status

- FUNCTIONALLY COMPLETE — READY FOR PHASE 17.

### Phase 16.5 Update — REAL PROJECT IMAGES + COMPLETE SOURCE-BACKED RECORDS (2026-09-23)

Re-run of `phase16p5_seed.py` (now v2, idempotent) to close the missing-image/incomplete-record gaps.
Additive only; all 8 images verified live via the Wikimedia Commons API (file exists + license +
author + date). NRD-204 and synthetic data untouched.

- `project_photos` + `image_type` (PROJECT_IMAGE | REPRESENTATIVE_IMAGE | INSPECTION_IMAGE |
  DOCUMENT_IMAGE), `source_organization`. New table `project_sources` (multi-source per project:
  organization, document_type, title, url, published_date, retrieved_date). API detail now returns
  `photos` (with image_type/source_organization) and `sources`.
- Every existing real project photo set expanded; no real card is image-less:
  - NGPM-001 Metro Phase I → "Nagpur metro rail.jpg" (PROJECT_IMAGE).
  - NGPM-002 Phase II → "Automotive to Kanhan Metro-Line work.jpg" (PROJECT_IMAGE, work specific) +
    "Nagpur metro viaduct1.jpeg" (PROJECT_IMAGE). Description names the four 43.8 km corridors.
  - NMC-PP-001 Pohra → "Pohra river near Pipla.jpg" (REPRESENTATIVE). Description + sanctioned
    updated to the verified ₹957.01 Cr (incl. GST), 25/25/50 funding, 2-year timeline, 8.5 lakh
    beneficiaries, five packages (₹92.78/146.81/220.00/99.61/130.12 Cr), 45 MLD STP + pumping
    station + ~500 km sewer network components. Sources: NMC + Nagpur Today (secondary news).
  - NMC-FTL-001 Futala → "Fountain at Futala Lake at dusk, Nagpur.jpg" + "Futala Lake, Nagpur.jpg"
    (both REPRESENTATIVE; older-fountain image explicitly NOT presented as completion evidence).
  - NMRDA-ORR-001 retitled to the NHAI record "Four-laned Stand Alone Ring Road / Bypasses for
    Nagpur City"; description splits Package I Km 0.500–34.000 (33.500 km) / Package II
    Km 34.000–62.035 (28.035 km) / combined 61.535 km; "Integrated Transport Terminals" dropped;
    photo "Ring Road at Uday Nagar Nagpur.jpg" (REPRESENTATIVE); sanctioned stays Not publicly
    available.
  - NEW NMC-GH-001 Nagpur Government Medical College and Hospital (Mayo Hospital) — operational
    public-health facility record (Public Health Department, Govt of Maharashtra), photo
    "Nagpur Government Medical College and Hospital.jpg" (PROJECT_IMAGE, CC0). Cost not claimed.
- Frontend: cards show "Representative image — not project evidence." overlay; "Progress: Not
  publicly available" and "Budget: Not publicly available" replace fabricated 0 %/'—'; real cards
  badge "Source verified" only when source metadata exists; project detail shows a full Sources
  section (SOURCE 01/02… with organization, type, published/retrieved dates, "Open source" link),
  progress-card honesty notice, per-number "Not publicly available" money trail, and image
  type/author/license/date in photo captions. ProjectsPage adds a "Has project image" checkbox.
- FRAUDSCOPE now returns INSUFFICIENT + "Documentation incomplete. Sources do not provide enough
  information to determine this." for REAL_PUBLIC records (no automatic anomaly declarations).

### Phase 16.5 Update — Verification (2026-09-23)

- Seed re-run OK: 6 REAL_PUBLIC projects, 10 photos (all with author/license/date), project_sources
  populated (e.g. Pohra 2 sources).
- API: list returns 6 real items w/ photos; detail returns sources + image_type; NGPM-001
  fraudscope → INSUFFICIENT (neutral); Pohra detail sanctioned ₹957.01 + 2 sources + REPRESENTATIVE
  photo; Ring Road renamed + "Not publicly available" rendered for progress/budget.
- `npx tsc --noEmit` ✓ · vitest (ProjectPage + ProjectsPage + api) 8/8 ✓ · `phase16.5.spec.ts` 3/3 ✓
  (NRD-204 unchanged) · `npm run build` ✓.

## PHASE 17 — FINAL CLEAN START

1. Stop all services.
2. Create fresh environment.
3. Create fresh database.
4. Run migrations.
5. Seed data.
6. Start database.
7. Start backend.
8. Start frontend.
9. Verify health endpoint.
10. Verify all routes.
11. Run killer demo.
12. Stop backend.
13. Verify frontend error state.
14. Restart backend.
15. Verify recovery.
16. Run all tests.
17. Run production build.
18. Run security checks.
19. Destroy database.
20. Recreate database.
21. Run migrations again.
22. Seed again.
23. Repeat critical verification.

Only after all checks pass:

> JANVERIFY FINAL BUILD VERIFIED — READY FOR JUDGING