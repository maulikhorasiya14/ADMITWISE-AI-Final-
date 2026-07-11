import "server-only";

import { getRecommendationsForProfile } from "@/features/recommendations/recommendationService";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildGroundingContext,
  runGroundedProvider
} from "./counsellorCore";
import { GeminiAIProvider, getGeminiConfig } from "./geminiProvider";
import { detectCollegesInQuestion, type CollegeSummaryForDetection } from "./collegeDetector";
import { embedText } from "./embeddingService";
import {
  counsellorRequestSchema,
  counsellorStreamRequestSchema,
  type AIProvider,
  type CounsellorResponse,
  type CounsellorStreamRequest,
  type EvidenceReference,
  type GroundingRecord
} from "./counsellorTypes";
import type { SavedStudentProfile } from "@/features/profile/profileSchema";

// ── Result types ──────────────────────────────────────────────────────────────

type CounsellorServiceResult =
  | { success: true; data: CounsellorResponse }
  | { success: false; code: string; message: string; status: number };

type GroundingRecordsResult =
  | { success: true; data: GroundingRecord[] }
  | { success: false; code: string; message: string; status: number };

// ── DB row types ──────────────────────────────────────────────────────────────

type SourceRow = {
  id: string;
  title: string | null;
  source_type: string | null;
  source_url?: string | null;
  academic_year?: string | null;
  confidence_level?: string | null;
};

type CollegeRow = {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  ownership: string;
  city: string;
  state: string;
  is_published: boolean;
};

type BranchRow = {
  id: string;
  name: string;
  degree: string;
  academic_year: string | null;
  verification_status: string;
  confidence_level: string | null;
  colleges: CollegeRow | CollegeRow[] | null;
  sources: SourceRow | SourceRow[] | null;
};

type CutoffRow = {
  id: string;
  exam: string;
  admission_year: number;
  counselling_system: string;
  round: string;
  category: string;
  quota: string;
  gender_pool: string | null;
  opening_rank: number | null;
  closing_rank: number;
  source_id: string;
  verification_status: string;
  publication_status: string;
  colleges: CollegeRow | CollegeRow[] | null;
  college_branches: { id: string; name: string; degree: string; verification_status: string } | Array<{ id: string; name: string; degree: string; verification_status: string }> | null;
  sources: SourceRow | SourceRow[] | null;
};

type FeeRow = {
  id: string;
  college_id: string;
  academic_year: string;
  tuition_fee: number | null;
  hostel_fee: number | null;
  mess_fee: number | null;
  estimated_four_year_cost: number | null;
  source_id: string;
  verification_status: string;
  is_published: boolean;
  colleges: CollegeRow | CollegeRow[] | null;
  sources: SourceRow | SourceRow[] | null;
};

type PlacementRow = {
  id: string;
  college_id: string;
  branch_id: string | null;
  placement_year: string;
  placement_percentage: number | null;
  average_package: number | null;
  median_package: number | null;
  highest_package: number | null;
  source_id: string;
  verification_status: string;
  is_published: boolean;
  colleges: CollegeRow | CollegeRow[] | null;
  college_branches: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  sources: SourceRow | SourceRow[] | null;
};

// ── Non-streaming answer (kept for backward compatibility) ────────────────────

export async function answerCounsellorQuestion(
  input: unknown,
  provider?: AIProvider
): Promise<CounsellorServiceResult> {
  const parsed = counsellorRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Question is invalid.",
      status: 400
    };
  }

  let activeProvider = provider;
  if (!activeProvider) {
    const geminiConfig = getGeminiConfig();
    if (!geminiConfig.success) {
      return {
        success: true,
        data: {
          answer: "Gemini is not configured yet. Add GEMINI_API_KEY on the server to enable grounded counsellor answers.",
          status: "configuration_error",
          evidence: [],
          warnings: ["Missing GEMINI_API_KEY."],
          missingData: ["AI provider configuration is incomplete."]
        }
      };
    }
    activeProvider = new GeminiAIProvider({ apiKey: geminiConfig.apiKey, model: geminiConfig.model });
  }

  const recordsResult = await fetchPublishedGroundingRecords({ question: parsed.data.question });
  if (!recordsResult.success) {
    return recordsResult;
  }

  const recommendationRecords = parsed.data.profile
    ? await buildRecommendationEvidence(parsed.data.profile)
    : [];

  const context = buildGroundingContext({
    question: parsed.data.question,
    history: [],
    profile: parsed.data.profile,
    records: recordsResult.data,
    deterministicRecommendations: recommendationRecords
  });

  return {
    success: true,
    data: await runGroundedProvider({ provider: activeProvider, context })
  };
}

