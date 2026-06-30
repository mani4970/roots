# Roots 1.8 Group Invite Landing Flow Plan

Date: 2026-06-30
Branch: `feature/roots-1.8`

## Context

Many Korean users share group invite links through KakaoTalk. KakaoTalk often opens links inside its in-app browser, so the invite experience should not depend on the native app opening immediately.

The current group invite link shape is:

```text
/join?group=<group_id>
```

The best next step is not to send invitees straight to a generic landing page and not to force app download first. The invite link should open a public, invite-aware landing page that preserves the group context.

## Recommended product flow

### 1. Public invite landing first

When someone taps a group invite link, always show the group invite landing page first.

The page should show:

```text
[Roots logo]
<group name>에 초대받았어요
함께 말씀을 나누고 서로를 위해 기도하는 그룹이에요.

[회원가입/로그인하고 참여하기]
[앱에서 열기]
[앱 다운로드]
```

For logged-in users, the primary button can be:

```text
그룹 참여하기
```

For logged-out users, the primary button should be:

```text
회원가입/로그인하고 참여하기
```

This avoids the feeling that the user was thrown directly into a login page.

## Why not force app download first?

Forcing app download first can lose the invite context after installation. The safer MVP flow is:

```text
Invite link
→ web invite landing
→ signup/login with redirect back to /join?group=...
→ join group in the database
→ optional app download / open app
```

If the user later opens the native app and logs in with the same account, the group membership is already saved.

## KakaoTalk in-app browser handling

If the page detects an in-app browser, show a small guide only when needed, not as a blocking modal on first view.

Suggested Korean copy:

```text
카카오톡 안에서 로그인이 잘 되지 않으면, 오른쪽 위 메뉴에서 브라우저로 열어주세요.
```

Do not make KakaoTalk users feel blocked before they understand the invitation.

## CTA hierarchy

### Primary CTA

Logged out:

```text
회원가입/로그인하고 참여하기
```

Logged in:

```text
그룹 참여하기
```

### Secondary CTA

For users who already have the app installed:

```text
앱에서 열기
```

This can use the existing app link / custom scheme path where supported. If it fails, the user can still continue in the web flow.

### Tertiary CTA

For users without the app:

```text
앱 다운로드
```

The download section can include App Store and Google Play buttons.

Suggested helper text:

```text
앱 설치 후에도 이 초대 링크로 다시 들어오면 그룹에 참여할 수 있어요.
```

## Implementation boundaries

Keep this separate from Love Hearts and progress systems.

Do not change:

- Bible Reflection progress
- streak / 말씀동행
- group challenge logic
- notification logic
- community feed visibility

Safe 1.8 implementation scope:

- improve `/join?group=...` copy and CTA structure
- preserve existing redirect behavior to `/login?redirect=/join?group=...`
- add app store buttons / app-open button if safe
- keep existing `get_group_invite` flow
- no new Supabase table required for MVP

## MVP recommendation

Do first:

```text
1. Make /join feel like a warm group invite landing page.
2. Change logged-out CTA from generic join to signup/login + join.
3. Add app download guidance.
4. Add non-blocking Kakao/browser guidance.
```

Do later:

```text
1. Full deferred deep linking.
2. Invite analytics.
3. Per-invite token tracking.
4. Automatic store-to-app invite continuation.
```

## Final recommendation

The best Roots invite flow is:

```text
Group invite link
→ public group invite landing
→ signup/login if needed
→ join group
→ continue in web or open/download app
```

This preserves the invitation context, works inside KakaoTalk, and avoids forcing new users into the App Store before they understand why they were invited.

## 2026-06-30 scope update: invite flows should share one pattern

The same product principle should apply to all invite types, but each invite should keep its own context.

```text
Group invite
→ /join?group=<group_id>
→ group-specific invite landing
→ signup/login if needed
→ join group

Faith partner invite
→ /companions?invite=<user_id>
→ faith-partner invite landing when logged out
→ signup/login if needed
→ accept invite / connect as faith partners

General app invite
→ /welcome?from=invite
→ public Roots welcome/download page
→ signup/login or app download
```

Do not send every invite to a generic landing page first. The invite page should preserve why the person clicked the link.

### Implementation note

For the MVP, companion invites can show a generic logged-out invite landing without exposing the inviter profile publicly. Once the user signs up or logs in, the existing authenticated `/companions?invite=...` flow can load the inviter profile and complete the connection.

App invites do not need a separate database-backed page. `/welcome?from=invite` is enough for now because the invitation is for the app itself, not for a specific group or person.
