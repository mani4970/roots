# Roots 1.6 Push Notifications Plan

Date: 2026-06-23
Branch: `feature/roots-1.6`
Status: planning/design only

## Purpose

Roots 1.6 notifications should support real phone push notifications for faith-partner and group activity, similar to a message notification on the lock screen / notification shade.

This is different from the existing local reminders. Existing local reminders are device-scheduled reminders for:

- morning Bible Reflection
- evening incomplete Bible Reflection reminder
- prayer reminder

The 1.6 push notification work is for another user's activity:

- a faith partner shares a Bible Reflection
- a faith partner shares a prayer request
- a faith partner marks a prayer request answered
- a group member shares a Bible Reflection to a joined group
- a group member shares a prayer request to a joined group
- a group member marks a prayer request answered in a joined group

## Non-negotiables

Do not change these while implementing push notifications:

- Bible Reflection completion / progress / streak logic
- `qt_records` completion criteria
- `daily_checkins`
- `profiles` progress/streak columns or functions
- garden / Peace Ark reward-map progress logic
- group challenge progress or award RPCs
- `claim_group_challenge_award`
- `get_group_invite`
- photo reflection storage behavior
- community feed visibility behavior
- full community/global notification behavior

Do not send whole-community push notifications in 1.6.

## Current code audit

Current package state:

- Installed: `@capacitor/local-notifications`
- Not installed yet: `@capacitor/push-notifications`

Current local notification files:

- `lib/localNotifications.ts`
- `components/NotificationSettingsModal.tsx`
- `components/NotificationBridge.tsx`
- `app/layout.tsx` mounts `NotificationBridge`

Current native state:

- Android already has `POST_NOTIFICATIONS` permission.
- Android already has a small notification icon for local reminders: `ic_stat_roots_notification`.
- Android does not include `google-services.json` in the repository, and it must remain excluded from git/safe zips.
- iOS entitlements currently include Associated Domains only; Push Notifications capability is not yet present in `App.entitlements`.
- iOS `AppDelegate.swift` currently does not contain the Capacitor push registration forwarding methods.

Current Supabase state:

- No `supabase/functions` folder exists yet in the project.
- Supabase cleanup 1st pass is complete through files 42-49.
- Future new public tables must include explicit GRANTs, RLS enabled, and policies.

## Recommended implementation phases

### Phase 0 — planning and wording

Complete before touching app/native code.

- Confirm push notification event types.
- Confirm Korean wording first.
- Decide how notification wording is stored separately from general UI i18n.
- Decide whether to include sender name in the push title/body.
- Decide whether group name should appear in title or body.
- Decide settings structure.

### Phase 1 — database foundation

Add a migration for new notification-related tables only.

Recommended tables:

1. `public.notification_preferences`
2. `public.notification_push_tokens`
3. `public.notifications`

Important migration rules:

- explicit GRANTs included
- RLS enabled
- authenticated policies only where needed
- service_role grants for Edge Function / server-side delivery
- no anon table grants

Suggested `notification_preferences` shape:

- `user_id uuid primary key references public.profiles(id) on delete cascade`
- `push_enabled boolean not null default true`
- `group_notifications_enabled boolean not null default true`
- `partner_notifications_enabled boolean not null default true`
- `group_qt_enabled boolean not null default true`
- `group_prayer_enabled boolean not null default true`
- `group_answered_prayer_enabled boolean not null default true`
- `partner_qt_enabled boolean not null default true`
- `partner_prayer_enabled boolean not null default true`
- `partner_answered_prayer_enabled boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Suggested `notification_push_tokens` shape:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `platform text not null check (platform in ('ios', 'android'))`
- `token text not null`
- `device_id text null`
- `enabled boolean not null default true`
- `last_seen_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique constraint on `(user_id, token)`

Suggested `notifications` shape:

