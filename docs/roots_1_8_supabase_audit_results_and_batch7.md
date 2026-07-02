# Roots post-1.8 Supabase audit result and batch 7 cleanup

## Context

This document records the result of `supabase/53_supabase_post_1_8_audit.sql` after Roots 1.8 v1.

The audit was created because Supabase is changing Data API exposure behavior for public-schema tables. Roots now keeps the rule that every new public table migration must include explicit grants, RLS, and policies.

## 53 audit result summary

User-provided result CSVs showed:

- A: SQL Editor role/database context OK.
- B: Reviewed target tables exist and RLS is enabled.
- C: Expected reviewed table grants are present.
- D: Missing expected grants returned success/zero rows.
- D2: `notifications.read_at` has the expected column-level UPDATE grant.
- E: Unexpected anon table grants returned success/zero rows.
- F: Attention needed. `authenticated` still has admin-like `TRUNCATE`, `REFERENCES`, and `TRIGGER` on:
  - `public.prayer_item_recipients`
  - `public.qt_record_recipients`
- G: Love Hearts and notification RLS policies are present.
- H: Previously cleaned group/companion RPC grants mostly remain clean.
- H2: Attention needed. `claim_group_challenge_award(uuid)` is still executable by `anon`.
- I/J: Known visibility helper area remains intentionally deferred. Do not change helper functions or feed policies in this batch.
- K: Storage policies look aligned with current app behavior. `qt-photos` remains authenticated/private; group challenge badge select remains public as intended.
- L: Public tables without RLS returned success/zero rows.
- M: Default privileges remain broad. This matches the known deferred `42` area and must not be changed blindly.

## Batch 7 scope

`supabase/54_supabase_cleanup_batch7_post_1_8_minimal_execute.sql` does only two small cleanup actions:

1. Remove `TRUNCATE`, `REFERENCES`, and `TRIGGER` from `authenticated` on:
   - `public.prayer_item_recipients`
   - `public.qt_record_recipients`

2. Remove logged-out execution from:
   - `public.claim_group_challenge_award(uuid)`

It keeps `authenticated` and `service_role` execution on `claim_group_challenge_award(uuid)`.

## Explicitly not touched

This cleanup does not touch:

- Bible Reflection completion
- progress/streak
- `qt_records`
- `daily_checkins`
- `profiles`
- `prayer_items`
- feed visibility helpers
- group invite anon flow
- default privileges
- Storage policies
- Love Hearts wallet/event data

## Expected postcheck

After running 54:

- F-style admin-like grants should return 0 rows.
- `claim_group_challenge_award(uuid)` should be:
  - `anon`: false
  - `authenticated`: true
  - `service_role`: true

## Regression checks after running 54

Recommended app checks:

1. Login still works.
2. Bible Reflection completion still works.
3. Partner-specific Bible Reflection sharing still works.
4. Partner-specific prayer sharing still works.
5. Group challenge badge claim still works for a signed-in eligible user, if a test challenge exists.
6. Love Hearts still award from community interactions.

No iOS build or Android AAB is required because this is SQL/docs only.
