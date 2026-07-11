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
