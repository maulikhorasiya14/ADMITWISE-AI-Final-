import { z } from "zod";

export const publishedCutoffCandidateSchema = z.object({
  id: z.string().min(1),
  exam: z.string().min(1),
  admission_year: z.number(),
  counselling_system: z.string().min(1),
  round: z.string().min(1),
  category: z.string().min(1),
  quota: z.string().min(1),
  gender_pool: z.string().nullable(),
  opening_rank: z.number().nullable(),
  closing_rank: z.number(),
  source_id: z.string().min(1),
  verification_status: z.string().min(1),
  publication_status: z.string().min(1),
  colleges: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1),
    state: z.string().min(1),
    city: z.string().min(1),
    is_published: z.boolean()
  }),
  college_branches: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    degree: z.string().min(1),
    verification_status: z.string().min(1),
    confidence_level: z.string().nullable()
  })
});

export const recommendationViewModelSchema = z.object({
  cutoffId: z.string(),
  collegeId: z.string(),
  collegeSlug: z.string(),
  collegeName: z.string(),
  branchId: z.string(),
  branchName: z.string(),
  classification: z.enum(["SAFE", "SMART", "AMBITIOUS", "UNLIKELY"]),
  overallScore: z.number(),
  componentScores: z.object({
    admission: z.number(),
    branchFit: z.number(),
    placement: z.number(),
    affordability: z.number(),
    scholarship: z.number(),
    location: z.number(),
    culture: z.number(),
    confidence: z.number()
  }),
  cutoff: z.object({
    exam: z.string(),
    admissionYear: z.number(),
    counsellingSystem: z.string(),
    round: z.string(),
    category: z.string(),
    quota: z.string(),
    genderPool: z.string().nullable(),
    openingRank: z.number().nullable(),
    closingRank: z.number(),
    sourceId: z.string()
  }),
  missingData: z.array(z.string()),
  warnings: z.array(z.string())
});

export type PublishedCutoffCandidate = z.infer<typeof publishedCutoffCandidateSchema>;
export type RecommendationViewModel = z.infer<typeof recommendationViewModelSchema>;
