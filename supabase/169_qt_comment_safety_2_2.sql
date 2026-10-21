-- 169_qt_comment_safety_2_2.sql
-- Run after 168, before deploying the matching comment safety UI.
-- Preserves existing comments, including those longer than 500 characters.
-- New comments/replies: 500 Unicode code points. Legacy edits cannot grow.
-- No QT completion, local-date, streak, progress, badge or reward writes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$ begin
  if to_regprocedure('public.delete_qt_comment(uuid)') is null
    or to_regclass('public.hidden_community_users') is null
    or to_regclass('public.content_reports') is null
    or to_regclass('public.content_reports_moderation_queue') is null
    or exists (select 1 from pg_trigger where tgrelid = 'public.qt_comments'::regclass
      and tgname = 'qt_comments_guard_delete' and not tgisinternal)
  then raise exception 'Safety stop: run existing report SQL and 168 first'; end if;
end $$;

-- Keep the existing 2,000-character CHECK so no historical text is rewritten.
-- The existing immutable-routing trigger additionally enforces the new limit.
create or replace function public.guard_qt_comment_write()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare parent public.qt_comments; maximum integer := 500;
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.qt_id is distinct from old.qt_id
      or new.scope is distinct from old.scope or new.scope_id is distinct from old.scope_id
      or new.author_id is distinct from old.author_id or new.created_at is distinct from old.created_at
      or new.parent_id is distinct from old.parent_id or new.deleted_at is distinct from old.deleted_at
    then raise exception 'Comment identity and sharing context cannot be changed' using errcode = '42501'; end if;
    if old.deleted_at is not null then
      raise exception 'A deleted comment cannot be edited or restored' using errcode = '42501';
    end if;
    maximum := greatest(500, char_length(old.body));
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
  if char_length(new.body) > maximum then
    raise exception 'Comment length limit exceeded' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.guard_qt_comment_write() from public, anon, authenticated;

-- Existing author hiding stays as hiding. Only explicit blocking sets blocked_at.
alter table public.hidden_community_users
  add column if not exists blocked_at timestamptz,
  add column if not exists hidden_before_block boolean not null default false;
create index if not exists hidden_community_users_blocked_reverse_idx
  on public.hidden_community_users(hidden_user_id, user_id) where blocked_at is not null;
create index if not exists hidden_community_users_blocked_page_idx
  on public.hidden_community_users(user_id, blocked_at desc, id desc) where blocked_at is not null;

create table if not exists public.qt_comment_hidden_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  comment_id uuid not null references public.qt_comments(id) on delete cascade,
  preview text not null,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, comment_id)
);
create index if not exists qt_comment_hidden_items_user_created_idx
  on public.qt_comment_hidden_items(user_id, created_at desc, id desc);
alter table public.qt_comment_hidden_items enable row level security;
revoke all on public.qt_comment_hidden_items from public, anon, authenticated;
grant select, delete on public.qt_comment_hidden_items to authenticated;
grant insert(comment_id) on public.qt_comment_hidden_items to authenticated;
grant all on public.qt_comment_hidden_items to service_role;
drop policy if exists qt_comment_hidden_read on public.qt_comment_hidden_items;
create policy qt_comment_hidden_read on public.qt_comment_hidden_items for select to authenticated
  using(user_id = (select auth.uid()));
drop policy if exists qt_comment_hidden_insert on public.qt_comment_hidden_items;
create policy qt_comment_hidden_insert on public.qt_comment_hidden_items for insert to authenticated
  with check(user_id = (select auth.uid()));
drop policy if exists qt_comment_hidden_delete on public.qt_comment_hidden_items;
create policy qt_comment_hidden_delete on public.qt_comment_hidden_items for delete to authenticated
  using(user_id = (select auth.uid()));

-- Private lookups return only the caller's filtering decisions. They
-- never return comment text, profile data or another user's block/hidden list.
create schema if not exists roots_comment_private;
revoke all on schema roots_comment_private from public, anon;
grant usage on schema roots_comment_private to authenticated, service_role;
create or replace function roots_comment_private.user_is_blocked(p_other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.hidden_community_users h where h.blocked_at is not null
      and ((h.user_id = (select auth.uid()) and h.hidden_user_id = p_other)
        or (h.hidden_user_id = (select auth.uid()) and h.user_id = p_other))
  );
$$;
create or replace function roots_comment_private.blocked_user_ids()
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(other_id),'{}'::uuid[]) from (
    select h.hidden_user_id as other_id from public.hidden_community_users h
      where h.user_id = (select auth.uid()) and h.blocked_at is not null
    union
    select h.user_id from public.hidden_community_users h
      where h.hidden_user_id = (select auth.uid()) and h.blocked_at is not null
  ) blocked where (select auth.uid()) is not null;
