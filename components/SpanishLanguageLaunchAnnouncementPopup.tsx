"use client";

import { useLang } from "@/lib/useLang";
import type { Lang } from "@/lib/i18n";

type SpanishLanguageLaunchAnnouncementPopupProps = {
  show: boolean;
  onInvite: () => void;
  onClose: () => void;
};

type AnnouncementCopy = {
  title: string;
  body: string;
  invite: string;
  close: string;
};

const COPY: Record<Lang, AnnouncementCopy> = {
  ko: {
    title: "Christian Roots에 새로운 언어가 추가됐어요!",
    body: "한국어, 영어, 독일어, 프랑스어에 이어 스페인어까지!\n함께 영적 습관을 세워갈\n스페인어 사용하는 친구를 초대해보세요!",
    invite: "초대하기",
    close: "닫기",
  },
  en: {
    title: "A new language has been added to Christian Roots!",
    body: "Korean, English, German, French—and now Spanish!\nInvite a Spanish-speaking friend to build spiritual habits together.",
    invite: "Invite",
    close: "Close",
  },
  de: {
    title: "Christian Roots ist jetzt in einer weiteren Sprache verfügbar!",
    body: "Nach Koreanisch, Englisch, Deutsch und Französisch jetzt auch auf Spanisch!\nLade spanischsprachige Freunde ein, gemeinsam geistliche Gewohnheiten aufzubauen.",
    invite: "Einladen",
    close: "Schließen",
  },
  fr: {
    title: "Une nouvelle langue est disponible dans Christian Roots !",
    body: "Après le coréen, l’anglais, l’allemand et le français, voici l’espagnol !\nInvite des amis hispanophones à développer avec toi des habitudes spirituelles.",
    invite: "Inviter",
    close: "Fermer",
  },
  es: {
    title: "¡Christian Roots está disponible en un nuevo idioma!",
    body: "Después del coreano, el inglés, el alemán y el francés, ¡ahora también en español!\nInvita a amigos que hablan español a desarrollar hábitos espirituales contigo.",
    invite: "Invitar",
    close: "Cerrar",
  },
};

export default function SpanishLanguageLaunchAnnouncementPopup({
  show,
  onInvite,
  onClose,
}: SpanishLanguageLaunchAnnouncementPopupProps) {
  const lang = useLang();
  if (!show) return null;

  const copy = COPY[lang];

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 275,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(20px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))",
        background: "rgba(26,28,30,.8)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spanish-language-launch-title"
        aria-describedby="spanish-language-launch-body"
        style={{
          width: "100%",
          maxWidth: 360,
          borderRadius: 28,
          border: "1px solid rgba(122,157,122,.3)",
          background: "var(--bg2)",
          boxShadow: "0 20px 64px rgba(0,0,0,.32)",
          padding: "28px 22px 22px",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 68,
            height: 68,
            margin: "0 auto 15px",
            borderRadius: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--sage-light)",
            border: "1px solid rgba(122,157,122,.26)",
            fontSize: 34,
            lineHeight: 1,
          }}
        >
          🇪🇸
        </div>

        <h2
          id="spanish-language-launch-title"
          style={{
            margin: "0 0 13px",
            color: "var(--text)",
            fontSize: 20,
            lineHeight: 1.4,
            fontWeight: 950,
            letterSpacing: "-.2px",
          }}
        >
          {copy.title}
        </h2>

        <p
          id="spanish-language-launch-body"
          style={{
            margin: "0 0 22px",
            color: "var(--text2)",
            fontSize: 13.5,
            lineHeight: 1.75,
            whiteSpace: "pre-line",
          }}
        >
          {copy.body}
        </p>

        <div style={{ display: "flex", gap: 9 }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-outline"
            style={{ flex: 1, minWidth: 0, minHeight: 46, fontSize: 13 }}
          >
            {copy.close}
          </button>
          <button
            type="button"
            onClick={onInvite}
            className="btn-sage"
            style={{ flex: 1, minWidth: 0, minHeight: 46, fontSize: 13 }}
          >
            {copy.invite}
          </button>
        </div>
      </div>
    </div>
  );
}
