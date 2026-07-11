import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);
const emptyNumber = (val: unknown) => (val === "" || Number.isNaN(val) ? undefined : val);


export const collegeIdentitySchema = z.object({
  name: z.string().min(1, "Name is required").max(300),
  short_name: z.string().max(50).optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  ownership: z.enum(["GOVERNMENT", "PRIVATE", "DEEMED", "OTHER"]),
  institute_type: z.string().max(100).optional(),
  affiliated_university: z.string().max(300).optional(),
  established_year: z.preprocess(emptyNumber, z.coerce.number().int().min(1800).max(2100).optional()),
  official_website: z.preprocess(emptyToUndefined, z.string().url("Must be a valid URL").optional()),
  admission_website: z.preprocess(emptyToUndefined, z.string().url("Must be a valid URL").optional()),
  placement_website: z.preprocess(emptyToUndefined, z.string().url("Must be a valid URL").optional()),
  address: z.string().max(500).optional(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  pincode: z.string().max(10).optional(),
  latitude: z.preprocess(emptyNumber, z.coerce.number().min(-90).max(90).optional()),
  longitude: z.preprocess(emptyNumber, z.coerce.number().min(-180).max(180).optional()),
  is_published: z.boolean()
});

export type CollegeIdentityInput = z.infer<typeof collegeIdentitySchema>;


export const branchInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Branch name is required"),
  degree: z.string().min(1, "Degree is required"),
  duration_years: z.coerce.number().int().min(1).max(8),
  intake: z.preprocess(emptyNumber, z.coerce.number().int().min(0).optional()),
  nba_accredited: z.boolean().optional(),
  source_id: z.string().uuid("Valid source UUID is required"),
  academic_year: z.preprocess(emptyToUndefined, z.string().optional()),
  confidence_level: z.enum(["A", "B", "C", "D", "E"]).default("B")
});

export type BranchInput = z.infer<typeof branchInputSchema>;


export const feeInputSchema = z.object({
  id: z.string().uuid().optional(),
  academic_year: z.string().min(1, "Academic year is required"),
  tuition_fee: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  hostel_fee: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  mess_fee: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  admission_fee: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  refundable_deposit: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  other_compulsory_fees: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  estimated_four_year_cost: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  source_id: z.string().uuid("Valid source UUID is required")
});

export type FeeInput = z.infer<typeof feeInputSchema>;


export const placementInputSchema = z.object({
  id: z.string().uuid().optional(),
  branch_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  placement_year: z.string().min(1, "Placement year is required"),
  graduating_students: z.preprocess(emptyNumber, z.coerce.number().int().min(0).optional()),
  students_placed: z.preprocess(emptyNumber, z.coerce.number().int().min(0).optional()),
  placement_percentage: z.preprocess(emptyNumber, z.coerce.number().min(0).max(100).optional()),
  average_package: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  median_package: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  highest_package: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  source_id: z.string().uuid("Valid source UUID is required")
});

export type PlacementInput = z.infer<typeof placementInputSchema>;


export const locationInputSchema = z.object({
  nearest_railway_station: z.preprocess(emptyToUndefined, z.string().optional()),
  railway_distance_km: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  nearest_airport: z.preprocess(emptyToUndefined, z.string().optional()),
  airport_distance_km: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  nearest_major_hospital: z.preprocess(emptyToUndefined, z.string().optional()),
  hospital_distance_km: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  public_transport_score: z.preprocess(emptyNumber, z.coerce.number().int().min(0).max(100).optional()),
  city_centre_distance_km: z.preprocess(emptyNumber, z.coerce.number().min(0).optional()),
  technology_ecosystem_score: z.preprocess(emptyNumber, z.coerce.number().int().min(0).max(100).optional()),
  cost_of_living_band: z.preprocess(emptyToUndefined, z.enum(["LOW", "MEDIUM", "HIGH"]).optional()),
  source_id: z.string().uuid("Valid source UUID is required")
});

export type LocationInput = z.infer<typeof locationInputSchema>;


const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return uuidRegex.test(value);
}
