-- 170_qt_comment_notifications_2_2.sql
-- Run after 169, before deploying the matching comment notification patch.
-- New comments only; no historical notification backfill. No reflection,
-- local-date, streak, progress, prayer, badge, reward or existing push writes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$ begin
  if to_regprocedure('public.get_qt_comment_page(uuid,uuid,timestamptz,uuid)') is null
    or to_regclass('public.qt_comment_hidden_items') is null
    or to_regclass('public.notification_preferences') is null
    or to_regclass('public.notification_push_tokens') is null
  then raise exception 'Safety stop: run 169 and the existing notification SQL first'; end if;
end $$;

alter table public.notification_preferences
  add column if not exists comment_notifications_enabled boolean not null default true;

create table if not exists public.qt_comment_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  qt_id uuid not null references public.qt_records(id) on delete cascade,
  comment_id uuid not null references public.qt_comments(id) on delete cascade,
  kind text not null check(kind in ('comment','reply')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  delivery_state text not null default 'pending' check(delivery_state in ('pending','working','sent','skipped','failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  claim_id uuid,
  locked_until timestamptz,
  delivery_error text,
  unique(recipient_id,comment_id),
  check(recipient_id <> actor_id)
);
create index if not exists qt_comment_notifications_page_idx
  on public.qt_comment_notifications(recipient_id,created_at desc,id desc);
create index if not exists qt_comment_notifications_unread_idx
  on public.qt_comment_notifications(recipient_id,created_at desc) where read_at is null;
create index if not exists qt_comment_notifications_queue_idx
  on public.qt_comment_notifications(next_attempt_at,created_at) where delivery_state in ('pending','working');

-- Internal recipient checks run without changing JWT claims or session timezones.
-- No client may ask these helpers about another user's sharing or hidden lists.
create or replace function roots_comment_private.can_receive_notification(p_user uuid,p_qt uuid,p_comment uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user is not null and exists (
    select 1 from public.qt_records q join public.qt_comments c on c.qt_id=q.id
    where q.id=p_qt and c.id=p_comment and not q.is_draft and c.deleted_at is null
      and c.author_id <> p_user
      and (c.parent_id is null or exists(select 1 from public.qt_comments p where p.id=c.parent_id and p.deleted_at is null))
      and (q.user_id=p_user
        or 'all'=any(string_to_array(replace(coalesce(q.visibility,''),' ',''),','))
        or exists(select 1 from public.group_members m where m.user_id=p_user
          and ('group_'||m.group_id::text)=any(string_to_array(replace(coalesce(q.visibility,''),' ',''),',')))
        or exists(select 1 from public.qt_record_recipients r join public.companions co
          on co.status='accepted' and ((co.requester_id=q.user_id and co.receiver_id=p_user)
            or (co.receiver_id=q.user_id and co.requester_id=p_user))
          where r.qt_record_id=q.id and r.owner_id=q.user_id and r.recipient_id=p_user))
      and not exists(select 1 from public.qt_comment_hidden_items h
        where h.user_id=p_user and h.comment_id in (c.id,c.parent_id))
      and not exists(select 1 from public.hidden_community_items h
        where h.user_id=p_user and h.content_type='qt' and h.content_id=q.id)
      and not exists(select 1 from public.hidden_community_users h where
        (h.user_id=p_user and h.hidden_user_id in (c.author_id,q.user_id))
        or (h.blocked_at is not null and h.hidden_user_id=p_user and h.user_id in (c.author_id,q.user_id)))
      and not exists(select 1 from public.qt_comments p join public.hidden_community_users h
        on h.blocked_at is not null and ((h.user_id=p_user and h.hidden_user_id=p.author_id)
          or (h.hidden_user_id=p_user and h.user_id=p.author_id)) where p.id=c.parent_id)
  );
$$;
revoke all on function roots_comment_private.can_receive_notification(uuid,uuid,uuid) from public,anon,authenticated;

create or replace function roots_comment_private.notification_visible_to_self(p_qt uuid,p_comment uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and roots_comment_private.can_receive_notification((select auth.uid()),p_qt,p_comment);
$$;
revoke all on function roots_comment_private.notification_visible_to_self(uuid,uuid) from public,anon,authenticated;
grant execute on function roots_comment_private.notification_visible_to_self(uuid,uuid) to authenticated;

alter table public.qt_comment_notifications enable row level security;
revoke all on public.qt_comment_notifications from public,anon,authenticated;
grant select on public.qt_comment_notifications to authenticated;
grant all on public.qt_comment_notifications to service_role;
drop policy if exists qt_comment_notifications_read on public.qt_comment_notifications;
create policy qt_comment_notifications_read on public.qt_comment_notifications for select to authenticated using (
  recipient_id=(select auth.uid()) and roots_comment_private.notification_visible_to_self(qt_id,comment_id)
);

-- Only INSERT creates events. A reply addresses the reflection owner and root
-- author, with set-based deduplication and the writer excluded.
create or replace function roots_comment_private.enqueue_comment_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; root_author uuid;
begin
  select q.user_id into owner_id from public.qt_records q where q.id=new.qt_id;
  if new.parent_id is not null then
    select p.author_id into root_author from public.qt_comments p where p.id=new.parent_id;
  end if;
  insert into public.qt_comment_notifications(recipient_id,actor_id,qt_id,comment_id,kind,created_at)
  select candidate,new.author_id,new.qt_id,new.id,
    case when new.parent_id is not null and candidate=root_author then 'reply' else 'comment' end,new.created_at
  from (select owner_id as candidate union select root_author) recipients
  where candidate is not null and candidate <> new.author_id
    and roots_comment_private.can_receive_notification(candidate,new.qt_id,new.id)
  on conflict(recipient_id,comment_id) do nothing;
  return new;
end $$;
revoke all on function roots_comment_private.enqueue_comment_notifications() from public,anon,authenticated;
drop trigger if exists qt_comments_enqueue_notifications on public.qt_comments;
create trigger qt_comments_enqueue_notifications after insert on public.qt_comments
  for each row execute function roots_comment_private.enqueue_comment_notifications();

create table if not exists roots_comment_private.notification_deliveries (
  notification_id uuid not null references public.qt_comment_notifications(id) on delete cascade,
  token_id uuid not null references public.notification_push_tokens(id) on delete cascade,
  state text not null check(state in ('sent','failed','disabled')),
  error text,
  updated_at timestamptz not null default now(),
  primary key(notification_id,token_id)
);
alter table roots_comment_private.notification_deliveries enable row level security;
revoke all on roots_comment_private.notification_deliveries from public,anon,authenticated;
grant all on roots_comment_private.notification_deliveries to service_role;

create or replace function public.get_qt_comment_notification_unread_count()
returns bigint language sql stable security invoker set search_path = '' as $$
  select count(*) from public.qt_comment_notifications where recipient_id=(select auth.uid()) and read_at is null;
$$;

create or replace function public.get_qt_comment_notification_page(p_before_at timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if (p_before_at is null) <> (p_before_id is null) then raise exception 'Both cursor fields are required' using errcode='22023'; end if;
  with candidates as materialized (
    select n.*,c.body,c.parent_id from public.qt_comment_notifications n
    join public.qt_comments c on c.id=n.comment_id
    where n.recipient_id=(select auth.uid())
      and (p_before_at is null or (n.created_at,n.id)<(p_before_at,p_before_id))
    order by n.created_at desc,n.id desc limit 31
  ), page as (select * from candidates order by created_at desc,id desc limit 30)
  select jsonb_build_object('rows',coalesce((select jsonb_agg(jsonb_build_object(
    'id',p.id,'qt_id',p.qt_id,'comment_id',p.comment_id,'parent_id',p.parent_id,'actor_id',p.actor_id,
    'kind',p.kind,'created_at',p.created_at,'read_at',p.read_at,'body',p.body
  ) order by p.created_at desc,p.id desc) from page p),'[]'::jsonb),
    'has_more',(select count(*)>30 from candidates)) into result;
  return result;
end $$;

-- Fetch the exact root/reply even when it lies outside the first 30 comments.
-- Every content read below keeps the caller's existing reflection/comment RLS.
create or replace function public.get_qt_comment_notification_focus(p_notification_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare n public.qt_comment_notifications; c public.qt_comments; r public.qt_comments;
  q public.qt_records; context jsonb; route_id uuid; stats jsonb;
begin
  select * into n from public.qt_comment_notifications where id=p_notification_id and recipient_id=(select auth.uid());
  if not found then return null; end if;
  select * into c from public.qt_comments where id=n.comment_id and deleted_at is null;
  if not found then return null; end if;
  select * into r from public.qt_comments where id=coalesce(c.parent_id,c.id) and deleted_at is null;
  if not found then return null; end if;
  select * into q from public.qt_records where id=n.qt_id;
  if not found then return null; end if;
  if public.can_access_qt_comment_context(q.id,'all',null) then
    context=jsonb_build_object('scope','all','scopeId',null);
  else
    select m.group_id into route_id from public.group_members m where m.user_id=(select auth.uid())
      and public.can_access_qt_comment_context(q.id,'group',m.group_id) order by m.group_id limit 1;
    if route_id is not null then context=jsonb_build_object('scope','group','scopeId',route_id);
    else
      select rr.recipient_id into route_id from public.qt_record_recipients rr where rr.qt_record_id=q.id
        and public.can_access_qt_comment_context(q.id,'partner',rr.recipient_id) order by rr.recipient_id limit 1;
      if route_id is not null then context=jsonb_build_object('scope','partner','scopeId',route_id); end if;
    end if;
  end if;
  select coalesce(jsonb_object_agg(s.comment_id::text,to_jsonb(s)),'{}'::jsonb) into stats
    from public.get_qt_comment_stats(array[r.id,c.id]) s;
  return jsonb_build_object('notification_id',n.id,'record',to_jsonb(q),'context',context,
    'root',to_jsonb(r)||coalesce(stats->r.id::text,'{}'::jsonb),
    'target',to_jsonb(c)||coalesce(stats->c.id::text,'{}'::jsonb));
end $$;

-- A read acknowledgement is explicit and idempotent. Clients cannot change
-- recipients, event identity, text, queue state or delivery bookkeeping.
create or replace function roots_comment_private.mark_notification_read(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return false; end if;
  update public.qt_comment_notifications set read_at=coalesce(read_at,now())
    where id=p_id and recipient_id=(select auth.uid())
      and roots_comment_private.notification_visible_to_self(qt_id,comment_id);
  return found;
end $$;
revoke all on function roots_comment_private.mark_notification_read(uuid) from public,anon,authenticated;
grant execute on function roots_comment_private.mark_notification_read(uuid) to authenticated;
create or replace function public.mark_qt_comment_notification_read(p_notification_id uuid)
returns boolean language sql security invoker set search_path = '' as $$
  select roots_comment_private.mark_notification_read(p_notification_id);
$$;

-- Only the server role may claim durable jobs. SKIP LOCKED and a lease token
-- prevent immediate requests and scheduled retries from sending the same job.
create or replace function public.claim_qt_comment_notification_jobs(p_comment_id uuid default null,p_limit integer default 8)
returns setof public.qt_comment_notifications language plpgsql security invoker set search_path = '' as $$
begin
  update public.qt_comment_notifications set delivery_state='failed',claim_id=null,locked_until=null,
    delivery_error='Delivery retry limit reached' where delivery_state='working' and attempts>=6 and locked_until<now();
  return query with picked as (
    select id from public.qt_comment_notifications
    where delivery_state in ('pending','working') and next_attempt_at<=now()
      and (locked_until is null or locked_until<now()) and attempts<6
      and (p_comment_id is null or comment_id=p_comment_id)
    order by next_attempt_at,created_at limit least(greatest(p_limit,1),20) for update skip locked
  ) update public.qt_comment_notifications n set delivery_state='working',claim_id=gen_random_uuid(),
    locked_until=now()+interval '3 minutes',attempts=n.attempts+1
    from picked where n.id=picked.id returning n.*;
end
$$;

create or replace function roots_comment_private.delivery_context(p_id uuid,p_claim uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare n public.qt_comment_notifications; allowed boolean;
begin
  select * into n from public.qt_comment_notifications where id=p_id and claim_id=p_claim
    and delivery_state='working' and locked_until>now();
  if not found then return null; end if;
  allowed=n.read_at is null and roots_comment_private.can_receive_notification(n.recipient_id,n.qt_id,n.comment_id)
    and coalesce((select push_enabled and comment_notifications_enabled from public.notification_preferences
      where user_id=n.recipient_id),true) and n.created_at>now()-interval '1 day';
  return jsonb_build_object('allowed',allowed,'name',(select name from public.profiles where id=n.actor_id),
    'locale',(select preferred_language from public.profiles where id=n.recipient_id),
    'has_sent',exists(select 1 from roots_comment_private.notification_deliveries d where d.notification_id=n.id and d.state='sent'),
    'tokens',case when allowed then coalesce((select jsonb_agg(jsonb_build_object(
      'id',t.id,'user_id',t.user_id,'token',t.token,'token_provider',t.token_provider,'enabled',t.enabled
    )) from (select t.* from public.notification_push_tokens t where t.user_id=n.recipient_id and t.enabled
      and not exists(select 1 from roots_comment_private.notification_deliveries d
        where d.notification_id=n.id and d.token_id=t.id and d.state in ('sent','disabled'))
      order by t.id limit 9) t),'[]'::jsonb) else '[]'::jsonb end);
end $$;
revoke all on function roots_comment_private.delivery_context(uuid,uuid) from public,anon,authenticated;
grant execute on function roots_comment_private.delivery_context(uuid,uuid) to service_role;
create or replace function public.get_qt_comment_notification_delivery(p_id uuid,p_claim uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select roots_comment_private.delivery_context(p_id,p_claim);
$$;

create or replace function roots_comment_private.record_delivery(p_id uuid,p_claim uuid,p_token uuid,p_state text,p_error text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_state not in ('sent','failed','disabled') then raise exception 'Invalid delivery state'; end if;
  if not exists(select 1 from public.qt_comment_notifications n join public.notification_push_tokens t
      on t.user_id=n.recipient_id and t.id=p_token where n.id=p_id and n.claim_id=p_claim
      and n.delivery_state='working' and n.locked_until>now()) then return false; end if;
  insert into roots_comment_private.notification_deliveries(notification_id,token_id,state,error)
    values(p_id,p_token,p_state,left(p_error,300)) on conflict(notification_id,token_id) do update
    set state=excluded.state,error=excluded.error,updated_at=now()
    where notification_deliveries.state not in ('sent','disabled');
  if p_state='disabled' then update public.notification_push_tokens set enabled=false,updated_at=now() where id=p_token; end if;
  return true;
end $$;
revoke all on function roots_comment_private.record_delivery(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function roots_comment_private.record_delivery(uuid,uuid,uuid,text,text) to service_role;
create or replace function public.record_qt_comment_notification_delivery(p_id uuid,p_claim uuid,p_token uuid,p_state text,p_error text default null)
returns boolean language sql security invoker set search_path = '' as $$
  select roots_comment_private.record_delivery(p_id,p_claim,p_token,p_state,p_error);
$$;

create or replace function public.finish_qt_comment_notification_job(p_id uuid,p_claim uuid,p_state text,p_error text default null)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_state not in ('sent','skipped','pending') then raise exception 'Invalid job state'; end if;
  update public.qt_comment_notifications set
    delivery_state=case when p_state='pending' and attempts>=6 then 'failed' else p_state end,
    next_attempt_at=now()+make_interval(secs=>least(3600,60*power(3,least(attempts-1,4)))::integer),
    claim_id=null,locked_until=null,delivery_error=left(p_error,300)
    where id=p_id and claim_id=p_claim and delivery_state='working';
  return found;
end $$;

revoke all on function public.get_qt_comment_notification_unread_count(),
  public.get_qt_comment_notification_page(timestamptz,uuid),public.get_qt_comment_notification_focus(uuid),
  public.mark_qt_comment_notification_read(uuid) from public,anon,authenticated;
grant execute on function public.get_qt_comment_notification_unread_count(),
  public.get_qt_comment_notification_page(timestamptz,uuid),public.get_qt_comment_notification_focus(uuid),
  public.mark_qt_comment_notification_read(uuid) to authenticated;
revoke all on function public.claim_qt_comment_notification_jobs(uuid,integer),
  public.get_qt_comment_notification_delivery(uuid,uuid),
  public.record_qt_comment_notification_delivery(uuid,uuid,uuid,text,text),
  public.finish_qt_comment_notification_job(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_qt_comment_notification_jobs(uuid,integer),
  public.get_qt_comment_notification_delivery(uuid,uuid),
  public.record_qt_comment_notification_delivery(uuid,uuid,uuid,text,text),
  public.finish_qt_comment_notification_job(uuid,uuid,text,text) to service_role;

notify pgrst, 'reload schema';
commit;

select
  (select relrowsecurity from pg_class where oid='public.qt_comment_notifications'::regclass) as notification_rls_enabled,
  not has_table_privilege('anon','public.qt_comment_notifications','SELECT') as anonymous_read_blocked,
  not has_table_privilege('authenticated','public.qt_comment_notifications','INSERT') as client_notification_creation_blocked,
  not has_function_privilege('authenticated','public.claim_qt_comment_notification_jobs(uuid,integer)','EXECUTE') as server_queue_protected,
  exists(select 1 from pg_trigger where tgrelid='public.qt_comments'::regclass and tgname='qt_comments_enqueue_notifications' and not tgisinternal) as new_comment_trigger_ready,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='notification_preferences' and column_name='comment_notifications_enabled') as comment_preference_ready;
