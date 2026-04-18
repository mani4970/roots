"use client";
import { useState } from "react";
import { useLang } from "@/lib/useLang";
import { t } from "@/lib/i18n";

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
      sub: lang === "de"
        ? "Nicht \"Bitte beten\" – sondern:\n\"Heute mittags 5 Minuten, Handy weglegen und mit Gott reden.\"\nKonkrete Handlungen."
        : lang === "en"
        ? "Not \'please pray\' but:\n\'Today at lunch, 5 min, put your phone down and talk to God.\'\nConcrete actions."
        : "\"기도하세요\"가 아니라\n\"오늘 점심 5분, 핸드폰 내려놓고 주님께 말 걸어보세요\"처럼\n손발로 할 수 있는 것들이에요.",
    },
    {
      emoji: "📖",
      title: t("onboarding_title3", lang),
      desc: lang === "de"
        ? "① Eröffnungsgebet\n② Zusammenfassung\n③ Schlüsselvers\n④ Empfinden & Meditation\n⑤ Anwendung & Entschluss\n⑥ Abschlussgebet"
        : lang === "en"
        ? "① Opening Prayer\n② Summary\n③ Key Verse\n④ Reflection & Meditation\n⑤ Application & Resolution\n⑥ Closing Prayer"
        : "① 들어가는 기도\n② 본문 요약\n③ 붙잡은 말씀\n④ 느낌과 묵상\n⑤ 적용과 결단\n⑥ 올려드리는 기도",
      sub: lang === "de"
        ? "Auch für Anfänger geeignet.\nJeder Schritt wird erklärt."
        : lang === "en"
        ? "Suitable for beginners.\nEach step is guided."
        : "처음이어도 괜찮아요.\n각 단계마다 안내가 있어서 혼자서도 충분히 할 수 있어요.",
    },
    {
      emoji: "🙏",
      title: t("onboarding_title4", lang),
      desc: t("onboarding_desc4", lang),
      sub: lang === "de"
        ? "Im Gebet → Erhörtes Gebet\nGottes Wirken aufzeichnen."
        : lang === "en"
        ? "Praying → Answered prayer\nRecord God's work."
        : "기도 중 → 기도 응답으로\n하나님의 일하심을 기록해가요.",
    },
    {
      emoji: "🌳",
      title: t("onboarding_title5", lang),
      desc: t("onboarding_desc5", lang),
      sub: lang === "de"
        ? "Konsequenz ist das Wichtigste.\nFangen Sie heute an! 🌱"
        : lang === "en"
        ? "Consistency is key.\nStart today! 🌱"
        : "꾸준히 하는 게 핵심이에요.\n오늘부터 시작해봐요! 🌱",
    },
  ];

  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  function neverShow() {
    localStorage.setItem("onboarding_done", "true");
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
        <div style={{ fontSize: 56, marginBottom: 16 }}>{slide.emoji}</div>
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
