# Manipal Institute of Technology, Manipal — AdmitWise AI Research Package

**Target admission year:** 2026  
**Research date:** 2026-06-27  
**Status:** Ready for human review  
**Completion:** 79%  
**Campus scope:** MIT Manipal only.

> Historical information is evidence for 2026 decision support, not an official 2026 cutoff or outcome guarantee.

## 1. Verified college overview — Official verified
MIT Manipal is a private constituent engineering institution of MAHE, established in 1957. The 2026–27 disclosure lists 17 undergraduate engineering programmes with a branch-table total of **2,530 seats**. This total needs manual confirmation because the same disclosure says “about 2,000” intake and NIRF previously reported 2,400 approved intake.

## 2. Accreditation — Official verified
MAHE holds NAAC A++ with CGPA 3.65, valid 31 May 2022–30 May 2027. MIT Manipal's NIRF Engineering ranks were 59 (2025), 56 (2024) and 61 (2023). Programme-level NBA validity is in `branches.csv`; the Biomedical end date contains a source typo and is flagged.

## 3. Admission routes — Official verified
MET 2026 uses the official 50% MET/50% board-weight method with 50% minimum in the specified subjects. The new JEE Main route requires at least 75% board aggregate and 90 percentile, uses JEE CRL, earmarks 20% of General seats and has one counselling round. NRI/foreign, lateral-entry and TFW routes are separate.

## 4. Branches and intake — Official verified
See `branches.csv`. The largest disclosed programme is CSE with 1,020 seats. The public programme list, counselling choices and fee labels require manual reconciliation before import.

## 5. Historical cutoffs — Unavailable at required granularity
`cutoffs.csv` is intentionally header-only. The disclosure gives institution-level values of 48,465 (2023), 47,700 (2024) and 52,945 (2025), but they lack branch, round, route, category and quota. They are preserved only in `college_profile.json`.

## 6. Fees and total cost — Official verified + calculated
Mapped four-year academic totals:
- ₹18.02 lakh: Biotechnology, Chemical, Civil, EEE and Mechanical
- ₹19.66 lakh: Aeronautical and Mechatronics
- ₹24.42 lakh: CSE, CSFT, ECE and Mathematics & Computing

The generic Electronics Engineering row is ₹18.02 lakh but must not be auto-mapped to EIE/CPS/VLSI. Sample first-year hostel/mess totals range ₹1.275–2.54 lakh. A calculated first-year institutional range is ₹5.855–8.72 lakh, excluding personal costs. No four-year hostel estimate was created.

## 7. Scholarships — Official verified
Ten schemes are structured in `scholarships.csv`, including HBSF full programme/hostel/mess support, B.Tech Freeship, Scholar, Achiever, meritorious-girl support, AICTE TFW, Konkani-speaking, alumni-child and education-loan interest subsidy. All are conditional and require official verification.

## 8. Placement statistics — Official verified
| Year | Graduating | Placed | Calculated placement % | Median LPA | Higher studies |
|---|---:|---:|---:|---:|---:|
| 2021–22 | 1,879 | 1,090 | 58.01% | 8.00 | 229 |
| 2022–23 | 1,664 | 1,136 | 68.27% | 8.8825 | 281 |
| 2023–24 | 1,755 | 1,140 | 64.96% | 8.50 | 288 |

These are overall UG NIRF figures, not branch-specific. Average/highest package, eligibility denominator, PPO and internship counts were not verified.

## 9. Recruiters — Institution-published
Fourteen undated recruiter examples are retained. Every row says year unavailable or historical; none is claimed as a confirmed 2026 visitor.

## 10. Company-to-skill guidance — General guidance
Eight role-family roadmaps are in `college_profile.json`. They are not college-specific hiring requirements.

## 11. Hostels and facilities — Official + institution-published
Official materials document multiple room types, mess, Wi-Fi, labs, library, Innovation Centre, MUTBI, sports, grievance and anti-ragging systems. MIT-specific capacity, guarantee and current curfew were not verified.

## 12. Clubs and student activities — Institution-associated
Twenty officially listed clubs are in `clubs.csv`. Static listing proves association, not present activity; each requires a dated activity check.

## 13. Location and travel — Official + map-derived
Udupi station is the nearest rail link; Mangaluru airport is about 60 km/1.5 hours away. There is no metro. Kasturba Hospital and student services are close. Coordinates and local times are map-derived.

## 14. Student-reported campus reality
Repeated themes: broad club/campus life, major block-to-block hostel variation, easier evening participation for hostellers, and a compact student town. Evidence conflicts on Wi-Fi gaming and academic strictness. No numeric culture score was generated.

## 15. Parent Mode
The opportunity set is broad, but the financial commitment is high and branch-specific ROI is not transparent. Budget without assuming scholarship renewal.

## 16. Student Mode
The college appears best for self-driven students who will use clubs, project teams, labs and peer networks. Branch choice matters greatly, especially for core-to-software ambitions.

## 17. Decision Risk Analysis
Main risks: high cost, missing granular cutoffs, no verified branch placements, CSE/intake restructuring, fee mapping gaps, hostel variation, strict scholarship renewal and core/software mismatch.

## 18. Data gaps
The largest gaps are official branch-wise cutoffs, detailed seat matrix, programme-fee mapping, branch placements, dated recruiter participation, hostel capacity/curfew and current club activity.

## 19. Conflicts
Seven conflicts are preserved in `data_conflicts.csv`; none was silently resolved.

## 20. Manual verification
Use `manual_verification_checklist.md` before import.

## 21. Sources
All sources, dates, categories and confidence labels are in `sources.csv`. Tier C material was never used for verified cutoffs, fees, scholarships, accreditation or placement figures.
