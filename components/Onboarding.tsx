"use client";
import { useState } from "react";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";
import { storageSet } from "@/lib/clientStorage";

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const lang = useLang();

  const SLIDES = [
    {
      emoji: "🌱",
      title: t("onboarding_title1", lang),
      desc: t("onboarding_desc1", lang),
      sub: null,
    },
    {
      emoji: "💭",
      title: t("onboarding_title2", lang),
      desc: t("onboarding_desc2", lang),
      sub: null,
    },
    {
      emoji: "📖",
      title: t("onboarding_title3", lang),
      desc: t("onboarding_desc3", lang),
      sub: t("onboarding_desc3_sub", lang),
    },
    {
      emoji: "🙏",
      title: t("onboarding_title4", lang),
      desc: t("onboarding_desc4", lang),
      sub: t("onboarding_desc4_sub", lang),
    },
    {
      emoji: "🌳",
      title: t("onboarding_title5", lang),
      desc: t("onboarding_desc5", lang),
      sub: t("onboarding_desc5_sub", lang),
    },
  ];

  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  function neverShow() {
    storageSet("onboarding_done", "true");
    onClose();
  }

  function next() {
    if (!isLast) setPage(p => p + 1);
    else neverShow();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", width: "100%", maxWidth: 360, padding: "36px 28px 28px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{ width: i === page ? 20 : 6, height: 6, borderRadius: 3, background: i === page ? "var(--sage)" : "var(--border)", transition: "all 0.3s" }} />
          ))}
        </div>
        <div style={{ width: 44, height: 44, margin: "0 auto 16px", borderRadius: 16, background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.28)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sage-dark)", fontSize: 13, fontWeight: 800 }}>
          {String(page + 1).padStart(2, "0")}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 14, lineHeight: 1.3 }}>
          {slide.title}
        </h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.85, whiteSpace: "pre-line", marginBottom: slide.sub ? 14 : 32 }}>
          {slide.desc}
        </p>
        {slide.sub && (
          <div style={{ background: "var(--bg3)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border)", marginBottom: 28 }}>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{slide.sub}</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={next} className="btn-sage">
            {isLast ? t("onboarding_start", lang) : t("onboarding_next", lang)}
          </button>
          {!isLast && (
            <button onClick={neverShow} className="btn-outline" style={{ fontSize: 12 }}>
              {t("onboarding_skip", lang)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
