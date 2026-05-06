import type { Lang } from "@/lib/i18n";

const IN_APP_BROWSER_PATTERNS = [
  "KAKAOTALK",
  "KAKAOSTORY",
  "Instagram",
  "FBAN",
  "FBAV",
  "FB_IAB",
  "Line/",
  "NAVER",
  "DaumApps",
  "Twitter",
  "TikTok",
];

export function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return IN_APP_BROWSER_PATTERNS.some(pattern => ua.includes(pattern));
}

export function getCurrentExternalUrl() {
  if (typeof window === "undefined") return "https://www.christian-roots.com";
  return window.location.href;
}

export function openCurrentPageInNewWindow() {
  if (typeof window === "undefined") return;
  window.open(getCurrentExternalUrl(), "_blank", "noopener,noreferrer");
}

export async function copyCurrentPageUrl() {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(getCurrentExternalUrl());
    return true;
  } catch {
    return false;
  }
}

export function inAppBrowserText(lang: Lang) {
  const copy = {
    ko: {
      title: "외부 브라우저에서 열어주세요",
      body: "카카오톡 같은 앱 안에서는 Google 로그인이 차단될 수 있어요. Safari나 Chrome에서 다시 열면 정상적으로 로그인할 수 있습니다.",
      hint: "버튼이 잘 작동하지 않으면, 우측 상단 메뉴에서 ‘Safari로 열기’ 또는 ‘기본 브라우저로 열기’를 눌러주세요.",
      open: "외부 브라우저에서 열기",
      copy: "링크 복사",
      copied: "링크를 복사했어요",
      close: "닫기",
    },
    de: {
      title: "Bitte im externen Browser öffnen",
      body: "In In-App-Browsern wie KakaoTalk kann die Google-Anmeldung blockiert werden. Öffnen Sie Roots in Safari oder Chrome, um sich anzumelden.",
      hint: "Falls die Schaltfläche nicht funktioniert, öffnen Sie das Menü oben rechts und wählen Sie „In Safari öffnen“ oder „Im Browser öffnen“.",
      open: "Im externen Browser öffnen",
      copy: "Link kopieren",
      copied: "Link kopiert",
      close: "Schließen",
    },
    en: {
      title: "Open in an external browser",
      body: "Google sign-in can be blocked inside in-app browsers like KakaoTalk. Open Roots in Safari or Chrome to sign in safely.",
      hint: "If the button does not work, use the menu in the top-right corner and choose ‘Open in Safari’ or ‘Open in browser’.",
      open: "Open in external browser",
      copy: "Copy link",
      copied: "Link copied",
      close: "Close",
    },
    fr: {
      title: "Ouvrir dans un navigateur externe",
      body: "La connexion Google peut être bloquée dans les navigateurs intégrés comme KakaoTalk. Ouvrez Roots dans Safari ou Chrome pour vous connecter.",
      hint: "Si le bouton ne fonctionne pas, utilisez le menu en haut à droite et choisissez « Ouvrir dans Safari » ou « Ouvrir dans le navigateur ».",
      open: "Ouvrir dans le navigateur",
      copy: "Copier le lien",
      copied: "Lien copié",
      close: "Fermer",
    },
  } as const;
  return copy[lang] ?? copy.ko;
}
