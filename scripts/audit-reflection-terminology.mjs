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
  "app/impressum/page.tsx",
  "lib/requiredUpdateText.ts",
  "lib/inAppBrowser.ts",
  "components/PhotoViewerModal.tsx",
  "components/notifications/NotificationDirectOpenOverlay.tsx",
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
  "QT abschließen",
  "QT Complete",
  "QT terminé",
  "Drafts only for today's QT",
  "Brouillons : QT du jour seulement",
  "QT für {date} vorhanden",
  "QT exists for {date}",
  "QT existant pour le {date}",
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
    'es: "Pensamientos y aprendizajes"',
  ]);
}
requireEntry("lib/i18n.ts", "qt_step_meditate", [
  'de: "Schritt 4 · Gedanken & Erkenntnisse"',
  'en: "Step 4 · Thoughts & Insights"',
  'fr: "Étape 4 · Réflexions et enseignements"',
  'es: "Paso 4 · Pensamientos y aprendizajes"',
]);
requireEntry("lib/i18n.ts", "group_challenge_card_body", [
  "Stille-Zeit-Challenge",
  "Bible Reflection Challenge",
  "défi de méditation biblique",
]);

for (const [key, fragments] of [
  ["qt_title", ['ko: "말씀 묵상"', 'de: "Stille Zeit"', 'en: "Bible Reflection"', 'fr: "Méditation biblique"', 'es: "Meditación bíblica"']],
  ["qt_start_btn", ["오늘 말씀 묵상 시작하기", "Heutige Stille Zeit beginnen", "Start today's Bible Reflection", "Commencer la méditation biblique du jour", "Comenzar la meditación bíblica de hoy"]],
  ["qt_records", ["지난 말씀 묵상 기록", "Frühere Stille Zeiten", "Past Bible Reflections", "Méditations bibliques précédentes", "Meditaciones bíblicas anteriores"]],
  ["qt_mode_6step", ["6단계 말씀 묵상", "Stille Zeit in 6 Schritten", "6-Step Bible Reflection", "Méditation biblique en 6 étapes"]],
  ["qt_mode_sunday", ["주일예배 말씀 묵상", "Stille Zeit zum Sonntagsgottesdienst", "Sunday Worship Bible Reflection", "Méditation biblique du culte dominical"]],
  ["qt_mode_free", ["자유형식 말씀 묵상", "Freie Stille Zeit", "Free-form Bible Reflection", "Méditation biblique libre"]],
  ["welcome_back_btn", ["오늘 말씀 묵상 시작하기", "Heutige Stille Zeit beginnen", "Start today's Bible Reflection", "Commencer la méditation biblique du jour"]],
  ["home_next_step_draft_title", ["작성 중인 말씀 묵상", "begonnene Stille Zeit", "Bible Reflection in progress", "méditation biblique est en cours"]],
  ["home_qt_today_title", ["오늘의 말씀 묵상", "Heutige Stille Zeit", "Today’s Bible Reflection", "Méditation biblique du jour", "Meditación bíblica de hoy"]],
  ["home_routine_qt", ['ko: "말씀 묵상"', 'de: "Stille Zeit"', 'en: "Bible Reflection"', 'fr: "Méditation biblique"', 'es: "Meditación bíblica"']],
  ["home_qt_choice_title", ["오늘 말씀 묵상을 어떻게", "heute Ihre Stille Zeit", "Bible Reflection today", "méditation biblique aujourd’hui", "meditación bíblica"]],
  ["qt_today_done", ["오늘 말씀 묵상 완료", "Stille Zeit heute abgeschlossen", "Bible Reflection complete today", "Méditation biblique terminée aujourd’hui", "Meditación bíblica de hoy completada"]],
  ["qt_catchup_title", ["지난 말씀 묵상", "Vergangene Stille Zeit", "past Bible Reflection", "méditation biblique passée", "meditación bíblica anterior"]],
  ["qt_how_title", ["어떻게 말씀 묵상", "Ihre Stille Zeit", "do Bible Reflection", "faire votre méditation biblique", "hacer tu meditación bíblica"]],
  ["qt_mode_6step_title", ["6단계 말씀 묵상", "Stille Zeit in 6 Schritten", "6-Step Bible Reflection", "Méditation biblique en 6 étapes", "Meditación bíblica en 6 pasos"]],
  ["qt_complete_title", ["말씀 묵상 완료", "Stille Zeit abgeschlossen", "Bible Reflection complete", "Méditation biblique terminée", "Meditación bíblica completada"]],
  ["qt_record_edit", ["말씀 묵상 수정", "Stille Zeit bearbeiten", "Edit Bible Reflection", "Modifier la méditation biblique", "Editar meditación bíblica"]],
  ["qt_record_share_title", ["말씀 묵상 나누기", "Stille Zeit teilen", "Share Bible Reflection", "Partager la méditation biblique", "Compartir meditación bíblica"]],
  ["community_group_qt_exchange", ["그룹 말씀 묵상 나눔", "Stillen Zeit", "Bible Reflection sharing", "méditations bibliques", "Meditaciones bíblicas"]],
  ["community_manage_qt_edit", ["말씀 묵상 수정", "Stille Zeit bearbeiten", "Edit Bible Reflection", "Modifier la méditation biblique", "Editar meditación bíblica"]],
  ["qt_error_load", ["말씀 묵상 기록", "Einträge zur Stillen Zeit", "Bible Reflection records", "méditations bibliques", "registros de meditación bíblica"]],
]) {
  requireEntry("lib/i18n.ts", key, fragments);
}

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
  'es: "Pensamientos y aprendizajes"',
]);
requireEntry("app/qt/write/page.tsx", "자유 큐티", [
  'ko: "자유 묵상"',
  'de: "Freie Stille Zeit"',
  'en: "Free-form Bible Reflection"',
  'fr: "Méditation biblique libre"',
  'es: "Meditación bíblica libre"',
]);
requireEntry("app/qt/write/page.tsx", "큐티 완료", [
  'ko: "말씀 묵상 완료"',
  'de: "Stille Zeit abschließen"',
  'en: "Complete Bible Reflection"',
  'fr: "Terminer la méditation biblique"',
  'es: "Completar la meditación bíblica"',
]);
requireEntry("app/qt/write/page.tsx", "큐티할 말씀을 먼저 선택해요", [
  'ko: "묵상할 말씀을 먼저 선택해요"',
  'es: "Primero selecciona el pasaje para tu meditación bíblica"',
]);
requireEntry("app/qt/write/page.tsx", "임시저장은 오늘 큐티에만 가능해요.", [
  'ko: "임시저장은 오늘 말씀 묵상에만 가능해요."',
  'de: "Entwürfe sind nur für die heutige Stille Zeit möglich."',
  'en: "Drafts are only available for today\'s Bible Reflection."',
  'fr: "Les brouillons sont disponibles uniquement pour la méditation biblique du jour."',
  'es: "Los borradores solo están disponibles para la meditación bíblica de hoy."',
]);
requireEntry("app/qt/write/page.tsx", "이미 큐티 기록이 있어요", [
  'ko: "{date}에 이미 말씀 묵상 기록이 있어요"',
  'de: "Für {date} gibt es bereits eine Stille Zeit"',
  'en: "A Bible Reflection already exists for {date}"',
  'fr: "Une méditation biblique existe déjà pour le {date}"',
  'es: "Ya existe una meditación bíblica para {date}"',
]);
requireEntry("app/qt/write/page.tsx", "본문 글씨 작게", [
  'es: "Reducir el tamaño del texto bíblico"',
]);
requireEntry("app/qt/write/page.tsx", "본문 글씨 크게", [
  'es: "Aumentar el tamaño del texto bíblico"',
]);
requireFragments("app/qt/write/page.tsx", "step-four insight prompt", [
  "말씀을 통해 받은 생각과 깨달음을 솔직하게 써보세요.",
  "thoughts and insights you received",
  "Gedanken und Erkenntnisse",
  "réflexions et enseignements",
  "pensamientos y aprendizajes",
]);
requireFragments("app/qt/photo/page.tsx", "Photo Bible Reflection names", [
  'de: "Stille Zeit mit Foto festhalten"',
  'en: "Record a Photo Bible Reflection"',
  'fr: "Enregistrer une méditation biblique en photo"',
  'es: "Registrar una meditación bíblica con foto"',
  'photoAlt: { ko: "말씀 묵상 사진", de: "Foto zur Stillen Zeit", en: "Bible Reflection photo", fr: "Photo de méditation biblique", es: "Foto de meditación bíblica" }',
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
  "mediante la meditación bíblica",
  "compartir meditaciones bíblicas",
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
requireFragments("app/privacy/page.tsx", "Spanish privacy terminology", [
  "Las meditaciones bíblicas",
  "meditaciones bíblicas con foto",
]);
requireFragments("app/terms/page.tsx", "Spanish terms terminology", [
  "meditaciones bíblicas",
  "meditaciones bíblicas con foto",
]);
requireFragments("app/support/page.tsx", "Spanish support terminology", [
  "meditaciones bíblicas",
]);
requireFragments("app/account-deletion/page.tsx", "Spanish deletion terminology", [
  "Meditaciones bíblicas",
  "meditaciones bíblicas con foto",
]);
requireFragments("app/qt/record/page.tsx", "localized Bible Reflection photo copy", [
  'es: { photoAlt: "Foto de meditación bíblica"',
]);
requireFragments("app/community/page.tsx", "localized community photo copy", [
  'photoAlt: "Foto de meditación bíblica"',
]);
requireFragments("components/PhotoViewerModal.tsx", "localized photo viewer copy", [
  'es: { photo: "Foto"',
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
