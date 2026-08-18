#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

const requiredFiles = [
  "lib/i18n.ts",
  "lib/qtWriteConfig.ts",
  "app/qt/write/page.tsx",
  "app/qt/photo/page.tsx",
  "app/qt/record/page.tsx",
  "app/community/page.tsx",
  "app/profile/page.tsx",
  "app/welcome/page.tsx",
  "app/account-deletion/page.tsx",
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/support/page.tsx",
  "lib/avatar.ts",
  "lib/groupLeaderText.ts",
  "lib/inviteLandingText.ts",
  "lib/notifications/reflectionNudgeTemplates.ts",
  "lib/notifications/settingsText.ts",
  "lib/reflectionNudgeText.ts",
  "components/Onboarding.tsx",
  "components/CompanionChallengeAnnouncementPopup.tsx",
  "lib/companionChallengeText.ts",
  "lib/localNotifications.ts",
  "lib/notifications/templates.ts",
  "ios/App/App/Info.plist",
];

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const scanRoots = ["app", "components", "lib", "ios", "android", "public"];
const scanExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".swift",
  ".java",
  ".plist",
  ".json",
  ".html",
  ".xml",
  ".strings",
]);
const ignoredDirectoryNames = new Set([
  ".git",
  ".next",
  "node_modules",
  "Pods",
  "build",
  "DerivedData",
]);

function collectSourceFiles(relativeDirectory) {
  const absoluteDirectory = path.join(PROJECT_ROOT, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];

  const files = [];
  const stack = [absoluteDirectory];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectoryNames.has(entry.name)) stack.push(path.join(current, entry.name));
        continue;
      }
      if (!entry.isFile() || !scanExtensions.has(path.extname(entry.name))) continue;
      files.push(path.relative(PROJECT_ROOT, path.join(current, entry.name)));
    }
  }
  return files;
}

const scannedFiles = Array.from(new Set(scanRoots.flatMap(collectSourceFiles))).sort();
const allFiles = Array.from(new Set([...scannedFiles, ...requiredFiles])).sort();
const sources = new Map(allFiles.map((file) => [file, read(file)]));
const violations = [];

function requireFragments(file, label, fragments) {
  const source = sources.get(file);
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      violations.push(`${file}: missing ${label}: ${fragment}`);
    }
  }
}

function requireEntry(file, key, fragments) {
  const source = sources.get(file);
  const keyPattern = new RegExp(`^\\s*(?:["']${escapeRegExp(key)}["']|${escapeRegExp(key)}):.*$`, "m");
  const match = source.match(keyPattern);
  if (!match) {
    violations.push(`${file}: translation entry not found: ${key}`);
    return;
  }
  for (const fragment of fragments) {
    if (!match[0].includes(fragment)) {
      violations.push(`${file}: ${key} is missing required wording: ${fragment}`);
    }
  }
}

const forbiddenPhrases = [
  "명상",
  "Free Meditation",
  "Freie Meditation",
  "Méditation libre",
  "Meditación libre",
  "Reflection & Meditation",
  "Empfinden & Meditation",
  "Réflexion & méditation",
  "Réflexion et méditation",
  "Step 4 · Meditation",
  "Schritt 4 · Meditation",
  "Étape 4 · Méditation",
  "Today's Meditation",
  "Today’s Meditation",
  "Heutige Meditation",
  "Méditation du jour",
  "Foto-Meditation",
  "Foto-Reflexion",
  "méditation photo",
  "méditations photo",
  "Bibelreflexion",
  "Bibelreflexionen",
  "vos ressentis et vos découvertes",
  "Bible reflection",
  "Bible reflections",
  "Free Quiet Time",
];

for (const [file, source] of sources) {
  for (const phrase of forbiddenPhrases) {
    let cursor = source.indexOf(phrase);
    while (cursor !== -1) {
      violations.push(`${file}:${lineNumberAt(source, cursor)} forbidden wording: ${phrase}`);
      cursor = source.indexOf(phrase, cursor + phrase.length);
    }
  }
}

requireEntry("lib/i18n.ts", "home_qt_btn", [
  'de: "Stille Zeit"',
  'en: "Bible Reflection"',
  'fr: "Méditation biblique"',
  'es: "Meditación bíblica"',
]);
requireEntry("lib/i18n.ts", "home_qt_done", [
  'de: "Stille Zeit ✓"',
  'en: "Bible Reflection ✓"',
  'fr: "Méditation biblique ✓"',
  'es: "Meditación bíblica ✓"',
]);
requireEntry("lib/i18n.ts", "community_free_meditation", [
  'de: "Freie Stille Zeit"',
  'en: "Free-form Bible Reflection"',
  'fr: "Méditation biblique libre"',
]);
requireEntry("lib/i18n.ts", "profile_free_qt", [
  'de: "Freie Stille Zeit"',
  'en: "Free-form Bible Reflection"',
  'fr: "Méditation biblique libre"',
  'es: "Meditación bíblica libre"',
]);
requireEntry("lib/i18n.ts", "profile_qt_calendar", [
  'de: "Stille-Zeit-Kalender"',
  'en: "Bible Reflection Calendar"',
  'fr: "Calendrier des méditations bibliques"',
  'es: "Calendario de meditación bíblica"',
]);

