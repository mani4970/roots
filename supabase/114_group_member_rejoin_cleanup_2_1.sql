-- 114_group_member_rejoin_cleanup_2_1.sql
-- Roots 2.1 group member removal simplification and empty-group cleanup
--
-- Purpose:
-- - Keep the group leader's ability to remove a current member.
-- - Let a removed member join the group again without leader approval.
-- - Remove the removed-member block table and allow-rejoin RPC.
-- - Delete the three legacy groups that currently have no members.
--
-- Safety:
-- - Requires exactly three empty groups. Any other count raises an exception
--   and rolls back this entire transaction without deleting a group.
-- - Does not modify personal Bible Reflection records, progress, streaks,
--   Word Walk progress, hearts, personal prayers, or earned badges.
-- - Relies on 113_group_leader_permissions_2_1.sql, which preserves earned
--   group challenge badges when their source group is deleted.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Joining is self-service again. Removed members are not treated differently
-- from other authenticated users.
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

-- Removing a member now deletes only the membership row. It does not create
-- any persistent block or prevent a later rejoin.
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

drop function if exists public.allow_group_rejoin_as_leader(
  uuid,
  uuid,
  uuid
);

drop table if exists public.group_member_blocks;

-- This is deliberately guarded by the known legacy count. If live data no
-- longer contains exactly three empty groups, the exception rolls back every
-- statement in this file so the operator can inspect the changed situation.
do $$
declare
  v_deleted_empty_groups integer := 0;
begin
  delete from public.groups g
  where not exists (
    select 1
    from public.group_members gm
    where gm.group_id = g.id
  );

  get diagnostics v_deleted_empty_groups = row_count;

  if v_deleted_empty_groups <> 3 then
    raise exception
      'Expected to delete exactly 3 empty groups, but found %. All changes were rolled back.',
      v_deleted_empty_groups;
  end if;
end;
$$;

-- Migration assertions.
do $$
begin
  if to_regclass('public.group_member_blocks') is not null then
    raise exception 'group_member_blocks cleanup failed';
  end if;

  if to_regprocedure(
    'public.allow_group_rejoin_as_leader(uuid,uuid,uuid)'
  ) is not null then
    raise exception 'allow_group_rejoin_as_leader cleanup failed';
  end if;

  if exists (
    select 1
    from public.groups g
    where not exists (
      select 1
      from public.group_members gm
      where gm.group_id = g.id
    )
  ) then
    raise exception 'empty group cleanup failed';
  end if;
end;
$$;

commit;
