create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  status text not null default 'generated' check (status in ('generated', 'archived')),
  report_version integer not null default 1 check (report_version > 0),
  report_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_user_created_idx
on public.reports (user_id, created_at desc);

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at before update on public.reports
for each row execute function public.set_updated_at();

alter table public.reports enable row level security;

drop policy if exists "students can read own reports" on public.reports;
create policy "students can read own reports"
on public.reports for select
using (user_id = auth.uid());

drop policy if exists "students can insert own reports" on public.reports;
create policy "students can insert own reports"
on public.reports for insert
with check (user_id = auth.uid());

drop policy if exists "students can update own reports" on public.reports;
create policy "students can update own reports"
on public.reports for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
