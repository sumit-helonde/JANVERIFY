# JANVERIFY — PROJECT ARCHITECTURE

## Directory Structure

```
JANVERIFY/
├── frontend/
├── backend/
├── ai/
│   ├── trustmesh/
│   ├── fraudscope/
│   ├── evidence/
│   └── reasoning/
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema/
├── data/
│   ├── synthetic/
│   └── sample_documents/
├── docs/
├── tests/
│   └── e2e/
├── .opencode/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
└── AGENTS.md
```

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide
- React Router
- TanStack Query
- Leaflet
- Recharts
- React Flow
- Vitest
- Playwright

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic
- Pytest

## Database

- PostgreSQL
- PostGIS

## Health Endpoint

`GET /api/health`

Exact response:

```json
{"status":"ok","service":"janverify-api"}
```

## Required Database Tables

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

## Required APIs

### GET

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

### POST

- `POST /api/projects/{id}/verify`
- `POST /api/evidence`
- `POST /api/inspections`
- `POST /api/citizen-reports`