-- Christian Roots 2.2: one switch for group, companion, comment/reply and gift news.
-- Run after 181, before deploying the matching web patch.
-- Preserve any previous opt-out: mixed old choices become one OFF choice.
-- Device-local reflection/prayer reminder settings and times are not stored here.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$ begin
  if to_regclass('public.notification_preferences') is null
    or to_regnamespace('roots_gift_private') is null
    or not exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'notification_preferences'
        and column_name = 'comment_notifications_enabled')
  then raise exception 'Safety stop: run existing notification SQL and 181 first'; end if;
end $$;

-- Keep the existing columns for compatibility with already-open older clients
-- and existing share/nudge/comment delivery checks. All now represent one choice.
create or replace function roots_gift_private.normalize_news_preferences()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_enabled boolean;
begin
  if tg_op = 'UPDATE' and new.push_enabled is distinct from old.push_enabled then
    -- The existing master switch remains usable in older app sessions too.
    v_enabled := new.push_enabled is true;
  else
    v_enabled := new.push_enabled is true
      and new.group_notifications_enabled is true
      and new.partner_notifications_enabled is true
      and new.group_qt_enabled is true
      and new.group_prayer_enabled is true
      and new.group_answered_prayer_enabled is true
      and new.partner_qt_enabled is true
      and new.partner_prayer_enabled is true
      and new.partner_answered_prayer_enabled is true
      and new.comment_notifications_enabled is true;
  end if;
  new.push_enabled := v_enabled;
  new.group_notifications_enabled := v_enabled;
  new.partner_notifications_enabled := v_enabled;
  new.group_qt_enabled := v_enabled;
  new.group_prayer_enabled := v_enabled;
  new.group_answered_prayer_enabled := v_enabled;
  new.partner_qt_enabled := v_enabled;
  new.partner_prayer_enabled := v_enabled;
  new.partner_answered_prayer_enabled := v_enabled;
  new.comment_notifications_enabled := v_enabled;
  return new;
end;
$$;
revoke all on function roots_gift_private.normalize_news_preferences()
  from public, anon, authenticated, service_role;

drop trigger if exists roots_normalize_news_preferences on public.notification_preferences;
create trigger roots_normalize_news_preferences
before insert or update on public.notification_preferences
for each row execute function roots_gift_private.normalize_news_preferences();

with choices as (
  select user_id,
    push_enabled and group_notifications_enabled and partner_notifications_enabled
      and group_qt_enabled and group_prayer_enabled and group_answered_prayer_enabled
      and partner_qt_enabled and partner_prayer_enabled and partner_answered_prayer_enabled
      and comment_notifications_enabled as enabled
  from public.notification_preferences
)
update public.notification_preferences p set
  push_enabled = c.enabled,
  group_notifications_enabled = c.enabled,
  partner_notifications_enabled = c.enabled,
  group_qt_enabled = c.enabled,
  group_prayer_enabled = c.enabled,
  group_answered_prayer_enabled = c.enabled,
  partner_qt_enabled = c.enabled,
  partner_prayer_enabled = c.enabled,
  partner_answered_prayer_enabled = c.enabled,
  comment_notifications_enabled = c.enabled,
  updated_at = now()
from choices c where p.user_id = c.user_id and (
  p.push_enabled is distinct from c.enabled
  or p.group_notifications_enabled is distinct from c.enabled
  or p.partner_notifications_enabled is distinct from c.enabled
  or p.group_qt_enabled is distinct from c.enabled
  or p.group_prayer_enabled is distinct from c.enabled
  or p.group_answered_prayer_enabled is distinct from c.enabled
  or p.partner_qt_enabled is distinct from c.enabled
  or p.partner_prayer_enabled is distinct from c.enabled
  or p.partner_answered_prayer_enabled is distinct from c.enabled
  or p.comment_notifications_enabled is distinct from c.enabled
);

commit;

-- SQL Editor: all columns should be true. Does not send notifications.
select
  not exists (
    select 1 from public.notification_preferences p where
      p.group_notifications_enabled is distinct from p.push_enabled
      or p.partner_notifications_enabled is distinct from p.push_enabled
      or p.group_qt_enabled is distinct from p.push_enabled
      or p.group_prayer_enabled is distinct from p.push_enabled
      or p.group_answered_prayer_enabled is distinct from p.push_enabled
      or p.partner_qt_enabled is distinct from p.push_enabled
      or p.partner_prayer_enabled is distinct from p.push_enabled
      or p.partner_answered_prayer_enabled is distinct from p.push_enabled
      or p.comment_notifications_enabled is distinct from p.push_enabled
  ) as single_news_switch_ready,
  exists (select 1 from pg_trigger where
    tgrelid = 'public.notification_preferences'::regclass
    and tgname = 'roots_normalize_news_preferences' and tgenabled <> 'D'
    and tgfoid = 'roots_gift_private.normalize_news_preferences()'::regprocedure
  ) as normalization_ready,
  (select relrowsecurity from pg_class where
    oid = 'public.notification_preferences'::regclass) as preference_rls_enabled,
  not has_table_privilege('anon', 'public.notification_preferences', 'select,insert,update,delete')
    as no_anon_access,
  not has_function_privilege('anon', 'roots_gift_private.normalize_news_preferences()', 'execute')
    and not has_function_privilege('authenticated', 'roots_gift_private.normalize_news_preferences()', 'execute')
    as helper_not_callable;
