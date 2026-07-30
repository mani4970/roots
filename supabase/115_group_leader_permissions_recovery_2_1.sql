-- 115_group_leader_permissions_recovery_2_1.sql
-- Roots 2.1 group leader permissions recovery
--
-- Apply this file only after 114_group_member_rejoin_cleanup_2_1.sql was
-- applied without first applying 113_group_leader_permissions_2_1.sql.
--
-- Purpose:
-- - Restore the group update, leadership transfer, and group delete RPCs that
--   the app's server route expects.
-- - Keep the simplified member-removal behavior from migration 114: removing
--   a member deletes only the membership and never blocks a later rejoin.
-- - Transfer a legacy group whose creator already left to its earliest
--   remaining member.
-- - Prevent a current group leader from leaving before transferring
--   leadership or deleting the group.
-- - Preserve already-earned group challenge badges after group deletion.
-- - Refresh the PostgREST schema cache after the missing RPCs are restored.
--
-- Safety:
-- - Does not recreate group_member_blocks or the allow-rejoin RPC.
-- - Does not delete any group or group membership while this migration runs.
-- - Does not modify Bible Reflection completion, streaks, progress, hearts,
--   personal prayer records, or personal Bible Reflection records.
-- - Server-only management RPCs are SECURITY INVOKER and executable only by
--   service_role. The app route authenticates the user before calling them.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- This recovery is intentionally for the post-114 state. Stop instead of
-- silently deleting unexpected rejoin-block data if the database no longer
-- matches that state.
do $$
begin
  if to_regclass('public.group_member_blocks') is not null then
    raise exception
      'Recovery stopped: group_member_blocks exists. Inspect migration state before continuing.';
  end if;

  if to_regprocedure(
    'public.allow_group_rejoin_as_leader(uuid,uuid,uuid)'
  ) is not null then
    raise exception
      'Recovery stopped: allow_group_rejoin_as_leader still exists. Inspect migration state before continuing.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Repair legacy group leadership
-- ---------------------------------------------------------------------------

-- Before the leader role existed, a group creator could leave while other
-- members remained. Assign the earliest remaining member as the new leader.
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

-- ---------------------------------------------------------------------------
-- Membership policies and safe group leaving
-- ---------------------------------------------------------------------------

-- Keep migration 114's self-service rejoin behavior, while removing legacy
-- duplicate policies left behind because migration 113 was skipped.
drop policy if exists "group_members_insert" on public.group_members;
drop policy if exists "멤버 추가" on public.group_members;
drop policy if exists "roots_group_members_insert_self_or_owner"
  on public.group_members;
drop policy if exists "roots_group_members_insert_self_unblocked"
  on public.group_members;
drop policy if exists "roots_group_members_insert_self"
  on public.group_members;

create policy "roots_group_members_insert_self"
on public.group_members
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

-- A leader must transfer leadership or delete the group instead of bypassing
-- that flow by deleting their own membership.
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

-- Membership deletion is centralized in leave_group() and in the server-only
-- member-removal RPC.
revoke delete on table public.group_members
  from public, anon, authenticated;
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
    raise exception
      'group leader must transfer leadership or delete the group';
  end if;

  delete from public.group_members gm
  where gm.group_id = p_group_id
    and gm.user_id = v_user_id;
end;
$$;

