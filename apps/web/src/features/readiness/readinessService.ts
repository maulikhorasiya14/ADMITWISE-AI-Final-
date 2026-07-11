import "server-only";

import { z } from "zod";
import { evaluateCollegeReadiness, summarizeReadiness, toReadinessExportRows, type ReadinessCollegeInput } from "@/features/readiness/readinessCore";
import { readinessStateSchema, type ReadinessAssessment, type ReadinessCategory, type ReadinessState } from "@/features/readiness/readinessTypes";
import { requireAdminRouteAccess } from "@/features/auth/authService";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string; status: number };

export type ReadinessFilters = {
  state?: ReadinessState | "all";
  search?: string;
  publication?: "all" | "published" | "draft";
  conflicts?: "all" | "open";
  missingSources?: "all" | "yes";
  category?: ReadinessCategory | "all";
};

type ReadinessListResult = {
  assessments: ReadinessAssessment[];
  summary: ReturnType<typeof summarizeReadiness>;
};

const uuidSchema = z.string().uuid();

const collegeRowSchema = z.object({
  id: z.string(),
  slug: z.string().nullable(),
  name: z.string(),
  is_published: z.boolean()
});

const branchRowSchema = z.object({
  id: z.string(),
  college_id: z.string(),
  source_id: z.string().nullable(),
  verification_status: z.string().nullable()
});

const cutoffRowSchema = z.object({
  id: z.string(),
  college_id: z.string(),
  admission_year: z.number().nullable(),
  year: z.number().nullable(),
  round: z.string().nullable(),
  category: z.string().nullable(),
  quota: z.string().nullable(),
  gender_pool: z.string().nullable(),
  source_id: z.string().nullable(),
  verification_status: z.string().nullable(),
  publication_status: z.string().nullable()
});

const feeRowSchema = z.object({
  id: z.string(),
  college_id: z.string(),
  academic_year: z.string().nullable(),
  source_id: z.string().nullable(),
  verification_status: z.string().nullable(),
  is_published: z.boolean().nullable()
});

const placementRowSchema = z.object({
  id: z.string(),
  college_id: z.string(),
  placement_year: z.string().nullable(),
  source_id: z.string().nullable(),
  verification_status: z.string().nullable(),
  is_published: z.boolean().nullable()
});

const collegeScholarshipRowSchema = z.object({
  college_id: z.string(),
  scholarship_id: z.string(),
  source_id: z.string().nullable(),
  verification_status: z.string().nullable(),
  is_published: z.boolean().nullable()
});

const stagedRecordRowSchema = z.object({
  id: z.string(),
  college_id: z.string().nullable(),
  data_category: z.string(),
  status: z.string(),
  validation_errors: z.array(z.string()).default([])
});

const conflictRowSchema = z.object({
  id: z.string(),
  staged_record_id: z.string().nullable(),
  status: z.string(),
  severity: z.string()
});

export async function listCollegeReadiness(filters: ReadinessFilters = {}): Promise<ServiceResult<ReadinessListResult>> {
  const access = await requireAdminRouteAccess();
  if (!access.success) {
    return access;
  }

  try {
    const assessments = await loadReadinessAssessments();
    const filtered = applyReadinessFilters(assessments, filters);
    return {
      success: true,
      data: {
        assessments: filtered,
        summary: summarizeReadiness(filtered)
      }
    };
  } catch {
    return {
      success: false,
      code: "DATA_INCOMPLETE",
      message: "Unable to load readiness data. Check that Milestone 3-7 Supabase migrations have been applied.",
      status: 500
    };
  }
}

export async function getCollegeReadinessDetail(collegeId: string): Promise<ServiceResult<ReadinessAssessment>> {
  const parsed = uuidSchema.safeParse(collegeId);
  if (!parsed.success) {
    return { success: false, code: "VALIDATION_ERROR", message: "Malformed college ID.", status: 400 };
  }

  const result = await listCollegeReadiness();
  if (!result.success) {
    return result;
  }

  const assessment = result.data.assessments.find((item) => item.collegeId === collegeId);
  if (!assessment) {
    return { success: false, code: "NOT_FOUND", message: "College readiness record not found.", status: 404 };
  }

  return { success: true, data: assessment };
}

export async function exportCollegeReadiness(filters: ReadinessFilters = {}) {
  const result = await listCollegeReadiness(filters);
  if (!result.success) {
    return result;
  }

  return { success: true as const, data: toReadinessExportRows(result.data.assessments) };
}

