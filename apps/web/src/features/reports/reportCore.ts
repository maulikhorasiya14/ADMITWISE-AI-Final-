import type { CounsellorResponse } from "@/features/counsellor/counsellorTypes";
import type { ComparisonResult } from "@/features/comparison/comparisonTypes";
import type { SavedStudentProfile } from "@/features/profile/profileSchema";
import type { RecommendationViewModel } from "@/features/recommendations/recommendationTypes";
import type { ScholarshipMatch } from "@/features/scholarships/scholarshipTypes";
import {
  reportDisclaimer,
  reportScholarshipSnapshotSchema,
  reportSnapshotSchema,
  type ReportEvidence,
  type ReportSectionSelection,
  type ReportSnapshot
} from "./reportTypes.ts";

type BuildReportSnapshotInput = {
  title: string;
  generatedAt?: Date;
  includedSections: ReportSectionSelection;
  profile: SavedStudentProfile;
  recommendations: RecommendationViewModel[];
  comparison?: ComparisonResult | null;
  scholarships: ScholarshipMatch[];
  counsellorResponse?: CounsellorResponse | null;
};

export function buildReportSnapshot(input: BuildReportSnapshotInput): ReportSnapshot {
  const evidence = collectEvidence(input.recommendations, input.comparison ?? null, input.scholarships);
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const counsellor = buildCounsellorSummary(input.counsellorResponse ?? null, evidenceIds);
  const missingDataWarnings = collectMissingDataWarnings(input.recommendations, input.comparison ?? null, input.scholarships, counsellor);

  return reportSnapshotSchema.parse({
    schemaVersion: 1,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    title: input.title,
    includedSections: input.includedSections,
    profile: input.profile,
    recommendations: input.recommendations,
    comparison: input.comparison ?? null,
    scholarships: input.scholarships.map((match) => reportScholarshipSnapshotSchema.parse({
      scholarshipId: match.scholarship.id,
      name: match.scholarship.name,
      provider: match.scholarship.provider,
      status: match.status,
      possibleBenefitAmount: match.possibleBenefitAmount,
      possibleBenefitDescription: match.possibleBenefitDescription,
      estimatedEffectiveCost: match.estimatedEffectiveCost,
      requiredDocuments: match.scholarship.required_documents,
      renewalConditions: match.scholarship.renewal_conditions,
      applicationDeadline: match.scholarship.application_deadline,
      officialUrl: match.scholarship.official_url,
      reasons: match.reasons,
      missingInformation: match.missingInformation,
      sourceId: match.scholarship.source_id
    })),
    counsellor,
    evidence,
    missingDataWarnings,
    disclaimer: reportDisclaimer
  });
}

export function parseReportSnapshot(input: unknown) {
  return reportSnapshotSchema.safeParse(input);
}

export function canViewReport(reportUserId: string, currentUserId: string | null | undefined) {
  return Boolean(currentUserId && reportUserId === currentUserId);
}

export function canGenerateReport(profile: SavedStudentProfile | null | undefined) {
  return Boolean(profile);
}

export function isSafeReportEvidence(item: Pick<ReportEvidence, "id" | "sourceType">) {
  const sourceType = item.sourceType?.toLowerCase() ?? "";
  return !item.id.toLowerCase().startsWith("staging") &&
    sourceType !== "staging" &&
    sourceType !== "raw_extraction" &&
    sourceType !== "admin_review";
}

export function summarizeProfile(profile: SavedStudentProfile) {
  return [
    `Exams: ${profile.exams.map(e => `${e.exam} ${e.examYear} (${[e.rank ? `Rank ${e.rank}` : null, e.percentile !== undefined ? `${e.percentile}%ile` : null, e.marks !== undefined ? `${e.marks} marks` : null].filter(Boolean).join(", ")})`).join(" | ")}`,
    // Rank and percentile are now included in the Exams string above
    `${profile.category}, ${profile.gender}`,
    `${profile.homeCity ? `${profile.homeCity}, ` : ""}${profile.homeState}`
  ].filter(Boolean);
}

function collectEvidence(
  recommendations: RecommendationViewModel[],
  comparison: ComparisonResult | null,
  scholarships: ScholarshipMatch[]
) {
  const evidence = new Map<string, ReportEvidence>();

  recommendations.forEach((recommendation) => {
    upsertEvidence(evidence, {
      id: recommendation.cutoff.sourceId,
      label: `${recommendation.collegeName} ${recommendation.branchName} cutoff`,
      sourceType: "cutoff",
      academicYear: String(recommendation.cutoff.admissionYear),
      confidenceLevel: null,
      officialUrl: null
    });
  });

  comparison?.options.forEach((option) => {
    option.sourceLabels.forEach((label) => {
      upsertEvidence(evidence, {
        id: `comparison:${label}`,
        label,
        sourceType: "comparison",
        academicYear: null,
        confidenceLevel: null,
        officialUrl: null
      });
    });
  });

  scholarships.forEach((match) => {
    upsertEvidence(evidence, {
      id: match.scholarship.source_id,
      label: match.scholarship.sources?.title ?? `${match.scholarship.name} source`,
      sourceType: match.scholarship.sources?.source_type ?? "scholarship",
      academicYear: match.scholarship.sources?.academic_year ?? null,
      confidenceLevel: match.scholarship.sources?.confidence_level ?? null,
      officialUrl: safeUrl(match.scholarship.official_url)
    });
  });

  return Array.from(evidence.values());
}

function upsertEvidence(evidence: Map<string, ReportEvidence>, item: ReportEvidence) {
  if (isSafeReportEvidence(item) && !evidence.has(item.id)) {
    evidence.set(item.id, item);
  }
}

function buildCounsellorSummary(counsellorResponse: CounsellorResponse | null, evidenceIds: Set<string>) {
  if (!counsellorResponse || counsellorResponse.status !== "grounded") {
    return null;
  }

  const usableEvidenceIds = counsellorResponse.evidence
    .map((item) => item.sourceId)
    .filter((sourceId) => evidenceIds.has(sourceId));

  if (usableEvidenceIds.length === 0) {
    return null;
  }

  return {
    answer: counsellorResponse.answer,
    status: "grounded" as const,
    evidenceIds: usableEvidenceIds,
    warnings: counsellorResponse.warnings,
    missingData: counsellorResponse.missingData
  };
}

function collectMissingDataWarnings(
  recommendations: RecommendationViewModel[],
  comparison: ComparisonResult | null,
  scholarships: ScholarshipMatch[],
  counsellor: ReportSnapshot["counsellor"]
) {
  const warnings = new Set<string>();

  if (recommendations.length === 0) {
    warnings.add("No published verified cutoff data is available for this profile yet.");
  }

  recommendations.forEach((recommendation) => {
    recommendation.missingData.forEach((item) => warnings.add(`${recommendation.collegeName}: ${item}`));
    recommendation.warnings.forEach((item) => warnings.add(item));
  });

  if (!comparison) {
    warnings.add("No two-college comparison was included in this report.");
  } else {
    comparison.options.forEach((option) => {
      option.missingInformation.forEach((item) => warnings.add(`${option.collegeName}: ${item}`));
    });
  }

  if (scholarships.length === 0) {
    warnings.add("No published scholarship matches are available for this profile yet.");
  }

  scholarships.forEach((match) => {
    match.missingInformation.forEach((item) => warnings.add(`${match.scholarship.name}: ${item}`));
  });

  if (counsellor?.missingData.length) {
    counsellor.missingData.forEach((item) => warnings.add(item));
  }

  return Array.from(warnings);
}

function safeUrl(value: string | null) {
  if (!value) return null;

  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}
