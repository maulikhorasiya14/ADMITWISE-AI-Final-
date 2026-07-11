import "server-only";

import { z } from "zod";
import {
  collegeIdentitySchema,
  branchInputSchema,
  feeInputSchema,
  placementInputSchema,
  locationInputSchema,
  isValidUUID,
  type CollegeIdentityInput,
  type BranchInput,
  type FeeInput,
  type PlacementInput,
  type LocationInput
} from "@/features/admin/adminCollegeSchemas";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";


type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string; status: number };

export type CollegeListRow = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  ownership: string;
  city: string;
  state: string;
  is_published: boolean;
  updated_at: string;
};

export type CollegeEditorData = {
  college: CollegeListRow & {
    institute_type: string | null;
    affiliated_university: string | null;
    established_year: number | null;
    official_website: string | null;
    admission_website: string | null;
    placement_website: string | null;
    address: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  branches: BranchRow[];
  fees: FeeRow[];
  placements: PlacementRow[];
  location: LocationRow | null;
  isAdmin: boolean;
};

export type BranchRow = {
  id: string;
  name: string;
  degree: string;
  duration_years: number;
  intake: number | null;
  nba_accredited: boolean | null;
  source_id: string;
  academic_year: string | null;
  verification_status: string;
  confidence_level: string;
};

export type FeeRow = {
  id: string;
  academic_year: string;
  tuition_fee: number | null;
  hostel_fee: number | null;
  mess_fee: number | null;
  admission_fee: number | null;
  refundable_deposit: number | null;
  other_compulsory_fees: number | null;
  estimated_four_year_cost: number | null;
  source_id: string;
  verification_status: string;
  is_published: boolean;
};

export type PlacementRow = {
  id: string;
  branch_id: string | null;
  placement_year: string;
  graduating_students: number | null;
  students_placed: number | null;
  placement_percentage: number | null;
  average_package: number | null;
  median_package: number | null;
  highest_package: number | null;
  source_id: string;
  verification_status: string;
  is_published: boolean;
};

export type LocationRow = {
  nearest_railway_station: string | null;
  railway_distance_km: number | null;
  nearest_airport: string | null;
  airport_distance_km: number | null;
  nearest_major_hospital: string | null;
  hospital_distance_km: number | null;
  public_transport_score: number | null;
  city_centre_distance_km: number | null;
  technology_ecosystem_score: number | null;
  cost_of_living_band: string | null;
  source_id: string;
  verification_status: string;
};


type AdminUser = { id: string; roles: string[] };

async function requireAdmin(allowedRoles: string[]): Promise<ServiceResult<AdminUser>> {
  try {
    const userClient = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return err("UNAUTHORIZED", "Sign in is required.", 401);
    }

    const serviceClient = createSupabaseServiceRoleClient();
    const { data, error } = await serviceClient.from("user_roles").select("role").eq("user_id", user.id);
    if (error) {
      return err("DATA_INCOMPLETE", "Unable to verify permissions.", 500);
    }

    const roles = z
      .array(z.object({ role: z.string() }))
      .parse(data ?? [])
      .map((r) => r.role);

    const hasAccess = allowedRoles.some((r) => roles.includes(r));
    if (!hasAccess) {
      return err("FORBIDDEN", "Your account does not have access to this feature.", 403);
    }

    return { success: true, data: { id: user.id, roles } };
  } catch {
    return err("DATA_INCOMPLETE", "Admin services are not configured.", 500);
  }
}


export async function listAllColleges(): Promise<ServiceResult<CollegeListRow[]>> {
  const auth = await requireAdmin(["researcher", "admin"]);
  if (!auth.success) return auth;

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("colleges")
    .select("id, slug, name, short_name, ownership, city, state, is_published, updated_at")
    .order("name", { ascending: true });

  if (error) {
    return err("DATA_INCOMPLETE", "Unable to load colleges.", 500);
  }

  return { success: true, data: (data ?? []) as CollegeListRow[] };
}


