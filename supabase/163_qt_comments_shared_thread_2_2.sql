-- 163_qt_comments_shared_thread_2_2.sql
-- One comment thread per Bible Reflection, including existing comments.
-- Run after 162, before deploying the matching shared-thread community UI.
-- Read access follows the Reflection's CURRENT sharing targets. Expanding its
-- sharing targets also expands access to its existing comments. Original comment
-- contexts remain immutable provenance; no comment rows are moved or rewritten.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if to_regclass('public.qt_comments') is null
    or to_regclass('public.qt_records') is null
    or to_regclass('public.qt_record_recipients') is null
    or to_regclass('public.group_members') is null
    or to_regclass('public.companions') is null
    or to_regprocedure('public.can_access_qt_comment_context(uuid,text,uuid)') is null
    or to_regprocedure('public.guard_qt_comment_write()') is null
  then
    raise exception 'Safety stop: run 162 and the existing sharing SQL first';
  end if;
end;
$$;

-- The old index remains available to older clients. This index matches shared
-- thread pagination without requiring a scope or scope_id filter.
create index if not exists qt_comments_thread_created_idx
  on public.qt_comments (qt_id, created_at, id);

-- SECURITY INVOKER retains sharing-table RLS and checks the actual live sharing
-- rules as well. A stale recipient row or an otherwise broad QT SELECT policy
-- alone must not grant comment access after a companion relationship ends.
create or replace function public.can_access_qt_comment_thread(p_qt_id uuid)
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
      and (
        q.user_id = (select auth.uid())
        or exists (
          select 1
          from unnest(string_to_array(coalesce(q.visibility, ''), ',')) as token(value)
          where btrim(token.value) = 'all'
        )
        or exists (
          select 1
          from public.group_members as member
          where member.user_id = (select auth.uid())
            and exists (
              select 1
              from unnest(string_to_array(coalesce(q.visibility, ''), ',')) as token(value)
              where btrim(token.value) = 'group_' || member.group_id::text
            )
        )
        or exists (
          select 1
          from public.qt_record_recipients as recipient
          where recipient.qt_record_id = q.id
            and recipient.owner_id = q.user_id
            and recipient.recipient_id = (select auth.uid())
            and exists (
              select 1
              from public.companions as companion
              where companion.status = 'accepted'
                and (
                  (companion.requester_id = q.user_id and companion.receiver_id = recipient.recipient_id)
                  or (companion.receiver_id = q.user_id and companion.requester_id = recipient.recipient_id)
                )
            )
        )
      )
  );
$$;

revoke all on function public.can_access_qt_comment_thread(uuid)
  from public, anon, authenticated;
grant execute on function public.can_access_qt_comment_thread(uuid)
  to authenticated, service_role;

alter table public.qt_comments enable row level security;
revoke all on table public.qt_comments from public, anon, authenticated;
grant select, delete on table public.qt_comments to authenticated;
grant insert (id, qt_id, scope, scope_id, author_id, body)
  on public.qt_comments to authenticated;
grant update (body) on public.qt_comments to authenticated;
grant all on table public.qt_comments to service_role;

-- Read all comments on an accessible Reflection, regardless of where each
-- comment was originally written or whether its original route is still shared.
drop policy if exists qt_comments_select_context on public.qt_comments;
create policy qt_comments_select_context on public.qt_comments
for select to authenticated
using (public.can_access_qt_comment_thread(qt_id));

-- The originating screen must still be a valid sharing route when inserting.
-- Public Reflection access cannot be used to invent membership in another group
-- or a private companion conversation.
drop policy if exists qt_comments_insert_own_context on public.qt_comments;
create policy qt_comments_insert_own_context on public.qt_comments
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and public.can_access_qt_comment_thread(qt_id)
  and public.can_access_qt_comment_context(qt_id, scope, scope_id)
);

drop policy if exists qt_comments_update_own_context on public.qt_comments;
create policy qt_comments_update_own_context on public.qt_comments
for update to authenticated
using (
  author_id = (select auth.uid())
  and public.can_access_qt_comment_thread(qt_id)
)
with check (
  author_id = (select auth.uid())
  and public.can_access_qt_comment_thread(qt_id)
);

drop policy if exists qt_comments_delete_own_context on public.qt_comments;
create policy qt_comments_delete_own_context on public.qt_comments
for delete to authenticated
using (
  author_id = (select auth.uid())
  and public.can_access_qt_comment_thread(qt_id)
);

-- A bounded batch of authorized thread totals, without downloading comment
-- bodies. Inaccessible Reflection IDs are omitted; accessible empty threads
-- return zero. RLS applies to both the helper and counted comment rows.
create or replace function public.get_qt_shared_comment_counts(p_qt_ids uuid[])
returns table (
  qt_id uuid,
  comment_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if cardinality(p_qt_ids) > 200 then
    raise exception 'At most 200 Reflection IDs may be counted' using errcode = '22023';
  end if;

  return query
    with accessible as materialized (
      select distinct requested.id as qt_id
      from unnest(p_qt_ids) as requested(id)
      where requested.id is not null
        and public.can_access_qt_comment_thread(requested.id)
    )
    select accessible.qt_id, count(comment.id)
    from accessible
    left join public.qt_comments as comment on comment.qt_id = accessible.qt_id
    group by accessible.qt_id;
end;
$$;

revoke all on function public.get_qt_shared_comment_counts(uuid[])
  from public, anon, authenticated;
grant execute on function public.get_qt_shared_comment_counts(uuid[])
  to authenticated, service_role;

-- Keep the previous client's context-filtered totals aligned with its still-
-- context-filtered comment query during rollout. The new client uses the shared
-- count RPC above; no app version sees a total for rows it cannot yet display.
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

-- The original immutable-routing trigger from 162 remains in place. Fail the
-- transaction rather than publishing a partial or unexpectedly broad boundary.
do $$
begin
  if not (select relation.relrowsecurity from pg_class as relation where relation.oid = 'public.qt_comments'::regclass)
    or has_table_privilege('anon', 'public.qt_comments', 'SELECT')
    or has_table_privilege('anon', 'public.qt_comments', 'INSERT')
    or has_table_privilege('authenticated', 'public.qt_comments', 'TRUNCATE')
    or has_column_privilege('authenticated', 'public.qt_comments', 'scope_id', 'UPDATE')
    or has_column_privilege('authenticated', 'public.qt_comments', 'author_id', 'UPDATE')
    or has_function_privilege('anon', 'public.can_access_qt_comment_thread(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.get_qt_shared_comment_counts(uuid[])', 'EXECUTE')
    or has_function_privilege('anon', 'public.get_qt_comment_counts(jsonb)', 'EXECUTE')
    or not has_column_privilege('authenticated', 'public.qt_comments', 'body', 'UPDATE')
    or not exists (
      select 1 from pg_trigger
      where tgrelid = 'public.qt_comments'::regclass
        and tgname = 'qt_comments_guard_write'
        and tgenabled <> 'D'
        and tgfoid = 'public.guard_qt_comment_write()'::regprocedure
    )
    or exists (
      select 1 from pg_proc
      where oid in (
        'public.can_access_qt_comment_thread(uuid)'::regprocedure,
        'public.get_qt_shared_comment_counts(uuid[])'::regprocedure,
        'public.get_qt_comment_counts(jsonb)'::regprocedure
      ) and prosecdef
    )
  then
    raise exception 'Postcheck failed: shared comment RLS/grants differ from the expected boundary';
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
