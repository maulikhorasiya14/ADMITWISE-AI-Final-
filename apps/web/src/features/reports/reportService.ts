import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getComparisonForProfile } from "@/features/comparison/comparisonService";
import type { SavedStudentProfile } from "@/features/profile/profileSchema";
import { getRecommendationsForProfile } from "@/features/recommendations/recommendationService";
import { getScholarshipMatches } from "@/features/scholarships/scholarshipService";
import { buildReportSnapshot, parseReportSnapshot } from "./reportCore";
import {
  reportGenerateRequestSchema,
  reportIdSchema,
  type ReportGenerateRequest,
  type ReportSnapshot
} from "./reportTypes";

type ReportResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  status: number;
  message: string;
};

type SavedReport = {
  id: string;
  title: string;
  createdAt: string;
  snapshot: ReportSnapshot;
};

export async function previewReport(input: unknown): Promise<ReportResult<ReportSnapshot>> {
  const request = reportGenerateRequestSchema.safeParse(input);
  if (!request.success) {
    return { success: false, status: 400, message: "Report preview needs a valid profile and section selection." };
  }

  const user = await getCurrentUserId();
  if (!user.success) return user;

  const profile = request.data.profile ?? await loadLatestProfileForUser(user.data);
  if (!profile) {
    return { success: false, status: 400, message: "Create or save a student profile before generating a report." };
  }

  return buildReportFromData(profile, request.data);
}

export async function generateReport(input: unknown): Promise<ReportResult<{ id: string }>> {
  const request = reportGenerateRequestSchema.safeParse(input);
  if (!request.success) {
    return { success: false, status: 400, message: "Report generation needs a valid profile and report settings." };
  }

  const user = await getCurrentUserId();
  if (!user.success) return user;

  const profile = request.data.profile ?? await loadLatestProfileForUser(user.data);
  if (!profile) {
    return { success: false, status: 400, message: "Create or save a student profile before generating a report." };
  }

  const snapshot = await buildReportFromData(profile, request.data);
  if (!snapshot.success) return snapshot;

  const supabase = await createSupabaseServerClient();
  if (request.data.profile) {
    await saveProfileForUser(user.data, profile);
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: user.data,
      title: snapshot.data.title,
      report_version: snapshot.data.schemaVersion,
      report_snapshot: snapshot.data
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, status: 500, message: "Report could not be saved. Confirm the reports migration has been applied in Supabase." };
  }

  return { success: true, data: { id: String(data.id) } };
}

export async function getSavedReport(reportId: string): Promise<ReportResult<SavedReport>> {
  const parsedId = reportIdSchema.safeParse(reportId);
  if (!parsedId.success) {
    return { success: false, status: 404, message: "Report not found." };
  }

  const user = await getCurrentUserId();
  if (!user.success) return user;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, title, user_id, created_at, report_snapshot")
    .eq("id", parsedId.data)
    .eq("user_id", user.data)
    .single();

  if (error || !data) {
    return { success: false, status: 404, message: "Report not found." };
  }

  const snapshot = parseReportSnapshot(data.report_snapshot);
  if (!snapshot.success) {
    return { success: false, status: 500, message: "Saved report snapshot is invalid and cannot be displayed safely." };
  }

  return {
    success: true,
    data: {
      id: String(data.id),
      title: String(data.title),
      createdAt: String(data.created_at),
      snapshot: snapshot.data
    }
  };
}

async function buildReportFromData(profile: SavedStudentProfile, request: ReportGenerateRequest): Promise<ReportResult<ReportSnapshot>> {
  const recommendations = await getRecommendationsForProfile(profile);
  if (!recommendations.success) {
    return { success: false, status: 500, message: recommendations.message };
  }

  const scholarships = await getScholarshipMatches({ profile });
  if (!scholarships.success) {
    return { success: false, status: 500, message: scholarships.message };
  }

  const comparison = request.comparison
    ? await getComparisonForProfile({
        profile,
        optionIds: request.comparison.optionIds,
        mode: request.comparison.mode,
        scholarshipAmount: request.comparison.scholarshipAmount
      })
    : null;

  if (comparison && !comparison.success) {
    return { success: false, status: 422, message: comparison.message };
  }

  return {
    success: true,
    data: buildReportSnapshot({
      title: request.title,
      includedSections: request.sections,
      profile,
      recommendations: recommendations.data,
      comparison: comparison?.data ?? null,
      scholarships: scholarships.data,
      counsellorResponse: null
    })
  };
}

async function getCurrentUserId(): Promise<ReportResult<string>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { success: false, status: 401, message: "Sign in before generating or viewing reports." };
  }

  return { success: true, data: data.user.id };
}

async function loadLatestProfileForUser(userId: string): Promise<SavedStudentProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("student_profiles")
    .select("id, exam, exam_year, rank, percentile, category, gender, home_state, home_city, preferred_branches, preferred_states, college_type_preference, maximum_annual_budget, family_income_band, hostel_required, career_goal, weights")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: String(data.id),
    exams: [
      {
        exam: String(data.exam).split(",")[0] || "JEE Main",
        examYear: Number(data.exam_year),
        rank: data.rank === null ? undefined : Number(data.rank),
        percentile: data.percentile === null ? undefined : Number(data.percentile),
        marks: undefined
      }
    ],
    category: data.category as SavedStudentProfile["category"],
    gender: data.gender as SavedStudentProfile["gender"],
    homeState: String(data.home_state),
    homeCity: data.home_city ? String(data.home_city) : "",
    preferredBranches: Array.isArray(data.preferred_branches) ? data.preferred_branches.map(String) : [],
    preferredStates: Array.isArray(data.preferred_states) ? data.preferred_states.map(String) : [],
    collegeTypePreference: data.college_type_preference as SavedStudentProfile["collegeTypePreference"],
    hostelRequired: Boolean(data.hostel_required),
    maximumAnnualBudget: data.maximum_annual_budget === null ? undefined : Number(data.maximum_annual_budget),
    familyIncomeBand: data.family_income_band ? String(data.family_income_band) : "",
    careerGoal: data.career_goal as SavedStudentProfile["careerGoal"],
    weights: data.weights as SavedStudentProfile["weights"]
  };
}

async function saveProfileForUser(userId: string, profile: SavedStudentProfile) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("student_profiles").insert({
    user_id: userId,
    exam: profile.exams.map(e => e.exam).join(","),
    exam_year: profile.exams[0]?.examYear ?? new Date().getFullYear(),
    rank: profile.exams[0]?.rank ?? null,
    percentile: profile.exams[0]?.percentile ?? null,
    category: profile.category,
    gender: profile.gender,
    home_state: profile.homeState,
    home_city: profile.homeCity || null,
    preferred_branches: profile.preferredBranches,
    preferred_states: profile.preferredStates,
    college_type_preference: profile.collegeTypePreference,
    hostel_required: profile.hostelRequired,
    maximum_annual_budget: profile.maximumAnnualBudget ?? null,
    family_income_band: profile.familyIncomeBand || null,
    career_goal: profile.careerGoal,
    weights: profile.weights
  });
}
