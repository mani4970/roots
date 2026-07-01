"use client";

import {
  INVITE_LANDING_LANG_OPTIONS,
  type InviteLandingLang,
} from "@/lib/inviteLandingText";

type InviteLanguageSwitcherProps = {
  value: InviteLandingLang;
  onChange: (lang: InviteLandingLang) => void;
  ariaLabel: string;
};

export default function InviteLanguageSwitcher({
  value,
  onChange,
  ariaLabel,
}: InviteLanguageSwitcherProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: 4,
        borderRadius: 999,
        background: "rgba(255,255,255,0.78)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 18px rgba(50,45,38,0.06)",
        marginBottom: 18,
      }}
    >
      {INVITE_LANDING_LANG_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={option.label}
            aria-pressed={selected}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "6px 9px",
              background: selected ? "var(--sage)" : "transparent",
              color: selected ? "var(--bg)" : "var(--text3)",
              fontSize: 11,
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            {option.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
