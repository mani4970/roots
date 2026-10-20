-- 164_community_group_member_counts_2_2.sql
-- Return group-card counts without downloading every visible membership row.
-- Existing group/member grants and RLS policies remain authoritative and unchanged.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if to_regclass('public.group_members') is null
    or not coalesce((
      select relation.relrowsecurity
      from pg_class as relation
      where relation.oid = to_regclass('public.group_members')
    ), false)
  then
    raise exception 'Safety stop: group_members with RLS enabled is required';
  end if;
end;
$$;

create or replace function public.get_community_group_member_counts(p_group_ids uuid[])
returns table (group_id uuid, member_count bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if coalesce(cardinality(p_group_ids), 0) > 200 then
    raise exception 'At most 200 groups may be counted' using errcode = '22023';
  end if;

  if (select auth.uid()) is null then
    return;
  end if;

  return query
    with requested as (
      select distinct requested_id
      from unnest(p_group_ids) as requested_group(requested_id)
      where requested_id is not null
    )
    select membership.group_id, count(*)
    from public.group_members as membership
    join requested on requested.requested_id = membership.group_id
    group by membership.group_id;
end;
$$;

revoke all on function public.get_community_group_member_counts(uuid[])
  from public, anon, authenticated;
grant execute on function public.get_community_group_member_counts(uuid[])
  to authenticated, service_role;

do $$
begin
  if has_function_privilege('anon', 'public.get_community_group_member_counts(uuid[])', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.get_community_group_member_counts(uuid[])', 'EXECUTE')
    or (select routine.prosecdef from pg_proc as routine
      where routine.oid = 'public.get_community_group_member_counts(uuid[])'::regprocedure)
  then
    raise exception 'Postcheck failed: group member counts must preserve caller RLS';
  end if;
end;
$$;

commit;

-- Expected one row with all three booleans true.
select
  not (select prosecdef from pg_proc
    where oid = 'public.get_community_group_member_counts(uuid[])'::regprocedure) as caller_rls_preserved,
  not has_function_privilege('anon', 'public.get_community_group_member_counts(uuid[])', 'EXECUTE') as anonymous_count_blocked,
  has_function_privilege('authenticated', 'public.get_community_group_member_counts(uuid[])', 'EXECUTE') as authenticated_count_available;
