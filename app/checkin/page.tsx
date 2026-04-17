"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/useLang";
import { t, type TKey } from "@/lib/i18n";

const EMOTION_GROUPS = [
  {
    catKey: "checkin_cat1" as TKey,
    color: "rgba(232,197,71,0.15)", border: "rgba(232,197,71,0.3)", labelColor: "rgba(180,140,30,0.9)",
    items: ["grateful","joyful","peaceful","excited","full"],
  },
  {
    catKey: "checkin_cat2" as TKey,
    color: "rgba(122,157,122,0.12)", border: "rgba(122,157,122,0.3)", labelColor: "var(--sage-dark)",
    items: ["grace","hungry","mission","repent","renew"],
  },
  {
    catKey: "checkin_cat3" as TKey,
    color: "rgba(100,120,180,0.1)", border: "rgba(100,120,180,0.25)", labelColor: "rgba(80,100,160,0.9)",
    items: ["tired","exhausted","lonely","sad","anxious"],
  },
  {
    catKey: "checkin_cat4" as TKey,
    color: "rgba(180,120,80,0.1)", border: "rgba(180,120,80,0.25)", labelColor: "rgba(150,90,50,0.9)",
    items: ["doubt","dry","angry","far"],
  },
  {
    catKey: "checkin_cat5" as TKey,
    color: "rgba(122,157,122,0.08)", border: "rgba(122,157,122,0.2)", labelColor: "var(--sage-dark)",
    items: ["family","work","relation","health","future"],
  },
];

export default function CheckinPage() {
  const router = useRouter();
  const lang = useLang();
  const [selected, setSelected] = useState<string | null>(null);

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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 140 }}>
      <div style={{ background: "var(--bg)", padding: "56px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13, color: "var(--text3)" }}>{t("back", lang)}</span>
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", whiteSpace: "pre-line" }}>{t("checkin_title", lang)}</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 6 }}>{t("checkin_sub", lang)}</p>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
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
                      background: on ? group.color : "var(--bg2)",
                      border: `1.5px solid ${on ? group.border : "var(--border)"}`,
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
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "var(--bg2)", borderTop: "1px solid var(--border)", padding: "14px 16px 28px", zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 14px", background: "var(--bg3)", borderRadius: 12 }}>
            <img src={selectedItem.img} alt={selectedItem.label} style={{ width: 32, height: 32, objectFit: "contain" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{selectedItem.label}</span>
          </div>
          <button className="btn-sage" onClick={() => router.push(`/checkin/result?emotions=${selected}`)}>
            {t("checkin_receive", lang)}
          </button>
        </div>
      )}
    </div>
  );
}
