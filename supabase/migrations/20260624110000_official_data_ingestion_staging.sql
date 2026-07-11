-- Milestone 6: reusable official-data ingestion staging.
-- Apply after 20260624100000_scholarship_matching.sql.

create schema if not exists staging;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'extraction_job_status') then
    create type staging.extraction_job_status as enum ('queued', 'processing', 'completed', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'staged_record_status') then
    create type staging.staged_record_status as enum ('needs_review', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'ingestion_data_category') then
    create type staging.ingestion_data_category as enum (
      'college_identity',
      'branches',
      'cutoffs',
      'fees',
      'placements',
      'scholarships',
      'recruiters'
    );
  end if;
end
$$;

create table if not exists staging.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  source_url text,
  local_file_path text,
  source_type text not null,
  data_category staging.ingestion_data_category not null,
  academic_year text,
  college_identifier text,
  status staging.extraction_job_status not null default 'queued',
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extraction_jobs_source_present check (source_url is not null or local_file_path is not null)
);

create table if not exists staging.source_files (
  id uuid primary key default gen_random_uuid(),
  extraction_job_id uuid not null references staging.extraction_jobs(id) on delete cascade,
  source_url text,
  local_file_path text,
  content_type text,
  file_name text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  checksum_sha256 text,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists staging.staged_records (
  id uuid primary key default gen_random_uuid(),
  extraction_job_id uuid not null references staging.extraction_jobs(id) on delete cascade,
  source_file_id uuid references staging.source_files(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  college_id uuid references public.colleges(id) on delete set null,
  data_category staging.ingestion_data_category not null,
  academic_year text,
  raw_extracted_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  validation_errors text[] not null default '{}',
  confidence_level public.confidence_level not null default 'E',
  status staging.staged_record_status not null default 'needs_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staging.data_conflicts (
  id uuid primary key default gen_random_uuid(),
  extraction_job_id uuid references staging.extraction_jobs(id) on delete cascade,
  staged_record_id uuid references staging.staged_records(id) on delete cascade,
  conflict_key text not null,
  field_name text not null,
  existing_value jsonb,
  incoming_value jsonb,
  severity text not null default 'warning',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

drop trigger if exists set_extraction_jobs_updated_at on staging.extraction_jobs;
create trigger set_extraction_jobs_updated_at before update on staging.extraction_jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_staged_records_updated_at on staging.staged_records;
create trigger set_staged_records_updated_at before update on staging.staged_records
for each row execute function public.set_updated_at();

create index if not exists extraction_jobs_status_idx
on staging.extraction_jobs (status, data_category, academic_year);

create index if not exists source_files_job_idx
on staging.source_files (extraction_job_id);

create index if not exists staged_records_review_idx
on staging.staged_records (status, data_category, academic_year, confidence_level);

create index if not exists staged_records_college_idx
on staging.staged_records (college_id, data_category, academic_year);

create index if not exists data_conflicts_open_idx
on staging.data_conflicts (status, conflict_key, field_name);

alter table staging.extraction_jobs enable row level security;
alter table staging.source_files enable row level security;
alter table staging.staged_records enable row level security;
alter table staging.data_conflicts enable row level security;

drop policy if exists "researchers can read extraction jobs" on staging.extraction_jobs;
create policy "researchers can read extraction jobs"
on staging.extraction_jobs for select
using (public.is_researcher_or_admin());

drop policy if exists "researchers can write extraction jobs" on staging.extraction_jobs;
create policy "researchers can write extraction jobs"
on staging.extraction_jobs for insert
with check (public.is_researcher_or_admin());

drop policy if exists "researchers can update extraction jobs" on staging.extraction_jobs;
create policy "researchers can update extraction jobs"
on staging.extraction_jobs for update
using (public.is_researcher_or_admin())
with check (public.is_researcher_or_admin());

drop policy if exists "researchers can read source files" on staging.source_files;
create policy "researchers can read source files"
on staging.source_files for select
using (public.is_researcher_or_admin());

drop policy if exists "researchers can write source files" on staging.source_files;
create policy "researchers can write source files"
on staging.source_files for insert
with check (public.is_researcher_or_admin());

drop policy if exists "researchers can read staged records" on staging.staged_records;
create policy "researchers can read staged records"
on staging.staged_records for select
using (public.is_researcher_or_admin());

drop policy if exists "researchers can write staged records" on staging.staged_records;
create policy "researchers can write staged records"
on staging.staged_records for insert
with check (public.is_researcher_or_admin());

drop policy if exists "researchers can update staged records" on staging.staged_records;
create policy "researchers can update staged records"
on staging.staged_records for update
using (public.is_researcher_or_admin())
with check (public.is_researcher_or_admin());

drop policy if exists "researchers can read data conflicts" on staging.data_conflicts;
create policy "researchers can read data conflicts"
on staging.data_conflicts for select
using (public.is_researcher_or_admin());

drop policy if exists "researchers can write data conflicts" on staging.data_conflicts;
create policy "researchers can write data conflicts"
on staging.data_conflicts for insert
with check (public.is_researcher_or_admin());
