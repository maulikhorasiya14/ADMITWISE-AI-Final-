import { z } from "zod";

export const comparisonModeSchema = z.enum(["student", "parent"]);
export const comparisonOptionIdSchema = z.string().min(1);

export const sourceLabelSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source_type: z.string().min(1),
  academic_year: z.string().nullable(),
  confidence_level: z.string().nullable()
});

export const feeRecordSchema = z.object({
  id: z.string().min(1),
  college_id: z.string().min(1),
  academic_year: z.string().min(1),
  tuition_fee: z.number().nullable(),
  hostel_fee: z.number().nullable(),
  mess_fee: z.number().nullable(),
  admission_fee: z.number().nullable(),
  refundable_deposit: z.number().nullable(),
  other_compulsory_fees: z.number().nullable(),
  estimated_four_year_cost: z.number().nullable(),
  source_id: z.string().min(1),
  verification_status: z.string().min(1),
  is_published: z.boolean(),
  sources: sourceLabelSchema.nullable().optional()
});

export const placementRecordSchema = z.object({
  id: z.string().min(1),
  college_id: z.string().min(1),
  branch_id: z.string().nullable(),
  placement_year: z.string().min(1),
  graduating_students: z.number().nullable(),
  students_placed: z.number().nullable(),
  placement_percentage: z.number().nullable(),
  average_package: z.number().nullable(),
  median_package: z.number().nullable(),
  highest_package: z.number().nullable(),
  source_id: z.string().min(1),
  verification_status: z.string().min(1),
  is_published: z.boolean(),
  sources: sourceLabelSchema.nullable().optional()
});

export const comparisonBranchOptionSchema = z.object({
  optionId: z.string().min(1),
  collegeId: z.string().min(1),
  collegeSlug: z.string().min(1),
  collegeName: z.string().min(1),
  collegeCity: z.string().min(1),
  collegeState: z.string().min(1),
  collegeIsPublished: z.boolean(),
  branchId: z.string().min(1),
  branchName: z.string().min(1),
  branchDegree: z.string().min(1),
  branchVerificationStatus: z.string().min(1),
  confidenceLevel: z.string().nullable(),
  fee: feeRecordSchema.nullable(),
  placement: placementRecordSchema.nullable(),
  admissionClassification: z.enum(["SAFE", "SMART", "AMBITIOUS", "UNLIKELY"]).nullable(),
  admissionScore: z.number().nullable(),
  branchFitScore: z.number().nullable()
});

export const comparisonResultSchema = z.object({
  mode: comparisonModeSchema,
  winner: z.enum(["left", "right", "tie", "insufficient_data"]),
  options: z.array(z.object({
    side: z.enum(["left", "right"]),
    optionId: z.string(),
    collegeName: z.string(),
    collegeSlug: z.string(),
    branchName: z.string(),
    admissionClassification: z.string().nullable(),
    admissionScore: z.number().nullable(),
    branchFitScore: z.number().nullable(),
    fourYearCost: z.number().nullable(),
    effectiveCost: z.number().nullable(),
    placementPercentage: z.number().nullable(),
    medianPackage: z.number().nullable(),
    averagePackage: z.number().nullable(),
    preferredPackageSource: z.enum(["median", "average", "missing"]),
    roiScore: z.number().nullable(),
    affordabilityScore: z.number().nullable(),
    placementScore: z.number().nullable(),
    dataConfidenceScore: z.number(),
    modeScore: z.number(),
    missingInformation: z.array(z.string()),
    sourceLabels: z.array(z.string())
  })),
  categoryWinners: z.record(z.enum(["left", "right", "tie", "insufficient_data"]))
});

export type ComparisonMode = z.infer<typeof comparisonModeSchema>;
export type FeeRecord = z.infer<typeof feeRecordSchema>;
export type PlacementRecord = z.infer<typeof placementRecordSchema>;
export type ComparisonBranchOption = z.infer<typeof comparisonBranchOptionSchema>;
export type ComparisonResult = z.infer<typeof comparisonResultSchema>;
