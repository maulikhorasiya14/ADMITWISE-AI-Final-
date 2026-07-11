import assert from "node:assert/strict";
import test from "node:test";
import {
  assertExactlyTwoComparisonOptions,
  calculateTotalFourYearCost,
  compareCategoryWinner,
  comparisonModeWeights,
  scoreAdmissionChance,
  scoreBranchFit,
  scoreOverallFit,
  scoreRecommendationFit,
  scoreRoi,
  selectPlacementPackage,
  classifyRecommendation
} from "../src/index.ts";

test("classifies a strong recommendation as safe", () => {
  assert.equal(classifyRecommendation(82), "SAFE");
});

test("scores rank inside cutoff as high admission chance", () => {
  const result = scoreAdmissionChance({
    studentRank: 9000,
    openingRank: 5000,
    closingRank: 10000
  });

  assert.equal(result.score, 73);
  assert.deepEqual(result.missingData, []);
});

test("scores rank near cutoff as still possible but lower", () => {
  const result = scoreAdmissionChance({
    studentRank: 11000,
    closingRank: 10000
  });

  assert.equal(result.score, 54);
  assert.equal(classifyRecommendation(result.score), "AMBITIOUS");
});

test("scores branch preference match higher than non-preferred branch", () => {
  const preferred = scoreBranchFit({
    branchName: "Computer Science and Engineering",
    preferredBranches: ["Computer Science"]
  });
  const other = scoreBranchFit({
    branchName: "Mechanical Engineering",
    preferredBranches: ["Computer Science"]
  });

  assert.equal(preferred.score, 100);
  assert.equal(other.score, 35);
});

test("calculates a weighted overall fit score", () => {
  const result = scoreOverallFit({
    weights: {
      admissionChance: 20,
      branchFit: 20,
      placement: 20,
      affordability: 15,
      scholarship: 10,
      location: 10,
      culture: 5
    },
    componentScores: {
      admission: 80,
      branchFit: 90,
      placement: 70,
      affordability: 60,
      scholarship: 50,
      location: 70,
      culture: 80
    }
  });

  assert.equal(result.score, 73);
  assert.deepEqual(result.missingData, []);
});

test("calculates recommendation fit from available cutoff and branch signals", () => {
  const result = scoreRecommendationFit({
    weights: {
      admissionChance: 20,
      branchFit: 20
    },
    componentScores: {
      admission: 80,
      branchFit: 100
    }
  });

  assert.equal(result.score, 90);
});

test("calculates total four-year cost from annual and one-time fees", () => {
  const result = calculateTotalFourYearCost({
    tuitionFee: 100000,
    hostelFee: 50000,
    messFee: 40000,
    admissionFee: 10000,
    refundableDeposit: 20000,
    otherCompulsoryFees: 5000
  });

  assert.equal(result.score, 795000);
  assert.deepEqual(result.missingData, []);
});

test("reports missing hostel or mess fee while calculating available cost", () => {
  const result = calculateTotalFourYearCost({
    tuitionFee: 100000
  });

  assert.equal(result.score, 400000);
  assert.deepEqual(result.missingData, ["hostel_fee", "mess_fee"]);
});

test("prefers median package over average package", () => {
  const selected = selectPlacementPackage({
    medianPackage: 8,
    averagePackage: 10
  });

  assert.equal(selected.packageLpa, 8);
  assert.equal(selected.source, "median");
});

test("calculates ROI using selected package and four-year cost", () => {
  const result = scoreRoi({
    fourYearCost: 800000,
    medianPackage: 8,
    averagePackage: 10
  });

  assert.equal(result.score, 100);
});

test("defines Student Mode weights around student priorities", () => {
  assert.deepEqual(comparisonModeWeights.student, {
    branchFit: 30,
    placement: 30,
    admissionChance: 25,
    affordability: 15,
    dataConfidence: 0
  });
});

test("defines Parent Mode weights around parent priorities", () => {
  assert.deepEqual(comparisonModeWeights.parent, {
    branchFit: 0,
    placement: 25,
    admissionChance: 20,
    affordability: 30,
    dataConfidence: 25
  });
});

test("selects comparison winner by category", () => {
  assert.equal(compareCategoryWinner(80, 70), "left");
  assert.equal(compareCategoryWinner(500000, 600000, false), "left");
  assert.equal(compareCategoryWinner(null, undefined), "insufficient_data");
});

test("comparison requires exactly two options", () => {
  assert.equal(assertExactlyTwoComparisonOptions(["a", "b"]).score, 100);
  assert.deepEqual(assertExactlyTwoComparisonOptions(["a"]).missingData, ["exactly_two_options"]);
});
