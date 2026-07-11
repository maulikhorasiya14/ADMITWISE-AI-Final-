# College Editor — Implementation Plan

## Problem Statement

The admin panel currently supports a **read-only** verification workflow: records arrive via the staging pipeline, get reviewed, approved, and published. However, there is no interface for an admin to **directly edit published college data** — fix a typo in a college name, update a fee amount, add a missing branch, or toggle `is_published`. The `CONTEXT.md` spec routes to `/admin/colleges/[id]` and `ARCHITECTURE.md` lists "edit college records" under admin permissions, but no code exists for it.

## Scope

- **Edit-only** — the editor works on existing colleges (new colleges arrive via staging/seed).
- **Full CRUD per section** — college identity, branches, fees, placements, location metrics.
- **Direct-publish** — admin edits go live immediately (no staging round-trip for MVP demo).
- **Admin-only** — researchers can view but cannot mutate.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Route | `/admin/colleges/[id]` | Matches `CONTEXT.md` spec |
| New college creation | Not supported | Colleges arrive via staging pipeline or seed |
| Edit persistence | Direct write to public tables via service-role | Simpler for MVP; admin role is already trusted |
| Role guard | Admin-only for mutations; researcher can view | Consistent with publish permissions |
| UI pattern | Tabbed sections within a single page | Keeps context; avoids deep sub-routes |
| Form library | React Hook Form + Zod (already in deps) | Consistent with profile wizard |
| College list entry point | `/admin/colleges` | New listing page linking into the editor |

---

## Architecture Overview

```
/admin/colleges              → CollegeListPage (Server Component)
    ↓ click
/admin/colleges/[id]         → CollegeEditorPage (Server Component shell)
    ↓ renders
CollegeEditorClient          → Client Component (tabs, forms, mutations)
    ↓ calls
POST /api/admin/colleges/[id]/identity    → Route Handler → adminCollegeService
POST /api/admin/colleges/[id]/branches    → Route Handler → adminCollegeService
POST /api/admin/colleges/[id]/fees        → Route Handler → adminCollegeService
POST /api/admin/colleges/[id]/placements  → Route Handler → adminCollegeService
POST /api/admin/colleges/[id]/location    → Route Handler → adminCollegeService
DELETE /api/admin/colleges/[id]/branches/[branchId]  → Route Handler
DELETE /api/admin/colleges/[id]/fees/[feeId]         → Route Handler
DELETE /api/admin/colleges/[id]/placements/[placementId] → Route Handler
```

**Data flow**: Client form → Zod validation → POST to route handler → server-side role recheck → service-role Supabase write → revalidate → return updated record.

---

## Proposed Changes

### 1. Service Layer

#### [NEW] `apps/web/src/features/admin/adminCollegeService.ts`

Server-only module. All mutations use the service-role Supabase client and recheck admin role server-side.

**Functions:**

```
listAllColleges()
  → Returns all colleges (published + draft) for admin list view.
  → Columns: id, slug, name, short_name, ownership, city, state, is_published, updated_at.

getCollegeForEditor(collegeId: string)
  → Returns the full college row + all related data (branches, fees, placements, location_metrics).
  → No publication filter — admin sees everything.
  → Validates UUID format.

updateCollegeIdentity(collegeId: string, data: CollegeIdentityInput)
  → Updates public.colleges row.
  → Zod-validated input.
  → Returns updated college.

upsertBranch(collegeId: string, data: BranchInput)
  → If data.id exists → UPDATE public.college_branches.
  → If data.id is absent → INSERT into public.college_branches.
  → Requires a valid source_id.
  → Sets verification_status = 'published' on admin upsert.

deleteBranch(collegeId: string, branchId: string)
  → Deletes from public.college_branches.
  → Checks that the branch belongs to the college.
  → Cascade behavior: cutoff_records referencing this branch are also deleted (DB FK cascade).

upsertFee(collegeId: string, data: FeeInput)
  → Upsert into public.fees (unique on college_id + academic_year).
  → Sets verification_status = 'published', is_published = true.

deleteFee(collegeId: string, feeId: string)
  → Deletes from public.fees where college_id matches.

upsertPlacement(collegeId: string, data: PlacementInput)
  → Upsert into public.placements (unique on college_id + branch_id + placement_year).
  → Sets verification_status = 'published', is_published = true.

deletePlacement(collegeId: string, placementId: string)
  → Deletes from public.placements where college_id matches.

upsertLocationMetrics(collegeId: string, data: LocationInput)
  → Upsert into public.location_metrics (PK = college_id).
  → Sets verification_status = 'published'.
```

