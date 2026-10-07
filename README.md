# Flora Bakes

Flora Bakes is a bakery sales analytics application. Upload an Excel workbook to validate and store sales rows, explore a filterable dashboard, review data-derived insights, and export a CSV report.

## Features

- Excel `.xlsx` and `.xls` upload with a 20 MB configurable limit
- Case-insensitive aliases for item, date, price, time, weekday, and optional waste columns
- Row-level validation report with totals, valid/invalid rows, missing values, and duplicate flags
- Whitespace cleanup, currency-like price parsing, normalized times, and weekday recalculation from the sale date
- Separate upload batches and retained duplicate rows
- KPI cards, product rankings, item revenue share, weekday/hour/time-period analysis, and daily/weekly/monthly trends
- Date, item, weekday, and time filters
- Waste analytics only when waste columns are provided; no waste values are fabricated
- Dataset-derived insights and recommendations
- CSV report export, dark mode, and responsive layout
- SQLite development database; PostgreSQL supported through `DATABASE_URL`

## Technology

- Backend: Python 3.11+, FastAPI, SQLAlchemy 2, Pydantic Settings, Pandas, OpenPyXL, xlrd, Uvicorn
- Frontend: React, TypeScript, Vite, Tailwind CSS, Recharts, TanStack Query, Lucide React
- Database: SQLite by default; PostgreSQL for production deployments

## Project structure

```text
backend/
  app/api/routes/       Upload and analytics endpoints
  app/core/             Environment settings and logging
  app/db/               SQLAlchemy engine, sessions, models
  app/schemas/          Pydantic response schemas
  app/services/         Excel parsing and analytics logic
  scripts/              Sample workbook generator
  tests/                Parser and analytics tests
frontend/
  src/components/       Upload panel and dashboard sections
  src/services/         REST API client
  src/types/            Shared response types
uploads/                Reserved local upload storage (original files are not retained)
```

## Requirements

- Python 3.11 or later
- Node.js 18 or later and npm
- Package index access for installing dependencies

## Local setup

### 1. Configure the environment

From the project root:

```bash
cp .env.example .env
```

The development values in `.env.example` work locally. Set `SECRET_KEY` to a securely generated value before deployment. Do not commit `.env`.

### 2. Install and start the backend

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --reload
```

FastAPI creates the development tables at startup. The API runs on `http://localhost:8000`, health check is `/health`, and interactive API docs are at `/docs`.

### 3. Install and start the frontend

In a separate terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Vite proxies `/api` calls to the backend.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `APP_NAME` | API display name | `Flora Bakes` |
| `ENVIRONMENT` | Deployment environment label | `development` |
| `API_PREFIX` | API route prefix | `/api` |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./flora_bakes.db` |
| `SECRET_KEY` | Application secret placeholder | Local development value |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `MAX_UPLOAD_SIZE_MB` | Maximum workbook size (1–100 MB) | `20` |
| `UPLOAD_DIRECTORY` | Reserved upload storage directory | `uploads` |

For PostgreSQL, use a SQLAlchemy URL such as `postgresql+psycopg://user:password@host:5432/flora_bakes`. Keep credentials in the environment, not source control.

## Excel format

Required fields (case-insensitive):

- Item Name (also accepts Item, Product, Product Name)
- Sale Date (also accepts Sales Date, Date, Transaction Date)
- Sales Price (also accepts Sale Price, Price, Revenue, Amount)
- Sales Time (also accepts Sale Time, Time, Transaction Time)

`Day` is optional and recalculated from `Sale Date`. Whitespace around item names is normalized. Invalid required values are retained in the validation report; valid rows are stored and can be analyzed. Duplicate item/date/time/price combinations are flagged but retained. Empty rows in the worksheet are reported as invalid/missing rows when returned by the workbook reader.

Optional waste fields include Waste Quantity, Waste/Wastage, Wasted Items, and Waste Cost. Waste percentage is left unavailable because the required sales input does not include sold quantity; transaction count is not treated as quantity.

Generate a deterministic 750-row example workbook after backend dependencies are installed:

```bash
cd backend
python scripts/generate_sample.py
```

This creates `sample_sales.xlsx` in the project root.

## API overview

- `POST /api/uploads` — validate and store a workbook batch
- `GET /api/uploads` — list datasets
- `GET /api/uploads/{upload_id}` — validation report for a dataset
- `GET /api/dashboard/{upload_id}` — combined dashboard with optional `date_from`, `date_to`, `item`, `day`, `time_from`, `time_to`, and `granularity` filters
- `GET /api/analytics/top-items/{upload_id}`
- `GET /api/analytics/sales-by-day/{upload_id}`
- `GET /api/analytics/sales-by-time/{upload_id}`
- `GET /api/analytics/trends/{upload_id}?granularity=daily|weekly|monthly`
- `GET /api/analytics/item-share/{upload_id}`
- `GET /api/analytics/waste/{upload_id}`
- `GET /api/analytics/insights/{upload_id}`
- `GET /api/analytics/recommendations/{upload_id}`
- `GET /api/reports/{upload_id}.csv` — download summary, product results, insights, and recommendations

The dashboard endpoint is the main frontend request and returns a consistent data snapshot for the applied filters. Sales amounts retain the values in the file; no currency symbol is assumed because the input has no currency field.

## Tests

From `backend/` with the virtual environment active:

```bash
pytest
```

The tests cover Excel aliases and cleaning, day recalculation, invalid and duplicate rows, unsupported columns/extensions, and analytics calculations. This workspace could not currently install packages or run the suite because package-index network access is unavailable.

## Future improvements

- Database migrations and managed PostgreSQL deployment
- Multi-user authentication and per-business authorization
- Background processing for larger imports
- Explicit currency and sold-quantity fields for accurate currency formatting and waste rates
- XLSX/PDF exports and scheduled reports
- Additional integration and browser-based frontend tests