// ── Streaming grounding records fetch ─────────────────────────────────────────

async function fetchHybridRecords(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  question: string,
  collegeIds: string[]
): Promise<GroundingRecord[]> {
  if (question.trim().length < 3) {
    return [];
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(question);
  } catch (err) {
    console.error("Embedding query failed, skipping hybrid search:", err);
    return [];
  }

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    query_text: question,
    match_college_ids: collegeIds.length > 0 ? collegeIds : null,
    match_count: 12
  });

  if (error) {
    console.error("match_documents RPC failed:", error);
    return [];
  }

  return (data ?? []).map(
    (row: {
      id: string;
      college_id: string | null;
      content_type: string;
      source_table: string;
      source_row_id: string;
      text_content: string;
    }): GroundingRecord => ({
      publicationStatus: "published",
      evidence: {
        sourceId: `${row.source_table}:${row.source_row_id}`,
        sourceLabel: `${row.content_type} (${row.source_table})`,
        sourceType: "qualitative_data"
      },
      summary: row.text_content
    })
  );
}

export async function fetchPublishedGroundingRecords(opts: {
  question: string;
  collegeIds?: string[];
}): Promise<GroundingRecordsResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // First, fetch all published colleges for detection
    const { data: collegesData, error: collegesError } = await supabase
      .from("colleges")
      .select("id, slug, name, short_name, ownership, city, state, is_published")
      .eq("is_published", true)
      .order("name", { ascending: true })
      .limit(60);

    if (collegesError) {
      return { success: false, code: "DATA_INCOMPLETE", message: "Unable to load published college list.", status: 500 };
    }

    const allColleges = (collegesData ?? []) as CollegeRow[];

    // Detect colleges from question if no explicit collegeIds provided
    let targetCollegeIds = opts.collegeIds ?? [];
    if (targetCollegeIds.length === 0 && opts.question) {
      const detectionInput: CollegeSummaryForDetection[] = allColleges.map((c) => ({
        id: c.id,
        name: c.name,
        shortName: c.short_name,
        slug: c.slug,
        city: c.city,
        state: c.state
      }));
      const detected = detectCollegesInQuestion(opts.question, detectionInput);
      targetCollegeIds = detected.collegeIds;
    }

    const hasTargets = targetCollegeIds.length > 0;

    // Parallel data fetch — targeted or broad
    const [branches, cutoffs, feesResult, placementsResult] = await Promise.all([
      // Branches
      (hasTargets
        ? supabase
            .from("college_branches")
            .select("id, name, degree, academic_year, verification_status, confidence_level, colleges!inner(id, slug, name, short_name, ownership, city, state, is_published), sources(id, title, source_type, source_url, academic_year, confidence_level)")
            .eq("verification_status", "published")
            .eq("colleges.is_published", true)
            .in("college_id", targetCollegeIds)
            .order("name", { ascending: true })
            .limit(40)
        : supabase
            .from("college_branches")
            .select("id, name, degree, academic_year, verification_status, confidence_level, colleges!inner(id, slug, name, short_name, ownership, city, state, is_published), sources(id, title, source_type, source_url, academic_year, confidence_level)")
            .eq("verification_status", "published")
            .eq("colleges.is_published", true)
            .order("name", { ascending: true })
            .limit(30)
      ),

      // Cutoffs
      (hasTargets
        ? supabase
            .from("cutoff_records")
            .select("id, exam, admission_year, counselling_system, round, category, quota, gender_pool, opening_rank, closing_rank, source_id, verification_status, publication_status, colleges!inner(id, slug, name, short_name, ownership, city, state, is_published), college_branches!inner(id, name, degree, verification_status), sources(id, title, source_type, source_url, academic_year, confidence_level)")
            .eq("verification_status", "published")
            .eq("publication_status", "published")
            .eq("colleges.is_published", true)
            .eq("college_branches.verification_status", "published")
            .in("college_id", targetCollegeIds)
            .order("admission_year", { ascending: false })
            .limit(50)
        : supabase
            .from("cutoff_records")
            .select("id, exam, admission_year, counselling_system, round, category, quota, gender_pool, opening_rank, closing_rank, source_id, verification_status, publication_status, colleges!inner(id, slug, name, short_name, ownership, city, state, is_published), college_branches!inner(id, name, degree, verification_status), sources(id, title, source_type, source_url, academic_year, confidence_level)")
            .eq("verification_status", "published")
            .eq("publication_status", "published")
            .eq("colleges.is_published", true)
            .eq("college_branches.verification_status", "published")
            .order("admission_year", { ascending: false })
            .limit(30)
      ),

      // Fees — try "fees" table first (migration 3), fallback handled below
      (hasTargets
        ? supabase
            .from("fees")
            .select("id, college_id, academic_year, tuition_fee, hostel_fee, mess_fee, estimated_four_year_cost, source_id, verification_status, is_published, colleges!inner(id, slug, name, short_name, ownership, city, state, is_published), sources(id, title, source_type, source_url, academic_year, confidence_level)")
            .eq("verification_status", "published")
            .eq("is_published", true)
            .eq("colleges.is_published", true)
            .in("college_id", targetCollegeIds)
            .order("academic_year", { ascending: false })
            .limit(20)
        : supabase
            .from("fees")
            .select("id, college_id, academic_year, tuition_fee, hostel_fee, mess_fee, estimated_four_year_cost, source_id, verification_status, is_published, colleges!inner(id, slug, name, short_name, ownership, city, state, is_published), sources(id, title, source_type, source_url, academic_year, confidence_level)")
            .eq("verification_status", "published")
            .eq("is_published", true)
            .eq("colleges.is_published", true)
            .order("academic_year", { ascending: false })
            .limit(20)
      ),

      // Placements — try "placements" table first (migration 3)
      (hasTargets
        ? supabase
            .from("placements")
            .select("id, college_id, branch_id, placement_year, placement_percentage, average_package, median_package, highest_package, source_id, verification_status, is_published, colleges!inner(id, slug, name, short_name, ownership, city, state, is_published), college_branches(id, name), sources(id, title, source_type, source_url, academic_year, confidence_level)")
            .eq("verification_status", "published")
            .eq("is_published", true)
            .eq("colleges.is_published", true)
            .in("college_id", targetCollegeIds)
            .order("placement_year", { ascending: false })
            .limit(20)
        : supabase
            .from("placements")
            .select("id, college_id, branch_id, placement_year, placement_percentage, average_package, median_package, highest_package, source_id, verification_status, is_published, colleges!inner(id, slug, name, short_name, ownership, city, state, is_published), college_branches(id, name), sources(id, title, source_type, source_url, academic_year, confidence_level)")
            .eq("verification_status", "published")
            .eq("is_published", true)
            .eq("colleges.is_published", true)
            .order("placement_year", { ascending: false })
            .limit(20)
      )
    ]);

    // Log any errors that occurred during the fetch
    if (branches.error) console.error("Branches fetch error:", branches.error);
    if (cutoffs.error) console.error("Cutoffs fetch error:", cutoffs.error);
    if (feesResult.error) console.error("Fees fetch error:", feesResult.error);
    if (placementsResult.error) console.error("Placements fetch error:", placementsResult.error);

    // Fee/placement errors are non-fatal — table might use different name
    const feeData = feesResult.error ? [] : ((feesResult.data ?? []) as unknown as FeeRow[]);
    const placementData = placementsResult.error ? [] : ((placementsResult.data ?? []) as unknown as PlacementRow[]);

    const hybridRecords = await fetchHybridRecords(supabase, opts.question, targetCollegeIds);

    const dbRecords: GroundingRecord[] = [
      ...collegeRowsToEvidence(allColleges),
      ...branchRowsToEvidence(branches.error ? [] : ((branches.data ?? []) as unknown as BranchRow[])),
      ...cutoffRowsToEvidence(cutoffs.error ? [] : ((cutoffs.data ?? []) as unknown as CutoffRow[])),
      ...feeRowsToEvidence(feeData),
      ...placementRowsToEvidence(placementData),
      ...hybridRecords
    ];

    return {
      success: true,
      data: dbRecords
    };

  } catch {
    return { success: false, code: "DATA_INCOMPLETE", message: "Supabase is not configured or is unavailable.", status: 500 };
  }
}

