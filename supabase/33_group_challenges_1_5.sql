-- Roots 1.5 approved group challenges
-- Purpose: store operator-approved group challenges so they can be shown in group detail.
-- This file does NOT calculate challenge progress or award badges yet.
-- It does NOT change progress/streak logic, Bible Reflection completion logic,
-- community feed visibility, sharing recipients, reward maps, or existing badge logic.

begin;

create table if not exists public.group_challenges (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.group_challenge_requests(id) on delete set null,
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  start_date date not null,
  end_date date not null,
  badge_name text,
  badge_description text,
  badge_image_path text,
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'completed', 'cancelled')),
  operator_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_challenges_date_order check (end_date >= start_date)
);

comment on table public.group_challenges is
  'Operator-approved group Bible Reflection challenges. Progress and badge awarding are separate later steps.';
comment on column public.group_challenges.request_id is
  'Optional link to the original group_challenge_requests row.';
comment on column public.group_challenges.badge_image_path is
  'Future badge asset path. Users do not upload badge images in the MVP.';

create index if not exists group_challenges_group_dates_idx
  on public.group_challenges (group_id, start_date, end_date);

create index if not exists group_challenges_status_dates_idx
  on public.group_challenges (status, start_date, end_date);

alter table public.group_challenges enable row level security;

-- Group members can see approved/scheduled/active/completed challenges for their group.
-- Cancelled challenges stay hidden from regular users.
drop policy if exists "roots_group_challenges_select_group_members" on public.group_challenges;
create policy "roots_group_challenges_select_group_members"
on public.group_challenges
for select
to authenticated
using (
  status in ('scheduled', 'active', 'completed')
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_challenges.group_id
      and gm.user_id = (select auth.uid())
  )
);

-- App users do not create/edit approved challenges directly in the MVP.
-- Operator workflows can use service_role or a future admin tool.

grant select on table public.group_challenges to authenticated;
grant select, insert, update, delete on table public.group_challenges to service_role;

commit;
