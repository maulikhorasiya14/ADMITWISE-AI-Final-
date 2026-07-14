# AdmitWise AI

AdmitWise AI is an advanced, AI-assisted decision platform built specifically for Indian engineering admissions. Moving far beyond the generic "college predictor" model, AdmitWise AI acts as a holistic, evidence-based admission counsellor. It helps students navigate the complexities of JoSAA, CSAB, state counselling, and private-university admission processes by providing verified data, transparent scoring, and intelligent insights.

The platform empowers students and parents to make high-stakes decisions by balancing admission probabilities, financial realities, location constraints, and authentic campus culture, all backed by a robust data-verification engine and explainable AI.

## Core Features
*   **Smart Profiling & Recommendation Engine:** Captures rank, category, budget, and preferences to classify colleges into **Safe**, **Smart**, and **Ambitious** categories based on historical cutoffs.
*   **Deep College Intelligence:** A 360-degree view encompassing cutoffs, detailed fees, placement realities, verified campus culture, and location intelligence (distance to transport hubs, tech ecosystems, etc.).
*   **Advanced Comparison & Trade-Off Engine:** Head-to-head comparison across critical dimensions (admission probability, cost, placement, location) with Student vs. Parent mode toggles and automatic risk warnings.
*   **Financial Insights & ROI:** Calculates true four-year costs, performs deterministic scholarship matching, and analyzes ROI against median placements.
*   **AI Counsellor:** Context-aware assistance grounded *strictly* in published college context with source citations, ensuring zero hallucination.

## The Tech Side

AdmitWise AI is powered by a modern, full-stack architecture designed for accuracy, trust, and scalability.

### Tech Stack
*   **Frontend/App:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui.
*   **Backend & Auth:** Supabase (PostgreSQL, Row Level Security, Auth).
*   **Data Pipeline:** Python, FastAPI, Pydantic, Playwright, Pandas, PyMuPDF.

### 🤖 Explainable AI Agent Pipeline
The AI integration is built around a **strict grounding protocol**. 
Unlike standard generative models that might hallucinate cutoff numbers or placement statistics, our AI acts strictly as an explainer of retrieved context:
1.  **Retrieval-Augmented Context:** When a user asks a question (e.g., "Why is this college listed as Ambitious?"), the system constructs a precise context object containing *only published, verified data* for that college.
2.  **Structured AI Responses:** The AI provider is forced to output responses matching a Zod schema.
3.  **Source Citations:** Every claim the AI makes must include a source ID tracking back to the original document. If evidence is missing, the model gracefully returns an `insufficient_data` state rather than guessing.

### 📊 Data Ingestion & Trust Pipeline (`Extracted -> Review -> Published`)
The Indian engineering admission landscape is opaque, with raw data locked in PDFs, local spreadsheets, and unstructured websites. Our Python data pipeline solves this:
*   **Extraction & Normalization:** The pipeline ingests unstructured data via FastAPI or bulk import scripts, parses files (using Pandas and PyMuPDF), and normalizes naming conventions (e.g., mapping "cse" to "Computer Science and Engineering").
*   **Staging & Verification:** Extracted data is pushed to staging tables in Supabase. Human researchers then verify the data for accuracy and approve low-risk items.
*   **Publication:** Finally, Admins review the approved data, resolve conflicts, and "Publish" it. The student-facing Next.js app queries *only* published data, ensuring absolute trustworthiness.

## How to Run Locally

### Prerequisites
*   Node.js 20 or newer
*   pnpm 11 or newer
*   Python 3.12 or newer
*   A Supabase project (for database/auth)
*   [Ollama](https://ollama.com/) (required for the local AI Counsellor and vector embeddings)

### 1. Web Application Setup
Clone the repo and install dependencies:
```bash
pnpm install
```
Configure your environment variables by copying `.env.example` to `.env.local` and adding your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
Start the Next.js development server:
```bash
pnpm web:dev
```
The app runs at `http://localhost:3000`.

### 2. Python Data Pipeline Setup
Navigate to the data pipeline app and set up a virtual environment:
```bash
cd apps/data-pipeline
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
# source .venv/bin/activate
pip install -e ".[dev]"
```
Run the FastAPI service:
```bash
uvicorn app.main:app --reload --port 8000
```
The extraction API runs at `http://localhost:8000`.

### 3. Local AI Setup (Ollama)
The AI Counsellor feature runs entirely locally using Ollama for privacy and zero API costs.
Ensure Ollama is installed and running, then pull the required models:
```bash
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```
By default, the Next.js app will connect to Ollama at `http://localhost:11434`.

---
