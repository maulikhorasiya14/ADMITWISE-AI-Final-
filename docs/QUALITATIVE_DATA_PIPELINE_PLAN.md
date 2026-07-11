# Qualitative Data Pipeline Redesign — Implementation Plan

## Problem Statement

The `data/` folder contains **18 files per college × 34 colleges** with rich qualitative data:
- `campus_reality.json` — senior culture, academic culture, hostel reality, club life, coding culture, locality, satisfaction
- `clubs.csv` — club names, categories, activity status, achievements, descriptions
- `location.csv` — full address, locality, nearest transport, hospitals, tech ecosystem, cost of living
- `student_experience_sources.csv` — Reddit/YouTube/forum sources with themes, bias assessment
- `college_profile.json` → `hostels_and_facilities` — hostel counts, capacities, amenities (wifi, gym, library, medical, etc.)
- `college_summary.md` — human-readable research report

**Currently, NONE of this data reaches Supabase.** The DB only has numericals: cutoffs, fees, placements, branches, scholarships, recruiters, and a minimal `location_metrics` table.

As a result:
- The AI counsellor cannot answer questions about campus life, clubs, hostel quality, or location details
- College detail pages only show numerical tabs
- The recommendation engine hard-codes `culture: 0` and `location: 0` in scores

This plan adds the missing qualitative data end-to-end: schema → pipeline → import → UI → counsellor.

---

## Scope

| In Scope | Out of Scope |
|----------|-------------|
| New Supabase tables for clubs, campus reality, facilities, extended location | Vector search / embeddings |
| Python pipeline extension for new data categories | Live web scraping |
| Bulk import of all 34 college folders | New data collection from external sources |
| New college detail sections (Campus Reality page) | Comparison page changes (defer) |
| AI counsellor grounding with qualitative data | Scoring engine culture/location score (separate task) |
| Student experience sources in DB for counsellor evidence | Student review submission UI (already exists) |

---

## Phase 1: Database Schema (New Migration)

### New file: `supabase/migrations/20260709_qualitative_data_tables.sql`

#### 1.1 `college_clubs` table (normalized)

```sql
create table public.college_clubs (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  club_name text not null,
  club_category text,            -- 'Coding', 'Robotics', 'Sports', 'Music', etc.
  official_status text,          -- 'institution-associated', 'student-run', etc.
  description text,
  official_page text,
  latest_activity text,
  latest_activity_date text,     -- text because data has '2024-03', '2023', etc.
  major_achievements text,
  recruitment_process text,
  activity_status text,          -- 'recently active', 'possibly dormant', 'unable to verify'
  source_id uuid references public.sources(id),
  last_verified_date date,
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, club_name)
);
```

**Rationale**: Clubs data is tabular (from `clubs.csv`) with consistent columns across all 34 colleges. Fully normalized table allows filtering/searching by category and querying individual clubs.

#### 1.2 `campus_reality` table (JSONB)

