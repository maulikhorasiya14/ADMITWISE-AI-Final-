import { createSupabaseServerClient } from "@/lib/supabase/server";
import { feeRecordSchema, placementRecordSchema, type FeeRecord, type PlacementRecord } from "@/features/comparison/comparisonTypes";
import {
  collegeBranchSchema,
  collegeDetailSchema,
  collegeListItemSchema,
  type CollegeBranch,
  type CollegeDetail,
  type CollegeListItem,
  type Ownership
} from "./collegeSchemas";
import { filterPublishedColleges, type OwnershipFilter } from "./collegeFilters";

type QueryResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

const collegeListSchema = collegeListItemSchema.array();
const branchListSchema = collegeBranchSchema.array();
const feeListSchema = feeRecordSchema.array();
const placementListSchema = placementRecordSchema.array();

export async function listPublishedColleges(params: {
  search?: string;
  ownership?: OwnershipFilter;
}): Promise<QueryResult<CollegeListItem[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("colleges")
      .select("id, slug, name, short_name, ownership, city, state, is_published")
      .eq("is_published", true)
      .order("name", { ascending: true });

    const search = params.search?.trim();
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (params.ownership && params.ownership !== "ALL") {
      query = query.eq("ownership", params.ownership satisfies Ownership);
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, message: "Unable to load published colleges right now." };
    }

    const parsed = collegeListSchema.safeParse(data ?? []);
    if (!parsed.success) {
      return { success: false, message: "College data did not match the expected format." };
    }

    return { success: true, data: filterPublishedColleges(parsed.data) };
  } catch {
    return { success: false, message: "Supabase is not configured or is unavailable." };
  }
}

export async function getPublishedCollegeBySlug(slug: string): Promise<QueryResult<{
  college: CollegeDetail | null;
  branches: CollegeBranch[];
  fees: FeeRecord[];
  placements: PlacementRecord[];
}>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: collegeData, error: collegeError } = await supabase
      .from("colleges")
      .select(
        "id, slug, name, short_name, ownership, city, state, is_published, institute_type, affiliated_university, established_year, official_website, admission_website, address, pincode"
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (collegeError) {
      return { success: false, message: "Unable to load this college right now." };
    }

    if (!collegeData) {
      return { success: true, data: { college: null, branches: [], fees: [], placements: [] } };
    }

    const college = collegeDetailSchema.parse(collegeData);
    const { data: branchData, error: branchError } = await supabase
      .from("college_branches")
      .select(
        "id, name, degree, duration_years, intake, nba_accredited, academic_year, verification_status, confidence_level, sources(id, title, source_type, source_url, academic_year, verification_status, confidence_level)"
      )
      .eq("college_id", college.id)
      .eq("verification_status", "published")
      .order("name", { ascending: true });

    if (branchError) {
      return { success: false, message: "Unable to load branch details right now." };
    }

    const branches = branchListSchema.parse(branchData ?? []);
    const { data: feeData, error: feeError } = await supabase
      .from("fees")
      .select("id, college_id, academic_year, tuition_fee, hostel_fee, mess_fee, admission_fee, refundable_deposit, other_compulsory_fees, estimated_four_year_cost, source_id, verification_status, is_published, sources(id, title, source_type, academic_year, confidence_level)")
      .eq("college_id", college.id)
      .eq("verification_status", "published")
      .eq("is_published", true)
      .order("academic_year", { ascending: false });

    if (feeError) {
      return { success: false, message: "Unable to load fee details right now." };
    }

    const { data: placementData, error: placementError } = await supabase
      .from("placements")
      .select("id, college_id, branch_id, placement_year, graduating_students, students_placed, placement_percentage, average_package, median_package, highest_package, source_id, verification_status, is_published, sources(id, title, source_type, academic_year, confidence_level)")
      .eq("college_id", college.id)
      .eq("verification_status", "published")
      .eq("is_published", true)
      .order("placement_year", { ascending: false });

    if (placementError) {
      return { success: false, message: "Unable to load placement details right now." };
    }

    return {
      success: true,
      data: {
        college,
        branches,
        fees: feeListSchema.parse(feeData ?? []),
        placements: placementListSchema.parse(placementData ?? [])
      }
    };
  } catch {
    return { success: false, message: "Supabase is not configured or is unavailable." };
  }
}
