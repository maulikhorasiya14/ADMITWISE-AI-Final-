# Research Log — IIT Guwahati

## Scope
- Institution: Indian Institute of Technology Guwahati
- Target year: 2026
- Research date: 2026-06-26
- Status: 93% complete; ready for human review

## Official portals and documents checked
- JoSAA 2026 institute profile and seat matrix
- JEE Advanced 2026 information brochure
- IIT Guwahati official, Academic Affairs, campus-life, financial-assistance and Gymkhana pages
- NIRF Engineering rankings 2023, 2024 and 2025; submitted-data PDFs
- CCD placement reports 2022-23, 2023-24 and 2024-25
- Official club pages and student-board directories

## Structured extraction
- Read original verified `merged_jee_cutoff_2018_2025.csv`.
- Matched exact institute name after whitespace normalization.
- Retained 2148 valid rows: 749 (2023), 631 (2024), 768 (2025).
- Excluded 4 blank/no-allotment placeholders.
- Normalized programme names, category rank types, rounds and All India quota.

## Placement extraction
- Preserved registration-based scope and CTC units.
- Extracted overall, programme and branch records from three official years.
- Read recruiter logos from official report pages 20-21.
- Preserved internal report inconsistencies as conflict records.

## Student-experience review
- Reviewed four public videos, two student-experience articles and two public forum discussions.
- Used only for labelled qualitative themes.
- Did not copy long passages or identify anonymous users.

## Limitations and assumptions avoided
- No 2026 cutoff was predicted or labelled official.
- No package was converted to base/take-home salary.
- No scholarship was claimed as guaranteed.
- No missing hostel rule, recruiter role or accreditation value was guessed.
- No CSAB record was added because IITs are outside CSAB Special seat allocation.

## Final validation
- JSON parse checks: passed.
- CSV header checks: passed.
- Source-ID checks: passed.
- Numeric rank and opening<=closing checks: passed.
- Duplicate cutoff-key check: passed.
- ZIP contains exactly 18 required files.
