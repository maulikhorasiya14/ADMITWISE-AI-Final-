# AdmitWise AI — Architecture Decision Log

Record important decisions here so future coding agents do not reverse them accidentally.

## ADR-001 — Main application framework

**Decision:** Use Next.js App Router with TypeScript.

**Reason:** One codebase for frontend and normal backend routes is faster for a two-person, 20-day build.

**Rejected:** Separate React frontend and Express backend.

---

## ADR-002 — Database and authentication

**Decision:** Use Supabase PostgreSQL, Auth and Storage.

**Reason:** Relational data fits colleges, branches, cutoffs, scholarships and sources. Supabase reduces infrastructure work.

**Rejected:** MongoDB for the MVP.

---

## ADR-003 — Extraction service

**Decision:** Use Python for scraping, PDF parsing and normalization.

**Reason:** Python has stronger document-processing and table-extraction tooling.

---

## ADR-004 — Published-only public data

**Decision:** Extracted data goes to staging and requires approval before publication.

**Reason:** Admission and financial data must not be exposed without verification.

---

## ADR-005 — Deterministic recommendations

**Decision:** Scores and eligibility are calculated by code. AI only explains results.

**Reason:** Prevent hallucinations and enable transparent reasoning.

---

## ADR-006 — No vector database in MVP

**Decision:** Use structured SQL retrieval first.

**Reason:** Thirty to forty colleges fit well in relational queries. Vector search is not needed for the main student flow.

---

## ADR-007 — Maps

**Decision:** Store/precompute location metrics for MVP. Add live provider integrations later if time permits.

**Reason:** Avoid API cost and integration risk during the hackathon.

---

## ADR-008 — Guest-first demo

**Decision:** Core flow works without student login. Admin requires authentication.

**Reason:** Judges must experience the product immediately.

---

## ADR-009 — Vector search for the AI counsellor agent

**Decision:** Add a `pgvector`-backed `content_embeddings` table and hybrid (cosine similarity + full-text) `match_documents` RPC in Supabase, used exclusively by the AI counsellor's `search_college_db` tool for qualitative/narrative content (campus reality, clubs, facilities, location, scholarships).

**Supersedes:** ADR-006 ("No vector database in MVP").

**Reason:** The counsellor became a genuine Gemini function-calling agent instead of a fixed keyword-matched pipeline. Structured numeric facts (cutoffs, fees, placements) remain exact SQL, unaffected by this decision — only narrative/qualitative text benefits from semantic ranking, and the plain keyword-overlap ranking previously used for that content was weak for conceptual questions ("what's the coding culture like").

**Alternatives considered:** Self-hosted embedding model (BAAI/bge-large-en-v1.5) via a Python inference service — rejected because it would violate the "Python is reserved for scraping/extraction, no separate backend" rule and add infrastructure a 2-person hackathon team doesn't need; Gemini's `text-embedding-004` reuses the existing `GEMINI_API_KEY` with zero new infrastructure.

**Consequences:** A new migration and an embedding-sync step (manual after `bulk_import.py` runs, automatic after the TS admin-review scholarship publish path) must stay in sync with published qualitative data, or the agent's semantic search will miss recently-published content until the next sync.

**Date:** 2026-07-11
**Owner:** AI counsellor redesign

---

## How to add a decision

Use:

```text
## ADR-XXX — Title

Decision:
Reason:
Alternatives considered:
Consequences:
Date:
Owner:
```
