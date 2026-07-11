export type VerificationStatus = "extracted" | "needs_review" | "approved" | "published" | "rejected" | "archived";

export type SourceType =
  | "government"
  | "counselling_authority"
  | "official_college"
  | "verified_student"
  | "public_unverified"
  | "inference";

export type ConfidenceLevel = "A" | "B" | "C" | "D" | "E";

export type FactMetadata = {
  sourceId: string;
  sourceType: SourceType;
  academicYear?: string;
  collectedAt: string;
  lastVerifiedAt?: string;
  verificationStatus: VerificationStatus;
  confidenceLevel: ConfidenceLevel;
  verifiedBy?: string;
};

export type ApiError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type ApiEnvelope<T> = { success: true; data: T } | { success: false; error: ApiError };

export type PreferenceWeights = {
  admissionChance: number;
  branchFit: number;
  placement: number;
  affordability: number;
  scholarship: number;
  location: number;
  culture: number;
};

export type StudentProfile = {
  id: string;
  userId?: string;
  exam: string;
  examYear: number;
  rank?: number;
  percentile?: number;
  category: "GENERAL" | "EWS" | "OBC_NCL" | "SC" | "ST" | "OTHER";
  gender: "FEMALE" | "MALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  homeState: string;
  homeCity?: string;
  preferredBranches: string[];
  preferredStates: string[];
  collegeTypePreference: "GOVERNMENT" | "PRIVATE" | "BOTH";
  maximumAnnualBudget?: number;
  familyIncomeBand?: string;
  hostelRequired?: boolean;
  careerGoal?: "SOFTWARE" | "CORE" | "HIGHER_STUDIES" | "STARTUP" | "UNDECIDED";
  weights: PreferenceWeights;
};

export type CollegeSummary = {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  ownership: "GOVERNMENT" | "PRIVATE" | "DEEMED" | "OTHER";
  city: string;
  state: string;
  isPublished: boolean;
  confidenceLevel?: ConfidenceLevel;
};

export type RecommendationClassification = "SAFE" | "SMART" | "AMBITIOUS" | "UNLIKELY";

export type ScoreResult = {
  score: number;
  missingData: string[];
  notes: string[];
};

export type RecommendationScore = {
  collegeId: string;
  branchId: string;
  overallScore: number;
  classification: RecommendationClassification;
  componentScores: {
    admission: number;
    branchFit: number;
    placement: number;
    affordability: number;
    scholarship: number;
    location: number;
    culture: number;
    confidence: number;
  };
  decisionRisks: string[];
  missingData: string[];
};

export type ComparisonMode = "student" | "parent";

export type ComparisonWinner = "left" | "right" | "tie" | "insufficient_data";

export type ScholarshipEligibilityStatus =
  | "potentially_eligible"
  | "not_eligible"
  | "more_information_required"
  | "deadline_passed";
