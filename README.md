# AdmitWise AI

AdmitWise AI is an advanced, AI-assisted decision platform built specifically for Indian engineering admissions. Moving far beyond the generic "college predictor" model, AdmitWise AI acts as a holistic, evidence-based admission counsellor. It helps students navigate the complexities of JoSAA, CSAB, state counselling, and private-university admission processes by providing verified data, transparent scoring, and intelligent insights.

The platform empowers students and parents to make high-stakes decisions by balancing admission probabilities, financial realities, location constraints, and authentic campus culture, all backed by a robust data-verification engine and explainable AI.

---

## 🏛 Technical Architecture

AdmitWise AI uses a modern, full-stack, monorepo architecture designed for accuracy, trust, and scalability. It is built as a **pnpm workspace** separating the frontend, backend data pipeline, and shared packages.

### Tech Stack
*   **Frontend & User App:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
*   **Database & Auth:** Supabase (PostgreSQL with `pgvector`, Row Level Security, Supabase Auth).
*   **Data Ingestion Pipeline:** Python 3.12, FastAPI, Pydantic, Pandas, PyMuPDF (for parsing raw PDFs/CSVs).
*   **Local AI (Explainable AI Agent):** [Ollama](https://ollama.com/) running `qwen2.5:7b` (for conversational logic/tool-calling) and `nomic-embed-text` (for vector embeddings).
*   **Monorepo Tooling:** pnpm workspaces.

### 🤖 Explainable AI Agent Pipeline
The AI integration is built around a **strict grounding protocol**. Unlike standard generative models that might hallucinate cutoff numbers or placement statistics, our AI acts strictly as an explainer of retrieved context:
1.  **Retrieval-Augmented Context:** When a user asks a question, the system searches the `pgvector` database and constructs a precise context object containing *only published, verified data* for that specific college.
2.  **Structured AI Responses:** The Ollama provider is forced to output responses matching strict internal schemas.
3.  **Source Citations:** Every claim the AI makes must include a source ID tracking back to the original document. If evidence is missing, the model gracefully returns an `insufficient_data` state rather than guessing.

### 📊 Data Ingestion & Trust Pipeline
The Indian engineering admission landscape is opaque, with raw data locked in PDFs, local spreadsheets, and unstructured websites. Our Python data pipeline solves this:
*   **Extraction & Normalization:** Ingests unstructured data via FastAPI or bulk import scripts, parses files, and normalizes naming conventions.
*   **Staging & Verification:** Data is pushed to staging tables in Supabase. Human researchers can verify the data for accuracy.
*   **Publication:** Admins "Publish" data. The student-facing Next.js app queries *only* published data, ensuring absolute trustworthiness.

---

## 🚀 Step-by-Step Setup Guide

This project relies on multiple local services (Supabase, Ollama, Next.js, FastAPI). Follow these steps carefully to set up a brand new development environment.

### Prerequisites
*   [Node.js 20+](https://nodejs.org/)
*   [pnpm 11+](https://pnpm.io/installation)
*   [Python 3.12+](https://www.python.org/)
*   [Docker](https://www.docker.com/) (required for running local Supabase containers)
*   [Ollama](https://ollama.com/) (required for the local AI Counsellor and vector embeddings)

### Step 1: Clone & Install Dependencies
Clone the repository and install all Node workspace dependencies:
```bash
git clone <your-repo-url>
cd AdmitWiseAI
pnpm install
```

### Step 2: Database Setup (Local Supabase)
We use the Supabase CLI to run a full local Postgres + Auth stack via Docker.
1. Start the local database:
```bash
npx supabase start
```
2. When the command finishes, it will print your local API credentials (e.g., `API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`).
3. Copy `.env.example` to `.env.local` and paste in your local Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-local-service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
*(Note: Supabase CLI automatically applies all database migrations during `start`).*

### Step 3: Local AI Setup (Ollama)
The AI Counsellor feature runs entirely locally using Ollama for privacy and zero API costs.
Ensure Ollama is installed and running in the background, then pull the required models:
```bash
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```

### Step 4: Python Data Pipeline & Seeding Data
Navigate to the data pipeline app, set up a virtual environment, and populate the database with initial college data:
```bash
cd apps/data-pipeline

# Create and activate virtual environment
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Mac/Linux: source .venv/bin/activate

# Install pipeline dependencies
pip install -e ".[dev]"
```

Now, run the bulk importers to ingest local `data/` into your fresh Supabase database:
```bash
# 1. Import Qualitative Data (Clubs, Facilities, etc.)
python scripts/bulk_import.py --data-dir data/

# 2. Import JoSAA Cutoffs
python scripts/import_josaa_cutoffs.py --csv data/merged_jee_cutoff_2018_2025.csv
```

**Crucial Step - Sync AI Embeddings:**
Because the Python scripts bypass the frontend's webhooks, you must manually generate vector embeddings for the AI counsellor to read the new data:
```bash
# From the root directory:
pnpm --filter @admitwise/web run sync-embeddings
```

### Step 5: Start the Apps!

**Start the Next.js Frontend (Root Directory):**
```bash
pnpm web:dev
```
*Access the student application at `http://localhost:3000`.*

**Start the FastAPI Backend (from `apps/data-pipeline`):**
```bash
# Make sure your .venv is activated
uvicorn app.main:app --reload --port 8000
```
*Access the extraction API at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).*

---

## 📂 Project Structure

```
AdmitWiseAI/
├── apps/
│   ├── web/                 # Next.js 15 student frontend & AI routes
│   └── data-pipeline/       # FastAPI ingestion service & Python bulk scripts
├── packages/
│   ├── scoring/             # Core logic to score Safe/Smart/Ambitious colleges
│   └── shared-types/        # Shared TS types and schemas
├── supabase/
│   ├── migrations/          # Postgres schema migrations
│   └── config.toml          # Supabase local environment configuration
└── package.json             # Workspace root config
```

---
*Built for the FlowZint 2026 Hackathon.*
