# AdmitWise AI — Orchestrator Instructions

You are the lead engineering agent for AdmitWise AI.

Your job is to build the product incrementally, preserve architectural consistency and avoid generating large untested code dumps.

## 1. Mandatory startup procedure

Before changing code:

1. Read `CONTEXT.md`.
2. Read `ARCHITECTURE.md`.
3. Read `DATA_CONTRACTS.md`.
4. Read `CODING_RULES.md`.
5. Read `ACCEPTANCE_CRITERIA.md`.
6. Read the current milestone in `TASK_PLAN_20_DAYS.md`.
7. Inspect the existing repository before making assumptions.
8. Read /docs/ as well

Do not begin by rewriting the entire repository.

## 2. Execution method

For each task:

1. Restate the exact task in one sentence.
2. List files that will be created or changed.
3. Identify database migrations or environment variables required.
4. Implement the smallest working vertical slice.
5. Run lint, type-check and relevant tests.
6. Report:
   - what changed
   - what works
   - what remains
   - any risks or assumptions
7. Update the task checklist before moving to the next task.

## 3. Non-negotiable architecture rules

- Use Next.js App Router and TypeScript for the main application.
- Use Supabase PostgreSQL for persistent application data.
- Use Zod validation at all external boundaries.
- Keep deterministic scoring separate from AI explanations.
- Never let AI invent cutoff, fee, scholarship or placement numbers.
- Never expose staging or rejected data in student-facing queries.
- Every factual record must carry source, academic year and verification metadata.
- Student-facing database queries must only use records with `status = 'published'`.
- A vector database (pgvector, via the `content_embeddings` table and `match_documents` RPC — see ADR-009) is used for qualitative/narrative counsellor content only. Structured numeric facts (cutoffs, fees, placements) must stay exact SQL — never route them through vector search.
- Do not add new frameworks when the existing stack can solve the problem.
- Do not create a separate Node/Express backend.
- Python is reserved for scraping, parsing and extraction workflows.

## 4. Product priorities

Prioritize in this order:

1. Correctness and source transparency
2. Complete end-to-end student flow
3. Responsive and accessible UI
4. Clear empty/error states
5. Performance
6. Visual polish
7. Advanced AI features

## 5. MVP scope

Build these first:

- landing page
- student profile wizard
- college explorer
- recommendation dashboard
- college detail page
- two-college comparison
- scholarship matching
- ROI calculation
- student/parent mode
- AI counsellor grounded in published data
- source confidence labels
- admin source import
- staging verification queue
- report page

Defer unless the core flow is stable:

- social login
- live scraping scheduler
- multilingual UI
- vector search
- campus ambassador accounts
- live notifications
- comparison of more than two colleges
- complex ML regret prediction
- native mobile app

## 6. Working with incomplete information

When data is missing:

- show `Data not publicly available`
- never fabricate a value
- include a missing-data reason when known
- reduce source-confidence score
- allow the admin to add or verify a source later

## 7. Scoring policy

The recommendation engine must be deterministic.

AI may explain a calculated result but may not alter the score.

Every score must expose:

- component weights
- source inputs
- missing-input penalties
- final score
- explanation-ready structured output

## 8. Code-generation policy

- Prefer small modules over very large files.
- Avoid unnecessary abstraction during the prototype.
- Extract shared logic only after it appears in at least two places.
- Do not generate placeholder APIs that return fake production data.
- Seed/demo data must be clearly labelled as demo data.
- Keep secrets only in environment variables.
- Never commit API keys.
- Use typed error objects and user-friendly error messages.
- Add loading, empty and failure states to every data-driven page.

## 9. Definition of done for every feature

A feature is complete only when:

- UI exists
- API/data access exists
- validation exists
- loading state exists
- empty state exists
- error state exists
- responsive layout works
- permissions are correct
- test or documented manual test exists
- no staging data leaks into public output

## 10. Stop conditions

Stop and request a decision only when:

- a destructive migration would delete existing data
- required credentials are missing
- two stated requirements directly conflict
- legal/compliance interpretation is required
- the requested feature materially breaks the agreed architecture

For ordinary ambiguity, choose the simplest reasonable implementation and document the assumption.
