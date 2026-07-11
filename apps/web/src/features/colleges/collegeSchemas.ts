import { z } from "zod";

export const ownershipSchema = z.enum(["GOVERNMENT", "PRIVATE", "DEEMED", "OTHER"]);

export const collegeListItemSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  short_name: z.string().nullable(),
  ownership: ownershipSchema,
  city: z.string().min(1),
  state: z.string().min(1),
  is_published: z.boolean()
});

export const sourceSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source_type: z.string().min(1),
  source_url: z.string().nullable(),
  academic_year: z.string().nullable(),
  verification_status: z.string().nullable(),
  confidence_level: z.string().nullable()
});

export const collegeBranchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  degree: z.string().min(1),
  duration_years: z.number().nullable(),
  intake: z.number().nullable(),
  nba_accredited: z.boolean().nullable(),
  academic_year: z.string().nullable(),
  verification_status: z.string().nullable(),
  confidence_level: z.string().nullable(),
  sources: sourceSummarySchema.nullable().optional()
});

export const collegeDetailSchema = collegeListItemSchema.extend({
  institute_type: z.string().nullable(),
  affiliated_university: z.string().nullable(),
  established_year: z.number().nullable(),
  official_website: z.string().nullable(),
  admission_website: z.string().nullable(),
  address: z.string().nullable(),
  pincode: z.string().nullable()
});

export type Ownership = z.infer<typeof ownershipSchema>;
export type CollegeListItem = z.infer<typeof collegeListItemSchema>;
export type CollegeBranch = z.infer<typeof collegeBranchSchema>;
export type CollegeDetail = z.infer<typeof collegeDetailSchema>;

