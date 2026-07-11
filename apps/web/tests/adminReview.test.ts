import assert from "node:assert/strict";
import test from "node:test";
import {
  approveRecord,
  canPublish,
  canReview,
  filterStagedRecords,
  getReviewBlockers,
  isValidStagedRecordId,
  rejectRecord,
  validatePublishRequest,
  type AdminUser,
  type DataConflict,
  type StagedRecord
} from "../src/features/admin/adminReviewCore.ts";

const researcher: AdminUser = { id: "researcher-1", roles: ["researcher"] };
const admin: AdminUser = { id: "admin-1", roles: ["admin"] };
const student: AdminUser = { id: "student-1", roles: ["student"] };

function stagedRecord(overrides: Partial<StagedRecord> = {}): StagedRecord {
  return {
    id: "record-1",
    extraction_job_id: "job-1",
    source_file_id: "source-file-1",
    source_id: "source-1",
    college_id: "college-1",
    data_category: "cutoffs",
    academic_year: "2025-26",
    raw_extracted_data: { branch: "CSE" },
    normalized_data: {
      college_id: "college-1",
      branch_id: "branch-1",
      exam: "JEE Main",
      year: 2025,
      admission_year: 2025,
      counselling_system: "JoSAA",
      round: "1",
      category: "GENERAL",
      quota: "AI",
      closing_rank: 2000,
      source_id: "source-1"
    },
    validation_errors: [],
    confidence_level: "A",
    status: "needs_review",
    created_at: "2026-06-24T00:00:00.000Z",
    updated_at: "2026-06-24T00:00:00.000Z",
    ...overrides
  };
}

function blockingConflict(overrides: Partial<DataConflict> = {}): DataConflict {
  return {
    id: "conflict-1",
    staged_record_id: "record-1",
    severity: "blocking",
    status: "open",
    conflict_key: "cutoff-record",
    field_name: "closing_rank",
    existing_value: 1500,
    incoming_value: 2000,
    ...overrides
  };
}

test("filters and paginates staged records", () => {
  const records = [
    stagedRecord({ id: "record-1", data_category: "cutoffs", status: "needs_review" }),
    stagedRecord({ id: "record-2", data_category: "fees", status: "approved", confidence_level: "B" }),
    stagedRecord({ id: "record-3", data_category: "cutoffs", status: "approved" })
  ];

  const result = filterStagedRecords(records, { category: "cutoffs", status: "approved", pageSize: 1 });

  assert.equal(result.total, 1);
  assert.equal(result.records[0]?.id, "record-3");
  assert.equal(result.totalPages, 1);
});

test("keeps raw and normalized data available for review display", () => {
  const record = stagedRecord({ raw_extracted_data: { branch: "CSE" }, normalized_data: { branch_name: "Computer Science" } });

  assert.equal(record.raw_extracted_data.branch, "CSE");
  assert.equal(record.normalized_data.branch_name, "Computer Science");
});

test("reports validation errors and conflict blockers", () => {
  const blockers = getReviewBlockers(stagedRecord({ validation_errors: ["closing rank below opening rank"] }), [
    blockingConflict()
  ]);

  assert.equal(blockers.canApprove, false);
  assert.equal(blockers.canPublish, false);
  assert.equal(blockers.validationBlockers.length, 1);
  assert.equal(blockers.conflictBlockers.length, 1);
});

test("approves a clean staged record for researchers", () => {
  const result = approveRecord(stagedRecord(), [], researcher, "2026-06-24T01:00:00.000Z");

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.status, "approved");
    assert.equal(result.data.reviewer_id, researcher.id);
  }
});

test("blocks approval when validation errors exist", () => {
  const result = approveRecord(stagedRecord({ validation_errors: ["missing source"] }), [], researcher);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.code, "VALIDATION_ERROR");
  }
});

test("requires rejection reason", () => {
  const result = rejectRecord(stagedRecord(), researcher, " ");

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.code, "VALIDATION_ERROR");
  }
});

test("blocks unauthorized and student review permissions", () => {
  assert.equal(canReview([]), false);
  assert.equal(canReview(student.roles), false);
  assert.equal(canPublish(student.roles), false);
});

test("allows researcher review but not publishing", () => {
  assert.equal(canReview(researcher.roles), true);
  assert.equal(canPublish(researcher.roles), false);
});

test("allows admin publishing", () => {
  assert.equal(canReview(admin.roles), true);
  assert.equal(canPublish(admin.roles), true);
});

test("blocks publishing rejected records", () => {
  const result = validatePublishRequest(stagedRecord({ status: "rejected" }), [], admin);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.code, "VALIDATION_ERROR");
  }
});

test("blocks publishing unapproved records", () => {
  const result = validatePublishRequest(stagedRecord({ status: "needs_review" }), [], admin);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.code, "VALIDATION_ERROR");
  }
});

test("allows only approved records to enter publishing", () => {
  const result = validatePublishRequest(stagedRecord({ status: "approved" }), [], admin);

  assert.equal(result.success, true);
});

test("prevents duplicate publishing of an already published staged record", () => {
  const result = validatePublishRequest(stagedRecord({ status: "published" }), [], admin);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.code, "CONFLICT");
  }
});

test("handles unsupported categories safely", () => {
  const result = validatePublishRequest(stagedRecord({ status: "approved", data_category: "recruiters" }), [], admin);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.code, "VALIDATION_ERROR");
  }
});

test("staging records have no public access path in workflow permissions", () => {
  assert.equal(canReview([]), false);
  assert.equal(canPublish([]), false);
});

test("malformed staged record IDs are rejected before database access", () => {
  assert.equal(isValidStagedRecordId("record-1"), false);
  assert.equal(isValidStagedRecordId("00000000-0000-4000-8000-000000000001"), true);
});