export async function getCollegeForEditor(collegeId: string): Promise<ServiceResult<CollegeEditorData>> {
  if (!isValidUUID(collegeId)) {
    return err("VALIDATION_ERROR", "Invalid college ID.", 400);
  }

  const auth = await requireAdmin(["researcher", "admin"]);
  if (!auth.success) return auth;

  const supabase = createSupabaseServiceRoleClient();

  const [collegeResult, branchResult, feeResult, placementResult, locationResult] = await Promise.all([
    supabase
      .from("colleges")
      .select(
        "id, slug, name, short_name, ownership, city, state, is_published, updated_at, institute_type, affiliated_university, established_year, official_website, admission_website, placement_website, address, pincode, latitude, longitude"
      )
      .eq("id", collegeId)
      .maybeSingle(),
    supabase
      .from("college_branches")
      .select("id, name, degree, duration_years, intake, nba_accredited, source_id, academic_year, verification_status, confidence_level")
      .eq("college_id", collegeId)
      .order("name", { ascending: true }),
    supabase
      .from("fees")
      .select(
        "id, academic_year, tuition_fee, hostel_fee, mess_fee, admission_fee, refundable_deposit, other_compulsory_fees, estimated_four_year_cost, source_id, verification_status, is_published"
      )
      .eq("college_id", collegeId)
      .order("academic_year", { ascending: false }),
    supabase
      .from("placements")
      .select(
        "id, branch_id, placement_year, graduating_students, students_placed, placement_percentage, average_package, median_package, highest_package, source_id, verification_status, is_published"
      )
      .eq("college_id", collegeId)
      .order("placement_year", { ascending: false }),
    supabase.from("location_metrics").select("*").eq("college_id", collegeId).maybeSingle()
  ]);

  if (collegeResult.error) {
    return err("DATA_INCOMPLETE", "Unable to load college data.", 500);
  }
  if (!collegeResult.data) {
    return err("NOT_FOUND", "College not found.", 404);
  }

  const location = locationResult.data
    ? ({
        nearest_railway_station: locationResult.data.nearest_railway_station,
        railway_distance_km: locationResult.data.railway_distance_km,
        nearest_airport: locationResult.data.nearest_airport,
        airport_distance_km: locationResult.data.airport_distance_km,
        nearest_major_hospital: locationResult.data.nearest_major_hospital,
        hospital_distance_km: locationResult.data.hospital_distance_km,
        public_transport_score: locationResult.data.public_transport_score,
        city_centre_distance_km: locationResult.data.city_centre_distance_km,
        technology_ecosystem_score: locationResult.data.technology_ecosystem_score,
        cost_of_living_band: locationResult.data.cost_of_living_band,
        source_id: locationResult.data.source_id,
        verification_status: locationResult.data.verification_status
      } as LocationRow)
    : null;

  return {
    success: true,
    data: {
      college: collegeResult.data as CollegeEditorData["college"],
      branches: (branchResult.data ?? []) as BranchRow[],
      fees: (feeResult.data ?? []) as FeeRow[],
      placements: (placementResult.data ?? []) as PlacementRow[],
      location,
      isAdmin: auth.data.roles.includes("admin")
    }
  };
}


export async function updateCollegeIdentity(
  collegeId: string,
  input: CollegeIdentityInput
): Promise<ServiceResult<{ id: string }>> {
  if (!isValidUUID(collegeId)) return err("VALIDATION_ERROR", "Invalid college ID.", 400);

  const auth = await requireAdmin(["admin"]);
  if (!auth.success) return auth;

  const parsed = collegeIdentitySchema.safeParse(input);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues.map((i) => i.message).join("; "), 400);
  }

  const supabase = createSupabaseServiceRoleClient();
  const payload = {
    name: parsed.data.name,
    short_name: parsed.data.short_name || null,
    slug: parsed.data.slug,
    ownership: parsed.data.ownership,
    institute_type: parsed.data.institute_type || null,
    affiliated_university: parsed.data.affiliated_university || null,
    established_year: parsed.data.established_year ?? null,
    official_website: parsed.data.official_website || null,
    admission_website: parsed.data.admission_website || null,
    placement_website: parsed.data.placement_website || null,
    address: parsed.data.address || null,
    city: parsed.data.city,
    state: parsed.data.state,
    pincode: parsed.data.pincode || null,
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
    is_published: parsed.data.is_published
  };

  const { error } = await supabase.from("colleges").update(payload).eq("id", collegeId);
  if (error) {
    if (error.code === "23505") {
      return err("CONFLICT_DETECTED", "This slug is already used by another college.", 409);
    }
    return err("DATA_INCOMPLETE", "Unable to update college identity.", 500);
  }

  return { success: true, data: { id: collegeId } };
}


