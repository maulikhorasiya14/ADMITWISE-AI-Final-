import assert from "node:assert/strict";
import test from "node:test";
import { buildRecommendations } from "../src/features/recommendations/recommendationEngine.ts";
import type { SavedStudentProfile } from "../src/features/profile/profileSchema.ts";
import type { PublishedCutoffCandidate } from "../src/features/recommendations/recommendationTypes.ts";

const profile: SavedStudentProfile = {
  id: "profile-1",
  exams: [{ exam: "JEE Main", examYear: 2025, rank: 9000, percentile: undefined }],
  category: "GENERAL",
  gender: "PREFER_NOT_TO_SAY",
  homeState: "Maharashtra",
  homeCity: "Pune",
  preferredBranches: ["Computer Science"],
  preferredStates: ["Maharashtra"],
  collegeTypePreference: "BOTH",
  hostelRequired: true,
  familyIncomeBand: "",
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


function candidate(overrides: Partial<PublishedCutoffCandidate> = {}): PublishedCutoffCandidate {
  return {
    id: "cutoff-1",
    exam: "JEE Main",
    admission_year: 2025,
    counselling_system: "JoSAA",
    round: "1",
    category: "GENERAL",
    quota: "HS",
    gender_pool: "OPEN",
    opening_rank: 5000,
    closing_rank: 10000,
    source_id: "source-1",
    verification_status: "published",
    publication_status: "published",
    colleges: {
      id: "college-1",
      slug: "published-college",
      name: "Published College",
      state: "Maharashtra",
      city: "Demo City",
      is_published: true
    },
    college_branches: {
      id: "branch-1",
      name: "Computer Science and Engineering",
      degree: "B.Tech",
      verification_status: "published",
      confidence_level: "A"
    },
    ...overrides
  };
}

test("returns recommendation when rank is inside cutoff", () => {
  const results = buildRecommendations(profile, [candidate()]);

  assert.equal(results.length, 1);
  assert.equal(results[0]?.classification, "SAFE");
});

test("returns lower classification when rank is near cutoff", () => {
  const results = buildRecommendations(
    { ...profile, exams: [{ ...profile.exams[0]!, exam: "JEE Main", examYear: 2025, rank: 11000 }] },
    [candidate()]
  );

  assert.equal(results.length, 1);
  assert.equal(results[0]?.classification, "SMART");
});

test("excludes category mismatch", () => {
  const results = buildRecommendations(profile, [candidate({ category: "OBC_NCL" })]);

  assert.equal(results.length, 0);
});

test("excludes quota mismatch for home-state records", () => {
  const results = buildRecommendations(profile, [
    candidate({
      colleges: {
        id: "college-2",
        slug: "other-state-college",
        name: "Other State College",
        state: "Karnataka",
        city: "Demo City",
        is_published: true
      }
    })
  ]);

  assert.equal(results.length, 0);
});

test("scores preferred branch above non-preferred branch", () => {
  const results = buildRecommendations(profile, [
    candidate(),
    candidate({
      id: "cutoff-2",
      college_branches: {
        id: "branch-2",
        name: "Mechanical Engineering",
        degree: "B.Tech",
        verification_status: "published",
        confidence_level: "A"
      }
    })
  ]);

  assert.equal(results.length, 2);
  assert.equal(results[0]?.branchName, "Computer Science and Engineering");
  assert.ok((results[0]?.overallScore ?? 0) > (results[1]?.overallScore ?? 0));
});

test("excludes unpublished records", () => {
  const results = buildRecommendations(profile, [
    candidate({ publication_status: "draft" }),
    candidate({
      id: "cutoff-2",
      colleges: {
        id: "college-2",
        slug: "draft-college",
        name: "Draft College",
        state: "Maharashtra",
        city: "Demo City",
        is_published: false
      }
    }),
    candidate({
      id: "cutoff-3",
      college_branches: {
        id: "branch-3",
        name: "Computer Science",
        degree: "B.Tech",
        verification_status: "needs_review",
        confidence_level: "A"
      }
    })
  ]);

  assert.equal(results.length, 0);
});

test("returns empty recommendation result when no cutoff fixtures match", () => {
  const results = buildRecommendations(profile, []);

  assert.deepEqual(results, []);
});
