-- Christian Roots 2.2: the public Community feed now contains reflections only.
-- Apply after 172. No existing prayer, recipient, intercession, like, reflection,
-- comment, profile, reward or progress rows are updated or deleted.
--
-- Existing public intercessions stay in their users' personal prayer cards.
-- A private, one-time ID-only snapshot preserves just these existing grants.
-- New log rows cannot create such a grant, including after this SQL is rerun.
-- The old prayer visibility token 'all' remains stored but no longer grants
-- general access. Explicit unsharing removes the archived reader's access too.
-- Keep can_share_prayer_visibility unchanged so owners can edit/answer old rows.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if to_regprocedure('public.can_view_prayer_item(text,uuid)') is null
    or to_regprocedure('public.can_share_prayer_visibility(text)') is null
    or to_regclass('public.prayer_items') is null
    or to_regclass('public.prayer_item_recipients') is null
    or to_regclass('public.group_members') is null
    or to_regclass('public.user_prayer_logs') is null
  then
    raise exception 'Safety stop: expected prayer visibility objects are missing';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.prayer_items'::regclass)
    or not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'prayer_items'
        and policyname = 'prayer_items_select' and cmd = 'SELECT'
    )
    or not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'prayer_items'
        and policyname = 'roots_prayer_items_select_visible' and cmd = 'SELECT'
    )
    or not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'prayer_items'
        and policyname = 'prayer_items_select_partner_recipients' and cmd = 'SELECT'
    )
  then
    raise exception 'Safety stop: expected prayer read policies are missing';
  end if;

  -- Permissive policies combine with OR: do not overlook another public route.
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'prayer_items'
      and cmd in ('SELECT', 'ALL')
      and policyname not in (
        'prayer_items_select', 'roots_prayer_items_select_visible',
        'prayer_items_select_partner_recipients', 'prayer_items_select_legacy_intercession'
      )
  ) then
    raise exception 'Safety stop: an unexpected prayer read policy needs review';
  end if;

  perform set_config('roots.prayer173_archive_new',
    (to_regclass('roots_prayer_173_private.legacy_intercessions') is null)::text, true);

  -- Transaction-local metadata fingerprints, without a guard table or content.
  perform set_config('roots.prayer173_functions', (
    select md5(coalesce(string_agg(p.oid::text || pg_get_functiondef(p.oid), '' order by p.oid), ''))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'roots_comment_private') and p.prokind in ('f', 'p')
      and p.oid <> 'public.can_view_prayer_item(text,uuid)'::regprocedure
      and p.oid is distinct from to_regprocedure('public.can_view_legacy_prayer_intercession(uuid)')::oid
  ), true);
  perform set_config('roots.prayer173_policies', (
    select md5(coalesce(string_agg(row_to_json(p)::text, '' order by p.schemaname, p.tablename, p.policyname), ''))
    from pg_policies p
    where not (p.schemaname = 'public' and p.tablename = 'prayer_items'
      and p.policyname in ('prayer_items_select', 'prayer_items_select_legacy_intercession'))
  ), true);
end;
$$;

-- Private compatibility grants hold IDs only. Clients cannot read or modify
-- the table, and it is not placed in the exposed public schema.
create schema if not exists roots_prayer_173_private;
revoke all on schema roots_prayer_173_private from public, anon, authenticated;

create table if not exists roots_prayer_173_private.legacy_intercessions (
  log_id uuid primary key references public.user_prayer_logs(id) on delete cascade,
  user_id uuid not null,
  prayer_id uuid not null
);
alter table roots_prayer_173_private.legacy_intercessions enable row level security;
revoke all on table roots_prayer_173_private.legacy_intercessions from public, anon, authenticated;
create index if not exists legacy_intercessions_owner_prayer_idx
  on roots_prayer_173_private.legacy_intercessions(user_id, prayer_id);

do $$
begin
  if current_setting('roots.prayer173_archive_new') = 'true' then
    -- Bound the one-time installation snapshot against concurrent log writes.
    -- The transaction releases this lock at commit; the 5s lock timeout above
    -- aborts safely rather than waiting indefinitely on an active request.
    lock table public.user_prayer_logs in share mode;
    insert into roots_prayer_173_private.legacy_intercessions(log_id, user_id, prayer_id)
    select l.id, l.user_id, l.prayer_id
    from public.user_prayer_logs l join public.prayer_items p on p.id = l.prayer_id
    where l.user_id is not null and l.user_id <> p.user_id
      and exists (
        select 1 from unnest(string_to_array(coalesce(p.visibility, ''), ',')) token(value)
        where btrim(token.value) = 'all'
      );
  end if;
end;
$$;

