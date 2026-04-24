"use client";

import { useEffect, useRef, useState } from "react";
import { getLanguageOptions, isLang, type Lang } from "@/lib/i18n";
import { markLangSelected } from "@/lib/useLang";

interface AuthLanguageSwitcherProps {
  value: Lang;
  onChange: (lang: Lang) => void;
}

export default function AuthLanguageSwitcher({ value, onChange }: AuthLanguageSwitcherProps) {
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
    localStorage.setItem("roots_lang", next);
    markLangSelected();
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "absolute", top: 18, right: 18, zIndex: 30 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Choose language"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          height: 36,
          padding: "0 11px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "rgba(255,255,255,0.64)",
          color: "var(--text)",
          fontSize: 13,
          fontWeight: 700,
          boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
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
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: 6,
            boxShadow: "0 14px 38px rgba(0,0,0,0.14)",
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
                  background: active ? "var(--sage-light)" : "transparent",
                  color: active ? "var(--sage-dark)" : "var(--text)",
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
