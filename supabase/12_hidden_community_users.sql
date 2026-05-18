-- Per-user hidden community authors for QT/prayer shares.
-- Run this after 10_reports_hidden_content.sql.

create table if not exists public.hidden_community_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hidden_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, hidden_user_id),
  check (user_id <> hidden_user_id)
);

create index if not exists hidden_community_users_user_idx
  on public.hidden_community_users(user_id, created_at desc);

-- Explicit grants for Supabase Data API access.
-- Upsert needs insert/update; RLS below restricts rows to the owner.
grant select, insert, update, delete on public.hidden_community_users to authenticated;
grant select, insert, update, delete on public.hidden_community_users to service_role;

alter table public.hidden_community_users enable row level security;

drop policy if exists "Users can manage their hidden community users" on public.hidden_community_users;
create policy "Users can manage their hidden community users"
  on public.hidden_community_users
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