Every function:
1. Calls `requireAdminUser(["admin"])` (reuses existing pattern from `adminReviewService.ts`).
2. Returns `ServiceResult<T>` (same discriminated union pattern).
3. Validates input with Zod before touching the DB.

#### [NEW] `apps/web/src/features/admin/adminCollegeSchemas.ts`

Zod schemas for editor form validation (shared between client forms and server route handlers):

```ts
// College identity
collegeIdentitySchema = z.object({
  name: z.string().min(1).max(300),
  short_name: z.string().max(50).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  ownership: z.enum(["GOVERNMENT", "PRIVATE", "DEEMED", "OTHER"]),
  institute_type: z.string().max(100).optional(),
  affiliated_university: z.string().max(300).optional(),
  established_year: z.number().int().min(1800).max(2100).optional(),
  official_website: z.string().url().optional().or(z.literal("")),
  admission_website: z.string().url().optional().or(z.literal("")),
  placement_website: z.string().url().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().max(10).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  is_published: z.boolean(),
})

// Branch
branchInputSchema = z.object({
  id: z.string().uuid().optional(),           // absent = create
  name: z.string().min(1),
  degree: z.string().min(1),
  duration_years: z.number().int().min(1).max(8),
  intake: z.number().int().min(0).optional(),
  nba_accredited: z.boolean().optional(),
  source_id: z.string().uuid(),
  academic_year: z.string().optional(),
  confidence_level: z.enum(["A","B","C","D","E"]).default("B"),
})

// Fee
feeInputSchema = z.object({
  id: z.string().uuid().optional(),
  academic_year: z.string().min(1),
  tuition_fee: z.number().min(0).optional(),
  hostel_fee: z.number().min(0).optional(),
  mess_fee: z.number().min(0).optional(),
  admission_fee: z.number().min(0).optional(),
  refundable_deposit: z.number().min(0).optional(),
  other_compulsory_fees: z.number().min(0).optional(),
  estimated_four_year_cost: z.number().min(0).optional(),
  source_id: z.string().uuid(),
})

// Placement
placementInputSchema = z.object({
  id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  placement_year: z.string().min(1),
  graduating_students: z.number().int().min(0).optional(),
  students_placed: z.number().int().min(0).optional(),
  placement_percentage: z.number().min(0).max(100).optional(),
  average_package: z.number().min(0).optional(),
  median_package: z.number().min(0).optional(),
  highest_package: z.number().min(0).optional(),
  source_id: z.string().uuid(),
})

// Location metrics
locationInputSchema = z.object({
  nearest_railway_station: z.string().optional(),
  railway_distance_km: z.number().min(0).optional(),
  nearest_airport: z.string().optional(),
  airport_distance_km: z.number().min(0).optional(),
  nearest_major_hospital: z.string().optional(),
  hospital_distance_km: z.number().min(0).optional(),
  public_transport_score: z.number().int().min(0).max(100).optional(),
  city_centre_distance_km: z.number().min(0).optional(),
  technology_ecosystem_score: z.number().int().min(0).max(100).optional(),
  cost_of_living_band: z.enum(["LOW","MEDIUM","HIGH"]).optional(),
  source_id: z.string().uuid(),
})
```

---

### 2. API Route Handlers

All route handlers follow the existing pattern: thin handlers that parse the request, call the service, and return a JSON `ServiceResult`.

#### [NEW] `apps/web/src/app/api/admin/colleges/route.ts`

- `GET` → `listAllColleges()` → JSON list.

#### [NEW] `apps/web/src/app/api/admin/colleges/[id]/identity/route.ts`

- `PUT` → parse body with `collegeIdentitySchema` → `updateCollegeIdentity(id, body)`.

#### [NEW] `apps/web/src/app/api/admin/colleges/[id]/branches/route.ts`

- `POST` → parse body with `branchInputSchema` → `upsertBranch(id, body)`.

#### [NEW] `apps/web/src/app/api/admin/colleges/[id]/branches/[branchId]/route.ts`

- `DELETE` → `deleteBranch(id, branchId)`.

#### [NEW] `apps/web/src/app/api/admin/colleges/[id]/fees/route.ts`

- `POST` → parse body with `feeInputSchema` → `upsertFee(id, body)`.

