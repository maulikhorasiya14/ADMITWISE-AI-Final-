# AdmitWise AI — Vibe Coding Starter Pack

This folder is the working memory and execution guide for building **AdmitWise AI** in approximately 20 days with a two-person team.

## What AdmitWise AI is

AdmitWise AI is an Indian engineering-college decision platform that helps students:

- discover colleges based on rank, category, quota, budget and preferences
- classify choices as Safe, Smart and Ambitious
- compare two colleges
- understand branch-versus-college trade-offs
- estimate total cost and ROI
- discover possible scholarships
- evaluate location and campus factors
- view source confidence and data freshness
- ask an AI counsellor questions grounded only in verified data
- generate a final decision report

## Recommended stack

- **Main application:** Next.js App Router + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + Lucide
- **Forms and validation:** React Hook Form + Zod
- **Database/Auth/Storage:** Supabase PostgreSQL
- **Charts:** Recharts
- **Automation service:** Python + FastAPI
- **Extraction:** BeautifulSoup, Playwright, pandas, PyMuPDF/pdfplumber, Camelot
- **AI:** Gemini API behind a provider interface
- **Deployment:** Vercel + Supabase; Python service on Render/Railway later

## Read order for any coding agent

1. `ORCHESTRATOR.md`
2. `CONTEXT.md`
3. `ARCHITECTURE.md`
4. `DATA_CONTRACTS.md`
5. `CODING_RULES.md`
6. `ACCEPTANCE_CRITERIA.md`
7. `TASK_PLAN_20_DAYS.md`
8. `FIRST_PROMPT.md`

## Core principle

**Students must only see published, verified data.**  
Scraped and AI-extracted records must enter staging first and require human approval.

## MVP journey

> Enter profile → receive recommendations → compare colleges → discover scholarships → understand risks → ask AI → generate report

## Suggested repository shape

```text
admitwise/
├─ apps/
│  ├─ web/                 # Next.js application
│  └─ data-pipeline/       # Python extraction service/scripts
├─ packages/
│  ├─ shared-types/
│  └─ scoring/
├─ supabase/
│  ├─ migrations/
│  └─ seed/
├─ docs/
│  └─ files from this starter pack
├─ .env.example
└─ README.md
```
