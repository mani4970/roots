-- Reports and per-user hidden community content for QT/prayer shares.
-- Run this in Supabase SQL Editor before deploying the matching app patch.

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('qt', 'prayer')),
  content_id uuid not null,
  reported_user_id uuid references auth.users(id) on delete set null,
  reason text not null default 'inappropriate',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists content_reports_reporter_idx on public.content_reports(reporter_id, created_at desc);
create index if not exists content_reports_status_idx on public.content_reports(status, created_at desc);

alter table public.content_reports enable row level security;

drop policy if exists "Users can create their own reports" on public.content_reports;
create policy "Users can create their own reports"
  on public.content_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can read their own reports" on public.content_reports;
create policy "Users can read their own reports"
  on public.content_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

create table if not exists public.hidden_community_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('qt', 'prayer')),
  content_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

create index if not exists hidden_community_items_user_idx on public.hidden_community_items(user_id, created_at desc);

alter table public.hidden_community_items enable row level security;

drop policy if exists "Users can manage their hidden community items" on public.hidden_community_items;
create policy "Users can manage their hidden community items"
  on public.hidden_community_items
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
