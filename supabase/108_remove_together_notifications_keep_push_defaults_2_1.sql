-- Roots 2.1 remove the Together notification experiment
--
-- Purpose:
-- - Remove the Together notification types, link column, rate-limit ledger,
--   indexes, and constraints introduced with the experiment.
-- - Restore public.notifications to its pre-experiment schema.
-- - Keep the general push notification default-ON change untouched.
--
-- Confirmed before removal:
-- - public.together_notification_sends has 0 rows.
-- - public.notifications has 0 Together notification rows.
--
-- Safety:
-- - Uses explicit dependency removal and does not use CASCADE.
-- - Does not update or delete notification_preferences or push tokens.
-- - Does not touch reflection, progress, streak, rewards, badges, challenges,
--   prayers, groups, companions, profiles, or sharing visibility.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Remove any experiment rows first so the original type constraint can be
-- restored even if this migration runs after a local test notification.
delete from public.notifications
where type in (
  'group_together_reflection',
  'group_together_prayer',
  'partner_together_reflection',
  'partner_together_prayer'
);

alter table public.notifications
  drop constraint if exists notifications_content_target_check,
  drop constraint if exists notifications_type_scope_check,
  drop constraint if exists notifications_type_check,
  drop constraint if exists notifications_together_send_id_fkey;

drop index if exists public.notifications_together_send_idx;

alter table public.notifications
  drop column if exists together_send_id;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'group_qt_shared',
      'group_prayer_shared',
      'group_prayer_answered',
      'partner_qt_shared',
      'partner_prayer_shared',
      'partner_prayer_answered'
    )
  ),
  add constraint notifications_type_scope_check check (
    (
      scope = 'group'
      and type in (
        'group_qt_shared',
        'group_prayer_shared',
        'group_prayer_answered'
      )
      and group_id is not null
      and companion_user_id is null
    )
    or
    (
      scope = 'partner'
      and type in (
        'partner_qt_shared',
        'partner_prayer_shared',
        'partner_prayer_answered'
      )
      and companion_user_id is not null
      and group_id is null
    )
  ),
  add constraint notifications_content_target_check check (
    (
      type in ('group_qt_shared', 'partner_qt_shared')
      and qt_record_id is not null
    )
    or
    (
      type in (
        'group_prayer_shared',
        'group_prayer_answered',
        'partner_prayer_shared',
        'partner_prayer_answered'
      )
      and prayer_item_id is not null
    )
  );

drop table if exists public.together_notification_sends;

commit;

-- Verification:
select
  to_regclass('public.together_notification_sends') is null
    as together_send_table_removed,
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'together_send_id'
  ) as together_send_column_removed,
  not exists (
    select 1
    from public.notifications
    where type in (
      'group_together_reflection',
      'group_together_prayer',
      'partner_together_reflection',
      'partner_together_prayer'
    )
  ) as together_notification_rows_removed;
