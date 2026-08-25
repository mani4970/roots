"use client";

import type { MonthlyBadgeDefinition } from "@/lib/monthlyBadges";
import { getMonthlyBadgeText } from "@/lib/monthlyBadgeText";
import { useLang } from "@/lib/useLang";

type MonthlyBadgeAwardPopupProps = {
  badge: MonthlyBadgeDefinition | null;
  show: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const MONTH_LOCALE = {
  ko: "ko-KR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
} as const;

export default function MonthlyBadgeAwardPopup({
  badge,
  show,
  onConfirm,
  onClose,
}: MonthlyBadgeAwardPopupProps) {
  const lang = useLang();
  if (!show || !badge) return null;

  const copy = getMonthlyBadgeText(lang);
  const monthLabel = new Date(badge.year, badge.month - 1, 1).toLocaleDateString(
    MONTH_LOCALE[lang],
    { month: "long" },
  );

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 274,
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
        aria-label={copy.awardBadgeAlt(monthLabel)}
        aria-describedby="monthly-badge-award-body"
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
            width: 118,
            height: 118,
            margin: "0 auto 13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={badge.image}
            alt={copy.awardBadgeAlt(monthLabel)}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

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
            id="monthly-badge-award-body"
            style={{
              margin: "0 0 8px",
              color: "var(--text2)",
              fontSize: 13.5,
              lineHeight: 1.68,
              fontWeight: 700,
              wordBreak: "keep-all",
            }}
          >
            {copy.awardBody(monthLabel)}
          </p>
          <p
            style={{
              margin: 0,
              color: "var(--sage-dark)",
              fontSize: 13.5,
              lineHeight: 1.6,
              fontWeight: 900,
              wordBreak: "keep-all",
            }}
          >
            {copy.awardCta(monthLabel)}
          </p>
        </div>

        <div style={{ display: "flex", gap: 9 }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-outline"
            style={{ flex: 1, minWidth: 0, minHeight: 46, fontSize: 13 }}
          >
            {copy.awardClose}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-sage"
            style={{ flex: 1, minWidth: 0, minHeight: 46, fontSize: 13 }}
          >
            {copy.awardConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
