-- Qualitative data pipeline tables
-- Apply after 20260625100000_report_snapshots.sql

-- 1. Extend staging category enum
alter type staging.ingestion_data_category add value if not exists 'clubs';
alter type staging.ingestion_data_category add value if not exists 'campus_reality';
alter type staging.ingestion_data_category add value if not exists 'facilities';
alter type staging.ingestion_data_category add value if not exists 'location_details';
alter type staging.ingestion_data_category add value if not exists 'student_experience_sources';

-- 2. Create tables

create table if not exists public.college_clubs (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  club_name text not null,
  club_category text,
  official_status text,
  description text,
  official_page text,
  latest_activity text,
  latest_activity_date text,
  major_achievements text,
  recruitment_process text,
  activity_status text,
  source_id uuid references public.sources(id),
  last_verified_date date,
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, club_name)
);

create table if not exists public.campus_reality (
  college_id uuid primary key references public.colleges(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  source_ids text[] not null default '{}',
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.college_facilities (
  college_id uuid primary key references public.colleges(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  source_id uuid references public.sources(id),
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.college_location_details (
  college_id uuid primary key references public.colleges(id) on delete cascade,
  campus_name text,
  official_address text,
  locality text,
  district text,
  nearest_metro text,
  nearest_bus_terminal text,
  railway_travel_time_minutes numeric(7,2),
  airport_travel_time_minutes numeric(7,2),
  technology_ecosystem text,
  cost_of_living_description text,
  data_origin text,
  source_id uuid references public.sources(id),
  verification_status public.verification_status not null default 'extracted',
  confidence_level public.confidence_level not null default 'E',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_experience_sources (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  local_source_id text not null,
  platform text,
  source_title text,
  url text,
  publication_date text,
  source_identity_type text,
  college_branch_if_known text,
  graduation_year_if_known text,
  hosteller_or_day_scholar text,
  topics_covered text,
  positive_themes text,
  negative_themes text,
  visual_evidence boolean default false,
  possible_bias text,
  confidence_level public.confidence_level not null default 'E',
  notes text,
  verification_status public.verification_status not null default 'extracted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, local_source_id)
);

-- 3. Triggers

drop trigger if exists set_college_clubs_updated_at on public.college_clubs;
create trigger set_college_clubs_updated_at before update on public.college_clubs
for each row execute function public.set_updated_at();

drop trigger if exists set_campus_reality_updated_at on public.campus_reality;
create trigger set_campus_reality_updated_at before update on public.campus_reality
for each row execute function public.set_updated_at();

drop trigger if exists set_college_facilities_updated_at on public.college_facilities;
create trigger set_college_facilities_updated_at before update on public.college_facilities
for each row execute function public.set_updated_at();

drop trigger if exists set_college_location_details_updated_at on public.college_location_details;
create trigger set_college_location_details_updated_at before update on public.college_location_details
for each row execute function public.set_updated_at();

drop trigger if exists set_student_experience_sources_updated_at on public.student_experience_sources;
create trigger set_student_experience_sources_updated_at before update on public.student_experience_sources
for each row execute function public.set_updated_at();

-- 4. Indexes

create index if not exists college_clubs_college_idx on public.college_clubs (college_id, verification_status);
create index if not exists campus_reality_college_idx on public.campus_reality (college_id, verification_status);
create index if not exists college_facilities_college_idx on public.college_facilities (college_id, verification_status);
create index if not exists college_location_details_college_idx on public.college_location_details (college_id, verification_status);
create index if not exists student_experience_sources_college_idx on public.student_experience_sources (college_id, verification_status);

-- 5. RLS Policies

alter table public.college_clubs enable row level security;
alter table public.campus_reality enable row level security;
alter table public.college_facilities enable row level security;
alter table public.college_location_details enable row level security;
alter table public.student_experience_sources enable row level security;

-- read: everyone can read published
create policy "everyone can read published college clubs"
on public.college_clubs for select
using (verification_status = 'published');

create policy "everyone can read published campus reality"
on public.campus_reality for select
using (verification_status = 'published');

create policy "everyone can read published college facilities"
on public.college_facilities for select
using (verification_status = 'published');

create policy "everyone can read published college location details"
on public.college_location_details for select
using (verification_status = 'published');

create policy "everyone can read published student experience sources"
on public.student_experience_sources for select
using (verification_status = 'published');

-- all: service role / admin
create policy "admin can do all on college clubs"
on public.college_clubs for all
using (public.is_researcher_or_admin())
with check (public.is_researcher_or_admin());

create policy "admin can do all on campus reality"
on public.campus_reality for all
using (public.is_researcher_or_admin())
with check (public.is_researcher_or_admin());

create policy "admin can do all on college facilities"
on public.college_facilities for all
using (public.is_researcher_or_admin())
with check (public.is_researcher_or_admin());

create policy "admin can do all on college location details"
on public.college_location_details for all
using (public.is_researcher_or_admin())
with check (public.is_researcher_or_admin());

create policy "admin can do all on student experience sources"
on public.student_experience_sources for all
using (public.is_researcher_or_admin())
with check (public.is_researcher_or_admin());
