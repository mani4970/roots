-- Roots 1.5 group challenge request intake
-- Purpose: allow any signed-in group member to request a group Bible Reflection challenge.
-- This file only creates the request intake table and policies.
-- It does NOT change progress/streak logic, Bible Reflection completion logic,
-- community feed visibility, sharing recipients, or existing badge logic.

begin;

create table if not exists public.group_challenge_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requester_email text not null check (char_length(requester_email) between 3 and 320),
  title text not null check (char_length(title) between 1 and 120),
  requested_start_date date not null,
  duration_days integer not null check (duration_days between 1 and 120),
  description text,
  badge_idea text,
  extra_questions text,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'approved', 'rejected', 'cancelled')),
  operator_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.group_challenge_requests is
  'Group challenge request intake. Users submit ideas; Roots operator confirms schedule and badge design by email.';
comment on column public.group_challenge_requests.requester_email is
  'Email address supplied by the requester for operator follow-up.';
comment on column public.group_challenge_requests.badge_idea is
  'Requester-provided badge idea. Badge images are not uploaded by users in the MVP.';

create index if not exists group_challenge_requests_group_created_idx
  on public.group_challenge_requests (group_id, created_at desc);

create index if not exists group_challenge_requests_requester_created_idx
  on public.group_challenge_requests (requester_id, created_at desc);

alter table public.group_challenge_requests enable row level security;

-- Keep personal email/contact details private. The requester can read their own requests.
drop policy if exists "roots_group_challenge_requests_select_own" on public.group_challenge_requests;
create policy "roots_group_challenge_requests_select_own"
on public.group_challenge_requests
for select
to authenticated
using (requester_id = (select auth.uid()));

-- Any member of the group can request a challenge for that group.
drop policy if exists "roots_group_challenge_requests_insert_group_member" on public.group_challenge_requests;
create policy "roots_group_challenge_requests_insert_group_member"
on public.group_challenge_requests
for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_challenge_requests.group_id
      and gm.user_id = (select auth.uid())
  )
);

-- Users should not edit requests after submission in the MVP.
-- Operator/admin workflows can use service_role or a later admin tool.

grant select, insert on table public.group_challenge_requests to authenticated;
grant select, insert, update, delete on table public.group_challenge_requests to service_role;

commit;
