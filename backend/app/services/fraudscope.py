"""FRAUDSCOPE — deterministic financial/procurement anomaly indicators.

FRAUDSCOPE flags patterns that require HUMAN REVIEW. It NEVER automatically
declares fraud, corruption or criminal activity. Every finding carries the
supporting/conflicting records it was derived from.

Anomaly types (spec):
  MISSING_DOCUMENTATION / DATA_MISMATCH / DUPLICATE_INDICATOR /
  PAYMENT_MISMATCH / PROGRESS_EXPENDITURE_MISMATCH / TIMING_ANOMALY /
  DOCUMENT_INCONSISTENCY / HUMAN_REVIEW_REQUIRED
"""

from __future__ import annotations

from sqlalchemy import select

from app.api.routes._db import T

REVIEW = "HUMAN_REVIEW_REQUIRED"
PASSING_OUTCOMES = {"passed", "success", "pass", "complete"}


def _date(dt):
    if not dt:
        return None
    return dt.date().isoformat() if hasattr(dt, "date") else str(dt)


def _money(cr) -> str | None:
    return f"\u20b9{cr} Cr" if cr is not None else None


def _finding(type_, description, reason, amount_value, amount_text, supporting,
             conflicting, source, date):
    return {
        "type": type_,
        "description": description,
        "reason": reason,
        "amount_value": amount_value,
        "amount_text": amount_text,
        "supporting": supporting,
        "conflicting": conflicting,
        "source": source,
        "date": date,
        "status": REVIEW,
        "human_review": True,
    }


