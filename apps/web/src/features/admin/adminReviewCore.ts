import { z } from "zod";

export const adminRoleSchema = z.enum(["student", "researcher", "admin"]);
export const stagedRecordStatusSchema = z.enum(["needs_review", "approved", "rejected", "published"]);
export const stagedRecordIdSchema = z.string().uuid();
export const dataCategorySchema = z.enum([
  "college_identity",
  "branches",
  "cutoffs",
  "fees",
  "placements",
  "scholarships",
  "recruiters"
]);
export const confidenceLevelSchema = z.enum(["A", "B", "C", "D", "E"]);

export type AdminRole = z.infer<typeof adminRoleSchema>;
export type StagedRecordStatus = z.infer<typeof stagedRecordStatusSchema>;
export type DataCategory = z.infer<typeof dataCategorySchema>;
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;

export type AdminUser = {
  id: string;
  roles: AdminRole[];
};

export type DataConflict = {
  id: string;
  staged_record_id: string | null;
  severity: string;
  status: string;
  conflict_key: string;
  field_name: string;
  existing_value?: unknown;
  incoming_value?: unknown;
};

export type StagedRecord = {
  id: string;
  extraction_job_id: string;
  source_file_id: string | null;
  source_id: string | null;
  college_id: string | null;
  data_category: DataCategory;
  academic_year: string | null;
  raw_extracted_data: Record<string, unknown>;
  normalized_data: Record<string, unknown>;
  validation_errors: string[];
  confidence_level: ConfidenceLevel;
  status: StagedRecordStatus;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  publisher_id?: string | null;
  published_at?: string | null;
  published_record_table?: string | null;
  published_record_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewAuditLog = {
  id: string;
  staged_record_id: string;
  action: "approve" | "reject" | "publish";
  previous_status: string;
  new_status: string;
  acting_user: string | null;
  reason_or_notes: string | null;
  created_at: string;
};

export type RecordFilters = {
  category?: DataCategory | "all";
  status?: StagedRecordStatus | "all";
  confidence?: ConfidenceLevel | "all";
  extractionJobId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type WorkflowResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };

const blockingConflictStatuses = new Set(["open", "unresolved"]);
const blockingConflictSeverities = new Set(["error", "blocking", "critical"]);
const publishableCategories = new Set<DataCategory>([
  "college_identity",
  "branches",
  "cutoffs",
  "fees",
  "placements",
  "scholarships"
]);

export function getHighestRole(roles: AdminRole[]): AdminRole | null {
  if (roles.includes("admin")) {
    return "admin";
  }
  if (roles.includes("researcher")) {
    return "researcher";
  }
  if (roles.includes("student")) {
    return "student";
  }
  return null;
}

export function canReview(roles: AdminRole[]) {
  return roles.includes("researcher") || roles.includes("admin");
}

export function canPublish(roles: AdminRole[]) {
  return roles.includes("admin");
}

export function isValidStagedRecordId(recordId: string) {
  return stagedRecordIdSchema.safeParse(recordId).success;
}

export function getReviewBlockers(record: Pick<StagedRecord, "validation_errors">, conflicts: DataConflict[]) {
  const validationBlockers = record.validation_errors.filter(Boolean);
  const conflictBlockers = conflicts.filter(
    (conflict) =>
      blockingConflictStatuses.has(conflict.status.toLowerCase()) &&
      blockingConflictSeverities.has(conflict.severity.toLowerCase())
  );

  return {
    validationBlockers,
    conflictBlockers,
    canApprove: validationBlockers.length === 0,
    canPublish: validationBlockers.length === 0 && conflictBlockers.length === 0
  };
}

export function filterStagedRecords(records: StagedRecord[], filters: RecordFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const search = filters.search?.trim().toLowerCase();

  const filtered = records.filter((record) => {
    if (filters.category && filters.category !== "all" && record.data_category !== filters.category) {
      return false;
    }
    if (filters.status && filters.status !== "all" && record.status !== filters.status) {
      return false;
    }
    if (filters.confidence && filters.confidence !== "all" && record.confidence_level !== filters.confidence) {
      return false;
    }
    if (filters.extractionJobId && record.extraction_job_id !== filters.extractionJobId) {
      return false;
    }
    if (!search) {
      return true;
    }

    const searchable = [
      record.id,
      record.data_category,
      record.academic_year ?? "",
      JSON.stringify(record.normalized_data)
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(search);
  });

  const start = (page - 1) * pageSize;
  return {
    records: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize))
  };
}

