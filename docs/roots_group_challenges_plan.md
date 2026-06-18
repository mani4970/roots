# Roots Group Challenges Plan

Status: planning document only. Do not implement in Roots 1.4.

This file captures the future idea of optional group-based Bible Reflection challenges, where a group can run a monthly/seasonal challenge and award a special badge to members who complete it.

## Feature summary

Example:

```text
A group starts a June daily Bible Reflection challenge.
Members who complete Bible Reflection every day during the challenge period receive a special group/season badge.
```

This should feel warm and communal, not competitive or guilt-based.

## Why this should not be in 1.4

This is a large feature because it touches:

- groups
- group membership
- Bible Reflection completion history
- badges/rewards
- new Supabase tables
- RLS policies
- timezone/date rules
- group owner permissions
- future notification possibilities

Roots 1.4 should remain stabilization-focused.

Recommended timing:

```text
1.4: stabilization, Supabase cleanup planning, performance/storage cleanup
1.5: 100-day reward maps / Peace Ark
1.6 or later: group challenges and group badges
```

## Non-negotiable rules

Do not modify the core progress/streak logic for challenges.

Challenge success should be calculated from existing completed Bible Reflection records, not by changing how progress is counted.

Use these rules:

- Completed Bible Reflection means `qt_records.is_draft = false`.
- Count by `qt_records.date`.
- Do not count drafts.
- Do not count past edits as today.
- Do not increment `profiles.streak_days` from challenge logic.
- Do not update `profiles.last_checkin` from challenge logic.
- Do not make watering depend on challenge completion.
- Challenge badges are separate from Fruit of the Spirit badges.

## MVP recommendation

Start with one challenge type only:

```text
Monthly Bible Reflection challenge
```

Avoid multiple challenge types at first.

Recommended MVP rules:

- Only the group creator/owner can create a challenge.
- Challenge belongs to one group.
- Challenge has `start_date` and `end_date` as date-only values.
- Challenge can be public within the group but only group members can participate.
- Users opt in by joining the challenge.
- A user must join before or during the challenge.
- For a strict monthly badge, require completion for every date in the challenge window.
- If a user joins late, either:
  - not eligible for the full badge, or
  - eligible only for a separate participation badge later.
- MVP should use strict full-window eligibility to keep rules simple.

## Suggested tables for future migration

Do not create these in 1.4. This is a future schema proposal.

### public.group_challenges

```sql
create table public.group_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  challenge_type text not null check (challenge_type in ('daily_bible_reflection')),
  start_date date not null,
  end_date date not null,
  timezone text not null default 'Europe/Berlin',
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'cancelled')),
  badge_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_challenges_valid_dates check (end_date >= start_date)
);
```

### public.group_challenge_participants

```sql
create table public.group_challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.group_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  status text not null default 'joined' check (status in ('joined', 'completed', 'failed', 'left')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);
```

### public.group_challenge_awards

```sql
create table public.group_challenge_awards (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.group_challenges(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  awarded_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);
```

Optional later:

```text
public.group_challenge_progress_cache
```

Only add a progress cache if real-time computation is slow.

## Success calculation

MVP calculation should be read-only against `qt_records`.

Pseudo-logic:

```text
required_dates = every date from challenge.start_date through challenge.end_date
completed_dates = distinct qt_records.date
  where qt_records.user_id = participant.user_id
  and qt_records.is_draft = false
  and qt_records.date between start_date and end_date
success = every required_date is in completed_dates
```

Important:

- Use `date`, not `created_at`, because Roots already stores reflection date.
- Do not count multiple records on the same date more than once.
- Do not require shared visibility; private Bible Reflections should count.
- Photo, freeform, Sunday, and 6-step Bible Reflections should all count if saved as non-draft for the date.

## RLS direction

Future RLS should be strict.

Recommended policies:

### group_challenges

- Select: members of the group can read.
- Insert: group creator/owner can create.
- Update: group creator/owner can update while draft/active, with constraints.
- Delete/cancel: group creator/owner only.
- service_role: full access for admin/finalization tasks.

### group_challenge_participants

- Select: group members can see participant list, or keep private if desired.
- Insert: authenticated user can insert their own participant row only if they are a group member.
- Update: user can mark own `left`; service_role/finalizer can set completed/failed.
- Delete: avoid hard delete; prefer status = 'left'.

### group_challenge_awards

- Select: group members can read awards in their group.
- Insert/update/delete: service_role or trusted RPC only.
- Do not let normal clients directly award themselves.

## RPC direction

Use RPCs for sensitive operations later:

```text
create_group_challenge
join_group_challenge
cancel_group_challenge
finalize_group_challenge
```

The finalization RPC should:

- verify caller is group owner or service_role/admin path;
- compute successful participants;
- insert awards idempotently;
- avoid duplicate awards with unique constraints.

## Badge direction

Do not add challenge badge columns to `profiles` for every challenge.

Reason:

- group challenges can grow over time;
- profile columns do not scale;
- challenge awards are event-like and should live in `group_challenge_awards`.

Profile badge UI can later read awards separately and display them in a new section:

```text
그룹 챌린지 배지
```

## UX proposal

Group detail page:

```text
Group header
Tabs: 묵상 나눔 / 기도 중 / 기도 응답 / 챌린지
```

Challenge card:

```text
6월 말씀 묵상 챌린지
6월 1일 ~ 6월 30일
매일 말씀 묵상을 이어간 동역자에게 특별 배지를 드려요.
[참여하기]
```

Warm copy examples:

```text
함께 말씀 앞에 머무는 한 달을 시작해볼까요?
완주하지 못해도 괜찮아요. 함께 걸어가는 시간이 더 소중해요.
```

Success copy:

```text
한 달 동안 말씀과 함께 걸어온 여정을 축복해요.
```

Avoid:

```text
실패했습니다
탈락
순위
경쟁
```

## Notification direction later

Do not include push notifications in the MVP unless explicitly prioritized.

Later notification ideas:

- group challenge starts
- challenge is ending soon
- badge awarded

Keep notifications group-only, not whole-community.

## QA checklist for future implementation

Use at least two test accounts and one group.

Test cases:

- group owner creates challenge
- non-owner cannot create challenge
- member joins challenge
- non-member cannot join private group challenge
- user completes every date and receives award
- user misses one date and does not receive award
- private Bible Reflection counts
- photo Bible Reflection counts
- Sunday worship/freeform/6-step all count if non-draft
- duplicate same-day records count once
- past edit does not create false today progress
- challenge finalization is idempotent
- user leaving group behavior is defined
- group deleted cascades challenge data safely
- RLS prevents reading private group challenge data from outside

## Open decisions before implementation

Decide these before writing code:

1. Should challenge participation be opt-in or automatic for all group members?
   - Recommendation: opt-in for MVP.
2. Can late joiners earn the same badge?
   - Recommendation: no for strict monthly completion badge.
3. Should challenge dates use group timezone or user's local date?
   - Recommendation: use date-only challenge windows and `qt_records.date`; store timezone for display/future scheduling.
4. Should awards appear in the main badge grid or a separate group badge section?
   - Recommendation: separate group badge section.
5. Should group owner be the only challenge admin?
   - Recommendation: yes until group roles exist.