$$;
create or replace function roots_comment_private.hidden_comment_ids()
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(h.comment_id),'{}'::uuid[]) from public.qt_comment_hidden_items h
    where h.user_id = (select auth.uid());
$$;
create or replace function roots_comment_private.parent_is_blocked(p_parent uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists(select 1 from public.qt_comments parent
    where parent.id = p_parent and roots_comment_private.user_is_blocked(parent.author_id));
$$;
revoke all on function roots_comment_private.user_is_blocked(uuid),
  roots_comment_private.blocked_user_ids(), roots_comment_private.hidden_comment_ids(),
  roots_comment_private.parent_is_blocked(uuid) from public, anon, authenticated;
grant execute on function roots_comment_private.user_is_blocked(uuid),
  roots_comment_private.blocked_user_ids(), roots_comment_private.hidden_comment_ids(),
  roots_comment_private.parent_is_blocked(uuid) to authenticated, service_role;

drop policy if exists qt_comments_select_context on public.qt_comments;
create policy qt_comments_select_context on public.qt_comments for select to authenticated using (
  public.can_access_qt_comment_thread(qt_id)
  -- InitPlans load the caller's lists once per statement, not once per row.
  and author_id <> all((select roots_comment_private.blocked_user_ids())::uuid[])
  and id <> all((select roots_comment_private.hidden_comment_ids())::uuid[])
  and (parent_id is null or (
    parent_id <> all((select roots_comment_private.hidden_comment_ids())::uuid[])
    and case when cardinality((select roots_comment_private.blocked_user_ids())) = 0 then true
      else not roots_comment_private.parent_is_blocked(parent_id) end
  ))
);
drop policy if exists qt_comments_insert_own_context on public.qt_comments;
create policy qt_comments_insert_own_context on public.qt_comments for insert to authenticated with check (
  author_id = (select auth.uid()) and public.can_access_qt_comment_thread(qt_id)
  and public.can_access_qt_comment_context(qt_id, scope, scope_id)
  and not exists(select 1 from public.qt_records q where q.id = qt_id
    and roots_comment_private.user_is_blocked(q.user_id))
);

-- Keep the existing bounded page and lazy replies; add only posting eligibility.
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
  ) then raise exception 'Reply thread is no longer accessible' using errcode = '42501'; end if;
  with candidates as materialized (
    select c.* from public.qt_comments c
    where c.qt_id = p_qt_id and c.parent_id is not distinct from p_parent_id
      and (c.deleted_at is null or exists(select 1 from public.qt_comments r where r.parent_id = c.id and r.deleted_at is null))
      and (p_before_created_at is null or (c.created_at,c.id) < (p_before_created_at,p_before_id))
    order by c.created_at desc,c.id desc limit 31
  ), page as materialized (
    select * from candidates order by created_at desc,id desc limit 30
  ), stats as (select * from public.get_qt_comment_stats(array(select id from page)))
  select jsonb_build_object(
    'comments',coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object(
      'like_count',s.like_count,'my_liked',s.my_liked,'reply_count',s.reply_count
    ) order by p.created_at,p.id) from page p join stats s on s.comment_id = p.id),'[]'::jsonb),
    'has_more',(select count(*) > 30 from candidates),
    'comment_count',(select count(*) from public.qt_comments c where c.qt_id = p_qt_id and c.deleted_at is null),
    'can_post',not exists(select 1 from public.qt_records q where q.id = p_qt_id and roots_comment_private.user_is_blocked(q.user_id)),
    'moderation_notice_count',(select count(*) from public.qt_comment_moderation_notices n
      where n.user_id = (select auth.uid()) and n.read_at is null)
  ) into result;
  return result;
