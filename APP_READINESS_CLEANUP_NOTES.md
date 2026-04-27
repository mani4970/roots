# Phase 44 cleanup notes

PWA installation prompts have been removed from the visible app flow:
- Home routine completion
- Profile
- Onboarding

PWA itself still works because manifest.json and service worker remain.

Icon assets now use the uploaded Roots sprout image:
- public/roots-logo-transparent.png
- public/roots-logo-transparent-96.png
- public/roots-logo-transparent-160.png
- public/roots-logo-transparent-256.png
- public/roots-logo-transparent-512.png
- public/app-icon-roots-1024.png
- public/app-icon-roots-512.png
- public/app-icon-roots-192.png
- public/app-icon-roots-180.png

Safe to delete later when fully removing PWA-specific code:
- components/PwaInstallPrompt.tsx
- i18n keys starting with pwa_
- old unused PWA icon files if still present:
  - public/icon-192.png
  - public/icon-512.png

Kept for now:
- public/manifest.json, updated to use the uploaded sprout icon assets.
- public/sw.js, updated to cache the new icon assets.
- markLangSelected in lib/useLang.ts because components/LanguagePicker.tsx still uses it.
