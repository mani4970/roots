"use client";
import { useState } from "react";
import { getLanguageOptions, t, type Lang, FALLBACK_LANG } from "@/lib/i18n";
import { markLangSelected } from "@/lib/useLang";

interface LanguagePickerProps {
  onSelect: (lang: Lang) => void;
  /** 초기 선택 언어 (기본: FALLBACK_LANG) */
  initialLang?: Lang;
}

/**
 * 첫 실행 시 표시되는 언어 선택 모달
 * SUPPORTED_LANGS 에서 자동으로 목록을 읽어오므로 언어 추가 시 이 파일 수정 불필요
 */
export default function LanguagePicker({ onSelect, initialLang = FALLBACK_LANG }: LanguagePickerProps) {
  const [selected, setSelected] = useState<Lang>(initialLang);
  const options = getLanguageOptions();

  function handleContinue() {
    if (typeof window !== "undefined") {
      localStorage.setItem("roots_lang", selected);
    }
    markLangSelected();
    onSelect(selected);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", overflowY: "auto" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <svg width="60" height="75" viewBox="0 0 80 100" fill="none" style={{ marginBottom: 16 }}>
          <path d="M40 90 Q38 70 40 50" stroke="#7A9D7A" strokeWidth="3" strokeLinecap="round"/>
          <path d="M40 65 Q25 55 22 40 Q35 42 40 55" fill="#7A9D7A" opacity="0.85"/>
          <path d="M40 58 Q55 48 58 33 Q45 35 40 48" fill="#5C8A58" opacity="0.85"/>
          <ellipse cx="40" cy="90" rx="18" ry="5" fill="#C4956A" opacity="0.4"/>
        </svg>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: 6 }}>Roots</h1>
        <p style={{ color: "var(--text3)", fontSize: 13 }}>🌱</p>
      </div>

      <div style={{ width: "100%", maxWidth: 340 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: 4 }}>
          {t("lang_picker_title", selected)}
        </h2>
        <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginBottom: 28 }}>
          {t("lang_picker_sub", selected)}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {options.map(opt => (
            <button
              key={opt.code}
              onClick={() => setSelected(opt.code)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                borderRadius: 14,
                border: `2px solid ${selected === opt.code ? "var(--sage)" : "var(--border)"}`,
                background: selected === opt.code ? "var(--sage-light)" : "var(--bg2)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 28 }}>{opt.flag}</span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: selected === opt.code ? "var(--sage-dark)" : "var(--text)" }}>
                  {opt.nativeName}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{opt.englishName}</div>
              </div>
              {selected === opt.code && (
                <span style={{ color: "var(--sage)", fontSize: 18, fontWeight: 700 }}>✓</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          style={{
            width: "100%",
            padding: "14px",
            background: "var(--sage)",
            color: "var(--bg)",
            border: "none",
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("lang_continue", selected)} →
        </button>
      </div>
    </div>
  );
}
