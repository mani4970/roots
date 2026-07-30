-- 113_group_leader_permissions_2_1.sql
-- Roots 2.1 group leader permissions
--
-- Purpose:
-- - Treat groups.created_by as the single group leader.
-- - Transfer legacy groups whose creator already left to the earliest
--   remaining member.
-- - Prevent a group leader from leaving before transferring leadership or
--   deleting the group.
-- - Allow leaders to edit group information, remove members, allow rejoining,
--   transfer leadership, and delete the group through server-only RPCs.
-- - Preserve already-earned group challenge badges when a group is deleted.
--
-- Safety:
-- - Does not modify Bible Reflection completion, streak, progress, hearts,
--   personal prayer records, or personal Bible Reflection records.
-- - New management RPCs are SECURITY INVOKER and executable only by
--   service_role. The app route authenticates the user before calling them.
-- - The removed-member table has explicit grants and RLS.

begin;

-- ---------------------------------------------------------------------------
-- Removed members / rejoin blocking
-- ---------------------------------------------------------------------------

create table if not exists public.group_member_blocks (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  removed_by uuid references auth.users(id) on delete set null,
  removed_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

comment on table public.group_member_blocks is
  'Members removed by a group leader. A row blocks that user from rejoining until the current leader removes it.';

create index if not exists group_member_blocks_user_idx
  on public.group_member_blocks (user_id, removed_at desc);

create index if not exists group_member_blocks_removed_by_idx
  on public.group_member_blocks (removed_by)
  where removed_by is not null;

alter table public.group_member_blocks enable row level security;

drop policy if exists "roots_group_member_blocks_select_own_or_leader"
  on public.group_member_blocks;
create policy "roots_group_member_blocks_select_own_or_leader"
on public.group_member_blocks
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.groups g
    where g.id = group_member_blocks.group_id
      and g.created_by = (select auth.uid())
  )
);

revoke all privileges on table public.group_member_blocks from public;
revoke all privileges on table public.group_member_blocks from anon;
revoke all privileges on table public.group_member_blocks from authenticated;
revoke all privileges on table public.group_member_blocks from service_role;

grant select on table public.group_member_blocks to authenticated;
grant select, insert, update, delete
  on table public.group_member_blocks
  to service_role;

-- Existing Roots groups already store their creator in groups.created_by.
-- Before the leader role existed, creators were allowed to leave. If members
-- remain, transfer leadership to the earliest remaining member instead of
-- forcing the former creator back into the group. Empty groups are preserved
-- unchanged and handled separately by the operator.
with successor as (
  select distinct on (g.id)
    g.id as group_id,
    gm.user_id as successor_user_id
  from public.groups g
  join public.group_members gm
    on gm.group_id = g.id
  where not exists (
      select 1
      from public.group_members creator_membership
      where creator_membership.group_id = g.id
        and creator_membership.user_id = g.created_by
    )
  order by
    g.id,
    gm.joined_at asc nulls last,
    gm.id asc
)
update public.groups g
set created_by = successor.successor_user_id
from successor
where g.id = successor.group_id;

-- A removed user may not bypass the app and insert their membership directly.
drop policy if exists "group_members_insert" on public.group_members;
drop policy if exists "멤버 추가" on public.group_members;
drop policy if exists "roots_group_members_insert_self_or_owner"
  on public.group_members;
drop policy if exists "roots_group_members_insert_self_unblocked"
  on public.group_members;

create policy "roots_group_members_insert_self_unblocked"
on public.group_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and not exists (
    select 1
    from public.group_member_blocks blocked
    where blocked.group_id = group_members.group_id
      and blocked.user_id = (select auth.uid())
  )
);

-- A leader cannot bypass leave_group() by deleting their membership directly.
drop policy if exists "group_members_delete" on public.group_members;
drop policy if exists "멤버 삭제" on public.group_members;
drop policy if exists "roots_group_members_delete_self_or_owner"
  on public.group_members;
drop policy if exists "roots_group_members_delete_self_non_leader"
  on public.group_members;

create policy "roots_group_members_delete_self_non_leader"
on public.group_members
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and not exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and g.created_by = (select auth.uid())
  )
);