// ── Streaming context builder ─────────────────────────────────────────────────

/**
 * Recommendation-aware context builder.
 * When a profile is present, the grounding is pre-targeted to the student's
 * recommended college IDs instead of relying on keyword detection.
 */
export async function buildStreamingContext(
  input: CounsellorStreamRequest,
  recommendationCollegeIds?: string[]
) {
  // Determine target college IDs
  let collegeIds = recommendationCollegeIds ?? [];

  // If caller didn't supply IDs and we have a profile, derive them from recommendations
  if (collegeIds.length === 0 && input.profile) {
    const recResult = await getRecommendationsForProfile(input.profile);
    if (recResult.success) {
      const seen = new Set<string>();
      for (const r of recResult.data.slice(0, 10)) {
        const id = (r as { collegeId?: string }).collegeId;
        if (id && !seen.has(id)) { seen.add(id); collegeIds.push(id); }
      }
    }
  }

  const recordsResult = await fetchPublishedGroundingRecords({
    question: input.question,
    collegeIds: collegeIds.length > 0 ? collegeIds : undefined
  });
  if (!recordsResult.success) {
    return recordsResult;
  }

  const recommendationRecords = input.profile
    ? await buildRecommendationEvidence(input.profile)
    : [];

  const context = buildGroundingContext({
    question: input.question,
    history: input.history,
    profile: input.profile,
    records: recordsResult.data,
    deterministicRecommendations: recommendationRecords
  });

  return { success: true as const, data: context };
}

