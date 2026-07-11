# Research Log

## Scope

- College: National Institute of Technology Calicut
- Target admission year: 2026
- Research date: 2026-06-26
- Main campus only; ITEP is not included in the engineering/architecture dataset.

## Uploaded materials inspected

- Complete AdmitWise research prompt.
- Verified consolidated JoSAA/CSAB cutoff CSV covering 2018-2025; filtered to NIT Calicut and years 2023-2025.
- CSAB 2025 Special Round 1 PDF; NIT Calicut pages 107-127.
- CSAB 2025 Special Round 2 PDF; NIT Calicut pages 52-59.
- CSAB 2025 Special Round 3 PDF; NIT Calicut pages 36-40.

## Official portals and documents checked

- JoSAA 2026 institute profile and programme-wise seat breakup.
- NITC UG schemes of admission and UG programmes pages.
- NITC 2026-27 institute-fee and hostel-fee PDFs.
- NIRF 2025 institution-submitted engineering data and 2023-2025 ranking pages.
- Official NBA letters/articles available on NITC.
- NITC placement notice, CCD portal and recruiter-process page.
- NITC scholarship notices index.
- NITC clubs, hostels, facilities and location information.

## Cutoff extraction

- JoSAA source rows inspected: 4,360 (2023: 1,472; 2024: 1,260; 2025: 1,628).
- Twenty-eight 2024 JoSAA rows had both opening and closing ranks blank; these unavailable combinations were not emitted as numeric cutoffs.
- Numeric JoSAA rows retained: 4,332 (2023: 1,472; 2024: 1,232; 2025: 1,628).
- CSAB rows retained: 317 (Round 1: 194; Round 2: 73; Round 3: 50).
- Total numeric cutoff records: 4,649.
- All available numeric ranks were normalized to integers.
- An exact full-output-key duplicate check was performed; no duplicate numeric records remained.
- Opening rank <= closing rank was validated for every emitted record.
- JoSAA and CSAB remain separate counselling systems.

## Student-experience research

- Five public Reddit/local discussion sources reviewed.
- Five public YouTube campus/hostel/day-in-life/doubt-session sources recorded.
- No student source was used for official numeric facts.

## Assumptions avoided

- No 2026 cutoff was predicted or labelled official.
- No branch-specific placement rate was inferred from overall NIRF data.
- No fixed annual mess fee was invented.
- No scholarship benefit or deadline was guessed.
- No recruiter role, package, branch eligibility or selection count was invented.
- No numeric campus rating was created.

## Extraction limitations and unresolved issues

- Official completed 2026 JoSAA/CSAB cutoff rounds are not available in this package; 2023-2025 are historical evidence only.
- The uploaded 2024 JoSAA subset includes 28 rows with blank opening and closing ranks; these are documented as unavailable combinations and omitted from numeric cutoff exports.
- Current authoritative AICTE institute ID, UGC category and NAAC grade/score/validity were not verified and remain null.
- Exact NBA validity dates were not obtained for Engineering Physics; Biotechnology renewal after 2023-2026 is unclear.
- Branch-specific placement percentages, eligible/registered counts, PPOs, internships and stipend data were not available in the NIRF source.
- The official placement notice’s exact recruitment year is not exposed in the retrieved page text.
- Scholarship amount, income limit, deadline and documents are incomplete for most cycle-specific schemes.
- Mess cost is an advance/consumption-based item, so a reliable four-year hostel-and-mess total was not calculated.
- Company-specific role and branch-eligibility records were not published in the official recruiter notice.
- Qualitative evidence is limited and self-selected; it cannot establish a campus-wide numerical satisfaction score.
- Mathematics and Computing is new in the 2026 seat matrix and has no historical 2023-2025 cutoff rows in the uploaded data.

## Final status

- Completion: 88%
- Overall status: ready for human review
- Estimated human verification effort: 4-6 focused hours, primarily for spot-checking cutoffs, 2024 quota mapping, 2026 eligibility, scholarship notices and branch-specific placement reports.
