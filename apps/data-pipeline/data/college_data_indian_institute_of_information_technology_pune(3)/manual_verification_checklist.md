
# IIIT Pune Manual Verification Checklist

## Identity and campus
- [ ] Confirm institute code 321 and official name against the final 2026 JoSAA list.
- [ ] Confirm all public-facing records use the permanent Nanoli-Talegaon address.
- [ ] Ensure old Yewalewadi/Bopdev/transit-campus reviews are tagged historical.
- [ ] Verify current official phone, email and admission contact.

## Accreditation and ranking
- [ ] Retrieve institute-specific AICTE status/ID or document why it is not applicable to this statutory INI.
- [ ] Retrieve UGC category/recognition record or document statutory basis.
- [ ] Verify NAAC status/grade and validity, if any.
- [ ] Verify NBA accreditation and validity programme by programme.
- [ ] Check NIRF 2026 rank/bands and institution-submitted data after publication.

## Branches and intake
- [ ] Match every official branch label and programme code to the 2026 academic brochure.
- [ ] Confirm approved intake versus JoSAA seat allocation intake.
- [ ] Confirm female-only pools are not incorrectly labelled supernumerary.
- [ ] Confirm whether TFWS or any non-JoSAA seats exist.
- [ ] Verify curriculum and start year for Cyber Security, AI & DS and Microelectronics/VLSI.

## Admission routes
- [ ] Insert exact 2026 JoSAA board-eligibility/subject rules.
- [ ] Verify DASA/CIWG/foreign-national route and seat treatment.
- [ ] Verify spot/institute rounds, if announced.
- [ ] Recheck branch-change rules in the current academic ordinance.

## Cutoffs
- [x] Confirm `merged_jee_cutoff_2018_2025.csv` is the original verified cutoff dataset.
- [x] Validate the verified dataset across years, rounds, branches, categories and gender pools through schema, rank and duplicate checks.
- [ ] Confirm the eight blank 2024 placeholders are true no-allotment records and should remain excluded from numeric imports.
- [x] Keep JoSAA and CSAB records in separate counselling-system fields.
- [x] Extract official CSAB 2025 Special Round 2 IIIT Pune rows with PDF page references.
- [x] Extract official CSAB 2025 Special Round 3 IIIT Pune rows with PDF page references.
- [x] Confirm that the official CSAB 2025 Special Round 1 PDF contains no IIIT Pune rows.
- [ ] Add official CSAB 2024 and 2023 rows if a three-year special-round trend is required.
- [x] Validate numeric ranks and opening-rank <= closing-rank for all included rows.
- [ ] Add official 2026 rounds only after they conclude and are published.

## Fees and cost
- [ ] Obtain official 2026-27 B.Tech fee circular.
- [ ] Confirm tuition and all compulsory charges by semester/year.
- [ ] Obtain current hostel fee, mess fee, deposit and utilities.
- [ ] Verify category/fee-waiver/SC-ST-PwD/economic-relief rules.
- [ ] Recalculate four-year totals after replacing outdated values.

## Scholarships
- [ ] Verify IIIT Pune in each 2026-27 notified/empanelled institution list.
- [ ] Confirm scheme amounts, income limits and deadlines on NSP.
- [ ] Match state scholarships to applicant domicile.
- [ ] Confirm required documents and renewal criteria.
- [ ] Ensure no scholarship is displayed as guaranteed.

## Placements and recruiters
- [ ] Obtain final 2024-25 placement report.
- [ ] Obtain the final 2025-batch and 2025-26 placement reports after season closure; reconcile counts and the 45/48 LPA conflict.
- [ ] Verify graduating, eligible, registered and placed denominators.
- [ ] Verify average versus median and CTC versus base salary.
- [ ] Separate campus/off-campus, domestic/international and internship/full-time.
- [ ] Verify recruiter year, role, branch eligibility, selected count and package.
- [ ] Confirm whether specialized branches share CSE/ECE placement eligibility.

## Hostel and facilities
- [ ] Verify current hostel operating capacity and allotment guarantee.
- [ ] Verify room sharing, mess, laundry, Wi-Fi, water, electricity and curfew.
- [ ] Verify medical centre/ambulance and nearest hospital route.
- [ ] Verify anti-ragging portal, security and grievance contacts.
- [ ] Distinguish completed facilities from planned/under-construction facilities.

## Clubs and student life
- [ ] Confirm each club's 2025-26/2026-27 activity and official account.
- [ ] Verify recruitment process and first-year access.
- [ ] Check recent achievements and event dates.
- [ ] Mark dormant/unverifiable clubs accurately.

## Location
- [ ] Verify latitude/longitude for the current campus.
- [ ] Verify live road distances and travel times to station, airport and hospital.
- [ ] Verify current public-transport and last-mile options.
- [ ] Verify city-centre and Hinjawadi/Chakan ecosystem distances.
- [ ] Confirm map listings do not point to the old campus.

## Student-experience evidence
- [ ] Review each linked post/video directly and record exact publication date.
- [ ] Confirm claimed student/alumni identity where possible without exposing private identities.
- [ ] Collect at least 3 independent recent sources before marking a moderate signal.
- [ ] Collect at least 5 independent recent sources before marking a strong signal.
- [ ] Recheck senior-junior culture, academics, hostel, mess and placement transparency.
- [ ] Remove personal accusations, rumours and old-campus generalizations.

## Final integrity
- [ ] Resolve every row in data_conflicts.csv.
- [ ] Recheck every link and broken/inaccessible source.
- [ ] Confirm all numeric units (INR, LPA, ranks, km).
- [ ] Confirm all facts have source IDs and all inferences are labelled F.
- [ ] Confirm missing values remain null/blank, never guessed.
- [ ] Confirm latest-year data before import.
