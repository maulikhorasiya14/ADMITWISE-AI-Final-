import { z } from "zod";

export const readinessStateSchema = z.enum([
  "not_started",
  "staged",
  "needs_review",
  "blocked",
  "approved_unpublished",
  "partially_published",
  "demo_ready"
]);

export const readinessCategorySchema = z.enum([
  "college_identity",
  "branches",
  "cutoffs",
  "fees",
  "placements",
  "scholarships",
  "sources"
]);

export const checklistStatusSchema = z.enum(["complete", "missing", "needs_review", "blocked", "optional"]);
export const checklistSeveritySchema = z.enum(["blocking", "warning", "info"]);

export type ReadinessState = z.infer<typeof readinessStateSchema>;
export type ReadinessCategory = z.infer<typeof readinessCategorySchema>;
export type ChecklistStatus = z.infer<typeof checklistStatusSchema>;
export type ChecklistSeverity = z.infer<typeof checklistSeveritySchema>;

export type ReadinessChecklistItem = {
  id: string;
  category: ReadinessCategory;
  label: string;
  status: ChecklistStatus;
  severity: ChecklistSeverity;
  message: string;
  action: string;
};

export type ReadinessCategoryScore = {
  category: ReadinessCategory;
  label: string;
  state: ChecklistStatus;
  points: number;
  maxPoints: number;
  summary: string;
};

export type ReadinessCounts = {
  published: number;
  staged: number;
  needsReview: number;
  approvedUnpublished: number;
  rejected: number;
  conflicts: number;
  blockingValidationIssues: number;
};

export type ReadinessCoverage = {
  cutoffYears: number[];
  cutoffRounds: string[];
  cutoffCategories: string[];
  cutoffQuotas: string[];
  cutoffGenderPools: string[];
  feeAcademicYears: string[];
  placementYears: string[];
  scholarshipCount: number;
  sourceReferenceCount: number;
  missingSourceReferenceCount: number;
};

export type ReadinessAssessment = {
  collegeId: string;
  collegeSlug: string | null;
  collegeName: string;
  isPublished: boolean;
  state: ReadinessState;
  completenessPercentage: number;
  counts: {
    branches: ReadinessCounts;
    cutoffs: ReadinessCounts;
    fees: ReadinessCounts;
    placements: ReadinessCounts;
    scholarships: ReadinessCounts;
    staging: ReadinessCounts;
  };
  coverage: ReadinessCoverage;
  latestFeeYear: string | null;
  latestPlacementYear: string | null;
  categories: ReadinessCategoryScore[];
  checklist: ReadinessChecklistItem[];
};

export type ReadinessSummary = {
  totalColleges: number;
  demoReady: number;
  blocked: number;
  needsReview: number;
  approvedUnpublished: number;
  partiallyPublished: number;
  averageCompleteness: number;
};

export const readinessConfig = {
  targetCutoffAdmissionYears: [2023, 2024, 2025],
  categoryWeights: {
    college_identity: 20,
    branches: 20,
    cutoffs: 30,
    fees: 8,
    placements: 8,
    scholarships: 4,
    sources: 10
  },
  requiredCategories: ["college_identity", "branches", "cutoffs", "sources"] as ReadinessCategory[]
} as const;

export const readinessStateLabels: Record<ReadinessState, string> = {
  not_started: "Not started",
  staged: "Staged",
  needs_review: "Needs review",
  blocked: "Blocked",
  approved_unpublished: "Approved unpublished",
  partially_published: "Partially published",
  demo_ready: "Demo ready"
};

export const readinessCategoryLabels: Record<ReadinessCategory, string> = {
  college_identity: "College identity",
  branches: "Branches",
  cutoffs: "Cutoffs",
  fees: "Fees",
  placements: "Placements",
  scholarships: "Scholarships",
  sources: "Sources"
};
