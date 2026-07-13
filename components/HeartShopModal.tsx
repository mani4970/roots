"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, PackageOpen } from "lucide-react";
import HeartShopFriendSprite from "@/components/HeartShopFriendSprite";
import ProfileCharacterPreview from "@/components/ProfileCharacterPreview";
import type { Lang } from "@/lib/i18n";
import { getRootsAvatarLabel, type RootsAvatarType } from "@/lib/avatar";
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
import {
  getProfileCharacterText,
  type ProfileCharacterCategory,
} from "@/lib/profileCharacterText";

type HeartShopModalProps = {
  show: boolean;
  lang: Lang | string;
  heartBalance: number;
  avatarType: RootsAvatarType;
  onHeartBalanceChange?: (balance: number) => void;
  onClose: () => void;
};

type HeartShopHistoryKind = "shop" | "preview" | "purchase" | "complete";
type HeartShopMapSection = "garden" | "peaceArk";

function getCatalogItem(itemId: HeartShopItemId | null): HeartShopCatalogItem | null {
  if (!itemId) return null;
  return HEART_SHOP_CATALOG.find(item => item.id === itemId) ?? null;
}

function getLargeSpriteWidth(itemId: HeartShopItemId) {
  if (itemId === "hindungi") return 112;
  if (itemId === "kkumdeuli") return 150;
  if (itemId === "bamtoli" || itemId === "mongsili") return 96;
  return 145;
}

