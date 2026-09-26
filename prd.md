# JANVERIFY — PRODUCT REQUIREMENTS

## Project

**JANVERIFY**

## Tagline

> "Your Tax. Your Evidence. Your Right to Know."

## Positioning

An independent, non-partisan evidence layer between citizens and government claims.

## Scope

- Government schools
- Water plants
- Water supply
- Roads
- Bridges
- City hospitals
- Public buildings
- Other public infrastructure

Each project should support wherever data exists:

### Financial

- Sanctioned amount
- Tender amount
- Contract amount
- Amount released
- Recorded expenditure
- Money trail
- Financial documentation

### Procurement

- Tender ID/reference
- Department
- Tender date
- Award date
- Contractor
- Contract amount
- Contract duration
- Work order
- Contract documents
- Tender documents

### Progress

- Government-reported progress
- Earlier independent inspection progress
- Latest independent inspection progress
- Physical/development progress
- Completion
- Delay

### Evidence

- Government claims
- Inspections
- Photos
- Documents
- Financial records
- Citizen evidence
- Source
- Date
- Methodology
- Evidence relationships

### Intelligence

- TRUSTMESH
- FRAUDSCOPE
- Evidence conflicts
- Missing information
- Uncertainty
- Financial/procurement anomalies
- Human review
- Evidence Graph

## Integrity Rules

Never automatically declare fraud or corruption.

Use:

- "Financial/procurement anomaly requiring review"
- "Documentation incomplete"
- "Sources conflict"
- "Human review required"
- "The records don't fully agree yet."

All synthetic data must be clearly labelled:

> "SYNTHETIC HACKATHON DATA"

## TRUSTMESH States

- SUPPORTED
- INCOMPLETE
- CONFLICTING
- QUESTIONABLE
- HUMAN_REVIEW_REQUIRED
- INSUFFICIENT

FRAUDSCOPE detects anomalies but never automatically declares fraud.

---

## NRD-204 PRIMARY DEMO PROJECT

### ID

NRD-204

### Name

Ward 24 Road Development

### Exact values

- Sanctioned: ₹50 Cr
- Contract: ₹47.8 Cr
- Released: ₹42 Cr
- Recorded expenditure: ₹39 Cr
- Government progress: 85%
- Earlier independent inspection: 63%
- Latest independent inspection: 82%
- Financial documentation requiring review: ₹8.2 Cr

> These values MUST remain exactly the same throughout the project.

---

## KILLER FLOW

Homepage
→ Search NRD-204
→ Project
→ Financials
→ Money Trail
→ Contractor
→ Tender
→ Government 85% / Earlier inspection 63% / Latest inspection 82%
→ TRUSTMESH conflict
→ WHY
→ Evidence Graph
→ ₹8.2 Cr financial documentation review
→ Request additional evidence
→ Inspector submits latest inspection
→ TRUSTMESH recalculates
→ Citizen asks:

> "Where did the money go and what evidence supports the progress?"

Return:

- Source-backed answer
- Evidence
- Financial trail
- Progress comparison
- TRUSTMESH decision
- View Evidence

---

## INSPECTOR WORKFLOW

### Fields

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

### After submission

- Persist
- Rerun TRUSTMESH
- Update Evidence Graph
- Update timeline
- Update project evidence state

---

## CITIZEN WORKFLOW

### Fields

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

Citizen evidence must never automatically become trusted evidence.

---

## EVIDENCE GRAPH

PROJECT
→ GOVERNMENT CLAIM
→ INSPECTION
→ LATEST INSPECTION
→ PHOTOS
→ FINANCIAL RECORD
→ TRUSTMESH DECISION

### Relationships

- supports
- contradicts
- updates
- documents
- paid_by
- inspected_by