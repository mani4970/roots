# Roots 1.8 Love Hearts Plan

Date: 2026-06-29
Branch: `feature/roots-1.8`

## Core idea

Roots 1.8 should introduce a small reward layer called **Love Hearts**.

The reward is not about popularity and not about receiving many reactions.

```text
Love Hearts are earned by the person who blesses, reacts, prays, or gives thanks.
```

This keeps the focus on giving love rather than collecting attention.

## Non-negotiable boundaries

Do not change these systems while implementing Love Hearts:

- Bible Reflection completion progress
- `streak_days`
- `daily_checkins`
- garden / ark growth triggers
- watering flow
- group challenge award logic
- community feed visibility rules
- existing prayer / reflection sharing permissions

Love Hearts must stay separate from the main spiritual routine progress.

```text
말씀동행 / progress / reward map
= Bible Reflection completion only

Love Hearts
= blessing others, praying with others, and responding with gratitude
```

## Existing interaction surfaces

The app already has interaction data that can be reused.

### Bible Reflection reactions

Existing table / code path:

```text
qt_reactions
reactToQT(...)
```

Purpose:

- A user reacts to a shared Bible Reflection.
- The reacting user earns a Love Heart once for that reflection.

Toast copy:

```text
축복의 마음을 남겼어요 💛 +1
```

### Prayer request intercession

Existing table / code path:

```text
user_prayer_logs
prayTogether(...)
```

Purpose:

- A user chooses to pray together for a prayer request.
- The praying user earns a Love Heart once for that prayer request.

Toast copy:

```text
중보기도 결단했어요 💛 +1
```

### Answered prayer gratitude

Existing table / code path:

```text
prayer_likes
likeAnsweredPrayer(...)
```

Purpose:

- A user reacts to an answered prayer testimony with gratitude.
- The reacting user earns a Love Heart once for that answered prayer.

Toast copy:

```text
함께 감사했어요 💛 +1
```

## Recommended naming

Working Korean name:

```text
사랑 하트
```

Why:

- Simple and immediately understandable.
- Fits the heart visual language already used in the app.
- Connects the reward to Jesus' love rather than game-like points.

Avoid making this sound like a popularity score.

Preferred explanation:

```text
사랑 하트는 내가 받은 인기가 아니라,
누군가를 축복하고 함께 기도한 마음의 흔적이에요.
```

## Profile placement

Love Hearts should be visible in Profile, but should not compete with the existing faith journey stats.

Recommended MVP placement:

### Primary placement — profile header pill

Place a small pill below the user's name / 말씀동행 line.

Example:

```text
💛 사랑 하트 12
```

Reason:

- Easy to find.
- Feels like a personal spiritual encouragement balance.
- Does not require changing the existing three-card faith journey grid.

### Later placement — dedicated Love Hearts card

After the decoration/shop system exists, add a dedicated card below faith journey or before badges:

```text
사랑 하트
서로를 축복하며 모은 마음이에요.
💛 12
```

Do not add a full shop UI in the first Love Hearts MVP.

## Data model recommendation

Do not mutate existing reaction tables to store balances.

Add a ledger-based reward model.

### `love_heart_wallets`

Stores the current balance for each user.

Recommended columns:

```text
user_id uuid primary key references auth.users(id) on delete cascade
balance integer not null default 0
lifetime_earned integer not null default 0
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `love_heart_events`

Stores every reward event and prevents duplicate rewards.

Recommended columns:

```text
id uuid primary key default gen_random_uuid()
user_id uuid not null references auth.users(id) on delete cascade
source_type text not null
source_id uuid not null
amount integer not null default 1
created_at timestamptz not null default now()
```

Recommended unique constraint:

```text
unique (user_id, source_type, source_id)
```

Recommended `source_type` values:

```text
qt_reaction
prayer_intercession
answered_prayer_gratitude
```

## Reward rules

### Award once per target

A user can earn at most one Love Heart from the same target.

Examples:

- One Bible Reflection reaction target = max +1.
- One prayer request intercession target = max +1.
- One answered prayer testimony gratitude target = max +1.

### No reward from self-targeted interactions

Do not award a Love Heart when the user reacts to or prays for their own content.

This prevents farming and keeps the meaning healthy.

### No duplicate reward after cancel / re-add

If a user cancels a reaction and adds it again, the ledger unique constraint should prevent another award.

### Optional daily cap

Consider a gentle daily cap after MVP testing.

Do not add it until the first behavior is observed.

## RPC recommendation

Use an RPC for reward awarding rather than client-side balance updates.

Suggested function:

```text
award_love_heart_once(p_source_type text, p_source_id uuid)
```

The RPC should:

- require `auth.uid()`
- verify the existing interaction row belongs to `auth.uid()`
- verify the user is not rewarding their own content
- insert a ledger row once
- upsert / increment the wallet
- return whether a new heart was awarded

Expected response shape:

```text
awarded boolean
balance integer
amount integer
```

## RLS / GRANT discipline

New tables and functions must follow the Roots Supabase discipline.

Every migration must include:

- explicit GRANTs
- RLS enabled
- policies
- minimal or no anon privileges
- authenticated access only where needed
- service_role access for admin/maintenance

Suggested access model:

### `love_heart_wallets`

Authenticated users:

- select own wallet

Service role:

- full access

Anon:

- no access

### `love_heart_events`

Authenticated users:

- select own events if needed
- no direct insert / update / delete

Service role:

- full access

Anon:

- no access

### Award function

Authenticated:

- execute

Service role:

- execute

Anon / public:

- revoke execute

## Client integration points

After existing successful interaction writes:

### `reactToQT(...)`

Call reward RPC only when a reaction is newly added or changed from no reaction.

Do not award when:

- the same reaction is canceled
- the reaction only changes after a previous Love Heart was already awarded for that QT

Toast:

```text
축복의 마음을 남겼어요 💛 +1
```

### `prayTogether(...)`

Call reward RPC after `user_prayer_logs` insert succeeds or after duplicate is resolved as already prayed.

Toast only when a new Love Heart is awarded:

```text
중보기도 결단했어요 💛 +1
```

### `likeAnsweredPrayer(...)`

Call reward RPC after `prayer_likes` insert succeeds.

Toast only when a new Love Heart is awarded:

```text
함께 감사했어요 💛 +1
```

## UI behavior

### Toast rules

Show toast only when a new Love Heart is actually awarded.

Do not show the toast when:

- the user cancels a reaction
- the interaction already existed
- self-target reward is blocked
- the RPC returns `awarded = false`

### Profile display

MVP:

- show the user's current Love Heart balance in the profile header as a small pill
- no shop / spending flow yet

Future:

- add a dedicated Love Hearts detail card
- add recent Love Heart history
- connect Love Hearts to Rootsman / garden decoration unlocks

## Suggested 1.8 MVP scope

Do in 1.8:

- add `love_heart_wallets`
- add `love_heart_events`
- add `award_love_heart_once` RPC
- connect existing reaction flows to the RPC
- show Love Heart balance in Profile
- show simple toast messages

Do not do in 1.8:

- spending hearts
- Rootsman decoration shop
- new reaction types
- comments
- ranking / leaderboard
- public Love Heart comparison
- progress / streak changes

## Future 1.9 direction

Use Love Hearts for gentle cosmetic rewards.

Prefer decorations around Rootsman / the garden rather than changing Rootsman's base identity.

Possible later unlocks:

- small garden signs
- flower pots
- watering can skins
- small bag charms
- profile background frames
- garden decorations

Avoid competitive or status-heavy designs.

