"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Gift, Loader2, PackageOpen, Sparkles } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";
import {
  loadOwnedHeartShopItems,
  purchaseHeartShopItem,
  setHeartShopItemEnabled,
  type OwnedHeartShopItem,
} from "@/lib/heartShop";
import { HEART_SHOP_CATALOG, type HeartShopCatalogItem } from "@/lib/heartShopCatalog";
import {
  formatHeartShopText,
  getHeartShopText,
  type HeartShopItemId,
  type HeartShopTab,
} from "@/lib/heartShopText";

type HeartShopModalProps = {
  show: boolean;
  lang: Lang | string;
  heartBalance: number;
  onHeartBalanceChange?: (balance: number) => void;
  onClose: () => void;
};

type HeartShopHistoryKind = "shop" | "purchase" | "complete";

function getCatalogItem(itemId: HeartShopItemId | null): HeartShopCatalogItem | null {
  if (!itemId) return null;
  return HEART_SHOP_CATALOG.find(item => item.id === itemId) ?? null;
}

export default function HeartShopModal({
  show,
  lang,
  heartBalance,
  onHeartBalanceChange,
  onClose,
}: HeartShopModalProps) {
  const text = useMemo(() => getHeartShopText(lang), [lang]);
  const [activeTab, setActiveTab] = useState<HeartShopTab>("map");
  const [notice, setNotice] = useState("");
  const [localBalance, setLocalBalance] = useState(heartBalance);
  const [ownedItems, setOwnedItems] = useState<OwnedHeartShopItem[]>([]);
  const [loadingOwned, setLoadingOwned] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<HeartShopItemId | null>(null);
  const [completedItemId, setCompletedItemId] = useState<HeartShopItemId | null>(null);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<HeartShopItemId | null>(null);
  const historyStackRef = useRef<HeartShopHistoryKind[]>([]);
  const onCloseRef = useRef(onClose);
  const purchasingRef = useRef(false);

  const ownedById = useMemo(
    () => new Map(ownedItems.map(item => [item.itemId, item])),
    [ownedItems],
  );

  const selectedItem = getCatalogItem(selectedItemId);
  const completedItem = getCatalogItem(completedItemId);

  useEffect(() => {
    setLocalBalance(heartBalance);
  }, [heartBalance]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    purchasingRef.current = purchasing;
  }, [purchasing]);

  function pushHeartShopHistory(kind: HeartShopHistoryKind) {
    if (typeof window === "undefined") return;
    const stack = historyStackRef.current;
    if (stack[stack.length - 1] === kind) return;
    try {
      const currentState =
        window.history.state && typeof window.history.state === "object"
          ? window.history.state
          : {};
      window.history.pushState(
        { ...currentState, rootsHeartShop: kind },
        "",
        window.location.href,
      );
    } finally {
      historyStackRef.current = [...stack, kind];
    }
  }

  function replaceHeartShopHistory(kind: HeartShopHistoryKind) {
    if (typeof window === "undefined") return;
    const stack = historyStackRef.current;
    if (stack.length === 0) {
      pushHeartShopHistory(kind);
      return;
    }
    try {
      const currentState =
        window.history.state && typeof window.history.state === "object"
          ? window.history.state
          : {};
      window.history.replaceState(
        { ...currentState, rootsHeartShop: kind },
        "",
        window.location.href,
      );
    } finally {
      historyStackRef.current = [...stack.slice(0, -1), kind];
    }
  }

  function closeTopHeartShopLayer() {
    if (typeof window === "undefined") {
      onCloseRef.current();
      return;
    }
    if (historyStackRef.current.length > 0) {
      window.history.back();
      return;
    }
    onCloseRef.current();
  }

  function openPurchase(itemId: HeartShopItemId) {
    setPurchaseError("");
    pushHeartShopHistory("purchase");
    setSelectedItemId(itemId);
  }

  useEffect(() => {
    function handleHeartShopPopState() {
      const stack = historyStackRef.current;
      const activeLayer = stack[stack.length - 1] ?? null;
      if (!activeLayer) return;

      historyStackRef.current = stack.slice(0, -1);

      if (activeLayer === "purchase") {
        if (purchasingRef.current) {
          pushHeartShopHistory("purchase");
          return;
        }
        setSelectedItemId(null);
        setPurchaseError("");
        return;
      }

      if (activeLayer === "complete") {
        setCompletedItemId(null);
        return;
      }

      if (activeLayer === "shop") {
        onCloseRef.current();
      }
    }

    window.addEventListener("popstate", handleHeartShopPopState);
    return () => window.removeEventListener("popstate", handleHeartShopPopState);
  }, []);

  useEffect(() => {
    if (!show) return;
    if (historyStackRef.current.length === 0) pushHeartShopHistory("shop");
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setActiveTab("map");
    setNotice("");
    setSelectedItemId(null);
    setCompletedItemId(null);
    setPurchaseError("");
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [show]);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    const supabase = createClient();
    setLoadingOwned(true);

    void loadOwnedHeartShopItems(supabase)
      .then(items => {
        if (!cancelled) setOwnedItems(items);
      })
      .catch(error => {
        console.warn("사랑 상점 구매 내역 조회 실패:", error);
        if (!cancelled) {
          setOwnedItems([]);
          setNotice(text.shopUnavailable);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOwned(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show, text.shopUnavailable]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function confirmPurchase() {
    if (!selectedItem || purchasing) return;
    setPurchasing(true);
    setPurchaseError("");

    try {
      const supabase = createClient();
      const result = await purchaseHeartShopItem(supabase, selectedItem.id);

      setLocalBalance(result.balance);
      onHeartBalanceChange?.(result.balance);

      if (result.purchased) {
        setOwnedItems(current => [
          ...current.filter(item => item.itemId !== selectedItem.id),
          {
            itemId: selectedItem.id,
            isEnabled: true,
            pricePaid: result.price || selectedItem.price,
            purchasedAt: new Date().toISOString(),
          },
        ]);
        setSelectedItemId(null);
        replaceHeartShopHistory("complete");
        setCompletedItemId(selectedItem.id);
        return;
      }

      if (result.alreadyOwned) {
        closeTopHeartShopLayer();
        setNotice(text.alreadyOwned);
        setActiveTab("owned");
        const items = await loadOwnedHeartShopItems(supabase);
        setOwnedItems(items);
        return;
      }

      if (result.reason === "insufficient_hearts") {
        setPurchaseError(formatHeartShopText(text.insufficientHearts, { needed: result.needed }));
        return;
      }

      setPurchaseError(text.purchaseFailed);
    } catch (error) {
      console.warn("사랑 상점 아이템 구매 실패:", error);
      setPurchaseError(text.purchaseFailed);
    } finally {
      setPurchasing(false);
    }
  }

  async function toggleOwnedItem(item: OwnedHeartShopItem) {
    if (togglingItemId) return;
    setTogglingItemId(item.itemId);

    try {
      const supabase = createClient();
      const result = await setHeartShopItemEnabled(supabase, item.itemId, !item.isEnabled);
      if (!result.updated) throw new Error(result.reason || "toggle_failed");
      setOwnedItems(current => current.map(currentItem => (
        currentItem.itemId === item.itemId
          ? { ...currentItem, isEnabled: result.isEnabled }
          : currentItem
      )));
    } catch (error) {
      console.warn("사랑 상점 아이템 표시 설정 실패:", error);
      setNotice(text.toggleFailed);
    } finally {
      setTogglingItemId(null);
    }
  }

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
            zIndex: 560,
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
            onClick={closeTopHeartShopLayer}
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
            aria-label={`${text.balanceLabel} ${localBalance}`}
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
            <span>{localBalance}</span>
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
                  const owned = ownedById.has(item.id);
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
                        onClick={() => {
                          if (owned) {
                            setActiveTab("owned");
                            return;
                          }
                          openPurchase(item.id);
                        }}
                        style={{
                          width: "100%",
                          minHeight: 38,
                          border: owned ? "1px solid var(--border)" : "none",
                          borderRadius: 13,
                          background: owned ? "var(--bg3)" : "var(--sage)",
                          color: owned ? "var(--sage-dark)" : "white",
                          fontSize: 11.5,
                          fontWeight: 950,
                          cursor: "pointer",
                        }}
                      >
                        {owned ? text.ownedButton : text.purchaseButton}
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
            <section>
              {loadingOwned ? (
                <div className="card" style={{ minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, color: "var(--text3)", fontSize: 13, fontWeight: 750 }}>
                  <Loader2 size={18} className="spin" />
                  {text.loadingOwned}
                </div>
              ) : ownedItems.length === 0 ? (
                <div
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
                </div>
              ) : (
                <>
                  <p style={{ margin: "0 2px 12px", color: "var(--text2)", fontSize: 12, lineHeight: 1.55, fontWeight: 700 }}>
                    {text.ownedIntro}
                  </p>
                  <div className="card" style={{ padding: "6px 14px", background: "rgba(255,253,248,0.84)" }}>
                    {HEART_SHOP_CATALOG.filter(item => ownedById.has(item.id)).map((catalogItem, index, items) => {
                      const owned = ownedById.get(catalogItem.id)!;
                      const toggling = togglingItemId === owned.itemId;
                      return (
                        <div
                          key={owned.itemId}
                          style={{
                            minHeight: 62,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 14,
                            borderBottom: index < items.length - 1 ? "1px solid var(--border)" : "none",
                          }}
                        >
                          <span style={{ color: "var(--text)", fontSize: 14, fontWeight: 900 }}>
                            {text.items[owned.itemId].name}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={owned.isEnabled}
                            onClick={() => void toggleOwnedItem(owned)}
                            disabled={toggling}
                            style={{
                              width: 66,
                              height: 34,
                              padding: 3,
                              borderRadius: 999,
                              border: owned.isEnabled ? "1px solid rgba(122,157,122,0.42)" : "1px solid var(--border)",
                              background: owned.isEnabled ? "var(--sage)" : "var(--bg3)",
                              color: owned.isEnabled ? "white" : "var(--text3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10.5,
                              fontWeight: 950,
                              cursor: toggling ? "default" : "pointer",
                              opacity: toggling ? 0.65 : 1,
                            }}
                          >
                            {toggling ? <Loader2 size={14} className="spin" /> : (owned.isEnabled ? text.enabledLabel : text.disabledLabel)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}
        </main>
      </div>

      {selectedItem && (
        <div
          role="presentation"
          onClick={() => { if (!purchasing) closeTopHeartShopLayer(); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 540,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "22px",
            background: "rgba(28,29,30,0.58)",
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={text.items[selectedItem.id].purchaseTitle}
            onClick={event => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 360,
              maxHeight: "calc(100dvh - 44px)",
              overflowY: "auto",
              borderRadius: 28,
              background: "var(--bg2)",
              border: "1px solid rgba(232,197,71,0.3)",
              boxShadow: "0 24px 70px rgba(0,0,0,0.3)",
              padding: "22px 18px 18px",
              textAlign: "center",
            }}
          >
            <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <img src={selectedItem.previewPath} alt={text.items[selectedItem.id].name} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
            </div>
            <h3 style={{ margin: "0 0 12px", color: "var(--text)", fontSize: 20, lineHeight: 1.45, fontWeight: 950 }}>
              {text.items[selectedItem.id].purchaseTitle}
            </h3>
            <p style={{ margin: "0 auto", maxWidth: 310, color: "var(--text2)", fontSize: 13, lineHeight: 1.65, fontWeight: 650 }}>
              {text.items[selectedItem.id].purchaseBody}
            </p>
            {purchaseError && (
              <p style={{ margin: "13px 0 0", color: "#c85b55", fontSize: 12, lineHeight: 1.5, fontWeight: 850 }}>
                {purchaseError}
              </p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 9, marginTop: 20 }}>
              <button
                type="button"
                onClick={closeTopHeartShopLayer}
                disabled={purchasing}
                style={{ minHeight: 46, borderRadius: 15, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text2)", fontSize: 12.5, fontWeight: 900, cursor: purchasing ? "default" : "pointer" }}
              >
                {text.cancelButton}
              </button>
              <button
                type="button"
                onClick={() => void confirmPurchase()}
                disabled={purchasing}
                style={{ minHeight: 46, borderRadius: 15, border: "none", background: "var(--sage)", color: "white", fontSize: 12.5, fontWeight: 950, cursor: purchasing ? "default" : "pointer", opacity: purchasing ? 0.7 : 1 }}
              >
                {purchasing
                  ? text.purchasingLabel
                  : formatHeartShopText(text.purchaseAction, { price: selectedItem.price })}
              </button>
            </div>
          </div>
        </div>
      )}

      {completedItem && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 545,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "22px",
            background: "rgba(28,29,30,0.58)",
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={text.items[completedItem.id].completeTitle}
            style={{
              width: "100%",
              maxWidth: 360,
              maxHeight: "calc(100dvh - 44px)",
              overflowY: "auto",
              borderRadius: 28,
              background: "var(--bg2)",
              border: "1px solid rgba(232,197,71,0.34)",
              boxShadow: "0 24px 70px rgba(0,0,0,0.3)",
              padding: "22px 18px 18px",
              textAlign: "center",
            }}
          >
            <div style={{ width: 58, height: 58, borderRadius: "50%", margin: "0 auto 6px", background: "rgba(122,157,122,0.14)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sage-dark)" }}>
              <CheckCircle2 size={31} />
            </div>
            <div style={{ height: 145, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <img src={completedItem.previewPath} alt={text.items[completedItem.id].name} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
            </div>
            <h3 style={{ margin: "0 0 12px", color: "var(--text)", fontSize: 20, lineHeight: 1.45, fontWeight: 950 }}>
              {text.items[completedItem.id].completeTitle}
            </h3>
            <p style={{ margin: "0 auto", maxWidth: 310, color: "var(--text2)", fontSize: 13, lineHeight: 1.65, fontWeight: 650 }}>
              {text.items[completedItem.id].completeBody}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 20 }}>
              <button
                type="button"
                onClick={closeTopHeartShopLayer}
                style={{ minHeight: 46, borderRadius: 15, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text2)", fontSize: 12, fontWeight: 900, cursor: "pointer" }}
              >
                {text.continueShoppingButton}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("owned");
                  closeTopHeartShopLayer();
                }}
                style={{ minHeight: 46, borderRadius: 15, border: "none", background: "var(--sage)", color: "white", fontSize: 12, fontWeight: 950, cursor: "pointer" }}
              >
                {text.viewOwnedButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
