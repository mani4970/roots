-- Christian Roots 2.1 per-user public group hiding
--
-- Purpose:
--   - Reuse hidden_community_items for public groups hidden by one user.
--   - Keep the hidden state account-based across devices.
--   - Preserve all existing QT/prayer hiding behavior.
--
-- The matching app patch stores group rows as:
--   content_type = 'group'
--   content_id   = groups.id

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if to_regclass('public.hidden_community_items') is null then
    raise exception 'Safety stop: public.hidden_community_items is missing';
  end if;

  if exists (
    select 1
    from public.hidden_community_items
    where content_type not in ('qt', 'prayer', 'group')
  ) then
    raise exception 'Safety stop: unexpected hidden_community_items content_type exists';
  end if;
end
$$;

alter table public.hidden_community_items
  drop constraint if exists hidden_community_items_content_type_check;

alter table public.hidden_community_items
  add constraint hidden_community_items_content_type_check
  check (content_type in ('qt', 'prayer', 'group'));

-- Keep Data API access explicit while RLS restricts every row to its owner.
revoke all privileges on table public.hidden_community_items from anon;
revoke truncate, references, trigger
  on table public.hidden_community_items
  from authenticated;

grant select, insert, update, delete
  on table public.hidden_community_items
  to authenticated;
grant select, insert, update, delete
  on table public.hidden_community_items
  to service_role;

alter table public.hidden_community_items enable row level security;

drop policy if exists "Users can manage their hidden community items"
  on public.hidden_community_items;
create policy "Users can manage their hidden community items"
  on public.hidden_community_items
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.hidden_community_items'::regclass
      and conname = 'hidden_community_items_content_type_check'
      and pg_get_constraintdef(oid) like '%group%'
  ) then
    raise exception 'Postcheck failed: group content type constraint was not installed';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.hidden_community_items'::regclass
  ) then
    raise exception 'Postcheck failed: RLS is not enabled';
  end if;

  if has_table_privilege('anon', 'public.hidden_community_items', 'SELECT')
    or has_table_privilege('anon', 'public.hidden_community_items', 'INSERT')
    or has_table_privilege('anon', 'public.hidden_community_items', 'UPDATE')
    or has_table_privilege('anon', 'public.hidden_community_items', 'DELETE')
  then
    raise exception 'Postcheck failed: anon still has hidden item table access';
  end if;

  if not (
    has_table_privilege(
      'authenticated',
      'public.hidden_community_items',
      'SELECT'
    )
    and has_table_privilege(
      'authenticated',
      'public.hidden_community_items',
      'INSERT'
    )
    and has_table_privilege(
      'authenticated',
      'public.hidden_community_items',
      'UPDATE'
    )
    and has_table_privilege(
      'authenticated',
      'public.hidden_community_items',
      'DELETE'
    )
  ) then
    raise exception 'Postcheck failed: authenticated CRUD grants are incomplete';
  end if;
end
$$;

commit;
