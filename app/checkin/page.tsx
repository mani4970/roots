"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/useLang";
import BottomNav from "@/components/BottomNav";
import { t, type TKey } from "@/lib/i18n";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";

import { createClient } from "@/lib/supabase";
import { getLocalDateString } from "@/lib/date";
import { readDailyWordRecord } from "@/lib/dailyWordCardRecord";
import { getWordCardText } from "@/lib/wordCardText";
import { withQtDraftTimeout } from "@/lib/qtDraftSync";

const EMOTION_GROUPS = [
  {
    catKey: "checkin_cat1" as TKey,
    color: "var(--daily-word-gold-surface)", border: "var(--daily-word-gold-border)", labelColor: "var(--daily-word-gold-text)",
    items: ["grateful","joyful","peaceful","excited"],
  },
  {
    catKey: "checkin_cat2" as TKey,
    color: "var(--daily-word-sage-surface)", border: "var(--daily-word-sage-border)", labelColor: "var(--daily-word-sage-text)",
    items: ["grace","hungry","mission","repent","renew"],
  },
  {
    catKey: "checkin_cat3" as TKey,
    color: "var(--daily-word-blue-surface)", border: "var(--daily-word-blue-border)", labelColor: "var(--daily-word-blue-text)",
    items: ["tired","lonely","sad","anxious"],
  },
  {
    catKey: "checkin_cat4" as TKey,
    color: "var(--daily-word-terra-surface)", border: "var(--daily-word-terra-border)", labelColor: "var(--daily-word-terra-text)",
    items: ["doubt","dry","angry","far"],
  },
  {
    catKey: "checkin_cat5" as TKey,
    color: "var(--daily-word-prayer-surface)", border: "var(--daily-word-prayer-border)", labelColor: "var(--daily-word-prayer-text)",
    items: ["family","work","relation","health","future"],
  },
];

export default function CheckinPage() {
  const router = useRouter();
  const lang = useLang();
  const [selected, setSelected] = useState<string | null>(null);
  const [entryStatus, setEntryStatus] = useState<"checking" | "empty" | "redirecting" | "error">("checking");
  const [retryNonce, setRetryNonce] = useState(0);
  const wordText = getWordCardText(lang);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    setEntryStatus("checking");
    void (async () => {
      try {
        const client = createClient();
        const { data: { user }, error } = await withQtDraftTimeout(client.auth.getUser(), 6_000, "daily Word entry user");
        if (cancelled) return;
        if (error) throw error;
        if (!user) { router.replace("/welcome"); return; }
        const row = await readDailyWordRecord(client, user.id, getLocalDateString(), controller.signal);
        if (cancelled) return;
        // Also protect direct links/browser Back, not only the Home button.
        if (row) { setEntryStatus("redirecting"); router.replace("/checkin/result"); }
        else setEntryStatus("empty");
      } catch { if (!cancelled) setEntryStatus("error"); }
      finally { clearTimeout(timeout); }
    })();
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [retryNonce, router]);

  const EMOTIONS = EMOTION_GROUPS.map(g => ({
    ...g,
    category: t(g.catKey, lang),
    items: g.items.map(id => ({
      id,
      label: t(`emotion_${id}` as TKey, lang),
      img: `/emotion_${id}.png`,
    })),
  }));

  const selectedItem = EMOTIONS.flatMap(g => g.items).find(e => e.id === selected);

  useAndroidBackHandler(() => {
    if (!selected) return false;
    setSelected(null);
    return true;
  });

  // Never replace the emotion list with an intermediate received-word loader.
  // Check direct links/Back in the background. ResultContent also rechecks the
  // authenticated owner and date before any draw/write, including fast taps.

  return (
    <div className="roots-daily-word-phase2e" style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: selected ? "calc(210px + var(--bottom-nav-bottom-padding))" : "calc(104px + var(--bottom-nav-bottom-padding))", position: "relative" }}>
      <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 20px" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13, color: "var(--text3)" }}>{t("back", lang)}</span>
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", whiteSpace: "pre-line" }}>{t("checkin_title", lang)}</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 6 }}>{t("checkin_sub", lang)}</p>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        {entryStatus === "error" && <div role="alert" style={{ marginBottom: 16, color: "var(--text2)", fontSize: 13, lineHeight: 1.6 }}>
          <p>{wordText.entryCheckError}</p>
          <button type="button" className="btn-outline" onClick={() => setRetryNonce(n => n + 1)}>{wordText.retry}</button>
        </div>}
        {EMOTIONS.map(group => (
          <div key={group.category} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
              <p style={{ fontSize: 11, fontWeight: 700, color: group.labelColor, letterSpacing: "0.5px", flexShrink: 0 }}>
                {group.category}
              </p>
              <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {group.items.map(item => {
                const on = selected === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    style={{
                      background: on ? group.color : "var(--daily-word-card-surface)",
                      border: `1.5px solid ${on ? group.border : "var(--daily-word-card-border)"}`,
                      borderRadius: 16,
                      padding: "12px 6px 10px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      transform: on ? "scale(1.04)" : "scale(1)",
                    }}
                  >
                    <div style={{ width: 32, height: 32, margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={item.img} alt={item.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: on ? 700 : 500, display: "block", color: on ? group.labelColor : "var(--text2)", lineHeight: 1.3, wordBreak: "keep-all" }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selected && selectedItem && (
        <div style={{ position: "fixed", bottom: "calc(52px + var(--bottom-nav-bottom-padding))", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "var(--daily-word-sheet-surface)", borderTop: "1px solid var(--daily-word-card-border)", padding: "12px 16px 12px", zIndex: 45, boxShadow: "var(--daily-word-sheet-shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "10px 14px", background: "var(--daily-word-sheet-preview-surface)", borderRadius: 12 }}>
            <img src={selectedItem.img} alt={selectedItem.label} style={{ width: 32, height: 32, objectFit: "contain" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{selectedItem.label}</span>
          </div>
          <button className="btn-sage" disabled={entryStatus === "error" || entryStatus === "redirecting"}
            onClick={() => router.push(`/checkin/result?emotions=${selected}`)}>
            {t("checkin_receive", lang)}
          </button>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
