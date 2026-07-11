# AdmitWise AI — 20-Day Two-Person Build Plan

## Roles

### Person A — Product and full-stack

- Next.js
- Supabase schema
- public UI
- scoring
- admin UI
- deployment

### Person B — Data automation and AI

- Python pipeline
- extraction
- source normalization
- data verification
- AI prompts
- verified dataset

Both people test and prepare the demo.

---

## Days 1–2 — Foundation

### Person A

- initialize repository
- create Next.js application
- configure TypeScript, Tailwind and shadcn/ui
- connect Supabase
- create shared layout and navigation

### Person B

- create Python project
- define source registry
- implement one webpage extractor
- implement one PDF extractor
- create Pydantic schemas

### Shared deliverable

- final database schema
- selected list of 30–40 colleges
- source-confidence rules
- wireframes

---

## Days 3–5 — Core data and UI

### Person A

- create migrations
- create seed/demo data
- build landing page
- build profile wizard
- build college card components
- build admin authentication

### Person B

- process first five colleges
- normalize branches and cutoffs
- store raw sources
- build staging import format

### Milestone

Five colleges work end to end.

---

## Days 6–8 — Recommendation engine

### Person A

- implement scoring package
- build recommendation API
- build dashboard
- build filters
- build college explorer

### Person B

- process 10–15 colleges
- implement validation/anomaly flags
- verify core cutoff and fee data

### Milestone

A profile generates real recommendations.

---

## Days 9–11 — Comparison and affordability

### Person A

- college details page
- compare page
- ROI calculator
- scholarship matching UI
- parent/student mode

### Person B

- scholarship extraction
- placement normalization
- recruiter records
- location metrics
- expand dataset

### Milestone

Two colleges can be compared with evidence.

---

## Days 12–14 — AI and admin

### Person A

- AI counsellor UI
- source badges
- admin import page
- verification queue
- college editor

### Person B

- AI provider interface
- grounded explanation prompts
- review summarization
- extraction-to-staging integration
- verify extracted records

### Milestone

AI answers only from published data.

---

## Days 15–16 — Reports and responsive polish

### Person A

- report page
- print/PDF layout
- mobile responsiveness
- loading/empty/error states

### Person B

- finish 30–40 college dataset
- verify top-priority fields
- add manual campus-reality fields where available

### Milestone

Complete student journey is demo-ready.

---

## Days 17–18 — Testing

### Shared

- run recommendation test profiles
- test categories and quotas
- test missing data
- test scholarship logic
- test comparison
- test public/admin permissions
- test mobile
- fix inaccurate outputs
- remove unstable features

---

## Day 19 — Presentation

- record demo
- prepare architecture diagram
- prepare problem and differentiation slides
- show verification workflow
- show scalability strategy
- prepare fallback screenshots/video

---

## Day 20 — Buffer and submission

- production deployment
- environment validation
- smoke test
- link verification
- final submission
- backup build and video

---

## Daily rule

At the end of every day, update:

- completed
- blocked
- next
- dataset count
- working demo path
- known bugs

## Cut order when behind schedule

Cut first:

1. multilingual UI
2. live maps
3. vector search
4. complex review submission
5. custom PDF engine
6. advanced analytics
7. social login

Never cut:

- profile
- recommendation engine
- compare
- ROI
- scholarships
- source confidence
- verification workflow
- grounded explanation
