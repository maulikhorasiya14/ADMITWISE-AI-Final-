-- Milestone 3: cutoff recommendation structure.
-- Apply after 20260616090000_initial_schema.sql.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'publication_status') then
    create type public.publication_status as enum ('draft', 'published', 'archived');
  end if;
end
$$;

alter table public.cutoff_records
  add column if not exists admission_year integer,
  add column if not exists counselling_system text,
  add column if not exists publication_status public.publication_status not null default 'draft';

update public.cutoff_records
set admission_year = year
where admission_year is null;

update public.cutoff_records
set counselling_system = exam
where counselling_system is null;

alter table public.cutoff_records
  alter column admission_year set not null,
  alter column counselling_system set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cutoff_admission_year_range'
  ) then
    alter table public.cutoff_records
      add constraint cutoff_admission_year_range check (admission_year between 2000 and 2100);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cutoff_counselling_system_present'
  ) then
    alter table public.cutoff_records
      add constraint cutoff_counselling_system_present check (length(trim(counselling_system)) > 0);
  end if;
end
$$;

create index if not exists cutoff_public_recommendation_idx
on public.cutoff_records (
  publication_status,
  verification_status,
  exam,
  admission_year,
  category,
  quota,
  gender_pool,
  closing_rank
);

drop policy if exists "published cutoffs are publicly readable" on public.cutoff_records;

create policy "published cutoffs are publicly readable"
on public.cutoff_records for select
using (
  (
    verification_status = 'published'
    and publication_status = 'published'
  )
  or public.is_researcher_or_admin()
);
