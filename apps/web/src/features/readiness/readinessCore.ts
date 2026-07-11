import {
  readinessCategoryLabels,
  readinessConfig,
  type ReadinessAssessment,
  type ReadinessCategory,
  type ReadinessCategoryScore,
  type ReadinessChecklistItem,
  type ReadinessCounts,
  type ReadinessState,
  type ReadinessSummary
} from "./readinessTypes.ts";

export type ReadinessCollege = {
  id: string;
  slug: string | null;
  name: string;
  is_published: boolean;
};

export type ReadinessBranchRecord = {
  id: string;
  source_id: string | null;
  verification_status: string | null;
};

export type ReadinessCutoffRecord = {
  id: string;
  admission_year: number | null;
  year: number | null;
  round: string | null;
  category: string | null;
  quota: string | null;
  gender_pool: string | null;
  source_id: string | null;
  verification_status: string | null;
  publication_status: string | null;
};

export type ReadinessFeeRecord = {
  id: string;
  academic_year: string | null;
  source_id: string | null;
  verification_status: string | null;
  is_published: boolean | null;
};

export type ReadinessPlacementRecord = {
  id: string;
  placement_year: string | null;
  source_id: string | null;
  verification_status: string | null;
  is_published: boolean | null;
};

export type ReadinessScholarshipRecord = {
  id: string;
  source_id: string | null;
  verification_status: string | null;
  is_published: boolean | null;
};

export type ReadinessStagingCounts = {
  staged: number;
  needsReview: number;
  approvedUnpublished: number;
  rejected: number;
  conflicts: number;
  blockingValidationIssues: number;
};

export type ReadinessCollegeInput = {
  college: ReadinessCollege;
  publishedBranches: ReadinessBranchRecord[];
  publishedCutoffs: ReadinessCutoffRecord[];
  publishedFees: ReadinessFeeRecord[];
  publishedPlacements: ReadinessPlacementRecord[];
  publishedScholarships: ReadinessScholarshipRecord[];
  staging: ReadinessStagingCounts;
};

