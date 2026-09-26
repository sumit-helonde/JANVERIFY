"""Project, dashboard, financial, evidence, timeline, map and decision routes."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func

from app.core.db import get_session
from app.api.routes._db import T
from app.services.trustmesh import evaluate, _measured_percent
from app.services.evidence_graph import build_evidence_graph
from app.services.fraudscope import scan as fraudscope_scan


router = APIRouter(prefix="/api", tags=["projects"])


def _proj_row(r):
    return {
        "id": r.id,
        "reference_number": r.reference_number,
        "name": r.name,
        "description": r.description,
        "status": r.status,
        "city": r.city,
        "state": r.state,
        "latitude": r.y_coordinate,
        "longitude": r.X,
        "sanctioned": float(r.total_budget_sanctioned) if r.total_budget_sanctioned is not None else None,
        "released": float(r.total_budget_released) if r.total_budget_released is not None else None,
        "government_progress": float(r.department_reported_progress) if r.department_reported_progress is not None else None,
        "verified_progress": float(r.verified_progress) if r.verified_progress is not None else None,
        "start_date": r.start_date.isoformat() if r.start_date else None,
        "expected_completion_date": r.expected_completion_date.isoformat() if r.expected_completion_date else None,
        "actual_completion_date": r.actual_completion_date.isoformat() if r.actual_completion_date else None,
        "data_source_type": getattr(r, "data_source_type", "SYNTHETIC"),
        "source_name": getattr(r, "source_name", None),
        "source_url": getattr(r, "source_url", None),
        "source_title": getattr(r, "source_title", None),
        "source_retrieved_on": getattr(r, "source_retrieved_on", None),
    }


def _photos(db, pid) -> list:
    rows = db.execute(
        select(T["project_photos"]).where(T["project_photos"].c.project_id == pid)
    ).mappings().all()
    return [{
        "image_url": r.image_url,
        "image_file_page": r.image_file_page,
        "caption": r.caption,
        "image_type": r.image_type,
        "is_representative": bool(r.is_representative),
        "source_name": r.source_name,
        "source_organization": r.source_organization,
        "attribution": r.attribution,
        "license_info": r.license_info,
        "image_date": r.image_date,
        "source_type": r.source_type,
    } for r in rows]


def _sources(db, pid) -> list:
    rows = db.execute(
        select(T["project_sources"])
        .where(T["project_sources"].c.project_id == pid)
        .order_by(T["project_sources"].c.source_order)
    ).mappings().all()
    return [{
        "source_order": r.source_order,
        "organization": r.organization,
        "document_type": r.document_type,
        "title": r.title,
        "url": r.url,
        "published_date": r.published_date,
        "retrieved_date": r.retrieved_date,
        "source_type": r.source_type,
    } for r in rows]


def _get_project(db, pid) -> dict:
    stmt = select(T["projects"]).where(T["projects"].c.id == pid)
    row = db.execute(stmt).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    base = _proj_row(row)

    cat = db.execute(
        select(T["project_categories"].c.name)
        .where(T["project_categories"].c.id == row.category_id)
    ).scalar()
    dept = db.execute(
        select(T["departments"].c.name).where(T["departments"].c.id == row.department_id)
    ).scalar()
    loc = db.execute(
        select(T["project_locations"]).where(T["project_locations"].c.project_id == pid)
    ).mappings().first()
    budget = db.execute(select(T["budgets"]).where(T["budgets"].c.project_id == pid)).mappings().first()
    tender = db.execute(select(T["tenders"]).where(T["tenders"].c.project_id == pid)).mappings().first()
    contract = db.execute(select(T["contracts"]).where(T["contracts"].c.project_id == pid)).mappings().first()
    contractor = None
    if contract and contract.contractor_id:
        contractor = db.execute(
            select(T["vendors"].c.name).where(T["vendors"].c.id == contract.contractor_id)
        ).scalar()
    evidence_count = db.execute(
        select(func.count()).select_from(T["evidence"]).where(T["evidence"].c.project_id == pid)
    ).scalar_one()
    inspection_count = db.execute(
        select(func.count()).select_from(T["inspections"]).where(T["inspections"].c.project_id == pid)
    ).scalar_one()

    if base.get("data_source_type") == "REAL_PUBLIC":
        financial = {
            "sanctioned": base["sanctioned"],
            "contract": None,
            "released": None,
            "expenditure": None,
            "note": "Contract, release and expenditure figures are not publicly available for this "
                    "real public-data project.",
        }
    else:
        financial = None

    base.update({
        "category": cat,
        "department": dept,
        "location": {
            "id": loc.id if loc else None,
            "name": loc.location_name if loc else None,
            "latitude": float(loc.latitude) if loc and loc.latitude is not None else None,
            "longitude": float(loc.longitude) if loc and loc.longitude is not None else None,
        } if loc else None,
        "financial_summary": {
            "sanctioned": float(budget.sanctioned_amount) if budget else base["sanctioned"],
            "contract": float(budget.allocated_amount) if budget else None,
            "released": float(budget.released_amount) if budget else base["released"],
            "expenditure": float(budget.spent_amount) if budget else None,
        } if budget else financial,
        "photos": _photos(db, pid),
        "sources": _sources(db, pid),
        "progress_summary": {
            "government": base["government_progress"],
            "verified": base["verified_progress"],
        },
        "contractor": contractor,
        "contractor_id": contract.contractor_id if contract else None,
        "tender_id": tender.id if tender else None,
        "tender_reference": tender.tender_reference if tender else None,
        "contract_reference": contract.contract_reference if contract else None,
        "evidence_count": evidence_count,
        "inspection_count": inspection_count,
    })
    return base


@router.get("/dashboard/summary")
async def dashboard_summary(db=Depends(get_session)):
    projects = db.execute(select(func.count()).select_from(T["projects"])).scalar_one()
    budget = db.execute(
        select(func.coalesce(func.sum(T["budgets"].c.sanctioned_amount), 0))
        .select_from(T["budgets"])
    ).scalar_one()
    depts = db.execute(select(func.count()).select_from(T["departments"])).scalar_one()
    contractors = db.execute(select(func.count()).select_from(T["vendors"])).scalar_one()
    completed = db.execute(
        select(func.count()).select_from(T["projects"]).where(T["projects"].c.status == "completed")
    ).scalar_one()
    in_progress = db.execute(
        select(func.count()).select_from(T["projects"]).where(T["projects"].c.status == "in_progress")
    ).scalar_one()
    evidence = db.execute(select(func.count()).select_from(T["evidence"])).scalar_one()
    inspections = db.execute(select(func.count()).select_from(T["inspections"])).scalar_one()
    return {
        "projects": {"total": projects, "completed": completed, "in_progress": in_progress},
        "departments": depts,
        "contractors": contractors,
        "sanctioned_total": float(budget),
        "evidence_count": evidence,
        "inspection_count": inspections,
    }


@router.get("/projects")
async def list_projects(
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    department: str | None = Query(default=None),
    status: str | None = Query(default=None),
    data_source: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db=Depends(get_session),
):
    p = T["projects"]
    c = T["project_categories"]
    d = T["departments"]
    stmt = select(
        p,
        c.c.name.label("category"),
        d.c.name.label("department"),
    ).join(c, p.c.category_id == c.c.id, isouter=True).join(
        d, p.c.department_id == d.c.id, isouter=True
    )
    count_stmt = select(func.count()).select_from(p)
    conds = []
    if search:
        like = f"%{search}%"
        conds.append(p.c.name.ilike(like) | p.c.reference_number.ilike(like))
    if category:
        conds.append(c.c.slug == f"syn-{category}" or c.c.name.ilike(f"%{category}%"))
    if department:
        conds.append(d.c.name.ilike(f"%{department}%"))
    if status:
        conds.append(p.c.status == status)
    if data_source:
        conds.append(p.c.data_source_type == data_source)
    for cond in conds:
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)
    total = db.execute(count_stmt).scalar_one()
    rows = db.execute(
        stmt.order_by(p.c.id).offset((page - 1) * page_size).limit(page_size)
    ).mappings().all()
    ids = [r.id for r in rows]
    photo_map: dict = {}
    if ids:
        ph_rows = db.execute(
            select(T["project_photos"]).where(T["project_photos"].c.project_id.in_(ids))
        ).mappings().all()
        for ph in ph_rows:
            photo_map.setdefault(ph.project_id, []).append({
                "image_url": ph.image_url,
                "image_file_page": ph.image_file_page,
                "caption": ph.caption,
                "image_type": ph.image_type,
                "is_representative": bool(ph.is_representative),
                "source_name": ph.source_name,
                "attribution": ph.attribution,
                "license_info": ph.license_info,
                "image_date": ph.image_date,
            })
    items = []
    for r in rows:
        item = _proj_row(r)
        item["category"] = r.category
        item["department"] = r.department
        item["photos"] = photo_map.get(r.id, [])
        items.append(item)
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }


@router.get("/projects/{project_id}")
async def project_detail(project_id: int, db=Depends(get_session)):
    return _get_project(db, project_id)


@router.get("/projects/{project_id}/financials")
async def project_financials(project_id: int, db=Depends(get_session)):
    _get_project(db, project_id)
    budget = db.execute(
        select(T["budgets"]).where(T["budgets"].c.project_id == project_id)
    ).mappings().first()
    tender = db.execute(
        select(T["tenders"]).where(T["tenders"].c.project_id == project_id)
    ).mappings().first()
    contract = db.execute(
        select(T["contracts"]).where(T["contracts"].c.project_id == project_id)
    ).mappings().first()
    payments = db.execute(
        select(T["payments"])
        .where(T["payments"].c.project_id == project_id)
        .order_by(T["payments"].c.payment_date)
    ).mappings().all()
    docs = db.execute(
        select(T["documents"])
        .where(T["documents"].c.project_id == project_id,
               T["documents"].c.document_type.in_(["financial", "agreement", "bidding"]))
    ).mappings().all()
    return {
        "sanctioned": float(budget["sanctioned_amount"]) if budget else None,
        "contract_amount": float(budget["allocated_amount"]) if budget else None,
        "released": float(budget["released_amount"]) if budget else None,
        "recorded_expenditure": float(budget["spent_amount"]) if budget else None,
        "tender_estimated_value": float(tender["estimated_value"]) if tender else None,
        "contract_reference": contract["contract_reference"] if contract else None,
        "contract_status": contract["status"] if contract else None,
        "payments": [
            {
                "reference": pm["payment_reference"],
                "date": str(pm["payment_date"]) if pm["payment_date"] else None,
                "amount": float(pm["amount"]) if pm["amount"] is not None else None,
                "type": pm["payment_type"],
                "status": pm["status"],
            }
            for pm in payments
        ],
        "financial_documents": [
            {"title": doc["title"], "type": doc["document_type"], "uploaded_at": str(doc["uploaded_at"])}
            for doc in docs
        ],
    }


@router.get("/projects/{project_id}/evidence")
async def project_evidence(project_id: int, db=Depends(get_session)):
    _get_project(db, project_id)
    evidence = db.execute(
        select(T["evidence"]).where(T["evidence"].c.project_id == project_id).order_by(T["evidence"].c.id)
    ).mappings().all()
    inspections = db.execute(
        select(T["inspections"]).where(T["inspections"].c.project_id == project_id).order_by(T["inspections"].c.id)
    ).mappings().all()
    reports = db.execute(
        select(T["progress_reports"]).where(T["progress_reports"].c.project_id == project_id).order_by(T["progress_reports"].c.report_date)
    ).mappings().all()
    claims = db.execute(
        select(T["claims"]).where(T["claims"].c.project_id == project_id).order_by(T["claims"].c.id)
    ).mappings().all()
    docs = db.execute(
        select(T["documents"]).where(T["documents"].c.project_id == project_id).order_by(T["documents"].c.id)
    ).mappings().all()
    citizen = db.execute(
        select(T["citizen_reports"]).where(T["citizen_reports"].c.project_id == project_id).order_by(T["citizen_reports"].c.id.desc())
    ).mappings().all()
    doc_ids = [d for cr in citizen for d in (cr["photo_document_ids"] or [])]
    doc_titles = {}
    for d in db.execute(select(T["documents"]).where(T["documents"].c.id.in_(doc_ids or [0]))).mappings().all():
        doc_titles[d["id"]] = d["title"]
    return {
        "project_id": project_id,
        "citizen_reports": [
            {
                "reference": cr["report_reference"],
                "description": cr["description"],
                "status": "CITIZEN-SUBMITTED" if cr["status"] == "submitted" else ("CITIZEN-VERIFIED" if cr["status"] == "verified" else f"CITIZEN-{cr['status'].upper()}"),
                "review_status": {"submitted": "PENDING_REVIEW", "under_review": "UNDER_REVIEW", "verified": "ACCEPTED", "rejected": "REJECTED"}.get(cr["status"], cr["status"].upper()),
                "origin": "citizen_submitted",
                "reported_at": str(cr["reported_at"]) if cr["reported_at"] else None,
                "photos": [doc_titles.get(i, f"document#{i}") for i in (cr["photo_document_ids"] or [])],
                "report_type": cr["report_type"],
            }
            for cr in citizen
        ],
        "government_claims": [
            {
                "reference": cl["claim_reference"],
                "type": cl["claim_type"],
                "amount": float(cl["claimed_amount"]) if cl["claimed_amount"] is not None else None,
                "status": cl["status"],
                "description": cl["description"],
            }
            for cl in claims
        ],
        "inspections": [
            {
                "reference": i["inspection_reference"],
                "date": str(i["conducted_at"]) if i["conducted_at"] else None,
                "type": i["inspection_type"],
                "outcome": i["outcome"],
                "findings": i["findings"],
            }
            for i in inspections
        ],
        "progress_reports": [
            {
                "reference": r["report_reference"],
                "date": str(r["report_date"]) if r["report_date"] else None,
                "financial_percent": float(r["financial_progress"]) if r["financial_progress"] is not None else None,
                "physical_percent": float(r["physical_progress"]) if r["physical_progress"] is not None else None,
                "verified_percent": float(r["verified_progress"]) if r["verified_progress"] is not None else None,
            }
            for r in reports
        ],
        "documents": [
            {"title": d["title"], "type": d["document_type"], "visibility": d["visibility"]}
            for d in docs
        ],
        "evidence": [
            {
                "id": e["id"],
                "description": e["description"],
                "source_type": e["source_type"],
                "status": e["status"],
                "captured_at": str(e["captured_at"]) if e["captured_at"] else None,
                "checksum": (e["checksum_sha256"] or "")[:12],
            }
            for e in evidence
        ],
    }


@router.get("/projects/{project_id}/timeline")
async def project_timeline(project_id: int, db=Depends(get_session)):
    _get_project(db, project_id)
    events = []
    proj = db.execute(select(T["projects"]).where(T["projects"].c.id == project_id)).mappings().first()
    if proj and proj["start_date"]:
        events.append({"date": str(proj["start_date"]), "type": "sanction/start", "title": "Project started"})
    tender = db.execute(select(T["tenders"]).where(T["tenders"].c.project_id == project_id)).mappings().first()
    if tender:
        events.append({"date": str(tender["publication_date"]) if tender["publication_date"] else None,
                       "type": "tender", "title": f"Tender {tender['tender_reference']}"})
    contract = db.execute(select(T["contracts"]).where(T["contracts"].c.project_id == project_id)).mappings().first()
    if contract:
        events.append({"date": str(contract["award_date"]) if contract["award_date"] else None,
                       "type": "contract", "title": f"Contract {contract['contract_reference']} awarded"})
    for pm in db.execute(select(T["payments"]).where(T["payments"].c.project_id == project_id)).mappings().all():
        events.append({"date": str(pm["payment_date"]) if pm["payment_date"] else None, "type": "payment",
                       "title": f"Payment {pm['payment_reference']} ({float(pm['amount'])} Cr)"})
    for r in db.execute(select(T["progress_reports"]).where(T["progress_reports"].c.project_id == project_id)).mappings().all():
        events.append({"date": str(r["report_date"]) if r["report_date"] else None, "type": "progress",
                       "title": f"Progress report {r['report_reference']}"})
    for i in db.execute(select(T["inspections"]).where(T["inspections"].c.project_id == project_id)).mappings().all():
        events.append({"date": str(i["conducted_at"]) if i["conducted_at"] else None, "type": "inspection",
                       "title": f"Inspection {i['inspection_reference']}"})
    for e in db.execute(select(T["evidence"]).where(T["evidence"].c.project_id == project_id)).mappings().all():
        events.append({"date": str(e["captured_at"]) if e["captured_at"] else None, "type": "evidence",
                       "title": f"Evidence #{e['id']}"})
    events = [e for e in events if e["date"]]
    events.sort(key=lambda e: e["date"])
    return {"project_id": project_id, "events": events}


@router.get("/projects/{project_id}/map")
async def project_map(project_id: int, db=Depends(get_session)):
    proj = _get_project(db, project_id)
    loc = db.execute(
        select(T["project_locations"]).where(T["project_locations"].c.project_id == project_id)
    ).mappings().first()
    lat = None
    lng = None
    name = None
    if loc:
        lat = float(loc["latitude"]) if loc["latitude"] is not None else None
        lng = float(loc["longitude"]) if loc["longitude"] is not None else None
        name = loc["location_name"]
    lat = lat if lat is not None else proj["latitude"]
    lng = lng if lng is not None else proj["longitude"]
    return {
        "project_id": project_id,
        "project_name": proj["name"],
        "latitude": lat,
        "longitude": lng,
        "location_name": name or f"{proj['city']}, {proj['state']}",
    }


@router.get("/projects/{project_id}/evidence-graph")
async def project_evidence_graph(project_id: int, db=Depends(get_session)):
    _get_project(db, project_id)
    return build_evidence_graph(project_id, db)


@router.get("/projects/{project_id}/evidence-summary")
async def project_evidence_summary(project_id: int, db=Depends(get_session)):
    _get_project(db, project_id)
    proj = db.execute(select(T["projects"]).where(T["projects"].c.id == project_id)).mappings().first()
    budget = db.execute(select(T["budgets"]).where(T["budgets"].c.project_id == project_id)).mappings().first()
    inspections = db.execute(
        select(T["inspections"]).where(T["inspections"].c.project_id == project_id)
    ).mappings().all()
    measured = [e for e in (_measured_percent(i["findings"]) for i in inspections) if e is not None]
    evidence_total = db.execute(
        select(func.count()).select_from(T["evidence"]).where(T["evidence"].c.project_id == project_id)
    ).scalar_one()
    citizen_total = db.execute(
        select(func.count()).select_from(T["citizen_reports"]).where(T["citizen_reports"].c.project_id == project_id)
    ).scalar_one()
    decision = evaluate(project_id, db)
    fraud = fraudscope_scan(project_id, db)
    top_finding = next(
        (f for f in fraud["findings"] if "financial documentation" in (f.get("description") or "").lower()),
        next(
            (f for f in fraud["findings"] if f.get("amount_text") and "review" in f.get("status", "").lower()),
            fraud["findings"][0] if fraud.get("findings") else None,
        ),
    )
    return {
        "project_id": project_id,
        "project_reference": proj["reference_number"],
        "financials": {
            "sanctioned": float(budget["sanctioned_amount"]) if budget else None,
            "contract": float(budget["allocated_amount"]) if budget else None,
            "released": float(budget["released_amount"]) if budget else None,
            "recorded_expenditure": float(budget["spent_amount"]) if budget else None,
        },
        "progress": {
            "government": round(float(proj["department_reported_progress"]) * 100, 1) if proj["department_reported_progress"] else None,
            "earlier_inspection": min(measured) if measured else None,
            "latest_inspection": max(measured) if measured else None,
        },
        "trustmesh": {"state": decision["state"], "reason": decision["reason"], "summary": decision["summary"]},
        "fraudscope": {"status": fraud["status"], "review_amount": top_finding["amount_text"] if top_finding else None},
        "counts": {"evidence": evidence_total, "citizen_reports": citizen_total},
    }


@router.get("/projects/{project_id}/fraudscope")
async def project_fraudscope(project_id: int, db=Depends(get_session)):
    _get_project(db, project_id)
    return fraudscope_scan(project_id, db)


@router.get("/projects/{project_id}/decision")
async def project_decision(project_id: int, db=Depends(get_session)):
    _get_project(db, project_id)
    decision = evaluate(project_id, db)
    citizen_count = db.execute(
        select(func.count()).select_from(T["citizen_reports"]).where(T["citizen_reports"].c.project_id == project_id)
    ).scalar_one()
    decision["citizen_evidence"] = {
        "count": citizen_count,
        "unverified": True,
        "note": "Additional citizen evidence is available, but it has not yet been independently verified.",
    }
    return decision


@router.get("/projects/{project_id}/contractor")
async def project_contractor(project_id: int, db=Depends(get_session)):
    proj = _get_project(db, project_id)
    contract = db.execute(select(T["contracts"]).where(T["contracts"].c.project_id == project_id)).mappings().first()
    if not contract or not contract["contractor_id"]:
        return {"project_id": project_id, "contractor": None}
    vendor = db.execute(
        select(T["vendors"]).where(T["vendors"].c.id == contract["contractor_id"])
    ).mappings().first()
    payments = db.execute(
        select(T["payments"]).where(T["payments"].c.vendor_id == contract["contractor_id"])
    ).mappings().all()
    inspections = db.execute(
        select(T["inspections"]).where(T["inspections"].c.contractor_id == contract["contractor_id"])
    ).mappings().all()
    return {
        "project_id": project_id,
        "contractor": {
            "id": vendor["id"],
            "name": vendor["name"],
            "vendor_code": vendor["vendor_code"],
            "registration_number": vendor["registration_number"],
            "contact_person": vendor["contact_person"],
            "contact_email": vendor["contact_email"],
            "contract": {
                "reference": contract["contract_reference"],
                "status": contract["status"],
                "amount": float(contract["award_amount"]) if contract["award_amount"] is not None else None,
            },
            "payments": [
                {"reference": p["payment_reference"], "date": str(p["payment_date"]), "amount": float(p["amount"]),
                 "type": p["payment_type"], "status": p["status"]}
                for p in payments
            ],
            "inspections": [
                {"reference": i["inspection_reference"], "date": str(i["conducted_at"]), "outcome": i["outcome"]}
                for i in inspections
            ],
        },
    }