import { z } from "zod";
import { sourceSummarySchema } from "./collegeSchemas";

export const clubSchema = z.object({
  id: z.string().min(1),
  college_id: z.string().min(1),
  club_name: z.string().min(1),
  club_category: z.string().nullable(),
  official_status: z.string().nullable(),
  description: z.string().nullable(),
  official_page: z.string().nullable(),
  latest_activity: z.string().nullable(),
  latest_activity_date: z.string().nullable(),
  major_achievements: z.string().nullable(),
  recruitment_process: z.string().nullable(),
  activity_status: z.string().nullable(),
  last_verified_date: z.string().nullable(),
  verification_status: z.string().nullable(),
  confidence_level: z.string().nullable(),
  sources: sourceSummarySchema.nullable().optional()
});

export const campusRealitySchema = z.object({
  college_id: z.string().min(1),
  data: z.record(z.any()),
  source_ids: z.array(z.string()),
  verification_status: z.string().nullable(),
  confidence_level: z.string().nullable()
});

export const collegeFacilitiesSchema = z.object({
  college_id: z.string().min(1),
  data: z.record(z.any()),
  verification_status: z.string().nullable(),
  confidence_level: z.string().nullable(),
  sources: sourceSummarySchema.nullable().optional()
});

export const locationDetailsSchema = z.object({
  college_id: z.string().min(1),
  campus_name: z.string().nullable(),
  official_address: z.string().nullable(),
  locality: z.string().nullable(),
  district: z.string().nullable(),
  nearest_metro: z.string().nullable(),
  nearest_bus_terminal: z.string().nullable(),
  railway_travel_time_minutes: z.number().nullable(),
  airport_travel_time_minutes: z.number().nullable(),
  technology_ecosystem: z.string().nullable(),
  cost_of_living_description: z.string().nullable(),
  data_origin: z.string().nullable(),
  verification_status: z.string().nullable(),
  confidence_level: z.string().nullable(),
  sources: sourceSummarySchema.nullable().optional()
});

export const studentExperienceSourceSchema = z.object({
  id: z.string().min(1),
  college_id: z.string().min(1),
  local_source_id: z.string().min(1),
  platform: z.string().nullable(),
  source_title: z.string().nullable(),
  url: z.string().nullable(),
  publication_date: z.string().nullable(),
  source_identity_type: z.string().nullable(),
  college_branch_if_known: z.string().nullable(),
  graduation_year_if_known: z.string().nullable(),
  hosteller_or_day_scholar: z.string().nullable(),
  topics_covered: z.string().nullable(),
  positive_themes: z.string().nullable(),
  negative_themes: z.string().nullable(),
  visual_evidence: z.boolean().nullable(),
  possible_bias: z.string().nullable(),
  confidence_level: z.string().nullable(),
  notes: z.string().nullable(),
  verification_status: z.string().nullable()
});

export type Club = z.infer<typeof clubSchema>;
export type CampusReality = z.infer<typeof campusRealitySchema>;
export type CollegeFacilities = z.infer<typeof collegeFacilitiesSchema>;
export type LocationDetails = z.infer<typeof locationDetailsSchema>;
export type StudentExperienceSource = z.infer<typeof studentExperienceSourceSchema>;
