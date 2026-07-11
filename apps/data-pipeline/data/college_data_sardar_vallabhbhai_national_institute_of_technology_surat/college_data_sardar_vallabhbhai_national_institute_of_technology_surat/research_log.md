# SVNIT Surat Research Log

**Research date:** 2026-06-26  
**Target admission year:** 2026  
**Status:** Ready for human review

## Work completed
- Read the supplied AdmitWise AI extraction prompt.
- Verified institute identity and JoSAA institute code 229.
- Reviewed the JoSAA 2026 institute profile and programme-wise seat matrix.
- Filtered the user-supplied verified JoSAA cutoff export for 2023-2025.
- Parsed all SVNIT rows from supplied CSAB 2025 Special Round 1, 2 and 3 PDFs.
- Reviewed official 2026-27 fee schedules and tuition-remission rules.
- Compiled three official placement years: 2023-24, 2024-25 and provisional 2025-26.
- Reviewed the official CDC brochure for historical recruiters.
- Reviewed official hostel, health, library, sports, club, location, scholarship and annual-report material.
- Reviewed ten public student-experience sources from Reddit and YouTube.

## Extraction results
- JoSAA rows found before blank-rank filtering: **4,377**.
- Blank-rank JoSAA rows excluded from numeric output: **31**, all from 2024.
- Numeric JoSAA rows retained: **4,346**.
- CSAB Round 1 rows: **229**.
- CSAB Round 2 rows: **104**.
- CSAB Round 3 rows: **88**.
- Total cutoff rows: **4,767**.
- 2026 programmes: **15**; seat capacity: **1,400**.
- Placement records structured: **98**.

## Limitations and assumptions avoided
- No historical or predicted cutoff was labelled as an official 2026 cutoff.
- Blank ranks were not converted to zero.
- The 2024 AI quota label was not silently remapped.
- JoSAA category ranks were not directly compared with CSAB CRL ranks.
- Official facility availability was not converted into a quality rating.
- Student opinions were not used for official facts.
- Missing fees, scholarship amounts, recruiter roles and hostel rules remain null or flagged.

## Inaccessible/outdated/conflicting items
- Current programme-wise NBA/NAAC validity was not established.
- Hostel sources conflict on the number and gender classification of hostels.
- 2025-26 placements are provisional.
- Student reports on hostel, mess, ragging, sports and medical experience conflict materially.

## Final completion status
The package is structurally complete and suitable for manual review before database import. Open conflict and freshness checks are listed in the manual-verification checklist and import-readiness file.
