# Manual Verification Checklist — BITS Pilani, Pilani Campus

## Identity and campus
- [ ] Confirm the exact legal-name formatting used for the 2026 import.
- [ ] Confirm that every record is Pilani Campus-specific unless explicitly labelled university-wide.
- [ ] Confirm whether an official domestic counselling/institute code exists.
- [ ] Confirm Institution of Eminence status from the current government list.
- [ ] Confirm whether “Institute of National Importance” should be stored as false or null in the target schema.

## Accreditation
- [ ] Verify the current AICTE approval position and institute ID, if applicable.
- [ ] Verify current NBA-accredited programmes and validity dates.
- [ ] Recheck NAAC validity against the certificate before publication.

## Programmes and seats
- [ ] Confirm all 11 B.E. programme names exactly as used in 2026 counselling.
- [ ] Obtain branch-wise sanctioned intake for 2026-27.
- [ ] Confirm any supernumerary, female-only, international or special seats.
- [ ] Confirm departments for Environmental & Sustainability and Pharmaceutical Engineering.
- [ ] Confirm programme start years for the new programmes.

## Admission and cutoffs
- [ ] Confirm the operative 2026 eligibility notice and board-subject rules.
- [ ] Confirm all BITSAT attempts, tie-break and iteration rules.
- [ ] Add final 2026 cutoff scores only after the final iteration concludes.
- [ ] Verify the 46 historical score rows against the official page.
- [ ] Confirm that “Final published cutoff” is acceptable as the round label in the target schema.
- [ ] Confirm that category/quota/gender remain explicitly “not differentiated,” not blank assumptions.

## Fees and scholarships
- [ ] Recheck each 2026-27 fee component and scheduled tuition escalation.
- [ ] Confirm whether mess/electricity and other advances should be stored as fees or advances.
- [ ] Obtain future hostel/mess revisions before calculating a four-year total.
- [ ] Confirm the 2026-27 MCN income threshold and required documents.
- [ ] Confirm top-500 tuition-blind offer implementation and renewal terms.
- [ ] Confirm current Golden 76, Students Aid Fund and travel-fellowship cycles.
- [ ] Verify PM-Vidyalaxmi eligibility directly on the government/lender workflow.

## Placements and recruiters
- [ ] Obtain Pilani-campus-specific 2024-25 placement statistics.
- [ ] Confirm whether “registered” is the correct denominator for placement percentage.
- [ ] Resolve the “almost 100%” placement-page wording against the exact PDF.
- [ ] Confirm whether highest-package figures should be excluded or imported from another official version.
- [ ] Confirm recruiter spellings and 2024-25 presence.
- [ ] Do not import inferred role categories as official role offers.
- [ ] Obtain company role, eligible branch, package and selection count only from official evidence.

## Hostels, facilities and clubs
- [ ] Confirm current number of boys' and girls' hostel buildings.
- [ ] Confirm room occupancy/sharing and allocation rules for 2026 entrants.
- [ ] Confirm current curfew, guest and leave rules.
- [ ] Confirm future hostel/mess fees and deposit treatment.
- [ ] Verify current laundry, banking/ATM and shop facilities.
- [ ] Recheck every club against a 2025-26 official activity source.
- [ ] Confirm current club recruitment processes.

## Location and student experience
- [ ] Verify latitude and longitude using an approved map source.
- [ ] Verify railway/airport road distances and typical travel times.
- [ ] Verify nearest major hospital distance.
- [ ] Review student-experience paraphrases for neutrality and privacy.
- [ ] Confirm no anonymous username or private identity is stored.
- [ ] Seek newer representative evidence for mess, coding and club culture.
- [ ] Keep conflicting signals labelled; do not convert them to numeric ratings.

## Final integrity
- [ ] Re-open all source links.
- [ ] Confirm no aggregator figure entered the verified tables.
- [ ] Confirm all numbers use INR, LPA or BITSAT score units correctly.
- [ ] Confirm all historical cutoffs are labelled historical, not official 2026 cutoffs.
- [ ] Confirm every imported record has a valid source ID.
- [ ] Resolve all open conflicts in `data_conflicts.csv` or retain an explicit warning.
