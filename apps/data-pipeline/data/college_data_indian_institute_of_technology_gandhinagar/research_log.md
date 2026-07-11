# Research Log — IIT Gandhinagar

## Scope
- Institution: Indian Institute of Technology Gandhinagar
- Target admission year: 2026
- Research date: 2026-06-26
- Final completion: 93%; ready for human review

## Official portals and documents checked
- JoSAA 2026 institute profile and seat matrix
- JEE Advanced 2026 information brochure
- IIT Gandhinagar admissions, BTech, hostel, facilities, clubs, governance, medical and travel pages
- NIRF Engineering rankings 2023-2025 and NIRF 2026 submitted data
- Annual reports 2022-23, 2023-24 and 2024-25
- Gujarat Metro Rail Corporation Phase II information

## Structured cutoff extraction
- Read the user-confirmed original verified `merged_jee_cutoff_2018_2025.csv`.
- Normalized duplicate whitespace in the institute name.
- Retained 1593 valid rows: 588 in 2023, 531 in 2024 and 474 in 2025.
- Excluded 4 rows with missing opening and closing ranks.
- Preserved all available rounds, programmes, categories, quotas and gender pools.

## Placement and recruiter extraction
- Extracted NIRF graduating-cohort outcomes for UG and PG across three years.
- Preserved annual-report registered-student percentages and offer counts as separate scopes.
- Recorded 30 recruiters from the official 2024 placement list.
- Did not invent roles, package ranges, branch eligibility or selection counts.

## Student-experience review
- Reviewed recent Reddit discussions, two visual YouTube sources, a public student interview and current institution-associated student pages.
- Used these only for labelled qualitative themes.
- Removed usernames and specific personal accusations from the public dataset.

## Assumptions avoided
- No 2026 cutoff prediction was labelled official.
- No CTC was converted to base or take-home salary.
- No scholarship was described as guaranteed.
- No missing accreditation, hostel rule or recruiter detail was guessed.
- Historical dual-degree cutoffs were not presented as current 2026 programmes.

## Final validation
- JSON parsing: passed.
- CSV headers: passed.
- Source IDs: passed.
- Numeric ranks and opening<=closing: passed.
- Duplicate cutoff keys: passed.
- ZIP contains exactly 18 required files.