-- Preserve the original owner/group rules and secured function settings.
-- Selected companions retain their separate recipient policy.
create or replace function public.can_view_prayer_item(p_visibility text, p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with visibility_parts as (
    select trim(part) as value
    from unnest(string_to_array(coalesce(p_visibility, ''), ',')) as part
  )
  select coalesce(auth.uid() = p_owner_id, false)
    or exists (
      select 1
      from visibility_parts vp
      join public.group_members gm
        on gm.user_id = auth.uid()
       and vp.value = 'group_' || gm.group_id::text
    );
$$;

-- The existing helper lacks a prayer ID, so it cannot safely apply per-prayer
-- archive grants. This separate helper checks the exact source/log/reader IDs.
create or replace function public.can_view_legacy_prayer_intercession(p_prayer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from roots_prayer_173_private.legacy_intercessions a
    join public.user_prayer_logs l
      on l.id = a.log_id and l.user_id = a.user_id and l.prayer_id = a.prayer_id
    join public.prayer_items p on p.id = a.prayer_id
    where a.user_id = (select auth.uid()) and a.prayer_id = p_prayer_id
      and exists (
        select 1 from unnest(string_to_array(coalesce(p.visibility, ''), ',')) token(value)
        where btrim(token.value) = 'all'
      )
  );
$$;
alter function public.can_view_legacy_prayer_intercession(uuid) owner to postgres;
revoke all on function public.can_view_legacy_prayer_intercession(uuid) from public, anon, service_role;
grant execute on function public.can_view_legacy_prayer_intercession(uuid) to authenticated;

-- The old permissive policy independently granted public-only prayer reads.
alter policy prayer_items_select on public.prayer_items
using (auth.uid() = user_id);

drop policy if exists prayer_items_select_legacy_intercession on public.prayer_items;
create policy prayer_items_select_legacy_intercession on public.prayer_items
for select to authenticated
using (public.can_view_legacy_prayer_intercession(id));

do $$
begin
  if current_setting('roots.prayer173_functions') is distinct from (
    select md5(coalesce(string_agg(p.oid::text || pg_get_functiondef(p.oid), '' order by p.oid), ''))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'roots_comment_private') and p.prokind in ('f', 'p')
      and p.oid <> 'public.can_view_prayer_item(text,uuid)'::regprocedure
      and p.oid is distinct from to_regprocedure('public.can_view_legacy_prayer_intercession(uuid)')::oid
  ) or current_setting('roots.prayer173_policies') is distinct from (
    select md5(coalesce(string_agg(row_to_json(p)::text, '' order by p.schemaname, p.tablename, p.policyname), ''))
    from pg_policies p
    where not (p.schemaname = 'public' and p.tablename = 'prayer_items'
      and p.policyname in ('prayer_items_select', 'prayer_items_select_legacy_intercession'))
  ) then
    raise exception 'Postcheck failed: an unrelated function or policy changed';
  end if;
  if public.can_view_prayer_item('all', null)
    or has_function_privilege('anon', 'public.can_view_prayer_item(text,uuid)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.can_view_prayer_item(text,uuid)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.can_view_prayer_item(text,uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.can_view_legacy_prayer_intercession(uuid)', 'EXECUTE')
    or has_schema_privilege('authenticated', 'roots_prayer_173_private', 'USAGE')
    or has_table_privilege('authenticated', 'roots_prayer_173_private.legacy_intercessions', 'SELECT,INSERT,UPDATE,DELETE')
    or not (select relrowsecurity from pg_class
      where oid = 'roots_prayer_173_private.legacy_intercessions'::regclass)
  then
    raise exception 'Postcheck failed: prayer visibility or archive privileges are unexpected';
  end if;
end;
$$;

commit;

-- All eight values should be true. No existing activity rows were rewritten.
select
  not public.can_view_prayer_item('all', null) as public_prayer_access_closed,
  exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'prayer_items'
      and policyname = 'prayer_items_select' and qual = '(auth.uid() = user_id)'
  ) as owner_read_policy_preserved,
  exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'prayer_items'
      and policyname = 'prayer_items_select_partner_recipients'
  ) as partner_read_policy_preserved,
  exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'prayer_items'
      and policyname = 'roots_prayer_items_select_visible'
  ) as group_read_policy_preserved,
  exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'prayer_items'
      and policyname = 'prayer_items_select_legacy_intercession'
  ) as existing_intercession_read_policy_ready,
  (select relrowsecurity from pg_class
    where oid = 'roots_prayer_173_private.legacy_intercessions'::regclass)
    and not has_schema_privilege('authenticated', 'roots_prayer_173_private', 'USAGE')
    and not has_schema_privilege('anon', 'roots_prayer_173_private', 'USAGE')
    and not has_table_privilege('authenticated', 'roots_prayer_173_private.legacy_intercessions', 'SELECT,INSERT,UPDATE,DELETE')
    and not has_table_privilege('anon', 'roots_prayer_173_private.legacy_intercessions', 'SELECT,INSERT,UPDATE,DELETE')
    as compatibility_ids_private,
  not has_function_privilege('anon', 'public.can_view_legacy_prayer_intercession(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.can_view_legacy_prayer_intercession(uuid)', 'EXECUTE')
    as compatibility_helper_restricted,
  not has_function_privilege('anon', 'public.can_view_prayer_item(text,uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.can_view_prayer_item(text,uuid)', 'EXECUTE')
    and has_function_privilege('service_role', 'public.can_view_prayer_item(text,uuid)', 'EXECUTE')
    as original_helper_privileges_preserved;