async function loadReadinessAssessments() {
  const supabase = createSupabaseServiceRoleClient();
  const [colleges, branches, cutoffs, fees, placements, collegeScholarships, stagedRecords, conflicts] = await Promise.all([
    supabase.from("colleges").select("id, slug, name, is_published").order("name", { ascending: true }),
    supabase.from("college_branches").select("id, college_id, source_id, verification_status"),
    supabase
      .from("cutoff_records")
      .select("id, college_id, admission_year, year, round, category, quota, gender_pool, source_id, verification_status, publication_status"),
    supabase.from("fees").select("id, college_id, academic_year, source_id, verification_status, is_published"),
    supabase.from("placements").select("id, college_id, placement_year, source_id, verification_status, is_published"),
    supabase.from("college_scholarships").select("college_id, scholarship_id, source_id, verification_status, is_published"),
    supabase.schema("staging").from("staged_records").select("id, college_id, data_category, status, validation_errors"),
    supabase.schema("staging").from("data_conflicts").select("id, staged_record_id, status, severity")
  ]);

  const queryErrors = [colleges.error, branches.error, cutoffs.error, fees.error, placements.error, collegeScholarships.error, stagedRecords.error, conflicts.error].filter(Boolean);
  if (queryErrors.length > 0) {
    throw new Error("Readiness query failed.");
  }

  const collegeRows = z.array(collegeRowSchema).parse(colleges.data ?? []);
  const branchRows = z.array(branchRowSchema).parse(branches.data ?? []);
  const cutoffRows = z.array(cutoffRowSchema).parse(cutoffs.data ?? []);
  const feeRows = z.array(feeRowSchema).parse(fees.data ?? []);
  const placementRows = z.array(placementRowSchema).parse(placements.data ?? []);
  const scholarshipRows = z.array(collegeScholarshipRowSchema).parse(collegeScholarships.data ?? []);
  const stagedRows = z.array(stagedRecordRowSchema).parse(stagedRecords.data ?? []);
  const conflictRows = z.array(conflictRowSchema).parse(conflicts.data ?? []);
  const stagedById = new Map(stagedRows.map((row) => [row.id, row]));

  return collegeRows.map((college) => {
    const staging = buildStagingCounts(college.id, stagedRows, conflictRows, stagedById);
    const input: ReadinessCollegeInput = {
      college,
      publishedBranches: branchRows.filter((row) => row.college_id === college.id),
      publishedCutoffs: cutoffRows.filter((row) => row.college_id === college.id),
      publishedFees: feeRows.filter((row) => row.college_id === college.id),
      publishedPlacements: placementRows.filter((row) => row.college_id === college.id),
      publishedScholarships: scholarshipRows
        .filter((row) => row.college_id === college.id)
        .map((row) => ({
          id: row.scholarship_id,
          source_id: row.source_id,
          verification_status: row.verification_status,
          is_published: row.is_published
        })),
      staging
    };

    return evaluateCollegeReadiness(input);
  });
}

function buildStagingCounts(
  collegeId: string,
  stagedRows: Array<z.infer<typeof stagedRecordRowSchema>>,
  conflictRows: Array<z.infer<typeof conflictRowSchema>>,
  stagedById: Map<string, z.infer<typeof stagedRecordRowSchema>>
) {
  const collegeStaged = stagedRows.filter((row) => row.college_id === collegeId);
  const stagedIds = new Set(collegeStaged.map((row) => row.id));
  const openConflicts = conflictRows.filter((row) => {
    const stagedRecord = row.staged_record_id ? stagedById.get(row.staged_record_id) : null;
    return stagedRecord?.college_id === collegeId && ["open", "unresolved"].includes(row.status);
  });

  return {
    staged: collegeStaged.filter((row) => row.status !== "published").length,
    needsReview: collegeStaged.filter((row) => row.status === "needs_review").length,
    approvedUnpublished: collegeStaged.filter((row) => row.status === "approved").length,
    rejected: collegeStaged.filter((row) => row.status === "rejected").length,
    conflicts: openConflicts.length,
    blockingValidationIssues: collegeStaged.filter((row) => row.validation_errors.length > 0 && stagedIds.has(row.id) && row.status !== "rejected").length
  };
}

function applyReadinessFilters(assessments: ReadinessAssessment[], filters: ReadinessFilters) {
  const search = filters.search?.trim().toLowerCase();
  return assessments.filter((assessment) => {
    if (filters.state && filters.state !== "all" && assessment.state !== filters.state) {
      return false;
    }
    if (search && !assessment.collegeName.toLowerCase().includes(search) && !assessment.collegeSlug?.toLowerCase().includes(search)) {
      return false;
    }
    if (filters.publication === "published" && !assessment.isPublished) {
      return false;
    }
    if (filters.publication === "draft" && assessment.isPublished) {
      return false;
    }
    if (filters.conflicts === "open" && assessment.counts.staging.conflicts === 0) {
      return false;
    }
    if (filters.missingSources === "yes" && assessment.coverage.missingSourceReferenceCount === 0) {
      return false;
    }
    if (filters.category && filters.category !== "all") {
      return assessment.categories.some((category) => category.category === filters.category && category.state !== "complete");
    }
    return true;
  });
}

export function parseReadinessFilters(url: URL): ReadinessFilters {
  const stateParam = url.searchParams.get("state");
  const state = stateParam && readinessStateSchema.safeParse(stateParam).success ? (stateParam as ReadinessState) : "all";
  const categoryParam = url.searchParams.get("category");
  const category = isReadinessCategory(categoryParam) ? categoryParam : "all";
  const publicationParam = url.searchParams.get("publication");
  const conflictsParam = url.searchParams.get("conflicts");
  const missingSourcesParam = url.searchParams.get("missingSources");

  return {
    state,
    category,
    search: url.searchParams.get("q") ?? undefined,
    publication: publicationParam === "published" || publicationParam === "draft" ? publicationParam : "all",
    conflicts: conflictsParam === "open" ? "open" : "all",
    missingSources: missingSourcesParam === "yes" ? "yes" : "all"
  };
}

function isReadinessCategory(value: string | null): value is ReadinessCategory {
  return Boolean(
    value &&
      ["college_identity", "branches", "cutoffs", "fees", "placements", "scholarships", "sources"].includes(value)
  );
}
