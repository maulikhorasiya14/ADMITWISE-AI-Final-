-- AdmitWise AI initial Supabase schema.
-- Apply this migration before any seed file.

create extension if not exists pgcrypto;

create type public.verification_status as enum (
  'extracted',
  'needs_review',
  'approved',
  'published',
  'rejected',
  'archived'
);

create type public.source_type as enum (
  'government',
  'counselling_authority',
  'official_college',
  'verified_student',
  'public_unverified',
  'inference'
);

create type public.confidence_level as enum ('A', 'B', 'C', 'D', 'E');
create type public.user_role as enum ('student', 'researcher', 'admin');
create type public.college_ownership as enum ('GOVERNMENT', 'PRIVATE', 'DEEMED', 'OTHER');
create type public.student_category as enum ('GENERAL', 'EWS', 'OBC_NCL', 'SC', 'ST', 'OTHER');
create type public.student_gender as enum ('FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY');
create type public.college_type_preference as enum ('GOVERNMENT', 'PRIVATE', 'BOTH');
create type public.career_goal as enum ('SOFTWARE', 'CORE', 'HIGHER_STUDIES', 'STARTUP', 'UNDECIDED');
create type public.currency_code as enum ('INR');
create type public.hiring_type as enum ('FULL_TIME', 'INTERNSHIP', 'PPO', 'UNKNOWN');
create type public.campus_status as enum ('ON_CAMPUS', 'OFF_CAMPUS', 'UNKNOWN');
create type public.cost_of_living_band as enum ('LOW', 'MEDIUM', 'HIGH');
create type public.hostel_status as enum ('HOSTELLER', 'DAY_SCHOLAR');
create type public.review_moderation_status as enum ('PENDING', 'APPROVED', 'REJECTED');

create table public.user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type public.source_type not null,
  source_url text,
  source_document_path text,
  academic_year text,
  collected_at timestamptz not null default now(),
  last_verified_at timestamptz,
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  verified_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_url_or_document check (source_url is not null or source_document_path is not null)
);

create table public.colleges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  ownership public.college_ownership not null,
  institute_type text,
  affiliated_university text,
  established_year integer check (established_year is null or established_year between 1800 and 2100),
  official_website text,
  admission_website text,
  placement_website text,
  address text,
  city text not null,
  state text not null,
  pincode text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.college_branches (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  name text not null,
  degree text not null,
  duration_years integer not null check (duration_years > 0),
  intake integer check (intake is null or intake >= 0),
  nba_accredited boolean,
  source_id uuid not null references public.sources(id),
  academic_year text,
  collected_at timestamptz not null default now(),
  last_verified_at timestamptz,
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, name, degree, academic_year)
);

create table public.cutoff_records (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  branch_id uuid not null references public.college_branches(id) on delete cascade,
  exam text not null,
  year integer not null check (year between 2000 and 2100),
  round text not null,
  category text not null,
  quota text not null,
  gender_pool text,
  opening_rank integer check (opening_rank is null or opening_rank > 0),
  closing_rank integer not null check (closing_rank > 0),
  source_id uuid not null references public.sources(id),
  academic_year text,
  collected_at timestamptz not null default now(),
  last_verified_at timestamptz,
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cutoff_rank_order check (opening_rank is null or opening_rank <= closing_rank),
  unique (branch_id, exam, year, round, category, quota, gender_pool)
);

