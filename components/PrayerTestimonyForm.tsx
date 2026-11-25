"use client";

import { useId, type Ref } from "react";
import { Loader2 } from "lucide-react";
import { t, type Lang } from "@/lib/i18n";
import { usePrayerPopupBackdrop } from "@/lib/usePrayerPopupBackdrop";
import styles from "./PrayerExperience.module.css";

type Props = {
  lang: Lang;
  text: string;
  onTextChange: (value: string) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  error?: string;
  overlayRef?: Ref<HTMLDivElement>;
  dismissOnBackdrop?: boolean;
};

export default function PrayerTestimonyForm({
  lang, text, onTextChange, saving, onCancel, onSave, error, overlayRef, dismissOnBackdrop,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const backdrop = usePrayerPopupBackdrop(() => { if (!saving) onCancel(); });
  return (
    <div ref={overlayRef} className={`roots-prayer-phase2c ${styles.formOverlay}`} data-prayer-dialog
      role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1}
      {...(dismissOnBackdrop ? backdrop : {})}>
      <div style={{ background: "var(--prayer-modal-surface)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)", boxShadow: "var(--shadow-modal)" }}>
        <h2 id={titleId} style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
          {t("prayer_share_answered_title", lang)}
        </h2>
        <p id={descriptionId} style={{ fontSize: 12, color: "var(--prayer-muted-text)", marginBottom: 14 }}>
          {t("prayer_share_answered_desc", lang)}
        </p>
        <textarea className="textarea-field" rows={4} aria-labelledby={titleId}
          placeholder={t("prayer_share_answered_placeholder", lang)} readOnly={saving}
          value={text} onChange={event => onTextChange(event.target.value)} />
        {error && <p role="alert" style={{ color: "var(--prayer-danger-text)", marginTop: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button type="button" className="btn-outline" disabled={saving} onClick={onCancel} style={{ flex: 1 }}>
            {t("prayer_cancel", lang)}
          </button>
          <button type="button" className="btn-sage roots-prayer-action" disabled={saving || !text.trim()}
            aria-label={t("prayer_save_action", lang)} aria-busy={saving} onClick={onSave} style={{ flex: 1 }}>
            {saving ? <Loader2 size={16} className="spin" aria-hidden="true" /> : t("prayer_save_action", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