def scan(project_id: int, db) -> dict:
    project = db.execute(
        select(T["projects"]).where(T["projects"].c.id == project_id)
    ).mappings().first()
    if project is None:
        raise ValueError(f"Project {project_id} not found")

    if (project.get("data_source_type") or "SYNTHETIC") == "REAL_PUBLIC":
        return {
            "project_id": project_id,
            "status": "INSUFFICIENT",
            "summary": "Documentation incomplete. Sources do not provide enough information to determine this.",
            "findings": [],
            "verification": "Real public-data record: anomaly indicators require non-public financial records.",
        }

    budget = db.execute(
        select(T["budgets"]).where(T["budgets"].c.project_id == project_id)
    ).mappings().first()
    payments = db.execute(
        select(T["payments"])
        .where(T["payments"].c.project_id == project_id)
        .order_by(T["payments"].c.payment_date)
    ).mappings().all()
    tender = db.execute(
        select(T["tenders"]).where(T["tenders"].c.project_id == project_id)
    ).mappings().first()
    contract = db.execute(
        select(T["contracts"]).where(T["contracts"].c.project_id == project_id)
    ).mappings().first()
    docs = db.execute(
        select(T["documents"]).where(T["documents"].c.project_id == project_id)
    ).mappings().all()
    claims = db.execute(
        select(T["claims"]).where(T["claims"].c.project_id == project_id)
    ).mappings().all()
    evidence_rows = db.execute(
        select(T["evidence"]).where(T["evidence"].c.project_id == project_id)
    ).mappings().all()
    inspections = db.execute(
        select(T["inspections"]).where(T["inspections"].c.project_id == project_id)
    ).mappings().all()
    reports = db.execute(
        select(T["progress_reports"]).where(T["progress_reports"].c.project_id == project_id)
    ).mappings().all()

    findings: list[dict] = []

    sanctioned = float(budget["sanctioned_amount"]) if budget and budget["sanctioned_amount"] is not None else None
    allocated = float(budget["allocated_amount"]) if budget and budget["allocated_amount"] is not None else None
    released = float(budget["released_amount"]) if budget and budget["released_amount"] is not None else None
    spent = float(budget["spent_amount"]) if budget and budget["spent_amount"] is not None else None

    def amt(v):
        return (round(v, 2), _money(round(v, 2))) if v is not None else (None, None)

    # A. Missing payment support — payments without a linked supporting document.
    unsupported = [p for p in payments if p["supporting_document_id"] is None]
    if unsupported:
        total_value, total_text = amt(sum(float(p["amount"]) for p in unsupported))
        findings.append(_finding(
            "MISSING_DOCUMENTATION",
            "Missing payment support",
            "Payments are recorded on the project but the supporting documentation that should back them is not linked on file. Financial documentation needs review.",
            total_value, total_text,
            [p["payment_reference"] for p in unsupported],
            [], unsupported[0]["payment_reference"], _date(unsupported[0]["payment_date"]),
        ))

    # B. Duplicate invoice indicator — same amount + date on distinct payment records.
    grouped: dict[tuple, list] = {}
    for p in payments:
        key = (float(p["amount"]) if p["amount"] is not None else None, _date(p["payment_date"]))
        grouped.setdefault(key, []).append(p)
    dup_sets = [v for v in grouped.values() if len(v) > 1]
    if dup_sets:
        dups = [p for v in dup_sets for p in v]
        dup_value, dup_text = amt(sum(float(p["amount"]) for p in dups))
        findings.append(_finding(
            "DUPLICATE_INDICATOR",
            "Duplicate payment indicator",
            "Multiple payment records share the same amount and date. This is an indicator only and requires human review; it is not proof of wrongdoing.",
            dup_value, dup_text,
            [p["payment_reference"] for p in dups],
            [], dups[0]["payment_reference"], _date(dups[0]["payment_date"]),
        ))

    # C. Contract / payment mismatch.
    if allocated is not None and released is not None and released > allocated + 0.01:
        rv, rt = amt(released)
        findings.append(_finding(
            "PAYMENT_MISMATCH",
            "Contract / payment mismatch",
            "Released funds exceed the contracted amount on record. Evidence requires further investigation.",
            rv, rt, ["Released: " + rt], [], None, None,
        ))
    if allocated is not None and spent is not None and spent > allocated + 0.01:
        sv, st = amt(spent)
        findings.append(_finding(
            "PAYMENT_MISMATCH",
            "Contract / expenditure mismatch",
            "Recorded expenditure exceeds the contracted amount on record. Evidence requires further investigation.",
            sv, st, ["Recorded expenditure: " + st], [], None, None,
        ))

    # D. Unusual payment timing — payments before the public procurement record.
    if payments and tender and tender["publication_date"] is not None:
        pub = tender["publication_date"]
        early = [p for p in payments if p["payment_date"] and p["payment_date"].date() < pub.date()]
        if early:
            ev, et = amt(sum(float(p["amount"]) for p in early))
            findings.append(_finding(
                "TIMING_ANOMALY",
                "Unusual payment timing",
                "Payments are recorded before the public procurement listing date on file. Timing should be reviewed against the project timeline.",
                ev, et,
                [p["payment_reference"] for p in early],
                [tender["tender_reference"]],
                early[0]["payment_reference"], _date(early[0]["payment_date"]),
            ))

    # E. Milestone / payment mismatch — payments while milestone evidence is pending or failing.
    pending_evidence = [e for e in evidence_rows if e["status"] != "verified"]
    failing = [i for i in inspections if i["outcome"] and i["outcome"].lower() not in PASSING_OUTCOMES]
    if payments and (pending_evidence or failing):
        tv, tt = amt(sum(float(p["amount"]) for p in payments))
        conflicting = [i["inspection_reference"] for i in failing] + [f"evidence#{e['id']}" for e in pending_evidence[:2]]
        findings.append(_finding(
            "PAYMENT_MISMATCH",
            "Milestone / payment mismatch",
            "Payments are recorded while supporting milestone or inspection evidence is pending review or not passing. Human review required.",
            tv, tt,
            [p["payment_reference"] for p in payments[:2]],
            conflicting, payments[0]["payment_reference"], _date(payments[0]["payment_date"]),
        ))

    # F. Expenditure / progress mismatch.
    for r in reports:
        fp = float(r["financial_progress"]) if r["financial_progress"] is not None else None
        pp = float(r["physical_progress"]) if r["physical_progress"] is not None else None
        if fp is not None and pp is not None and abs(fp - pp) >= 15.0:
            fv, ft = amt(sum(float(p["amount"]) for p in payments) or (released or 0.0))
            findings.append(_finding(
                "PROGRESS_EXPENDITURE_MISMATCH",
                "Expenditure / progress mismatch",
                f"Recorded financial progress ({fp}%) and reported physical progress ({pp}%) do not fully align. Further review required before any conclusion.",
                fv, ft,
                [r["report_reference"]],
                [], r["report_reference"], _date(r["report_date"]),
            ))
            break

    # G. Missing documentation — required record types missing on file.
    required_types = {"report", "financial", "agreement", "bidding", "proof"}
    present = {d["document_type"] for d in docs}
    needed = required_types - present
    if needed:
        findings.append(_finding(
            "MISSING_DOCUMENTATION",
            "Missing documentation",
            "Required financial/procurement records are incomplete on file: " + ", ".join(sorted(needed)) + ".",
            None, None, [], [], None, None,
        ))

    # G (killer case) — financial documentation explicitly flagged for review.
    for c in claims:
        if c["claim_type"] == "financial_documentation" and c["status"] == "under_review":
            cv, ct = amt(float(c["claimed_amount"]) if c["claimed_amount"] is not None else None)
            findings.append(_finding(
                "MISSING_DOCUMENTATION",
                "Financial documentation needs review.",
                "Required supporting financial documentation is incomplete or inconsistent with available records. Financial documentation needs review.",
                cv, ct,
                [c["claim_reference"], c["description"] or "Claim description on record."],
                [], c["claim_reference"], _date(c["claimed_date"]),
            ))

    # H. Document inconsistency — tender/contract/budget amounts disagree.
    if contract and contract["award_amount"] is not None and allocated is not None and abs(float(contract["award_amount"]) - allocated) > 0.01:
        findings.append(_finding(
            "DOCUMENT_INCONSISTENCY",
            "Document inconsistency",
            "The contract award amount and the allocated budget on file do not match. Human review required.",
            None, None,
            [contract["contract_reference"]],
            ["Budget allocation " + _money(allocated)],
            contract["contract_reference"], None,
        ))

    # I. Supported related-party indicator — only when records already link the same
    # entity through shared identity fields (PAN/GST/phone/registered address).
    payment_vendor_ids = {p["vendor_id"] for p in payments if p["vendor_id"] is not None}
    if contract and contract["contractor_id"] is not None:
        payment_vendor_ids.add(contract["contractor_id"])
    if payment_vendor_ids:
        vendors = db.execute(
            select(T["vendors"]).where(T["vendors"].c.id.in_(payment_vendor_ids))
        ).mappings().all()
        by_identity: dict[tuple, list] = {}
        for v in vendors:
            for field in ("pan_number", "gst_number", "contact_phone", "address"):
                val = v.get(field)
                if val:
                    by_identity.setdefault((field, str(val).strip().lower()), []).append(v)
        related = [v for v in by_identity.values() if len(v) > 1]
        if related:
            shared = related[0]
            names = [v["name"] for v in shared]
            findings.append(_finding(
                "HUMAN_REVIEW_REQUIRED",
                "Supported related-party indicator",
                "Distinct entities on record share an identity field (" + str({
                    "pan_number": "PAN", "gst_number": "GST", "contact_phone": "phone", "address": "registered address"
                }.get(next(iter(by_identity)), "identity")) + "). Review relationship on record.",
                None, None, names, [], shared[0]["name"], None,
            ))

    financial_records_present = bool(budget and (payments or claims or docs))
    if findings:
        status = REVIEW
        summary = ("FRAUDSCOPE identified potential financial and procurement anomalies. "
                   "Each flagged item requires human review; no fraud or corruption is declared.")
    elif not financial_records_present:
        status = "INSUFFICIENT"
        summary = "Additional financial evidence required."
    else:
        status = "NO_ANOMALIES_IDENTIFIED"
        summary = "No financial or procurement anomalies were identified from available records."

    return {
        "project_id": project_id,
        "status": status,
        "summary": summary,
        "findings": findings,
        "verification": "FRAUDSCOPE flags anomalies for human review only.",
    }