"""Contractor and tender routes (factual records only; no scores/rankings)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func

from app.core.db import get_session
from app.api.routes._db import T


router = APIRouter(prefix="/api", tags=["contractors"])


@router.get("/contractors/{contractor_id}")
async def contractor_detail(contractor_id: int, db=Depends(get_session)):
    vendor = db.execute(
        select(T["vendors"]).where(T["vendors"].c.id == contractor_id)
    ).mappings().first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    contracts = db.execute(
        select(T["contracts"]).where(T["contracts"].c.contractor_id == contractor_id)
    ).mappings().all()
    payments = db.execute(
        select(T["payments"]).where(T["payments"].c.vendor_id == contractor_id)
    ).mappings().all()
    inspections = db.execute(
        select(T["inspections"]).where(T["inspections"].c.contractor_id == contractor_id)
    ).mappings().all()
    tenders = []
    projects = []
    for c in contracts:
        prj = db.execute(select(T["projects"]).where(T["projects"].c.id == c["project_id"])).mappings().first()
        if prj:
            projects.append({"id": prj["id"], "reference_number": prj["reference_number"], "name": prj["name"],
                             "status": prj["status"]})
        if c["award_tender_id"]:
            tnd = db.execute(select(T["tenders"]).where(T["tenders"].c.id == c["award_tender_id"])).mappings().first()
            if tnd:
                tprj = db.execute(
                    select(T["projects"].c.name).where(T["projects"].c.id == tnd["project_id"])
                ).scalar() if tnd["project_id"] else None
                tenders.append({"id": tnd["id"], "reference": tnd["tender_reference"],
                                "estimated_value": float(tnd["estimated_value"]) if tnd["estimated_value"] else None,
                                "status": tnd["status"], "project_name": tprj})
    payment_rows = []
    for p in payments:
        pname = db.execute(
            select(T["projects"].c.name).where(T["projects"].c.id == p["project_id"])
        ).scalar() if p["project_id"] else None
        payment_rows.append({**p, "project_name": pname})
    inspection_rows = []
    for i in inspections:
        pname = db.execute(
            select(T["projects"].c.name).where(T["projects"].c.id == i["project_id"])
        ).scalar() if i["project_id"] else None
        inspection_rows.append({**i, "project_name": pname})
    return {
        "id": vendor["id"],
        "name": vendor["name"],
        "vendor_code": vendor["vendor_code"],
        "registration_number": vendor["registration_number"],
        "pan_number": vendor["pan_number"],
        "gst_number": vendor["gst_number"],
        "contact_person": vendor["contact_person"],
        "contact_email": vendor["contact_email"],
        "contact_phone": vendor["contact_phone"],
        "address": vendor["address"],
        "status": vendor["status"],
        "projects": projects,
        "tender_awards": tenders,
        "contracts": [
            {
                "reference": c["contract_reference"],
                "project_id": c["project_id"],
                "status": c["status"],
                "amount": float(c["award_amount"]) if c["award_amount"] is not None else None,
                "start_date": str(c["start_date"]) if c["start_date"] else None,
                "completion_date": str(c["completion_date"]) if c["completion_date"] else None,
            }
            for c in contracts
        ],
        "payments": [
            {"reference": p["payment_reference"], "date": str(p["payment_date"]), "amount": float(p["amount"]),
             "type": p["payment_type"], "status": p["status"], "project_name": p.get("project_name")}
            for p in payment_rows
        ],
        "inspections": [
            {"reference": i["inspection_reference"], "date": str(i["conducted_at"]), "outcome": i["outcome"],
             "type": i["inspection_type"], "findings": i["findings"], "project_name": i.get("project_name")}
            for i in inspection_rows
        ],
        "note": "Factual records only. No score, rating, ranking, or political classification is provided.",
    }


trender = APIRouter(prefix="/api", tags=["tenders"])


@trender.get("/tenders/{tender_id}")
async def tender_detail(tender_id: int, db=Depends(get_session)):
    t = db.execute(select(T["tenders"]).where(T["tenders"].c.id == tender_id)).mappings().first()
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")
    dept = db.execute(select(T["departments"].c.name).where(T["departments"].c.id == t["department_id"])).scalar() if t["department_id"] else None
    contract = db.execute(
        select(T["contracts"]).where(T["contracts"].c.award_tender_id == tender_id)
    ).mappings().first()
    contractor = None
    if contract and contract["contractor_id"]:
        contractor = db.execute(select(T["vendors"].c.name).where(T["vendors"].c.id == contract["contractor_id"])).scalar()
    docs = db.execute(select(T["documents"]).where(T["documents"].c.tender_id == tender_id)).mappings().all()
    return {
        "id": t["id"],
        "reference": t["tender_reference"],
        "title": t["title"],
        "description": t["description"],
        "department": dept,
        "project_id": t["project_id"],
        "publication_date": str(t["publication_date"]) if t["publication_date"] else None,
        "submission_deadline": str(t["submission_deadline"]) if t["submission_deadline"] else None,
        "estimated_value": float(t["estimated_value"]) if t["estimated_value"] else None,
        "status": t["status"],
        "awarded_contractor": contractor,
        "contractor_id": contract["contractor_id"] if contract else None,
        "contract_amount": float(contract["award_amount"]) if contract and contract["award_amount"] else None,
        "duration_days": (
            (contract["completion_date"] - contract["start_date"]).days
            if contract and contract["start_date"] and contract["completion_date"]
            else None
        ),
        "contract": {
            "reference": contract["contract_reference"],
            "amount": float(contract["award_amount"]) if contract and contract["award_amount"] else None,
            "start_date": str(contract["start_date"]) if contract and contract["start_date"] else None,
            "completion_date": str(contract["completion_date"]) if contract and contract["completion_date"] else None,
        } if contract else None,
        "documents": [{"title": d["title"], "type": d["document_type"]} for d in docs],
    }