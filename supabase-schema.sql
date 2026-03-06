-- Run this in the Supabase SQL editor (Dashboard → SQL Editor) to create
-- the table for shared sessions. Anyone with the link can read/update that session.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  partner_names jsonb default '{}',
  answers_a jsonb default '{}',
  answers_b jsonb,
  contract jsonb default '{}',
  agreement_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists sessions_code_idx on public.sessions (code) where code is not null;

-- Allow anonymous (browser) access. The session id in the URL acts as the secret.
alter table public.sessions enable row level security;

create policy "Allow read and write for all"
  on public.sessions
  for all
  using (true)
  with check (true);
