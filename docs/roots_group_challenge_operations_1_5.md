# Roots 1.5 Group Challenge Request Operations

Status: operational notes for the group challenge request MVP.

This document describes the current 1.5 scope. It does not change app behavior by itself.

## Current scope

The 1.5 MVP now has two safe steps.

Request intake flow:

```text
Group detail
→ Group challenge card
→ Request form
→ Save request to Supabase group_challenge_requests
→ Show in-app confirmation
→ Roots operator reviews the request later
→ Operator contacts the requester by the supplied email
```

Approval/display flow:

```text
Operator finalizes title, dates, and badge copy by email
→ Operator creates a row in Supabase group_challenges
→ Group members can see the approved challenge in group detail
```

There is no automatic email in this MVP. The email address is collected so the operator can follow up manually about schedule, badge design, and wording.
Approved challenges are displayed only after the operator creates the `group_challenges` row.

## User-facing rules

- Any group member can request a challenge.
- The requester does not upload badge images in the app.
- If the requester already has a badge image or idea, they should mention it in the badge idea or additional questions field.
- The app only confirms that the request was received.
- The operator reviews the request and contacts the requester by email.

## Operator review flow

1. Open Supabase SQL Editor.
2. Use `supabase/32_group_challenge_request_review_queries_1_5.sql` to view pending requests.
3. Contact the requester using `requester_email`.
4. Discuss:
   - final challenge title
   - start date
   - duration
   - badge design
   - badge name and copy
   - whether the challenge is approved or rejected
5. After contact, optionally mark the request as `contacted` using one of the commented UPDATE examples.
6. When the title, dates, and badge copy are finalized, use `supabase/34_group_challenge_approval_queries_1_5.sql` to create a `group_challenges` row.
7. The approved challenge will then appear in the group detail screen for group members.

## Not included yet

These are future steps, not part of the current request/display MVP:

- approved challenge creation UI inside the app
- automatic email sending
- group member automatic participation snapshot
- challenge progress calculation
- challenge completion badge awarding
- admin dashboard

## Non-negotiable rules

Group challenge logic must not change Roots core Bible Reflection completion behavior.

Do not change:

- progress/streak save logic
- `streak_days`, `total_days`, or `last_checkin` update logic
- Bible Reflection final save flow
- sharing/recipient save flow
- community whole/group/partner feed visibility logic
- reward map calculation
- existing badge award logic

Future challenge progress should read completed Bible Reflection records for judgment only. It must not create or modify progress.
