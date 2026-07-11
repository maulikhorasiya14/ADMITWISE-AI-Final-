-- Milestone 4: published fee and placement records for comparison and ROI.
-- Apply after 20260617093000_cutoff_recommendations.sql.

create table if not exists public.fees (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  academic_year text not null,
  tuition_fee numeric(12, 2) check (tuition_fee is null or tuition_fee >= 0),
  hostel_fee numeric(12, 2) check (hostel_fee is null or hostel_fee >= 0),
  mess_fee numeric(12, 2) check (mess_fee is null or mess_fee >= 0),
  admission_fee numeric(12, 2) check (admission_fee is null or admission_fee >= 0),
  refundable_deposit numeric(12, 2) check (refundable_deposit is null or refundable_deposit >= 0),
  other_compulsory_fees numeric(12, 2) check (other_compulsory_fees is null or other_compulsory_fees >= 0),
  estimated_four_year_cost numeric(12, 2) check (estimated_four_year_cost is null or estimated_four_year_cost >= 0),
  source_id uuid not null references public.sources(id),
  verification_status public.verification_status not null default 'extracted',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, academic_year)
);

create table if not exists public.placements (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  branch_id uuid references public.college_branches(id) on delete set null,
  placement_year text not null,
  graduating_students integer check (graduating_students is null or graduating_students >= 0),
  students_placed integer check (students_placed is null or students_placed >= 0),
  placement_percentage numeric(5, 2) check (placement_percentage is null or placement_percentage between 0 and 100),
  average_package numeric(8, 2) check (average_package is null or average_package >= 0),
  median_package numeric(8, 2) check (median_package is null or median_package >= 0),
  highest_package numeric(8, 2) check (highest_package is null or highest_package >= 0),
  source_id uuid not null references public.sources(id),
  verification_status public.verification_status not null default 'extracted',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, branch_id, placement_year)
);

drop trigger if exists set_fees_updated_at on public.fees;
create trigger set_fees_updated_at before update on public.fees
for each row execute function public.set_updated_at();

drop trigger if exists set_placements_updated_at on public.placements;
create trigger set_placements_updated_at before update on public.placements
for each row execute function public.set_updated_at();

create index if not exists fees_public_lookup_idx
on public.fees (college_id, is_published, verification_status, academic_year);

create index if not exists placements_public_lookup_idx
on public.placements (college_id, branch_id, is_published, verification_status, placement_year);

alter table public.fees enable row level security;
alter table public.placements enable row level security;

drop policy if exists "published fees are publicly readable" on public.fees;
create policy "published fees are publicly readable"
on public.fees for select
using (
  (
    is_published = true
    and verification_status = 'published'
  )
  or public.is_researcher_or_admin()
);

drop policy if exists "published placements are publicly readable" on public.placements;
create policy "published placements are publicly readable"
on public.placements for select
using (
  (
    is_published = true
    and verification_status = 'published'
  )
  or public.is_researcher_or_admin()
);

drop policy if exists "admins can manage fees" on public.fees;
create policy "admins can manage fees"
on public.fees for all
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "admins can manage placements" on public.placements;
create policy "admins can manage placements"
on public.placements for all
using (public.has_role('admin'))
with check (public.has_role('admin'));
