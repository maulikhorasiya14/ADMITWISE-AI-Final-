import { z } from "zod";
import { comparisonModeSchema, comparisonResultSchema } from "../comparison/comparisonTypes.ts";
import { studentProfileSchema } from "../profile/profileSchema.ts";
import { recommendationViewModelSchema } from "../recommendations/recommendationTypes.ts";
import { scholarshipMatchSchema } from "../scholarships/scholarshipTypes.ts";

export const reportDisclaimer =
  "This report is a decision-support snapshot based only on verified published data available at generation time. It is not admission, scholarship, placement or salary advice, and outcomes are never guaranteed.";

export const reportIdSchema = z.string().uuid();
export const reportTitleSchema = z.string().trim().min(1).max(120);

export const reportSectionSchema = z.enum([
  "profile",
  "recommendations",
  "comparison",
  "costs",
  "scholarships",
  "counsellor",
  "evidence"
]);

export const reportSectionSelectionSchema = z.object({
  profile: z.boolean(),
  recommendations: z.boolean(),
  comparison: z.boolean(),
  costs: z.boolean(),
  scholarships: z.boolean(),
  counsellor: z.boolean(),
  evidence: z.boolean()
});

export const defaultReportSectionSelection = {
  profile: true,
  recommendations: true,
  comparison: true,
  costs: true,
  scholarships: true,
  counsellor: true,
  evidence: true
} satisfies ReportSectionSelection;

export const reportEvidenceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sourceType: z.string().nullable(),
  academicYear: z.string().nullable(),
  confidenceLevel: z.string().nullable(),
  officialUrl: z.string().url().nullable()
});

export const reportRecommendationSchema = recommendationViewModelSchema.pick({
  cutoffId: true,
  collegeId: true,
  collegeSlug: true,
  collegeName: true,
  branchId: true,
  branchName: true,
  classification: true,
  overallScore: true,
  componentScores: true,
  cutoff: true,
  missingData: true,
  warnings: true
});

export const reportScholarshipSchema = scholarshipMatchSchema.transform((match) => ({
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
}));

export const reportScholarshipSnapshotSchema = z.object({
  scholarshipId: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  status: scholarshipMatchSchema.shape.status,
  possibleBenefitAmount: z.number().nullable(),
  possibleBenefitDescription: z.string(),
  estimatedEffectiveCost: z.number().nullable(),
  requiredDocuments: z.array(z.string()),
  renewalConditions: z.array(z.string()),
  applicationDeadline: z.string().nullable(),
  officialUrl: z.string().nullable(),
  reasons: z.array(z.string()),
  missingInformation: z.array(z.string()),
  sourceId: z.string().min(1)
});

export const reportCounsellorSummarySchema = z.object({
  answer: z.string().min(1),
  status: z.literal("grounded"),
  evidenceIds: z.array(z.string().min(1)),
  warnings: z.array(z.string()),
  missingData: z.array(z.string())
});

export const reportSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  title: reportTitleSchema,
  includedSections: reportSectionSelectionSchema,
  profile: studentProfileSchema,
  recommendations: z.array(reportRecommendationSchema),
  comparison: comparisonResultSchema.nullable(),
  scholarships: z.array(reportScholarshipSnapshotSchema),
  counsellor: reportCounsellorSummarySchema.nullable(),
  evidence: z.array(reportEvidenceSchema),
  missingDataWarnings: z.array(z.string()),
  disclaimer: z.literal(reportDisclaimer)
});

export const reportGenerateRequestSchema = z.object({
  title: reportTitleSchema.default("AdmitWise decision-support report"),
  profile: studentProfileSchema.optional(),
  sections: reportSectionSelectionSchema.default(defaultReportSectionSelection),
  comparison: z.object({
    optionIds: z.array(z.string().min(1)).length(2),
    mode: comparisonModeSchema,
    scholarshipAmount: z.number().min(0).optional()
  }).optional()
});

export type ReportSectionSelection = z.infer<typeof reportSectionSelectionSchema>;
export type ReportEvidence = z.infer<typeof reportEvidenceSchema>;
export type ReportRecommendation = z.infer<typeof reportRecommendationSchema>;
export type ReportScholarshipSnapshot = z.infer<typeof reportScholarshipSnapshotSchema>;
export type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;
export type ReportGenerateRequest = z.infer<typeof reportGenerateRequestSchema>;