export function evaluateCollegeReadiness(input: ReadinessCollegeInput): ReadinessAssessment {
  const checklist: ReadinessChecklistItem[] = [];
  const publishedBranches = input.publishedBranches.filter((record) => record.verification_status === "published");
  const publishedCutoffs = input.publishedCutoffs.filter(
    (record) => record.verification_status === "published" && record.publication_status === "published"
  );
  const publishedFees = input.publishedFees.filter((record) => record.verification_status === "published" && record.is_published);
  const publishedPlacements = input.publishedPlacements.filter(
    (record) => record.verification_status === "published" && record.is_published
  );
  const publishedScholarships = input.publishedScholarships.filter(
    (record) => record.verification_status === "published" && record.is_published
  );

  const sourceChecks = [
    ...publishedBranches.map((record) => record.source_id),
    ...publishedCutoffs.map((record) => record.source_id),
    ...publishedFees.map((record) => record.source_id),
    ...publishedPlacements.map((record) => record.source_id),
    ...publishedScholarships.map((record) => record.source_id)
  ];
  const missingSourceReferenceCount = sourceChecks.filter((sourceId) => !sourceId).length;
  const sourceReferenceCount = sourceChecks.length - missingSourceReferenceCount;
  const cutoffYears = uniqueNumbers(publishedCutoffs.map((record) => record.admission_year ?? record.year));
  const missingCutoffYears = readinessConfig.targetCutoffAdmissionYears.filter((year) => !cutoffYears.includes(year));

  addChecklist(checklist, {
    id: "college-published",
    category: "college_identity",
    label: "Published college profile",
    status: input.college.is_published ? "complete" : "blocked",
    severity: input.college.is_published ? "info" : "blocking",
    message: input.college.is_published ? "College profile is published." : "College profile is still draft or unpublished.",
    action: input.college.is_published ? "No action needed." : "Publish the verified college identity before demo."
  });

  addChecklist(checklist, {
    id: "branches-published",
    category: "branches",
    label: "Published branches",
    status: publishedBranches.length > 0 ? "complete" : "blocked",
    severity: publishedBranches.length > 0 ? "info" : "blocking",
    message:
      publishedBranches.length > 0
        ? `${publishedBranches.length} published branch record(s) are available.`
        : "No published branch record is available.",
    action: publishedBranches.length > 0 ? "No action needed." : "Review and publish at least one verified branch record."
  });

  addChecklist(checklist, {
    id: "cutoff-coverage",
    category: "cutoffs",
    label: "Historical cutoff coverage",
    status: missingCutoffYears.length === 0 ? "complete" : "missing",
    severity: missingCutoffYears.length === 0 ? "info" : "blocking",
    message:
      missingCutoffYears.length === 0
        ? "Published cutoffs cover all target admission years."
        : `Missing published cutoff data for ${missingCutoffYears.join(", ")}.`,
    action: missingCutoffYears.length === 0 ? "No action needed." : "Import, verify and publish the missing historical cutoff years."
  });

  addChecklist(checklist, {
    id: "fees-published",
    category: "fees",
    label: "Published fees",
    status: publishedFees.length > 0 ? "complete" : "optional",
    severity: publishedFees.length > 0 ? "info" : "warning",
    message: publishedFees.length > 0 ? "Published fee data is available." : "Fee data is not publicly available yet.",
    action: publishedFees.length > 0 ? "No action needed." : "Add verified fee records when official fee documents are available."
  });

  addChecklist(checklist, {
    id: "placements-published",
    category: "placements",
    label: "Published placements",
    status: publishedPlacements.length > 0 ? "complete" : "optional",
    severity: publishedPlacements.length > 0 ? "info" : "warning",
    message: publishedPlacements.length > 0 ? "Published placement data is available." : "Placement data is not publicly available yet.",
    action:
      publishedPlacements.length > 0 ? "No action needed." : "Add verified placement records only after an official placement source is available."
  });

  addChecklist(checklist, {
    id: "scholarships-published",
    category: "scholarships",
    label: "Scholarship links",
    status: publishedScholarships.length > 0 ? "complete" : "optional",
    severity: "info",
    message:
      publishedScholarships.length > 0
        ? `${publishedScholarships.length} published scholarship link(s) are available.`
        : "No published scholarship link is available.",
    action: publishedScholarships.length > 0 ? "No action needed." : "Optional for demo; add verified links when available."
  });

  addChecklist(checklist, {
    id: "sources-linked",
    category: "sources",
    label: "Source references",
    status: missingSourceReferenceCount === 0 && sourceChecks.length > 0 ? "complete" : "blocked",
    severity: missingSourceReferenceCount === 0 && sourceChecks.length > 0 ? "info" : "blocking",
    message:
      missingSourceReferenceCount === 0 && sourceChecks.length > 0
        ? "Published evidence records are linked to sources."
        : `${missingSourceReferenceCount || sourceChecks.length || 1} source reference(s) need attention.`,
    action:
      missingSourceReferenceCount === 0 && sourceChecks.length > 0
        ? "No action needed."
        : "Attach official source references before private-beta demo."
  });

  addChecklist(checklist, {
    id: "review-queue",
    category: "sources",
    label: "Review queue",
    status: input.staging.needsReview === 0 ? "complete" : "needs_review",
    severity: input.staging.needsReview === 0 ? "info" : "warning",
    message:
      input.staging.needsReview === 0
        ? "No staged records are waiting for review for this college."
        : `${input.staging.needsReview} staged record(s) still need review.`,
    action: input.staging.needsReview === 0 ? "No action needed." : "Open the review queue and verify or reject staged records."
  });

  addChecklist(checklist, {
    id: "conflicts",
    category: "sources",
    label: "Conflicts and validation",
    status: input.staging.conflicts === 0 && input.staging.blockingValidationIssues === 0 ? "complete" : "blocked",
    severity: input.staging.conflicts === 0 && input.staging.blockingValidationIssues === 0 ? "info" : "blocking",
    message:
      input.staging.conflicts === 0 && input.staging.blockingValidationIssues === 0
        ? "No blocking conflict or validation issue is open."
        : `${input.staging.conflicts} conflict(s) and ${input.staging.blockingValidationIssues} blocking validation issue(s) are open.`,
    action:
      input.staging.conflicts === 0 && input.staging.blockingValidationIssues === 0
        ? "No action needed."
        : "Resolve conflicts or reject invalid staged records before demo."
  });

  const categories = scoreCategories({
    collegePublished: input.college.is_published,
    branchCount: publishedBranches.length,
    cutoffYears,
    feeCount: publishedFees.length,
    placementCount: publishedPlacements.length,
    scholarshipCount: publishedScholarships.length,
    sourceReferenceCount,
    missingSourceReferenceCount
  });

  const hasBlockingChecklist = checklist.some((item) => item.severity === "blocking" && item.status !== "complete");
  const hasReview = input.staging.needsReview > 0;
  const hasApprovedUnpublished = input.staging.approvedUnpublished > 0;
  const hasPublishedCore = input.college.is_published || publishedBranches.length > 0 || publishedCutoffs.length > 0;
  const hasStagedOnly = input.staging.staged > 0 || input.staging.needsReview > 0 || input.staging.approvedUnpublished > 0;
  const completenessPercentage = Math.round(
    (categories.reduce((sum, category) => sum + category.points, 0) /
      categories.reduce((sum, category) => sum + category.maxPoints, 0)) *
      100
  );
  const state = chooseReadinessState({
    completenessPercentage,
    hasBlockingChecklist,
    hasReview,
    hasApprovedUnpublished,
    hasPublishedCore,
    hasStagedOnly
  });

  return {
    collegeId: input.college.id,
    collegeSlug: input.college.slug,
    collegeName: input.college.name,
    isPublished: input.college.is_published,
    state,
    completenessPercentage,
    counts: {
      branches: countsFor(publishedBranches.length, input.staging),
      cutoffs: countsFor(publishedCutoffs.length, input.staging),
      fees: countsFor(publishedFees.length, input.staging),
      placements: countsFor(publishedPlacements.length, input.staging),
      scholarships: countsFor(publishedScholarships.length, input.staging),
      staging: countsFor(0, input.staging)
    },
    coverage: {
      cutoffYears,
      cutoffRounds: uniqueStrings(publishedCutoffs.map((record) => record.round)),
      cutoffCategories: uniqueStrings(publishedCutoffs.map((record) => record.category)),
      cutoffQuotas: uniqueStrings(publishedCutoffs.map((record) => record.quota)),
      cutoffGenderPools: uniqueStrings(publishedCutoffs.map((record) => record.gender_pool)),
      feeAcademicYears: uniqueStrings(publishedFees.map((record) => record.academic_year)),
      placementYears: uniqueStrings(publishedPlacements.map((record) => record.placement_year)),
      scholarshipCount: publishedScholarships.length,
      sourceReferenceCount,
      missingSourceReferenceCount
    },
    latestFeeYear: latestText(publishedFees.map((record) => record.academic_year)),
    latestPlacementYear: latestText(publishedPlacements.map((record) => record.placement_year)),
    categories,
    checklist
  };
}

