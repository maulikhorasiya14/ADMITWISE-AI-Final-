import "server-only";

import { z } from "zod";
import {
  approveRecord,
  buildAuditLog,
  canPublish,
  canReview,
  dataCategorySchema,
  filterStagedRecords,
  getReviewBlockers,
  isValidStagedRecordId,
  rejectRecord,
  stagedRecordStatusSchema,
  validatePublishRequest,
  type AdminRole,
  type AdminUser,
  type DataCategory,
  type DataConflict,
  type RecordFilters,
  type ReviewAuditLog,
  type StagedRecord,
  type StagedRecordStatus,
  type WorkflowResult
} from "@/features/admin/adminReviewCore";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string; status: number };

type ExtractionJob = {
  id: string;
  source_url: string | null;
  local_file_path: string | null;
  source_type: string;
  data_category: DataCategory;
  academic_year: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  staged_record_count?: number;
  validation_failure_count?: number;
};

type SourceFile = {
  id: string;
  extraction_job_id: string;
  source_url: string | null;
  local_file_path: string | null;
  content_type: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  checksum_sha256: string | null;
  storage_path: string | null;
  created_at: string;
};

type AdminOverview = {
  counts: {
    pendingReview: number;
    approvedUnpublished: number;
    rejected: number;
    unresolvedConflicts: number;
  };
  recentJobs: ExtractionJob[];
};

type StagedRecordDetail = {
  record: StagedRecord;
  sourceFile: SourceFile | null;
  conflicts: DataConflict[];
  auditLogs: ReviewAuditLog[];
  blockers: ReturnType<typeof getReviewBlockers>;
  actor: AdminUser;
};

const jsonObjectSchema = z.record(z.unknown()).default({});

