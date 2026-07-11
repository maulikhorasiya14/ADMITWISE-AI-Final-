import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateCollegeReadiness,
  toReadinessExportRows,
  type ReadinessCollegeInput
} from "../src/features/readiness/readinessCore.ts";

function readyCollege(overrides: Partial<ReadinessCollegeInput> = {}): ReadinessCollegeInput {
  return {
    college: {
      id: "00000000-0000-4000-8000-000000000001",
      slug: "example-institute-alpha",
      name: "Example Institute Alpha",
      is_published: true
    },
    publishedBranches: [
      {
        id: "branch-1",
        source_id: "source-branch",
        verification_status: "published"
      }
    ],
    publishedCutoffs: [2023, 2024, 2025].map((year) => ({
      id: `cutoff-${year}`,
      admission_year: year,
      year,
      round: "1",
      category: "GENERAL",
      quota: "AI",
      gender_pool: "OPEN",
      source_id: `source-cutoff-${year}`,
      verification_status: "published",
      publication_status: "published"
    })),
    publishedFees: [
      {
        id: "fee-1",
        academic_year: "2025-26",
        source_id: "source-fee",
        verification_status: "published",
        is_published: true
      }
    ],
    publishedPlacements: [
      {
        id: "placement-1",
        placement_year: "2025",
        source_id: "source-placement",
        verification_status: "published",
        is_published: true
      }
    ],
    publishedScholarships: [
      {
        id: "scholarship-1",
        source_id: "source-scholarship",
        verification_status: "published",
        is_published: true
      }
    ],
    staging: {
      staged: 0,
      needsReview: 0,
      approvedUnpublished: 0,
      rejected: 0,
      conflicts: 0,
      blockingValidationIssues: 0
    },
    ...overrides
  };
}

test("marks a fully published fictional college as demo ready", () => {
  const assessment = evaluateCollegeReadiness(readyCollege());

  assert.equal(assessment.state, "demo_ready");
  assert.equal(assessment.completenessPercentage, 100);
  assert.deepEqual(assessment.coverage.cutoffYears, [2023, 2024, 2025]);
});

test("staging-only records do not count as published readiness", () => {
  const assessment = evaluateCollegeReadiness(
    readyCollege({
      publishedBranches: [],
      publishedCutoffs: [],
      publishedFees: [],
      publishedPlacements: [],
      publishedScholarships: [],
      staging: {
        staged: 3,
        needsReview: 3,
        approvedUnpublished: 0,
        rejected: 0,
        conflicts: 0,
        blockingValidationIssues: 0
      }
    })
  );

  assert.notEqual(assessment.state, "demo_ready");
  assert.equal(assessment.counts.branches.published, 0);
  assert.equal(assessment.counts.staging.needsReview, 3);
});

test("approved but unpublished staged records are not treated as public data", () => {
  const assessment = evaluateCollegeReadiness(
    readyCollege({
      publishedBranches: [],
      publishedCutoffs: [],
      staging: {
        staged: 1,
        needsReview: 0,
        approvedUnpublished: 1,
        rejected: 0,
        conflicts: 0,
        blockingValidationIssues: 0
      }
    })
  );

  assert.notEqual(assessment.state, "demo_ready");
  assert.equal(assessment.counts.staging.approvedUnpublished, 1);
});

test("an unpublished college cannot be demo ready", () => {
  const assessment = evaluateCollegeReadiness(
    readyCollege({
      college: {
        id: "00000000-0000-4000-8000-000000000002",
        slug: "example-institute-alpha-draft",
        name: "Example Institute Alpha Draft",
        is_published: false
      }
    })
  );

  assert.equal(assessment.state, "blocked");
  assert.ok(assessment.checklist.some((item) => item.id === "college-published" && item.status === "blocked"));
});

test("missing published branch blocks readiness", () => {
  const assessment = evaluateCollegeReadiness(readyCollege({ publishedBranches: [] }));

  assert.equal(assessment.state, "blocked");
  assert.ok(assessment.checklist.some((item) => item.id === "branches-published" && item.severity === "blocking"));
});

test("missing historical cutoff year appears in the checklist", () => {
  const assessment = evaluateCollegeReadiness(
    readyCollege({
      publishedCutoffs: readyCollege().publishedCutoffs.filter((record) => record.admission_year !== 2024)
    })
  );

  assert.equal(assessment.state, "blocked");
  assert.ok(assessment.checklist.some((item) => item.id === "cutoff-coverage" && item.message.includes("2024")));
});

test("missing fees are a warning instead of a fabricated zero", () => {
  const assessment = evaluateCollegeReadiness(readyCollege({ publishedFees: [] }));
  const feeCategory = assessment.categories.find((category) => category.category === "fees");

  assert.equal(assessment.state, "partially_published");
  assert.equal(assessment.latestFeeYear, null);
  assert.equal(feeCategory?.summary, "0 published fee record(s)");
});

test("missing placements are reported without blocking source-backed core data", () => {
  const assessment = evaluateCollegeReadiness(readyCollege({ publishedPlacements: [] }));

  assert.equal(assessment.state, "partially_published");
  assert.equal(assessment.latestPlacementYear, null);
  assert.ok(assessment.checklist.some((item) => item.id === "placements-published" && item.severity === "warning"));
});

test("unresolved conflicts prevent demo readiness", () => {
  const assessment = evaluateCollegeReadiness(
    readyCollege({
      staging: {
        staged: 1,
        needsReview: 0,
        approvedUnpublished: 0,
        rejected: 0,
        conflicts: 1,
        blockingValidationIssues: 0
      }
    })
  );

  assert.equal(assessment.state, "blocked");
});

test("missing source references block readiness", () => {
  const assessment = evaluateCollegeReadiness(
    readyCollege({
      publishedBranches: [{ id: "branch-1", source_id: null, verification_status: "published" }]
    })
  );

  assert.equal(assessment.state, "blocked");
  assert.equal(assessment.coverage.missingSourceReferenceCount, 1);
});

test("export rows exclude raw extracted and normalized data", () => {
  const [row] = toReadinessExportRows([evaluateCollegeReadiness(readyCollege())]);

  assert.ok(row);
  assert.equal(Object.hasOwn(row, "raw_extracted_data"), false);
  assert.equal(Object.hasOwn(row, "normalized_data"), false);
  assert.equal(Object.hasOwn(row, "validation_errors"), false);
});
