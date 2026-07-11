# IIIT Pune Research Log

**Research date:** 2026-06-26  
**Target admission year:** 2026  
**Final status:** Ready for human review; cutoff structure substantially complete

## Sources and files processed

- Existing 18-file IIIT Pune research package.
- User-provided `merged_jee_cutoff_2018_2025.csv` containing JoSAA-style historical rows.
- Official CSAB 2025 Special Round 1 PDF (552 pages).
- Official CSAB 2025 Special Round 2 PDF (312 pages).
- Official CSAB 2025 Special Round 3 PDF (373 pages).
- Existing IIIT Pune, JoSAA, placement, scholarship, facility, location and student-experience evidence already registered in `sources.csv`.

## Cutoff extraction performed

1. Matched the exact institute name `Indian Institute of Information Technology (IIIT) Pune` and institute code 321.
2. Limited the merged dataset to the latest three completed JoSAA years: 2023, 2024 and 2025.
3. Preserved programme, quota, seat type, gender pool, opening rank, closing rank, round and year.
4. Normalized CSE/ECE branch labels and rank-type conventions without changing raw category labels.
5. Excluded eight rows whose opening and closing ranks were both blank; no rank was guessed.
6. Extracted 16 official IIIT Pune records from CSAB 2025 Special Round 2 pages 301-302.
7. Extracted 22 official IIIT Pune records from CSAB 2025 Special Round 3 pages 243-245.
8. Reviewed the official CSAB 2025 Special Round 1 export; no IIIT Pune row was found.
9. Kept JoSAA and CSAB records separate and labelled all CSAB ranks as All India CRL according to the PDFs' note.

## Cutoff counts

- JoSAA 2023: 161 numeric rows, Rounds 1-6.
- JoSAA 2024: 142 numeric rows, Rounds 1-5.
- JoSAA 2025: 176 numeric rows, Rounds 1-6.
- CSAB 2025 Special Round 1: 0 IIIT Pune rows found.
- CSAB 2025 Special Round 2: 16 rows.
- CSAB 2025 Special Round 3: 22 rows.
- **Total in `cutoffs.csv`: 517 rows.**

## Validation performed

- All included opening and closing ranks are integers.
- All included opening ranks are less than or equal to closing ranks.
- No duplicate key was found for year, counselling system, round, programme, quota, category and gender pool.
- Every cutoff row has a source ID.
- CSAB records include PDF page numbers.
- Historical values are not labelled as official 2026 cutoffs.

## Cutoff provenance status

The user confirmed that `merged_jee_cutoff_2018_2025.csv` is the original verified cutoff dataset. Its 479 retained IIIT Pune JoSAA rows are therefore classified as confidence A after schema, numeric, opening/closing-rank and duplicate validation. CSAB Round 2 and Round 3 rows remain official PDF-backed confidence A records.

## Other research limitations retained

- Current 2026-27 institute and hostel/mess fee circulars remain missing.
- Institute-specific accreditation/approval records remain incomplete.
- Placement results remain partly provisional and lack medians, role-wise outcomes and complete on/off-campus scope.
- Current hostel operations, club activity and map-derived travel fields need verification.
- Qualitative student evidence remains limited and must not be generalized as official fact.

## Final completion status

The package contains all 18 required files. Its research completion estimate is **90%**. The historical cutoff section is verified and import-ready; the package remains under human review because fees, accreditation, final placements and current hostel operations are incomplete.