const stagedRecordSchema = z.object({
  id: z.string(),
  extraction_job_id: z.string(),
  source_file_id: z.string().nullable(),
  source_id: z.string().nullable(),
  college_id: z.string().nullable(),
  data_category: dataCategorySchema,
  academic_year: z.string().nullable(),
  raw_extracted_data: jsonObjectSchema,
  normalized_data: jsonObjectSchema,
  validation_errors: z.array(z.string()).default([]),
  confidence_level: z.enum(["A", "B", "C", "D", "E"]),
  status: stagedRecordStatusSchema,
  reviewer_id: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
  publisher_id: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  published_record_table: z.string().nullable().optional(),
  published_record_id: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

const conflictSchema = z.object({
  id: z.string(),
  staged_record_id: z.string().nullable(),
  severity: z.string(),
  status: z.string(),
  conflict_key: z.string(),
  field_name: z.string(),
  existing_value: z.unknown().optional(),
  incoming_value: z.unknown().optional()
});

const sourceFileSchema = z.object({
  id: z.string(),
  extraction_job_id: z.string(),
  source_url: z.string().nullable(),
  local_file_path: z.string().nullable(),
  content_type: z.string().nullable(),
  file_name: z.string().nullable(),
  file_size_bytes: z.number().nullable(),
  checksum_sha256: z.string().nullable(),
  storage_path: z.string().nullable(),
  created_at: z.string()
});

const auditLogSchema = z.object({
  id: z.string(),
  staged_record_id: z.string(),
  action: z.enum(["approve", "reject", "publish"]),
  previous_status: z.string(),
  new_status: z.string(),
  acting_user: z.string().nullable(),
  reason_or_notes: z.string().nullable(),
  created_at: z.string()
});

const extractionJobSchema = z.object({
  id: z.string(),
  source_url: z.string().nullable(),
  local_file_path: z.string().nullable(),
  source_type: z.string(),
  data_category: dataCategorySchema,
  academic_year: z.string().nullable(),
  status: z.string(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export async function getAdminOverview(): Promise<ServiceResult<AdminOverview>> {
  const context = await requireAdminUser(["researcher", "admin"]);
  if (!context.success) {
    return context;
  }

  const supabase = createSupabaseServiceRoleClient();
  const [pending, approved, rejected, conflicts, jobs] = await Promise.all([
    countStagedRecords("needs_review"),
    countStagedRecords("approved"),
    countStagedRecords("rejected"),
    supabase
      .schema("staging")
      .from("data_conflicts")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "unresolved"]),
    supabase
      .schema("staging")
      .from("extraction_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  if (jobs.error || conflicts.error) {
    return errorResult("DATA_INCOMPLETE", "Unable to load the admin overview.", 500);
  }

  return {
    success: true,
    data: {
      counts: {
        pendingReview: pending,
        approvedUnpublished: approved,
        rejected,
        unresolvedConflicts: conflicts.count ?? 0
      },
      recentJobs: z.array(extractionJobSchema).parse(jobs.data ?? [])
    }
  };
}

export async function listExtractionJobs(): Promise<ServiceResult<ExtractionJob[]>> {
  const context = await requireAdminUser(["researcher", "admin"]);
  if (!context.success) {
    return context;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("staging")
    .from("extraction_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return errorResult("DATA_INCOMPLETE", "Unable to load extraction jobs.", 500);
  }

  const jobs = z.array(extractionJobSchema).parse(data ?? []);
  const recordCounts = await getRecordCountsByJob(jobs.map((job) => job.id));

  return {
    success: true,
    data: jobs.map((job) => ({
      ...job,
      staged_record_count: recordCounts[job.id]?.records ?? 0,
      validation_failure_count: recordCounts[job.id]?.validationFailures ?? 0
    }))
  };
}

export async function listStagedRecords(filters: RecordFilters): Promise<
  ServiceResult<{
    records: StagedRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    actor: AdminUser;
  }>
> {
  const context = await requireAdminUser(["researcher", "admin"]);
  if (!context.success) {
    return context;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("staging")
    .from("staged_records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return errorResult("DATA_INCOMPLETE", "Unable to load staged records.", 500);
  }

  const records = z.array(stagedRecordSchema).parse(data ?? []);
  return { success: true, data: { ...filterStagedRecords(records, filters), actor: context.data } };
}

export async function getStagedRecordDetail(recordId: string): Promise<ServiceResult<StagedRecordDetail>> {
  const context = await requireAdminUser(["researcher", "admin"]);
  if (!context.success) {
    return context;
  }

  const recordResult = await loadStagedRecord(recordId);
  if (!recordResult.success) {
    return recordResult;
  }

  const supabase = createSupabaseServiceRoleClient();
  const [sourceFileResult, conflictsResult, auditLogsResult] = await Promise.all([
    recordResult.data.source_file_id
      ? supabase.schema("staging").from("source_files").select("*").eq("id", recordResult.data.source_file_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    loadConflicts(recordId),
    supabase
      .schema("staging")
      .from("review_audit_logs")
      .select("*")
      .eq("staged_record_id", recordId)
      .order("created_at", { ascending: false })
  ]);

  if (sourceFileResult.error || !conflictsResult.success || auditLogsResult.error) {
    return errorResult("DATA_INCOMPLETE", "Unable to load the staged record review details.", 500);
  }

  const conflicts = conflictsResult.data;
  return {
    success: true,
    data: {
      record: recordResult.data,
      sourceFile: sourceFileResult.data ? sourceFileSchema.parse(sourceFileResult.data) : null,
      conflicts,
      auditLogs: z.array(auditLogSchema).parse(auditLogsResult.data ?? []),
      blockers: getReviewBlockers(recordResult.data, conflicts),
      actor: context.data
    }
  };
}

export async function approveStagedRecord(recordId: string): Promise<ServiceResult<StagedRecord>> {
  const context = await requireAdminUser(["researcher", "admin"]);
  if (!context.success) {
    return context;
  }

  const loaded = await loadRecordAndConflicts(recordId);
  if (!loaded.success) {
    return loaded;
  }

  const transition = approveRecord(loaded.data.record, loaded.data.conflicts, context.data);
  if (!transition.success) {
    return workflowError(transition);
  }

  return persistReviewTransition(loaded.data.record, transition.data, context.data, "approve");
}

export async function rejectStagedRecord(recordId: string, reason: string): Promise<ServiceResult<StagedRecord>> {
  const context = await requireAdminUser(["researcher", "admin"]);
  if (!context.success) {
    return context;
  }

  const loaded = await loadStagedRecord(recordId);
  if (!loaded.success) {
    return loaded;
  }

  const transition = rejectRecord(loaded.data, context.data, reason);
  if (!transition.success) {
    return workflowError(transition);
  }

  return persistReviewTransition(loaded.data, transition.data, context.data, "reject", reason);
}

export async function publishApprovedRecord(recordId: string): Promise<ServiceResult<StagedRecord>> {
  const context = await requireAdminUser(["admin"]);
  if (!context.success) {
    return context;
  }

  const loaded = await loadRecordAndConflicts(recordId);
  if (!loaded.success) {
    return loaded;
  }

  const validation = validatePublishRequest(loaded.data.record, loaded.data.conflicts, context.data);
  if (!validation.success) {
    return workflowError(validation);
  }

  const publicWrite = await writePublicRecord(loaded.data.record, validation.data.targetTable);
  if (!publicWrite.success) {
    return publicWrite;
  }

  const now = new Date().toISOString();
  const updatedRecord: StagedRecord = {
    ...loaded.data.record,
    status: "published",
    publisher_id: context.data.id,
    published_at: now,
    published_record_table: validation.data.targetTable,
    published_record_id: publicWrite.data.id,
    updated_at: now
  };

  return persistReviewTransition(loaded.data.record, updatedRecord, context.data, "publish");
}

async function requireAdminUser(allowedRoles: AdminRole[]): Promise<ServiceResult<AdminUser>> {
  try {
    const userClient = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return errorResult("UNAUTHORIZED", "Sign in is required to access admin review tools.", 401);
    }

    const serviceClient = createSupabaseServiceRoleClient();
    const { data, error } = await serviceClient.from("user_roles").select("role").eq("user_id", user.id);
    if (error) {
      return errorResult("DATA_INCOMPLETE", "Unable to verify your admin permissions.", 500);
    }

    const roles = z.array(z.object({ role: z.enum(["student", "researcher", "admin"]) })).parse(data ?? []).map((row) => row.role);
    const actor = { id: user.id, roles };

    const allowed = allowedRoles.includes("admin") && canPublish(roles);
    const reviewerAllowed = allowedRoles.includes("researcher") && canReview(roles);
    if (!allowed && !reviewerAllowed) {
      return errorResult("FORBIDDEN", "Your account does not have access to this admin workflow.", 403);
    }

    return { success: true, data: actor };
  } catch {
    return errorResult("DATA_INCOMPLETE", "Admin services are not configured. Check server environment variables.", 500);
  }
}

async function countStagedRecords(status: StagedRecordStatus) {
  const supabase = createSupabaseServiceRoleClient();
  const { count } = await supabase
    .schema("staging")
    .from("staged_records")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  return count ?? 0;
}

async function getRecordCountsByJob(jobIds: string[]) {
  if (jobIds.length === 0) {
    return {};
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("staging")
    .from("staged_records")
    .select("extraction_job_id, validation_errors")
    .in("extraction_job_id", jobIds);

  if (error) {
    return {};
  }

  return z
    .array(z.object({ extraction_job_id: z.string(), validation_errors: z.array(z.string()).default([]) }))
    .parse(data ?? [])
    .reduce<Record<string, { records: number; validationFailures: number }>>((accumulator, row) => {
      const current = accumulator[row.extraction_job_id] ?? { records: 0, validationFailures: 0 };
      accumulator[row.extraction_job_id] = {
        records: current.records + 1,
        validationFailures: current.validationFailures + (row.validation_errors.length > 0 ? 1 : 0)
      };
      return accumulator;
    }, {});
}

async function loadStagedRecord(recordId: string): Promise<ServiceResult<StagedRecord>> {
  if (!isValidStagedRecordId(recordId)) {
    return errorResult("VALIDATION_ERROR", "Malformed staged record ID.", 400);
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.schema("staging").from("staged_records").select("*").eq("id", recordId).maybeSingle();

  if (error) {
    return errorResult("DATA_INCOMPLETE", "Unable to load this staged record.", 500);
  }
  if (!data) {
    return errorResult("NOT_FOUND", "Staged record not found.", 404);
  }

  return { success: true, data: stagedRecordSchema.parse(data) };
}

async function loadConflicts(recordId: string): Promise<ServiceResult<DataConflict[]>> {
  if (!isValidStagedRecordId(recordId)) {
    return errorResult("VALIDATION_ERROR", "Malformed staged record ID.", 400);
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("staging")
    .from("data_conflicts")
    .select("*")
    .eq("staged_record_id", recordId)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResult("DATA_INCOMPLETE", "Unable to load staged record conflicts.", 500);
  }

  return { success: true, data: z.array(conflictSchema).parse(data ?? []) };
}

async function loadRecordAndConflicts(recordId: string): Promise<ServiceResult<{ record: StagedRecord; conflicts: DataConflict[] }>> {
  if (!isValidStagedRecordId(recordId)) {
    return errorResult("VALIDATION_ERROR", "Malformed staged record ID.", 400);
  }

  const [record, conflicts] = await Promise.all([loadStagedRecord(recordId), loadConflicts(recordId)]);
  if (!record.success) {
    return record;
  }
  if (!conflicts.success) {
    return conflicts;
  }

  return { success: true, data: { record: record.data, conflicts: conflicts.data } };
}

async function persistReviewTransition(
  previousRecord: StagedRecord,
  nextRecord: StagedRecord,
  actor: AdminUser,
  action: ReviewAuditLog["action"],
  reason?: string
): Promise<ServiceResult<StagedRecord>> {
  const supabase = createSupabaseServiceRoleClient();
  const updatePayload = {
    status: nextRecord.status,
    reviewer_id: nextRecord.reviewer_id ?? null,
    reviewed_at: nextRecord.reviewed_at ?? null,
    rejection_reason: nextRecord.rejection_reason ?? null,
    publisher_id: nextRecord.publisher_id ?? null,
    published_at: nextRecord.published_at ?? null,
    published_record_table: nextRecord.published_record_table ?? null,
    published_record_id: nextRecord.published_record_id ?? null
  };

  const { data, error } = await supabase
    .schema("staging")
    .from("staged_records")
    .update(updatePayload)
    .eq("id", previousRecord.id)
    .select("*")
    .single();

  if (error) {
    return errorResult("DATA_INCOMPLETE", "Unable to save the review state change.", 500);
  }

  const { error: auditError } = await supabase
    .schema("staging")
    .from("review_audit_logs")
    .insert(buildAuditLog({ record: previousRecord, action, newStatus: nextRecord.status, actor, reason }));

  if (auditError) {
    return errorResult("DATA_INCOMPLETE", "The state changed, but audit logging failed.", 500);
  }

  return { success: true, data: stagedRecordSchema.parse(data) };
}

async function writePublicRecord(record: StagedRecord, targetTable: string): Promise<ServiceResult<{ id: string }>> {
  const payloadResult = createPublicPayload(record);
  if (!payloadResult.success) {
    return payloadResult;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.from(targetTable).upsert(payloadResult.data).select("id").single();

  if (error) {
    return errorResult("DATA_INCOMPLETE", `Unable to publish to public.${targetTable}.`, 500);
  }

  const parsed = z.object({ id: z.string() }).parse(data);
  return { success: true, data: parsed };
}

function createPublicPayload(record: StagedRecord): ServiceResult<Record<string, unknown>> {
  const data = record.normalized_data;
  const sourceId = getString(data.source_id) ?? record.source_id;
  const collegeId = getString(data.college_id) ?? record.college_id;

  switch (record.data_category) {
    case "college_identity":
      return requireFields(
        {
          slug: getString(data.slug),
          name: getString(data.name),
          short_name: getString(data.short_name),
          ownership: getString(data.ownership),
          city: getString(data.city),
          state: getString(data.state),
          is_published: true
        },
        ["slug", "name", "ownership", "city", "state"]
      );
    case "branches":
      return requireFields(
        {
          college_id: collegeId,
          name: getString(data.name) ?? getString(data.branch_name) ?? getString(data.branch),
          degree: getString(data.degree),
          duration_years: getNumber(data.duration_years),
          intake: getNumber(data.intake),
          source_id: sourceId,
          academic_year: record.academic_year,
          verification_status: "published",
          confidence_level: record.confidence_level
        },
        ["college_id", "name", "degree", "duration_years", "source_id"]
      );
    case "cutoffs":
      return requireFields(
        {
          college_id: collegeId,
          branch_id: getString(data.branch_id),
          exam: getString(data.exam),
          year: getNumber(data.year) ?? getAdmissionYear(record.academic_year),
          admission_year: getNumber(data.admission_year) ?? getAdmissionYear(record.academic_year),
          counselling_system: getString(data.counselling_system) ?? getString(data.exam),
          round: String(data.round ?? ""),
          category: getString(data.category),
          quota: getString(data.quota),
          gender_pool: getString(data.gender_pool),
          opening_rank: getNumber(data.opening_rank),
          closing_rank: getNumber(data.closing_rank),
          source_id: sourceId,
          academic_year: record.academic_year,
          verification_status: "published",
          publication_status: "published",
          confidence_level: record.confidence_level
        },
        ["college_id", "branch_id", "exam", "year", "admission_year", "counselling_system", "round", "category", "quota", "closing_rank", "source_id"]
      );
    case "fees":
      return requireFields(
        {
          college_id: collegeId,
          academic_year: record.academic_year ?? getString(data.academic_year),
          tuition_fee: getNumber(data.tuition_fee),
          hostel_fee: getNumber(data.hostel_fee),
          mess_fee: getNumber(data.mess_fee),
          admission_fee: getNumber(data.admission_fee),
          refundable_deposit: getNumber(data.refundable_deposit),
          other_compulsory_fees: getNumber(data.other_compulsory_fees),
          estimated_four_year_cost: getNumber(data.estimated_four_year_cost),
          source_id: sourceId,
          verification_status: "published",
          is_published: true
        },
        ["college_id", "academic_year", "source_id"]
      );
    case "placements":
      return requireFields(
        {
          college_id: collegeId,
          branch_id: getString(data.branch_id),
          placement_year: getString(data.placement_year) ?? record.academic_year,
          graduating_students: getNumber(data.graduating_students),
          students_placed: getNumber(data.students_placed),
          placement_percentage: getNumber(data.placement_percentage),
          average_package: getNumber(data.average_package),
          median_package: getNumber(data.median_package),
          highest_package: getNumber(data.highest_package),
          source_id: sourceId,
          verification_status: "published",
          is_published: true
        },
        ["college_id", "placement_year", "source_id"]
      );
    case "scholarships":
      return requireFields(
        {
          name: getString(data.name),
          provider: getString(data.provider),
          description: getString(data.description),
          applicable_states: getStringArray(data.applicable_states),
          applicable_categories: getStringArray(data.applicable_categories),
          gender_requirement: getString(data.gender_requirement),
          maximum_family_income: getNumber(data.maximum_family_income),
          minimum_marks: getNumber(data.minimum_marks),
          minimum_rank: getNumber(data.minimum_rank),
          benefit_description: getString(data.benefit_description),
          benefit_amount: getNumber(data.benefit_amount),
          required_documents: getStringArray(data.required_documents),
          renewal_conditions: getStringArray(data.renewal_conditions),
          application_deadline: getString(data.application_deadline),
          official_url: getString(data.official_url),
          source_id: sourceId,
          academic_year: record.academic_year,
          verification_status: "published",
          confidence_level: record.confidence_level,
          is_published: true
        },
        ["name", "provider", "benefit_description", "source_id"]
      );
    case "recruiters":
      return errorResult("VALIDATION_ERROR", "Recruiter publishing is not supported in Milestone 7.", 400);
  }
}

function requireFields(payload: Record<string, unknown>, fields: string[]): ServiceResult<Record<string, unknown>> {
  const missing = fields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === "");
  if (missing.length > 0) {
    return errorResult("VALIDATION_ERROR", `Cannot publish because required fields are missing: ${missing.join(", ")}.`, 400);
  }

  return {
    success: true,
    data: Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
  };
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function getAdmissionYear(academicYear: string | null) {
  if (!academicYear) {
    return undefined;
  }
  const match = academicYear.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}

function workflowError<T>(result: WorkflowResult<T>): ServiceResult<never> {
  if (result.success) {
    throw new Error("Expected workflow error.");
  }

  const status = result.code === "FORBIDDEN" ? 403 : result.code === "CONFLICT" ? 409 : 400;
  return errorResult(result.code, result.message, status);
}

function errorResult(code: string, message: string, status: number): ServiceResult<never> {
  return { success: false, code, message, status };
}
