-- 167_qt_comment_likes_replies_2_2.sql
-- Run after 163, before deploying the matching comment UI.
-- Existing comments remain roots. Replies/likes follow the same live QT sharing
-- boundary. No QT, date, streak, progress, badge or reward writes are performed.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if to_regprocedure('public.can_access_qt_comment_thread(uuid)') is null
    or to_regprocedure('public.can_access_qt_comment_context(uuid,text,uuid)') is null
  then
    raise exception 'Safety stop: run 162 and 163 first';
  end if;
end;
$$;

alter table public.qt_comments
  add column if not exists parent_id uuid references public.qt_comments(id) on delete cascade,
  add column if not exists deleted_at timestamptz;
alter table public.qt_comments drop constraint if exists qt_comments_body_check;
alter table public.qt_comments add constraint qt_comments_body_check check (
  (deleted_at is null and char_length(body) between 1 and 2000 and body ~ '[^[:space:]]')
  or (deleted_at is not null and parent_id is null and body = '')
);
create index if not exists qt_comments_parent_created_idx
  on public.qt_comments (parent_id, created_at, id);
create index if not exists qt_comments_roots_created_idx
  on public.qt_comments (qt_id, created_at, id) where parent_id is null;

create or replace function public.guard_qt_comment_write()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare parent public.qt_comments;
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.qt_id is distinct from old.qt_id
      or new.scope is distinct from old.scope or new.scope_id is distinct from old.scope_id
      or new.author_id is distinct from old.author_id or new.created_at is distinct from old.created_at
      or new.parent_id is distinct from old.parent_id
    then
      raise exception 'Comment identity and sharing context cannot be changed' using errcode = '42501';
    end if;
    if old.deleted_at is not null then
      raise exception 'A deleted comment cannot be edited or restored' using errcode = '42501';
    end if;
    if new.deleted_at is not null then
      if new.parent_id is not null or new.body <> '' then
        raise exception 'Only an empty root tombstone is allowed' using errcode = '23514';
      end if;
      new.deleted_at := now();
    end if;
  else
    if new.deleted_at is not null then
      raise exception 'Cannot insert a deleted comment' using errcode = '23514';
    end if;
    if new.parent_id is not null then
      select * into parent from public.qt_comments where id = new.parent_id;
      if not found or parent.qt_id <> new.qt_id or parent.parent_id is not null or parent.deleted_at is not null then
        raise exception 'Reply parent must be an accessible active root of this Reflection' using errcode = '23514';
      end if;
    end if;
  end if;
  new.body := regexp_replace(new.body, '^\s+|\s+$', '', 'g');
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.guard_qt_comment_write() from public, anon, authenticated;
grant insert (parent_id) on public.qt_comments to authenticated;
grant update (deleted_at) on public.qt_comments to authenticated;

-- Older clients may still DELETE roots directly. Block that user action when
-- replies exist, while retaining the existing QT/account cascade cleanup.
create or replace function public.guard_qt_comment_delete()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user = 'authenticated'
    and exists (select 1 from public.qt_comments r where r.parent_id = old.id)
  then
    raise exception 'Delete a root with replies through delete_qt_comment' using errcode = '23503';
  end if;
  return old;
end;
$$;
revoke all on function public.guard_qt_comment_delete() from public, anon, authenticated;
drop trigger if exists qt_comments_guard_delete on public.qt_comments;
create trigger qt_comments_guard_delete before delete on public.qt_comments
  for each row execute function public.guard_qt_comment_delete();

create table if not exists public.qt_comment_likes (
  comment_id uuid not null references public.qt_comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists qt_comment_likes_user_idx on public.qt_comment_likes(user_id);
alter table public.qt_comment_likes enable row level security;
revoke all on public.qt_comment_likes from public, anon, authenticated;
grant select, delete on public.qt_comment_likes to authenticated;
grant insert (comment_id, user_id) on public.qt_comment_likes to authenticated;
grant all on public.qt_comment_likes to service_role;

-- Reading the comment here invokes its existing sharing RLS. No private scope
-- is inferred from the like author's identity or the comment's original scope.
drop policy if exists qt_comment_likes_read on public.qt_comment_likes;
create policy qt_comment_likes_read on public.qt_comment_likes for select to authenticated using (
  exists (select 1 from public.qt_comments c where c.id = comment_id and c.deleted_at is null)
);
drop policy if exists qt_comment_likes_insert_own on public.qt_comment_likes;
create policy qt_comment_likes_insert_own on public.qt_comment_likes for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.qt_comments c where c.id = comment_id and c.deleted_at is null)
);
drop policy if exists qt_comment_likes_delete_own on public.qt_comment_likes;
create policy qt_comment_likes_delete_own on public.qt_comment_likes for delete to authenticated using (
  user_id = (select auth.uid())
  and exists (select 1 from public.qt_comments c where c.id = comment_id and c.deleted_at is null)
);

