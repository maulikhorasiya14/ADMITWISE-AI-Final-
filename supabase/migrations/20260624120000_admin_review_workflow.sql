-- Milestone 7: admin review, approval and controlled publishing workflow.
-- Apply after 20260624110000_official_data_ingestion_staging.sql.

alter type staging.staged_record_status add value if not exists 'published';

alter table staging.staged_records
  add column if not exists reviewer_id uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists publisher_id uuid references auth.users(id) on delete set null,
  add column if not exists published_at timestamptz,
  add column if not exists published_record_table text,
  add column if not exists published_record_id uuid;

create table if not exists staging.review_audit_logs (
  id uuid primary key default gen_random_uuid(),
  staged_record_id uuid not null references staging.staged_records(id) on delete cascade,
  action text not null check (action in ('approve', 'reject', 'publish')),
  previous_status text not null,
  new_status text not null,
  acting_user uuid references auth.users(id) on delete set null,
  reason_or_notes text,
  created_at timestamptz not null default now()
);

create index if not exists staged_records_publish_queue_idx
on staging.staged_records (status, data_category, confidence_level, published_at);

create index if not exists review_audit_logs_record_idx
on staging.review_audit_logs (staged_record_id, created_at desc);

alter table staging.review_audit_logs enable row level security;

drop policy if exists "researchers can read review audit logs" on staging.review_audit_logs;
create policy "researchers can read review audit logs"
on staging.review_audit_logs for select
using (public.is_researcher_or_admin());

drop policy if exists "researchers can write review audit logs" on staging.review_audit_logs;
create policy "researchers can write review audit logs"
on staging.review_audit_logs for insert
with check (public.is_researcher_or_admin());
