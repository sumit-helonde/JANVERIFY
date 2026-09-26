"""Phase 16.5 seed v2: real Nagpur public-data layer + project photos/sources (additive, idempotent)."""

import sys, warnings
from datetime import date
warnings.filterwarnings("ignore")
sys.path.insert(0, ".")
from sqlalchemy import text
from app.core.db import engine

UP = "https://upload.wikimedia.org/wikipedia/commons/thumb"
BASE = "https://upload.wikimedia.org/wikipedia/commons"
IMG = {
    "metro_p1": f"{UP}/c/c8/Nagpur_metro_rail.jpg/960px-Nagpur_metro_rail.jpg",
    "kanhan": f"{UP}/2/2b/Automotive_to_Kanhan_Metro-Line_work.jpg/960px-Automotive_to_Kanhan_Metro-Line_work.jpg",
    "viaduct": f"{UP}/6/62/Nagpur_metro_viaduct1.jpeg/960px-Nagpur_metro_viaduct1.jpeg",
    "pohra": f"{UP}/f/f4/Pohra_river_near_Pipla.jpg/960px-Pohra_river_near_Pipla.jpg",
    "futala_lake": f"{UP}/7/79/Futala_Lake%2C_Nagpur.jpg/960px-Futala_Lake%2C_Nagpur.jpg",
    "futala_fountain": f"{UP}/2/2f/Fountain_at_Futala_Lake_at_dusk%2C_Nagpur.jpg/960px-Fountain_at_Futala_Lake_at_dusk%2C_Nagpur.jpg",
    "ringroad": f"{UP}/7/75/Ring_Road_at_Uday_Nagar_Nagpur.jpg/960px-Ring_Road_at_Uday_Nagar_Nagpur.jpg",
    "hospital": f"{UP}/d/df/Nagpur_Government_Medical_College_and_Hospital.jpg/960px-Nagpur_Government_Medical_College_and_Hospital.jpg",
}

conn = engine.connect()
for ddl in (
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS data_source_type TEXT NOT NULL DEFAULT 'SYNTHETIC'",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_name TEXT",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_url TEXT",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_title TEXT",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_retrieved_on DATE",
):
    conn.execute(text(ddl))
conn.execute(text("""
    CREATE TABLE IF NOT EXISTS project_photos (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        image_url TEXT NOT NULL,
        image_file_page TEXT NOT NULL,
        caption TEXT,
        image_type TEXT NOT NULL DEFAULT 'REPRESENTATIVE_IMAGE',
        source_name TEXT,
        source_title TEXT,
        source_organization TEXT,
        attribution TEXT,
        license_info TEXT,
        image_date TEXT,
        is_representative BOOLEAN NOT NULL DEFAULT TRUE,
        source_type TEXT NOT NULL DEFAULT 'REAL_PUBLIC',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
"""))
conn.execute(text("""
    CREATE TABLE IF NOT EXISTS project_sources (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        source_order INTEGER,
        organization TEXT,
        document_type TEXT,
        title TEXT,
        url TEXT,
        published_date TEXT,
        retrieved_date TEXT,
        source_type TEXT NOT NULL DEFAULT 'REAL_PUBLIC',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
"""))
conn.execute(text("ALTER TABLE project_photos ADD COLUMN IF NOT EXISTS source_organization TEXT"))
conn.execute(text("ALTER TABLE project_photos DROP COLUMN IF EXISTS image_type"))
conn.execute(text("ALTER TABLE project_photos ADD COLUMN image_type TEXT NOT NULL DEFAULT 'REPRESENTATIVE_IMAGE'"))

today = date.today().isoformat()

def get_dept(conn, name, code):
    row = conn.execute(text("SELECT id FROM departments WHERE name ILIKE :n"), {"n": name}).first()
    if row:
        return row[0]
    return conn.execute(text("INSERT INTO departments (name, code) VALUES (:n, :c) RETURNING id"),
                        {"n": name, "c": code}).scalar()

def get_cat(conn, slug, name, dept_id):
    row = conn.execute(text("SELECT id FROM project_categories WHERE slug = :s"), {"s": slug}).first()
    if row:
        return row[0]
    return conn.execute(text(
        "INSERT INTO project_categories (name, slug, department_id) VALUES (:n, :s, :d) RETURNING id"
    ), {"n": name, "s": slug, "d": dept_id}).scalar()

