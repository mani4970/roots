"use client";

import { useEffect, useRef, useState } from "react";
import { getLanguageOptions, isLang, type Lang } from "@/lib/i18n";
import { saveLangLocally } from "@/lib/useLang";

interface AuthLanguageSwitcherProps {
  value: Lang;
  onChange: (lang: Lang) => void;
  ariaLabel?: string;
}

export default function AuthLanguageSwitcher({ value, onChange, ariaLabel = "Choose language" }: AuthLanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const options = getLanguageOptions();
  const current = options.find(o => o.code === value) ?? options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectLanguage(next: Lang) {
    if (!isLang(next)) return;
    saveLangLocally(next);
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "absolute", top: 22, right: 22, zIndex: 30 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={ariaLabel}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          height: 36,
          padding: "0 11px",
          borderRadius: 999,
          border: "1px solid var(--auth-card-border)",
          background: "var(--auth-language-trigger-surface)",
          color: "var(--text)",
          fontSize: 13,
          fontWeight: 700,
          boxShadow: "var(--shadow-card)",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
        }}
      >
        <span style={{ fontSize: 16 }}>{current?.flag}</span>
        <span>{String(current?.code ?? value).toUpperCase()}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 44,
            width: 178,
            background: "var(--auth-popover-surface)",
            border: "1px solid var(--auth-card-border)",
            borderRadius: 18,
            padding: 6,
            boxShadow: "var(--shadow-popover)",
          }}
        >
          {options.map(option => {
            const active = option.code === value;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => selectLanguage(option.code)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 10px",
                  background: active ? "var(--auth-sage-surface)" : "transparent",
                  color: active ? "var(--auth-sage-text)" : "var(--text)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 18 }}>{option.flag}</span>
                <span style={{ fontSize: 13, fontWeight: active ? 800 : 600 }}>{option.nativeName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
