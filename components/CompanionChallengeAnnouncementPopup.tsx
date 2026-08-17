"use client";

import { Loader2, Users } from "lucide-react";
import { useLang } from "@/lib/useLang";

type AnnouncementLang = "ko" | "en" | "de" | "fr" | "es";

type CompanionChallengeAnnouncementPopupProps = {
  show: boolean;
  busy?: boolean;
  onManageCompanions: () => void;
  onClose: () => void;
};

const COPY: Record<
  AnnouncementLang,
  {
    title: string;
    body: string;
    reward: string;
    manage: string;
    close: string;
    badgeAlt: string;
  }
> = {
  ko: {
    title: "동역자 챌린지가 곧 시작됩니다!",
    body: "동역자를 맺고, 매일 말씀 묵상을 나누어 보세요.",
    reward:
      "챌린지를 완주하면, 스페셜 배지와 하트 20개를 받을 수 있어요!",
    manage: "동역자 관리",
    close: "닫기",
    badgeAlt: "우리의 신앙 여정 Part 2 스페셜 배지",
  },
  en: {
    title: "The Companion Challenge is starting soon!",
    body: "Connect with a faith partner and share a Bible Reflection each day.",
    reward:
      "Complete the challenge to receive a special badge and 20 Love Hearts!",
    manage: "Manage companions",
    close: "Close",
    badgeAlt: "Our Faith Journey Part 2 special badge",
  },
  de: {
    title: "Die Glaubenspartner-Challenge startet bald!",
    body:
      "Verbinde dich mit einem Glaubenspartner und teilt täglich eure Stille Zeit.",
    reward:
      "Wenn ihr die Challenge abschließt, erhaltet ihr ein besonderes Abzeichen und 20 Liebesherzen!",
    manage: "Glaubenspartner verwalten",
    close: "Schließen",
    badgeAlt: "Unsere Glaubensreise Teil 2 – besonderes Abzeichen",
  },
  fr: {
    title: "Le défi avec partenaire commence bientôt !",
    body:
      "Tissez un lien avec un partenaire de foi et partagez chaque jour votre méditation biblique.",
    reward:
      "Terminez le défi pour recevoir un badge spécial et 20 cœurs d’amour !",
    manage: "Gérer les partenaires",
    close: "Fermer",
    badgeAlt: "Notre chemin de foi Partie 2 – badge spécial",
  },
  es: {
    title: "¡El desafío con compañero de fe comenzará pronto!",
    body:
      "Conecta con un compañero de fe para compartir una meditación bíblica cada día.",
    reward:
      "¡Completen el desafío para recibir una insignia especial y 20 corazones de amor!",
    manage: "Gestionar compañeros de fe",
    close: "Cerrar",
    badgeAlt: "Insignia especial Nuestro camino de fe Parte 2",
  },
};

export default function CompanionChallengeAnnouncementPopup({
  show,
  busy = false,
  onManageCompanions,
  onClose,
}: CompanionChallengeAnnouncementPopupProps) {
  const lang = useLang();
  if (!show) return null;
  const copy = COPY[lang] ?? COPY.ko;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 248,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:
          "calc(20px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))",
        background: "rgba(26,28,30,.82)",
        backdropFilter: "blur(9px)",
        WebkitBackdropFilter: "blur(9px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="companion-challenge-2-announcement-title"
        style={{
          width: "100%",
          maxWidth: 356,
          borderRadius: 28,
          border: "1px solid var(--border-gold-soft)",
          background: "var(--bg2)",
          boxShadow: "0 22px 68px rgba(0,0,0,.34)",
          padding: "26px 21px 21px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 116,
            height: 116,
            margin: "0 auto 13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/images/companion-challenges/companion-challenge-2.png"
            alt={copy.badgeAlt}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        <h2
          id="companion-challenge-2-announcement-title"
          style={{
            margin: "0 0 11px",
            color: "var(--text)",
            fontSize: 20,
            fontWeight: 950,
            lineHeight: 1.36,
            wordBreak: "keep-all",
          }}
        >
          {copy.title}
        </h2>

        <div
          style={{
            borderRadius: 17,
            border: "1px solid var(--border-sage-soft)",
            background: "var(--surface-sage-subtle)",
            padding: "14px 15px",
            marginBottom: 17,
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "var(--text2)",
              fontSize: 13.5,
              lineHeight: 1.65,
              fontWeight: 700,
              wordBreak: "keep-all",
            }}
          >
            {copy.body}
          </p>
          <p
            style={{
              margin: 0,
              color: "var(--text-gold-strong)",
              fontSize: 13.5,
              lineHeight: 1.65,
              fontWeight: 900,
              wordBreak: "keep-all",
            }}
          >
            {copy.reward}
          </p>
        </div>

        <button
          type="button"
          onClick={onManageCompanions}
          disabled={busy}
          className="btn-sage"
          style={{
            width: "100%",
            minHeight: 47,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: busy ? 0.65 : 1,
          }}
        >
          {busy ? <Loader2 size={17} className="spin" /> : <Users size={17} />}
          {copy.manage}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          style={{
            width: "100%",
            minHeight: 42,
            marginTop: 8,
            border: 0,
            background: "transparent",
            color: "var(--text3)",
            fontSize: 13,
            fontWeight: 800,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {copy.close}
        </button>
      </div>
    </div>
  );
}
