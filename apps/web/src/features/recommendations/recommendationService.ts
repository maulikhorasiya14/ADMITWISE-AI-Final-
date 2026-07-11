import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SavedStudentProfile } from "@/features/profile/profileSchema";
import { buildRecommendations } from "./recommendationEngine";
import { publishedCutoffCandidateSchema, type RecommendationViewModel } from "./recommendationTypes";

type RecommendationServiceResult =
  | { success: true; data: RecommendationViewModel[] }
  | { success: false; message: string };

const publishedCutoffCandidatesSchema = publishedCutoffCandidateSchema.array();

export async function getRecommendationsForProfile(profile: SavedStudentProfile): Promise<RecommendationServiceResult> {
  if (!profile.exams || profile.exams.length === 0) {
    return { success: true, data: [] };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cutoff_records")
      .select(
        "id, exam, admission_year, counselling_system, round, category, quota, gender_pool, opening_rank, closing_rank, source_id, verification_status, publication_status, colleges!inner(id, slug, name, city, state, is_published), college_branches!inner(id, name, degree, verification_status, confidence_level)"
      )
      .in("exam", profile.exams.map(e => e.exam))
      .eq("category", profile.category)
      .eq("verification_status", "published")
      .eq("publication_status", "published")
      .eq("colleges.is_published", true)
      .eq("college_branches.verification_status", "published")
      .order("closing_rank", { ascending: true });

    if (error) {
      return { success: false, message: "Unable to load recommendations right now." };
    }

    const parsed = publishedCutoffCandidatesSchema.safeParse(data ?? []);
    if (!parsed.success) {
      return { success: false, message: "Recommendation data did not match the expected format." };
    }

    return { success: true, data: buildRecommendations(profile, parsed.data) };
  } catch {
    return { success: false, message: "Supabase is not configured or is unavailable." };
  }
}
