# AdmitWise AI Private-Beta Release Checklist

Internal document. Do not render this as a public application page.

## A. Required Supabase Setup

Apply migrations in chronological order only once:

1. `supabase/migrations/20260616090000_initial_schema.sql`
2. `supabase/migrations/20260617093000_cutoff_recommendations.sql`
3. `supabase/migrations/20260624090000_fees_placements_roi.sql`
4. `supabase/migrations/20260624100000_scholarship_matching.sql`
5. `supabase/migrations/20260624110000_official_data_ingestion_staging.sql`
6. `supabase/migrations/20260624120000_admin_review_workflow.sql`
7. `supabase/migrations/20260625100000_report_snapshots.sql`

Confirm migrations by checking that the expected tables exist in Supabase:

- Public: `colleges`, `college_branches`, `cutoff_records`, `fees`, `placements`, `scholarships`, `college_scholarships`, `reports`, `user_roles`.
- Staging: `extraction_jobs`, `source_files`, `staged_records`, `data_conflicts`, `review_audit_logs`.

Do not rerun destructive or duplicate migrations. If a migration partially failed, stop the demo and compare the cloud schema with the migration file before retrying. Rollback is manual for this prototype: restore from Supabase backup or reverse only the failed migration with reviewed SQL.

Required RLS and role policies:

- Student/public pages can read only published public records.
- Reports are owner-only through `user_id = auth.uid()`.
- Staging tables are readable only by researcher/admin policies.
- Admin publishing actions require application role `admin`.
- Researcher may review but may not publish.

Pending SQL requirement: none for Milestone 14. Do not run migrations during QA unless a confirmed security bug requires a minimal reviewed migration.

## B. Required Environment Variables

Browser-safe:

- `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-browser-safe-anon-key`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`

AI feature:

- `GEMINI_API_KEY=your-gemini-api-key`
- `GEMINI_MODEL=gemini-1.5-flash`

`GEMINI_MODEL` is optional. `GEMINI_API_KEY` is required only for live counsellor answers; without it the counsellor must show a controlled configuration message.

Never put service-role, Gemini or private keys in `NEXT_PUBLIC_` variables. Never commit `.env.local`.

## C. Admin and Researcher Setup

Users sign in through Supabase email/password. Roles are stored in `public.user_roles`:

- `student`: normal user; no admin access.
- `researcher`: can read staging, review records and approve/reject where allowed.
- `admin`: can publish approved valid staged records.

Verify roles safely:

```sql
select role
from public.user_roles
where user_id = '<auth user uuid>';
```

Do not include real user IDs or emails in committed docs. Do not allow self-service role escalation. Add roles only through trusted admin SQL or a reviewed admin tool.

## D. Required Demo-Data State

Minimum for one college to appear publicly:

- `public.colleges.is_published = true`.
- Student-facing route must use `is_published = true`.

Minimum for recommendations:

- Published college.
- Published branch.
- Published cutoff record with `verification_status = 'published'` and `publication_status = 'published'`.
- Matching exam, year, category, quota/gender pool where applicable.

Minimum for comparison:

- Two published college-branch options.
- Published fee and placement records improve ROI, but missing values must remain unavailable.

Minimum for ROI:

- Published fees with academic year and source.
- Published placement record with placement year and source.
- Median package preferred over average package when both exist.

Minimum for scholarships:

- Published scholarship records.
- Published college-scholarship links when college-specific.
- Eligibility must remain `potentially eligible`, `not eligible`, `more information required`, or `deadline passed`.

Readiness criteria:

- See `docs/DEMO_DATA_READINESS.md`.
- Staged and approved-unpublished records must not count as published.
- Missing source references block or reduce readiness according to config.

Never fabricate demo facts. Records must remain staged until reviewed and explicitly published.

## E. Route And Access Matrix

| Route or operation | Expected access | Primary action | Tables/services used | Publication filters | Ownership checks | Loading | Empty | Error | Unauthorized | Mobile | Demo status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Public | Start profile or explore colleges | Static UI | Not applicable | Not applicable | Ready | Not applicable | Global error | Not applicable | Ready | Ready |
| `/auth/sign-in` | Public | Email/password sign-in | Supabase browser auth, `/api/auth/session` | Not applicable | Browser roles ignored | Button disabled | Not applicable | Safe auth message | Not applicable | Ready | Ready |
| Sign out | Signed-in user | End session | Supabase server auth | Not applicable | Current session | Not applicable | Not applicable | Redirect fallback | Not applicable | Ready | Ready |
| `/profile` | Public guest | Save local profile | Local storage, Zod | Not applicable | Browser-local only | Ready | Ready | Validation messages | Not applicable | Ready | Ready |
| `/dashboard` | Public guest | Show profile and recommendations | Local profile, recommendations API | Published cutoffs, branches, colleges | Not applicable | Ready | No profile/no cutoffs | Safe API error | Not applicable | Ready | Ready with limitation |
| `/colleges` | Public | Search colleges | `listPublishedColleges` | `is_published = true` | Not applicable | Ready | No published colleges | Safe Supabase error | Not applicable | Ready | Ready with limitation |
| `/colleges/[slug]` | Public | View college detail | Published college query, fees, placements, scholarships | Published only | Not applicable | Ready | 404 for draft/unknown | Safe error | Not applicable | Ready | Ready with limitation |
| `/compare` | Public guest | Compare exactly two options | Comparison service | Published options, fees, placements, cutoffs | Not applicable | Ready | Not enough options | Safe API error | Not applicable | Ready | Ready with limitation |
| `/scholarships` | Public guest | Match scholarships | Scholarship service | Published scholarships and links | Not applicable | Ready | No matches/no profile | Safe API error | Not applicable | Ready | Ready with limitation |
| `/counsellor` | Public guest | Ask grounded question | Published evidence, Gemini provider | Published evidence only | Not applicable | Ready | Ask prompt/insufficient data | Controlled provider/config error | Not applicable | Ready | Ready with limitation |
| `/reports/new` | Authenticated | Preview and save report | Report service | Published-only snapshot inputs | Current auth user | Ready | No profile | Safe preview/save error | Redirect to sign-in | Ready | Ready with limitation |
| `/reports/[id]` | Authenticated owner | View/print saved report | `reports` table | Snapshot already generated from published data | `id` plus `user_id` | Ready | 404 malformed/unknown | Safe invalid snapshot error | Redirect to sign-in | Ready | Ready |
| `/admin` | Researcher/Admin | View admin overview | Staging service | Not public | Server role lookup | Ready | No jobs | Safe role/data error | Redirect or forbidden | Ready | Ready |
| `/admin/imports` | Researcher/Admin | Inspect jobs | `staging.extraction_jobs` | Not public | Server role lookup | Ready | No jobs | Safe data error | Redirect or forbidden | Ready | Ready |
| `/admin/review` | Researcher/Admin | Filter staged records | `staging.staged_records` | Not public | Server role lookup | Ready | Empty queue/filter | Safe data error | Redirect or forbidden | Ready | Ready |
| `/admin/review/[recordId]` | Researcher/Admin | Inspect/review record | Staged record, conflicts, source file, audit logs | Not public | Server role lookup, UUID validation | Ready | No history/conflicts | Safe malformed/data error | Redirect or forbidden | Ready | Ready |
| Approve staged record | Researcher/Admin | Mark approved | Staged record service | Not public | Server role lookup | Button disabled | Not applicable | Validation/conflict message | Forbidden | Ready | Ready |
| Reject staged record | Researcher/Admin | Mark rejected | Staged record service | Not public | Server role lookup | Button disabled | Reason required | Safe action error | Forbidden | Ready | Ready |
| Publish staged record | Admin only | Write public table | Staging and public tables | Publishes approved valid records only | Admin role rechecked server-side | Button disabled | Not applicable | Conflict/validation message | Forbidden | Ready | Ready |
| `/admin/data-readiness` | Researcher/Admin | Check demo readiness | Public tables plus staging counts | Published rows counted separately | Server role lookup | Ready | Empty filters/database | Safe data error | Redirect or forbidden | Ready | Ready |
| `/admin/data-readiness/[collegeId]` | Researcher/Admin | Inspect readiness detail | Readiness service | Staged never counted as published | Server role lookup, UUID validation | Ready | 404 unknown | Safe malformed/data error | Redirect or forbidden | Ready | Ready |
| Readiness export API | Researcher/Admin | CSV/JSON metadata export | Readiness service | Published counts only; no raw data | Server role lookup | Not applicable | Header-only CSV | Safe JSON error | 401/403 JSON | Not applicable | Ready |

## F. Student Browser QA Checklist

- [ ] Landing page primary actions are visible.
- [ ] Sign-in works for a known user.
- [ ] Sign-out redirects safely.
- [ ] Profile creation validates exam, rank/percentile, branches, budget and weights.
- [ ] Profile edit preserves saved values.
- [ ] Dashboard shows profile summary.
- [ ] Dashboard shows recommendations only when published cutoff data exists.
- [ ] No recommendations state explains missing published cutoff data.
- [ ] Colleges list hides draft records.
- [ ] Unknown or draft college slug returns not found.
- [ ] College detail labels missing branches, fees, placements, cutoffs, scholarships and location honestly.
- [ ] Compare requires exactly two different published options.
- [ ] Comparison does not imply guaranteed admission, placement, package or salary.
- [ ] Scholarships use cautious eligibility wording.
- [ ] Counsellor handles configured AI, missing AI key, provider failure and insufficient evidence.
- [ ] Report preview requires authentication.
- [ ] Report generation disables duplicate submission while saving.
- [ ] Saved report is readable and printable.
- [ ] Malformed report ID returns not found.
- [ ] Another user's report ID is inaccessible.
- [ ] Print or Save as PDF keeps evidence and disclaimer visible.

## G. Admin Browser QA Checklist

- [ ] Unauthenticated users cannot access admin pages.
- [ ] Student users cannot access admin pages.
- [ ] Researcher can view imports/review but cannot publish.
- [ ] Admin can publish only approved valid staged records.
- [ ] Review filters work with empty and populated queues.
- [ ] Raw and normalized values are visible only on admin review detail.
- [ ] Validation errors block approval.
- [ ] Blocking conflicts block publication.
- [ ] Rejection requires a reason.
- [ ] Publish requires confirmation.
- [ ] Already published records cannot be published again.
- [ ] Data readiness does not count staged-only records as published.
- [ ] Data readiness does not count approved-unpublished records as published.
- [ ] Readiness export excludes raw extracted data, normalized data, validation arrays, audit logs and secrets.

## H. Security Checklist

- [ ] `.env.local` is ignored by Git.
- [ ] `.env.example` contains placeholders only.
- [ ] No service-role key in browser code.
- [ ] No Gemini key in browser code.
- [ ] No private key uses `NEXT_PUBLIC_`.
- [ ] Middleware uses only browser-safe Supabase credentials.
- [ ] Service-role client is imported only by server-only modules.
- [ ] Browser network responses contain no private environment values.
- [ ] Staging tables are inaccessible publicly.
- [ ] Student-facing queries use published-only filters.
- [ ] Report ownership is enforced by user ID.
- [ ] Admin actions re-check authorization server-side.
- [ ] Raw stack traces, SQL errors and secrets are not shown to users.

If a secret is accidentally exposed, stop the demo, remove the value from Git/source, rotate the key in the provider dashboard and Supabase, and invalidate any affected sessions.

## I. Demo Do And Do Not

Do:

- Explain that outputs use verified historical data.
- Show source evidence and academic/placement years.
- Use the readiness dashboard for demo data health.
- Demonstrate missing-data handling honestly.
- Explain staging, review, approval and publishing.
- State current private-beta limitations.

Do not:

- Claim historical cutoffs are official future cutoffs.
- Guarantee admission.
- Guarantee placement.
- Guarantee salary/package.
- Guarantee scholarship approval.
- Use unverified data.
- Expose staging records to students.
- Expose service-role credentials.
- Bypass admin review.
- Publish fabricated records.

## J. Known Limitations And Rollback Notes

Known beta limitations:

- The app may show empty states until verified published data is added.
- Guest student profiles are stored locally in the browser prototype flow.
- AI counsellor requires server-side Gemini configuration.
- Recommendations depend on published cutoff coverage for the profile year/category/quota.
- ROI depends on published fee and placement data.
- Readiness percentages are coverage signals, not quality guarantees.

Unavailable or limited categories:

- Maps and travel intelligence are not part of this milestone.
- Reviews/campus reality are not public product features yet.
- Recruiter publishing remains limited.

Disable AI safely:

1. Remove or unset `GEMINI_API_KEY` on the server.
2. Restart the web app.
3. Confirm `/counsellor` shows the controlled configuration message.

Stop the demo if:

- A student can open admin pages.
- A user can view another user's report.
- A draft or staging record appears on a student-facing page.
- A browser response includes a private key or raw extracted data.
- A server error exposes SQL, stack traces or secrets.

Recovery:

- Stop the web app.
- Rotate exposed secrets.
- Revoke affected Supabase sessions if necessary.
- Restore database from Supabase backup if accidental public data writes occurred.
- Re-run lint, type-check, tests, build and audit before resuming.