create or replace function public.get_qt_comment_stats(p_comment_ids uuid[])
returns table (comment_id uuid, like_count bigint, my_liked boolean, reply_count bigint)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if cardinality(p_comment_ids) > 100 then
    raise exception 'At most 100 comment IDs may be requested' using errcode = '22023';
  end if;
  return query
    select c.id,
      case when c.deleted_at is null then (select count(*) from public.qt_comment_likes l where l.comment_id = c.id) else 0 end,
      c.deleted_at is null and exists (select 1 from public.qt_comment_likes l where l.comment_id = c.id and l.user_id = (select auth.uid())),
      (select count(*) from public.qt_comments r where r.parent_id = c.id and r.deleted_at is null)
    from public.qt_comments c where c.id = any(p_comment_ids);
end;
$$;

-- One bounded page with batched counts/my-like state, followed by one profile
-- batch in the client. Reply bodies are fetched only when that thread opens.
create or replace function public.get_qt_comment_page(
  p_qt_id uuid, p_parent_id uuid default null,
  p_before_created_at timestamptz default null, p_before_id uuid default null
)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Both cursor fields are required' using errcode = '22023';
  end if;
  if not public.can_access_qt_comment_thread(p_qt_id) then
    raise exception 'Reflection is no longer accessible' using errcode = '42501';
  end if;
  if p_parent_id is not null and not exists (
    select 1 from public.qt_comments c where c.id = p_parent_id and c.qt_id = p_qt_id and c.parent_id is null
  ) then
    raise exception 'Reply thread is no longer accessible' using errcode = '42501';
  end if;
  with candidates as materialized (
    select c.* from public.qt_comments c
    where c.qt_id = p_qt_id and c.parent_id is not distinct from p_parent_id
      and (c.deleted_at is null or exists (select 1 from public.qt_comments r where r.parent_id = c.id and r.deleted_at is null))
      and (p_before_created_at is null or (c.created_at, c.id) < (p_before_created_at, p_before_id))
    order by c.created_at desc, c.id desc limit 31
  ), page as materialized (
    select * from candidates order by created_at desc, id desc limit 30
  ), stats as (
    select * from public.get_qt_comment_stats(array(select id from page))
  )
  select jsonb_build_object(
    'comments', coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object(
      'like_count', s.like_count, 'my_liked', s.my_liked, 'reply_count', s.reply_count
    ) order by p.created_at, p.id) from page p join stats s on s.comment_id = p.id), '[]'::jsonb),
    'has_more', (select count(*) > 30 from candidates),
    'comment_count', (select count(*) from public.qt_comments c where c.qt_id = p_qt_id and c.deleted_at is null)
  ) into result;
  return result;
end;
$$;

-- Desired-state writes make a retry safe after a lost network response.
create or replace function public.set_qt_comment_like(p_comment_id uuid, p_liked boolean)
returns table (comment_id uuid, like_count bigint, my_liked boolean, reply_count bigint)
language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.qt_comments c where c.id = p_comment_id and c.deleted_at is null
  ) then
    raise exception 'Comment is no longer accessible' using errcode = '42501';
  end if;
  if p_liked is true then
    insert into public.qt_comment_likes(comment_id, user_id) values (p_comment_id, (select auth.uid()))
      on conflict do nothing;
  else
    delete from public.qt_comment_likes l where l.comment_id = p_comment_id and l.user_id = (select auth.uid());
  end if;
  return query select * from public.get_qt_comment_stats(array[p_comment_id]);
end;
$$;