export function summarizeReadiness(assessments: ReadinessAssessment[]): ReadinessSummary {
  const totalColleges = assessments.length;
  return {
    totalColleges,
    demoReady: countState(assessments, "demo_ready"),
    blocked: countState(assessments, "blocked"),
    needsReview: countState(assessments, "needs_review"),
    approvedUnpublished: countState(assessments, "approved_unpublished"),
    partiallyPublished: countState(assessments, "partially_published"),
    averageCompleteness:
      totalColleges === 0 ? 0 : Math.round(assessments.reduce((sum, item) => sum + item.completenessPercentage, 0) / totalColleges)
  };
}

export function toReadinessExportRows(assessments: ReadinessAssessment[]) {
  return assessments.map((assessment) => ({
    college_id: assessment.collegeId,
    college_name: assessment.collegeName,
    readiness_state: assessment.state,
    completeness_percentage: assessment.completenessPercentage,
    is_published: assessment.isPublished,
    published_branches: assessment.counts.branches.published,
    cutoff_years: assessment.coverage.cutoffYears.join("|"),
    latest_fee_year: assessment.latestFeeYear ?? "",
    latest_placement_year: assessment.latestPlacementYear ?? "",
    pending_review_count: assessment.counts.staging.needsReview,
    approved_unpublished_count: assessment.counts.staging.approvedUnpublished,
    unresolved_conflict_count: assessment.counts.staging.conflicts,
    missing_source_reference_count: assessment.coverage.missingSourceReferenceCount,
    missing_or_blocked_items: assessment.checklist
      .filter((item) => item.status !== "complete" && item.severity !== "info")
      .map((item) => item.label)
      .join("|")
  }));
}

