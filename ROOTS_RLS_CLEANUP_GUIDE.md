# Roots RLS Cleanup Patch Guide

## What this patch changes

This patch is based on the exported Supabase policy CSV.

It removes the highest-risk RLS gaps while preserving the current Roots app flow:

- Private groups should no longer be broadly listable through `groups.select('*')`.
- Group memberships should no longer be globally readable.
- Group QT shares should only be readable by the owner, all-share visibility, or group members.
- `prayer_items.prayer_count` should no longer be directly updatable from the browser.
- The existing invite-link flow is preserved through the new `get_group_invite` RPC.
- The community "pray together" flow now relies on the server RPC and no longer falls back to a direct client update.

## Files in this patch

```text
app/join/page.tsx
app/community/page.tsx
supabase/03_rls_cleanup_after_policy_review.sql
ROOTS_RLS_CLEANUP_GUIDE.md
```

## Apply order

### 1. Copy the two app files into your project

Copy these files into the same paths in your real project:

```text
app/join/page.tsx
app/community/page.tsx
```

### 2. Deploy the app first

Deploy to Vercel before tightening the SQL policies.

Reason: `app/join/page.tsx` now knows how to use the new `get_group_invite` RPC. It also has a fallback for the old policies, so deploying this file first is safe.

### 3. Run the SQL patch in Supabase

Open Supabase SQL Editor and run:

```text
supabase/03_rls_cleanup_after_policy_review.sql
```

### 4. Test these flows

Use a test account and check:

```text
1. Login works
2. Home loads
3. Personal prayer create/edit/answer works
4. Community prayer list loads
5. "Pray together" button increments count
6. QT public share appears in Community > QT
7. QT group share appears only for group members
8. Create public group
9. Create private group
10. Join public group by invite link while logged out/logged in
11. Join private group by invite link after login
12. Profile page loads
```

## Notes

The patch intentionally does not restrict `profiles_select` yet.

Reason: the current app fetches profile names and avatars separately for community cards. Restricting `profiles` now could break names/avatars in shared QT and prayer views. A safer future improvement is to create a public profile view or RPC that returns only:

```text
id
name
avatar_url
```

and then restrict direct `profiles` table reads.