// ── Recommendation evidence builder ──────────────────────────────────────────

async function buildRecommendationEvidence(
  profile: NonNullable<Parameters<typeof getRecommendationsForProfile>[0]>
) {
  const result = await getRecommendationsForProfile(profile);
  if (!result.success) {
    return [];
  }

  return result.data.slice(0, 5).map((recommendation): GroundingRecord => ({
    publicationStatus: "published",
    evidence: {
      sourceId: `recommendation:${recommendation.cutoffId}`,
      sourceLabel: `Deterministic recommendation: ${recommendation.collegeName} ${recommendation.branchName}`,
      sourceType: "deterministic_recommendation",
      recordYear: recommendation.cutoff.admissionYear
    },
    summary: [
      `${recommendation.collegeName} ${recommendation.branchName}`,
      `classification ${recommendation.classification}`,
      `overall score ${recommendation.overallScore}`,
      `admission score ${recommendation.componentScores.admission}`,
      `${recommendation.cutoff.exam} ${recommendation.cutoff.admissionYear} round ${recommendation.cutoff.round}`,
      `category ${recommendation.cutoff.category}, quota ${recommendation.cutoff.quota}`,
      `closing rank ${recommendation.cutoff.closingRank}`,
      `source ${recommendation.cutoff.sourceId}`
    ].join("; ")
  }));
}

// ── Evidence converters ───────────────────────────────────────────────────────

function collegeRowsToEvidence(rows: CollegeRow[]) {
  return rows.map((row): GroundingRecord => ({
    publicationStatus: row.is_published ? "published" : "unpublished",
    evidence: {
      sourceId: `college:${row.id}`,
      sourceLabel: `Published college: ${row.name}`,
      sourceType: "published_college"
    },
    summary: `${row.name} (${row.short_name ? row.short_name + ", " : ""}${row.ownership}) is located in ${row.city}, ${row.state}. Published: ${row.is_published}.`
  }));
}

