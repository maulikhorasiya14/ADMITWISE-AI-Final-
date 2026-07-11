# AdmitWise AI — Technical Architecture

## 1. System overview

```text
Student/Admin Browser
        |
        v
Next.js Web Application
- UI
- Server Components
- Route Handlers
- Deterministic scoring
- AI orchestration
        |
        v
Supabase
- PostgreSQL
- Authentication
- Storage
- Row Level Security
        ^
        |
Published verified data only

Python Data Pipeline
- source download
- webpage parsing
- PDF/table extraction
- normalization
- AI-assisted extraction
        |
        v
Staging tables
        |
        v
Human verification
        |
        v
Published tables
```

## 2. Monorepo structure

```text
admitwise/
├─ apps/
│  ├─ web/
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  ├─ components/
│  │  │  ├─ features/
│  │  │  ├─ lib/
│  │  │  └─ types/
│  │  └─ tests/
│  └─ data-pipeline/
│     ├─ app/
│     ├─ extractors/
│     ├─ normalizers/
│     ├─ schemas/
│     ├─ tests/
│     └─ scripts/
├─ packages/
│  ├─ shared-types/
│  └─ scoring/
├─ supabase/
│  ├─ migrations/
│  ├─ seed/
│  └─ functions/
├─ docs/
└─ .github/
```

For speed, it is acceptable to start with `web/` and `data-pipeline/` as two top-level folders rather than configuring complex workspace tooling.

## 3. Main web stack

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Recharts
- Supabase client/server helpers

## 4. Data-pipeline stack

- Python
- FastAPI
- Pydantic
- httpx/requests
- BeautifulSoup
- Playwright
- pandas
- PyMuPDF or pdfplumber
- Camelot where appropriate
- openpyxl
- RapidFuzz

## 5. AI architecture

Use an interface rather than calling a provider directly from pages.

```ts
export interface AIProvider {
  explainRecommendation(input: RecommendationContext): Promise<AIExplanation>;
  summarizeReviews(input: ReviewInput[]): Promise<ReviewSummary>;
  extractStructuredData(input: ExtractionInput): Promise<ExtractionResult>;
}
```

Rules:

- prompts must receive structured verified context
- responses must use a Zod schema
- the model must return `insufficient_data` when evidence is missing
- AI output must never be stored as verified fact without review

## 6. Scoring architecture

Create pure functions in a shared scoring module.

```text
scoreAdmissionChance()
scoreBranchFit()
scoreFinancialFit()
scorePlacement()
scoreScholarshipFit()
scoreLocation()
scoreCulture()
scoreDataConfidence()
scoreOverallFit()
classifyRecommendation()
detectDecisionRisks()
```

Pure functions must:

- accept typed input
- return typed output
- include component breakdown
- never query the database directly
- be unit-testable

## 7. Data publication lifecycle

```text
extracted
  -> needs_review
  -> approved
  -> published
```

Alternative terminal states:

```text
rejected
archived
```

Student-facing code must query only `published`.

## 8. Authentication and roles

Roles:

- `student`
- `researcher`
- `admin`

Permissions:

### Student

- read published data
- save profile
- save colleges
- generate reports
- submit review

### Researcher

- read staging
- edit extracted records
- approve low-risk records when authorized
- add sources

### Admin

- all researcher abilities
- publish/archive
- manage users
- resolve conflicts
- edit college records

## 9. Row Level Security

Minimum policies:

- public/guest can read only published college data
- students can read/write only their own profile, saved colleges and reports
- researchers/admins can access staging according to role
- only admins can publish or archive
- source files are private unless explicitly public

## 10. Caching

Prototype:

- use Next.js fetch caching and revalidation for public college pages
- do not add Redis

Later:

- add queue/cache only after real usage requires it

## 11. Error strategy

Use typed error codes:

```text
VALIDATION_ERROR
NOT_FOUND
UNAUTHORIZED
FORBIDDEN
DATA_INCOMPLETE
AI_PROVIDER_ERROR
EXTRACTION_ERROR
SOURCE_UNAVAILABLE
CONFLICT_DETECTED
```

User-facing messages must be understandable and must not expose internal stack traces.

## 12. Environment variables

Expected variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
NEXT_PUBLIC_APP_URL

# Optional later
GOOGLE_MAPS_API_KEY
SENTRY_DSN
```

The service-role key must never be exposed to the browser.

## 13. Deployment

- Web: Vercel
- Database/Auth/Storage: Supabase
- Python service: local during early prototype, Render/Railway later
- Repository: GitHub
- CI: lint + type-check + tests on pull request