export async function upsertBranch(collegeId: string, input: BranchInput): Promise<ServiceResult<{ id: string }>> {
  if (!isValidUUID(collegeId)) return err("VALIDATION_ERROR", "Invalid college ID.", 400);

  const auth = await requireAdmin(["admin"]);
  if (!auth.success) return auth;

  const parsed = branchInputSchema.safeParse(input);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues.map((i) => i.message).join("; "), 400);
  }

  const supabase = createSupabaseServiceRoleClient();
  const payload = {
    college_id: collegeId,
    name: parsed.data.name,
    degree: parsed.data.degree,
    duration_years: parsed.data.duration_years,
    intake: parsed.data.intake ?? null,
    nba_accredited: parsed.data.nba_accredited ?? null,
    source_id: parsed.data.source_id,
    academic_year: parsed.data.academic_year || null,
    verification_status: "published" as const,
    confidence_level: parsed.data.confidence_level
  };

  if (parsed.data.id) {

    const { error } = await supabase.from("college_branches").update(payload).eq("id", parsed.data.id).eq("college_id", collegeId);
    if (error) {
      return err("DATA_INCOMPLETE", "Unable to update branch.", 500);
    }
    return { success: true, data: { id: parsed.data.id } };
  }

  const { data, error } = await supabase.from("college_branches").insert(payload).select("id").single();
  if (error) {
    if (error.code === "23505") {
      return err("CONFLICT_DETECTED", "A branch with this name, degree, and academic year already exists.", 409);
    }
    return err("DATA_INCOMPLETE", "Unable to create branch.", 500);
  }

  return { success: true, data: { id: data.id } };
}

export async function deleteBranch(collegeId: string, branchId: string): Promise<ServiceResult<{ id: string }>> {
  if (!isValidUUID(collegeId) || !isValidUUID(branchId)) {
    return err("VALIDATION_ERROR", "Invalid ID.", 400);
  }

  const auth = await requireAdmin(["admin"]);
  if (!auth.success) return auth;

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("college_branches").delete().eq("id", branchId).eq("college_id", collegeId);
  if (error) {
    return err("DATA_INCOMPLETE", "Unable to delete branch.", 500);
  }

  return { success: true, data: { id: branchId } };
}


export async function upsertFee(collegeId: string, input: FeeInput): Promise<ServiceResult<{ id: string }>> {
  if (!isValidUUID(collegeId)) return err("VALIDATION_ERROR", "Invalid college ID.", 400);

  const auth = await requireAdmin(["admin"]);
  if (!auth.success) return auth;

  const parsed = feeInputSchema.safeParse(input);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues.map((i) => i.message).join("; "), 400);
  }

  const supabase = createSupabaseServiceRoleClient();
  const payload = {
    college_id: collegeId,
    academic_year: parsed.data.academic_year,
    tuition_fee: parsed.data.tuition_fee ?? null,
    hostel_fee: parsed.data.hostel_fee ?? null,
    mess_fee: parsed.data.mess_fee ?? null,
    admission_fee: parsed.data.admission_fee ?? null,
    refundable_deposit: parsed.data.refundable_deposit ?? null,
    other_compulsory_fees: parsed.data.other_compulsory_fees ?? null,
    estimated_four_year_cost: parsed.data.estimated_four_year_cost ?? null,
    source_id: parsed.data.source_id,
    verification_status: "published" as const,
    is_published: true
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("fees").update(payload).eq("id", parsed.data.id).eq("college_id", collegeId);
    if (error) {
      return err("DATA_INCOMPLETE", "Unable to update fee record.", 500);
    }
    return { success: true, data: { id: parsed.data.id } };
  }

  const { data, error } = await supabase.from("fees").insert(payload).select("id").single();
  if (error) {
    if (error.code === "23505") {
      return err("CONFLICT_DETECTED", "A fee record for this academic year already exists.", 409);
    }
    return err("DATA_INCOMPLETE", "Unable to create fee record.", 500);
  }

  return { success: true, data: { id: data.id } };
}

export async function deleteFee(collegeId: string, feeId: string): Promise<ServiceResult<{ id: string }>> {
  if (!isValidUUID(collegeId) || !isValidUUID(feeId)) {
    return err("VALIDATION_ERROR", "Invalid ID.", 400);
  }

  const auth = await requireAdmin(["admin"]);
  if (!auth.success) return auth;

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("fees").delete().eq("id", feeId).eq("college_id", collegeId);
  if (error) {
    return err("DATA_INCOMPLETE", "Unable to delete fee record.", 500);
  }

  return { success: true, data: { id: feeId } };
}