#### [NEW] `apps/web/src/app/api/admin/colleges/[id]/fees/[feeId]/route.ts`

- `DELETE` → `deleteFee(id, feeId)`.

#### [NEW] `apps/web/src/app/api/admin/colleges/[id]/placements/route.ts`

- `POST` → parse body with `placementInputSchema` → `upsertPlacement(id, body)`.

#### [NEW] `apps/web/src/app/api/admin/colleges/[id]/placements/[placementId]/route.ts`

- `DELETE` → `deletePlacement(id, placementId)`.

#### [NEW] `apps/web/src/app/api/admin/colleges/[id]/location/route.ts`

- `PUT` → parse body with `locationInputSchema` → `upsertLocationMetrics(id, body)`.

---

### 3. UI Pages & Components

#### [NEW] `apps/web/src/app/admin/colleges/page.tsx`

Server Component. Admin college listing page.

- Calls `listAllColleges()`.
- Renders a searchable table with columns: Name, City, State, Ownership, Published (badge), Last Updated.
- Each row links to `/admin/colleges/[id]`.
- Reuses `PageContainer`, `SectionHeader`, `EmptyState`, `ErrorState`.
- Search is a controlled input that filters client-side (small dataset of 30–40 colleges).

#### [NEW] `apps/web/src/app/admin/colleges/[id]/page.tsx`

Server Component shell.

- Calls `getCollegeForEditor(id)`.
- Handles 404 / error states.
- Passes the full data payload to the client component.

#### [NEW] `apps/web/src/app/admin/colleges/[id]/CollegeEditorClient.tsx`

Client Component. The main editor UI. Uses React Hook Form + Zod resolvers.

**Tab structure:**

| Tab | Content |
|-----|---------|
| **Identity** | College name, slug, ownership, location, websites, is_published toggle |
| **Branches** | Table of branches with inline add/edit modal, delete button |
| **Fees** | Table of fee records by academic year, add/edit modal, delete |
| **Placements** | Table of placement records, add/edit modal, delete |
| **Location** | Single form for location metrics (one row per college) |

**UX details:**

- Each tab's form has a "Save" button that POSTs/PUTs to the corresponding API route.
- Save button shows loading spinner, disables during submission.
- Success: toast-style inline message + data refetch via `router.refresh()`.
- Error: inline error message from `ServiceResult.message`.
- Delete buttons show a confirmation dialog before executing.
- The `is_published` toggle on the Identity tab is highlighted with a warning ("Publishing makes this college visible to students").
- Source ID fields show a small helper: the admin can paste a UUID or eventually pick from a source dropdown (paste-only for MVP).

**Branch/Fee/Placement modals:**

- Triggered by "Add" button or "Edit" icon on a table row.
- Modal contains the form fields for that record type.
- On submit: POST to the upsert endpoint → close modal → refresh data.

---

### 4. Navigation Update

#### [MODIFY] `apps/web/src/app/admin/page.tsx`

Add a "Manage colleges" link button alongside the existing "View imports", "Open review queue", and "Check readiness" buttons.

```tsx
<Link href={"/admin/colleges" as Route} className="...">
  Manage colleges
</Link>
```

---

### 5. No Database Migration Required

All tables and RLS policies already exist:

- `public.colleges` — admin `FOR ALL` policy exists (initial migration line 527–530).
- `public.college_branches` — admin `FOR ALL` policy exists (line 537–540).
- `public.fees` — admin `FOR ALL` policy exists (fees migration line 81–85).
- `public.placements` — admin `FOR ALL` policy exists (fees migration line 87–91).
- `public.location_metrics` — admin `FOR ALL` policy exists (initial migration line 567–570).

The service-role client bypasses RLS anyway, but the policies are correct as a defense-in-depth layer.

---

## File Change Summary