create table public.fee_records (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  academic_year text not null,
  annual_tuition numeric(12, 2),
  total_tuition numeric(12, 2),
  annual_hostel numeric(12, 2),
  annual_mess numeric(12, 2),
  admission_fee numeric(12, 2),
  refundable_deposit numeric(12, 2),
  exam_fee numeric(12, 2),
  other_compulsory_fees numeric(12, 2),
  estimated_four_year_cost numeric(12, 2),
  currency public.currency_code not null default 'INR',
  source_id uuid not null references public.sources(id),
  collected_at timestamptz not null default now(),
  last_verified_at timestamptz,
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.placement_records (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  branch_id uuid references public.college_branches(id) on delete set null,
  placement_year text not null,
  graduating_students integer check (graduating_students is null or graduating_students >= 0),
  eligible_students integer check (eligible_students is null or eligible_students >= 0),
  students_placed integer check (students_placed is null or students_placed >= 0),
  placement_percentage numeric(5, 2) check (placement_percentage is null or placement_percentage between 0 and 100),
  average_package_lpa numeric(8, 2) check (average_package_lpa is null or average_package_lpa >= 0),
  median_package_lpa numeric(8, 2) check (median_package_lpa is null or median_package_lpa >= 0),
  highest_package_lpa numeric(8, 2) check (highest_package_lpa is null or highest_package_lpa >= 0),
  internship_ppo_notes text,
  source_id uuid not null references public.sources(id),
  academic_year text,
  collected_at timestamptz not null default now(),
  last_verified_at timestamptz,
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recruiter_records (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  company_name text not null,
  year text not null,
  role text,
  eligible_branches text[] not null default '{}',
  hiring_type public.hiring_type not null default 'UNKNOWN',
  campus_status public.campus_status not null default 'UNKNOWN',
  source_id uuid not null references public.sources(id),
  academic_year text,
  collected_at timestamptz not null default now(),
  last_verified_at timestamptz,
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scholarships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  applicable_college_ids uuid[] not null default '{}',
  applicable_states text[] not null default '{}',
  categories text[] not null default '{}',
  gender_requirement text,
  maximum_family_income numeric(12, 2),
  minimum_marks numeric(5, 2),
  exam_requirements text[] not null default '{}',
  benefit_description text not null,
  benefit_amount numeric(12, 2),
  required_documents text[] not null default '{}',
  renewal_conditions text[] not null default '{}',
  application_deadline date,
  official_url text,
  source_id uuid not null references public.sources(id),
  academic_year text,
  collected_at timestamptz not null default now(),
  last_verified_at timestamptz,
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.location_metrics (
  college_id uuid primary key references public.colleges(id) on delete cascade,
  nearest_railway_station text,
  railway_distance_km numeric(7, 2),
  nearest_airport text,
  airport_distance_km numeric(7, 2),
  nearest_major_hospital text,
  hospital_distance_km numeric(7, 2),
  public_transport_score integer check (public_transport_score is null or public_transport_score between 0 and 100),
  city_centre_distance_km numeric(7, 2),
  technology_ecosystem_score integer check (technology_ecosystem_score is null or technology_ecosystem_score between 0 and 100),
  cost_of_living_band public.cost_of_living_band,
  source_id uuid not null references public.sources(id),
  academic_year text,
  collected_at timestamptz not null default now(),
  last_verified_at timestamptz,
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  exam text not null,
  exam_year integer not null check (exam_year between 2000 and 2100),
  rank integer check (rank is null or rank > 0),
  percentile numeric(6, 3) check (percentile is null or percentile between 0 and 100),
  category public.student_category not null,
  gender public.student_gender not null,
  home_state text not null,
  home_city text,
  preferred_branches text[] not null default '{}',
  preferred_states text[] not null default '{}',
  college_type_preference public.college_type_preference not null,
  maximum_annual_budget numeric(12, 2),
  family_income_band text,
  hostel_required boolean,
  career_goal public.career_goal,
  weights jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_rank_or_percentile check (rank is not null or percentile is not null),
  constraint preference_weights_total check (
    coalesce((weights ->> 'admissionChance')::integer, 0) +
    coalesce((weights ->> 'branchFit')::integer, 0) +
    coalesce((weights ->> 'placement')::integer, 0) +
    coalesce((weights ->> 'affordability')::integer, 0) +
    coalesce((weights ->> 'scholarship')::integer, 0) +
    coalesce((weights ->> 'location')::integer, 0) +
    coalesce((weights ->> 'culture')::integer, 0) = 100
  )
);

create table public.student_reviews (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  branch text,
  graduation_year integer check (graduation_year is null or graduation_year between 1950 and 2100),
  hostel_status public.hostel_status,
  verified_student boolean not null default false,
  senior_support integer check (senior_support is null or senior_support between 1 and 5),
  academic_strictness integer check (academic_strictness is null or academic_strictness between 1 and 5),
  faculty_accessibility integer check (faculty_accessibility is null or faculty_accessibility between 1 and 5),
  hostel_quality integer check (hostel_quality is null or hostel_quality between 1 and 5),
  mess_quality integer check (mess_quality is null or mess_quality between 1 and 5),
  club_activity integer check (club_activity is null or club_activity between 1 and 5),
  coding_culture integer check (coding_culture is null or coding_culture between 1 and 5),
  placement_support integer check (placement_support is null or placement_support between 1 and 5),
  evening_travel_comfort integer check (evening_travel_comfort is null or evening_travel_comfort between 1 and 5),
  overall_satisfaction integer check (overall_satisfaction is null or overall_satisfaction between 1 and 5),
  would_choose_again boolean,
  free_text text,
  moderation_status public.review_moderation_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create schema if not exists staging;

create table staging.source_imports (
  id uuid primary key default gen_random_uuid(),
  source_url text,
  source_file_path text,
  source_type public.source_type not null,
  academic_year text not null,
  status public.verification_status not null default 'extracted',
  raw_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_import_url_or_file check (source_url is not null or source_file_path is not null)
);

create table staging.extracted_cutoff_records (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references staging.source_imports(id) on delete cascade,
  college_name text not null,
  branch_name text not null,
  exam text not null,
  year integer not null check (year between 2000 and 2100),
  round text not null,
  category text not null,
  quota text not null,
  gender_pool text,
  opening_rank integer check (opening_rank is null or opening_rank > 0),
  closing_rank integer not null check (closing_rank > 0),
  anomaly_flags text[] not null default '{}',
  status public.verification_status not null default 'needs_review',
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staging_cutoff_rank_order check (opening_rank is null or opening_rank <= closing_rank)
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.has_role(required_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = required_role
  );
$$;

create function public.is_researcher_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('researcher') or public.has_role('admin');
$$;

create trigger set_sources_updated_at before update on public.sources
for each row execute function public.set_updated_at();
create trigger set_colleges_updated_at before update on public.colleges
for each row execute function public.set_updated_at();
create trigger set_college_branches_updated_at before update on public.college_branches
for each row execute function public.set_updated_at();
create trigger set_cutoff_records_updated_at before update on public.cutoff_records
for each row execute function public.set_updated_at();
create trigger set_fee_records_updated_at before update on public.fee_records
for each row execute function public.set_updated_at();
create trigger set_placement_records_updated_at before update on public.placement_records
for each row execute function public.set_updated_at();
create trigger set_recruiter_records_updated_at before update on public.recruiter_records
for each row execute function public.set_updated_at();
create trigger set_scholarships_updated_at before update on public.scholarships
for each row execute function public.set_updated_at();
create trigger set_location_metrics_updated_at before update on public.location_metrics
for each row execute function public.set_updated_at();
create trigger set_student_profiles_updated_at before update on public.student_profiles
for each row execute function public.set_updated_at();
create trigger set_student_reviews_updated_at before update on public.student_reviews
for each row execute function public.set_updated_at();
create trigger set_staging_source_imports_updated_at before update on staging.source_imports
for each row execute function public.set_updated_at();
create trigger set_staging_extracted_cutoff_records_updated_at before update on staging.extracted_cutoff_records
for each row execute function public.set_updated_at();

create index colleges_slug_idx on public.colleges(slug);
create index colleges_published_idx on public.colleges(is_published);
create index cutoff_lookup_idx on public.cutoff_records(exam, year, category, quota, gender_pool, closing_rank);
create index cutoff_status_year_idx on public.cutoff_records(verification_status, academic_year);
create index branches_status_year_idx on public.college_branches(verification_status, academic_year);
create index fees_status_year_idx on public.fee_records(verification_status, academic_year);
create index placements_status_year_idx on public.placement_records(verification_status, placement_year);
create index scholarships_eligibility_idx on public.scholarships using gin(categories);
create index scholarships_states_idx on public.scholarships using gin(applicable_states);
create index scholarships_status_year_idx on public.scholarships(verification_status, academic_year);
create index sources_status_year_idx on public.sources(verification_status, academic_year);
create index staging_import_status_idx on staging.source_imports(status, academic_year);
create index staging_cutoff_status_idx on staging.extracted_cutoff_records(status, year);

alter table public.user_roles enable row level security;
alter table public.sources enable row level security;
alter table public.colleges enable row level security;
alter table public.college_branches enable row level security;
alter table public.cutoff_records enable row level security;
alter table public.fee_records enable row level security;
alter table public.placement_records enable row level security;
alter table public.recruiter_records enable row level security;
alter table public.scholarships enable row level security;
alter table public.location_metrics enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_reviews enable row level security;
alter table staging.source_imports enable row level security;
alter table staging.extracted_cutoff_records enable row level security;

create policy "published colleges are publicly readable"
on public.colleges for select
using (is_published = true or public.is_researcher_or_admin());

create policy "published sources are publicly readable"
on public.sources for select
using (verification_status = 'published' or public.is_researcher_or_admin());

create policy "published branches are publicly readable"
on public.college_branches for select
using (verification_status = 'published' or public.is_researcher_or_admin());

create policy "published cutoffs are publicly readable"
on public.cutoff_records for select
using (verification_status = 'published' or public.is_researcher_or_admin());

create policy "published fees are publicly readable"
on public.fee_records for select
using (verification_status = 'published' or public.is_researcher_or_admin());

create policy "published placements are publicly readable"
on public.placement_records for select
using (verification_status = 'published' or public.is_researcher_or_admin());

create policy "published recruiters are publicly readable"
on public.recruiter_records for select
using (verification_status = 'published' or public.is_researcher_or_admin());

create policy "published scholarships are publicly readable"
on public.scholarships for select
using (verification_status = 'published' or public.is_researcher_or_admin());

create policy "published location metrics are publicly readable"
on public.location_metrics for select
using (verification_status = 'published' or public.is_researcher_or_admin());

create policy "approved reviews are publicly readable"
on public.student_reviews for select
using (moderation_status = 'APPROVED' or user_id = auth.uid() or public.is_researcher_or_admin());

create policy "students can read own profiles"
on public.student_profiles for select
using (user_id = auth.uid());

create policy "students can insert own profiles"
on public.student_profiles for insert
with check (user_id = auth.uid() or user_id is null);

create policy "students can update own profiles"
on public.student_profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "students can insert own reviews"
on public.student_reviews for insert
with check (user_id = auth.uid() or user_id is null);

create policy "researchers can read staging imports"
on staging.source_imports for select
using (public.is_researcher_or_admin());

create policy "researchers can write staging imports"
on staging.source_imports for insert
with check (public.is_researcher_or_admin());

create policy "researchers can update staging imports"
on staging.source_imports for update
using (public.is_researcher_or_admin())
with check (public.is_researcher_or_admin());

create policy "researchers can read staging cutoffs"
on staging.extracted_cutoff_records for select
using (public.is_researcher_or_admin());

create policy "researchers can write staging cutoffs"
on staging.extracted_cutoff_records for insert
with check (public.is_researcher_or_admin());

create policy "researchers can update staging cutoffs"
on staging.extracted_cutoff_records for update
using (public.is_researcher_or_admin())
with check (public.is_researcher_or_admin());

create policy "admins can manage roles"
on public.user_roles for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "admins can manage colleges"
on public.colleges for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "admins can manage sources"
on public.sources for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "admins can manage factual branch data"
on public.college_branches for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "admins can manage factual cutoff data"
on public.cutoff_records for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "admins can manage factual fee data"
on public.fee_records for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "admins can manage factual placement data"
on public.placement_records for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "admins can manage factual recruiter data"
on public.recruiter_records for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "admins can manage factual scholarship data"
on public.scholarships for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "admins can manage factual location data"
on public.location_metrics for all
using (public.has_role('admin'))
with check (public.has_role('admin'));
