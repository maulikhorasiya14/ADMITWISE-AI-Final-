import { z } from "zod";
import { sourceLabelSchema } from "../comparison/comparisonTypes.ts";

export const scholarshipEligibilityStatusSchema = z.enum([
  "potentially_eligible",
  "not_eligible",
  "more_information_required",
  "deadline_passed"
]);

export const scholarshipRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  description: z.string().nullable(),
  applicable_states: z.array(z.string()),
  applicable_categories: z.array(z.string()),
  gender_requirement: z.string().nullable(),
  maximum_family_income: z.number().nullable(),
  minimum_marks: z.number().nullable(),
  minimum_rank: z.number().nullable(),
  benefit_amount: z.number().nullable(),
  benefit_description: z.string().min(1),
  required_documents: z.array(z.string()),
  renewal_conditions: z.array(z.string()),
  application_deadline: z.string().nullable(),
  official_url: z.string().nullable(),
  source_id: z.string().min(1),
  verification_status: z.string().min(1),
  is_published: z.boolean(),
  sources: sourceLabelSchema.nullable().optional()
});

export const collegeScholarshipRecordSchema = z.object({
  id: z.string().min(1),
  college_id: z.string().min(1),
  scholarship_id: z.string().min(1),
  availability_notes: z.string().nullable(),
  source_id: z.string().min(1),
  verification_status: z.string().min(1),
  is_published: z.boolean()
});

export const scholarshipMatchSchema = z.object({
  scholarship: scholarshipRecordSchema,
  status: scholarshipEligibilityStatusSchema,
  reasons: z.array(z.string()),
  missingInformation: z.array(z.string()),
  possibleBenefitAmount: z.number().nullable(),
  possibleBenefitDescription: z.string(),
  estimatedEffectiveCost: z.number().nullable(),
  availabilityNotes: z.string().nullable()
});

export type ScholarshipEligibilityStatus = z.infer<typeof scholarshipEligibilityStatusSchema>;
export type ScholarshipRecord = z.infer<typeof scholarshipRecordSchema>;
export type CollegeScholarshipRecord = z.infer<typeof collegeScholarshipRecordSchema>;
export type ScholarshipMatch = z.infer<typeof scholarshipMatchSchema>;
