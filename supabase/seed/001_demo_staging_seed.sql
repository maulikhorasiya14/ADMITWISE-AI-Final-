-- AdmitWise AI draft-only demo seed.
-- This file inserts exactly one non-published demo college record.

insert into public.colleges (
  id,
  slug,
  name,
  short_name,
  ownership,
  city,
  state,
  is_published
)
values (
  '00000000-0000-4000-8000-000000000101',
  'admitwise-draft-demo-college',
  'AdmitWise Draft Demo College',
  'Draft Demo College',
  'OTHER',
  'Demo City',
  'Demo State',
  false
)
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  ownership = excluded.ownership,
  city = excluded.city,
  state = excluded.state,
  is_published = false;