-- The delete guard also protects replies from older clients that still DELETE
-- directly. A root with replies loses its text, not its replies.
create or replace function public.delete_qt_comment(p_comment_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare target public.qt_comments; keep_root boolean; remaining_replies bigint := 0;
begin
  select * into target from public.qt_comments
    where id = p_comment_id and author_id = (select auth.uid()) for update;
  if not found then
    raise exception 'Comment is no longer accessible' using errcode = '42501';
  end if;
  if target.deleted_at is not null then
    return jsonb_build_object('id', target.id, 'parent_id', target.parent_id, 'tombstone', true, 'deleted_now', false);
  end if;
  keep_root := target.parent_id is null and exists (select 1 from public.qt_comments r where r.parent_id = target.id);
  if keep_root then
    update public.qt_comments set body = '', deleted_at = now() where id = target.id;
  else
    delete from public.qt_comments where id = target.id;
  end if;
  if target.parent_id is not null then
    select count(*) into remaining_replies from public.qt_comments r where r.parent_id = target.parent_id and r.deleted_at is null;
  else
    select count(*) into remaining_replies from public.qt_comments r where r.parent_id = target.id and r.deleted_at is null;
  end if;
  return jsonb_build_object('id', target.id, 'parent_id', target.parent_id, 'tombstone', keep_root,
    'deleted_now', true, 'reply_count', remaining_replies);
end;
$$;

-- Feed totals include replies, exclude deleted root placeholders.
create or replace function public.get_qt_shared_comment_counts(p_qt_ids uuid[])
returns table (qt_id uuid, comment_count bigint)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if cardinality(p_qt_ids) > 200 then
    raise exception 'At most 200 Reflection IDs may be counted' using errcode = '22023';
  end if;
  return query with accessible as materialized (
    select distinct requested.id as qt_id from unnest(p_qt_ids) requested(id)
    where requested.id is not null and public.can_access_qt_comment_thread(requested.id)
  )
  select a.qt_id, count(c.id) from accessible a
    left join public.qt_comments c on c.qt_id = a.qt_id and c.deleted_at is null group by a.qt_id;
end;
$$;

revoke all on function public.get_qt_comment_stats(uuid[]) from public, anon, authenticated;
revoke all on function public.get_qt_comment_page(uuid,uuid,timestamptz,uuid) from public, anon, authenticated;
revoke all on function public.set_qt_comment_like(uuid,boolean) from public, anon, authenticated;
revoke all on function public.delete_qt_comment(uuid) from public, anon, authenticated;
grant execute on function public.get_qt_comment_stats(uuid[]), public.get_qt_comment_page(uuid,uuid,timestamptz,uuid),
  public.set_qt_comment_like(uuid,boolean), public.delete_qt_comment(uuid) to authenticated, service_role;

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.qt_comment_likes'::regclass)
    or has_table_privilege('anon', 'public.qt_comment_likes', 'SELECT')
    or has_table_privilege('authenticated', 'public.qt_comment_likes', 'UPDATE')
    or has_column_privilege('authenticated', 'public.qt_comments', 'parent_id', 'UPDATE')
    or has_function_privilege('anon', 'public.delete_qt_comment(uuid)', 'EXECUTE')
    or exists (select 1 from pg_proc where oid in (
      'public.get_qt_comment_stats(uuid[])'::regprocedure,
      'public.get_qt_comment_page(uuid,uuid,timestamptz,uuid)'::regprocedure,
      'public.set_qt_comment_like(uuid,boolean)'::regprocedure,
      'public.delete_qt_comment(uuid)'::regprocedure
    ) and prosecdef)
  then raise exception 'Postcheck failed: comment reply/like permissions differ from the expected boundary';
  end if;
end;
$$;
notify pgrst, 'reload schema';
commit;

-- Expected one row with all five values true. Safe to run the whole file again.
select
  exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'qt_comments' and column_name = 'parent_id') as replies_ready,
  (select relrowsecurity from pg_class where oid = 'public.qt_comment_likes'::regclass) as likes_rls_enabled,
  not has_table_privilege('anon', 'public.qt_comment_likes', 'SELECT') as anonymous_read_blocked,
  not has_column_privilege('authenticated', 'public.qt_comments', 'parent_id', 'UPDATE') as reply_parent_change_blocked,
  not (select prosecdef from pg_proc where oid = 'public.delete_qt_comment(uuid)'::regprocedure) as sharing_rls_preserved;
