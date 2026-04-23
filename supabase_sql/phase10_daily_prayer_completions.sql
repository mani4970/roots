-- Create a dedicated table for daily prayer completion.
-- Purpose:
-- 1) Track "I prayed quietly" for a given local date
-- 2) Track that a written prayer request also counts as prayer completion for that date
-- Do NOT store this in daily_checkins, which is reserved for the mood/verse flow.

create extension if not exists pgcrypto;

create table if not exists public.daily_prayer_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  source text not null default 'quiet' check (source in ('quiet','written')),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_prayer_completions enable row level security;

drop policy if exists "Users can view their own daily prayer completions" on public.daily_prayer_completions;
create policy "Users can view their own daily prayer completions"
  on public.daily_prayer_completions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own daily prayer completions" on public.daily_prayer_completions;
create policy "Users can insert their own daily prayer completions"
  on public.daily_prayer_completions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own daily prayer completions" on public.daily_prayer_completions;
create policy "Users can update their own daily prayer completions"
  on public.daily_prayer_completions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own daily prayer completions" on public.daily_prayer_completions;
create policy "Users can delete their own daily prayer completions"
  on public.daily_prayer_completions
  for delete
  using (auth.uid() = user_id);
