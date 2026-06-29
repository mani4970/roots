# Roots 1.7 iPad / Mac Support Audit

Date: 2026-06-29
Branch: `feature/roots-1.7`

## Scope

Roots 1.7 should focus on iPad / Mac support audit and minimal support work only.

Do not mix this with:

- Supabase cleanup
- push notification logic changes
- progress / streak logic
- community feed visibility changes
- group challenge logic changes
- reward map changes
- large UI redesign

## Current native status

### iOS target settings

Current Xcode project settings for 1.7 now show:

```text
TARGETED_DEVICE_FAMILY = 1,2
SUPPORTS_MACCATALYST = NO
SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = YES
```

Interpretation:

- The app is now configured for iPhone + iPad.
- Apple Silicon Mac support is enabled through the "Designed for iPhone/iPad" path.
- Mac Catalyst remains disabled.
- This is not a separate native macOS app and should not be treated as a Mac Catalyst port.

### Capacitor mode

Roots still uses Capacitor A mode:

```text
server.url = https://www.christian-roots.com
```

This means iOS / Android shells load the production web app.

## Current layout status

The app is optimized around a phone-width layout.

Important global layout settings:

```text
html max-width: 430px
bottom nav max-width: 430px
```

This prevents wide-screen breakage, but on iPad / Mac the app may look like a centered phone app rather than a tablet-native app.

For 1.7 this is acceptable as a first support step, as long as:

- content remains readable
- fixed bottom navigation is aligned correctly
- modals are centered and not clipped
- safe-area / keyboard behavior is acceptable
- no screen becomes unusable

## Recommended 1.7 strategy

### Phase 1 — audit only

- Confirm iOS target settings.
- Confirm production URL is correct.
- Confirm no secret/build artifact enters safe zips.
- Prepare iPad / Mac QA checklist.

### Phase 2 — iPad minimum support

Goal: support iPad while keeping the current centered-phone layout stable.

Implemented in 1.7:

```text
TARGETED_DEVICE_FAMILY = 1,2
```

The current approach intentionally keeps the app content at the existing mobile width and only polishes iPad-specific spacing/background behavior.

### Phase 3 — Apple Silicon Mac availability

Do not enable Mac Catalyst for 1.7.

Implemented in 1.7:

```text
SUPPORTS_MACCATALYST = NO
SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = YES
```

The 1.7 Mac goal is:

```text
Make the iPhone/iPad app available on Apple Silicon Mac if it behaves acceptably.
```

Not:

```text
Build a separate native macOS / Mac Catalyst app.
```

## iPad QA checklist

Test with at least one iPad simulator or real iPad.

Recommended checks:

### Basic app shell

- App launches.
- Production URL loads.
- Login works.
- Bottom navigation is centered and not stretched awkwardly.
- Safe area looks correct in portrait and landscape.

### Home

- Home cards keep readable width.
- Today reflection button works.
- QT choice modal title does not overlap close button in Korean / English / German / French.
- Notification intro popup is centered and readable.
- Garden / Ark map still displays correctly.

### QT

- Today QT tab loads.
- 6-step mode opens.
- Free mode opens.
- Photo reflection flow opens.
- Past QT detail opens.
- Share popup is usable.

### Prayer

- Prayer list loads.
- New prayer modal works.
- Prayer share flow works.
- Prayer answered tab works.

### Community

- Overall feed loads.
- Group tab loads.
- Group detail loads.
- Partner tab loads.
- Partner detail loads.
- Group challenge card does not stretch or clip.
- Push deep links still route to the correct group / partner section.

### Profile

- Profile page loads.
- Notification settings modal opens.
- Profile photo modal is usable.
- Legal/support links work.

## Apple Silicon Mac QA checklist

If enabling Mac availability later, check:

- App launches on Apple Silicon Mac.
- Windowed layout is acceptable.
- Scroll behavior is natural.
- Bottom nav does not feel broken.
- Keyboard focus works in forms.
- Photo picker/profile image features do not crash.
- External links open correctly.
- Notification settings do not make false promises if push behavior differs.

## Release implications

If iPad support is enabled:

- App Store Connect may require iPad screenshots.
- iPad review expectations apply.
- Additional device QA is required before submission.

If Apple Silicon Mac availability is enabled:

- App Store Connect availability setting must be checked.
- Mac behavior should be verified before enabling broadly.
- Push notification behavior on Mac should not be promised as a 1.7 goal.

## Recommendation

For Roots 1.7, do not jump straight to broad device support.

Recommended order:

1. Commit this audit.
2. Run iPad simulator QA.
3. Verify iPad build / UI.
4. Verify Apple Silicon Mac launch with the Designed for iPad path.
5. Submit 1.7 as iPad + Apple Silicon Mac support if QA passes.