-- Membership deletion is centralized in leave_group() so leadership transfer
-- and leaving cannot race each other.
revoke delete on table public.group_members from public, anon, authenticated;
grant delete on table public.group_members to service_role;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  perform 1
  from public.groups g
  where g.id = p_group_id
  for update;

  if not found then
    return;
  end if;

  if exists (
    select 1
    from public.groups g
    where g.id = p_group_id
      and g.created_by = v_user_id
  ) then
    raise exception 'group leader must transfer leadership or delete the group';
  end if;

  delete from public.group_members gm
  where gm.group_id = p_group_id
    and gm.user_id = v_user_id;
end;
$$;

revoke all on function public.leave_group(uuid) from public;
revoke all on function public.leave_group(uuid) from anon;
revoke all on function public.leave_group(uuid) from authenticated;
revoke all on function public.leave_group(uuid) from service_role;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.leave_group(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Preserve already-earned group challenge badges on group deletion
-- ---------------------------------------------------------------------------

alter table public.group_challenge_awards
  add column if not exists challenge_title text;

alter table public.group_challenge_awards
  add column if not exists group_name text;

update public.group_challenge_awards award
set
  challenge_title = coalesce(
    award.challenge_title,
    challenge.title,
    award.badge_name,
    ''
  ),
  group_name = coalesce(award.group_name, group_row.name, '')
from public.group_challenges challenge
left join public.groups group_row
  on group_row.id = challenge.group_id
where award.challenge_id = challenge.id
  and (
    award.challenge_title is null
    or award.group_name is null
  );

update public.group_challenge_awards
set
  challenge_title = coalesce(challenge_title, badge_name, ''),
  group_name = coalesce(group_name, '')
where challenge_title is null
   or group_name is null;

alter table public.group_challenge_awards
  alter column challenge_title set not null;

alter table public.group_challenge_awards
  alter column group_name set not null;

alter table public.group_challenge_awards
  alter column challenge_id drop not null;

alter table public.group_challenge_awards
  alter column group_id drop not null;

alter table public.group_challenge_awards
  drop constraint if exists group_challenge_awards_challenge_id_fkey;

alter table public.group_challenge_awards
  add constraint group_challenge_awards_challenge_id_fkey
  foreign key (challenge_id)
  references public.group_challenges(id)
  on delete set null;

alter table public.group_challenge_awards
  drop constraint if exists group_challenge_awards_group_id_fkey;

alter table public.group_challenge_awards
  add constraint group_challenge_awards_group_id_fkey
  foreign key (group_id)
  references public.groups(id)
  on delete set null;

comment on column public.group_challenge_awards.challenge_title is
  'Challenge title snapshot retained after the source challenge or group is deleted.';

comment on column public.group_challenge_awards.group_name is
  'Group name snapshot retained after the source group is deleted.';

create or replace function public.claim_group_challenge_award(
  p_challenge_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
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
    return jsonb_build_object(
      'awarded',
      false,
      'reason',
      'not_in_participant_snapshot'
    );
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
      'challenge_title', coalesce(
        nullif(v_existing.challenge_title, ''),
        v_challenge.title
      ),
      'group_name', coalesce(
        nullif(v_existing.group_name, ''),
        v_group_name,
        ''
      ),
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
    badge_image_path,
    challenge_title,
    group_name
  ) values (
    v_challenge.id,
    v_challenge.group_id,
    v_user_id,
    coalesce(nullif(v_challenge.badge_name, ''), v_challenge.title),
    v_challenge.badge_description,
    v_challenge.badge_image_path,
    v_challenge.title,
    coalesce(v_group_name, '')
  )
  returning * into v_award;

  return jsonb_build_object(
    'awarded', true,
    'already_awarded', false,
    'award_id', v_award.id,
    'challenge_id', v_challenge.id,
    'challenge_title', v_award.challenge_title,
    'group_name', v_award.group_name,
    'badge_name', v_award.badge_name,
    'badge_image_path', v_award.badge_image_path
  );
end;
$$;

revoke all on function public.claim_group_challenge_award(uuid) from public;
revoke all on function public.claim_group_challenge_award(uuid) from anon;
revoke all on function public.claim_group_challenge_award(uuid)
  from authenticated;
revoke all on function public.claim_group_challenge_award(uuid)
  from service_role;
grant execute on function public.claim_group_challenge_award(uuid)
  to authenticated;
grant execute on function public.claim_group_challenge_award(uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- Server-only group leader operations
-- ---------------------------------------------------------------------------

create or replace function public.update_group_as_leader(
  p_group_id uuid,
  p_actor_id uuid,
  p_name text,
  p_description text,
  p_is_public boolean
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_updated integer := 0;
begin
  if p_actor_id is null
    or char_length(v_name) < 1
    or char_length(v_name) > 80
    or char_length(coalesce(v_description, '')) > 500
    or p_is_public is null
  then
    return false;
  end if;

  update public.groups
  set
    name = v_name,
    description = v_description,
    is_public = p_is_public
  where id = p_group_id
    and created_by = p_actor_id;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.remove_group_member_as_leader(
  p_group_id uuid,
  p_actor_id uuid,
  p_target_user_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_actor_id is null
    or p_target_user_id is null
    or p_actor_id = p_target_user_id
  then
    return false;
  end if;

  perform 1
  from public.groups
  where id = p_group_id
    and created_by = p_actor_id
  for update;

  if not found then
    return false;
  end if;

  perform 1
  from public.group_members
  where group_id = p_group_id
    and user_id = p_target_user_id
  for update;

  if not found then
    return false;
  end if;

  insert into public.group_member_blocks (
    group_id,
    user_id,
    removed_by,
    removed_at
  ) values (
    p_group_id,
    p_target_user_id,
    p_actor_id,
    now()
  )
  on conflict (group_id, user_id)
  do update set
    removed_by = excluded.removed_by,
    removed_at = excluded.removed_at;

  delete from public.group_members
  where group_id = p_group_id
    and user_id = p_target_user_id;

  return true;
end;
$$;

create or replace function public.allow_group_rejoin_as_leader(
  p_group_id uuid,
  p_actor_id uuid,
  p_target_user_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_actor_id is null or p_target_user_id is null then
    return false;
  end if;

  perform 1
  from public.groups
  where id = p_group_id
    and created_by = p_actor_id
  for update;

  if not found then
    return false;
  end if;

  delete from public.group_member_blocks
  where group_id = p_group_id
    and user_id = p_target_user_id;

  return true;
end;
$$;

create or replace function public.transfer_group_leadership_as_leader(
  p_group_id uuid,
  p_actor_id uuid,
  p_target_user_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated integer := 0;
begin
  if p_actor_id is null
    or p_target_user_id is null
    or p_actor_id = p_target_user_id
  then
    return false;
  end if;

  perform 1
  from public.groups
  where id = p_group_id
    and created_by = p_actor_id
  for update;

  if not found then
    return false;
  end if;

  perform 1
  from public.group_members
  where group_id = p_group_id
    and user_id = p_target_user_id
  for update;

  if not found then
    return false;
  end if;

  update public.groups
  set created_by = p_target_user_id
  where id = p_group_id
    and created_by = p_actor_id;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.delete_group_as_leader(
  p_group_id uuid,
  p_actor_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted integer := 0;
begin
  if p_actor_id is null then
    return false;
  end if;

  delete from public.groups
  where id = p_group_id
    and created_by = p_actor_id;

  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

revoke all on function public.update_group_as_leader(
  uuid,
  uuid,
  text,
  text,
  boolean
) from public, anon, authenticated, service_role;
grant execute on function public.update_group_as_leader(
  uuid,
  uuid,
  text,
  text,
  boolean
) to service_role;

revoke all on function public.remove_group_member_as_leader(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;
grant execute on function public.remove_group_member_as_leader(
  uuid,
  uuid,
  uuid
) to service_role;

revoke all on function public.allow_group_rejoin_as_leader(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;
grant execute on function public.allow_group_rejoin_as_leader(
  uuid,
  uuid,
  uuid
) to service_role;

revoke all on function public.transfer_group_leadership_as_leader(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;
grant execute on function public.transfer_group_leadership_as_leader(
  uuid,
  uuid,
  uuid
) to service_role;

revoke all on function public.delete_group_as_leader(
  uuid,
  uuid
) from public, anon, authenticated, service_role;
grant execute on function public.delete_group_as_leader(
  uuid,
  uuid
) to service_role;

-- Migration assertions.
do $$
begin
  if exists (
    select 1
    from public.groups g
    where exists (
      select 1
      from public.group_members any_member
      where any_member.group_id = g.id
    )
      and (
        g.created_by is null
        or not exists (
          select 1
          from public.group_members leader_membership
          where leader_membership.group_id = g.id
            and leader_membership.user_id = g.created_by
        )
      )
  ) then
    raise exception 'group leadership successor assignment failed';
  end if;

  if exists (
    select 1
    from public.group_challenge_awards award
    where award.challenge_title is null
       or award.group_name is null
  ) then
    raise exception 'group challenge badge snapshot backfill failed';
  end if;
end;
$$;

commit;
