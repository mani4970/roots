# Roots 1.8 Love Hearts Reaction Flow Audit

Date: 2026-06-30
Branch: `feature/roots-1.8`
Baseline zip: `roots_safe_feature_roots-1.8_invite_share_preview_check_20260630_1710.zip`

## Purpose

This audit maps the existing community reaction flows that can award Love Hearts.

Love Hearts are earned by the person who blesses, prays, or gives thanks. They are not awarded to the post author.

```text
Reflection reaction -> reacting user earns a heart
Prayer request intercession -> praying user earns a heart
Answered prayer gratitude -> reacting user earns a heart
```

This audit does not change code or database behavior. It only identifies the safest integration points for the next implementation step.

## Non-negotiable boundaries

Do not touch these systems while implementing Love Hearts:

- Bible Reflection progress / `daily_checkins`
- `streak_days` / 말씀동행
- garden / ark reward progression
- group challenge award logic
- community feed visibility rules
- notification delivery logic
- existing reaction semantics

Love Hearts must remain a separate encouragement/cosmetic reward layer.

## Existing reaction surfaces

### 1. Bible Reflection reactions

Current table:

```text
public.qt_reactions
```

Current client path:

```text
app/community/page.tsx
reactToQT(qtId, reactionId)
```

Current behavior observed:

- If the same reaction is tapped again, the row is deleted.
- If there is no previous reaction, the client upserts `{ qt_id, user_id, reaction }`.
- If a different reaction is selected, the row is updated/changed for the same `qt_id + user_id`.
- The existing reaction badge flow already counts rows in `qt_reactions` by `user_id`.

Recommended Love Heart source:

```text
source_type = qt_reaction
source_id = qt_id
user_id = reacting user
```

Toast when newly awarded:

```text
축복의 마음을 남겼어요 💛 +1
```

Important implementation note:

- Award only when the user had no previous reaction for that QT target.
- If the user changes an existing reaction, do not show a new toast.
- The server-side unique constraint on `(user_id, source_type, source_id)` must still protect against duplicate awards.

Self-reward check needed:

- Compare `auth.uid()` with `qt_records.user_id` for the target `qt_id`.
- If same user, return `awarded = false`.

## 2. Prayer request intercession

Current table:

```text
public.user_prayer_logs
```

Current client path:

```text
app/community/page.tsx
prayTogether(id)
```

Current behavior observed:

- The function first checks whether `user_prayer_logs` already has a row for `user_id + prayer_id`.
- If it already exists, the UI marks the prayer as already prayed and returns.
- If not, it inserts `{ user_id, prayer_id }`.
- After insert, it calls `increment_prayer_count(prayer_id)`.
- Existing prayer-together badges already count rows in `user_prayer_logs` by `user_id`.

Recommended Love Heart source:

```text
source_type = prayer_intercession
source_id = prayer_id
user_id = praying user
```

Toast when newly awarded:

```text
중보기도 결단했어요 💛 +1
```

Important implementation note:

- Award only after the `user_prayer_logs` insert succeeds.
- Do not show a Love Heart toast if the row already existed before the tap.
- Do not award again if the RPC is retried.

Self-reward check needed:

- Compare `auth.uid()` with `prayer_items.user_id` for the target `prayer_id`.
- If same user, return `awarded = false`.

## 3. Answered prayer gratitude

Current table:

```text
public.prayer_likes
```

Current client path:

```text
app/community/page.tsx
likeAnsweredPrayer(prayerId)
```

Current behavior observed:

- The client does not proceed if the current user already liked the answered prayer.
- On new click, it inserts `{ prayer_id, user_id }` into `prayer_likes`.
- On success, it updates local like counts.
- `prayer_likes` is also cleaned up in account deletion.

Recommended Love Heart source:

```text
source_type = answered_prayer_gratitude
source_id = prayer_id
user_id = reacting user
```

Toast when newly awarded:

```text
함께 감사했어요 💛 +1
```

Important implementation note:

- Award only after `prayer_likes` insert succeeds.
- Do not award again for duplicate `23505` / already-liked cases.

Self-reward check needed:

- Compare `auth.uid()` with `prayer_items.user_id` for the answered prayer.
- If same user, return `awarded = false`.

## Existing DB/RLS observations

The existing reaction tables already have RLS/policy coverage in earlier migrations:

```text
qt_reactions
user_prayer_logs
prayer_likes
```

The Love Hearts implementation should not relax those policies. It should add a separate award RPC that verifies the existing interaction row before awarding.

## Recommended DB implementation

Add two tables and one RPC.

### `love_heart_wallets`

```text
user_id uuid primary key
balance integer not null default 0
lifetime_earned integer not null default 0
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `love_heart_events`

```text
id uuid primary key default gen_random_uuid()
user_id uuid not null
source_type text not null
source_id uuid not null
amount integer not null default 1
created_at timestamptz not null default now()
unique (user_id, source_type, source_id)
```

Recommended source types:

```text
qt_reaction
prayer_intercession
answered_prayer_gratitude
```

### `award_love_heart_once(p_source_type text, p_source_id uuid)`

The RPC should:

1. Require `auth.uid()`.
2. Verify that the current user has the matching existing interaction row.
3. Verify that the target content is not owned by the current user.
4. Insert one ledger event if it does not already exist.
5. Upsert/increment the wallet only when a new ledger event was inserted.
6. Return the current balance and whether a new heart was awarded.

Recommended response columns:

```text
awarded boolean
balance integer
amount integer
```

## Recommended client integration order

### Phase 1 — DB foundation

- Add `love_heart_wallets`.
- Add `love_heart_events`.
- Add `award_love_heart_once` RPC.
- Include explicit GRANT/RLS/policies.
- No UI changes yet except optional SQL verification.

### Phase 2 — client reward calls

After successful existing interactions:

```text
reactToQT -> award qt_reaction
prayTogether -> award prayer_intercession
likeAnsweredPrayer -> award answered_prayer_gratitude
```

Show toast only when `awarded = true`.

### Phase 3 — profile display

Profile header display:

```text
💛 +12
```

Do not label the main profile UI as `사랑 하트`.

## Open decision before implementation

### Backfill existing interactions?

There are two possible choices:

1. Start Love Hearts from 1.8 release onward.
2. Backfill historical `qt_reactions`, `user_prayer_logs`, and `prayer_likes` into `love_heart_events`.

Recommended MVP decision:

```text
Start from 1.8 release onward.
```

Reason:

- Safer and simpler.
- Avoids unexpected large balances.
- Avoids complex historical self-reward filtering and old visibility edge cases.
- Keeps the first launch understandable.

If the user wants historical credit later, add a separate reviewed backfill migration.

## Next recommended patch

The next safe patch should be a Supabase migration only:

```text
supabase/52_love_hearts_foundation_1_8.sql
```

That migration should create the wallet/event tables and award RPC, but should not modify community UI yet.
