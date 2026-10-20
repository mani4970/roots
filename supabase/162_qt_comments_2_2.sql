-- 162_qt_comments_2_2.sql
-- Context-isolated Bible Reflection comments (all / one group / one companion).
-- Run this numbered SQL before deploying the matching community UI.
-- Additive: existing QT/reaction/sharing/progress/notification policies are untouched.
-- Companion scope_id is the explicit RECIPIENT of that QT, never the QT owner.
-- Permission checks remain live: unsharing, leaving a group, removing a recipient,
-- or ending an accepted companion relationship immediately hides its comments.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if to_regclass('public.qt_records') is null
    or to_regclass('public.qt_record_recipients') is null
    or to_regclass('public.group_members') is null
    or to_regclass('public.companions') is null
  then
    raise exception 'Safety stop: expected QT, recipient, group, or companion tables are missing';
  end if;
end;
$$;

create table if not exists public.qt_comments (
  id uuid primary key default gen_random_uuid(),
  qt_id uuid not null references public.qt_records(id) on delete cascade,
  scope text not null,
  scope_id uuid,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qt_comments_scope_check check (
    (scope = 'all' and scope_id is null)
    or (scope in ('group', 'partner') and scope_id is not null)
  ),
  constraint qt_comments_body_check check (
    char_length(body) between 1 and 2000
    and body ~ '[^[:space:]]'
  )
);

create index if not exists qt_comments_context_created_idx
  on public.qt_comments (qt_id, scope, scope_id, created_at, id);
create index if not exists qt_comments_author_idx
  on public.qt_comments (author_id);

alter table public.qt_comments enable row level security;

-- SECURITY INVOKER deliberately preserves the existing sharing-table RLS.
-- Checking whether a QT is visible in ANY space is insufficient: the requested
-- comment context must independently be shared and accessible to the caller.
create or replace function public.can_access_qt_comment_context(
  p_qt_id uuid,
  p_scope text,
  p_scope_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.qt_records as q
    where q.id = p_qt_id
      and q.is_draft is false
      and case p_scope
        when 'all' then
          p_scope_id is null
          and exists (
            select 1 from unnest(string_to_array(coalesce(q.visibility, ''), ',')) as token(value)
            where btrim(token.value) = 'all'
          )
        when 'group' then
          p_scope_id is not null
          and exists (
            select 1 from unnest(string_to_array(coalesce(q.visibility, ''), ',')) as token(value)
            where btrim(token.value) = 'group_' || p_scope_id::text
          )
          and exists (
            select 1 from public.group_members as gm
            where gm.group_id = p_scope_id
              and gm.user_id = (select auth.uid())
          )
        when 'partner' then
          p_scope_id is not null
          and q.user_id <> p_scope_id
          and (select auth.uid()) in (q.user_id, p_scope_id)
          and exists (
            select 1 from public.qt_record_recipients as recipient
            where recipient.qt_record_id = q.id
              and recipient.owner_id = q.user_id
              and recipient.recipient_id = p_scope_id
          )
          and exists (
            select 1 from public.companions as companion
            where companion.status = 'accepted'
              and (
                (companion.requester_id = q.user_id and companion.receiver_id = p_scope_id)
                or (companion.receiver_id = q.user_id and companion.requester_id = p_scope_id)
              )
          )
        else false
      end
  );
$$;

-- Normalize only the text, and stamp the server's edit time. Routing, author,
-- identity, and creation time are immutable even for a caller with broad grants.
create or replace function public.guard_qt_comment_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.qt_id is distinct from old.qt_id
      or new.scope is distinct from old.scope
      or new.scope_id is distinct from old.scope_id
      or new.author_id is distinct from old.author_id
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Comment identity and sharing context cannot be changed' using errcode = '42501';
    end if;
  end if;
  new.body := regexp_replace(new.body, '^\s+|\s+$', '', 'g');
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.guard_qt_comment_write() from public, anon, authenticated;
drop trigger if exists qt_comments_guard_write on public.qt_comments;
create trigger qt_comments_guard_write
before insert or update on public.qt_comments
for each row execute function public.guard_qt_comment_write();

