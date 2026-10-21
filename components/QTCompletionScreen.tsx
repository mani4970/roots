"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfettiBurst from "@/components/ConfettiBurst";
import { t, type Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";
import { observe, resumeObservationFlow, type ObservationFlow } from "@/lib/appObservation";
import QtExternalShareButton from "@/components/QtExternalShareButton";
import type { QtShareRecord } from "@/lib/qtShare";

type QTCompletionScreenProps = {
  lang: Lang;
  onConfirm: () => void;
  notice?: string | null;
  observationFlow?: ObservationFlow | null;
  shareRecord?: QtShareRecord | null;
  shareRecordId?: string | null;
};

/** Rendered only after the caller has confirmed its required save/progress work. */
export default function QTCompletionScreen({ lang, onConfirm, notice, observationFlow, shareRecord, shareRecordId }: QTCompletionScreenProps) {
  const router = useRouter();
  const observationRef = useRef<ObservationFlow | null>(observationFlow ?? null);
  const visibleRecordedRef = useRef(false);
  const confirmedRef = useRef(false);
  const confirmationRecordedRef = useRef(false);
  const [loadedShareRecord, setLoadedShareRecord] = useState<QtShareRecord | null>(null);

  useEffect(() => {
    if (shareRecord || !shareRecordId) return;
    let cancelled = false;
    // Duplicate-save recovery has a confirmed record ID, not a saved snapshot
    // of the current form. Resolve only that owned record without gating Home.
    const supabase = createClient();
    void supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id;
      if (!userId || cancelled) return;
      const { data: savedRecord, error } = await supabase.from("qt_records")
        .select("*").eq("id", shareRecordId).eq("user_id", userId).eq("is_draft", false).maybeSingle();
      if (!cancelled && !error && savedRecord) setLoadedShareRecord(savedRecord);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [shareRecord, shareRecordId]);

  const savedShareRecord = shareRecord ?? (loadedShareRecord?.id === shareRecordId ? loadedShareRecord : null);

  useEffect(() => {
    try {
      let cancelled = false;
      let frame: number | null = null;
      const recordVisible = () => {
        if (cancelled || visibleRecordedRef.current || !observationRef.current || document.visibilityState !== "visible") return;
        if (frame !== null) window.cancelAnimationFrame(frame);
        // A mounted component is not proof of display. Wait for a foreground
        // layout frame, then the following frame after it has had time to paint.
        frame = window.requestAnimationFrame(() => {
          frame = window.requestAnimationFrame(() => {
            if (cancelled || visibleRecordedRef.current || document.visibilityState !== "visible") return;
            visibleRecordedRef.current = true;
            observe(observationRef.current, "completion_visible", { source: "completion_screen" });
          });
        });
      };
      void createClient().auth.getSession().then(({ data }) => {
        if (cancelled) return;
        const userId = data.session?.user.id;
        if (!userId) return;
        if (observationRef.current?.userId !== userId) {
          observationRef.current = resumeObservationFlow("qt_completion", userId);
        }
        if (confirmedRef.current && !confirmationRecordedRef.current && observationRef.current) {
          confirmationRecordedRef.current = true;
          observe(observationRef.current, "completion_confirmed", { source: "completion_screen" });
        }
        recordVisible();
      }).catch(() => undefined);
      recordVisible();
      document.addEventListener("visibilitychange", recordVisible);
      return () => {
        cancelled = true;
        if (frame !== null) window.cancelAnimationFrame(frame);
        document.removeEventListener("visibilitychange", recordVisible);
      };
    } catch { /* Observation setup must never prevent completion display. */ }
  }, []);

  function confirmCompletion() {
    if (!confirmedRef.current) {
      confirmedRef.current = true;
      confirmationRecordedRef.current = Boolean(observationRef.current);
      observe(observationRef.current, "completion_confirmed", { source: "completion_screen" });
    }
    onConfirm();
  }

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
        {savedShareRecord && <div style={{ marginBottom: 10 }}><QtExternalShareButton record={savedShareRecord} lang={lang} /></div>}
        <button type="button" className="btn-sage" onClick={confirmCompletion} style={{ width: "100%" }}>
          {t("qt_complete_go_home", lang)}
        </button>
      </div>
    </div>
  );
}
