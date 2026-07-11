-- Agentic RAG hybrid search: pgvector + full-text search over qualitative content.
-- Supersedes ADR-006 (see docs/DECISIONS.md ADR-009).
-- Apply after 20260709000000_qualitative_data_tables.sql

create extension if not exists vector;

create table public.content_embeddings (
  id uuid primary key default gen_random_uuid(),
  college_id uuid references public.colleges(id) on delete cascade,
  content_type text not null,
  source_table text not null,
  source_row_id uuid not null,
  text_content text not null,
  embedding vector(768),
  fts tsvector generated always as (to_tsvector('english', text_content)) stored,
  verification_status public.verification_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_table, source_row_id)
);

create index content_embeddings_embedding_idx on public.content_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 10);
create index content_embeddings_fts_idx on public.content_embeddings using gin (fts);
create index content_embeddings_college_idx on public.content_embeddings (college_id, verification_status);

drop trigger if exists set_content_embeddings_updated_at on public.content_embeddings;
create trigger set_content_embeddings_updated_at before update on public.content_embeddings
for each row execute function public.set_updated_at();

alter table public.content_embeddings enable row level security;

create policy "everyone can read published content embeddings"
on public.content_embeddings for select
using (verification_status = 'published');

create policy "admin can do all on content embeddings"
on public.content_embeddings for all
using (public.is_researcher_or_admin())
with check (public.is_researcher_or_admin());

-- Hybrid ranking RPC: weighted combination of vector cosine similarity and
-- Postgres full-text rank. SECURITY INVOKER (Postgres default for SQL
-- functions) so the RLS policies above apply using the caller's role.
create or replace function public.match_documents(
  query_embedding vector(768),
  query_text text,
  match_college_ids uuid[] default null,
  match_count int default 8
)
returns table (
  id uuid,
  college_id uuid,
  content_type text,
  source_table text,
  source_row_id uuid,
  text_content text,
  similarity float,
  rank float
)
language sql
stable
set search_path = public, extensions
as $$
  select
    ce.id,
    ce.college_id,
    ce.content_type,
    ce.source_table,
    ce.source_row_id,
    ce.text_content,
    1 - (ce.embedding <=> query_embedding) as similarity,
    ts_rank(ce.fts, plainto_tsquery('english', query_text)) as rank
  from public.content_embeddings ce
  where ce.verification_status = 'published'
    and (match_college_ids is null or ce.college_id = any(match_college_ids))
  order by
    (0.7 * (1 - (ce.embedding <=> query_embedding))
     + 0.3 * ts_rank(ce.fts, plainto_tsquery('english', query_text))) desc
  limit match_count;
$$;
