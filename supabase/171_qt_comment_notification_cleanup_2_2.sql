-- 171_qt_comment_notification_cleanup_2_2.sql
-- Run after 170, before deploying the matching notification inbox patch.
-- Only comment/reply notification records and their delivery receipts are removed.
-- Reflections, comments, replies, local dates, streak, progress and rewards are untouched.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$ begin
  if to_regclass('public.qt_comment_notifications') is null
    or to_regclass('roots_comment_private.notification_deliveries') is null
    or to_regprocedure('public.claim_qt_comment_notification_jobs(uuid,integer)') is null
    or not exists(select 1 from pg_policies where schemaname='public'
      and tablename='qt_comment_notifications' and policyname='qt_comment_notifications_read')
  then raise exception 'Safety stop: run 170_qt_comment_notifications_2_2.sql first'; end if;
end $$;

-- The page, unread count and notification deep links all use this existing RLS
-- policy, so expired records are unavailable even before the next cleanup run.
-- 168 elapsed hours keeps retention independent of session timezone and DST.
alter policy qt_comment_notifications_read on public.qt_comment_notifications using (
  recipient_id=(select auth.uid())
  and created_at>(select statement_timestamp())-interval '168 hours'
  and roots_comment_private.notification_visible_to_self(qt_id,comment_id)
);

-- This intentionally includes the caller's hidden/older pages, not just the
-- currently visible SELECT-policy rows. There is no recipient parameter and
-- clients receive no direct DELETE permission on the notification table.
create or replace function roots_comment_private.clear_notifications()
returns bigint language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid()); deleted_count bigint;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  delete from public.qt_comment_notifications where recipient_id=current_user_id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end $$;
revoke all on function roots_comment_private.clear_notifications() from public,anon,authenticated;
grant execute on function roots_comment_private.clear_notifications() to authenticated;

create or replace function public.clear_qt_comment_notifications()
returns bigint language sql security invoker set search_path = '' as $$
  select roots_comment_private.clear_notifications();
$$;
revoke all on function public.clear_qt_comment_notifications() from public,anon,authenticated;
grant execute on function public.clear_qt_comment_notifications() to authenticated;

-- A small indexed batch limits lock time and work per existing dispatch run.
-- Deleting a notification cascades only to its private delivery receipts.
create index if not exists qt_comment_notifications_expiry_idx
  on public.qt_comment_notifications(created_at,id);

create or replace function public.prune_qt_comment_notifications()
returns bigint language sql security invoker set search_path = '' as $$
  with expired as (
    select id from public.qt_comment_notifications
    where created_at<=statement_timestamp()-interval '168 hours'
    order by created_at,id limit 500 for update skip locked
  ), removed as (
    delete from public.qt_comment_notifications n using expired e
    where n.id=e.id returning n.id
  ) select count(*) from removed;
$$;
revoke all on function public.prune_qt_comment_notifications() from public,anon,authenticated;
grant execute on function public.prune_qt_comment_notifications() to service_role;

-- Reuse the deployed one-minute dispatcher: cleanup also runs when there are
-- no new comments and needs no new cron, environment variable or extension.
-- The existing delivery lease, retry limit and claim selection stay the same.
create or replace function public.claim_qt_comment_notification_jobs(p_comment_id uuid default null,p_limit integer default 8)
returns setof public.qt_comment_notifications language plpgsql security invoker set search_path = '' as $$
begin
  perform public.prune_qt_comment_notifications();
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
revoke all on function public.claim_qt_comment_notification_jobs(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_qt_comment_notification_jobs(uuid,integer) to service_role;

notify pgrst,'reload schema';
commit;

-- All columns should be true. No notification contents are changed by this check.
select
  to_regprocedure('public.clear_qt_comment_notifications()') is not null as clear_rpc_ready,
  has_function_privilege('authenticated','public.clear_qt_comment_notifications()','EXECUTE')
    and not has_function_privilege('anon','public.clear_qt_comment_notifications()','EXECUTE') as clear_signed_in_only,
  not has_table_privilege('authenticated','public.qt_comment_notifications','DELETE') as no_direct_client_delete,
  exists(select 1 from pg_policies where schemaname='public' and tablename='qt_comment_notifications'
    and policyname='qt_comment_notifications_read' and qual like '%168:%') as seven_day_retention_ready,
  has_function_privilege('service_role','public.prune_qt_comment_notifications()','EXECUTE')
    and not has_function_privilege('authenticated','public.prune_qt_comment_notifications()','EXECUTE')
    and not has_function_privilege('anon','public.prune_qt_comment_notifications()','EXECUTE') as cleanup_server_only,
  position('perform public.prune_qt_comment_notifications()' in
    pg_get_functiondef('public.claim_qt_comment_notification_jobs(uuid,integer)'::regprocedure))>0 as existing_dispatcher_cleans_up,
  to_regclass('public.qt_comment_notifications_expiry_idx') is not null as expiry_index_ready;
