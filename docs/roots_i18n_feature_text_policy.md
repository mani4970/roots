# Roots feature text and i18n policy

Date: 2026-07-02  
Status: working rule for future features

## Why this policy exists

`lib/i18n.ts` has grown very large. Future feature-specific copy should not automatically be added there.

Roots now uses a feature-text pattern for new scoped features.

Examples already used:

```text
lib/loveHeartText.ts
lib/loveHeartIntroText.ts
lib/inviteLandingText.ts
lib/notifications/settingsText.ts
lib/notifications/introPopupText.ts
```

## Core rule

Use `lib/i18n.ts` only for broad app-wide shared UI.

Use feature-specific text files for scoped flows.

```text
Good:
lib/loveHeartText.ts
lib/inviteLandingText.ts
lib/notifications/settingsText.ts

Avoid:
adding every new feature string directly to lib/i18n.ts
```

## When to create a feature text file

Create a separate file when the text belongs mostly to one feature or flow:

```text
Love Hearts
Invite landing
Notifications
Heart shop / decoration
Rootsman customization
Map decoration
Group challenge detail UI
Special onboarding popups
```

Suggested naming:

```text
lib/<featureName>Text.ts
lib/<domain>/<featureName>Text.ts
```

Examples:

```text
lib/heartShopText.ts
lib/rootsmanCustomizationText.ts
lib/mapDecorationText.ts
lib/groupChallenges/detailText.ts
```

## Supported languages

Every user-facing feature text file should support:

```text
ko
en
de
fr
```

Fallback should be Korean unless a flow has a stronger existing reason to fall back differently.

## Type pattern

Preferred pattern:

```ts
type FeatureLang = "ko" | "en" | "de" | "fr";

type FeatureText = {
  title: string;
  body: string;
  button: string;
};

const FEATURE_TEXT: Record<FeatureLang, FeatureText> = {
  ko: { ... },
  en: { ... },
  de: { ... },
  fr: { ... },
};

export function getFeatureText(lang: string): FeatureText {
  if (lang === "ko" || lang === "en" || lang === "de" || lang === "fr") {
    return FEATURE_TEXT[lang];
  }
  return FEATURE_TEXT.ko;
}
```

If the feature already imports `Lang` from `lib/i18n.ts`, it may use that type, but avoid creating a dependency that forces unrelated text into `lib/i18n.ts`.

## URL language behavior

For public invite/landing flows, prefer this order:

```text
lang query parameter
→ saved app language
→ browser language
→ ko fallback
```

This keeps links shareable across KakaoTalk, browser, and app contexts.

## Copy style

Korean copy should be warm, short, and spiritual without sounding game-heavy.

Love Hearts copy should emphasize:

```text
blessing
intercession
gratitude
Jesus' love
future journey
```

Avoid:

```text
ranking
popularity
competition
cash-shop language
aggressive reward psychology
```

## Review checklist for new feature text

Before merging a text feature:

```text
1. Does the text belong in a feature file instead of lib/i18n.ts?
2. Are ko/en/de/fr present?
3. Is the fallback safe?
4. Is the Korean copy natural and not too game-like?
5. Does the copy avoid exposing unreleased systems too explicitly?
6. Does the text file export a small helper rather than raw objects everywhere?
7. Did the feature avoid changing unrelated global i18n keys?
```

## Current 1.8 conclusion

1.8 followed this policy correctly:

```text
Love Heart toasts -> lib/loveHeartText.ts
Love Heart intro popup -> lib/loveHeartIntroText.ts
Invite landing page -> lib/inviteLandingText.ts
```

Continue this pattern for 1.8 v2 heart usage, map decoration, and Rootsman customization.
