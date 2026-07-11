import assert from "node:assert/strict";
import test from "node:test";
import { buildComparisonResult, filterPublishedComparisonOptions } from "../src/features/comparison/comparisonEngine.ts";
import type { ComparisonBranchOption } from "../src/features/comparison/comparisonTypes.ts";

function option(overrides: Partial<ComparisonBranchOption> = {}): ComparisonBranchOption {
  return {
    optionId: "branch-1",
    collegeId: "college-1",
    collegeSlug: "college-one",
    collegeName: "College One",
    collegeCity: "Demo City",
    collegeState: "Demo State",
    collegeIsPublished: true,
    branchId: "branch-1",
    branchName: "Computer Science",
    branchDegree: "B.Tech",
    branchVerificationStatus: "published",
    confidenceLevel: "A",
    admissionClassification: "SAFE",
    admissionScore: 80,
    branchFitScore: 100,
    fee: {
      id: "fee-1",
      college_id: "college-1",
      academic_year: "2025-26",
      tuition_fee: 100000,
      hostel_fee: 50000,
      mess_fee: 40000,
      admission_fee: 10000,
      refundable_deposit: 20000,
      other_compulsory_fees: 5000,
      estimated_four_year_cost: null,
      source_id: "source-1",
      verification_status: "published",
      is_published: true,
      sources: {
        id: "source-1",
        title: "Official fee notice",
        source_type: "official_college",
        academic_year: "2025-26",
        confidence_level: "B"
      }
    },
    placement: {
      id: "placement-1",
      college_id: "college-1",
      branch_id: "branch-1",
      placement_year: "2025",
      graduating_students: 100,
      students_placed: 80,
      placement_percentage: 80,
      average_package: 10,
      median_package: 8,
      highest_package: 20,
      source_id: "source-2",
      verification_status: "published",
      is_published: true,
      sources: {
        id: "source-2",
        title: "Official placement report",
        source_type: "official_college",
        academic_year: "2025",
        confidence_level: "B"
      }
    },
    ...overrides
  };
}

test("excludes unpublished fee and placement records from comparison inputs", () => {
  const [published] = filterPublishedComparisonOptions([
    option({
      fee: {
        ...option().fee!,
        is_published: false
      },
      placement: {
        ...option().placement!,
        verification_status: "needs_review"
      }
    })
  ]);

  assert.equal(published?.fee, null);
  assert.equal(published?.placement, null);
});

test("builds comparison with missing data warnings", () => {
  const result = buildComparisonResult([
    option({ optionId: "branch-1", branchId: "branch-1" }),
    option({
      optionId: "branch-2",
      branchId: "branch-2",
      collegeId: "college-2",
      collegeSlug: "college-two",
      collegeName: "College Two",
      fee: null,
      placement: null,
      admissionClassification: null,
      admissionScore: null
    })
  ], "student");

  assert.equal(result?.options.length, 2);
  assert.ok(result?.options[1]?.missingInformation.includes("fees"));
  assert.ok(result?.options[1]?.missingInformation.includes("placements"));
});

test("comparison is limited to exactly two colleges", () => {
  assert.equal(buildComparisonResult([option()], "student"), null);
  assert.equal(buildComparisonResult([option(), option({ optionId: "branch-2", branchId: "branch-2" }), option({ optionId: "branch-3", branchId: "branch-3" })], "parent"), null);
});
