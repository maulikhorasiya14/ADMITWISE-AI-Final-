# IIT Madras — Manual Verification Checklist

## Identity and campus
- [x] Verify official institution name and institute code 110.
- [x] Verify main-campus address and avoid mixing Zanzibar/non-campus BS programmes.
- [ ] Resolve the 617-acre versus 650-acre campus-area convention.

## Programmes and admissions
- [x] Verify all 2026 JoSAA programme names and degree durations.
- [x] Verify 2026 seat totals and female-supernumerary values.
- [x] Confirm JEE Advanced/JoSAA route and board eligibility.
- [x] Confirm branch change has been discontinued from 2024-25.
- [ ] Recheck any programme changes before production import if JoSAA revises the matrix.

## Cutoffs
- [x] Confirm source is the original verified `merged_jee_cutoff_2018_2025.csv`.
- [x] Validate year, round, programme, category, quota and gender fields.
- [x] Validate numeric rank types and opening rank not exceeding closing rank.
- [x] Exclude eight blank 2024 no-allotment placeholders.
- [ ] Add 2026 cutoffs only after official rounds conclude.

## Fees and scholarships
- [x] Verify 2026 institute fee components and remission rules.
- [x] Verify Jul-Nov 2026 new-admission hostel charges.
- [ ] Insert advance mess charge after the tender is finalised.
- [ ] Confirm whether subsequent-semester fees or insurance premium change.
- [ ] Verify 2026-27 scholarship deadlines, limited award counts and notified lists.
- [ ] Verify required documents on the current scholarship application portal.

## Placements and recruiters
- [x] Normalise all package figures to LPA and label them CTC.
- [x] Mark NIRF versus college-reported scope.
- [x] Preserve offer counts separately from unique students placed.
- [ ] Add final 2025-26 placement outcomes when published.
- [ ] Obtain branch-wise eligible/registered/placed denominators where available.
- [ ] Verify recruiter roles, eligible branches, number selected and packages company by company.
- [ ] Confirm domestic versus international maximum-package scope before populating those fields.

## Hostel and campus facilities
- [x] Verify hostel count, first-year sharing and LAN/laundry claims.
- [ ] Confirm 2026 UG hostel allocation and room-sharing assignments.
- [ ] Confirm current curfew rules, if any.
- [ ] Confirm ambulance availability and emergency procedure.
- [ ] Verify current mess operators and cuisine options through official allotment material.

## Clubs and student experience
- [x] Verify CFI, Shaastra and Saarang recent official activity.
- [ ] Verify 2025-26/2026-27 activity dates and recruitment for every static-listed club.
- [ ] Confirm the formal attendance rule through an official academic regulation.
- [ ] Expand independent evidence on grading, faculty access, hostel conditions and senior-junior culture.
- [ ] Review qualitative conflicts and avoid numerical ratings without a documented method.

## Final review
- [x] Confirm JSON validity and CSV header consistency.
- [x] Confirm every factual row has a registered source ID.
- [x] Confirm Tier-C evidence is not used for official facts.
- [x] Confirm historical records are not presented as official 2026 cutoffs.
- [ ] Recheck all live links immediately before Supabase import.
