"""TRUSTMESH — deterministic, explainable evidence-consistency decision engine.

No external AI framework. Rules evaluate the evidence actually in the database
and produce one of the TRUSTMESH states with a citizen-friendly explanation.

States:
  SUPPORTED               — records agree; nothing pending review.
  INCOMPLETE              — some records exist but key pieces (verified evidence) are missing.
  QUESTIONABLE            — records partially differ; review recommended.
  CONFLICTING             — reported values and independent records do not align.
  HUMAN_REVIEW_REQUIRED   — pending claims/documents need a human reviewer.
  INSUFFICIENT            — not enough evidence on record to reach a conclusion.
"""

from __future__ import annotations

import re

from sqlalchemy import select

from app.api.routes._db import T

ALLOWED_STATES = frozenset(
    {
        "SUPPORTED",
        "INCOMPLETE",
        "CONFLICTING",
        "QUESTIONABLE",
        "HUMAN_REVIEW_REQUIRED",
        "INSUFFICIENT",
    }
)

# Gap (percentage points) between reported and independently measured progress.
CONFLICT_GAP = 10.0
QUESTIONABLE_GAP = 5.0


def _measured_percent(text: str | None) -> float | None:
    """Extract measured progress (%) from an inspection findings string."""
    if not text:
        return None
    m = re.search(r"measured progress\s+([0-9]+(?:\.[0-9]+)?).*?\(([0-9.]+)%\)", text, re.I)
    if m:
        try:
            return float(m.group(2))
        except ValueError:
            return None
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def evaluate(project_id: int, db) -> dict:
    """Evaluate all on-record evidence for a project into a TRUSTMESH decision."""
    project = db.execute(
        select(T["projects"]).where(T["projects"].c.id == project_id)
    ).mappings().first()
    if project is None:
        raise ValueError(f"Project {project_id} not found")

    claims = db.execute(
        select(T["claims"]).where(T["claims"].c.project_id == project_id)
    ).mappings().all()
    evidence_rows = db.execute(
        select(T["evidence"]).where(T["evidence"].c.project_id == project_id)
    ).mappings().all()
    inspections = db.execute(
        select(T["inspections"]).where(T["inspections"].c.project_id == project_id)
    ).mappings().all()
    progress_reports = db.execute(
        select(T["progress_reports"]).where(
            T["progress_reports"].c.project_id == project_id
        )
    ).mappings().all()
    documents = db.execute(
        select(T["documents"]).where(T["documents"].c.project_id == project_id)
    ).mappings().all()

    gov = (
        float(project["department_reported_progress"])
        if project["department_reported_progress"] is not None
        else None
    )
    if gov is not None:
        gov_pct = round(gov * 100, 1)

    # Independent measurements: inspections (from findings) + progress report verified %.
    measured: list[float] = []
    for ins in inspections:
        pct = _measured_percent(ins["findings"])
        if pct is not None:
            measured.append(pct)
    for pr in progress_reports:
        if pr["verified_progress"] is not None:
            measured.append(float(pr["verified_progress"]))
    measured = sorted(measured, reverse=True)
    earlier = min(measured) if measured else None
    latest = max(measured) if measured else None

    under_review_claims = [c for c in claims if c["status"] == "under_review"]
    financial_review = [
        c for c in under_review_claims if c["claim_type"] == "financial_documentation"
    ]
    review_amounts = [float(c["claimed_amount"]) for c in financial_review if c["claimed_amount"] is not None]
    review_amount = round(sum(review_amounts), 2) if review_amounts else None

    pending_evidence = [e for e in evidence_rows if e["status"] != "verified"]

    has_records = bool(claims or evidence_rows or inspections or progress_reports)

    def _date(dt) -> str | None:
        if not dt:
            return None
        return dt.date().isoformat() if hasattr(dt, "date") else str(dt)

    sources: list[dict] = []
    for c in claims[:2]:
        sources.append({"type": "claim", "reference": c["claim_reference"], "date": _date(c["claimed_date"])})
    for ins in inspections[:2]:
        sources.append({"type": "inspection", "reference": ins["inspection_reference"], "date": _date(ins["conducted_at"])})
    for pr in progress_reports[:2]:
        sources.append({"type": "progress_report", "reference": pr["report_reference"], "date": _date(pr["report_date"])})
    for e in evidence_rows[:2]:
        ref = e["chain_trace"] or f"evidence#{e['id']}"
        sources.append({"type": "evidence", "reference": ref, "date": _date(e["captured_at"])})

    gap = None
    if gov is not None and measured:
        gap = round(max(abs(gov_pct - earlier or 0), abs(gov_pct - latest or 0)), 1)

    supporting: list[str] = []
    conflicting: list[str] = []
    missing: list[str] = []

    if gov is not None:
        supporting.append(f"Government progress report: {gov_pct}%")
    if latest is not None:
        supporting.append(f"Latest independent inspection: {round(latest, 1)}%")
    if earlier is not None:
        conflicting.append(
            f"Earlier independent inspection: {round(earlier, 1)}% (differs from reported {gov_pct}% by {round(gov_pct - earlier, 1)} points)"
        )
    if review_amount:
        conflicting.append(
            f"Financial documentation requiring review: \u20b9{review_amount} Cr"
        )
    if pending_evidence:
        missing.append(
            f"{len(pending_evidence)} citizen evidence record(s) awaiting verification"
        )
    if not documents:
        missing.append("No documents on record")
    if not inspections:
        missing.append("No independent inspection records")

    state = "INSUFFICIENT"
    reason = "Not enough evidence on record to reach a conclusion."
    summary = "Not enough evidence on record yet. Additional evidence required."
    missing = missing or ["Additional evidence required"]

    if has_records:
        if gap is not None and gap >= CONFLICT_GAP:
            state = "CONFLICTING"
            reason = (
                "Government-reported progress and independent inspection records do "
                "not fully align."
            )
            summary = "The records don't fully agree yet."
        elif pending_evidence and gap is not None and gap >= QUESTIONABLE_GAP:
            state = "QUESTIONABLE"
            reason = "Some records differ from the reported progress; review is recommended."
            summary = "Some evidence supports the claim, while other records differ."
        elif under_review_claims or (pending_evidence and not claims):
            state = "HUMAN_REVIEW_REQUIRED"
            reason = "Claims and supporting documents are pending review."
            summary = "Human review required."
        elif pending_evidence:
            state = "INCOMPLETE"
            reason = "Key evidence records are present but not yet verified."
            summary = "Some information is still missing."
        else:
            state = "SUPPORTED"
            reason = "On-record progress, inspections and financials are consistent."
            summary = "The records support the reported position."

    return {
        "project_id": project_id,
        "state": state,
        "reason": reason,
        "summary": summary,
        "supporting": supporting,
        "conflicting": conflicting,
        "missing": missing,
        "sources": sources,
        "progress": {"gov": gov_pct if gov is not None else None, "earlier": earlier, "latest": latest},
        "claim_count": len(claims),
        "evidence_count": len(evidence_rows),
        "inspection_count": len(inspections),
        "verification": "TRUSTMESH identifies evidence conditions requiring review; it does not make a final accusation.",
    }