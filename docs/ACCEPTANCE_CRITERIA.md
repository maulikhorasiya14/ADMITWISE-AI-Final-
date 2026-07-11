# AdmitWise AI — Acceptance Criteria

## 1. Landing page

- Clearly explains product value.
- Primary CTA opens the student profile wizard.
- Works on mobile and desktop.
- Shows trust/data-source explanation.

## 2. Student profile wizard

- Multi-step flow.
- Validates rank or percentile.
- Captures category, state, budget, branch and preferences.
- Allows users to revise answers.
- Prevents invalid total preference weights.
- Saves profile for authenticated users.
- Supports guest flow.

## 3. Recommendation dashboard

- Uses only published data.
- Returns at least one clear empty state when no colleges match.
- Displays Safe, Smart and Ambitious classifications.
- Shows score breakdown.
- Shows missing-data warnings.
- Supports filters.
- Allows compare and save actions.

## 4. College explorer

- Search by college name.
- Filter by state, ownership, branch, fee and hostel.
- Paginated results.
- Displays source-confidence indicator.
- Handles no-results state.

## 5. College details

- Includes overview, cutoff, fee, placement, scholarship, campus reality, location and sources.
- Clearly labels unavailable information.
- Displays academic year with time-sensitive data.
- Does not show unpublished records.

## 6. Comparison

- Compares exactly two colleges.
- Supports branch selection.
- Supports student/parent mode.
- Displays differences in admission, cost, placement, scholarship, location and confidence.
- Generates deterministic recommendation before AI explanation.
- Shows risks and missing data.

## 7. Scholarship matching

- Matches based on entered profile.
- Uses deterministic eligibility rules.
- Uses language such as `potentially eligible`.
- Shows required documents and source.
- Does not guarantee award.

## 8. ROI

- Shows calculation inputs.
- Uses total four-year cost where available.
- Uses median package before average package when available.
- Warns when required values are missing.
- Does not imply guaranteed salary.

## 9. AI counsellor

- Answers from selected published college context.
- Returns source IDs.
- States when information is unavailable.
- Does not create unsupported numbers.
- Handles provider failure gracefully.

## 10. Admin import

- Accepts URL or supported file upload.
- Requires source category and academic year.
- Stores extracted data in staging.
- Displays extraction validation errors.
- Does not publish automatically.

## 11. Verification queue

- Displays original source and extracted values.
- Allows approve, edit, reject and mark unavailable.
- Stores reviewer and timestamp.
- Approved data can be published only by authorized role.
- Public pages reflect only published data.

## 12. Report

- Contains profile, recommendations, comparison, scholarships, costs, risks and sources.
- Printable to PDF.
- Handles missing sections without breaking layout.

## 13. Security

- RLS enabled.
- Guest cannot access admin routes.
- Student cannot read another student's private report.
- Service-role key never reaches browser.
- Unapproved reviews are hidden.

## 14. Prototype demo readiness

The demo must complete this flow without manual database editing:

1. Open landing page.
2. Enter sample profile.
3. Generate recommendations.
4. Open one college.
5. Compare two colleges.
6. View possible scholarship.
7. Ask counsellor a grounded question.
8. Generate report.
9. Show admin staging and verification.