PHOTOS = {
    "metro_p1": {
        "url": IMG["metro_p1"], "page": "https://commons.wikimedia.org/wiki/File:Nagpur_metro_rail.jpg",
        "caption": "Operational Nagpur Metro train, Phase I (Oct 2022). PROJECT_IMAGE.",
        "type": "PROJECT_IMAGE", "rep": False, "author": "Azhar2311", "license": "CC BY-SA 4.0", "date": "2022-10-25",
    },
    "kanhan": {
        "url": IMG["kanhan"], "page": "https://commons.wikimedia.org/wiki/File:Automotive_to_Kanhan_Metro-Line_work.jpg",
        "caption": "Metro Phase-II construction, Automotive Square\u2013Kanhan extension (May 2024). PROJECT_IMAGE.",
        "type": "PROJECT_IMAGE", "rep": False, "author": "Kmohankar", "license": "CC BY 4.0", "date": "2024-05-11",
    },
    "viaduct": {
        "url": IMG["viaduct"], "page": "https://commons.wikimedia.org/wiki/File:Nagpur_metro_viaduct1.jpeg",
        "caption": "Elevated metro viaduct under construction, Phase II. PROJECT_IMAGE.",
        "type": "PROJECT_IMAGE", "rep": False, "author": "bk kartik21", "license": "CC BY-SA 4.0", "date": "Not recorded",
    },
    "pohra": {
        "url": IMG["pohra"], "page": "https://commons.wikimedia.org/wiki/File:Pohra_river_near_Pipla.jpg",
        "caption": "Pohra River near Pipla, Nagpur (Aug 2019). Representative image \u2014 not project evidence.",
        "type": "REPRESENTATIVE_IMAGE", "rep": True, "author": "Ganesh Dhamodkar", "license": "CC BY-SA 4.0", "date": "2019-08-24",
    },
    "futala_lake": {
        "url": IMG["futala_lake"], "page": "https://commons.wikimedia.org/wiki/File:Futala_Lake,_Nagpur.jpg",
        "caption": "Futala (Telangkhedi) Lake, Nagpur (Apr 2017). Representative image \u2014 not project evidence.",
        "type": "REPRESENTATIVE_IMAGE", "rep": True, "author": "Adikarmore", "license": "CC BY-SA 4.0", "date": "2017-04-02",
    },
    "futala_fountain": {
        "url": IMG["futala_fountain"], "page": "https://commons.wikimedia.org/wiki/File:Fountain_at_Futala_Lake_at_dusk,_Nagpur.jpg",
        "caption": "Futala Lake fountain at dusk (image dated 2006). Representative \u2014 not evidence of current multimedia-fountain completion.",
        "type": "REPRESENTATIVE_IMAGE", "rep": True, "author": "Ashish Agrawal et al.", "license": "CC BY-SA 4.0", "date": "2006",
    },
    "ringroad": {
        "url": IMG["ringroad"], "page": "https://commons.wikimedia.org/wiki/File:Ring_Road_at_Uday_Nagar_Nagpur.jpg",
        "caption": "Ring Road at Uday Nagar, Nagpur (Sep 2023). Representative image \u2014 not project evidence.",
        "type": "REPRESENTATIVE_IMAGE", "rep": True, "author": "Ganesh Dhamodkar", "license": "CC BY-SA 4.0", "date": "2023-09-19",
    },
    "hospital": {
        "url": IMG["hospital"], "page": "https://commons.wikimedia.org/wiki/File:Nagpur_Government_Medical_College_and_Hospital.jpg",
        "caption": "Nagpur Government Medical College and Hospital (Mayo Hospital), Jun 2025. PROJECT_IMAGE.",
        "type": "PROJECT_IMAGE", "rep": False, "author": "Amitbalani", "license": "CC0 1.0", "date": "2025-06",
    },
}

