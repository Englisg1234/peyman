-- Peyman Consulting: inquiry storage.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
--
-- Security model:
--   * RLS is enabled. The anon/publishable role may INSERT only; it can
--     never SELECT, UPDATE or DELETE, so a leaked key cannot read inquiries.
--   * Inquiries are read in the Supabase dashboard (or by a service role in
--     a trusted backend). The website never uses a service-role key.
--   * CHECK constraints mirror lib/inquiry.ts limits as a second line of defence.

create table if not exists public.inquiries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 2 and 120),
  company      text not null check (char_length(company) between 1 and 160),
  email        text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  interest     text not null check (interest in (
                 'capital-structuring', 'legal-transactional', 'government-grants',
                 'fundraising-readiness', 'partnership', 'general')),
  message      text not null check (char_length(message) between 10 and 4000),
  source_path  text not null default '/contact' check (char_length(source_path) <= 200),
  status       text not null default 'new' check (status in ('new', 'in_review', 'responded', 'archived'))
);

create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);

alter table public.inquiries enable row level security;

-- Insert-only access for the public (anon) role. `status` and `created_at`
-- must stay at their defaults, so a client cannot pre-mark an inquiry.
drop policy if exists "anon can submit inquiries" on public.inquiries;
create policy "anon can submit inquiries"
  on public.inquiries
  for insert
  to anon
  with check (status = 'new');

-- Explicitly revoke everything else from anon / authenticated.
-- Column-level INSERT only (id, created_at and status always use defaults).
revoke all on public.inquiries from anon, authenticated;
grant insert (name, company, email, interest, message, source_path) on public.inquiries to anon;
