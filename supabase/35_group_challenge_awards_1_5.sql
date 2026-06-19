-- Roots 1.5 group challenge participants and awards
-- Purpose:
-- - Store the group-member snapshot for operator-approved group challenges.
-- - Allow eligible members to claim a completed challenge badge once.
--
-- Important safety notes:
-- - This does NOT change progress/streak logic.
-- - This does NOT change Bible Reflection completion or sharing logic.
-- - This reads qt_records only to judge challenge completion.
-- - It does not modify qt_records, profiles.streak_days, profiles.total_days, or last_checkin.

begin;

create table if not exists public.group_challenge_participants (
  challenge_id uuid not null references public.group_challenges(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

comment on table public.group_challenge_participants is
  'Snapshot of members who are automatically included in an operator-approved group challenge.';

create index if not exists group_challenge_participants_user_idx
  on public.group_challenge_participants (user_id, challenge_id);

create index if not exists group_challenge_participants_group_idx
  on public.group_challenge_participants (group_id, challenge_id);

alter table public.group_challenge_participants enable row level security;

drop policy if exists "roots_group_challenge_participants_select_own" on public.group_challenge_participants;
create policy "roots_group_challenge_participants_select_own"
on public.group_challenge_participants
for select
to authenticated
using (user_id = (select auth.uid()));

-- Regular app users do not insert participant snapshots directly.
grant select on table public.group_challenge_participants to authenticated;
grant select, insert, update, delete on table public.group_challenge_participants to service_role;

create table if not exists public.group_challenge_awards (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.group_challenges(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_name text not null,
  badge_description text,
  badge_image_path text,
  awarded_at timestamptz not null default now(),
  seen_at timestamptz,
  unique (challenge_id, user_id)
);

comment on table public.group_challenge_awards is
  'Group challenge badges awarded to members who completed every day of a challenge.';
comment on column public.group_challenge_awards.badge_image_path is
  'Operator-managed badge image path or URL. Users do not upload badge images in the MVP.';

create index if not exists group_challenge_awards_user_awarded_idx
  on public.group_challenge_awards (user_id, awarded_at desc);

create index if not exists group_challenge_awards_group_idx
  on public.group_challenge_awards (group_id, challenge_id);

alter table public.group_challenge_awards enable row level security;

drop policy if exists "roots_group_challenge_awards_select_own" on public.group_challenge_awards;
create policy "roots_group_challenge_awards_select_own"
on public.group_challenge_awards
for select
to authenticated
using (user_id = (select auth.uid()));

-- Awards are claimed through the SECURITY DEFINER function below.
grant select on table public.group_challenge_awards to authenticated;
grant select, insert, update, delete on table public.group_challenge_awards to service_role;

create or replace function public.claim_group_challenge_award(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_challenge public.group_challenges%rowtype;
  v_group_name text;
  v_total_days integer;
  v_done_days integer;
  v_existing public.group_challenge_awards%rowtype;
  v_award public.group_challenge_awards%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object('awarded', false, 'reason', 'not_authenticated');
  end if;

  select *
    into v_challenge
  from public.group_challenges
  where id = p_challenge_id
    and status <> 'cancelled';

  if not found then
    return jsonb_build_object('awarded', false, 'reason', 'challenge_not_found');
  end if;

  select name
    into v_group_name
  from public.groups
  where id = v_challenge.group_id;

  if current_date <= v_challenge.end_date then
    return jsonb_build_object('awarded', false, 'reason', 'challenge_not_finished');
  end if;

  if not exists (
    select 1
    from public.group_challenge_participants gcp
    where gcp.challenge_id = v_challenge.id
      and gcp.user_id = v_user_id
  ) then
    return jsonb_build_object('awarded', false, 'reason', 'not_in_participant_snapshot');
  end if;

  select *
    into v_existing
  from public.group_challenge_awards
  where challenge_id = v_challenge.id
    and user_id = v_user_id;

  if found then
    return jsonb_build_object(
      'awarded', true,
      'already_awarded', true,
      'award_id', v_existing.id,
      'challenge_id', v_challenge.id,
      'challenge_title', v_challenge.title,
      'group_name', coalesce(v_group_name, ''),
      'badge_name', v_existing.badge_name,
      'badge_image_path', v_existing.badge_image_path
    );
  end if;

  v_total_days := (v_challenge.end_date - v_challenge.start_date + 1);

  select count(distinct qr.date)::integer
    into v_done_days
  from public.qt_records qr
  where qr.user_id = v_user_id
    and qr.is_draft = false
    and qr.date between v_challenge.start_date and v_challenge.end_date;

  if v_done_days < v_total_days then
    return jsonb_build_object(
      'awarded', false,
      'reason', 'not_completed',
      'done_days', coalesce(v_done_days, 0),
      'total_days', v_total_days
    );
  end if;

  insert into public.group_challenge_awards (
    challenge_id,
    group_id,
    user_id,
    badge_name,
    badge_description,
    badge_image_path
  ) values (
    v_challenge.id,
    v_challenge.group_id,
    v_user_id,
    coalesce(nullif(v_challenge.badge_name, ''), v_challenge.title),
    v_challenge.badge_description,
    v_challenge.badge_image_path
  )
  returning * into v_award;

  return jsonb_build_object(
    'awarded', true,
    'already_awarded', false,
    'award_id', v_award.id,
    'challenge_id', v_challenge.id,
    'challenge_title', v_challenge.title,
    'group_name', coalesce(v_group_name, ''),
    'badge_name', v_award.badge_name,
    'badge_image_path', v_award.badge_image_path
  );
end;
$$;

revoke all on function public.claim_group_challenge_award(uuid) from public;
grant execute on function public.claim_group_challenge_award(uuid) to authenticated;

commit;
