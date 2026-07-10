"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Gift, PackageOpen, Sparkles } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { HEART_SHOP_CATALOG } from "@/lib/heartShopCatalog";
import { getHeartShopText, type HeartShopTab } from "@/lib/heartShopText";

type HeartShopModalProps = {
  show: boolean;
  lang: Lang | string;
  heartBalance: number;
  onClose: () => void;
};

export default function HeartShopModal({ show, lang, heartBalance, onClose }: HeartShopModalProps) {
  const text = useMemo(() => getHeartShopText(lang), [lang]);
  const [activeTab, setActiveTab] = useState<HeartShopTab>("map");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!show) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setActiveTab("map");
    setNotice("");
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [show]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!show) return null;

  const tabs: { id: HeartShopTab; label: string }[] = [
    { id: "map", label: text.mapTab },
    { id: "character", label: text.characterTab },
    { id: "owned", label: text.ownedTab },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={text.title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        justifyContent: "center",
        background: "rgba(24, 25, 27, 0.28)",
        overflow: "hidden",
        overscrollBehavior: "contain",
      }}
    >
      {notice && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: 74,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 520,
            width: "calc(100% - 40px)",
            maxWidth: 390,
            padding: "11px 14px",
            borderRadius: 16,
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            boxShadow: "0 12px 30px rgba(55, 43, 31, 0.16)",
            color: "var(--text)",
            fontSize: 12,
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          {notice}
        </div>
      )}

      <div
        style={{
          minHeight: "100dvh",
          height: "100dvh",
          width: "100%",
          maxWidth: 430,
          margin: "0 auto",
          overflowY: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          background:
            "radial-gradient(circle at 90% 4%, rgba(232,197,71,0.14), transparent 25%), linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)",
          paddingBottom: "calc(28px + env(safe-area-inset-bottom))",
        }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "grid",
            gridTemplateColumns: "44px 1fr auto",
            alignItems: "center",
            gap: 8,
            padding: "calc(10px + env(safe-area-inset-top)) 16px 11px",
            background: "rgba(248,246,240,0.94)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid rgba(122,157,122,0.15)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={text.closeLabel}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "var(--bg2)",
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={19} />
          </button>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 950, color: "var(--text)", textAlign: "center" }}>
            {text.title}
          </h2>
          <div
            aria-label={`${text.balanceLabel} ${heartBalance}`}
            style={{
              minWidth: 72,
              height: 38,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid rgba(232,197,71,0.36)",
              background: "rgba(255,248,218,0.82)",
              color: "rgba(169,112,20,0.98)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              fontSize: 13,
              fontWeight: 950,
              whiteSpace: "nowrap",
            }}
          >
            <span aria-hidden="true">💛</span>
            <span>{heartBalance}</span>
          </div>
        </header>

        <main style={{ padding: "16px 16px 0" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 7,
              padding: 5,
              borderRadius: 18,
              background: "var(--bg3)",
              border: "1px solid var(--border)",
              marginBottom: 16,
            }}
          >
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    minHeight: 40,
                    padding: "8px 6px",
                    borderRadius: 14,
                    border: active ? "1px solid rgba(122,157,122,0.38)" : "1px solid transparent",
                    background: active ? "var(--sage)" : "transparent",
                    color: active ? "white" : "var(--text2)",
                    fontSize: 11.5,
                    fontWeight: 900,
                    cursor: "pointer",
                    lineHeight: 1.25,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "map" && (
            <section>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  marginBottom: 14,
                  padding: "0 2px",
                }}
              >
                <Sparkles size={17} style={{ color: "rgba(189,139,30,0.95)", marginTop: 1, flexShrink: 0 }} />
                <p style={{ margin: 0, color: "var(--text2)", fontSize: 12, lineHeight: 1.55, fontWeight: 700 }}>
                  {text.mapIntro}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 11 }}>
                {HEART_SHOP_CATALOG.map(item => {
                  const itemText = text.items[item.id];
                  return (
                    <article
                      key={item.id}
                      className="card"
                      style={{
                        minWidth: 0,
                        padding: "10px 10px 11px",
                        display: "flex",
                        flexDirection: "column",
                        border: "1px solid rgba(122,157,122,0.2)",
                        background: "rgba(255,253,248,0.88)",
                        boxShadow: "0 8px 24px rgba(75,62,45,0.06)",
                      }}
                    >
                      <div
                        style={{
                          height: 112,
                          borderRadius: 18,
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#fff",
                          border: "1px solid rgba(232,197,71,0.22)",
                          marginBottom: 10,
                        }}
                      >
                        <img
                          src={item.previewPath}
                          alt={itemText.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            imageRendering: "pixelated",
                          }}
                        />
                      </div>
                      <h3 style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 950, color: "var(--text)" }}>
                        {itemText.name}
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          minHeight: 36,
                          color: "var(--text3)",
                          fontSize: 10.5,
                          lineHeight: 1.45,
                          fontWeight: 650,
                        }}
                      >
                        {itemText.description}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          color: "rgba(179,123,27,0.98)",
                          fontSize: 13,
                          fontWeight: 950,
                          margin: "10px 0 9px",
                        }}
                      >
                        <span aria-hidden="true">💛</span>
                        <span>{item.price}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotice(text.purchaseComingSoon)}
                        style={{
                          width: "100%",
                          minHeight: 38,
                          border: "none",
                          borderRadius: 13,
                          background: "var(--sage)",
                          color: "white",
                          fontSize: 11.5,
                          fontWeight: 950,
                          cursor: "pointer",
                        }}
                      >
                        {text.purchaseButton}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === "character" && (
            <section
              className="card"
              style={{
                minHeight: 420,
                padding: "34px 22px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                border: "1px dashed rgba(122,157,122,0.35)",
                background: "rgba(255,253,248,0.72)",
              }}
            >
              <div
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 26,
                  background: "rgba(232,197,71,0.13)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
                <Gift size={37} strokeWidth={1.6} style={{ color: "rgba(179,123,27,0.9)" }} />
              </div>
              <h3 style={{ margin: "0 0 10px", color: "var(--text)", fontSize: 20, fontWeight: 950 }}>
                {text.characterComingSoonTitle}
              </h3>
              <p style={{ margin: 0, maxWidth: 310, color: "var(--text3)", fontSize: 13, lineHeight: 1.65, fontWeight: 650 }}>
                {text.characterComingSoonBody}
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 25, opacity: 0.72 }}>
                {["🎩", "🎀", "👕"].map(icon => (
                  <div
                    key={icon}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 18,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                    }}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "owned" && (
            <section
              className="card"
              style={{
                minHeight: 420,
                padding: "34px 22px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                background: "rgba(255,253,248,0.78)",
              }}
            >
              <div
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 26,
                  background: "rgba(122,157,122,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
                <PackageOpen size={38} strokeWidth={1.55} style={{ color: "var(--sage-dark)" }} />
              </div>
              <h3 style={{ margin: "0 0 10px", color: "var(--text)", fontSize: 19, fontWeight: 950 }}>
                {text.ownedEmptyTitle}
              </h3>
              <p style={{ margin: 0, maxWidth: 310, color: "var(--text3)", fontSize: 13, lineHeight: 1.65, fontWeight: 650 }}>
                {text.ownedEmptyBody}
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