```sql
create table public.campus_reality (
  college_id uuid primary key references public.colleges(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  -- data contains: senior_junior_culture, academic_culture, hostel_reality,
  -- club_and_campus_life, coding_and_placement_culture, locality_and_student_life,
  -- overall_satisfaction — each with summary, positive_themes, negative_themes,
  -- evidence_strength, supporting_source_ids, conflicting_source_ids
  source_ids text[] not null default '{}',
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Rationale**: User chose JSONB for MVP speed. The `campus_reality.json` structure is consistent but deeply nested with variable-length arrays. JSONB preserves the full structure, is queryable via `->>`/`@>` operators, and is trivially passed to the AI counsellor.

#### 1.3 `college_facilities` table (JSONB)

```sql
create table public.college_facilities (
  college_id uuid primary key references public.colleges(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  -- data contains: campus_area_acres, boys_hostels, girls_hostels, room_occupancy,
  -- mess, wifi, gym, sports_facilities, library, laboratories, medical_centre,
  -- canteen, laundry, transport, banking_atm, security, hostel_rules, etc.
  source_id uuid references public.sources(id),
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Rationale**: `hostels_and_facilities` in `college_profile.json` has diverse nested structures (objects for hostels, booleans for wifi, strings for labs). JSONB handles this naturally.

#### 1.4 `college_location_details` table (text fields)

```sql
create table public.college_location_details (
  college_id uuid primary key references public.colleges(id) on delete cascade,
  campus_name text,
  official_address text,
  locality text,
  district text,
  nearest_metro text,
  nearest_bus_terminal text,
  railway_travel_time_minutes numeric(7,2),
  airport_travel_time_minutes numeric(7,2),
  technology_ecosystem text,     -- full text description, not just a score
  cost_of_living_description text,  -- full text, not just LOW/MEDIUM/HIGH
  data_origin text,              -- provenance description
  source_id uuid references public.sources(id),
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Rationale**: User chose to keep `location_metrics` for numeric scores and create this separate table for extended text fields. The `location.csv` has rich text columns (technology_ecosystem, cost_of_living_band as free text, nearest_metro, nearest_bus_terminal) that don't fit the numeric-only `location_metrics`.

#### 1.5 `student_experience_sources` table

```sql
create table public.student_experience_sources (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  local_source_id text not null,  -- 'STU001', 'YT001' etc. from the CSV
  platform text,                  -- 'Reddit', 'YouTube', 'Quora'
  source_title text,
  url text,
  publication_date text,
  source_identity_type text,      -- 'self-described current student', etc.
  college_branch_if_known text,
  graduation_year_if_known text,
  hosteller_or_day_scholar text,
  topics_covered text,
  positive_themes text,
  negative_themes text,
  visual_evidence boolean default false,
  possible_bias text,
  confidence_level public.confidence_level not null default 'E',
  notes text,
  verification_status public.verification_status not null default 'extracted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, local_source_id)
);
```

**Rationale**: These are the evidence sources behind campus_reality assessments. Critical for the AI counsellor to cite specific student reports and for source transparency.

#### 1.6 RLS policies, triggers, indexes

For all new tables:
- `set_updated_at` trigger
- RLS enabled
- Published-data SELECT policy (same pattern as existing tables)
- Admin ALL policy
- Indexes on `college_id` and `verification_status`

---

## Phase 2: Python Pipeline Extension

### 2.1 New data categories in `schemas/extraction.py`

Add to `DataCategory` enum:

```python
CLUBS = "clubs"
CAMPUS_REALITY = "campus_reality"
FACILITIES = "facilities"
LOCATION_DETAILS = "location_details"
STUDENT_EXPERIENCE_SOURCES = "student_experience_sources"
```

Also add to the staging `ingestion_data_category` enum via a migration `ALTER TYPE`.

### 2.2 New bulk import script: `scripts/bulk_import.py`

This is the core new script. It:

1. Walks each `college_data_*` folder in `/data/`
2. For each folder, reads and processes:
   - `clubs.csv` → `college_clubs` table
   - `campus_reality.json` → `campus_reality` table
   - `college_profile.json` → `hostels_and_facilities` section → `college_facilities` table
   - `location.csv` → `college_location_details` table (text fields) + `location_metrics` table (numeric fields)
   - `student_experience_sources.csv` → `student_experience_sources` table
   - `sources.csv` → `sources` table (for source references used by the new data)
3. Matches each college folder to an existing `colleges` row by name/slug (using fuzzy matching via RapidFuzz)
4. Creates source records from `sources.csv` for any source_ids referenced by the new data
5. Upserts all records with `verification_status = 'published'` and appropriate confidence levels
6. Produces a summary report of what was imported

**Key design decisions**:
- Uses Supabase service-role client (via `supabase-py`) for direct DB access
- Idempotent: uses `ON CONFLICT ... DO UPDATE` for re-runs
- College matching: first tries exact slug match, then fuzzy name match
- Source matching: creates sources from `sources.csv` if they don't exist, linking by `local_source_id`

### 2.3 College slug matching strategy

The data folder names use a pattern like `college_data_indian_institute_of_technology_bombay`. We'll:
1. Strip `college_data_` prefix
2. Convert to slug format (lowercase, underscores to hyphens)
3. Match against `colleges.slug` in Supabase
4. If no match, use RapidFuzz against `colleges.name`
5. Log unmatched colleges for manual resolution

### 2.4 Normalizer extensions

Add `normalizers/qualitative.py`:
- `normalize_club_record(raw)` — cleans club category names, activity status
- `normalize_campus_reality(raw_json)` — validates the JSONB structure
- `normalize_facilities(raw_json)` — validates hostel/facility structure
- `normalize_location_details(raw)` — splits CSV row into text vs numeric fields

### 2.5 Validation extensions

Add `normalizers/qualitative_validation.py`:
- Validate required fields (club_name, college_id)
- Validate JSONB structures have expected top-level keys
- Flag missing source_ids
- Flag empty summaries in campus_reality

---

## Phase 3: Running the Import

### 3.1 Pre-import checklist

- [ ] Run the new migration to create tables
- [ ] Verify all 34 college folders have the expected files
- [ ] Verify all colleges exist in `colleges` table (or create them)
- [ ] Set up environment with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### 3.2 Import command

```bash
cd apps/data-pipeline
python -m scripts.bulk_import --data-dir ../../data --dry-run
python -m scripts.bulk_import --data-dir ../../data
```

### 3.3 Post-import verification

- [ ] Count rows in each new table (should match college count × expected records)
- [ ] Spot-check 3 colleges: verify clubs, campus_reality, facilities, location match source files
- [ ] Verify source references are valid
- [ ] Verify `verification_status = 'published'` for all imported records

---

## Phase 4: Web App — College Detail Expansion

### 4.1 New data queries: `features/colleges/collegeQualitativeQueries.ts`

New server-side query functions:

```typescript
export async function getCollegeClubs(collegeId: string)
export async function getCampusReality(collegeId: string)
export async function getCollegeFacilities(collegeId: string)
export async function getCollegeLocationDetails(collegeId: string)
export async function getStudentExperienceSources(collegeId: string)
```

Each follows the same pattern as existing queries: Supabase client → published-only filter → Zod parse.

### 4.2 New Zod schemas: `features/colleges/collegeQualitativeSchemas.ts`

- `clubSchema` — for club records
- `campusRealitySchema` — for the JSONB structure with topic summaries
- `facilitySchema` — for the JSONB facilities data
- `locationDetailSchema` — for extended location text fields
- `studentExperienceSourceSchema` — for experience source records

### 4.3 New page: Campus Reality page

**Route**: `/colleges/[slug]/campus-reality`

**Linked from**: College detail page via a prominent button/card

**Sections**:

1. **Campus Life Overview** — from `campus_reality.data`
   - Cards for each topic (senior culture, academic culture, hostel reality, etc.)
   - Each card shows: summary, positive themes (green chips), negative themes (amber chips), evidence strength badge
   - Source citation links

2. **Clubs & Activities** — from `college_clubs`
   - Filterable grid/list by category
   - Each club card: name, category, description, activity status badge, latest activity, achievements
   - Activity status color coding: recently active (green), possibly dormant (amber), unable to verify (gray)

3. **Facilities & Infrastructure** — from `college_facilities`
   - Grid of facility cards: hostel, mess, wifi, gym, library, labs, medical, sports
   - Each shows availability, capacity (if applicable), quality notes
   - Missing items shown as "Data not publicly available"

4. **Location & Travel** — from `college_location_details` + `location_metrics`
   - Map placeholder with address
   - Transport access table: railway (name + distance + time), airport, metro, bus
   - Nearby hospital
   - Tech ecosystem description
   - Cost of living description

5. **Student Experience Sources** — from `student_experience_sources`
   - List of sources with platform icon, title (linked), date, identity type
   - Topics covered as chips
   - Positive/negative theme summaries
   - Confidence level badge
   - Bias assessment note

**Design**:
- Same visual system as existing college detail (shadcn/ui cards, consistent typography)
- Source confidence badges on every section
- "Data not publicly available" for missing sections
- Responsive layout

### 4.4 College detail page link

Add a prominent "Campus Reality →" card/button to the existing college detail page that links to `/colleges/[slug]/campus-reality`.

---

## Phase 5: AI Counsellor Grounding Extension

### 5.1 New evidence fetchers in `counsellorService.ts`

Add parallel fetches for qualitative data alongside existing numerical fetches:

```typescript
// Inside fetchPublishedGroundingRecords()
const [branches, cutoffs, feesResult, placementsResult, scholarships,
       clubs, campusReality, facilities, locationDetails] = await Promise.all([
  // ... existing fetches ...
  // New fetches:
  supabase.from("college_clubs").select("...").eq("verification_status", "published"),
  supabase.from("campus_reality").select("...").eq("verification_status", "published"),
  supabase.from("college_facilities").select("...").eq("verification_status", "published"),
  supabase.from("college_location_details").select("...").eq("verification_status", "published"),
]);
```

### 5.2 New evidence converters

```typescript
function clubRowsToEvidence(rows: ClubRow[]): GroundingRecord[]
// → "IIT Bombay has club 'Robotics Club' (category: Robotics, status: recently active). Description: ..."

function campusRealityToEvidence(rows: CampusRealityRow[]): GroundingRecord[]
// → "IIT Bombay campus reality — senior culture: summary...; positive: ...; negative: ...; evidence: moderate"

function facilityRowsToEvidence(rows: FacilityRow[]): GroundingRecord[]
// → "IIT Bombay facilities: campus 600 acres, boys hostels 13 (capacity ...), wifi: available, ..."

function locationDetailRowsToEvidence(rows: LocationDetailRow[]): GroundingRecord[]
// → "IIT Bombay location: Powai, Mumbai. Nearest metro: Powai. Tech ecosystem: ..."
```

### 5.3 Enhanced counsellor prompts

The `counsellorSystemInstruction` already has rules for grounded answers. The new evidence types will naturally flow through the existing pipeline because they become `GroundingRecord` entries.

Update the system instruction to add:

```
CAMPUS REALITY FORMAT (when user asks about college life, culture, hostel quality, clubs, location):
- Report the evidence strength (e.g. 'based on limited anecdotal evidence', 'moderate repeated signal').
- Distinguish official/institutional data from student-reported data.
- If evidence is conflicting, present both sides and note the conflict.
- For campus reality topics, always mention the evidence strength and source count.
```

### 5.4 Expected impact

After this, the counsellor can answer questions like:
- "How is the hostel quality at IIIT Pune?"
- "What clubs does IIT Bombay have?"
- "Is BITS Pilani good for coding culture?"
- "How far is NIT Trichy from the airport?"
- "What's the campus like at IIT Kanpur?"
- "Compare the campus life of IIT Delhi and IIT Bombay"

---

## Phase 6: Recommendation Engine (Deferred but Prepared)

The recommendation engine currently hard-codes `location: 0` and `culture: 0`. The new data makes it **possible** to calculate these scores, but that's a separate task.

**What this plan prepares**:
- `campus_reality` JSONB has `evidence_strength` per topic → can derive a `culture` score
- `location_metrics` + `college_location_details` together have transport scores → can derive a `location` score
- The `missingMilestone3Data` array in `recommendationEngine.ts` can be updated to remove `"location"` and `"campus reality"` once scores are implemented

**What's NOT in this plan**:
- Implementing `scoreCulture()` and `scoreLocation()` pure functions
- Updating the recommendation engine to use them
- These are noted as follow-up tasks

---

## File Change Summary

### New files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260709_qualitative_data_tables.sql` | New tables, RLS, indexes, triggers |
| `apps/data-pipeline/scripts/bulk_import.py` | Main import script for all 34 colleges |
| `apps/data-pipeline/normalizers/qualitative.py` | Normalizers for clubs, campus reality, facilities, location |
| `apps/data-pipeline/normalizers/qualitative_validation.py` | Validators for qualitative data |
| `apps/web/src/features/colleges/collegeQualitativeQueries.ts` | Server queries for new tables |
| `apps/web/src/features/colleges/collegeQualitativeSchemas.ts` | Zod schemas for qualitative data |
| `apps/web/src/app/colleges/[slug]/campus-reality/page.tsx` | Campus Reality page |
| `apps/web/src/features/colleges/components/CampusRealitySection.tsx` | Campus reality topic cards |
| `apps/web/src/features/colleges/components/ClubsSection.tsx` | Clubs grid |
| `apps/web/src/features/colleges/components/FacilitiesSection.tsx` | Facilities grid |
| `apps/web/src/features/colleges/components/LocationDetailsSection.tsx` | Extended location section |
| `apps/web/src/features/colleges/components/StudentExperienceSection.tsx` | Experience sources list |

### Modified files

| File | Change |
|------|--------|
| `apps/data-pipeline/schemas/extraction.py` | Add new `DataCategory` enum values |
| `apps/data-pipeline/schemas/__init__.py` | Re-export new categories |
| `apps/web/src/features/counsellor/counsellorService.ts` | Add qualitative data fetches + evidence converters |
| `apps/web/src/features/counsellor/counsellorCore.ts` | Extend system instruction for campus reality format |
| `apps/web/src/app/colleges/[slug]/page.tsx` | Add "Campus Reality" link/card |

### No changes needed

| File | Reason |
|------|--------|
| `apps/web/src/features/recommendations/recommendationEngine.ts` | Culture/location scoring is deferred |
| Existing migration files | Never modify applied migrations |
| `data/*` | Read-only source of truth |

---

## Execution Order

```
1. Write & apply migration          → verify tables exist
2. Add DataCategory enum values     → verify pipeline compiles  
3. Write normalizers                → unit test
4. Write bulk_import.py             → dry-run test
5. Run import for all 34 colleges   → verify row counts
6. Write Zod schemas                → type-check
7. Write server queries             → verify data loads
8. Build Campus Reality page + UI   → visual review
9. Extend counsellor grounding      → test counsellor answers
10. Update college detail page link → end-to-end flow
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| College slug mismatch between folder names and DB | Fuzzy matching + manual mapping table |
| `source_id` references in CSVs are local IDs (S001, STU001), not UUIDs | Import creates UUID sources from `sources.csv`, maintain a local→UUID mapping |
| Large `college_profile.json` files (some are 2MB+) | Only extract `hostels_and_facilities` section, don't load entire file into memory |
| JSONB queries may be slower than normalized tables | Acceptable for MVP; campus_reality is read infrequently and one-row-per-college |
| Some colleges may have missing files | Import script handles missing files gracefully, logs warnings |
| Staging `ingestion_data_category` enum needs ALTER TYPE | Include in migration, safe for Supabase |

---

## Open Questions

**Q1**: Some colleges have slightly different file names or missing files (e.g., `college_data_indian_institute_of_information_technology_pune(3)` has `(3)` suffix). Should we handle these as special cases or should you clean up the folder names first?

**Q2**: The `sources.csv` files contain local source IDs like `S001`, `S002`, `STU001`. These need to be mapped to UUID source records in Supabase. Should we create new source records from the CSV, or do many of these sources already exist in the `sources` table from earlier imports?

**Q3**: The `college_summary.md` files are rich human-readable reports. Should we store these as a text column on the `colleges` table, or as a separate document? They could be useful for the AI counsellor as additional grounding context. However, they're large (8-14KB each) and overlap with the structured data.

---

## Verification Plan

### Automated Tests
- `python -m pytest apps/data-pipeline/tests/test_qualitative_normalizers.py` — normalizer unit tests
- `pnpm --filter web run typecheck` — TypeScript compilation
- `pnpm --filter web run lint` — lint check

### Manual Verification
- Run bulk import with `--dry-run` first
- After import: query each new table and verify row counts
- Open Campus Reality page for 3 colleges (IIT Bombay, IIIT Pune, BITS Pilani) and verify content
- Ask the AI counsellor: "What clubs does IIT Bombay have?" — verify it uses club evidence
- Ask: "How is the hostel at IIIT Pune?" — verify it uses campus_reality evidence
- Ask: "How far is BITS Pilani from the airport?" — verify it uses location evidence
