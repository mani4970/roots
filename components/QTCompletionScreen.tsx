"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ConfettiBurst from "@/components/ConfettiBurst";
import { t, type Lang } from "@/lib/i18n";

type QTCompletionScreenProps = {
  lang: Lang;
  onConfirm: () => void;
  notice?: string | null;
};

/** Rendered only after the caller has confirmed its required save/progress work. */
export default function QTCompletionScreen({ lang, onConfirm, notice }: QTCompletionScreenProps) {
  const router = useRouter();

  useEffect(() => {
    // Completion is already visible while Home's route is prepared. Neither
    // this prefetch nor another route's JavaScript gates the celebration.
    router.prefetch("/");
    window.scrollTo(0, 0);
  }, [router]);

  return (
    <div className="roots-native-tablet-viewport" data-qt-completion="ready" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", position: "relative", overflow: "hidden" }}>
      <ConfettiBurst variant="absolute" zIndex={0} />
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 28, padding: "36px 28px", width: "100%", maxWidth: 340, boxShadow: "0 18px 54px rgba(0,0,0,0.18)" }}>
        <div style={{ width: 88, height: 88, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/icon-qt.webp" alt={t("qt_complete_title", lang)} width={76} height={76} style={{ objectFit: "contain" }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 10, lineHeight: 1.3 }}>{t("qt_complete_title", lang)}</h1>
        <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.7, marginBottom: 6 }}>{t("qt_complete_sub", lang)}</p>
        <p style={{ color: "var(--sage-dark)", fontSize: 13, lineHeight: 1.65, marginBottom: 28 }}>
          {t("qt_complete_blessing", lang)}
        </p>
        {notice && <p role="status" style={{ color: "var(--text2)", fontSize: 13, lineHeight: 1.65, marginBottom: 18 }}>{notice}</p>}
        <button type="button" className="btn-sage" onClick={onConfirm} style={{ width: "100%" }}>
          {t("confirm", lang)}
        </button>
      </div>
    </div>
  );
}
