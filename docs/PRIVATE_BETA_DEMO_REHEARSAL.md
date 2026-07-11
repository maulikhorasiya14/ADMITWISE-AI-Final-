# AdmitWise AI Private-Beta Demo Rehearsal

Internal Milestone 15 rehearsal note. Do not render this as a public application page.

## Rehearsal Context

- Date: 2026-06-27
- App URL tested: `http://127.0.0.1:3000`
- Repository root: `C:\Users\Mauli Khorasiya\OneDrive\Desktop\Admitwise`
- Branch: `main`
- Commit at start: `f728ed4`
- Primary checklist: `docs/PRIVATE_BETA_RELEASE_CHECKLIST.md`
- Browser method: in-app browser automation against the already-running local app.
- Data-changing actions: none. No migrations, inserts, updates, approvals, rejections, publishing, role changes or seed execution were performed.

## Environment Readiness

| Item | Result | Evidence |
| --- | --- | --- |
| AdmitWise project root | PASS | Root contains the expected workspace and docs structure. |
| Web app reachable | PASS | `http://127.0.0.1:3000` returned HTTP 200 before browser checks. |
| `apps/web/.env.local` exists | PASS | Required key names are present locally; values were not displayed. |
| Root `.env.local` | NOT PRESENT | Expected for this setup; the web app uses `apps/web/.env.local`. |
| Supabase migrations | NOT RUN | Milestone 15 does not run migrations. Existing migration files were only inspected/listed. |
| Published demo data | LIMITED | Student-facing pages showed empty states because no published demo college/cutoff dataset was available in the browser rehearsal. |
| Admin/researcher credentials | BLOCKED | No test admin/researcher/student credential set was provided during the rehearsal. |
| Mobile viewport check | NOT TESTED | The available browser control API did not expose viewport resizing in this session. |

## Browser Rehearsal Results

Only routes actually observed in the browser are marked PASS.

| Flow | Status | Evidence |
| --- | --- | --- |
| Landing page `/` | PASS | Rendered `Evidence-first engineering admission decisions`, public nav and private-beta trust copy. |
| Profile form `/profile` | PASS | Multi-step form rendered with exam, preferences, weights and review steps. |
| Profile save to dashboard | PASS | Synthetic local-only profile was saved through the UI and redirected to `/dashboard`. |
| Dashboard profile summary | PASS | Dashboard showed saved profile values, `Edit Profile`, `Explore Colleges` and no-cutoff empty state. |
| Colleges list `/colleges` | PASS | Rendered `Explore published colleges` and `No published colleges found`; no draft college appeared. |
| Unknown college `/colleges/not-a-real-college` | PASS | Rendered controlled `Page not found` state. |
| Compare `/compare` | PASS | Rendered comparison page with `Not enough published options` empty state. |
| Scholarships `/scholarships` | PASS | Rendered scholarship page with `Scholarship matching not ready` empty state. |
| Counsellor `/counsellor` | PASS | Rendered grounded admission counsellor page without stack traces or secret labels. |
| Report creation `/reports/new` when signed out | PASS | Redirected to `/auth/sign-in?next=/reports/new`. |
| Admin `/admin` when signed out | PASS | Redirected to `/auth/sign-in?next=/admin`. |
| Admin readiness `/admin/data-readiness` when signed out | PASS | Redirected to `/auth/sign-in?next=/admin`. |
| Sign-in page `/auth/sign-in` | PASS | Rendered email/password form. |
| Admin readiness export API when signed out | PASS | Returned HTTP 401. |
| Visible secret scan on sampled pages | PASS | Sampled pages did not display service-role, Gemini key labels or stack-like text. |
| Sign-in success | NOT TESTED | Blocked by no provided beta credential set. |
| Sign-out | NOT TESTED | Blocked by no signed-in session created during this rehearsal. |
| Student forbidden from admin | NOT TESTED | Requires a known signed-in student account. |
| Researcher admin review workflow | NOT TESTED | Requires a known researcher account and staged records; no data-changing actions were allowed. |
| Admin publishing workflow | NOT TESTED | Requires a known admin account and approved staged records; publishing was explicitly out of scope. |
| Report preview/save | NOT TESTED | Requires a signed-in user. |
| Saved report ownership checks | NOT TESTED | Requires at least two signed-in test users and existing reports. |

## Demo Walkthrough Script

### Public Student Flow

1. Open `/`.
2. Explain that private beta is evidence-first and uses published, verified records only.
3. Open `/profile`.
4. Fill a synthetic local profile and show validation/review before saving.
5. Save and show `/dashboard`.
6. Point out that recommendations appear only after published cutoff data exists.
7. Open `/colleges`.
8. Show that no draft records appear and the empty state is honest.
9. Open `/compare` and `/scholarships`.
10. Explain that empty states are expected until verified published records exist.
11. Open `/counsellor`.
12. Explain that AI answers must be grounded in published evidence and missing information must be disclosed.

### Protected Flow

1. Open `/reports/new` while signed out and show redirect to sign-in.
2. Open `/admin` while signed out and show redirect to sign-in.
3. If test credentials are available, sign in as student, researcher and admin separately.
4. Confirm student cannot access admin routes.
5. Confirm researcher can review staging but cannot publish.
6. Confirm admin can publish only approved, valid staged records.

The protected credential-based flow was not executed in this rehearsal because no beta credential set was provided.

## Demo Do And Do Not

Do:

- Say the app is ready for private-beta walkthrough with limited/no published demo data.
- Emphasize that empty states are intentional when verified data is missing.
- Show that draft and staging data are not student-facing.
- Explain that recommendations, ROI, scholarships and AI are deterministic or grounded and never guarantees.

Do not:

- Claim admission, placement, package, salary or scholarship certainty.
- Publish staged data during the demo.
- Run migrations during the demo.
- Display or paste environment variable values.
- Treat staged or approved-unpublished data as public product data.

## Validation Results

Completed after creating this document:

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm.cmd --filter @admitwise/web lint` | PASS | ESLint completed successfully. |
| `pnpm.cmd --filter @admitwise/web type-check` | PASS | TypeScript completed with `tsc --noEmit`. |
| `pnpm.cmd --filter @admitwise/web exec node --test tests\readiness.test.ts tests\security.test.ts` | PASS | 12 focused tests passed. Node emitted non-failing ES module reparsing warnings. |
| `pnpm.cmd --filter @admitwise/web test` | PASS | 92 web tests passed. Node emitted non-failing ES module reparsing warnings. |
| `pnpm.cmd --filter @admitwise/web build` | PASS | Next.js production build completed successfully. |
| `pnpm.cmd audit --audit-level moderate` | PASS | No known vulnerabilities found. |

Python tests are not required unless Python/data-pipeline files are changed during Milestone 15.

## Go/No-Go

Final recommendation: GO WITH LIMITATIONS for a local private-beta walkthrough that is honest about empty data states.

Required before a fuller stakeholder demo:

- Provide known Supabase email/password test users for student, researcher and admin roles.
- Confirm at least one published demo dataset if the demo should show recommendations, comparison, ROI or scholarships.
- Rehearse mobile widths manually in a normal browser.
- Re-run the validation commands above after any additional fixes.
