# AdmitWise AI

Foundation scaffold for an AI-assisted Indian engineering admissions decision platform.

## Prerequisites

- Node.js 20 or newer
- pnpm 11 or newer
- Python 3.12 or newer

## Install

```bash
pnpm install
```

For the Python service:

```bash
cd apps/data-pipeline
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
```

## Run the Web App

```bash
pnpm web:dev
```

The app runs at `http://localhost:3000`.

## Run the Python Service

```bash
cd apps/data-pipeline
uvicorn app.main:app --reload --port 8000
```

The API runs at `http://localhost:8000`.

## Quality Checks

```bash
pnpm lint
pnpm type-check
pnpm test
```

Python:

```bash
cd apps/data-pipeline
python -m unittest discover -s tests
```

## Environment Variables

Copy `.env.example` to `.env.local` for the web app. The service-role key must never be used in browser code.
