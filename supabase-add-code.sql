-- Run this in Supabase SQL Editor to add the 6-character session code.
-- Existing sessions will have code = null; new sessions will get a code.

alter table public.sessions
  add column if not exists code text unique;

-- Optional: add an index so lookups by code are fast
create index if not exists sessions_code_idx on public.sessions (code) where code is not null;