export function approveRecord(
  record: StagedRecord,
  conflicts: DataConflict[],
  actor: AdminUser,
  now = new Date().toISOString()
): WorkflowResult<StagedRecord> {
  if (!canReview(actor.roles)) {
    return { success: false, code: "FORBIDDEN", message: "Only researchers or admins can approve staged records." };
  }
  if (record.status === "published") {
    return { success: false, code: "VALIDATION_ERROR", message: "Published records cannot be approved again." };
  }

  const blockers = getReviewBlockers(record, conflicts);
  if (!blockers.canApprove) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: "Records with validation errors must be fixed or rejected before approval."
    };
  }

  return {
    success: true,
    data: {
      ...record,
      status: "approved",
      reviewer_id: actor.id,
      reviewed_at: now,
      rejection_reason: null,
      updated_at: now
    }
  };
}

export function rejectRecord(
  record: StagedRecord,
  actor: AdminUser,
  reason: string,
  now = new Date().toISOString()
): WorkflowResult<StagedRecord> {
  if (!canReview(actor.roles)) {
    return { success: false, code: "FORBIDDEN", message: "Only researchers or admins can reject staged records." };
  }

  const rejectionReason = reason.trim();
  if (!rejectionReason) {
    return { success: false, code: "VALIDATION_ERROR", message: "A rejection reason is required." };
  }
  if (record.status === "published") {
    return { success: false, code: "VALIDATION_ERROR", message: "Published records cannot be rejected." };
  }

  return {
    success: true,
    data: {
      ...record,
      status: "rejected",
      reviewer_id: actor.id,
      reviewed_at: now,
      rejection_reason: rejectionReason,
      updated_at: now
    }
  };
}

export function validatePublishRequest(
  record: StagedRecord,
  conflicts: DataConflict[],
  actor: AdminUser
): WorkflowResult<{ targetTable: string }> {
  if (!canPublish(actor.roles)) {
    return { success: false, code: "FORBIDDEN", message: "Only admins can publish approved staged records." };
  }
  if (record.status === "published") {
    return { success: false, code: "CONFLICT", message: "This staged record has already been published." };
  }
  if (record.status !== "approved") {
    return { success: false, code: "VALIDATION_ERROR", message: "Only approved records can be published." };
  }
  if (!publishableCategories.has(record.data_category)) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: `Publishing is not implemented for ${record.data_category}.`
    };
  }

  const blockers = getReviewBlockers(record, conflicts);
  if (!blockers.canPublish) {
    return {
      success: false,
      code: "CONFLICT_DETECTED",
      message: "Blocking validation errors or unresolved conflicts must be resolved before publishing."
    };
  }

  return { success: true, data: { targetTable: getTargetTable(record.data_category) } };
}

export function getTargetTable(category: DataCategory) {
  switch (category) {
    case "college_identity":
      return "colleges";
    case "branches":
      return "college_branches";
    case "cutoffs":
      return "cutoff_records";
    case "fees":
      return "fees";
    case "placements":
      return "placements";
    case "scholarships":
      return "scholarships";
    case "recruiters":
      return "recruiter_records";
  }
}

export function buildAuditLog(input: {
  record: StagedRecord;
  action: ReviewAuditLog["action"];
  newStatus: StagedRecordStatus;
  actor: AdminUser;
  reason?: string;
}) {
  return {
    staged_record_id: input.record.id,
    action: input.action,
    previous_status: input.record.status,
    new_status: input.newStatus,
    acting_user: input.actor.id,
    reason_or_notes: input.reason?.trim() || null
  };
}