revoke all on table public.qt_comments from public, anon, authenticated;
grant select, delete on table public.qt_comments to authenticated;
-- A client-generated UUID permits safe retry after an uncertain network reply.
-- Server creation/edit timestamps remain protected.
grant insert (id, qt_id, scope, scope_id, author_id, body) on public.qt_comments to authenticated;
grant update (body) on public.qt_comments to authenticated;
grant all on table public.qt_comments to service_role;

revoke all on function public.can_access_qt_comment_context(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.can_access_qt_comment_context(uuid, text, uuid)
  to authenticated, service_role;

drop policy if exists qt_comments_select_context on public.qt_comments;
create policy qt_comments_select_context on public.qt_comments
for select to authenticated
using (public.can_access_qt_comment_context(qt_id, scope, scope_id));

drop policy if exists qt_comments_insert_own_context on public.qt_comments;
create policy qt_comments_insert_own_context on public.qt_comments
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and public.can_access_qt_comment_context(qt_id, scope, scope_id)
);

drop policy if exists qt_comments_update_own_context on public.qt_comments;
create policy qt_comments_update_own_context on public.qt_comments
for update to authenticated
using (
  author_id = (select auth.uid())
  and public.can_access_qt_comment_context(qt_id, scope, scope_id)
)
with check (
  author_id = (select auth.uid())
  and public.can_access_qt_comment_context(qt_id, scope, scope_id)
);

drop policy if exists qt_comments_delete_own_context on public.qt_comments;
create policy qt_comments_delete_own_context on public.qt_comments
for delete to authenticated
using (
  author_id = (select auth.uid())
  and public.can_access_qt_comment_context(qt_id, scope, scope_id)
);

-- One bounded call per visible feed page, no comment bodies in list loading.
-- Access-denied contexts are omitted; accessible empty contexts return zero.
create or replace function public.get_qt_comment_counts(p_contexts jsonb)
returns table (
  qt_id uuid,
  scope text,
  scope_id uuid,
  comment_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(p_contexts) is distinct from 'array' then
    raise exception 'Comment contexts must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_contexts) > 200 then
    raise exception 'At most 200 comment contexts may be counted' using errcode = '22023';
  end if;
  return query
    with contexts as (
      select distinct input.qt_id, input.scope, input.scope_id
      from jsonb_to_recordset(p_contexts) as input(qt_id uuid, scope text, scope_id uuid)
      where public.can_access_qt_comment_context(input.qt_id, input.scope, input.scope_id)
    )
    select context.qt_id, context.scope, context.scope_id, count(comment.id)
    from contexts as context
    left join public.qt_comments as comment
      on comment.qt_id = context.qt_id
      and comment.scope = context.scope
      and comment.scope_id is not distinct from context.scope_id
    group by context.qt_id, context.scope, context.scope_id;
end;
$$;

revoke all on function public.get_qt_comment_counts(jsonb) from public, anon, authenticated;
grant execute on function public.get_qt_comment_counts(jsonb) to authenticated, service_role;

-- Roll back the whole install if the intended grant/RLS boundaries are absent.
do $$
begin
  if not (select relation.relrowsecurity from pg_class as relation where relation.oid = 'public.qt_comments'::regclass)
    or has_table_privilege('anon', 'public.qt_comments', 'SELECT')
    or has_table_privilege('anon', 'public.qt_comments', 'INSERT')
    or has_table_privilege('authenticated', 'public.qt_comments', 'TRUNCATE')
    or has_column_privilege('authenticated', 'public.qt_comments', 'scope_id', 'UPDATE')
    or has_function_privilege('anon', 'public.get_qt_comment_counts(jsonb)', 'EXECUTE')
    or not has_column_privilege('authenticated', 'public.qt_comments', 'body', 'UPDATE')
  then
    raise exception 'Postcheck failed: QT comment RLS/grants differ from the expected boundary';
  end if;
end;
$$;

commit;

-- Expected one row with all four booleans true.
select
  (select relrowsecurity from pg_class where oid = 'public.qt_comments'::regclass) as comments_rls_enabled,
  not has_table_privilege('anon', 'public.qt_comments', 'SELECT') as anonymous_read_blocked,
  has_column_privilege('authenticated', 'public.qt_comments', 'body', 'UPDATE') as own_body_edit_available,
  not has_column_privilege('authenticated', 'public.qt_comments', 'scope_id', 'UPDATE') as context_move_blocked;
