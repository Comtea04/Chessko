# Supabase vector store setup (Phase 3 RAG)

One-time setup for the opening-principle store that `RagService` searches for LLM grounding
context. This is a separate Supabase project used purely as a pgvector index — not the
relational PostgreSQL database planned for user/payment data.

1. Create a Supabase project and run `supabase_setup.sql` in its SQL editor (enables `pgvector`,
   creates the `opening_principles` table, and the `match_opening_principles` RPC function).
2. Set these environment variables for the backend:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL` (e.g. `https://xxxxx.supabase.co`)
   - `SUPABASE_SERVICE_KEY` (service-role key, so inserts bypass RLS)
3. Run the app once with `CHESSKO_RAG_SEED_ON_STARTUP=true` to embed and load
   `opening_principles_seed.json` via `OpeningPrincipleSeeder`. Then unset it — the seeder has no
   duplicate check and will re-insert the same rows on every startup while enabled.
