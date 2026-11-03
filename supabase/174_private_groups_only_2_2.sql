-- Christian Roots 2.2: every group uses the existing private/invitation mode.
-- Apply after 173. Existing group IDs, owners, memberships and all content stay
-- in place. Only public.groups.is_public is converted to false.
-- Old clients that still send true are normalized, so otherwise valid group
-- creation/edits do not start failing. Invite and challenge RPCs stay unchanged.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Keep the group-only metadata snapshot stable until this short migration ends.
lock table public.groups in share row exclusive mode;

do $$
begin
  if to_regclass('public.groups') is null
    or to_regclass('public.group_members') is null
    or to_regprocedure('public.get_group_invite(uuid)') is null
    or to_regprocedure('public.update_group_as_leader(uuid,uuid,text,text,boolean)') is null
    or not exists (
      select 1 from pg_attribute a where a.attrelid = 'public.groups'::regclass
        and a.attname = 'is_public' and a.atttypid = 'boolean'::regtype and not a.attisdropped
    )
    or not (select relrowsecurity from pg_class where oid = 'public.groups'::regclass)
  then
    raise exception 'Safety stop: expected group schema or access rules are missing';
  end if;

  -- The live groups table has no application triggers before this migration.
  -- Do not update existing rows through an unknown trigger with side effects.
  if exists (
    select 1 from pg_trigger t where t.tgrelid = 'public.groups'::regclass
      and not t.tgisinternal and t.tgname <> 'roots_groups_force_private'
  ) then
    raise exception 'Safety stop: an unexpected group trigger needs review';
  end if;

  perform set_config('roots.group174_records', (
    select md5(coalesce(string_agg((to_jsonb(g) - 'is_public')::text, '' order by g.id), ''))
    from public.groups g
  ), true);
  perform set_config('roots.group174_functions', (
    select md5(coalesce(string_agg(p.oid::text || pg_get_functiondef(p.oid), '' order by p.oid), ''))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'roots_comment_private', 'roots_prayer_173_private')
      and p.prokind in ('f', 'p')
  ), true);
  perform set_config('roots.group174_policies', (
    select md5(coalesce(string_agg(row_to_json(p)::text, '' order by p.schemaname, p.tablename, p.policyname), ''))
    from pg_policies p
  ), true);
end;
$$;

-- This trigger needs no privileged reads/writes: it changes only NEW.is_public.
-- Keep its function outside the exposed public schema and grant no client use.
create schema if not exists roots_group_174_private;
revoke all on schema roots_group_174_private from public, anon, authenticated;

create or replace function roots_group_174_private.force_private_group()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.is_public := false;
  return new;
end;
$$;
revoke all on function roots_group_174_private.force_private_group()
  from public, anon, authenticated, service_role;

drop trigger if exists roots_groups_force_private on public.groups;
create trigger roots_groups_force_private
before insert or update of is_public on public.groups
for each row execute function roots_group_174_private.force_private_group();

alter table public.groups alter column is_public set default false;

-- No IDs, membership rows, dates, text or challenge/reward rows are rewritten.
update public.groups set is_public = false where is_public is distinct from false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.groups'::regclass
      and conname = 'roots_groups_private_only'
  ) then
    alter table public.groups add constraint roots_groups_private_only
      check (is_public is false);
  elsif not exists (
    select 1 from pg_constraint where conrelid = 'public.groups'::regclass
      and conname = 'roots_groups_private_only' and contype = 'c'
      and pg_get_constraintdef(oid) = 'CHECK ((is_public IS FALSE))'
  ) then
    raise exception 'Safety stop: an unexpected private-group constraint needs review';
  end if;
  alter table public.groups validate constraint roots_groups_private_only;

  if current_setting('roots.group174_records') is distinct from (
    select md5(coalesce(string_agg((to_jsonb(g) - 'is_public')::text, '' order by g.id), ''))
    from public.groups g
  ) or current_setting('roots.group174_functions') is distinct from (
    select md5(coalesce(string_agg(p.oid::text || pg_get_functiondef(p.oid), '' order by p.oid), ''))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'roots_comment_private', 'roots_prayer_173_private')
      and p.prokind in ('f', 'p')
  ) or current_setting('roots.group174_policies') is distinct from (
    select md5(coalesce(string_agg(row_to_json(p)::text, '' order by p.schemaname, p.tablename, p.policyname), ''))
    from pg_policies p
  ) then
    raise exception 'Postcheck failed: group fields, existing functions or access policies changed';
  end if;

  if exists(select 1 from public.groups where is_public is distinct from false)
    or has_schema_privilege('anon', 'roots_group_174_private', 'USAGE')
    or has_schema_privilege('authenticated', 'roots_group_174_private', 'USAGE')
    or has_function_privilege('anon', 'roots_group_174_private.force_private_group()', 'EXECUTE')
    or has_function_privilege('authenticated', 'roots_group_174_private.force_private_group()', 'EXECUTE')
  then
    raise exception 'Postcheck failed: private-group normalization or trigger privileges are unexpected';
  end if;
end;
$$;

commit;

-- All six values should be true.
select
  not exists(select 1 from public.groups where is_public is distinct from false)
    as all_groups_private,
  exists (
    select 1 from pg_attribute a join pg_attrdef d
      on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = 'public.groups'::regclass and a.attname = 'is_public'
      and pg_get_expr(d.adbin, d.adrelid) = 'false'
  ) as new_groups_default_private,
  exists (
    select 1 from pg_trigger t where t.tgrelid = 'public.groups'::regclass
      and t.tgname = 'roots_groups_force_private' and t.tgenabled in ('O', 'A')
      and t.tgfoid = 'roots_group_174_private.force_private_group()'::regprocedure
  ) as older_client_flags_normalized,
  exists (
    select 1 from pg_constraint where conrelid = 'public.groups'::regclass
      and conname = 'roots_groups_private_only' and convalidated
  ) as private_mode_enforced,
  (select relrowsecurity from pg_class where oid = 'public.groups'::regclass)
    as existing_group_rls_preserved,
  not has_schema_privilege('anon', 'roots_group_174_private', 'USAGE')
    and not has_schema_privilege('authenticated', 'roots_group_174_private', 'USAGE')
    and not has_function_privilege('anon', 'roots_group_174_private.force_private_group()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'roots_group_174_private.force_private_group()', 'EXECUTE')
    as private_trigger_not_exposed;