PROJECTS = [
    {
        "ref": "NGPM-001",
        "name": "Nagpur Metro Rail Project — Phase I",
        "desc": "Operational mass rapid transit system for Nagpur. Two corridors covering 38.215 km; "
                "fully commissioned 11 December 2022 per Maha-Metro public material. Sanctioned project "
                "cost \u20b98,650 crore per public reporting. Real public data.",
        "category": ("real-metro-transit", "Metro / Rail Transit [REAL PUBLIC DATA]"),
        "dept": "Maharashtra Metro Rail Corporation Limited", "dept_code": "MRO",
        "status": "completed", "sanctioned": 8650.0,
        "source_name": "Maharashtra Metro Rail Corporation Limited (Maha-Metro) — official portal",
        "source_url": "https://metrorailnagpur.com/",
        "source_title": "Nagpur Metro Rail Project — official portal",
        "photos": ["metro_p1"],
        "sources": [
            ("1", "Maharashtra Metro Rail Corporation Limited (Maha-Metro)", "Official project portal",
             "Nagpur Metro — official portal", "https://metrorailnagpur.com/", "Not stated"),
        ],
    },
    {
        "ref": "NGPM-002",
        "name": "Nagpur Metro Rail Project — Phase II",
        "desc": "Under-construction Phase-II extension of Nagpur Metro \u2014 43.8 km across four corridors: "
                "Automotive Square\u2013Kanhan, MIHAN\u2013Butibori MIDC ESR, Prajapati Nagar\u2013Transport Nagar, "
                "Lokmanya Nagar\u2013Hingna. Revised project cost \u20b96,708 crore (GoI:GoMH 50:50). "
                "Real public data; current completion percentage is Not publicly available.",
        "category": ("real-metro-transit", "Metro / Rail Transit [REAL PUBLIC DATA]"),
        "dept": "Maharashtra Metro Rail Corporation Limited", "dept_code": "MRO",
        "status": "in_progress", "sanctioned": 6708.0,
        "source_name": "Maharashtra Metro Rail Corporation Limited (official)",
        "source_url": "https://www.metrorailnagpur.com/Nagpur-Metro-Phase-2",
        "source_title": "Nagpur Metro Phase-II — official salient features",
        "photos": ["kanhan", "viaduct"],
        "sources": [
            ("1", "Maharashtra Metro Rail Corporation Limited (Maha-Metro)", "Official project document",
             "Nagpur Metro Phase-II — salient features", "https://www.metrorailnagpur.com/Nagpur-Metro-Phase-2", "Not stated"),
        ],
    },
    {
        "ref": "NMC-PP-001",
        "name": "Pohra River Pollution Abatement Project (AMRUT 2.0)",
        "desc": "Nagpur Municipal Corporation (NMC) pollution-abatement project for the Pohra River serving "
                "South Nagpur, sanctioned under AMRUT 2.0. Estimated cost \u20b9957.01 crore including GST per "
                "NMC documentation. Funding: 25% Government of India, 25% Government of Maharashtra, 50% "
                "Nagpur Municipal Corporation. Expected timeline: 2 years from start of work. Expected "
                "beneficiaries: more than 8.5 lakh residents of South Nagpur. Five packages: Package I "
                "\u20b992.78 Cr, Package II \u20b9146.81 Cr, Package III \u20b9220.00 Cr, Package IV \u20b999.61 Cr, "
                "Package V \u20b9130.12 Cr. Components: 45 MLD sewage treatment plant, pumping station, wet well, "
                "pumping main, sewerage network including approximately 500 km sewer pipeline works, sewage "
                "diversion and treatment. Real public data; progress figures are Not publicly available.",
        "category": ("real-river-revitalisation", "River Revitalisation / Sewerage [REAL PUBLIC DATA]"),
        "dept": "Nagpur Municipal Corporation — Public Health Engineering", "dept_code": "NMC-PHED",
        "status": "in_progress", "sanctioned": 957.01,
        "source_name": "Nagpur Municipal Corporation (NMC) — AMRUT 2.0 project documentation",
        "source_url": "https://www.nmc.gov.in/",
        "source_title": "NMC — Pohra River Pollution Abatement, AMRUT 2.0 documentation",
        "photos": ["pohra"],
        "sources": [
            ("1", "Nagpur Municipal Corporation (NMC)", "Project document / DPR",
             "Pohra River Pollution Abatement Project (AMRUT 2.0)", "https://www.nmc.gov.in/", "Not stated"),
            ("2", "Nagpur Today (news, secondary)", "News report",
             "NMC unveils ambitious Rs 810 crore plan to cleanse Pohra River in 2 years",
             "https://www.nagpurtoday.in/nmc-unveils-ambitious-rs-810-crore-plan-to-cleanse-pohra-river-in-2-years", "2024-01-12"),
        ],
    },
    {
        "ref": "NMC-FTL-001",
        "name": "Futala Lake Multimedia Fountain & Viewing Gallery",
        "desc": "Lakefront development at Futala (Telangkhedi) Lake, Nagpur led by Maha-Metro: multimedia "
                "floating fountain, viewing gallery and associated civic amenities. Project cost \u20b950 crore per "
                "public reporting. Real public data; verified completion/financial figures are Not publicly "
                "available. Images are representative and not evidence of project completion.",
        "category": ("real-lakefront", "Lakefront / Recreation Infrastructure [REAL PUBLIC DATA]"),
        "dept": "Maharashtra Metro Rail Corporation Limited / Nagpur Municipal Corporation", "dept_code": "MRO-NMC",
        "status": "in_progress", "sanctioned": 50.0,
        "source_name": "Metrorail Nagpur official / The Times of India, Nagpur (25 Oct 2025)",
        "source_url": "https://timesofindia.indiatimes.com/city/nagpur/futala-fountains-poised-for-grand-revival-rs15cr-lost-to-delay-gadkari/articleshow/124792043.cms",
        "source_title": "Futala fountains poised for grand revival (TOI, Nagpur)",
        "photos": ["futala_fountain", "futala_lake"],
        "sources": [
            ("1", "Metrorail Nagpur / partner agencies", "Official project information",
             "Futala Lake Multimedia Fountain & Viewing Gallery", "https://metrorailnagpur.com/", "Not stated"),
            ("2", "The Times of India, Nagpur (news, secondary)", "News report",
             "Futala fountains poised for grand revival", "https://timesofindia.indiatimes.com/city/nagpur/futala-fountains-poised-for-grand-revival-rs15cr-lost-to-delay-gadkari/articleshow/124792043.cms", "2025-10-25"),
        ],
    },
    {
        "ref": "NMRDA-ORR-001",
        "name": "Nagpur Ring Road — Four-laned Stand Alone Ring Road / Bypasses for Nagpur City",
        "desc": "National Highways Authority of India (NHAI) four-laned stand alone ring road / bypasses for "
                "Nagpur City. Package I: Km 0.500 to Km 34.000 (33.500 km). Package II: Km 34.000 to Km 62.035 "
                "(28.035 km). Combined Package I + II: 61.535 km. Contract mode, award dates, concessionaire "
                "and project cost are Not publicly available from the cited record.",
        "category": ("real-road-corridor", "Road / Transport Corridor [REAL PUBLIC DATA]"),
        "dept": "Nagpur Metropolitan Region Development Authority (NMRDA)", "dept_code": "NMRDA",
        "status": "in_progress", "sanctioned": None,
        "source_name": "NHAI — Nagpur Ring Road project documentation",
        "source_url": "https://www.nhai.gov.in/",
        "source_title": "NHAI — Four-laned Stand Alone Ring Road / Bypasses for Nagpur City",
        "photos": ["ringroad"],
        "sources": [
            ("1", "National Highways Authority of India (NHAI)", "Project / tender document",
             "Four-laned Stand Alone Ring Road / Bypasses for Nagpur City", "https://www.nhai.gov.in/", "Not stated"),
        ],
    },
    {
        "ref": "NMC-GH-001",
        "name": "Nagpur Government Medical College and Hospital (Mayo Hospital)",
        "desc": "State-run tertiary-care teaching hospital in Nagpur under the Public Health Department, "
                "Government of Maharashtra. This record documents the operational public health facility; "
                "project cost and renovation/progress figures are Not publicly available.",
        "category": ("real-public-health", "Public Health Infrastructure [REAL PUBLIC DATA]"),
        "dept": "Public Health Department, Government of Maharashtra", "dept_code": "PHD-MAH",
        "status": "completed", "sanctioned": None,
        "source_name": "Public Health Department, Government of Maharashtra — Nagpur Government Medical College and Hospital / District Nagpur",
        "source_url": "https://www.nagpur.gov.in/",
        "source_title": "District Nagpur — health & medical facilities",
        "photos": ["hospital"],
        "sources": [
            ("1", "Public Health Department, Government of Maharashtra", "Official facility record",
             "Nagpur Government Medical College and Hospital", "https://www.nagpur.gov.in/", "Not stated"),
        ],
    },
]

