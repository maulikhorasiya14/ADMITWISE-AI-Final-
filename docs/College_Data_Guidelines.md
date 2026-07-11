# CONFIDENCE SYSTEM

Assign each factual or qualitative item a confidence level.

## A — Authoritative

- government portal
- official counselling authority
- NIRF
- AICTE
- UGC
- NAAC
- NBA

## B — Official institution

- official college page
- official fee document
- official placement report
- official brochure
- official annual report

## C — Institution-associated

- official department
- official placement cell
- official student body
- official club
- verified institutional social account

## D — Repeated student-reported signal

- multiple recent independent student/alumni sources
- clearly labelled as student-reported

## E — Limited anecdotal evidence

- one or two public opinions
- weak or incomplete evidence

## F — Inference or calculation

- calculated travel distance
- calculated cost
- general career guidance
- model-generated summary

Only A, B and C records may be considered officially verified.

D and E must remain student-reported.

F must be explicitly labelled calculated or inferred.

---

# REQUIRED OUTPUT FOLDER

Create:

```text
college_data_[NORMALIZED_COLLEGE_SLUG]/
```

Inside it, create all files listed below.

---

# FILE 1 — `college_profile.json`

Use this structure:

```json
{
  "research_metadata": {
    "college_requested": "",
    "official_college_name": "",
    "target_admission_year": 2026,
    "research_date": "",
    "completion_percentage": 0,
    "overall_status": "ready_for_human_review"
  },
  "college": {},
  "accreditation": [],
  "admission_routes": [],
  "branches": [],
  "seat_matrix": [],
  "cutoffs": [],
  "fees": [],
  "scholarships": [],
  "placements": [],
  "recruiters": [],
  "company_skill_guidance": [],
  "hostels_and_facilities": {},
  "clubs": [],
  "location": {},
  "student_experience_summary": {},
  "parent_mode_summary": {},
  "student_mode_summary": {},
  "decision_risks": [],
  "data_gaps": [],
  "conflicts": [],
  "manual_verification_required": []
}
```

Use:

- numbers for numeric values
- booleans for true/false
- arrays for multiple values
- null for unavailable values

Do not use `"N/A"` inside numeric or boolean fields.

---

# FILE 2 — `college_summary.md`

Create a readable report with:

1. Verified college overview
2. Accreditation
3. Admission routes
4. Branches and intake
5. Historical cutoffs
6. Fees and total cost
7. Scholarships
8. Placement statistics
9. Recruiters
10. Company-to-skill guidance
11. Hostels and facilities
12. Clubs and student activities
13. Location and travel
14. Student-reported campus reality
15. Parent Mode summary
16. Student Mode summary
17. Decision risks
18. Data gaps
19. Conflicts
20. Manual verification checklist
21. Sources

Clearly label every section as:

- official verified
- institution-published
- calculated
- student-reported
- anecdotal
- unavailable

---

# FILE 3 — `sources.csv`

Columns:

```text
source_id
source_title
url
domain
source_category
source_type
confidence_level
academic_year
publication_date
accessed_date
data_categories
college_campus
notes
```

---

# FILE 4 — `branches.csv`

Columns:

```text
college_name
official_branch_name
normalized_branch
degree
duration_years
approved_intake
female_supernumerary_seats
tfws_seats
nba_status
academic_year
source_id
```

---

# FILE 5 — `cutoffs.csv`

Columns:

```text
college_name
institute_code
year
counselling_system
round
seat_allocation_type
official_branch_name
normalized_branch
category
category_rank_type
quota
gender_pool
opening_rank
closing_rank
percentile
score
rank_type
source_id
source_page
```

---

# FILE 6 — `fees.csv`

Columns:

```text
college_name
academic_year
programme
category_or_quota
annual_tuition_inr
semester_tuition_inr
full_programme_tuition_inr
admission_fee_inr
registration_fee_inr
exam_fee_inr
refundable_deposit_inr
annual_hostel_fee_inr
annual_mess_fee_inr
other_compulsory_fee_inr
calculated_four_year_cost_inr
source_id
source_page
notes
```

---

# FILE 7 — `placements.csv`

Columns:

