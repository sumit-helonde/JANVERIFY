# JANVERIFY — AGENTS.md

## Project

JANVERIFY — "Your Tax. Your Evidence. Your Right to Know."
An independent, non-partisan public accountability platform that helps citizens
inspect public projects using evidence, financial records, procurement records,
inspections, progress reports and source traceability.

- Core engine: TRUSTMESH
- Financial anomaly module: FRAUDSCOPE
- Primary demo project: NRD-204 (Ward 24 Road Development)

## Working Rules

- Never skip a phase.
- Never move to the next phase before verification.
- Build → Run → Test → Browser Verify → Backend Verify.
- If anything fails: STOP → FIX → RETEST → VERIFY.
- Never fake functionality.
- Never hardcode application data when real backend data is required.
- Synthetic data must be labeled SYNTHETIC HACKATHON DATA.
- Never present synthetic data as real allegations.
- Never automatically declare fraud or corruption.
- TRUSTMESH states:
  - SUPPORTED
  - INCOMPLETE
  - CONFLICTING
  - QUESTIONABLE
  - HUMAN_REVIEW_REQUIRED
  - INSUFFICIENT
- Important decisions require source traceability.
- The latest reference UI is the visual source of truth.
- Future phases must preserve the approved UI.
- Never claim a phase is complete if verification fails.

## Phase Plan

The complete Phase 0–17 roadmap lives in `tasks.md`. The phase plan is the
source of truth — do not remove, simplify, rename, reinterpret, or change any
requirement without explicit instruction.