refs = ", ".join(f"'{p['ref']}'" for p in PROJECTS)
conn.execute(text(f"""
    DELETE FROM project_photos
    WHERE project_id IN (SELECT id FROM projects WHERE reference_number IN ({refs}))
"""))
conn.execute(text(f"""
    DELETE FROM project_sources
    WHERE project_id IN (SELECT id FROM projects WHERE reference_number IN ({refs}))
"""))

for prj in PROJECTS:
    cat_slug, cat_name = prj["category"]
    dept_id = get_dept(conn, prj["dept"], prj["dept_code"])
    cat_id = get_cat(conn, cat_slug, cat_name, dept_id)
    existing = conn.execute(text("SELECT id FROM projects WHERE reference_number = :r"), {"r": prj["ref"]}).first()
    if existing:
        pid = existing[0]
    else:
        pid = conn.execute(text("""
            INSERT INTO projects (reference_number, name, description, category_id, department_id,
                city, state, status, total_budget_sanctioned, total_budget_released,
                department_reported_progress, verified_progress, start_date,
                expected_completion_date, actual_completion_date,
                data_source_type, source_name, source_url, source_title, source_retrieved_on,
                created_at, updated_at)
            VALUES (:ref, :name, :desc, :cat, :dept, 'Nagpur', 'Maharashtra', :status,
                :sanc, NULL, NULL, NULL, NULL, NULL, NULL, 'REAL_PUBLIC',
                :sn, :su, :st, :ret, now(), now())
            RETURNING id
        """), {
            "ref": prj["ref"], "name": prj["name"], "desc": prj["desc"], "cat": cat_id, "dept": dept_id,
            "status": prj["status"], "sanc": prj["sanctioned"], "sn": prj["source_name"],
            "su": prj["source_url"], "st": prj["source_title"], "ret": today,
        }).scalar()
    # Always refresh the real record fields (idempotent, allows enrichment on re-run).
    # NOTE: no budgets rows for real projects — contract/released/expenditure are not published;
    # sanctioned stays on projects.total_budget_sanctioned only (avoid fabricating allocated amounts).
    conn.execute(text("""
        UPDATE projects SET name = :name, description = :desc, status = :status,
            total_budget_sanctioned = :sanc, source_name = :sn, source_url = :su,
            source_title = :st, source_retrieved_on = :ret, updated_at = now()
        WHERE id = :pid
    """), {"name": prj["name"], "desc": prj["desc"], "status": prj["status"], "sanc": prj["sanctioned"],
           "sn": prj["source_name"], "su": prj["source_url"], "st": prj["source_title"],
           "ret": today, "pid": pid})
    for pkey in prj["photos"]:
        ph = PHOTOS[pkey]
        conn.execute(text("""
            INSERT INTO project_photos (project_id, image_url, image_file_page, caption, image_type,
                source_name, source_title, source_organization, attribution, license_info, image_date,
                is_representative, source_type, created_at)
            VALUES (:p, :u, :fp, :cap, :itype, 'Wikimedia Commons', 'Wikimedia Commons file page',
                'Wikimedia Commons', :a, :lic, :d, :rep, 'REAL_PUBLIC', now())
        """), {"p": pid, "u": ph["url"], "fp": ph["page"], "cap": ph["caption"], "itype": ph["type"],
               "a": ph["author"], "lic": ph["license"], "d": ph["date"], "rep": ph["rep"]})
    for order, org, dtype, title, url, pub in prj["sources"]:
        conn.execute(text("""
            INSERT INTO project_sources (project_id, source_order, organization, document_type, title,
                url, published_date, retrieved_date, source_type, created_at)
            VALUES (:p, :o, :org, :dt, :t, :u, :pub, :ret, 'REAL_PUBLIC', now())
        """), {"p": pid, "o": int(order), "org": org, "dt": dtype, "t": title, "u": url,
               "pub": pub if pub != "Not stated" else None, "ret": today})

conn.execute(text("UPDATE projects SET data_source_type='SYNTHETIC' WHERE data_source_type IS NULL"))
conn.commit()
conn.close()
print("SEED OK")