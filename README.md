# JANVERIFY

**Your Tax. Your Evidence. Your Right to Know.**

JANVERIFY is an independent, non-partisan public accountability platform that
helps citizens inspect public projects using evidence, financial records,
procurement records, inspections, progress reports and source traceability.

The system presents evidence and uncertainty. It does not tell citizens which
political party, politician, or administration to support.

- Core engine: **TRUSTMESH**
- Financial anomaly module: **FRAUDSCOPE**
- Primary demo project: **NRD-204 — Ward 24 Road Development**

> All demo data is synthetic and is labeled **SYNTHETIC HACKATHON DATA**.

---

## Architecture

```
JANVERIFY/
├── frontend/            React + TypeScript + Vite + Tailwind + shadcn/ui
├── backend/             FastAPI + Pydantic + SQLAlchemy + Alembic
├── ai/
│   ├── trustmesh/       Evidence trust evaluation engine
│   ├── fraudscope/      Financial anomaly detection (review-only)
│   ├── evidence/        Evidence handling
│   └── reasoning/       Explainable reasoning helpers
├── database/
│   ├── migrations/      Alembic migrations
│   ├── seeds/           Synthetic seed data scripts
│   └── schema/          Schema documentation / SQL
├── data/
│   ├── synthetic/       Synthetic dataset files (labeled)
│   └── sample_documents/ Sample public documents
├── docs/                Project documentation
├── tests/e2e/           Playwright end-to-end tests
└── docker-compose.yml   PostgreSQL + PostGIS
```

### Frontend stack

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide, React Router,
TanStack Query, Leaflet, Recharts, React Flow, Vitest, Playwright.

### Backend stack

Python, FastAPI, Pydantic, SQLAlchemy, Alembic, Pytest.

### Database

PostgreSQL + PostGIS.

---

## Prerequisites

- Node.js 20.19+ (tested on 24.x)
- Python 3.11+ (tested on 3.13)
- Docker (with Docker Compose) — OR a local PostgreSQL/PostGIS instance

---

## Setup

### 1. Environment

```bash
cp .env.example .env
```

Backend reads `.env` from `backend/` via `DATABASE_URL`, `API_BASE_URL`,
`CORS_ORIGINS`, `JWT_SECRET`, `LLM_API_KEY`. Example values are dev-only —
never commit a real `.env`.

### 2. Database (PostgreSQL + PostGIS)

**Option A — Docker (recommended):**

```bash
docker compose up -d
```

Starts the `janverify-db` container with PostGIS enabled.

**Option B — existing local PostgreSQL:**

Use any local PostgreSQL 16+ instance with the PostGIS extension available and
create the database:

```bash
createdb -h localhost -U postgres janverify
```

Verify PostGIS is available (used from Phase 3):

```sql
select name from pg_available_extensions where name like 'postgis%';
```

### 3. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS/Linux
pip install -r requirements.txt
cp .env.example .env            # create backend/.env from example
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # optional
npm run dev
```

The Vite dev server proxies `/api` to the backend (`http://localhost:8000`)
during development.

---

## API

Health check — real endpoint, this is a working API, not a stub:

```
GET /api/health
```

Exact response:

```json
{
  "status": "ok",
  "service": "janverify-api"
}
```

Interactive Swagger docs: `http://localhost:8000/docs`

---

## Environment Variables

| Variable         | Used by  | Purpose                                        |
| ---------------- | -------- | ---------------------------------------------- |
| `DATABASE_URL`   | backend  | SQLAlchemy connection string                   |
| `API_BASE_URL`   | backend  | Base URL of the API                            |
| `CORS_ORIGINS`   | backend  | Comma-separated allowed origins                |
| `JWT_SECRET`     | backend  | Token/session signing secret (Phase 15)        |
| `LLM_API_KEY`    | backend  | Optional LLM provider key (later phases)       |
| `VITE_API_BASE_URL` | frontend | API base URL used by the browser (`/api` in dev) |

Never commit real secret values. All real secrets live in `.env` files which
are git-ignored.

---

## Testing

```bash
# Backend (from backend/)
pytest

# Frontend unit/component tests (from frontend/)
npm run test

# End-to-end (from repository root)
npx playwright install chromium
npx playwright test

# Production build (from frontend/)
npm run build
```

---

## Phase Workflow

1. Pick the current phase from `tasks.md` (source of truth, Phases 0–17).
2. Build → Run → Test → Browser Verify → Backend Verify.
3. If anything fails: **STOP → FIX → RETEST → VERIFY**.
4. Only mark a phase verified after all its checks pass.
5. Never skip a phase; never move ahead before verification.

Synthetic data is always labeled **SYNTHETIC HACKATHON DATA**. Never present
synthetic data as real allegations. Never automatically declare fraud or
corruption.