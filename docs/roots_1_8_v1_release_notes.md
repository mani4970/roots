# Roots 1.8 v1 release notes

Date: 2026-07-02  
Production baseline: `main` after Roots 1.8 v1 and invite landing hotfix  
Native build status: no new iOS build / Android AAB required for this release checkpoint

## Summary

Roots 1.8 v1 adds the first **Love Hearts** reward layer and completes the invite landing UX/UI cleanup.

The release keeps Bible Reflection progress untouched. Love Hearts are a separate encouragement layer for users who bless others, pray with others, and give thanks for answered prayer.

```text
말씀동행 / progress / garden / ark
= Bible Reflection completion only

Love Hearts
= blessing, intercession, and gratitude interactions
```

## Completed in 1.8 v1

### 1. Love Hearts foundation

Added a separate wallet + ledger model:

```text
public.love_heart_wallets
public.love_heart_events
public.award_love_heart_once(text, uuid)
```

Implemented client helper:

```text
lib/loveHearts.ts
```

Key behavior:

- The acting user earns the heart.
- The post owner does not receive hearts from other people reacting.
- Self-reward is blocked in the server-side RPC.
- Duplicate reward is blocked by `(user_id, source_type, source_id)`.
- No historical backfill in the MVP.
- `balance` is spendable later.
- `lifetime_earned` stays as the historical total.

### 2. Love Hearts interaction sources

Current Love Heart sources:

```text
qt_reaction
prayer_intercession
answered_prayer_gratitude
```

Mapped to existing community actions:

```text
Bible Reflection reaction
→ user leaves a blessing on another user's shared reflection
→ 축복의 마음을 남겼어요 💛 +1

Prayer request intercession
→ user commits to pray for another user's prayer request
→ 중보기도 결단했어요 💛 +1

Answered prayer gratitude
→ user gives thanks together for an answered prayer testimony
→ 함께 감사했어요 💛 +1
```

### 3. Love Hearts profile display

Profile now shows a compact heart balance near the user's profile identity area:

```text
💛 +N
```

This should remain visually smaller than the main faith journey stats.

### 4. Love Hearts intro popup

Added account-specific app-open intro popup:

```text
하트를 모아보세요! 💛
```

Important product decision:

- The popup should explain how hearts are earned.
- It may hint that hearts will matter later.
- It must not reveal a full shop/customization economy too early.

Current direction:

```text
모아둔 하트는 앞으로의 특별한 여정에 쓰일 거예요.
```

### 5. Invite landing UX/UI hotfix

The invite landing flow was cleaned up after 1.8 v1.

Completed direction:

```text
Group invite
→ /join?group=<group_id>
→ warm invite-aware landing page
→ signup/login if needed
→ join group

Faith partner invite
→ /companions?invite=<user_id>
→ invite-aware landing section
→ signup/login if needed
→ accept companion flow
```

Language behavior:

```text
lang query parameter
→ saved app language
→ browser language
→ ko fallback
```

Language switcher:

```text
KO / EN / DE / FR
```

Text was split into a feature-specific file:

```text
lib/inviteLandingText.ts
```

### 6. Feature text split

1.8 follows the new rule that feature-specific copy should not be pushed into `lib/i18n.ts` by default.

Confirmed 1.8 text files:

```text
lib/loveHeartText.ts
lib/loveHeartIntroText.ts
lib/inviteLandingText.ts
```

Keep `lib/i18n.ts` for app-wide common text and established shared UI only.

### 7. Supabase post-1.8 audit and cleanup

After 1.8 v1, a Supabase audit-only SQL was added:

```text
supabase/53_supabase_post_1_8_audit.sql
```

It confirmed the post-1.8 foundation and found two small cleanup candidates.

A minimal follow-up cleanup was added and run:

```text
supabase/54_supabase_cleanup_batch7_post_1_8_minimal_execute.sql
```

Completed cleanup:

- Removed admin-like `TRUNCATE`, `REFERENCES`, and `TRIGGER` grants from `authenticated` on:
  - `public.prayer_item_recipients`
  - `public.qt_record_recipients`
- Removed `anon` execute access from:
  - `public.claim_group_challenge_award(uuid)`
- Kept `authenticated` and `service_role` execute access.

This was done because Supabase is moving toward explicit public-schema table grants for Data API access. Roots must keep explicit grants in every new table migration.

## Explicitly not changed

1.8 v1 did not change:

- Bible Reflection completion logic
- `streak_days`
- `total_days`
- `last_checkin`
- garden growth triggers
- Peace Ark growth triggers
- watering flow
- group challenge success logic
- visibility helper functions from the deferred 48 area
- broad default privileges from the deferred 42 area
- native iOS/Android project configuration

## Native build decision

No iOS build or Android AAB was required because the final 1.8 v1 / invite landing / Supabase checkpoint changes were web, SQL, and docs only.

Native builds are only needed when changing native project behavior, Capacitor plugins/config, app icons/splash, permissions, deep link entitlements, native notification behavior, or store-delivered binary code.

## Regression checklist after 1.8 v1

Minimum checks:

```text
1. Login
2. Home loads
3. Bible Reflection completion still updates 말씀동행/progress correctly
4. Watering still appears after completion flow
5. Community reaction awards heart once
6. Prayer intercession awards heart once
7. Answered prayer gratitude awards heart once
8. Profile shows 💛 +N
9. Love Heart intro popup appears once per account
10. Group invite landing works logged out/logged in
11. Faith partner invite landing works logged out/logged in
12. KO/EN/DE/FR invite landing language switcher works
13. Partner-specific reflection sharing still works
14. Partner-specific prayer sharing still works
15. Group challenge badge claim still works for signed-in user
```

## Next work

Recommended next order:

```text
1. Finish 1.8 v1 documentation checkpoint
2. Start 1.8 v2 planning
3. Design heart usage without touching progress/streak
4. Plan map decoration and Rootsman customization
5. Decide if each item requires web-only release or native build/AAB
```
