-- Run in Supabase SQL editor to support 3–5 partners (max 5).
-- Run after supabase-schema.sql and supabase-add-values.sql.

alter table public.sessions
  add column if not exists partner_count smallint default 2,
  add column if not exists answers_c jsonb,
  add column if not exists answers_d jsonb,
  add column if not exists answers_e jsonb,
  add column if not exists values_c jsonb,
  add column if not exists values_d jsonb,
  add column if not exists values_e jsonb;