```text
college_name
placement_year
programme
branch
record_scope
graduating_students
eligible_students
registered_students
students_placed
placement_percentage
higher_studies_count
median_package_lpa
average_package_lpa
highest_domestic_package_lpa
highest_international_package_lpa
internship_count
ppo_count
average_stipend
highest_stipend
source_type
source_id
source_page
notes
```

---

# FILE 8 — `recruiters.csv`

Columns:

```text
college_name
company_name
placement_year
role
role_category
eligible_branches
hiring_type
campus_status
number_selected
package_or_range
source_id
evidence_note
confidence_level
```

---

# FILE 9 — `scholarships.csv`

Columns:

```text
scholarship_name
provider
college_name
applicable_programme
applicable_year
category_requirement
gender_requirement
income_limit_inr
domicile_requirement
academic_requirement
entrance_exam_requirement
benefit_amount_inr
benefit_description
duration
required_documents
renewal_conditions
deadline
application_url
source_id
confidence_level
```

---

# FILE 10 — `clubs.csv`

Columns:

```text
college_name
club_name
club_category
official_status
description
official_page
latest_activity
latest_activity_date
major_achievements
recruitment_process
activity_status
source_id
last_verified_date
```

---

# FILE 11 — `location.csv`

Columns:

```text
college_name
campus_name
official_address
locality
city
district
state
pincode
latitude
longitude
nearest_railway_station
railway_distance_km
railway_travel_time_minutes
nearest_airport
airport_distance_km
airport_travel_time_minutes
nearest_metro
nearest_bus_terminal
nearest_major_hospital
hospital_distance_km
city_centre_distance_km
technology_ecosystem
cost_of_living_band
data_origin
source_id
```

---

# FILE 12 — `student_experience_sources.csv`

Columns:

```text
source_id
platform
source_title
url
publication_date
source_identity_type
college_branch_if_known
graduation_year_if_known
hosteller_or_day_scholar
topics_covered
positive_themes
negative_themes
visual_evidence
possible_bias
confidence_level
notes
```

Do not store public usernames unless required for internal source verification.

---

# FILE 13 — `campus_reality.json`

Use:

```json
{
  "senior_junior_culture": {
    "summary": "",
    "positive_themes": [],
    "negative_themes": [],
    "evidence_strength": "",
    "supporting_source_ids": [],
    "conflicting_source_ids": []
  },
  "academic_culture": {},
  "hostel_reality": {},
  "club_and_campus_life": {},
  "coding_and_placement_culture": {},
  "locality_and_student_life": {},
  "overall_satisfaction": {}
}
```

Do not create numeric ratings unless there are enough independent sources and the rating methodology is documented.

---

# FILE 14 — `manual_verification_checklist.md`

Include checkboxes for:

- identity
- campus
- branch names
- intake
- cutoffs
- quota/category mappings
- fees
- scholarships
- placement scope
- package units
- recruiter years
- hostel availability
- clubs
- location
- student-experience claims
- conflicts
- broken links
- latest-year confirmation

Every uncertain item must have its own checkbox.

---

# FILE 15 — `data_conflicts.csv`

Columns:

```text
conflict_id
data_category
field
source_1_id
source_1_value
source_2_id
source_2_value
possible_reason
recommended_manual_action
status
```

---

# FILE 16 — `excluded_sources.md`

List:

- unofficial sites encountered
- unsupported claims
- misleading placement claims
- copied or unsourced figures
- inaccessible private sources
- excluded rumours

Explain why each was excluded.

---

# FILE 17 — `research_log.md`

Record:

- searches performed
- official portals checked
- documents downloaded
- videos reviewed
- Reddit/forum discussions reviewed
- inaccessible pages
- unresolved issues
- extraction limitations
- assumptions avoided
- final completion status

---

# FILE 18 — `import_readiness.json`

Use:

```json
{
  "college_identity": false,
  "accreditation": false,
  "admission_routes": false,
  "branches": false,
  "seat_matrix": false,
  "cutoffs": false,
  "fees": false,
  "scholarships": false,
  "placements": false,
  "recruiters": false,
  "hostels_and_facilities": false,
  "clubs": false,
  "location": false,
  "student_experience": false,
  "blocking_issues": [],
  "recommended_import_order": [],
  "overall_status": "ready_for_human_review"
}
```

Mark a section true only when:

- records are structured
- required fields are present
- sources are attached
- obvious conflicts are flagged
- numeric types are valid
- college/campus identity is correct

---
