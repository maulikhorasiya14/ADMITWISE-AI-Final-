# AdmitWise AI Private-Beta Route and Access Matrix

Internal Milestone 10 audit note. Do not render this file in the application.

## Route Access Matrix

| Route or handler | Access | Data read | Mutations | Required filters/checks |
| --- | --- | --- | --- | --- |
| `/` | Public | Static trust messaging | None | No private data |
| `/profile` | Public guest flow | Browser local profile only | Browser localStorage | Zod profile validation |
| `/dashboard` | Public guest flow | Browser local profile, published recommendations through API | None | Published cutoffs, colleges, branches |
| `/colleges` | Public | Published colleges | None | `is_published = true` |
| `/colleges/[slug]` | Public | Published college, branches, fees, placements, scholarships | None | Published/verified records only; draft slug returns 404 |
| `/compare` | Public guest flow | Published branches, fees, placements, cutoffs | None | Exactly two options; published-only service queries |
| `/scholarships` | Public guest flow | Published scholarships and published college-scholarship links | None | `is_published = true` and `verification_status = published` |
| `/counsellor` | Public guest flow | Published evidence for AI grounding | None | No staging/unpublished evidence; question length validation |
| `/reports/new` | Authenticated | Own saved profile or validated browser profile, published recommendation data | Insert own profile copy and own report | `auth.getUser`; `user_id = current user`; snapshot schema validation |
| `/reports/[id]` | Authenticated owner | Own saved report snapshot | None | UUID validation; `id` and `user_id` filter |
| `/admin` | Researcher/Admin | Staging overview | None | Server-side role lookup via service role after user auth |
| `/admin/imports` | Researcher/Admin | Extraction jobs | None | Server-side role lookup |
| `/admin/review` | Researcher/Admin | Staged records | None | Server-side role lookup; staging service only |
| `/admin/review/[recordId]` | Researcher/Admin | Staged record details, conflicts, audit logs | None | UUID validation; server-side role lookup |
| `/api/recommendations` | Public guest flow | Published cutoffs/colleges/branches | None | Zod profile; published-only query |
| `/api/compare` | Public guest flow | Published branches/fees/placements/cutoffs | None | Zod body; exactly two options |
| `/api/scholarships` | Public guest flow | Published scholarships | None | Zod body; published-only query |
| `/api/counsellor` | Public guest flow | Published grounding records | Provider call only | Zod question; timeout; schema-validated model output |
| `/api/reports/preview` | Authenticated | Own/validated profile and published data | None | Auth required; snapshot generated server-side; browser-supplied report/counsellor content ignored |
| `/api/reports` | Authenticated | Own/validated profile and published data | Insert own report | Auth required; snapshot generated server-side; browser-supplied report/counsellor content ignored |
| `/api/auth/session` | Authenticated | Own auth user and roles | None | Browser-supplied roles ignored |
| `/api/admin/imports` | Researcher/Admin | Staging extraction jobs | None | Server-side role lookup |
| `/api/admin/review` | Researcher/Admin | Staged records | None | Server-side role lookup and filter validation |
| `/api/admin/review/[recordId]` | Researcher/Admin | Staged record details | None | UUID validation and server-side role lookup |
| `/api/admin/review/[recordId]/approve` | Researcher/Admin | Staged record and conflicts | Update staged review state, audit log | UUID validation; no validation/conflict blockers |
| `/api/admin/review/[recordId]/reject` | Researcher/Admin | Staged record | Update staged review state, audit log | UUID validation; rejection reason required |
| `/api/admin/review/[recordId]/publish` | Admin only | Approved staged record and conflicts | Upsert public published record, update staging, audit log | UUID validation; admin role; approved-only; no blockers |
| Middleware | Public session refresh | Supabase auth cookies | Cookie refresh only | Browser-safe Supabase env only |

## Supabase/RLS Summary

- Public tables expose only published or explicitly approved records.
- Staging schema tables are protected by researcher/admin policies.
- Reports are owner-only through `user_id = auth.uid()`.
- Student profiles are owner-readable and owner-updatable.
- User roles have RLS enabled and are read in application code only through service-role access after independent user authentication.
- Service-role use is server-only and separated from user-session clients.

## Manual Private-Beta QA Checklist

### Public/student flow

