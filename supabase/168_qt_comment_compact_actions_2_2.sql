-- 168_qt_comment_compact_actions_2_2.sql
-- Run after 167, before deploying the matching compact comment UI.
-- Authors cannot like their own comments/replies. Deleting a root also deletes
-- its replies and their likes. Previously deleted root placeholders are removed
-- with their replies under the same rule. Other people's likes are preserved.
-- No Reflection, device-date, streak, progress, badge or reward logic changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if to_regprocedure('public.get_qt_comment_stats(uuid[])') is null
    or to_regprocedure('public.get_qt_comment_page(uuid,uuid,timestamptz,uuid)') is null
    or not exists (select 1 from pg_constraint where conrelid = 'public.qt_comments'::regclass
      and confrelid = 'public.qt_comments'::regclass and contype = 'f' and confdeltype = 'c')
    or not exists (select 1 from pg_constraint where conrelid = 'public.qt_comment_likes'::regclass
      and confrelid = 'public.qt_comments'::regclass and contype = 'f' and confdeltype = 'c')
  then raise exception 'Safety stop: run 167 first; cascading comment/like references must be present';
  end if;
end;
$$;

-- The parent FK already has ON DELETE CASCADE. Remove only 167's placeholder
-- guard, leaving ownership/sharing RLS and immutable-parent validation intact.
drop trigger if exists qt_comments_guard_delete on public.qt_comments;
drop function if exists public.guard_qt_comment_delete();
revoke update (deleted_at) on public.qt_comments from authenticated;

-- Apply the newly agreed behavior to existing data, including local test posts.
delete from public.qt_comments where parent_id is null and deleted_at is not null;
delete from public.qt_comment_likes as liked
using public.qt_comments as comment
where liked.comment_id = comment.id and liked.user_id = comment.author_id;

drop policy if exists qt_comment_likes_insert_own on public.qt_comment_likes;
create policy qt_comment_likes_insert_own on public.qt_comment_likes
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.qt_comments c
    where c.id = comment_id and c.deleted_at is null and c.author_id <> (select auth.uid()))
);

create or replace function public.set_qt_comment_like(p_comment_id uuid, p_liked boolean)
returns table (comment_id uuid, like_count bigint, my_liked boolean, reply_count bigint)
language plpgsql security invoker set search_path = '' as $$
declare target_author uuid;
begin
  select c.author_id into target_author from public.qt_comments c
    where c.id = p_comment_id and c.deleted_at is null;
  if (select auth.uid()) is null or not found then
    raise exception 'Comment is no longer accessible' using errcode = '42501';
  end if;
  if p_liked is true then
    if target_author = (select auth.uid()) then
      raise exception 'Authors cannot like their own comments' using errcode = '42501';
    end if;
    insert into public.qt_comment_likes(comment_id, user_id) values (p_comment_id, (select auth.uid()))
      on conflict do nothing;
  else
    delete from public.qt_comment_likes l where l.comment_id = p_comment_id and l.user_id = (select auth.uid());
  end if;
  return query select * from public.get_qt_comment_stats(array[p_comment_id]);
end;
$$;

create or replace function public.delete_qt_comment(p_comment_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare target public.qt_comments; removed_count bigint; remaining_replies bigint := 0;
begin
  select * into target from public.qt_comments
    where id = p_comment_id and author_id = (select auth.uid()) for update;
  if not found then
    raise exception 'Comment is no longer accessible' using errcode = '42501';
  end if;
  select count(*) into removed_count from public.qt_comments c
    where (c.id = target.id or c.parent_id = target.id) and c.deleted_at is null;
  -- Only the caller's accessible comment is directly deleted. Its FK cascade
  -- removes that root's replies/likes, including replies by other authors.
  delete from public.qt_comments where id = target.id;
  if target.parent_id is not null then
    select count(*) into remaining_replies from public.qt_comments r
      where r.parent_id = target.parent_id and r.deleted_at is null;
  end if;
  return jsonb_build_object('id', target.id, 'parent_id', target.parent_id,
    'tombstone', false, 'deleted_now', true, 'deleted_count', removed_count, 'reply_count', remaining_replies);
end;
$$;

revoke all on function public.set_qt_comment_like(uuid,boolean) from public, anon, authenticated;
revoke all on function public.delete_qt_comment(uuid) from public, anon, authenticated;
grant execute on function public.set_qt_comment_like(uuid,boolean), public.delete_qt_comment(uuid)
  to authenticated, service_role;

do $$
begin
  if has_column_privilege('authenticated', 'public.qt_comments', 'deleted_at', 'UPDATE')
    or not has_column_privilege('authenticated', 'public.qt_comments', 'body', 'UPDATE')
    or has_function_privilege('anon', 'public.delete_qt_comment(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.set_qt_comment_like(uuid,boolean)', 'EXECUTE')
    or exists (select 1 from pg_proc where oid in (
      'public.delete_qt_comment(uuid)'::regprocedure, 'public.set_qt_comment_like(uuid,boolean)'::regprocedure
    ) and prosecdef)
    or exists (select 1 from public.qt_comment_likes l join public.qt_comments c on c.id = l.comment_id
      where l.user_id = c.author_id)
    or exists (select 1 from public.qt_comments where deleted_at is not null)
  then raise exception 'Postcheck failed: compact comment rules differ from the expected boundary';
  end if;
end;
$$;
notify pgrst, 'reload schema';
commit;

-- Expected one row with all five values true. Safe to run the whole file again.
select
  (select relrowsecurity from pg_class where oid = 'public.qt_comment_likes'::regclass) as likes_rls_enabled,
  not exists (select 1 from public.qt_comment_likes l join public.qt_comments c on c.id = l.comment_id
    where l.user_id = c.author_id) as self_likes_removed,
  not exists (select 1 from public.qt_comments where deleted_at is not null) as deleted_threads_removed,
  not has_column_privilege('authenticated', 'public.qt_comments', 'deleted_at', 'UPDATE') as placeholder_writes_blocked,
  not (select prosecdef from pg_proc where oid = 'public.delete_qt_comment(uuid)'::regprocedure) as sharing_rls_preserved;