for (const key of [
  "community_qt_section_meditation",
  "qt_g4_title",
  "qt_record_meditation",
  "qt_record_section_meditation",
]) {
  requireEntry("lib/i18n.ts", key, [
    'de: "Gedanken & Erkenntnisse"',
    'en: "Thoughts & Insights"',
    'fr: "Réflexions et enseignements"',
  ]);
}
requireEntry("lib/i18n.ts", "qt_step_meditate", [
  'de: "Schritt 4 · Gedanken & Erkenntnisse"',
  'en: "Step 4 · Thoughts & Insights"',
  'fr: "Étape 4 · Réflexions et enseignements"',
]);
requireEntry("lib/i18n.ts", "group_challenge_card_body", [
  "Stille-Zeit-Challenge",
  "Bible Reflection Challenge",
  "défi de méditation biblique",
]);

for (const [key, fragments] of [
  ["badge_rootsman_desc", ["Stille Zeiten", "Bible Reflections", "méditations bibliques"]],
  ["badge_joseph_desc", ["Stille Zeit", "Bible Reflection", "méditation biblique"]],
  ["badge_qt_bird_desc", ["Stille Zeiten", "Bible Reflections", "méditations bibliques"]],
  ["badge_word_peace_desc", ["Stille Zeiten", "Bible Reflections", "méditations bibliques"]],
  ["badge_angel_desc", ["Stille Zeiten", "Bible Reflections", "méditations bibliques"]],
  ["garden_badge_100days", ["durch Stille Zeit", "through Bible Reflection", "par la méditation biblique"]],
]) {
  requireEntry("lib/i18n.ts", key, fragments);
}

requireFragments("lib/qtWriteConfig.ts", "Korean step-four meaning", [
  "말씀을 통해 받은 생각과 깨달음을 솔직하게 써보세요.",
]);
requireEntry("app/qt/write/page.tsx", "느낌과 묵상", [
  'de: "Gedanken & Erkenntnisse"',
  'en: "Thoughts & Insights"',
  'fr: "Réflexions et enseignements"',
]);
requireEntry("app/qt/write/page.tsx", "자유 큐티", [
  'de: "Freie Stille Zeit"',
  'en: "Free-form Bible Reflection"',
  'fr: "Méditation biblique libre"',
]);
requireFragments("app/qt/write/page.tsx", "step-four insight prompt", [
  "말씀을 통해 받은 생각과 깨달음을 솔직하게 써보세요.",
  "thoughts and insights you received",
  "Gedanken und Erkenntnisse",
  "réflexions et enseignements",
]);
requireFragments("app/qt/photo/page.tsx", "Photo Bible Reflection names", [
  'de: "Stille Zeit mit Foto festhalten"',
  'en: "Record a Photo Bible Reflection"',
  'fr: "Enregistrer une méditation biblique en photo"',
]);
requireFragments("lib/inviteLandingText.ts", "invite terminology", [
  "share Bible Reflections",
  "Stille Zeiten teilen",
  "méditations bibliques",
]);
requireFragments("app/welcome/page.tsx", "welcome terminology", [
  "through Bible Reflection",
  "Stille Zeiten zu teilen",
  "partager des méditations bibliques",
]);
requireFragments("lib/notifications/settingsText.ts", "notification terminology", [
  "today’s Bible Reflection",
  "méditation biblique du jour",
]);
requireFragments("components/CompanionChallengeAnnouncementPopup.tsx", "companion challenge terminology", [
  "share a Bible Reflection each day",
  "teilt täglich eure Stille Zeit",
  "votre méditation biblique",
]);
requireFragments("lib/companionChallengeText.ts", "companion challenge status terminology", [
  "Complete a Bible Reflection together with a companion every day",
  "die Stille Zeit",
  "une méditation biblique",
]);
requireFragments("lib/localNotifications.ts", "local reminder terminology", [
  "through Bible Reflection",
  "durch Stille Zeit",
  "par la méditation biblique",
]);
requireFragments("lib/notifications/templates.ts", "shared-content notification terminology", [
  "A new Bible Reflection",
  "eine neue Stille Zeit",
  "Une nouvelle méditation biblique",
]);
requireFragments("ios/App/App/Info.plist", "native permission terminology", [
  "Bible Reflection photo",
]);

console.log("Bible Reflection terminology audit (read-only)");
console.log(`Project: ${PROJECT_ROOT}`);
console.log(`Scanned source files: ${scannedFiles.length}`);
console.log(`Required terminology surfaces: ${requiredFiles.length}`);
console.log(`Violations: ${violations.length}`);

if (violations.length > 0) {
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Terminology is consistent for the audited user-facing surfaces.");
}
