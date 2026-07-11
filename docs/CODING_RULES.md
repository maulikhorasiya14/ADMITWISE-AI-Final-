# AdmitWise AI — Coding Rules

## TypeScript

- Enable strict mode.
- Do not use `any` unless a comment explains why.
- Prefer discriminated unions for status and result types.
- Validate all request bodies, URL parameters and AI responses with Zod.
- Keep database types generated from Supabase.
- Use server-only modules for service-role operations.

## Next.js

- Use App Router.
- Prefer Server Components for data-fetching pages.
- Use Client Components only for interaction, forms, charts and local state.
- Keep route handlers thin; call services for business logic.
- Use loading and error boundaries.
- Use dynamic rendering only where necessary.
- Do not expose secrets in `NEXT_PUBLIC_*` variables.

## UI

- Build mobile-first.
- Use accessible labels and keyboard navigation.
- Do not rely on colour alone to express status.
- Every score must include text and explanation.
- Every factual number must display source/year metadata where appropriate.
- Provide loading, empty and error states.
- Do not hide missing data.
- Limit comparison to two colleges in MVP.

## Database

- Use migrations for schema changes.
- Do not edit production schema manually through dashboard only.
- Add indexes for:
  - college slug
  - cutoff lookup fields
  - scholarship eligibility fields
  - verification status
  - academic year
- Use foreign keys.
- Use database constraints for impossible values.
- Use Row Level Security.
- Never query staging tables from public pages.

## AI

- AI may explain, summarize and extract.
- AI may not calculate official admission eligibility.
- AI may not invent facts.
- AI output must be schema validated.
- Store evidence source IDs with AI output.
- Return `insufficientData = true` when evidence is weak.
- Never send unnecessary personal data to the model.

## Python pipeline

- Each extractor should handle one source type.
- Save raw source files before transformation.
- Produce structured JSON matching Pydantic schemas.
- Preserve source URL, date and academic year.
- Add anomaly flags rather than silently correcting uncertain data.
- Write idempotent import operations.
- Do not bypass the staging workflow.

## Security

- Keep service-role and AI keys server-side.
- Add rate limiting to AI and admin import endpoints before public launch.
- Sanitize rendered user review content.
- Restrict file types and sizes.
- Never log passwords, tokens or sensitive student details.
- Use least-privilege database policies.

## Git

- Use short feature branches.
- Commit small logical changes.
- Suggested prefixes:
  - `feat:`
  - `fix:`
  - `refactor:`
  - `test:`
  - `docs:`
  - `chore:`
- Do not commit `.env` files.
- Keep seed data separate from real verified data.

## Tests

Minimum required:

- unit tests for scoring functions
- validation tests for profile and cutoff schemas
- integration test for published-only college retrieval
- end-to-end test for profile → recommendations → compare
- admin test ensuring staging records do not appear publicly

## Performance

- Paginate college explorer.
- Select only required database columns.
- Avoid passing full source documents to the browser.
- Cache public college pages.
- Avoid premature microservices.

## Logging

Log:

- request or job ID
- operation
- duration
- status
- safe error details

Do not log:

- API keys
- raw passwords
- unredacted identity documents
- full sensitive student profiles