- `id uuid primary key default gen_random_uuid()`
- `recipient_id uuid not null references public.profiles(id) on delete cascade`
- `actor_id uuid null references public.profiles(id) on delete set null`
- `type text not null`
- `scope text not null check (scope in ('group', 'partner'))`
- `group_id uuid null references public.groups(id) on delete cascade`
- `companion_user_id uuid null references public.profiles(id) on delete cascade`
- `qt_record_id uuid null references public.qt_records(id) on delete cascade`
- `prayer_item_id uuid null references public.prayer_items(id) on delete cascade`
- `title text not null`
- `body text not null`
- `deep_link text not null`
- `push_status text not null default 'pending'`
- `pushed_at timestamptz null`
- `push_error text null`
- `read_at timestamptz null`
- `created_at timestamptz not null default now()`

Recommended RLS:

- Users can select only rows where `recipient_id = auth.uid()`.
- Users can update only their own `read_at`.
- Users should not directly insert arbitrary notification rows from the client.
- Notification rows should be inserted by a controlled RPC or service_role process.
- Push tokens: users can select/insert/update/delete only their own tokens.
- Preferences: users can select/insert/update only their own preferences.

### Phase 2 — notification wording storage

Do not mix push notification templates into the large general UI `lib/i18n.ts` unless implementation constraints force it.

Recommended approach for 1.6:

- Keep notification templates in a dedicated notification template registry.
- Suggested app-side path: `lib/notifications/templates.ts` or `lib/notificationTemplates.ts`.
- Use stable event keys such as `group_qt_shared`, `group_prayer_shared`, etc.
- Store four language variants per event key: `ko`, `de`, `en`, `fr`.
- Support variable interpolation for `{groupName}` and `{name}`.

Why separate templates are preferred:

- Push notifications are generated server-side or by a controlled notification helper, not only by React UI.
- The existing `lib/i18n.ts` is already large and UI-oriented.
- Notification copy needs title/body pairs, event keys, deep-link metadata, and fallback behavior.
- Notification templates may need to be reused by an Edge Function later.

Possible future option:

- If notification wording needs to be editable without app/web redeploys, create a `notification_templates` table later.
- Do not add that table in the first implementation unless truly needed, because it adds another GRANT/RLS/policy surface.
- For the first safe implementation, a dedicated code template registry is simpler and lower risk.

### Phase 3 — native push setup

Add the Capacitor Push Notifications plugin and native configuration.

Expected files likely touched in this phase:

- `package.json`
- `package-lock.json`
- `capacitor.config.ts`
- `components/NotificationBridge.tsx` or a new `PushNotificationBridge.tsx`
- new `lib/pushNotifications.ts`
- `components/NotificationSettingsModal.tsx`
- iOS native config for Push Notifications capability / AppDelegate forwarding
- Android native config for FCM default icon/channel if needed

Files that must not be committed:

- `google-services.json`
- `GoogleService-Info.plist`
- `.env*`
- keys / certs / provisioning files
- build outputs

Native setup reminders:

- Android requires Firebase Cloud Messaging configuration through `google-services.json`, but the file must stay local and gitignored.
- iOS requires Push Notifications capability and AppDelegate forwarding for Capacitor push registration.
- Real device QA is required for both Android and iOS.

### Phase 4 — notification creation

Preferred safe approach:

- After a share save succeeds, call a controlled notification helper/RPC.
- Notification creation must be best-effort: if notification creation fails, the Bible Reflection/prayer save must not be rolled back.
- Do not change the completion/progress/streak path.
- Do not block the completion popup or reward map action on push notification delivery.

Potential event sources:

- `app/qt/write/page.tsx` after final share save
- `app/qt/photo/page.tsx` after photo reflection share save
- `app/qt/record/page.tsx` after past reflection share update
- `app/prayer/page.tsx` after prayer share save and answered prayer testimony save
- `app/page.tsx` after home prayer request share save

Safer order:

1. Notification DB tables and settings.
2. Notification wording template registry.
3. Push token registration.
4. Insert notification rows for selected recipients.
5. Only after DB rows work, add Edge Function / push delivery.

### Phase 5 — push delivery

Recommended delivery path:

