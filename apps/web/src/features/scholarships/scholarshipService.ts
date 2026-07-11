import "server-only";

import { calculateTotalFourYearCost } from "@admitwise/scoring";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SavedStudentProfile } from "@/features/profile/profileSchema";
import { feeRecordSchema } from "@/features/comparison/comparisonTypes";
import { matchScholarships } from "./scholarshipMatcher";
import {
  collegeScholarshipRecordSchema,
  scholarshipRecordSchema,
  type CollegeScholarshipRecord,
  type ScholarshipMatch,
  type ScholarshipRecord
} from "./scholarshipTypes";

type ScholarshipServiceResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

const scholarshipListSchema = scholarshipRecordSchema.array();
const collegeScholarshipListSchema = collegeScholarshipRecordSchema.array();

export async function getScholarshipMatches(input: {
  profile: SavedStudentProfile;
  collegeId?: string;
}): Promise<ScholarshipServiceResult<ScholarshipMatch[]>> {
  try {
    const [scholarships, collegeLinks, fourYearCollegeCost] = await Promise.all([
      fetchPublishedScholarships(),
      fetchPublishedCollegeScholarships(input.collegeId),
      input.collegeId ? fetchLatestFourYearCost(input.collegeId) : Promise.resolve(null)
    ]);

    if (!scholarships.success) return scholarships;
    if (!collegeLinks.success) return collegeLinks;

    return {
      success: true,
      data: matchScholarships({
        profile: input.profile,
        scholarships: scholarships.data,
        collegeScholarships: collegeLinks.data,
        selectedCollegeId: input.collegeId,
        fourYearCollegeCost
      })
    };
  } catch {
    return { success: false, message: "Supabase is not configured or is unavailable." };
  }
}

export async function listPublishedScholarshipsForCollege(collegeId: string): Promise<ScholarshipServiceResult<Array<{
  scholarship: ScholarshipRecord;
  link: CollegeScholarshipRecord;
}>>> {
  try {
    const [scholarships, links] = await Promise.all([
      fetchPublishedScholarships(),
      fetchPublishedCollegeScholarships(collegeId)
    ]);

    if (!scholarships.success) return scholarships;
    if (!links.success) return links;

    const rows = links.data.flatMap((link) => {
      const scholarship = scholarships.data.find((item) => item.id === link.scholarship_id);
      return scholarship ? [{ scholarship, link }] : [];
    });

    return { success: true, data: rows };
  } catch {
    return { success: false, message: "Unable to load published scholarships for this college." };
  }
}

async function fetchPublishedScholarships(): Promise<ScholarshipServiceResult<ScholarshipRecord[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("scholarships")
    .select("id, name, provider, description, applicable_states, applicable_categories, gender_requirement, maximum_family_income, minimum_marks, minimum_rank, benefit_amount, benefit_description, required_documents, renewal_conditions, application_deadline, official_url, source_id, verification_status, is_published, sources(id, title, source_type, academic_year, confidence_level)")
    .eq("verification_status", "published")
    .eq("is_published", true)
    .order("name", { ascending: true });

  if (error) {
    return { success: false, message: "Unable to load published scholarships." };
  }

  const parsed = scholarshipListSchema.safeParse(data ?? []);
  if (!parsed.success) {
    return { success: false, message: "Scholarship data did not match the expected format." };
  }

  return { success: true, data: parsed.data };
}

async function fetchPublishedCollegeScholarships(collegeId?: string): Promise<ScholarshipServiceResult<CollegeScholarshipRecord[]>> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("college_scholarships")
    .select("id, college_id, scholarship_id, availability_notes, source_id, verification_status, is_published")
    .eq("verification_status", "published")
    .eq("is_published", true);

  if (collegeId) {
    query = query.eq("college_id", collegeId);
  }

  const { data, error } = await query;
  if (error) {
    return { success: false, message: "Unable to load college scholarship links." };
  }

  const parsed = collegeScholarshipListSchema.safeParse(data ?? []);
  if (!parsed.success) {
    return { success: false, message: "College scholarship data did not match the expected format." };
  }

  return { success: true, data: parsed.data };
}

async function fetchLatestFourYearCost(collegeId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("fees")
    .select("id, college_id, academic_year, tuition_fee, hostel_fee, mess_fee, admission_fee, refundable_deposit, other_compulsory_fees, estimated_four_year_cost, source_id, verification_status, is_published, sources(id, title, source_type, academic_year, confidence_level)")
    .eq("college_id", collegeId)
    .eq("verification_status", "published")
    .eq("is_published", true)
    .order("academic_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  const parsed = feeRecordSchema.safeParse(data);
  if (!parsed.success) {
    return null;
  }

  return calculateTotalFourYearCost({
    tuitionFee: parsed.data.tuition_fee,
    hostelFee: parsed.data.hostel_fee,
    messFee: parsed.data.mess_fee,
    admissionFee: parsed.data.admission_fee,
    refundableDeposit: parsed.data.refundable_deposit,
    otherCompulsoryFees: parsed.data.other_compulsory_fees,
    estimatedFourYearCost: parsed.data.estimated_four_year_cost
  }).score;
}
