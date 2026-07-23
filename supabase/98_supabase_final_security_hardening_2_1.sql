-- Christian Roots 2.1 Supabase final security hardening
--
-- Purpose:
--   1) Remove admin-only table privileges that normal signed-in clients do not
--      need on the five remaining core tables.
--   2) Prevent public/anonymous and cross-user calls to is_group_member(...)
--      while preserving its authenticated RLS-helper behavior.
--
-- This migration does NOT change:
--   - SELECT / INSERT / UPDATE / DELETE grants
--   - table rows or user data
--   - RLS policies
--   - Bible Reflection completion, progress, streak, reward, or date logic
--   - group, prayer, or sharing behavior for the signed-in caller

begin;

-- Stop instead of applying a partial cleanup if the expected core tables are
-- missing from the target project.
do $$
declare
  v_missing_tables text;
begin
  select string_agg(target.table_name, ', ' order by target.table_name)
  into v_missing_tables
  from (
    values
      ('daily_checkins'),
      ('qt_records'),
      ('groups'),
      ('group_members'),
      ('prayer_items')
  ) as target(table_name)
  where to_regclass(format('public.%I', target.table_name)) is null;

  if v_missing_tables is not null then
    raise exception 'Safety stop: missing expected public tables: %', v_missing_tables;
  end if;
end
$$;

-- Normal app clients never need to truncate tables, create foreign-key
-- references, or create triggers. Keep all existing CRUD grants unchanged.
revoke truncate, references, trigger on table
  public.daily_checkins,
  public.qt_records,
  public.groups,
  public.group_members,
  public.prayer_items
from authenticated;

-- This helper is used only by RLS policies with auth.uid(). Enforce that same
-- boundary inside the SECURITY DEFINER function so a signed-in caller cannot
-- use the RPC to inspect another user's private group membership.
create or replace function public.is_group_member(
  p_group_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when (select auth.uid()) is null
      or p_user_id is distinct from (select auth.uid())
      then false
    else exists (
      select 1
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.user_id = p_user_id
    )
  end;
$function$;

-- New functions receive PUBLIC EXECUTE by default, so remove both the broad
-- default and the existing direct anon grant. Keep the authenticated RLS caller
-- and service-role access explicit.
revoke all on function public.is_group_member(uuid, uuid) from public;
revoke execute on function public.is_group_member(uuid, uuid) from anon;
grant execute on function public.is_group_member(uuid, uuid)
  to authenticated, service_role;

-- Fail and roll back the whole migration if any target privilege remains or if
-- the helper's intended execution boundary was not applied.
do $$
begin
  if exists (
    select 1
    from (
      values
        ('daily_checkins'),
        ('qt_records'),
        ('groups'),
        ('group_members'),
        ('prayer_items')
    ) as target(table_name)
    cross join (
      values
        ('TRUNCATE'),
        ('REFERENCES'),
        ('TRIGGER')
    ) as privilege(privilege_type)
    where has_table_privilege(
      'authenticated',
      format('public.%I', target.table_name),
      privilege.privilege_type
    )
  ) then
    raise exception 'Postcheck failed: authenticated special table privileges remain';
  end if;

  if has_function_privilege(
    'anon',
    'public.is_group_member(uuid,uuid)'::regprocedure,
    'EXECUTE'
  ) then
    raise exception 'Postcheck failed: anon can still execute is_group_member(uuid,uuid)';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.is_group_member(uuid,uuid)'::regprocedure,
    'EXECUTE'
  ) then
    raise exception 'Postcheck failed: authenticated cannot execute is_group_member(uuid,uuid)';
  end if;
end
$$;

commit;
