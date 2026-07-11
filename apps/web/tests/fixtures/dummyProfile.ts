import { parseStudentProfile, type SavedStudentProfile } from "../../src/features/profile/profileSchema.ts";

const parsed = parseStudentProfile({
  id: "eval-dummy-profile",
  exams: [{ exam: "JEE Main", examYear: 2026, rank: 15000, percentile: undefined, marks: undefined }],
  category: "GENERAL",
  gender: "PREFER_NOT_TO_SAY",
  homeState: "Maharashtra",
  homeCity: "Pune",
  preferredBranches: ["Computer Science", "Electronics"],
  preferredStates: ["Maharashtra", "Karnataka"],
  collegeTypePreference: "BOTH",
  hostelRequired: true,
  maximumAnnualBudget: 500000,
  familyIncomeBand: "5-8 LPA",
  careerGoal: "SOFTWARE",
  weights: {
    admissionChance: 25,
    branchFit: 20,
    placement: 20,
    affordability: 15,
    scholarship: 10,
    location: 5,
    culture: 5
  }
});

if (!parsed.success) {
  throw new Error(`dummyStudentProfile fixture is invalid: ${parsed.error.message}`);
}

export const dummyStudentProfile: SavedStudentProfile = parsed.data;
