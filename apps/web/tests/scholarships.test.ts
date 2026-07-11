import assert from "node:assert/strict";
import test from "node:test";
import { matchScholarships } from "../src/features/scholarships/scholarshipMatcher.ts";
import type { SavedStudentProfile } from "../src/features/profile/profileSchema.ts";
import type { CollegeScholarshipRecord, ScholarshipRecord } from "../src/features/scholarships/scholarshipTypes.ts";

const profile: SavedStudentProfile = {
  id: "profile-1",
  exams: [{ exam: "JEE Main", examYear: 2025, rank: 9000, percentile: 95 }],
  category: "OBC_NCL",
  gender: "FEMALE",
  homeState: "Maharashtra",
  homeCity: "Pune",
  preferredBranches: ["Computer Science"],
  preferredStates: ["Maharashtra"],
  collegeTypePreference: "BOTH",
  hostelRequired: true,
  maximumAnnualBudget: 200000,
  familyIncomeBand: "5L-8L",
  careerGoal: "UNDECIDED",
  weights: {
    admissionChance: 20,
    branchFit: 20,
    placement: 20,
    affordability: 15,
    scholarship: 10,
    location: 10,
    culture: 5
  }
};

function scholarship(overrides: Partial<ScholarshipRecord> = {}): ScholarshipRecord {
  return {
    id: "scholarship-1",
    name: "Fixture Scholarship",
    provider: "Fixture Provider",
    description: "Fixture scholarship description",
    applicable_states: ["Maharashtra"],
    applicable_categories: ["OBC_NCL"],
    gender_requirement: "FEMALE",
    maximum_family_income: 800000,
    minimum_marks: null,
    minimum_rank: 10000,
    benefit_amount: 100000,
    benefit_description: "INR 100000 support",
    required_documents: ["Income certificate"],
    renewal_conditions: ["Maintain academic standing"],
    application_deadline: "2026-12-31",
    official_url: "https://example.edu/scholarship",
    source_id: "source-1",
    verification_status: "published",
    is_published: true,
    sources: {
      id: "source-1",
      title: "Official scholarship notice",
      source_type: "official_college",
      academic_year: "2025-26",
      confidence_level: "B"
    },
    ...overrides
  };
}

function collegeLink(overrides: Partial<CollegeScholarshipRecord> = {}): CollegeScholarshipRecord {
  return {
    id: "college-scholarship-1",
    college_id: "college-1",
    scholarship_id: "scholarship-1",
    availability_notes: "Available for this college",
    source_id: "source-1",
    verification_status: "published",
    is_published: true,
    ...overrides
  };
}

test("matches scholarship by category", () => {
  const [match] = matchScholarships({
    profile,
    scholarships: [scholarship()],
    asOf: new Date("2026-01-01")
  });

  assert.equal(match?.status, "potentially_eligible");
});

test("rejects scholarship when income exceeds limit", () => {
  const [match] = matchScholarships({
    profile: { ...profile, familyIncomeBand: "9L-10L" },
    scholarships: [scholarship()],
    asOf: new Date("2026-01-01")
  });

  assert.equal(match?.status, "not_eligible");
});

test("rejects scholarship when state requirement does not match", () => {
  const [match] = matchScholarships({
    profile: { ...profile, homeState: "Gujarat" },
    scholarships: [scholarship()],
    asOf: new Date("2026-01-01")
  });

  assert.equal(match?.status, "not_eligible");
});

test("rejects scholarship when gender requirement does not match", () => {
  const [match] = matchScholarships({
    profile: { ...profile, gender: "MALE" },
    scholarships: [scholarship()],
    asOf: new Date("2026-01-01")
  });

  assert.equal(match?.status, "not_eligible");
});

test("returns more information required for missing profile income", () => {
  const [match] = matchScholarships({
    profile: { ...profile, familyIncomeBand: "" },
    scholarships: [scholarship()],
    asOf: new Date("2026-01-01")
  });

  assert.equal(match?.status, "more_information_required");
  assert.deepEqual(match?.missingInformation, ["family income"]);
});

test("returns deadline passed for expired scholarship", () => {
  const [match] = matchScholarships({
    profile,
    scholarships: [scholarship({ application_deadline: "2025-01-01" })],
    asOf: new Date("2026-01-01")
  });

  assert.equal(match?.status, "deadline_passed");
});

test("excludes unpublished scholarship records", () => {
  const matches = matchScholarships({
    profile,
    scholarships: [scholarship({ is_published: false })],
    asOf: new Date("2026-01-01")
  });

  assert.equal(matches.length, 0);
});

test("calculates estimated effective cost with possible scholarship benefit", () => {
  const [match] = matchScholarships({
    profile,
    scholarships: [scholarship()],
    collegeScholarships: [collegeLink()],
    selectedCollegeId: "college-1",
    fourYearCollegeCost: 800000,
    asOf: new Date("2026-01-01")
  });

  assert.equal(match?.estimatedEffectiveCost, 700000);
});