- `notifications` row inserted
- Supabase Database Webhook or explicit Edge Function invocation calls push delivery
- Edge Function reads recipient push tokens with service_role
- Edge Function sends FCM/APNs-compatible push payload
- delivery result updates `notifications.push_status`, `pushed_at`, `push_error`

Push delivery must not depend on the client remaining open.

### Phase 6 — notification tap routing

Expected deep links:

- group Bible Reflection: `/community?tab=groups&group=<groupId>&item=<qtRecordId>` or existing equivalent route/state
- group prayer: `/community?tab=groups&group=<groupId>&prayer=<prayerItemId>` or existing equivalent route/state
- partner Bible Reflection: `/community?tab=partners&partner=<partnerId>&item=<qtRecordId>` or existing equivalent route/state
- partner prayer: `/community?tab=partners&partner=<partnerId>&prayer=<prayerItemId>` or existing equivalent route/state

Do not invent deep links until current community route/state handling is inspected and tested.

## Notification event types

Recommended internal type values:

- `group_qt_shared`
- `group_prayer_shared`
- `group_prayer_answered`
- `partner_qt_shared`
- `partner_prayer_shared`
- `partner_prayer_answered`

Do not include whole-community types in 1.6.

## Korean wording — current preferred draft

These Korean source strings are finalized for the first 1.6 push notification implementation. German, English, and French should be translated from these source strings.

### Group Bible Reflection

- Title: `{groupName}에 새 말씀 묵상이 올라왔어요`
- Body: `축복하러 가볼까요?`

### Group prayer request

- Title: `{groupName}에 함께 기도할 제목이 있어요`
- Body: `중보하러 가볼까요?`

### Group answered prayer

- Title: `{groupName}에 응답된 기도 소원이 있어요!`
- Body: `함께 축복하러 가요!`

### Partner Bible Reflection

- Title: `{name}님이 말씀 묵상을 나눴어요`
- Body: `축복하러 가볼까요?`

### Partner prayer request

- Title: `{name}님이 기도 제목을 나눴어요`
- Body: `함께 기도해볼까요?`

### Partner answered prayer

- Title: `{name}님의 기도 응답이 있어요`
- Body: `함께 감사하고 축복해요!`

## Settings wording candidates

Settings should stay warm and simple.

Potential Korean labels:

- `동역자 알림`
- `그룹 알림`
- `말씀 묵상 알림`
- `기도 제목 알림`
- `기도 응답 알림`

Potential explanation:

- `동역자와 그룹에서 나누는 말씀 묵상과 기도 소식을 알려드릴게요.`

## QA checklist

Database / security:

- New tables include explicit GRANTs.
- RLS is enabled on all new tables.
- `anon` has no access to notification tables.
- Users can only read their own notifications and tokens.
- Users cannot insert arbitrary notifications for other users.

Core app:

- Bible Reflection completion still increments progress immediately after final save.
- Prayer sharing still saves correctly.
- Completion popup and reward map action still appear in the existing order.
- Group challenge progress and badge awards still work.
- Community feed still loads.
- Partner and group feeds still load.

Push behavior:

- Android token registration works on real device.
- iOS token registration works on real device.
- Push is received when the app is backgrounded.
- Push is received when the app is closed.
- Notification tap routes to the intended group/partner/prayer/reflection area.
- Disabled settings prevent sending relevant notifications.
- Actor does not receive a push for their own shared item.
- Duplicate recipients do not receive duplicate notifications for one share.

## Implementation discipline

Implement in small patches only.

Recommended order:

1. Confirm template storage strategy and translate finalized Korean wording into German, English, and French.
2. Add notification database migration with GRANT/RLS/policies.
3. Add app UI/settings for notification preferences.
4. Add push plugin and token registration.
5. Add notification row creation for one event type only first.
6. Add push delivery for one event type only first.
7. Expand event types after QA.
8. Add tap routing only after deep-link route behavior is confirmed.

Do not combine Supabase cleanup, native push setup, notification row creation, and deep-link routing in one large patch.
