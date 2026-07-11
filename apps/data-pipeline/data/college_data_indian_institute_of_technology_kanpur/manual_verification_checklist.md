# Manual Verification Checklist — IIT Kanpur

## Identity and campus
- [x] Confirm official institution name and JoSAA code 109.
- [x] Confirm Kalyanpur main-campus address and prevent campus mixing.
- [ ] Confirm a single dated current student-population figure if needed.

## Programmes, seats and admission
- [x] Confirm all 15 programme names against JoSAA 2026.
- [x] Confirm 988 regular-capacity and 252 female-supernumerary seats.
- [x] Confirm category-wise seat arrays.
- [x] Confirm JEE Advanced/JoSAA route and Class XII criteria.
- [ ] Recheck branch-change implementation for the 2026 batch at registration.

## Cutoffs
- [x] Validate all 2023–2025 rows from the original verified dataset.
- [x] Confirm year, round, programme, category, quota and gender pool.
- [x] Exclude blank no-allotment placeholders rather than creating zero ranks.
- [x] Confirm no duplicate cutoff keys or opening-rank errors.
- [ ] Add 2026 official cutoff rows only after JoSAA publishes them.

## Fees and scholarships
- [x] Confirm the 2026–27 first-semester fee circular.
- [ ] Attach current food/mess billing or advance notice.
- [ ] Confirm exact 2026–27 scholarship announcement dates and current amounts.
- [ ] Confirm NSP notified-institution/course eligibility for each external match.

## Placements and recruiters
- [x] Confirm source scope and registered-student denominators.
- [x] Preserve the dated 2023–24 and 2024–25 placement conflicts.
- [ ] Replace provisional 2024–25 values with the final report when released.
- [ ] Add final 2025–26 data.
- [ ] Confirm company-wise roles, branch eligibility, packages and selected counts before importing those fields.
- [ ] Confirm package units distinguish CTC, base salary and international currency.

## Hostels, facilities and location
- [ ] Confirm 2026 first-year room sharing and hostel guarantee.
- [ ] Confirm current mess operations, laundry, ambulance and visitor/curfew rules.
- [x] Confirm metro station and main travel routes.
- [ ] Verify map coordinates and hospital referral route before public display.

## Clubs and student experience
- [ ] Confirm latest activity and recruitment cycle for every club.
- [ ] Gather at least three recent independent sources per qualitative theme before assigning moderate confidence.
- [ ] Recheck historical hostel-pressure claims after new construction.
- [x] Ensure no student opinion is presented as an official fact.

## Conflicts, links and final import
- [x] Review all conflicts in `data_conflicts.csv`.
- [ ] Recheck every external URL immediately before production import.
- [x] Confirm JSON parsing and CSV headers.
- [x] Confirm missing numeric/boolean data remain null rather than guessed.
