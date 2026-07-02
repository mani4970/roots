# Roots 1.8 Supabase Post-v1 Audit

Date: 2026-07-02  
Branch: `feature/roots-1.8_supabase_post_v1_audit`

## Purpose

This is a small, safe Supabase checkpoint after Roots 1.8 v1 was merged to `main`.

Roots 1.8 introduced Love Hearts. Before moving into 1.8 v2 features such as heart usage, map decoration, and Rootsman customization, the database should be checked against the explicit-GRANT rule that Supabase is rolling out for public-schema tables.

## Scope

Added:

```text
supabase/53_supabase_post_1_8_audit.sql
```

This file is intentionally read-only.

It checks:

- public table existence and RLS status
- explicit table GRANTs for newer/support tables
- Love Heart table grants and RLS policies
- notification foundation table grants
- column-level `notifications.read_at` update privilege
- group challenge RPC execute grants
- Love Heart RPC execute grants
- unexpected anon table access
- authenticated admin-like table privileges
- deferred visibility-helper function area from `48`
- relevant storage buckets and storage policies
- default privileges overview

## Non-goals

This pass does not:

- change any GRANTs
- change any RLS policies
- change any functions
- change any storage bucket setting
- change progress/streak logic
- change `qt_records`, `daily_checkins`, or `profiles`
- change community feed visibility
- change group invite behavior
- change Love Heart balances or events
- change app code

## Why this is the right next step

The 1.6 Supabase cleanup already completed several safe batches:

```text
44: authenticated admin-like table privilege cleanup
45: anon EXECUTE cleanup for logged-in-only group RPCs
46: trigger-only companion function execute cleanup
47: handle_new_user execute cleanup with signup regression check
48: visibility-helper audit only, deferred
49: status and next-step documentation
```

Therefore the next step should not be a broad cleanup. It should be a post-1.8 audit confirming that the newer 1.6/1.8 database additions still follow the explicit-GRANT/RLS pattern.

## How to run

Run this file in Supabase SQL Editor:

```text
supabase/53_supabase_post_1_8_audit.sql
```

Save/export the outputs before deciding on any follow-up.

## Expected safe result

Important checks should look like this:

```text
B: target tables exist and have RLS enabled
D: missing expected table grants returns zero rows
D2: `notifications.read_at` column-level update privilege exists
E: unexpected anon table grants returns zero rows
F: authenticated admin-like grants returns zero rows
H2: award_love_heart_once has no anon EXECUTE and authenticated can execute
K: qt-photos remains private
```

If rows appear in any risk section, do not fix broadly. Create a tiny reviewed follow-up migration only for the exact issue.

## Keep deferred

Do not touch the `48` visibility-helper area yet:

```text
can_share_prayer_visibility(text)
can_view_prayer_item(text, uuid)
can_view_qt_record(text, uuid)
is_group_member(uuid, uuid)
```

Those functions are tied to RLS policies and feed/invite visibility. They require a separate feed/RLS planning pass.

## Next after this audit

After this audit is saved and reviewed:

```text
1. Document Roots 1.8 v1 release notes
2. Start Roots 1.8 v2 planning
3. Design heart usage separately from progress/streak
4. Plan map decoration and Rootsman customization
5. Decide which features require new iOS build / Android AAB
```

## Future migration rule

Every future public table migration must include:

```text
1. create table
2. indexes as needed
3. alter table ... enable row level security
4. RLS policies
5. explicit GRANTs
6. minimal/absent anon grants unless truly required
7. rollback/regression notes for risky changes
```
