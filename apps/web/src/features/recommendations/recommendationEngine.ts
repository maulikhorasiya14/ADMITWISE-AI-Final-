import { classifyRecommendation, scoreAdmissionChance, scoreBranchFit, scoreRecommendationFit } from "@admitwise/scoring";
import type { SavedStudentProfile } from "../profile/profileSchema.ts";
import type { PublishedCutoffCandidate, RecommendationViewModel } from "./recommendationTypes.ts";

const missingMilestone3Data = ["placements", "fees", "scholarships", "location", "campus reality"];

export function buildRecommendations(
  profile: SavedStudentProfile,
  candidates: PublishedCutoffCandidate[]
): RecommendationViewModel[] {
  if (!profile.exams || profile.exams.length === 0) {
    return [];
  }

  return candidates
    .filter((candidate) => isPublishedCandidate(candidate))
    .filter((candidate) => profile.exams.some(e => e.exam.trim().toLowerCase() === candidate.exam.trim().toLowerCase()))
    .filter((candidate) => normalized(candidate.category) === normalized(profile.category))
    .filter((candidate) => quotaMatchesProfile(candidate, profile))
    .filter((candidate) => genderPoolMatchesProfile(candidate.gender_pool, profile.gender))
    .map((candidate) => scoreCandidate(profile, candidate))
    .sort((left, right) => right.overallScore - left.overallScore || left.cutoff.closingRank - right.cutoff.closingRank);
}

function scoreCandidate(profile: SavedStudentProfile, candidate: PublishedCutoffCandidate): RecommendationViewModel {
  const profileExam = profile.exams.find(e => e.exam.trim().toLowerCase() === candidate.exam.trim().toLowerCase());
  const studentScore = profileExam ? (profileExam.rank ?? profileExam.percentile ?? profileExam.marks) : undefined;

  const admission = scoreAdmissionChance({
    studentRank: studentScore,
    openingRank: candidate.opening_rank ?? undefined,
    closingRank: candidate.closing_rank
  });
  const branchFit = scoreBranchFit({
    branchName: candidate.college_branches.name,
    preferredBranches: profile.preferredBranches
  });
  const overall = scoreRecommendationFit({
    weights: {
      admissionChance: profile.weights.admissionChance,
      branchFit: profile.weights.branchFit
    },
    componentScores: {
      admission: admission.score,
      branchFit: branchFit.score
    }
  });
  const missingData = [...new Set([...admission.missingData, ...branchFit.missingData, ...missingMilestone3Data])];

  return {
    cutoffId: candidate.id,
    collegeId: candidate.colleges.id,
    collegeSlug: candidate.colleges.slug,
    collegeName: candidate.colleges.name,
    branchId: candidate.college_branches.id,
    branchName: candidate.college_branches.name,
    classification: classifyRecommendation(overall.score),
    overallScore: overall.score,
    componentScores: {
      admission: admission.score,
      branchFit: branchFit.score,
      placement: 0,
      affordability: 0,
      scholarship: 0,
      location: 0,
      culture: 0,
      confidence: confidenceScore(candidate.college_branches.confidence_level)
    },
    cutoff: {
      exam: candidate.exam,
      admissionYear: candidate.admission_year,
      counsellingSystem: candidate.counselling_system,
      round: candidate.round,
      category: candidate.category,
      quota: candidate.quota,
      genderPool: candidate.gender_pool,
      openingRank: candidate.opening_rank,
      closingRank: candidate.closing_rank,
      sourceId: candidate.source_id
    },
    missingData,
    warnings: [...admission.notes, ...branchFit.notes, ...overall.notes]
  };
}

function isPublishedCandidate(candidate: PublishedCutoffCandidate) {
  return (
    candidate.colleges.is_published &&
    candidate.college_branches.verification_status === "published" &&
    candidate.verification_status === "published" &&
    candidate.publication_status === "published"
  );
}

function quotaMatchesProfile(candidate: PublishedCutoffCandidate, profile: SavedStudentProfile) {
  const quota = normalized(candidate.quota);
  const homeState = normalized(profile.homeState);
  const collegeState = normalized(candidate.colleges.state);

  if (["ALL", "OPEN", "AI", "OS", "ALL_INDIA", "ALL INDIA"].includes(quota)) {
    return true;
  }

  if (["HS", "HOME_STATE", "HOME STATE", "STATE"].includes(quota)) {
    return homeState.length > 0 && homeState === collegeState;
  }

  return quota === homeState || quota === collegeState;
}

function genderPoolMatchesProfile(genderPool: string | null, gender: SavedStudentProfile["gender"]) {
  const pool = normalized(genderPool ?? "ALL");

  if (["ALL", "OPEN", "GENDER_NEUTRAL", "GENDER NEUTRAL", "GN"].includes(pool)) {
    return true;
  }

  if (gender === "FEMALE") {
    return ["FEMALE", "FEMALE_ONLY", "FEMALE ONLY"].includes(pool);
  }

  if (gender === "MALE") {
    return ["MALE"].includes(pool);
  }

  return false;
}

function confidenceScore(confidence: string | null) {
  switch (confidence) {
    case "A":
      return 100;
    case "B":
      return 85;
    case "C":
      return 70;
    case "D":
      return 50;
    default:
      return 30;
  }
}

function normalized(value: string) {
  return value.trim().toUpperCase().replaceAll("-", "_");
}