end $$;
revoke all on function public.get_qt_comment_page(uuid,uuid,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.get_qt_comment_page(uuid,uuid,timestamptz,uuid) to authenticated, service_role;

create or replace function public.guard_qt_comment_hidden_insert()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare target public.qt_comments;
begin
  select * into target from public.qt_comments where id = new.comment_id and deleted_at is null;
  if not found or target.author_id = (select auth.uid()) then
    raise exception 'Comment is no longer accessible' using errcode = '42501';
  end if;
  new.user_id := (select auth.uid());
  new.preview := left(target.body, 500);
  new.author_id := target.author_id;
  return new;
end $$;
revoke all on function public.guard_qt_comment_hidden_insert() from public, anon, authenticated;
drop trigger if exists qt_comment_hidden_guard on public.qt_comment_hidden_items;
create trigger qt_comment_hidden_guard before insert on public.qt_comment_hidden_items
  for each row execute function public.guard_qt_comment_hidden_insert();

create or replace function public.set_qt_comment_hidden(p_comment_id uuid, p_hidden boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_hidden is true then
    if exists(select 1 from public.qt_comment_hidden_items h where h.comment_id = p_comment_id and h.user_id = (select auth.uid())) then return; end if;
    insert into public.qt_comment_hidden_items(comment_id) values(p_comment_id) on conflict do nothing;
  else
    delete from public.qt_comment_hidden_items where user_id = (select auth.uid()) and comment_id = p_comment_id;
  end if;
end $$;

create or replace function public.set_qt_comment_user_block(p_user_id uuid, p_blocked boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null or p_user_id is null or p_user_id = (select auth.uid()) then
    raise exception 'Invalid block target' using errcode = '42501';
  end if;
  if p_blocked is true then
    insert into public.hidden_community_users(user_id, hidden_user_id, blocked_at, hidden_before_block)
      values((select auth.uid()), p_user_id, now(), false)
      on conflict(user_id, hidden_user_id) do update set
        hidden_before_block = case when hidden_community_users.blocked_at is null then true else hidden_community_users.hidden_before_block end,
        blocked_at = coalesce(hidden_community_users.blocked_at, excluded.blocked_at);
  else
    delete from public.hidden_community_users where user_id = (select auth.uid()) and hidden_user_id = p_user_id
      and blocked_at is not null and not hidden_before_block;
    update public.hidden_community_users set blocked_at = null, hidden_before_block = false
      where user_id = (select auth.uid()) and hidden_user_id = p_user_id and blocked_at is not null;
  end if;
end $$;

-- A dedicated report table leaves the existing QT/prayer report path unchanged.
-- No comment FK: a limited report snapshot survives subsequent edit/deletion.
create table if not exists public.qt_comment_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  comment_id uuid not null,
  qt_id uuid not null,
  parent_id uuid,
  reported_user_id uuid references auth.users(id) on delete set null,
  body_snapshot text not null,
  reason text not null check(reason in ('harassment','hate','spam','privacy','illegal','other')),
  details text not null default '' check(char_length(details) <= 1000),
  reporter_name text not null default '' check(char_length(reporter_name) <= 100),
  contact_email text not null default '' check(char_length(contact_email) <= 254),
  good_faith boolean not null check(good_faith),
  lang text not null default 'en' check(lang in ('ko','en','de','fr','es')),
  status text not null default 'open' check(status in ('open','resolved')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  moderation_action text,
  review_message text,
  unique(reporter_id, comment_id)
);
create index if not exists qt_comment_reports_user_created_idx on public.qt_comment_reports(reporter_id, created_at desc, id desc);
create index if not exists qt_comment_reports_open_idx on public.qt_comment_reports(created_at, id) where status = 'open';
alter table public.qt_comment_reports enable row level security;
revoke all on public.qt_comment_reports from public, anon, authenticated;
grant select on public.qt_comment_reports to authenticated;
grant insert(comment_id,reason,details,reporter_name,contact_email,good_faith,lang) on public.qt_comment_reports to authenticated;
grant all on public.qt_comment_reports to service_role;
drop policy if exists qt_comment_reports_read_own on public.qt_comment_reports;
create policy qt_comment_reports_read_own on public.qt_comment_reports for select to authenticated using(reporter_id = (select auth.uid()));
drop policy if exists qt_comment_reports_insert_own on public.qt_comment_reports;
create policy qt_comment_reports_insert_own on public.qt_comment_reports for insert to authenticated with check(reporter_id = (select auth.uid()));

create or replace function public.guard_qt_comment_report_insert()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare target public.qt_comments;
begin
  select * into target from public.qt_comments where id = new.comment_id and deleted_at is null;
  if not found or target.author_id = (select auth.uid()) then
    raise exception 'Comment is no longer accessible' using errcode = '42501';
  end if;
  new.reporter_id := (select auth.uid());
  new.qt_id := target.qt_id; new.parent_id := target.parent_id;
  new.reported_user_id := target.author_id; new.body_snapshot := target.body;
  new.details := btrim(new.details); new.reporter_name := btrim(new.reporter_name); new.contact_email := btrim(new.contact_email);
  if new.contact_email <> '' and new.contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid contact email' using errcode = '22023';
  end if;
  return new;
end $$;
revoke all on function public.guard_qt_comment_report_insert() from public, anon, authenticated;
drop trigger if exists qt_comment_report_guard on public.qt_comment_reports;
create trigger qt_comment_report_guard before insert on public.qt_comment_reports
  for each row execute function public.guard_qt_comment_report_insert();

create or replace function public.submit_qt_comment_report(
  p_comment_id uuid, p_reason text, p_details text, p_name text, p_email text, p_good_faith boolean, p_lang text
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare receipt uuid;
begin
  if (select auth.uid()) is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  -- Retry succeeds even when the original request already hid the comment.
  select r.id into receipt from public.qt_comment_reports r
    where r.comment_id = p_comment_id and r.reporter_id = (select auth.uid());
  if found then return receipt; end if;
  begin
    insert into public.qt_comment_reports(comment_id,reason,details,reporter_name,contact_email,good_faith,lang)
      values(p_comment_id,p_reason,coalesce(p_details,''),coalesce(p_name,''),coalesce(p_email,''),p_good_faith,p_lang)
      returning id into receipt;
  exception when unique_violation then
    select r.id into receipt from public.qt_comment_reports r
      where r.comment_id = p_comment_id and r.reporter_id = (select auth.uid());
    if receipt is null then raise; end if;
    return receipt;
  end;
  perform public.set_qt_comment_hidden(p_comment_id, true);
  return receipt;
end $$;

create table if not exists public.qt_comment_moderation_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.qt_comment_reports(id) on delete set null,
  comment_id uuid not null,
  preview text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(report_id, comment_id, user_id)
);
create index if not exists qt_comment_notices_user_created_idx on public.qt_comment_moderation_notices(user_id, created_at desc, id desc);
create index if not exists qt_comment_notices_unread_idx on public.qt_comment_moderation_notices(user_id) where read_at is null;
alter table public.qt_comment_moderation_notices enable row level security;
revoke all on public.qt_comment_moderation_notices from public, anon, authenticated;
grant select on public.qt_comment_moderation_notices to authenticated;
grant update(read_at) on public.qt_comment_moderation_notices to authenticated;
grant all on public.qt_comment_moderation_notices to service_role;
drop policy if exists qt_comment_notices_read on public.qt_comment_moderation_notices;
create policy qt_comment_notices_read on public.qt_comment_moderation_notices for select to authenticated using(user_id = (select auth.uid()));
drop policy if exists qt_comment_notices_ack on public.qt_comment_moderation_notices;
create policy qt_comment_notices_ack on public.qt_comment_moderation_notices for update to authenticated
  using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));

-- SQL Editor / service_role ONLY. This actually removes the reviewed comment,
-- cascades a root's replies/likes, records the result and informs its authors.
-- p_message must explain the action and relevant rule in the user's language.
create or replace function public.review_qt_comment_report(p_report_id uuid, p_action text, p_message text)
returns void language plpgsql security invoker set search_path = '' as $$
declare report public.qt_comment_reports; target public.qt_comments;
begin
  if p_action not in ('remove','dismiss') or p_action is null or char_length(btrim(coalesce(p_message,''))) not between 1 and 2000 then
    raise exception 'Provide remove/dismiss and a reason of 1-2000 characters' using errcode = '22023';
  end if;
  select * into report from public.qt_comment_reports where id = p_report_id for update;
  if not found then raise exception 'Report not found' using errcode = '22023'; end if;
  if report.status <> 'open' then return; end if;
  if p_action = 'remove' then
    select * into target from public.qt_comments where id = report.comment_id for update;
    if found then
      insert into public.qt_comment_moderation_notices(user_id,report_id,comment_id,preview,message)
        select c.author_id,report.id,c.id,left(c.body,500),btrim(p_message)
        from public.qt_comments c where c.id = target.id or c.parent_id = target.id
        on conflict do nothing;
      delete from public.qt_comments where id = target.id;
    end if;
  end if;
  update public.qt_comment_reports set status = 'resolved', reviewed_at = now(),
    moderation_action = case when p_action = 'remove' then 'removed' else 'dismissed' end,
    review_message = btrim(p_message) where id = report.id;
end $$;
revoke all on function public.review_qt_comment_report(uuid,text,text) from public, anon, authenticated;
grant execute on function public.review_qt_comment_report(uuid,text,text) to service_role;

-- Extend the EXISTING operator queue; no report bodies are exposed to app users.
create or replace view public.content_reports_moderation_queue with (security_invoker = true) as
select cr.id as report_id,cr.status,cr.reason,cr.content_type,cr.content_id,cr.reporter_id,
  reporter.name as reporter_name,cr.reported_user_id,reported.name as reported_user_name,
  coalesce(qr.user_id,pi.user_id) as content_owner_id,coalesce(qr.visibility,pi.visibility) as content_visibility,
  case when cr.content_type = 'qt' then left(coalesce(qr.key_verse,qr.summary,''),500)
    when cr.content_type = 'prayer' then left(coalesce(pi.content,''),500) else null end as content_preview,
  cr.created_at,cr.reviewed_at,cr.moderation_action,cr.moderator_note
from public.content_reports cr
left join public.profiles reporter on reporter.id = cr.reporter_id
left join public.profiles reported on reported.id = cr.reported_user_id
left join public.qt_records qr on cr.content_type = 'qt' and qr.id = cr.content_id
left join public.prayer_items pi on cr.content_type = 'prayer' and pi.id = cr.content_id
union all
select cr.id,cr.status,cr.reason,'qt_comment'::text,cr.comment_id,cr.reporter_id,
  reporter.name,cr.reported_user_id,reported.name,cr.reported_user_id,null::text,left(cr.body_snapshot,500),
  cr.created_at,cr.reviewed_at,cr.moderation_action,cr.review_message
from public.qt_comment_reports cr
left join public.profiles reporter on reporter.id = cr.reporter_id
left join public.profiles reported on reported.id = cr.reported_user_id;
revoke all on public.content_reports_moderation_queue from public, anon, authenticated;
grant select on public.content_reports_moderation_queue to service_role;

revoke all on function public.set_qt_comment_hidden(uuid,boolean), public.set_qt_comment_user_block(uuid,boolean),
  public.submit_qt_comment_report(uuid,text,text,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.set_qt_comment_hidden(uuid,boolean), public.set_qt_comment_user_block(uuid,boolean),
  public.submit_qt_comment_report(uuid,text,text,text,text,boolean,text) to authenticated, service_role;

do $$ begin
  if has_table_privilege('anon','public.qt_comment_reports','SELECT')
    or has_table_privilege('authenticated','public.qt_comment_reports','UPDATE')
    or has_column_privilege('authenticated','public.qt_comment_reports','body_snapshot','INSERT')
    or has_function_privilege('authenticated','public.review_qt_comment_report(uuid,text,text)','EXECUTE')
    or has_table_privilege('authenticated','public.content_reports_moderation_queue','SELECT')
    or exists(select 1 from pg_class where oid in ('public.qt_comment_reports'::regclass,
      'public.qt_comment_hidden_items'::regclass,'public.qt_comment_moderation_notices'::regclass) and not relrowsecurity)
  then raise exception 'Postcheck failed: comment safety boundaries are not as expected'; end if;
end $$;
notify pgrst, 'reload schema';
commit;

-- Expected one row: all six values true. Safe to run this whole file again.
select
  (select relrowsecurity from pg_class where oid = 'public.qt_comment_reports'::regclass) as reports_rls_enabled,
  (select relrowsecurity from pg_class where oid = 'public.qt_comment_hidden_items'::regclass) as hidden_rls_enabled,
  (select relrowsecurity from pg_class where oid = 'public.qt_comment_moderation_notices'::regclass) as notices_rls_enabled,
  not has_table_privilege('anon','public.qt_comment_reports','SELECT') as anonymous_reports_blocked,
  not has_function_privilege('authenticated','public.review_qt_comment_report(uuid,text,text)','EXECUTE') as operator_action_protected,
  not has_table_privilege('authenticated','public.content_reports_moderation_queue','SELECT') as operator_queue_protected;

-- OPERATOR REFERENCE ONLY (commented examples; not run by this installer):
-- SQL Editor / Table Editor: public.qt_comment_reports, status = 'open'.
-- The existing content_reports_moderation_queue also includes these reports.
-- Review the snapshot AND the current comment before choosing an action:
-- select r.id, r.reason, r.details, r.lang, r.body_snapshot, c.body as current_body,
--   r.reporter_name, r.contact_email, r.created_at
-- from public.qt_comment_reports r
-- left join public.qt_comments c on c.id = r.comment_id
-- where r.status = 'open' order by r.created_at, r.id;
-- Replace the UUID and explanation with the actual reviewed case:
-- select public.review_qt_comment_report('REPORT-UUID-HERE'::uuid, 'remove',
--   'Explain the specific violated rule and reason. Appeals: support@christian-roots.com');
-- Use 'dismiss' instead of 'remove' to keep the comment after review.
