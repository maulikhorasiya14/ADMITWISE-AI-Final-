import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SavedStudentProfile } from "@/features/profile/profileSchema";
import { buildRecommendations } from "@/features/recommendations/recommendationEngine";
import { publishedCutoffCandidateSchema } from "@/features/recommendations/recommendationTypes";
import { buildComparisonResult } from "./comparisonEngine";
import {
  comparisonBranchOptionSchema,
  comparisonModeSchema,
  feeRecordSchema,
  placementRecordSchema,
  type ComparisonBranchOption,
  type ComparisonMode,
  type ComparisonResult
} from "./comparisonTypes";

type ComparisonServiceResult =
  | { success: true; data: ComparisonResult | null }
  | { success: false; message: string };

const branchQuerySchema = comparisonBranchOptionSchema.pick({
  collegeId: true,
  collegeSlug: true,
  collegeName: true,
  collegeCity: true,
  collegeState: true,
  collegeIsPublished: true,
  branchId: true,
  branchName: true,
  branchDegree: true,
  branchVerificationStatus: true,
  confidenceLevel: true
}).array();

type BranchQueryRow = {
  id: string;
  name: string;
  degree: string;
  verification_status: string;
  confidence_level: string | null;
  colleges: {
    id: string;
    slug: string;
    name: string;
    city: string;
    state: string;
    is_published: boolean;
  } | Array<{
    id: string;
    slug: string;
    name: string;
    city: string;
    state: string;
    is_published: boolean;
  }>;
};

export async function getComparisonForProfile(input: {
  profile: SavedStudentProfile;
  optionIds: string[];
  mode: ComparisonMode;
  scholarshipAmount?: number;
}): Promise<ComparisonServiceResult> {
  const parsedMode = comparisonModeSchema.safeParse(input.mode);
  if (!parsedMode.success || input.optionIds.length !== 2) {
    return { success: true, data: null };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: branchRows, error: branchError } = await supabase
      .from("college_branches")
      .select("id, name, degree, verification_status, confidence_level, colleges!inner(id, slug, name, city, state, is_published)")
      .in("id", input.optionIds)
      .eq("verification_status", "published")
      .eq("colleges.is_published", true);

    if (branchError) {
      return { success: false, message: "Unable to load comparison options." };
    }

    const branches = normalizeBranchRows((branchRows ?? []) as unknown as BranchQueryRow[]);
    const parsedBranches = branchQuerySchema.safeParse(branches);
    if (!parsedBranches.success) {
      return { success: false, message: "Comparison option data did not match the expected format." };
    }

    const collegeIds = [...new Set(parsedBranches.data.map((branch) => branch.collegeId))];
    const branchIds = parsedBranches.data.map((branch) => branch.branchId);
    const [fees, placements, recommendations] = await Promise.all([
      fetchFees(collegeIds),
      fetchPlacements(collegeIds),
      fetchRecommendations(input.profile, branchIds)
    ]);

    const options = parsedBranches.data.map((branch): ComparisonBranchOption => {
      const recommendation = recommendations.find((item) => item.branchId === branch.branchId);
      const placement = choosePlacementForBranch(placements, branch.collegeId, branch.branchId);

      return {
        ...branch,
        optionId: branch.branchId,
        fee: fees.find((fee) => fee.college_id === branch.collegeId) ?? null,
        placement,
        admissionClassification: recommendation?.classification ?? null,
        admissionScore: recommendation?.componentScores.admission ?? null,
        branchFitScore: recommendation?.componentScores.branchFit ?? null
      };
    });

    return {
      success: true,
      data: buildComparisonResult(options, parsedMode.data, input.scholarshipAmount, input.profile.maximumAnnualBudget)
    };
  } catch {
    return { success: false, message: "Supabase is not configured or is unavailable." };
  }
}

export async function listPublishedComparisonOptions(): Promise<
  | { success: true; data: Array<{ optionId: string; label: string; collegeName: string; branchName: string }> }
  | { success: false; message: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("college_branches")
      .select("id, name, degree, verification_status, confidence_level, colleges!inner(id, slug, name, city, state, is_published)")
      .eq("verification_status", "published")
      .eq("colleges.is_published", true)
      .order("name", { ascending: true });

    if (error) {
      return { success: false, message: "Unable to load comparison options." };
    }

    const rows = ((data ?? []) as unknown as BranchQueryRow[]).map((row) => {
      const college = Array.isArray(row.colleges) ? row.colleges[0] : row.colleges;
      return {
      optionId: row.id,
      collegeName: college?.name ?? "Unknown college",
      branchName: row.name,
      label: `${college?.name ?? "Unknown college"} - ${row.name}`
      };
    });

    return { success: true, data: rows };
  } catch {
    return { success: false, message: "Supabase is not configured or is unavailable." };
  }
}

async function fetchFees(collegeIds: string[]) {
  if (collegeIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("fees")
    .select("id, college_id, academic_year, tuition_fee, hostel_fee, mess_fee, admission_fee, refundable_deposit, other_compulsory_fees, estimated_four_year_cost, source_id, verification_status, is_published, sources(id, title, source_type, academic_year, confidence_level)")
    .in("college_id", collegeIds)
    .eq("verification_status", "published")
    .eq("is_published", true)
    .order("academic_year", { ascending: false });

  return feeRecordSchema.array().parse(data ?? []);
}

async function fetchPlacements(collegeIds: string[]) {
  if (collegeIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("placements")
    .select("id, college_id, branch_id, placement_year, graduating_students, students_placed, placement_percentage, average_package, median_package, highest_package, source_id, verification_status, is_published, sources(id, title, source_type, academic_year, confidence_level)")
    .in("college_id", collegeIds)
    .eq("verification_status", "published")
    .eq("is_published", true)
    .order("placement_year", { ascending: false });

  return placementRecordSchema.array().parse(data ?? []);
}

async function fetchRecommendations(profile: SavedStudentProfile, branchIds: string[]) {
  if (branchIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cutoff_records")
    .select("id, exam, admission_year, counselling_system, round, category, quota, gender_pool, opening_rank, closing_rank, source_id, verification_status, publication_status, colleges!inner(id, slug, name, city, state, is_published), college_branches!inner(id, name, degree, verification_status, confidence_level)")
    .in("branch_id", branchIds)
    .in("exam", profile.exams.map(e => e.exam))
    .eq("category", profile.category)
    .eq("verification_status", "published")
    .eq("publication_status", "published")
    .eq("colleges.is_published", true)
    .eq("college_branches.verification_status", "published");

  const parsed = publishedCutoffCandidateSchema.array().safeParse(data ?? []);
  return parsed.success ? buildRecommendations(profile, parsed.data) : [];
}

function normalizeBranchRows(rows: BranchQueryRow[]) {
  return rows.flatMap((row) => {
    const college = Array.isArray(row.colleges) ? row.colleges[0] : row.colleges;
    if (!college) {
      return [];
    }

    return [{
      collegeId: college.id,
      collegeSlug: college.slug,
      collegeName: college.name,
      collegeCity: college.city,
      collegeState: college.state,
      collegeIsPublished: college.is_published,
      branchId: row.id,
      branchName: row.name,
      branchDegree: row.degree,
      branchVerificationStatus: row.verification_status,
      confidenceLevel: row.confidence_level
    }];
  });
}

function choosePlacementForBranch(placements: Awaited<ReturnType<typeof fetchPlacements>>, collegeId: string, branchId: string) {
  return (
    placements.find((placement) => placement.branch_id === branchId) ??
    placements.find((placement) => placement.college_id === collegeId && placement.branch_id === null) ??
    null
  );
}
