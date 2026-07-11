# Private-Beta Data Readiness

This checklist is for internal admin and researcher use before showing a college in a private-beta demo.

## Readiness States

- `not_started`: no meaningful published or staged data exists yet.
- `staged`: records exist in staging but have not been reviewed.
- `needs_review`: at least one staged record needs human review.
- `blocked`: required evidence is missing, a source is missing, or a conflict/validation issue is open.
- `approved_unpublished`: records were approved by review but are not published.
- `partially_published`: some public evidence is available, but demo coverage is incomplete.
- `demo_ready`: required public evidence is complete and no blocking review issue remains.

## Required Demo Coverage

The readiness evaluator uses the centralized config in `apps/web/src/features/readiness/readinessTypes.ts`.

Current private-beta requirements:

- Published college identity.
- At least one published branch.
- Published cutoff records for admission years 2023, 2024 and 2025.
- Published fee record.
- Published placement record.
- Scholarship link when verified data exists.
- Published records must carry source references.
- No unresolved data conflict.
- No staged validation error waiting outside rejection.

## Completeness Formula

Completeness is deterministic and separate from student scoring:

- College identity: 20 points.
- Branches: 20 points.
- Cutoffs: 30 points.
- Fees: 8 points.
- Placements: 8 points.
- Scholarships: 4 points.
- Source references: 10 points.

No AI is used. Missing data is shown as missing; the app must not invent values or treat missing numbers as zero.

## Safe Workflow

1. Collect official sources through the ingestion pipeline.
2. Store extracted output only in staging.
3. Review staged records as researcher or admin.
4. Resolve conflicts and validation issues.
5. Approve verified records.
6. Publish only through controlled admin actions.
7. Re-check `/admin/data-readiness`.

Do not publish staging records automatically. Do not add fake real-college data. Use test fixtures only inside automated tests.

## Import Templates

The files in `docs/import-templates/` are empty templates with headers only:

- `sources_template.csv`
- `colleges_template.csv`
- `branches_template.csv`
- `cutoffs_template.csv`
- `fees_template.csv`
- `placements_template.csv`
- `scholarships_template.csv`

Keep real official data out of the repository unless it is meant to be committed and does not contain secrets or private information.
