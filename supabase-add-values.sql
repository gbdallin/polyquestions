-- Run in Supabase SQL editor to add values columns to sessions (for Values tab).
-- Run after supabase-schema.sql.

alter table public.sessions
  add column if not exists values_a jsonb,
  add column if not exists values_b jsonb,
  add column if not exists values_relationships jsonb;