| Action | File | Description |
|--------|------|-------------|
| NEW | `features/admin/adminCollegeService.ts` | Server-only service: list, get, update, upsert, delete for all college data |
| NEW | `features/admin/adminCollegeSchemas.ts` | Shared Zod schemas for editor forms and API validation |
| NEW | `app/admin/colleges/page.tsx` | Admin college listing page |
| NEW | `app/admin/colleges/[id]/page.tsx` | Server Component shell for college editor |
| NEW | `app/admin/colleges/[id]/CollegeEditorClient.tsx` | Client Component: tabbed forms for all sections |
| NEW | `app/api/admin/colleges/route.ts` | GET handler for college list |
| NEW | `app/api/admin/colleges/[id]/identity/route.ts` | PUT handler for college identity |
| NEW | `app/api/admin/colleges/[id]/branches/route.ts` | POST handler for branch upsert |
| NEW | `app/api/admin/colleges/[id]/branches/[branchId]/route.ts` | DELETE handler |
| NEW | `app/api/admin/colleges/[id]/fees/route.ts` | POST handler for fee upsert |
| NEW | `app/api/admin/colleges/[id]/fees/[feeId]/route.ts` | DELETE handler |
| NEW | `app/api/admin/colleges/[id]/placements/route.ts` | POST handler for placement upsert |
| NEW | `app/api/admin/colleges/[id]/placements/[placementId]/route.ts` | DELETE handler |
| NEW | `app/api/admin/colleges/[id]/location/route.ts` | PUT handler for location metrics |
| MODIFY | `app/admin/page.tsx` | Add "Manage colleges" link |

**Total: 14 new files, 1 modified file. No migrations.**

---

## States to Handle

Every form and data section must handle:

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton / spinner while server component fetches |
| **Empty** | "No branches added yet" / "No fee records" etc. with an "Add" CTA |
| **Error** | Inline error from ServiceResult, no raw stack traces |
| **Saving** | Button disabled + spinner during mutation |
| **Success** | Brief inline confirmation, data refreshed |
| **Unauthorized** | Redirect to sign-in (handled by admin layout) |
| **Forbidden** | "Admin role required to edit" message for researchers |
| **Not found** | 404 component for invalid college ID |
| **Delete confirm** | Modal/dialog: "Are you sure? This will also remove linked cutoff records." |

---

## Security Checklist

- [ ] All mutation route handlers call `requireAdminUser(["admin"])`.
- [ ] Read-only route handlers call `requireAdminUser(["researcher", "admin"])`.
- [ ] Zod validates every request body before DB writes.
- [ ] College ID is UUID-validated before queries.
- [ ] Delete operations verify the record belongs to the target college.
- [ ] Service-role client is imported only from `server-only` modules.
- [ ] No service-role key or raw SQL errors reach the browser.

---

## Verification Plan

### Type-check
```bash
pnpm -r type-check
```

### Manual Verification

1. **List page**: Sign in as admin → navigate to `/admin/colleges` → verify all colleges appear (published + draft).
2. **Identity edit**: Open a college → edit name → save → verify the name updates on the public `/colleges` page.
3. **Publish toggle**: Set `is_published = false` → verify the college disappears from `/colleges` → set back to `true`.
4. **Branch CRUD**: Add a new branch → verify it appears. Edit it → verify changes. Delete it → verify removal.
5. **Fee CRUD**: Add a fee record for a new academic year → verify it appears on the college detail page.
6. **Placement CRUD**: Add a placement record → verify it shows on the detail page and in comparison.
7. **Location**: Set location metrics → verify they are visible on the college detail page.
8. **Researcher view**: Sign in as researcher → navigate to `/admin/colleges/[id]` → verify forms are read-only / mutation buttons are hidden.
9. **Student blocked**: Sign in as student → navigate to `/admin/colleges` → verify redirect to sign-in or forbidden.
10. **Validation**: Try submitting invalid data (blank name, negative fee, malformed URL) → verify Zod error messages appear inline.

---

## Implementation Order

1. **Schemas** (`adminCollegeSchemas.ts`) — no dependencies, needed by everything else.
2. **Service** (`adminCollegeService.ts`) — depends on schemas.
3. **API routes** — depend on service.
4. **College list page** (`/admin/colleges`).
5. **College editor page + client** (`/admin/colleges/[id]`).
6. **Admin overview link** (modify `page.tsx`).
7. **Testing** — type-check + manual walkthrough.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Slug collision on identity edit | Supabase unique constraint returns an error; the service wraps it as a user-friendly "Slug already in use" message |
| Deleting a branch cascades to cutoff records | Delete confirmation dialog explicitly warns: "This will also delete all cutoff records for this branch" |
| Source ID required but admin may not know it | For MVP, the form accepts a paste-able UUID. Future: dropdown of existing sources. Workaround: admin can check the sources table via Supabase dashboard |
| Large form state on the client | Each tab manages its own form independently; data is fetched once at the page level and passed down |
| Concurrent edits by two admins | Acceptable risk for a 2-person team; Supabase `updated_at` trigger provides a last-write-wins audit trail |
