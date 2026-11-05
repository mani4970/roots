-- Roots 2.2: durable gift push delivery and recipient-only targeted gift lookup.
-- Apply in SQL Editor before deploying this web patch. This never sends a push itself.
-- The gift send RPC, item ownership, Heart charges and progress/rewards stay unchanged.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';

do $$
begin
  if to_regclass('roots_gift_private.gifts') is null
    or to_regclass('public.notification_push_tokens') is null
    or to_regclass('public.notification_preferences') is null
    or to_regclass('public.hidden_community_users') is null then
    raise exception 'Safety stop: existing gift, notification and blocking migrations are required';
  end if;
end $$;

-- The first installation fixes the rollout boundary. Re-running this SQL does
-- not move it or enqueue gifts that were already sent before installation.
create table if not exists roots_gift_private.push_settings (
  singleton boolean primary key default true check (singleton),
  enabled_after timestamptz not null default now()
);
insert into roots_gift_private.push_settings(singleton) values(true) on conflict do nothing;

create table if not exists roots_gift_private.push_jobs (
  gift_id uuid primary key references roots_gift_private.gifts(gift_id) on delete cascade,
  delivery_state text not null default 'pending'
    check(delivery_state in ('pending','working','sent','skipped','failed')),
  attempts integer not null default 0 check(attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  claim_id uuid,
  locked_until timestamptz,
  delivery_error text,
  created_at timestamptz not null default now()
);
create index if not exists heart_shop_gift_push_jobs_queue_idx
  on roots_gift_private.push_jobs(next_attempt_at,created_at,gift_id)
  where delivery_state in ('pending','working');
create index if not exists heart_shop_gifts_created_idx
  on roots_gift_private.gifts(created_at,gift_id);

create table if not exists roots_gift_private.push_deliveries (
  gift_id uuid not null references roots_gift_private.push_jobs(gift_id) on delete cascade,
  token_id uuid not null references public.notification_push_tokens(id) on delete cascade,
  state text not null check(state in ('sent','failed','disabled')),
  error text,
  updated_at timestamptz not null default now(),
  primary key(gift_id,token_id)
);
alter table roots_gift_private.push_settings enable row level security;
alter table roots_gift_private.push_jobs enable row level security;
alter table roots_gift_private.push_deliveries enable row level security;
revoke all on roots_gift_private.push_settings, roots_gift_private.push_jobs,
  roots_gift_private.push_deliveries from public,anon,authenticated,service_role;
grant usage on schema roots_gift_private to service_role;

-- Scanning committed gift records makes delivery durable even if the sender
-- immediately closes the app. No trigger or notification write can fail a gift.
create or replace function roots_gift_private.claim_push_jobs(
  p_sender_id uuid default null,p_request_id uuid default null,p_limit integer default 8
) returns table(id uuid,recipient_id uuid,claim_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if (p_sender_id is null) <> (p_request_id is null) then
    raise exception 'Both sender and request are required for a targeted dispatch' using errcode='22023';
  end if;
  insert into roots_gift_private.push_jobs(gift_id)
    select g.gift_id from roots_gift_private.gifts g
    cross join roots_gift_private.push_settings settings
    where g.created_at >= settings.enabled_after
      and g.created_at > now()-interval '1 day' and g.seen_at is null
      and (p_sender_id is null or (g.sender_id=p_sender_id and g.request_id=p_request_id))
      and not exists(select 1 from roots_gift_private.push_jobs j where j.gift_id=g.gift_id)
    order by g.created_at,g.gift_id limit 500
    on conflict(gift_id) do nothing;

  update roots_gift_private.push_jobs j set delivery_state='failed',claim_id=null,locked_until=null,
    delivery_error='Delivery retry limit reached'
    where j.delivery_state='working' and j.attempts>=6 and j.locked_until<now();

  return query with picked as (
    select j.gift_id from roots_gift_private.push_jobs j
    join roots_gift_private.gifts g on g.gift_id=j.gift_id
    where j.delivery_state in ('pending','working') and j.next_attempt_at<=now()
      and (j.locked_until is null or j.locked_until<now()) and j.attempts<6
      and (p_sender_id is null or (g.sender_id=p_sender_id and g.request_id=p_request_id))
    order by j.next_attempt_at,j.created_at,j.gift_id
    limit least(greatest(coalesce(p_limit,8),1),20) for update of j skip locked
  ), claimed as (
    update roots_gift_private.push_jobs j set delivery_state='working',claim_id=gen_random_uuid(),
      locked_until=now()+interval '3 minutes',attempts=j.attempts+1
      from picked where j.gift_id=picked.gift_id returning j.gift_id,j.claim_id
  ) select claimed.gift_id,g.recipient_id,claimed.claim_id from claimed
    join roots_gift_private.gifts g on g.gift_id=claimed.gift_id;
end $$;

create or replace function roots_gift_private.push_delivery_context(p_id uuid,p_claim uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare g roots_gift_private.gifts; allowed boolean;
begin
  select gift.* into g from roots_gift_private.gifts gift
    join roots_gift_private.push_jobs j on j.gift_id=gift.gift_id
    where j.gift_id=p_id and j.claim_id=p_claim and j.delivery_state='working' and j.locked_until>now();
  if not found then return null; end if;
  allowed=g.seen_at is null and g.created_at>now()-interval '1 day'
    and g.created_at >= (select enabled_after from roots_gift_private.push_settings)
    and coalesce((select push_enabled and group_notifications_enabled and partner_notifications_enabled
      and group_qt_enabled and group_prayer_enabled and group_answered_prayer_enabled
      and partner_qt_enabled and partner_prayer_enabled and partner_answered_prayer_enabled
      and comment_notifications_enabled from public.notification_preferences where user_id=g.recipient_id),true)
    and not exists(select 1 from public.hidden_community_users h where h.blocked_at is not null
      and ((h.user_id=g.recipient_id and h.hidden_user_id=g.sender_id)
        or (h.hidden_user_id=g.recipient_id and h.user_id=g.sender_id)));
  return jsonb_build_object('allowed',allowed,
    'name',(select name from public.profiles where id=g.sender_id),
    'locale',(select preferred_language from public.profiles where id=g.recipient_id),
    'has_sent',exists(select 1 from roots_gift_private.push_deliveries d where d.gift_id=g.gift_id and d.state='sent'),
    'tokens',case when allowed then coalesce((select jsonb_agg(jsonb_build_object(
      'id',t.id,'user_id',t.user_id,'token',t.token,'token_provider',t.token_provider,'enabled',t.enabled
    )) from (select token.* from public.notification_push_tokens token where token.user_id=g.recipient_id and token.enabled
      and not exists(select 1 from roots_gift_private.push_deliveries d
        where d.gift_id=g.gift_id and d.token_id=token.id and d.state in ('sent','disabled'))
      order by token.id limit 9) t),'[]'::jsonb) else '[]'::jsonb end);
end $$;

create or replace function roots_gift_private.record_push_delivery(
  p_id uuid,p_claim uuid,p_token uuid,p_state text,p_error text default null
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_state not in ('sent','failed','disabled') then raise exception 'Invalid delivery state'; end if;
  if not exists(select 1 from roots_gift_private.push_jobs j
    join roots_gift_private.gifts g on g.gift_id=j.gift_id
    join public.notification_push_tokens t on t.user_id=g.recipient_id and t.id=p_token
    where j.gift_id=p_id and j.claim_id=p_claim and j.delivery_state='working' and j.locked_until>now()) then
    return false;
  end if;
  insert into roots_gift_private.push_deliveries(gift_id,token_id,state,error)
    values(p_id,p_token,p_state,left(p_error,300)) on conflict(gift_id,token_id) do update
    set state=excluded.state,error=excluded.error,updated_at=now()
    where push_deliveries.state not in ('sent','disabled');
  if p_state='disabled' then
    update public.notification_push_tokens set enabled=false,updated_at=now() where id=p_token;
  end if;
  return true;
end $$;

create or replace function roots_gift_private.finish_push_job(
  p_id uuid,p_claim uuid,p_state text,p_error text default null
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_state not in ('sent','skipped','pending') then raise exception 'Invalid job state'; end if;
  update roots_gift_private.push_jobs j set
    delivery_state=case when p_state='pending' and j.attempts>=6 then 'failed' else p_state end,
    next_attempt_at=now()+make_interval(secs=>least(3600,60*power(3,least(j.attempts-1,4)))::integer),
    claim_id=null,locked_until=null,delivery_error=left(p_error,300)
    where j.gift_id=p_id and j.claim_id=p_claim and j.delivery_state='working' and j.locked_until>now();
  return found;
end $$;

create or replace function public.claim_heart_shop_gift_push_jobs(
  p_sender_id uuid default null,p_request_id uuid default null,p_limit integer default 8
) returns table(id uuid,recipient_id uuid,claim_id uuid)
language sql security invoker set search_path = '' as $$
  select * from roots_gift_private.claim_push_jobs(p_sender_id,p_request_id,p_limit);
$$;
create or replace function public.get_heart_shop_gift_push_delivery(p_id uuid,p_claim uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select roots_gift_private.push_delivery_context(p_id,p_claim);
$$;
create or replace function public.record_heart_shop_gift_push_delivery(
  p_id uuid,p_claim uuid,p_token uuid,p_state text,p_error text default null
) returns boolean language sql security invoker set search_path = '' as $$
  select roots_gift_private.record_push_delivery(p_id,p_claim,p_token,p_state,p_error);
$$;
create or replace function public.finish_heart_shop_gift_push_job(
  p_id uuid,p_claim uuid,p_state text,p_error text default null
) returns boolean language sql security invoker set search_path = '' as $$
  select roots_gift_private.finish_push_job(p_id,p_claim,p_state,p_error);
$$;

revoke all on function roots_gift_private.claim_push_jobs(uuid,uuid,integer),
  roots_gift_private.push_delivery_context(uuid,uuid),
  roots_gift_private.record_push_delivery(uuid,uuid,uuid,text,text),
  roots_gift_private.finish_push_job(uuid,uuid,text,text),
  public.claim_heart_shop_gift_push_jobs(uuid,uuid,integer),
  public.get_heart_shop_gift_push_delivery(uuid,uuid),
  public.record_heart_shop_gift_push_delivery(uuid,uuid,uuid,text,text),
  public.finish_heart_shop_gift_push_job(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function roots_gift_private.claim_push_jobs(uuid,uuid,integer),
  roots_gift_private.push_delivery_context(uuid,uuid),
  roots_gift_private.record_push_delivery(uuid,uuid,uuid,text,text),
  roots_gift_private.finish_push_job(uuid,uuid,text,text),
  public.claim_heart_shop_gift_push_jobs(uuid,uuid,integer),
  public.get_heart_shop_gift_push_delivery(uuid,uuid),
  public.record_heart_shop_gift_push_delivery(uuid,uuid,uuid,text,text),
  public.finish_heart_shop_gift_push_job(uuid,uuid,text,text) to service_role;

-- A push may target a gift outside the ordinary 25-row Home batch. Only its
-- recipient may look up the still-unconfirmed popup; no gift history is exposed.
create or replace function roots_gift_private.get_pending_heart_shop_gift(p_gift_id uuid)
returns table(gift_id uuid,item_key text,sender_name text)
language sql stable security definer set search_path = '' as $$
  select g.gift_id,g.item_key,p.name::text from roots_gift_private.gifts g
  left join public.profiles p on p.id=g.sender_id
  where g.gift_id=p_gift_id and g.recipient_id=(select auth.uid()) and g.seen_at is null
    and (g.sender_id is null or not roots_comment_private.user_is_blocked(g.sender_id));
$$;
create or replace function public.get_pending_heart_shop_gift(p_gift_id uuid)
returns table(gift_id uuid,item_key text,sender_name text)
language sql stable security invoker set search_path = '' as $$
  select * from roots_gift_private.get_pending_heart_shop_gift(p_gift_id);
$$;
revoke all on function roots_gift_private.get_pending_heart_shop_gift(uuid),
  public.get_pending_heart_shop_gift(uuid) from public,anon,authenticated,service_role;
grant execute on function roots_gift_private.get_pending_heart_shop_gift(uuid),
  public.get_pending_heart_shop_gift(uuid) to authenticated;

commit;

-- Expect true in every column. These checks do not create gifts or send pushes.
select
  (select count(*)=3 and bool_and(c.relrowsecurity) from pg_class c
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='roots_gift_private'
    and c.relname in ('push_settings','push_jobs','push_deliveries')) as gift_push_rls_ready,
  not has_table_privilege('authenticated','roots_gift_private.push_jobs','select,insert,update,delete')
    and not has_table_privilege('anon','roots_gift_private.push_jobs','select,insert,update,delete') as gift_push_private,
  has_function_privilege('service_role','public.claim_heart_shop_gift_push_jobs(uuid,uuid,integer)','execute')
    and not has_function_privilege('authenticated','public.claim_heart_shop_gift_push_jobs(uuid,uuid,integer)','execute')
    and not has_function_privilege('anon','public.claim_heart_shop_gift_push_jobs(uuid,uuid,integer)','execute') as gift_dispatch_server_only,
  has_function_privilege('authenticated','public.get_pending_heart_shop_gift(uuid)','execute')
    and not has_function_privilege('anon','public.get_pending_heart_shop_gift(uuid)','execute') as gift_target_recipient_lookup_ready,
  (select count(*)=1 from roots_gift_private.push_settings) as rollout_boundary_ready;
