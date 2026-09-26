"""Evidence Graph — database-backed nodes and edges for the JANVERIFY graph view.

Every node and edge below is derived from real records (or explicitly absent).
No hardcoded NRD-204 graph. The TRUSTMESH decision node links supporting and
conflicting evidence via the actual decision output.
"""

from __future__ import annotations

from sqlalchemy import select

from app.api.routes._db import T
from app.services.trustmesh import _measured_percent, evaluate
from app.services.fraudscope import scan as fraudscope_scan


def _date(dt):
    if not dt:
        return None
    return dt.date().isoformat() if hasattr(dt, "date") else str(dt)


def build_evidence_graph(project_id: int, db) -> dict:
    project = db.execute(
        select(T["projects"]).where(T["projects"].c.id == project_id)
    ).mappings().first()
    if project is None:
        raise ValueError(f"Project {project_id} not found")

    claims = db.execute(
        select(T["claims"]).where(T["claims"].c.project_id == project_id)
    ).mappings().all()
    inspections = db.execute(
        select(T["inspections"]).where(T["inspections"].c.project_id == project_id)
    ).mappings().all()
    evidence_rows = db.execute(
        select(T["evidence"]).where(T["evidence"].c.project_id == project_id)
    ).mappings().all()

    nodes: list[dict] = []
    edges: list[dict] = []

    project_uid = f"project-{project_id}"
    nodes.append(
        {
            "id": project_uid,
            "type": "PROJECT",
            "title": project["reference_number"],
            "summary": project["name"],
            "source": "Government record",
            "date": _date(project["start_date"]),
            "status": project["status"],
            "meta": {"Sanctioned": str(project["total_budget_sanctioned"]) + " Cr"},
        }
    )

    claim_uids: list[str] = []
    financial_uid: str | None = None
    financial_amount: str | None = None
    for c in claims:
        uid = f"claim-{c['id']}"
        amount = f"\u20b9{c['claimed_amount']} Cr" if c["claimed_amount"] is not None else None
        edges.append({"id": f"e-{project_uid}-{uid}", "source": project_uid, "target": uid, "type": "DOCUMENTS"})
        if c["claim_type"] == "financial_documentation":
            financial_uid = uid
            financial_amount = amount
            nodes.append(
                {
                    "id": uid,
                    "type": "FINANCIAL_RECORD",
                    "title": "Financial documentation",
                    "summary": c["description"] or "Financial records under review.",
                    "source": c["claim_reference"],
                    "date": _date(c["claimed_date"]),
                    "status": c["status"],
                    "meta": {"Amount": amount, "Type": c["claim_type"].replace("_", " ")},
                }
            )
        else:
            claim_uids.append(uid)
            nodes.append(
                {
                    "id": uid,
                    "type": "GOVERNMENT_CLAIM",
                    "title": c["claim_reference"],
                    "summary": c["description"] or "Government claim on record.",
                    "source": "Government claim",
                    "date": _date(c["claimed_date"]),
                    "status": c["status"],
                    "meta": {"Amount": amount, "Type": c["claim_type"].replace("_", " ")},
                }
            )

    inspection_uids: list[str] = []
    measured_map: dict[str, float] = {}
    for ins in inspections:
        uid = f"inspection-{ins['id']}"
        measured_map[uid] = _measured_percent(ins["findings"])
        edges.append({"id": f"e-insp-{uid}", "source": claim_uids[0] if claim_uids else project_uid, "target": uid, "type": "INSPECTED_BY"})
        inspection_uids.append(uid)
        nodes.append(
            {
                "id": uid,
                "type": "INSPECTION",
                "title": "Independent inspection",
                "summary": ins["findings"],
                "source": ins["inspection_reference"],
                "date": _date(ins["conducted_at"]),
                "status": ins["outcome"],
                "meta": {
                    **({"Measured progress": f"{measured_map[uid]}%" if measured_map[uid] is not None else "unavailable"}),
                },
            }
        )

    if inspection_uids:
        latest_uid = max(inspection_uids, key=lambda u: (measured_map[u] is not None, measured_map[u] or 0.0))
        earlier_uid = min(inspection_uids, key=lambda u: (measured_map[u] is not None, measured_map[u] or 0.0))
        for n in nodes:
            if n["id"] == latest_uid:
                n["type"] = "LATEST_INSPECTION"
                n["title"] = "Latest inspection"
        if len(inspection_uids) > 1 and latest_uid != earlier_uid:
            edges.append(
                {
                    "id": f"e-update-{earlier_uid}-{latest_uid}",
                    "source": earlier_uid,
                    "target": latest_uid,
                    "type": "UPDATES",
                }
            )

    photo_uids: list[str] = []
    for e in evidence_rows:
        uid = f"evidence-{e['id']}"
        photo_uids.append(uid)
        edges.append({"id": f"e-{project_uid}-{uid}", "source": project_uid, "target": uid, "type": "DOCUMENTS"})
        nodes.append(
            {
                "id": uid,
                "type": "PHOTO_EVIDENCE",
                "title": e["source_type"].replace("_", " ").capitalize(),
                "summary": e["description"],
                "source": e["chain_trace"] or f"evidence#{e['id']}",
                "date": _date(e["captured_at"]),
                "status": e["status"],
                "meta": {"Type": e["source_type"].replace("_", " ")},
            }
        )

    # Citizen submissions appear as UNVERIFIED nodes, never linked into the decision.
    citizen = db.execute(
        select(T["citizen_reports"]).where(T["citizen_reports"].c.project_id == project_id)
    ).mappings().all()
    for cr in citizen:
        uid = f"citizen-{cr['id']}"
        edges.append({"id": f"e-citizen-{uid}", "source": project_uid, "target": uid, "type": "DOCUMENTS"})
        nodes.append(
            {
                "id": uid,
                "type": "CITIZEN_SUBMISSION",
                "title": cr["report_reference"],
                "summary": cr["description"],
                "source": "Citizen Submitted",
                "date": _date(cr["reported_at"]),
                "status": "Pending Review",
                "meta": {"Review": "Unverified citizen evidence"},
            }
        )
        for i, did in enumerate(cr["photo_document_ids"] or []):
            media_uid = f"citizen-media-{cr['id']}-{i}"
            edges.append({"id": f"e-citizen-media-{media_uid}", "source": uid, "target": media_uid, "type": "CONTAINS"})
            nodes.append(
                {
                    "id": media_uid,
                    "type": "CITIZEN_MEDIA",
                    "title": "Photo/Document",
                    "summary": f"Uploaded by a citizen on {_date(cr['reported_at'])}.",
                    "source": f"document#{did}",
                    "date": _date(cr["reported_at"]),
                    "status": "Pending Review",
                    "meta": {"Review": "Unverified citizen evidence"},
                }
            )

    decision = evaluate(project_id, db)
    decision_uid = "trustmesh-decision"
    nodes.append(
        {
            "id": decision_uid,
            "type": "TRUSTMESH_DECISION",
            "title": f"TRUSTMESH — {decision['state']}",
            "summary": decision["summary"],
            "source": "TRUSTMESH rule engine",
            "date": None,
            "status": decision["state"],
            "meta": {
                "Supporting": str(len(decision["supporting"])),
                "Conflicting": str(len(decision["conflicting"])),
                "Reason": decision["reason"],
            },
        }
    )

    if any("Government progress report" in s for s in decision["supporting"]):
        edges.append({"id": "e-decision-project", "source": project_uid, "target": decision_uid, "type": "SUPPORTS"})
    if "LATEST_INSPECTION" in {n["type"] for n in nodes}:
        latest_supported = any("Latest independent inspection" in s for s in decision["supporting"])
        if latest_supported:
            edges.append({"id": "e-decision-latest", "source": latest_uid, "target": decision_uid, "type": "SUPPORTS"})
    for cf in decision["conflicting"]:
        if "Earlier independent inspection" in cf:
            if inspection_uids:
                edges.append({"id": "e-decision-earlier", "source": earlier_uid, "target": decision_uid, "type": "CONTRADICTS"})
        if "Financial documentation" in cf and financial_uid:
            edges.append({"id": "e-decision-finance", "source": financial_uid, "target": decision_uid, "type": "CONTRADICTS"})
    for pu in photo_uids:
        edges.append({"id": f"e-decision-{pu}", "source": pu, "target": decision_uid, "type": "UPDATES"})

    # FRAUDSCOPE findings — anomaly nodes linked to the records that raised them.
    # They never change the TRUSTMESH decision; they only flag items for review.
    fraudscope = fraudscope_scan(project_id, db)
    for idx, finding in enumerate(fraudscope["findings"]):
        uid = f"anomaly-{idx}"
        nodes.append(
            {
                "id": uid,
                "type": "FINANCIAL_ANOMALY",
                "title": finding["description"],
                "summary": finding["reason"],
                "source": finding["source"],
                "date": finding["date"],
                "status": finding["status"],
                "meta": {
                    **(dict(Amount=finding["amount_text"]) if finding["amount_text"] else {}),
                    **(dict(Type=finding["type"].replace("_", " "))),
                },
            }
        )
        source_uid = next((n["id"] for n in nodes if n["source"] == finding["source"] and n["type"] == "FINANCIAL_RECORD"), project_uid)
        edges.append({"id": f"e-anomaly-{uid}", "source": source_uid, "target": uid, "type": "FLAGGED"})

    return {"project_id": project_id, "nodes": nodes, "edges": edges}