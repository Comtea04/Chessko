-- Run this once against your Supabase project (SQL editor, or `supabase db execute`).
--
-- Sets up a pgvector-backed store of chess opening theory/principle text. RagService uses it
-- purely as a similarity-search index for LLM grounding context — it is a separate Supabase
-- project from the relational PostgreSQL database that later phases will use for user/payment
-- data.

create extension if not exists vector;

create table if not exists opening_principles (
    id bigint generated always as identity primary key,
    content text not null,
    embedding vector(1536) not null,
    source text,
    created_at timestamptz not null default now()
);

-- Approximate nearest-neighbour index. ivfflat's "lists" plan is only accurate once the table
-- has data and has been ANALYZEd, but the index is safe to create up front against an empty table.
create index if not exists opening_principles_embedding_idx
    on opening_principles using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

-- Exposed over PostgREST at POST {SUPABASE_URL}/rest/v1/rpc/match_opening_principles.
-- Called by VectorStoreClient with body {"query_embedding": [...], "match_count": N}.
create or replace function match_opening_principles(
    query_embedding vector(1536),
    match_count int default 3
)
returns table (content text, similarity float)
language sql stable
as $$
    select
        opening_principles.content,
        1 - (opening_principles.embedding <=> query_embedding) as similarity
    from opening_principles
    order by opening_principles.embedding <=> query_embedding
    limit match_count;
$$;
