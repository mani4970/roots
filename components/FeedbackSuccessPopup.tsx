"use client";

import HomeHubDialog from "@/components/HomeHubDialog";
import { useLang } from "@/lib/useLang";
import { t, type Lang } from "@/lib/i18n";

type FeedbackSuccessLang = Lang | "es";

const FEEDBACK_SUCCESS_COPY: Record<FeedbackSuccessLang, { message: string; close: string }> = {
  ko: {
    message: "소중한 의견 감사합니다!",
    close: "확인",
  },
  en: {
    message: "Thank you for your valuable feedback!",
    close: "Close",
  },
  de: {
    message: "Vielen Dank für Ihr wertvolles Feedback!",
    close: "Schließen",
  },
  fr: {
    message: "Merci pour votre précieux retour !",
    close: "Fermer",
  },
  es: {
    message: "¡Gracias por compartir tu valiosa opinión!",
    close: "Cerrar",
  },
};

interface FeedbackSuccessPopupProps {
  show: boolean;
  desktop: boolean;
  onClose: () => void;
}

export default function FeedbackSuccessPopup({ show, desktop, onClose }: FeedbackSuccessPopupProps) {
  const lang = useLang();

  if (!show) return null;

  const copy = FEEDBACK_SUCCESS_COPY[lang];

  const content = (
    <>
      <div
        aria-hidden="true"
        style={{
          width: 58,
          height: 58,
          margin: "0 auto 16px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--sage-light)",
          color: "var(--sage-dark)",
          fontSize: 28,
          fontWeight: 800,
        }}
      >
        ✓
      </div>
      <h3
        id="feedback-success-title"
        aria-hidden={desktop || undefined}
        style={{
          margin: "0 0 20px",
          color: "var(--text)",
          fontSize: 18,
          fontWeight: 800,
          lineHeight: 1.5,
        }}
      >
        {copy.message}
      </h3>
      <button
        type="button"
        onClick={onClose}
        style={{
          width: "100%",
          padding: "13px",
          background: "var(--sage-action)",
          color: "var(--on-sage-action)",
          border: "none",
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {copy.close}
      </button>
    </>
  );

  if (desktop) {
    return (
      <HomeHubDialog open title={copy.message} hideTitle closeLabel={t("close", lang)}
        onClose={onClose} boundarySelector=".roots-desktop-profile" dialogClassName="profile-desktop-feedback-success">
        <div style={{ textAlign: "center" }}>{content}</div>
      </HomeHubDialog>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 102,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--overlay-modal)",
        backdropFilter: "blur(8px)",
        padding: "24px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-success-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 340,
          padding: "28px 24px 22px",
          background: "var(--profile-modal-surface)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          boxShadow: "var(--shadow-sheet)",
          textAlign: "center",
        }}
      >
        {content}
      </div>
    </div>
  );
}
