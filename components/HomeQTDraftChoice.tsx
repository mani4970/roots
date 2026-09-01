"use client";

import { ChevronRight, Loader2 } from "lucide-react";

import { t, type Lang } from "@/lib/i18n";

export default function HomeQTDraftChoice({
  lang,
  deleting,
  onContinue,
  onStartNew,
  onClose,
}: {
  lang: Lang;
  deleting: boolean;
  onContinue: () => void;
  onStartNew: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-qt-draft-choice-title"
      aria-describedby="home-qt-draft-choice-description"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "var(--overlay-sheet)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="roots-elevation-sheet"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface-card)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: 18,
          position: "relative",
        }}
      >
        <div style={{ marginBottom: 10, paddingRight: 42 }}>
          <h2
            id="home-qt-draft-choice-title"
            style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", lineHeight: 1.35, marginBottom: 6 }}
          >
            {t("qt_draft_title", lang)}
          </h2>
          <p
            id="home-qt-draft-choice-description"
            style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, whiteSpace: "pre-line" }}
          >
            {t("qt_draft_sub", lang)}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          aria-label={t("home_qt_choice_close", lang)}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 28,
            height: 28,
            border: "none",
            background: "none",
            color: "var(--text3)",
            fontSize: 20,
            cursor: deleting ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: deleting ? 0.45 : 1,
          }}
        >
          ×
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <button
            type="button"
            onClick={onContinue}
            disabled={deleting}
            autoFocus
            className="btn-sage"
            style={{ width: "100%", minHeight: 48, opacity: deleting ? 0.55 : 1 }}
          >
            {t("qt_draft_continue", lang)}
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={onStartNew}
            disabled={deleting}
            className="btn-outline"
            style={{ width: "100%", minHeight: 48, opacity: deleting ? 0.65 : 1 }}
          >
            {deleting && <Loader2 size={16} className="spin" />}
            {t("qt_draft_new", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
