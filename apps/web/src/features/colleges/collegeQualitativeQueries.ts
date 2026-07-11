import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  clubSchema,
  campusRealitySchema,
  collegeFacilitiesSchema,
  locationDetailsSchema,
  studentExperienceSourceSchema,
  type Club,
  type CampusReality,
  type CollegeFacilities,
  type LocationDetails,
  type StudentExperienceSource
} from "./collegeQualitativeSchemas";

export async function getCollegeClubs(collegeId: string): Promise<Club[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("college_clubs")
    .select(`
      *,
      sources ( id, title, source_type, source_url, academic_year, verification_status, confidence_level )
    `)
    .eq("college_id", collegeId)
    .eq("verification_status", "published");

  if (error || !data) {
    if (error?.code !== "PGRST116") console.error("Error fetching clubs:", error);
    return [];
  }
  return clubSchema.array().parse(data);
}

export async function getCampusReality(collegeId: string): Promise<CampusReality | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campus_reality")
    .select("*")
    .eq("college_id", collegeId)
    .eq("verification_status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return campusRealitySchema.parse(data);
}

export async function getCollegeFacilities(collegeId: string): Promise<CollegeFacilities | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("college_facilities")
    .select(`
      *,
      sources ( id, title, source_type, source_url, academic_year, verification_status, confidence_level )
    `)
    .eq("college_id", collegeId)
    .eq("verification_status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return collegeFacilitiesSchema.parse(data);
}

export async function getCollegeLocationDetails(collegeId: string): Promise<LocationDetails | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("college_location_details")
    .select(`
      *,
      sources ( id, title, source_type, source_url, academic_year, verification_status, confidence_level )
    `)
    .eq("college_id", collegeId)
    .eq("verification_status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return locationDetailsSchema.parse(data);
}

export async function getStudentExperienceSources(collegeId: string): Promise<StudentExperienceSource[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("student_experience_sources")
    .select("*")
    .eq("college_id", collegeId)
    .eq("verification_status", "published");

  if (error || !data) {
    if (error?.code !== "PGRST116") console.error("Error fetching experience sources:", error);
    return [];
  }
  return studentExperienceSourceSchema.array().parse(data);
}
