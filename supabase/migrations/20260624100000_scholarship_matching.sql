-- Milestone 5: scholarship records and deterministic scholarship matching.
-- Apply after 20260624090000_fees_placements_roi.sql.

alter table public.scholarships
  add column if not exists description text,
  add column if not exists applicable_categories text[] not null default '{}',
  add column if not exists minimum_rank integer check (minimum_rank is null or minimum_rank > 0),
  add column if not exists is_published boolean not null default false;

update public.scholarships
set description = benefit_description
where description is null;

update public.scholarships
set applicable_categories = categories
where applicable_categories = '{}'::text[]
  and categories <> '{}'::text[];

create table if not exists public.college_scholarships (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  availability_notes text,
  source_id uuid not null references public.sources(id),
  verification_status public.verification_status not null default 'extracted',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, scholarship_id)
);

drop trigger if exists set_college_scholarships_updated_at on public.college_scholarships;
create trigger set_college_scholarships_updated_at before update on public.college_scholarships
for each row execute function public.set_updated_at();

create index if not exists scholarships_public_match_idx
on public.scholarships (
  is_published,
  verification_status,
  application_deadline,
  maximum_family_income,
  minimum_rank
);

create index if not exists scholarships_states_match_idx
on public.scholarships using gin(applicable_states);

create index if not exists scholarships_categories_match_idx
on public.scholarships using gin(applicable_categories);

create index if not exists college_scholarships_public_lookup_idx
on public.college_scholarships (
  college_id,
  scholarship_id,
  is_published,
  verification_status
);

alter table public.scholarships enable row level security;
alter table public.college_scholarships enable row level security;

drop policy if exists "published scholarships are publicly readable" on public.scholarships;
create policy "published scholarships are publicly readable"
on public.scholarships for select
using (
  (
    is_published = true
    and verification_status = 'published'
  )
  or public.is_researcher_or_admin()
);

drop policy if exists "published college scholarships are publicly readable" on public.college_scholarships;
create policy "published college scholarships are publicly readable"
on public.college_scholarships for select
using (
  (
    is_published = true
    and verification_status = 'published'
  )
  or public.is_researcher_or_admin()
);

drop policy if exists "admins can manage scholarships" on public.scholarships;
create policy "admins can manage scholarships"
on public.scholarships for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "admins can manage college scholarships" on public.college_scholarships;
create policy "admins can manage college scholarships"
on public.college_scholarships for all
using (public.has_role('admin'))
with check (public.has_role('admin'));
