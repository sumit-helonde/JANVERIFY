# JANVERIFY — PROJECT MEMORY

## Project

JANVERIFY

## Tagline

Your Tax. Your Evidence. Your Right to Know.

## Core engine

TRUSTMESH

## Financial anomaly module

FRAUDSCOPE

## Primary demo

NRD-204 — Ward 24 Road Development

## Exact values

- ₹50 Cr sanctioned
- ₹47.8 Cr contract
- ₹42 Cr released
- ₹39 Cr recorded expenditure
- 85% government progress
- 63% earlier inspection
- 82% latest inspection
- ₹8.2 Cr financial documentation requiring review

## Evidence Graph

Project → Government Claim → Inspection → Latest Inspection → Photos → Financial Record → TRUSTMESH Decision

## Citizen

CITIZEN-SUBMITTED → PENDING_REVIEW

## Inspector

GPS + timestamp + uploader + hash + evidence type + date

## UI

Latest JANVERIFY reference screenshot is the source of truth.

## Design

Premium civic-tech, light background, deep navy, blue/green accents, subtle borders and shadows.

## Development

Phase-by-phase.
Never skip verification.

## Real public data layer (Phase 16.5)

Separate REAL_PUBLIC dataset for Nagpur added alongside the labelled synthetic data. Rules:
- Never invent real-world values — unknown figures show "Not publicly available".
- Every real record carries source name/URL/title/retrieval date.
- Photos from Wikimedia Commons; non-specific photos are labelled "Representative image — not
  project evidence."; no fabricated contract/release/expenditure (no budgets rows for real projects).
- NRD-204 remains the unchanged SYNTHETIC killer-demo (₹50/47.8/42/39 Cr, 85/63/82%, ₹8.2 Cr).
- Real projects: NGPM-001, NGPM-002 (Nagpur Metro P1/P2), NMC-PP-001 (Pohra River), NMC-FTL-001
  (Futala fountain), NMRDA-ORR-001 (NHAI Ring Road — dropped "Integrated Transport Terminals",
  now "Four-laned Stand Alone Ring Road / Bypasses for Nagpur City"), NMC-GH-001 (Government Medical
  College & Hospital).
- API serves real data (never hardcode real projects in React); seed: phase16p5_seed.py.
- Phase 16.5 update: every real card has a verified Commons image (author/license/date stored);
  representative images carry the explicit label; `project_photos.image_type` +
  `source_organization`, `project_sources` table; progress/budget unknown → "Not publicly
  available" (never 0% / '—'); FRAUDSCOPE returns INSUFFICIENT neutral for REAL_PUBLIC records;
  Pohra record uses verified ₹957.01 Cr (incl. GST), 25/25/50 funding, packages + components.