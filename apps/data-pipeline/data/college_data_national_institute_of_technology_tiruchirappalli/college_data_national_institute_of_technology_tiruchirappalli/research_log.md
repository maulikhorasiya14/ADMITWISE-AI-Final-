# Research Log

## Scope

- Institution: National Institute of Technology, Tiruchirappalli
- Target admission year: 2026
- Research date: 2026-06-26
- Campus: Main campus, Thuvakudi, Tiruchirappalli

## Work performed

1. Read the complete AdmitWise AI extraction specification.
2. Verified institution identity, history, admission contacts and institute code through JoSAA and NITT pages.
3. Recorded the 2026 JoSAA seat matrix and branch totals.
4. Filtered the user-supplied verified cutoff CSV by exact institution name for 2023–2025; excluded 8 combinations whose opening and closing ranks were both blank.
5. Converted the three attached official CSAB PDFs to page-indexed text, identified pages containing Tiruchirappalli, and extracted NIT Tiruchirappalli table rows with `pdfplumber`.
6. Normalized programmes, categories, quota labels and rank types while preserving official programme names.
7. Collected 2026 B.Tech fee/remission rules and the first odd-semester hostel fee.
8. Collected official placement-cell percentages and NIRF four-year UG placement/median data for the latest three available years.
9. Recorded 30 recruiter logos from the official 2025-26 UG brochure with explicit evidence limitations.
10. Structured current scholarship calls, the detailed RECT’78 scholarship and tuition-remission schemes.
11. Used the 2025–2027 official faculty-advisor roster to identify 20 current clubs.
12. Reviewed nine public student/alumni sources for qualitative campus-reality themes only.
13. Preserved conflicts and created a manual verification checklist.

## Extraction limitations

- Current webpages were researched through public search/open tools; local source copies were not downloaded when network access from the file runtime was unavailable.
- The CSAB PDF extraction was table-based only on pages containing “Tiruchirappalli”; exact institute-name filtering prevented IIIT Tiruchirappalli rows from mixing with NIT rows.
- JoSAA source-page numbers are unavailable in the merged CSV and are left null.
- No estimates were made for full-year hostel cost, current package averages/highs, map distances or missing scholarship benefits.

## Assumptions avoided

- Historical cutoffs were not called 2026 cutoffs.
- Recruiter logos were not treated as proof of current hiring outcomes.
- Placement percentages with different denominators were not combined.
- Student opinions were not promoted to official facts.
- Missing numeric fields remain empty/null.

## Final status

Ready for human review with 84% estimated completion. Blocking issues are primarily accreditation completeness, latest final placement outcomes, annual residential cost and current hostel-rule verification.
