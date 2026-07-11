import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultProfileValues,
  getPreferenceWeightTotal,
  parseStudentProfile,
  profileStorageKey,
  type SavedStudentProfile
} from "../src/features/profile/profileSchema.ts";
import { loadProfileFromStorage, saveProfileToStorage } from "../src/features/profile/profileStorageCore.ts";

function validProfile(overrides: Partial<SavedStudentProfile> = {}) {
  const parsed = parseStudentProfile({
    ...defaultProfileValues,
    id: "test-profile",
    exams: [{ exam: "JEE Main", examYear: 2025, rank: 12345, percentile: undefined }],
    homeState: "Maharashtra",
    preferredBranches: ["Computer Science"],
    ...overrides
  });

  assert.equal(parsed.success, true);
  return parsed.data;
}

test("requires at least one exam entry", () => {
  const result = parseStudentProfile({
    ...defaultProfileValues,
    exams: [],
    homeState: "Maharashtra",
    preferredBranches: ["Computer Science"]
  });

  assert.equal(result.success, false);
});

test("rejects non-positive rank inside an exam entry", () => {
  const result = parseStudentProfile({
    ...defaultProfileValues,
    exams: [{ exam: "JEE Main", examYear: 2025, rank: 0, percentile: undefined }],
    homeState: "Maharashtra",
    preferredBranches: ["Computer Science"]
  });

  assert.equal(result.success, false);
});

test("rejects percentile outside 0 to 100 inside an exam entry", () => {
  const result = parseStudentProfile({
    ...defaultProfileValues,
    exams: [{ exam: "JEE Main", examYear: 2025, rank: undefined, percentile: 101 }],
    homeState: "Maharashtra",
    preferredBranches: ["Computer Science"]
  });

  assert.equal(result.success, false);
});

test("requires at least one preferred branch", () => {
  const result = parseStudentProfile({
    ...defaultProfileValues,
    rank: 12345,
    preferredBranches: [],
    homeState: "Maharashtra"
  });

  assert.equal(result.success, false);
});

test("requires preference weights totaling 100", () => {
  const result = parseStudentProfile({
    ...defaultProfileValues,
    rank: 12345,
    homeState: "Maharashtra",
    preferredBranches: ["Computer Science"],
    weights: {
      ...defaultProfileValues.weights,
      culture: 10
    }
  });

  assert.equal(result.success, false);
});

test("saves and loads a valid guest profile from localStorage-compatible storage", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    }
  };

  const profile = validProfile();
  saveProfileToStorage(storage, profile);
  const loaded = loadProfileFromStorage(storage);

  assert.equal(values.has(profileStorageKey), true);
  assert.equal(loaded?.id, profile.id);
  assert.equal(loaded?.exams[0]?.rank, profile.exams[0]?.rank);
  assert.equal(loaded?.homeState, profile.homeState);
  assert.deepEqual(loaded?.preferredBranches, profile.preferredBranches);
  assert.equal(getPreferenceWeightTotal(profile.weights), 100);
});
