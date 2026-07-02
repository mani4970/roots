# Roots native build / AAB decision guide

Date: 2026-07-02  
Status: working release decision guide

## Current app architecture

Roots uses a Next.js web app with Capacitor A-mode native apps.

The iOS and Android apps load the production web URL:

```text
https://www.christian-roots.com
```

Because of this, many app changes do not require a new App Store build or Android AAB.

## Usually web-only, no iOS build/AAB

No native build is usually required for:

```text
Next.js page/component changes
CSS/UI changes
copy/text changes
feature text files
Supabase SQL migrations
Supabase RLS/GRANT changes
RPC changes
new web-served images in public/
profile display changes
community feed UI changes
invite landing changes
Love Hearts web UI
map decoration rendered from web assets
Rootsman decoration rendered as web assets
```

Deployment path:

```text
merge/push to main
→ Vercel production deployment
→ native apps show updated web UI because they load production URL
```

## Usually requires iOS build / Android AAB

Native build is likely required for:

```text
Capacitor config changes
new Capacitor plugin
native permission changes
AndroidManifest.xml changes
Info.plist changes
Associated Domains entitlement changes
Android App Links asset behavior requiring native config
app icon changes
splash screen changes
app display name changes
bundle ID / package ID changes
native notification scheduling/delivery behavior changes
native camera/gallery plugin configuration changes
version/build number changes for store release
store-delivered binary code changes
```

## Store metadata only

Sometimes App Store Connect / Google Play Console changes do not require a binary:

```text
store description
screenshots
promotional text
privacy policy URL
support URL
release notes text
category/marketing metadata where allowed
```

But if the change requires a new binary upload, then iOS build/AAB is required.

## Supabase-only changes

Supabase SQL changes do not require native builds.

However, they do require careful regression checks:

```text
login
Bible Reflection completion
progress/streak
prayer
community feed
group feed
partner sharing
group challenge badge claim
Love Hearts award flow
```

## Love Hearts / customization decision examples

### No native build needed

```text
Add heart balance page
Add heart usage explanation popup
Add web-rendered Rootsman accessory overlay
Add web-rendered map decoration
Add item catalog stored in Supabase
Add redemption RPC
Add static images under public/
```

### Native build likely needed

```text
Add new native image picker behavior
Add native notification action buttons
Change app icon to decorated Rootsman
Change splash screen
Add new native plugin for downloads/sharing
Change Associated Domains or Android intent filters
```

## Recommended release rule

Before every patch, ask:

```text
Did this touch only web/Supabase/docs?
→ main/Vercel is enough.

Did this touch native config, permissions, plugins, or store binary behavior?
→ iOS build and/or Android AAB may be needed.
```

## 1.8 v1 decision

1.8 v1 final work did not require a native build because it was:

```text
Love Hearts web/Supabase layer
Invite landing web UX/UI
feature text files
Supabase audit/cleanup docs and SQL
```

No Capacitor/native configuration was changed in the final checkpoint.