function chooseReadinessState(input: {
  completenessPercentage: number;
  hasBlockingChecklist: boolean;
  hasReview: boolean;
  hasApprovedUnpublished: boolean;
  hasPublishedCore: boolean;
  hasStagedOnly: boolean;
}): ReadinessState {
  if (input.completenessPercentage === 100 && !input.hasBlockingChecklist && !input.hasReview && !input.hasApprovedUnpublished) {
    return "demo_ready";
  }
  if (input.hasBlockingChecklist) {
    return "blocked";
  }
  if (input.hasReview) {
    return "needs_review";
  }
  if (input.hasApprovedUnpublished) {
    return "approved_unpublished";
  }
  if (input.hasPublishedCore) {
    return "partially_published";
  }
  if (input.hasStagedOnly) {
    return "staged";
  }
  return "not_started";
}

function scoreCategories(input: {
  collegePublished: boolean;
  branchCount: number;
  cutoffYears: number[];
  feeCount: number;
  placementCount: number;
  scholarshipCount: number;
  sourceReferenceCount: number;
  missingSourceReferenceCount: number;
}): ReadinessCategoryScore[] {
  const sourceComplete = input.sourceReferenceCount > 0 && input.missingSourceReferenceCount === 0;
  const targetCutoffYears: number[] = [...readinessConfig.targetCutoffAdmissionYears];
  const cutoffRatio = targetCutoffYears.length
    ? input.cutoffYears.filter((year) => targetCutoffYears.includes(year)).length /
      readinessConfig.targetCutoffAdmissionYears.length
    : 0;

  return [
    categoryScore("college_identity", input.collegePublished ? 1 : 0, input.collegePublished ? "Published" : "College identity is not published"),
    categoryScore("branches", input.branchCount > 0 ? 1 : 0, `${input.branchCount} published branch record(s)`),
    categoryScore("cutoffs", cutoffRatio, `${input.cutoffYears.length} target cutoff year(s) covered`),
    categoryScore("fees", input.feeCount > 0 ? 1 : 0, `${input.feeCount} published fee record(s)`),
    categoryScore("placements", input.placementCount > 0 ? 1 : 0, `${input.placementCount} published placement record(s)`),
    categoryScore("scholarships", input.scholarshipCount > 0 ? 1 : 0, `${input.scholarshipCount} published scholarship link(s)`),
    categoryScore("sources", sourceComplete ? 1 : 0, `${input.missingSourceReferenceCount} missing source reference(s)`)
  ];
}

function categoryScore(category: ReadinessCategory, ratio: number, summary: string): ReadinessCategoryScore {
  const maxPoints = readinessConfig.categoryWeights[category];
  const points = Math.round(maxPoints * Math.max(0, Math.min(1, ratio)));
  return {
    category,
    label: readinessCategoryLabels[category],
    state: ratio >= 1 ? "complete" : readinessConfig.requiredCategories.includes(category) ? "missing" : "optional",
    points,
    maxPoints,
    summary
  };
}

function addChecklist(checklist: ReadinessChecklistItem[], item: ReadinessChecklistItem) {
  checklist.push(item);
}

function countsFor(published: number, staging: ReadinessStagingCounts): ReadinessCounts {
  return {
    published,
    staged: staging.staged,
    needsReview: staging.needsReview,
    approvedUnpublished: staging.approvedUnpublished,
    rejected: staging.rejected,
    conflicts: staging.conflicts,
    blockingValidationIssues: staging.blockingValidationIssues
  };
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))]
    .map((value) => value.trim())
    .sort();
}

function uniqueNumbers(values: Array<number | null | undefined>) {
  return [...new Set(values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)))].sort((a, b) => a - b);
}

function latestText(values: Array<string | null | undefined>) {
  const sorted = uniqueStrings(values).sort((a, b) => b.localeCompare(a));
  return sorted[0] ?? null;
}

function countState(assessments: ReadinessAssessment[], state: ReadinessState) {
  return assessments.filter((assessment) => assessment.state === state).length;
}