export default function HeartShopModal({
  show,
  lang,
  heartBalance,
  avatarType,
  onHeartBalanceChange,
  onClose,
}: HeartShopModalProps) {
  const text = useMemo(() => getHeartShopText(lang), [lang]);
  const profileCharacterText = useMemo(() => getProfileCharacterText(lang), [lang]);
  const [activeTab, setActiveTab] = useState<HeartShopTab>("map");
  const [activeMapSection, setActiveMapSection] = useState<HeartShopMapSection>("garden");
  const [activeCharacterCategory, setActiveCharacterCategory] = useState<ProfileCharacterCategory>("all");
  const [notice, setNotice] = useState("");
  const [localBalance, setLocalBalance] = useState(heartBalance);
  const [ownedItems, setOwnedItems] = useState<OwnedHeartShopItem[]>([]);
  const [loadingOwned, setLoadingOwned] = useState(false);
  const [previewItemId, setPreviewItemId] = useState<HeartShopItemId | null>(null);
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

  const visibleMapItems = useMemo(
    () => HEART_SHOP_CATALOG.filter(item => item.mapKinds.includes(activeMapSection)),
    [activeMapSection],
  );

  const previewItem = getCatalogItem(previewItemId);
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

  function openPreview(itemId: HeartShopItemId) {
    pushHeartShopHistory("preview");
    setPreviewItemId(itemId);
  }

  function openPurchase(itemId: HeartShopItemId) {
    setPurchaseError("");
    pushHeartShopHistory("purchase");
    setSelectedItemId(itemId);
  }

  function openPurchaseFromPreview(itemId: HeartShopItemId) {
    setPreviewItemId(null);
    setPurchaseError("");
    replaceHeartShopHistory("purchase");
    setSelectedItemId(itemId);
  }

  useEffect(() => {
    function handleHeartShopPopState() {
      const stack = historyStackRef.current;
      const activeLayer = stack[stack.length - 1] ?? null;
      if (!activeLayer) return;

      historyStackRef.current = stack.slice(0, -1);

      if (activeLayer === "preview") {
        setPreviewItemId(null);
        return;
      }

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
    setActiveMapSection("garden");
    setActiveCharacterCategory("all");
    setNotice("");
    setPreviewItemId(null);
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

  const mapSections: { id: HeartShopMapSection; label: string }[] = [
    { id: "garden", label: text.gardenMapLabel },
    { id: "peaceArk", label: text.peaceArkMapLabel },
  ];

  const characterCategories: { id: ProfileCharacterCategory; label: string }[] = [
    { id: "all", label: profileCharacterText.categories.all },
    { id: "tops", label: profileCharacterText.categories.tops },
    { id: "bottoms", label: profileCharacterText.categories.bottoms },
    { id: "shoes", label: profileCharacterText.categories.shoes },
    { id: "accessories", label: profileCharacterText.categories.accessories },
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
                role="tablist"
                aria-label={text.mapSelectorLabel}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 6,
                  padding: 4,
                  marginBottom: 14,
                  borderRadius: 16,
                  background: "rgba(122,157,122,0.07)",
                  border: "1px solid rgba(122,157,122,0.2)",
                }}
              >
                {mapSections.map(section => {
                  const active = activeMapSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveMapSection(section.id)}
                      style={{
                        minHeight: 42,
                        padding: "8px 7px",
                        borderRadius: 13,
                        border: active ? "1px solid rgba(122,157,122,0.34)" : "1px solid transparent",
                        background: active ? "rgba(122,157,122,0.14)" : "transparent",
                        color: active ? "var(--sage-dark)" : "var(--text2)",
                        fontSize: 11.5,
                        fontWeight: 900,
                        lineHeight: 1.25,
                        cursor: "pointer",
                      }}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>

              {visibleMapItems.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 11 }}>
                  {visibleMapItems.map(item => {
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
                        <button
                          type="button"
                          onClick={() => openPreview(item.id)}
                          aria-label={`${itemText.name} · ${text.previewBadge}`}
                          style={{
                            position: "relative",
                            width: "100%",
                            height: 112,
                            padding: 0,
                            borderRadius: 18,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#fff",
                            border: "1px solid rgba(232,197,71,0.22)",
                            marginBottom: 10,
                            cursor: "pointer",
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
                          <span
                            style={{
                              position: "absolute",
                              right: 7,
                              bottom: 7,
                              borderRadius: 999,
                              padding: "4px 7px",
                              background: "rgba(26,28,30,0.72)",
                              color: "#fff",
                              fontSize: 8.5,
                              lineHeight: 1,
                              fontWeight: 900,
                              backdropFilter: "blur(4px)",
                            }}
                          >
                            {text.previewBadge}
                          </span>
                        </button>
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
              ) : (
                <div
                  className="card"
                  style={{
                    minHeight: 330,
                    padding: "32px 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    border: "1px dashed rgba(122,157,122,0.34)",
                    background: "rgba(255,253,248,0.76)",
                  }}
                >
                  <div
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 17,
                      background: "rgba(122,157,122,0.11)",
                      color: "var(--sage-dark)",
                    }}
                  >
                    <PackageOpen size={35} strokeWidth={1.55} />
                  </div>
                  <h3 style={{ margin: "0 0 9px", color: "var(--text)", fontSize: 18, lineHeight: 1.4, fontWeight: 950 }}>
                    {text.peaceArkComingSoonTitle}
                  </h3>
                  <p style={{ margin: 0, maxWidth: 290, color: "var(--text3)", fontSize: 12.5, lineHeight: 1.65, fontWeight: 650 }}>
                    {text.peaceArkComingSoonBody}
                  </p>
                </div>
              )}
            </section>
          )}

          {activeTab === "character" && (
            <section>
              <div
                className="card"
                style={{
                  minHeight: 360,
                  padding: "16px 16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  border: "1px solid rgba(122,157,122,0.22)",
                  background: "linear-gradient(180deg, rgba(122,157,122,0.08), rgba(255,253,248,0.84))",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    padding: "5px 10px",
                    marginBottom: 8,
                    background: "rgba(122,157,122,0.12)",
                    color: "var(--sage-dark)",
                    fontSize: 10.5,
                    fontWeight: 900,
                  }}
                >
                  {profileCharacterText.previewLabel}
                </div>
                <ProfileCharacterPreview
                  avatarType={avatarType}
                  alt={getRootsAvatarLabel(avatarType, lang)}
                  style={{ width: "min(100%, 205px)" }}
                />
              </div>

              <div
                role="tablist"
                aria-label={text.characterTab}
                style={{
                  display: "flex",
                  gap: 7,
                  overflowX: "auto",
                  padding: "2px 1px 8px",
                  marginTop: 13,
                  scrollbarWidth: "none",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {characterCategories.map(category => {
                  const active = activeCharacterCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveCharacterCategory(category.id)}
                      style={{
                        flex: "0 0 auto",
                        minHeight: 36,
                        padding: "7px 12px",
                        borderRadius: 999,
                        border: active ? "1px solid rgba(122,157,122,0.36)" : "1px solid var(--border)",
                        background: active ? "rgba(122,157,122,0.14)" : "var(--bg2)",
                        color: active ? "var(--sage-dark)" : "var(--text2)",
                        fontSize: 11,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>

              <div
                className="card"
                style={{
                  minHeight: 210,
                  padding: "28px 22px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  border: "1px dashed rgba(122,157,122,0.32)",
                  background: "rgba(255,253,248,0.74)",
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 22,
                    background: "rgba(232,197,71,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 15,
                  }}
                >
                  <PackageOpen size={31} strokeWidth={1.55} style={{ color: "rgba(179,123,27,0.9)" }} />
                </div>
                <h3 style={{ margin: "0 0 8px", color: "var(--text)", fontSize: 17, lineHeight: 1.4, fontWeight: 950 }}>
                  {profileCharacterText.emptyTitle}
                </h3>
                <p style={{ margin: 0, maxWidth: 300, color: "var(--text3)", fontSize: 12.5, lineHeight: 1.65, fontWeight: 650 }}>
                  {profileCharacterText.emptyBody}
                </p>
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

      {previewItem && (
        <div
          role="presentation"
          onClick={closeTopHeartShopLayer}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 538,
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
            aria-label={`${text.previewTitle}: ${text.items[previewItem.id].name}`}
            onClick={event => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 360,
              maxHeight: "calc(100dvh - 44px)",
              overflowY: "auto",
              borderRadius: 28,
              background: "var(--bg2)",
              border: "1px solid rgba(122,157,122,0.28)",
              boxShadow: "0 24px 70px rgba(0,0,0,0.3)",
              padding: "20px 18px 18px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(122,157,122,0.12)", color: "var(--sage-dark)", padding: "5px 9px", fontSize: 10, fontWeight: 900, marginBottom: 8 }}>
              {text.previewTitle}
            </div>
            <div style={{ minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <HeartShopFriendSprite
                itemId={previewItem.id}
                renderWidth={getLargeSpriteWidth(previewItem.id)}
                alt={text.items[previewItem.id].name}
              />
            </div>
            <h3 style={{ margin: "0 0 8px", color: "var(--text)", fontSize: 21, lineHeight: 1.35, fontWeight: 950 }}>
              {text.items[previewItem.id].name}
            </h3>
            <p style={{ margin: "0 auto", maxWidth: 310, color: "var(--text2)", fontSize: 13, lineHeight: 1.65, fontWeight: 650 }}>
              {text.items[previewItem.id].description}
            </p>
            <div style={{ marginTop: 12, color: "rgba(179,123,27,0.98)", fontSize: 16, fontWeight: 950 }}>
              💛 {previewItem.price}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 9, marginTop: 18 }}>
              <button
                type="button"
                onClick={closeTopHeartShopLayer}
                style={{ minHeight: 46, borderRadius: 15, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text2)", fontSize: 12.5, fontWeight: 900, cursor: "pointer" }}
              >
                {text.closePreviewButton}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ownedById.has(previewItem.id)) {
                    setActiveTab("owned");
                    closeTopHeartShopLayer();
                    return;
                  }
                  openPurchaseFromPreview(previewItem.id);
                }}
                style={{ minHeight: 46, borderRadius: 15, border: ownedById.has(previewItem.id) ? "1px solid var(--border)" : "none", background: ownedById.has(previewItem.id) ? "var(--bg3)" : "var(--sage)", color: ownedById.has(previewItem.id) ? "var(--sage-dark)" : "white", fontSize: 12.5, fontWeight: 950, cursor: "pointer" }}
              >
                {ownedById.has(previewItem.id) ? text.ownedButton : text.purchaseButton}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div style={{ minHeight: 170, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <HeartShopFriendSprite
                itemId={selectedItem.id}
                renderWidth={getLargeSpriteWidth(selectedItem.id)}
                alt={text.items[selectedItem.id].name}
              />
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
            <div style={{ minHeight: 165, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <HeartShopFriendSprite
                itemId={completedItem.id}
                renderWidth={getLargeSpriteWidth(completedItem.id)}
                alt={text.items[completedItem.id].name}
              />
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