revoke all on function public.leave_group(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.leave_group(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Preserve earned group challenge badges after source deletion
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
    return jsonb_build_object(
      'awarded',
      false,
      'reason',
      'challenge_not_found'
    );
  end if;

  select name
    into v_group_name
  from public.groups
  where id = v_challenge.group_id;

  if current_date <= v_challenge.end_date then
    return jsonb_build_object(
      'awarded',
      false,
      'reason',
      'challenge_not_finished'
    );
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

revoke all on function public.claim_group_challenge_award(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_group_challenge_award(uuid)
  to authenticated, service_role;

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

-- Migration 114's simplified behavior is repeated here deliberately so this
-- recovery remains self-contained and never recreates a rejoin block.
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
declare
  v_deleted integer := 0;
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

  delete from public.group_members
  where group_id = p_group_id
    and user_id = p_target_user_id;

  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
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

-- ---------------------------------------------------------------------------
-- Migration assertions
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.group_member_blocks') is not null then
    raise exception 'group_member_blocks must remain absent';
  end if;

  if to_regprocedure(
    'public.allow_group_rejoin_as_leader(uuid,uuid,uuid)'
  ) is not null then
    raise exception 'allow_group_rejoin_as_leader must remain absent';
  end if;

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

  if not exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.conrelid =
      'public.group_challenge_awards'::regclass
      and constraint_row.conname =
        'group_challenge_awards_challenge_id_fkey'
      and constraint_row.confdeltype = 'n'
  ) then
    raise exception
      'group challenge award challenge_id must use ON DELETE SET NULL';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.conrelid =
      'public.group_challenge_awards'::regclass
      and constraint_row.conname = 'group_challenge_awards_group_id_fkey'
      and constraint_row.confdeltype = 'n'
  ) then
    raise exception
      'group challenge award group_id must use ON DELETE SET NULL';
  end if;

  if to_regprocedure(
    'public.update_group_as_leader(uuid,uuid,text,text,boolean)'
  ) is null
    or to_regprocedure(
      'public.remove_group_member_as_leader(uuid,uuid,uuid)'
    ) is null
    or to_regprocedure(
      'public.transfer_group_leadership_as_leader(uuid,uuid,uuid)'
    ) is null
    or to_regprocedure(
      'public.delete_group_as_leader(uuid,uuid)'
    ) is null
  then
    raise exception 'one or more group leader RPCs are missing';
  end if;

  if has_function_privilege(
    'anon',
    'public.update_group_as_leader(uuid,uuid,text,text,boolean)',
    'EXECUTE'
  )
    or has_function_privilege(
      'authenticated',
      'public.update_group_as_leader(uuid,uuid,text,text,boolean)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'service_role',
      'public.update_group_as_leader(uuid,uuid,text,text,boolean)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.remove_group_member_as_leader(uuid,uuid,uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'authenticated',
      'public.remove_group_member_as_leader(uuid,uuid,uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'service_role',
      'public.remove_group_member_as_leader(uuid,uuid,uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.transfer_group_leadership_as_leader(uuid,uuid,uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'authenticated',
      'public.transfer_group_leadership_as_leader(uuid,uuid,uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'service_role',
      'public.transfer_group_leadership_as_leader(uuid,uuid,uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.delete_group_as_leader(uuid,uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'authenticated',
      'public.delete_group_as_leader(uuid,uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'service_role',
      'public.delete_group_as_leader(uuid,uuid)',
      'EXECUTE'
    )
  then
    raise exception 'group leader RPC privileges are not service-role-only';
  end if;

  if exists (
    select 1
    from pg_proc procedure_row
    where procedure_row.oid in (
      'public.update_group_as_leader(uuid,uuid,text,text,boolean)'::regprocedure,
      'public.remove_group_member_as_leader(uuid,uuid,uuid)'::regprocedure,
      'public.transfer_group_leadership_as_leader(uuid,uuid,uuid)'::regprocedure,
      'public.delete_group_as_leader(uuid,uuid)'::regprocedure
    )
      and procedure_row.prosecdef
  ) then
    raise exception 'group leader RPCs must remain SECURITY INVOKER';
  end if;

  if exists (
    select 1
    from pg_policies policy_row
    where policy_row.schemaname = 'public'
      and policy_row.tablename = 'group_members'
      and policy_row.policyname in (
        'group_members_insert',
        '멤버 추가',
        'group_members_delete',
        '멤버 삭제',
        'roots_group_members_insert_self_or_owner',
        'roots_group_members_insert_self_unblocked',
        'roots_group_members_delete_self_or_owner'
      )
  ) then
    raise exception 'legacy group member policies remain';
  end if;

  if not exists (
    select 1
    from pg_policies policy_row
    where policy_row.schemaname = 'public'
      and policy_row.tablename = 'group_members'
      and policy_row.policyname = 'roots_group_members_insert_self'
  )
    or not exists (
      select 1
      from pg_policies policy_row
      where policy_row.schemaname = 'public'
        and policy_row.tablename = 'group_members'
        and policy_row.policyname =
          'roots_group_members_delete_self_non_leader'
    )
  then
    raise exception 'required group member policies are missing';
  end if;
end;
$$;

-- New functions and columns must be visible to PostgREST immediately after
-- this transaction commits.
notify pgrst, 'reload schema';

commit;
