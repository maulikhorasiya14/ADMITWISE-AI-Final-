# AdmitWise AI — Permanent Project Context

## Product summary

AdmitWise AI is an AI-assisted decision platform for Indian engineering admissions.

It is not merely a college predictor. It combines:

- rank and cutoff matching
- branch-versus-college trade-off analysis
- fee and ROI analysis
- scholarship discovery
- placement transparency
- location intelligence
- student and parent perspectives
- verified campus-reality inputs
- source confidence and freshness
- AI explanations grounded in approved data

## Target users

### Primary

- Indian engineering aspirants
- students participating in JoSAA, CSAB, state counselling and private-university admission processes
- parents helping make financial and safety decisions

### Secondary

- college researchers/data verifiers
- administrators maintaining college records
- later: colleges and verified student contributors

## Team and timeline

- Team size: 2 people
- Timeline: about 20 days
- Prototype dataset: 30–40 colleges
- Priority: polished working vertical flow over broad incomplete coverage

## Main user problems

Students currently face:

- fragmented cutoff information
- unclear branch-versus-college decisions
- misleading placement emphasis on highest package
- difficulty finding applicable scholarships
- uncertainty about actual four-year cost
- lack of trustworthy college-culture data
- weak understanding of location and travel impact
- generic recommendations that ignore student priorities

## Differentiation

Existing tools often answer:

> Which colleges might I get?

AdmitWise should answer:

> Which option fits me best, why, what will it cost, what evidence supports it, what risks exist and what should I do next?

## Core product modules

1. Student Profile
2. Admission Recommendation Engine
3. College Explorer
4. College Detail Intelligence
5. College Comparison
6. Branch-vs-College Decision Engine
7. Fees and ROI
8. Scholarship Matching
9. Placement Intelligence
10. Campus Reality
11. Location Intelligence
12. Parent Mode and Student Mode
13. Decision Risk Warnings
14. AI Counsellor
15. Source Verification
16. Admin Import and Review
17. Final Report

## MVP data strategy

Data comes from three layers:

### Official or institutional data

Used for:

- cutoffs
- branches
- fees
- placements
- accreditation
- scholarships
- hostels
- official clubs

### Automated external/location data

Used for:

- coordinates
- railway/airport distance
- nearby hospitals
- transport access
- city-centre distance
- nearby technology/industrial ecosystem

### Verified student-reported data

Used for:

- senior-junior culture
- academic strictness
- hostel reality
- club activity
- placement culture
- student-life and area perception

## Trust rules

Every factual value must show:

- source type
- source URL or document
- academic year
- last verified date
- verification status
- confidence level

Suggested confidence levels:

- A: government/counselling authority
- B: official college document
- C: verified current-student/alumni submission
- D: public or unverified report
- E: inference only

Inference must never appear as verified fact.

## Student-facing routes

1. `/`
2. `/auth`
3. `/profile`
4. `/dashboard`
5. `/colleges`
6. `/colleges/[slug]`
7. `/compare`
8. `/scholarships`
9. `/counsellor`
10. `/reports/[id]`

## Admin routes

11. `/admin`
12. `/admin/imports`
13. `/admin/review`
14. `/admin/colleges/[id]`

## Main student flow

1. Student enters profile.
2. System validates profile.
3. Deterministic engine matches published cutoffs.
4. System calculates admission, branch, finance, location, culture and confidence scores.
5. Colleges are classified as Safe, Smart and Ambitious.
6. Student compares two choices.
7. Scholarship engine checks potential eligibility.
8. AI explains the calculated result using only retrieved published data.
9. Student generates a final report.

## Tone and visual personality

The product should feel:

- trustworthy
- calm
- modern
- evidence-based
- student-friendly
- parent-friendly
- not overly playful
- not like a generic chatbot

Suggested visual direction:

- light neutral background
- deep navy primary
- teal positive accent
- amber warnings
- red only for serious risks
- large readable headings
- clear cards and comparison tables
- visible source badges
- minimal gradients

## Success criteria for the prototype

A judge should be able to:

1. enter a sample student profile
2. receive real recommendations
3. see why the recommendations were made
4. compare two colleges
5. view costs and possible scholarships
6. see source confidence
7. ask the AI counsellor a grounded question
8. generate a report
9. view the admin verification workflow
