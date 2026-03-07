-- Optional: run in Supabase SQL Editor to store questionnaire version per session.
-- Lets you support multiple questionnaire versions and migrate old sessions later.
-- See FUTURE-PROOFING.md.
--
-- If you skip this migration, the app will still try to save questionnaire_version
-- on new sessions; remove that field from the insert() calls in cloud.js to avoid errors.

alter table public.sessions
  add column if not exists questionnaire_version integer default 1;