export async function upsertPlacement(
  collegeId: string,
  input: PlacementInput
): Promise<ServiceResult<{ id: string }>> {
  if (!isValidUUID(collegeId)) return err("VALIDATION_ERROR", "Invalid college ID.", 400);

  const auth = await requireAdmin(["admin"]);
  if (!auth.success) return auth;

  const parsed = placementInputSchema.safeParse(input);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues.map((i) => i.message).join("; "), 400);
  }

  const supabase = createSupabaseServiceRoleClient();
  const payload = {
    college_id: collegeId,
    branch_id: parsed.data.branch_id ?? null,
    placement_year: parsed.data.placement_year,
    graduating_students: parsed.data.graduating_students ?? null,
    students_placed: parsed.data.students_placed ?? null,
    placement_percentage: parsed.data.placement_percentage ?? null,
    average_package: parsed.data.average_package ?? null,
    median_package: parsed.data.median_package ?? null,
    highest_package: parsed.data.highest_package ?? null,
    source_id: parsed.data.source_id,
    verification_status: "published" as const,
    is_published: true
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("placements").update(payload).eq("id", parsed.data.id).eq("college_id", collegeId);
    if (error) {
      return err("DATA_INCOMPLETE", "Unable to update placement record.", 500);
    }
    return { success: true, data: { id: parsed.data.id } };
  }

  const { data, error } = await supabase.from("placements").insert(payload).select("id").single();
  if (error) {
    if (error.code === "23505") {
      return err("CONFLICT_DETECTED", "A placement record for this branch and year already exists.", 409);
    }
    return err("DATA_INCOMPLETE", "Unable to create placement record.", 500);
  }

  return { success: true, data: { id: data.id } };
}

export async function deletePlacement(
  collegeId: string,
  placementId: string
): Promise<ServiceResult<{ id: string }>> {
  if (!isValidUUID(collegeId) || !isValidUUID(placementId)) {
    return err("VALIDATION_ERROR", "Invalid ID.", 400);
  }

  const auth = await requireAdmin(["admin"]);
  if (!auth.success) return auth;

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.from("placements").delete().eq("id", placementId).eq("college_id", collegeId);
  if (error) {
    return err("DATA_INCOMPLETE", "Unable to delete placement record.", 500);
  }

  return { success: true, data: { id: placementId } };
}


export async function upsertLocationMetrics(
  collegeId: string,
  input: LocationInput
): Promise<ServiceResult<{ college_id: string }>> {
  if (!isValidUUID(collegeId)) return err("VALIDATION_ERROR", "Invalid college ID.", 400);

  const auth = await requireAdmin(["admin"]);
  if (!auth.success) return auth;

  const parsed = locationInputSchema.safeParse(input);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.issues.map((i) => i.message).join("; "), 400);
  }

  const supabase = createSupabaseServiceRoleClient();
  const payload = {
    college_id: collegeId,
    nearest_railway_station: parsed.data.nearest_railway_station || null,
    railway_distance_km: parsed.data.railway_distance_km ?? null,
    nearest_airport: parsed.data.nearest_airport || null,
    airport_distance_km: parsed.data.airport_distance_km ?? null,
    nearest_major_hospital: parsed.data.nearest_major_hospital || null,
    hospital_distance_km: parsed.data.hospital_distance_km ?? null,
    public_transport_score: parsed.data.public_transport_score ?? null,
    city_centre_distance_km: parsed.data.city_centre_distance_km ?? null,
    technology_ecosystem_score: parsed.data.technology_ecosystem_score ?? null,
    cost_of_living_band: parsed.data.cost_of_living_band ?? null,
    source_id: parsed.data.source_id,
    verification_status: "published" as const
  };

  const { error } = await supabase.from("location_metrics").upsert(payload, { onConflict: "college_id" });
  if (error) {
    return err("DATA_INCOMPLETE", "Unable to save location metrics.", 500);
  }

  return { success: true, data: { college_id: collegeId } };
}


function err(code: string, message: string, status: number): ServiceResult<never> {
  return { success: false, code, message, status };
}