- Landing page renders without sign-in.
- Profile create/edit works and invalid rank, percentile, branch and weight inputs are rejected.
- Dashboard shows profile summary, recommendations or a clear no-data state.
- Colleges list hides draft records.
- Draft/unknown college detail URLs return not found.
- Comparison requires exactly two options and preserves missing-data warnings.
- Scholarships show eligibility statuses without guarantees.
- Counsellor returns grounded, insufficient-data or configuration states without exposing internals.
- Report preview requires sign-in.
- Saved report cannot be viewed after sign-out.
- Print/Save as PDF hides navigation and keeps disclaimer visible.

### Admin flow

- Student account cannot open `/admin`.
- Researcher account can review but cannot publish.
- Admin account can publish only approved records.
- Invalid or unapproved staged records cannot publish.
- Reject requires a reason.
- Malformed staged record URLs return a controlled error/not-found state.

### Failure scenarios

- Missing profile.
- Empty published dataset.
- Missing Gemini API key.
- Provider failure.
- Malformed report ID.
- Another user's report ID.
- Unauthorized admin route.
- Invalid JSON request bodies.

## Milestone 12 Private-Beta QA Matrix

Internal checklist for demo-readiness verification. This is not a public page.

| Route | Access | Primary action | Required states | Data boundary | Demo outcome |
| --- | --- | --- | --- | --- | --- |
| `/` | Public | Start profile or explore colleges | Loading via app shell, safe generic error boundary | Static public content only | Clear beta-ready value proposition without stale scaffold wording |
| `/auth/sign-in` | Public | Email/password sign-in | Auth error, forbidden role message, disabled submit while pending | Supabase browser anon client only | Admin/researcher users reach `/admin`; students reach dashboard or are blocked from admin |
| `/profile` | Public guest flow | Create or edit saved profile | Validation errors, final review, local save success | Browser localStorage profile only | Valid profile can be saved and used by dashboard, compare, scholarships and reports |
| `/dashboard` | Public guest flow | View profile and recommendations | No-profile, loading, no published cutoff data, safe fetch error | Published colleges, branches and cutoffs only | Recommendations appear when verified published cutoff data exists, otherwise clear empty state |
| `/colleges` | Public | Search/filter published colleges | Loading, empty, Supabase unavailable error | `is_published = true` colleges only | Draft demo college remains hidden |
| `/colleges/[slug]` | Public | Inspect college details | Not found for draft/unknown, missing sections show unavailable copy | Published college, branches, fees, placements, scholarships only | Missing facts are labeled `Data not publicly available` |
| `/compare` | Public guest flow | Compare exactly two options | No profile, not enough options, loading, empty comparison, safe API error | Published college-branch options and published factual records only | Student/Parent mode comparison works without implying guarantees |
| `/scholarships` | Public guest flow | View potential scholarship matches | No profile, loading, no matches, safe API error | Published scholarships and college links only | Eligibility remains cautious and never guaranteed |
| `/counsellor` | Public guest flow | Ask grounded question | Empty, loading, missing AI key, provider failure, insufficient evidence | Published evidence only; server-side Gemini key only | Controlled answer or controlled limitation message |
| `/reports/new` | Authenticated | Preview and generate report | Sign-in redirect, no profile, preview loading/error, duplicate-submit disabled | Own/validated profile and published report data only | Preview matches saved snapshot; disclaimer remains visible |
| `/reports/[id]` | Authenticated owner | View and print saved report | Sign-in redirect, not found, malformed/unsafe snapshot error | `id` plus current user ID filter | Other users' reports stay inaccessible; print hides navigation |
| `/admin` | Researcher/Admin | View staging overview | Sign-in redirect, forbidden student, empty jobs, safe load error | Staging via server-side role check only | Counts and recent jobs display without exposing staging publicly |
| `/admin/imports` | Researcher/Admin | Inspect extraction jobs | Sign-in redirect, forbidden student, empty imports, safe load error | Staging via server-side role check only | Import rows link to review queue |
| `/admin/review` | Researcher/Admin | Filter staged records | Sign-in redirect, forbidden student, empty filtered result, safe load error | Staging via server-side role check only | Filters do not crash when no records exist |
| `/admin/review/[recordId]` | Researcher/Admin | Inspect/approve/reject/publish | Not found for missing ID, validation blockers, conflicts, reject reason, publish confirmation | Staging and public writes via server-side role checks | Researchers can review; only admins can publish approved valid records |

### Cross-Route Checks

- Mobile widths checked at approximately 360 px, 768 px, 1024 px and desktop width.
- Keyboard access checked for navigation, forms, filters, report controls and admin actions.
- Wide data tables must use controlled horizontal scrolling.
- User-facing errors must avoid stack traces, SQL details, internal paths and secret names.
- Historical cutoffs, placement packages, ROI and scholarship matches must never be worded as guarantees.