function branchRowsToEvidence(rows: BranchRow[]) {
  return rows.flatMap((row): GroundingRecord[] => {
    const college = first(row.colleges);
    if (!college) return [];
    const source = first(row.sources);
    return [{
      publicationStatus: row.verification_status === "published" && college.is_published ? "published" : "unpublished",
      evidence: makeEvidence(source, `branch:${row.id}`, `${college.name} ${row.name}`, "published_branch", row.academic_year),
      summary: `${college.name} offers ${row.degree} in ${row.name}; academic year ${row.academic_year ?? "not provided"}; verification: ${row.verification_status}.`
    }];
  });
}

function cutoffRowsToEvidence(rows: CutoffRow[]) {
  return rows.flatMap((row): GroundingRecord[] => {
    const college = first(row.colleges);
    const branch = first(row.college_branches);
    if (!college || !branch) return [];
    const source = first(row.sources);
    return [{
      publicationStatus: row.verification_status === "published" && row.publication_status === "published" && college.is_published && branch.verification_status === "published" ? "published" : "unpublished",
      evidence: makeEvidence(source, row.source_id, `${college.name} cutoff source`, "cutoff", row.admission_year),
      summary: `${college.name} — ${branch.name} (${branch.degree}) cutoff: exam ${row.exam}, counselling system ${row.counselling_system}, year ${row.admission_year}, round ${row.round}, category ${row.category}, quota ${row.quota}, gender pool ${row.gender_pool ?? "not specified"}, opening rank ${row.opening_rank ?? "not available"}, closing rank ${row.closing_rank}.`
    }];
  });
}

function feeRowsToEvidence(rows: FeeRow[]) {
  return rows.flatMap((row): GroundingRecord[] => {
    const college = first(row.colleges);
    if (!college) return [];
    const source = first(row.sources);
    return [{
      publicationStatus: row.verification_status === "published" && row.is_published && college.is_published ? "published" : "unpublished",
      evidence: makeEvidence(source, row.source_id, `${college.name} fee source`, "fees", row.academic_year),
      summary: `${college.name} fees for ${row.academic_year}: annual tuition INR ${row.tuition_fee ?? "not available"}, hostel INR ${row.hostel_fee ?? "not available"}, mess INR ${row.mess_fee ?? "not available"}, estimated 4-year total INR ${row.estimated_four_year_cost ?? "not available"}.`
    }];
  });
}

function placementRowsToEvidence(rows: PlacementRow[]) {
  return rows.flatMap((row): GroundingRecord[] => {
    const college = first(row.colleges);
    if (!college) return [];
    const branch = first(row.college_branches);
    const source = first(row.sources);
    return [{
      publicationStatus: row.verification_status === "published" && row.is_published && college.is_published ? "published" : "unpublished",
      evidence: makeEvidence(source, row.source_id, `${college.name} placement source`, "placements", row.placement_year),
      summary: `${college.name}${branch ? ` — ${branch.name}` : ""} placements ${row.placement_year}: placement rate ${row.placement_percentage ?? "not available"}%, median package ${row.median_package ?? "not available"} LPA, average package ${row.average_package ?? "not available"} LPA, highest package ${row.highest_package ?? "not available"} LPA.`
    }];
  });
}

// ── Utility helpers ───────────────────────────────────────────────────────────

function makeEvidence(
  source: SourceRow | undefined,
  fallbackId: string,
  fallbackLabel: string,
  sourceType: string,
  year?: string | number | null,
  officialUrl?: string
): EvidenceReference {
  return {
    sourceId: source?.id ?? fallbackId,
    sourceLabel: source?.title ?? fallbackLabel,
    sourceType: source?.source_type ?? sourceType,
    recordYear: yearToNumber(year ?? source?.academic_year),
    officialUrl: source?.source_url ?? officialUrl
  };
}

function first<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function yearToNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return undefined;
  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}
