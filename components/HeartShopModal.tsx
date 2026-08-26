"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, PackageOpen, RotateCcw } from "lucide-react";
import HeartShopFriendSprite from "@/components/HeartShopFriendSprite";
import HeartShopMapPreview from "@/components/HeartShopMapPreview";
import HeartShopToggleSwitch from "@/components/HeartShopToggleSwitch";
import ProfileCharacterPreview from "@/components/ProfileCharacterPreview";
import type { Lang } from "@/lib/i18n";
import { getRootsAvatarLabel, type RootsAvatarType } from "@/lib/avatar";
import { createClient } from "@/lib/supabase";
import {
  applyFreeHeartShopItem,
  loadOwnedHeartShopItems,
  purchaseHeartShopItem,
  setHeartShopItemEnabled,
  type OwnedHeartShopItem,
} from "@/lib/heartShop";
import {
  HEART_SHOP_CHARACTER_CATALOG,
  HEART_SHOP_MAP_CATALOG,
  getHeartShopCatalogItem,
  getProfileCharacterLayersForItemIds,
  isHeartShopCharacterCatalogItem,
  isHeartShopMapCatalogItem,
  type HeartShopCatalogItem,
  type HeartShopCharacterCatalogItem,
} from "@/lib/heartShopCatalog";
import type { ProfileCharacterLayer } from "@/lib/profileCharacter";
import {
  type HeartShopCharacterSlot,
  type HeartShopCharacterItemId,
  type HeartShopItemId,
  isHeartShopCharacterItemId,
  isHeartShopMapItemId,
  isHeartShopPeaceArkStaticItemId,
  type HeartShopMapItemId,
} from "@/lib/heartShopItems";
import {
  formatHeartShopText,
  getHeartShopText,
  type HeartShopTab,
} from "@/lib/heartShopText";
import {
  getProfileCharacterItemText,
  getProfileCharacterText,
  type ProfileCharacterCategory,
} from "@/lib/profileCharacterText";
import { getVisibleRewardMapCycles } from "@/lib/rewardMaps";

type HeartShopModalProps = {
  show: boolean;
  lang: Lang | string;
  heartBalance: number;
  avatarType: RootsAvatarType;
  totalDays?: number;
  peaceArkStageNumber?: number | null;
  onHeartBalanceChange?: (balance: number) => void;
  onOwnedItemsChange?: (items: OwnedHeartShopItem[]) => void;
  onClose: () => void;
};

type HeartShopHistoryKind = "shop" | "preview" | "purchase" | "complete";
type HeartShopMapSection = "garden" | "peaceArk" | "nehemiahWall";
type HeartShopOwnedSection = "map" | "character";
type HeartShopOwnedCharacterCategory =
  | "tops"
  | "bottoms"
  | "shoes"
  | "accessories"
  | "backgrounds"
  | "pets";

function isOwnedCharacterItemInCategory(
  item: HeartShopCharacterCatalogItem,
  category: HeartShopOwnedCharacterCategory,
) {
  if (category === "tops") return item.slot === "top";
  if (category === "bottoms") return item.slot === "bottom";
  if (category === "shoes") return item.slot === "shoes";
  if (category === "backgrounds") return item.slot === "background";
  if (category === "pets") return item.slot === "pet";
  return item.slot === "headwear"
    || item.slot === "eyewear"
    || item.slot === "hair_accessory"
    || item.slot === "bag";
}

const MAP_OPTIONS: readonly {
  id: HeartShopMapSection;
  unlockDay: number;
}[] = [
  { id: "garden", unlockDay: 1 },
  { id: "peaceArk", unlockDay: 101 },
  { id: "nehemiahWall", unlockDay: 201 },
] as const;

function getDefaultMapSection(totalDays: number): HeartShopMapSection {
  if (totalDays >= 201) return "nehemiahWall";
  if (totalDays >= 101) return "peaceArk";
  return "garden";
}

function haveSameItemIds(
  first: readonly HeartShopCharacterItemId[],
  second: readonly HeartShopCharacterItemId[],
) {
  if (first.length !== second.length) return false;
  const secondIds = new Set(second);
  return first.every(itemId => secondIds.has(itemId));
}

const CHARACTER_CATEGORY_SLOT: Partial<Record<ProfileCharacterCategory, HeartShopCharacterSlot>> = {
  backgrounds: "background",
  pets: "pet",
  tops: "top",
  bottoms: "bottom",
  shoes: "shoes",
  eyewear: "eyewear",
  headwear: "headwear",
  accessories: "hair_accessory",
  bags: "bag",
};

function getLargeSpriteWidth(itemId: HeartShopMapItemId) {
  if (itemId === "hindungi") return 112;
  if (itemId === "kkumdeuli") return 150;
  if (itemId === "bamtoli" || itemId === "mongsili") return 96;
  if (itemId === "nabi" || itemId === "kkangchongi") return 96;
  if (itemId === "salgeumi") return 130;
  if (itemId === "ark_supplies") return 148;
  if (itemId === "ark_workbench") return 185;
  if (itemId === "ark_lantern") return 72;
  return 145;
}

type CharacterItemPreviewCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const CHARACTER_ITEM_PREVIEW_CROP: Record<
  RootsAvatarType,
  Record<Exclude<HeartShopCharacterSlot, "background">, CharacterItemPreviewCrop>
> = {
  rootsman: {
    pet: { x: 665, y: 940, width: 345, height: 345 },
    top: { x: 230, y: 590, width: 626, height: 405 },
    bottom: { x: 350, y: 920, width: 397, height: 360 },
    shoes: { x: 310, y: 1195, width: 480, height: 200 },
    eyewear: { x: 310, y: 400, width: 500, height: 190 },
    hair_accessory: { x: 250, y: 80, width: 610, height: 320 },
    headwear: { x: 70, y: 0, width: 970, height: 480 },
    bag: { x: 250, y: 520, width: 650, height: 620 },
  },
  rootswoman: {
    pet: { x: 665, y: 940, width: 345, height: 345 },
    top: { x: 230, y: 590, width: 626, height: 405 },
    bottom: { x: 350, y: 810, width: 397, height: 430 },
    shoes: { x: 310, y: 1140, width: 480, height: 220 },
    eyewear: { x: 310, y: 400, width: 500, height: 190 },
    hair_accessory: { x: 250, y: 80, width: 610, height: 320 },
    headwear: { x: 70, y: 0, width: 970, height: 480 },
    bag: { x: 250, y: 520, width: 650, height: 620 },
  },
};

const CHARACTER_ITEM_PREVIEW_CROP_OVERRIDES: Partial<
  Record<HeartShopCharacterItemId, CharacterItemPreviewCrop>
> = {
  // Yeolmu is a flying pet and sits much higher on the shared 1086×1448 canvas
  // than the ground pets, so the generic pet crop would show an empty tile.
  shared_pet_07: { x: 690, y: 570, width: 330, height: 290 },
};

function CharacterItemLayerPreview({
  item,
  alt,
  maxWidth,
}: {
  item: HeartShopCharacterCatalogItem;
  alt: string;
  maxWidth?: number;
}) {
  if (item.slot === "background") {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth,
          aspectRatio: "1 / 1",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <img
          src={item.layerPath}
          alt={alt}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            imageRendering: "pixelated",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  const crop = CHARACTER_ITEM_PREVIEW_CROP_OVERRIDES[item.id]
    ?? (item.avatarType === "shared"
      ? CHARACTER_ITEM_PREVIEW_CROP.rootsman[item.slot]
      : CHARACTER_ITEM_PREVIEW_CROP[item.avatarType][item.slot]);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth,
        aspectRatio: `${crop.width} / ${crop.height}`,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <img
        src={item.layerPath}
        alt={alt}
        draggable={false}
        style={{
          position: "absolute",
          left: `${(-crop.x / crop.width) * 100}%`,
          top: `${(-crop.y / crop.height) * 100}%`,
          width: `${(1086 / crop.width) * 100}%`,
          height: `${(1448 / crop.height) * 100}%`,
          maxWidth: "none",
          imageRendering: "pixelated",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export default function HeartShopModal({
  show,
  lang,
  heartBalance,
  avatarType,
  totalDays = 0,
  peaceArkStageNumber = null,
  onHeartBalanceChange,
  onOwnedItemsChange,
  onClose,
}: HeartShopModalProps) {
  const text = useMemo(() => getHeartShopText(lang), [lang]);
  const profileText = useMemo(() => getProfileCharacterText(lang), [lang]);
  const [activeTab, setActiveTab] = useState<HeartShopTab>("character");
  const [activeMapSection, setActiveMapSection] = useState<HeartShopMapSection>(() => getDefaultMapSection(totalDays));
  const [activeCharacterCategory, setActiveCharacterCategory] = useState<ProfileCharacterCategory>("all");
  const [activeOwnedSection, setActiveOwnedSection] = useState<HeartShopOwnedSection>("character");
  const [activeOwnedCharacterCategory, setActiveOwnedCharacterCategory] = useState<HeartShopOwnedCharacterCategory>("tops");
  const [mapScenePreviewItemId, setMapScenePreviewItemId] = useState<HeartShopMapItemId | null>(null);
  const [characterShopPreviewItemIds, setCharacterShopPreviewItemIds] = useState<Partial<Record<HeartShopCharacterSlot, HeartShopCharacterItemId>>>({});
  const [ownedCharacterPreviewItemIds, setOwnedCharacterPreviewItemIds] = useState<Partial<Record<HeartShopCharacterSlot, HeartShopCharacterItemId>>>({});
  const [ownedCharacterSnapshotItemIds, setOwnedCharacterSnapshotItemIds] = useState<HeartShopCharacterItemId[] | null>(null);
  const [notice, setNotice] = useState("");
  const [localBalance, setLocalBalance] = useState(heartBalance);
  const [ownedItems, setOwnedItems] = useState<OwnedHeartShopItem[]>([]);
  const [loadingOwned, setLoadingOwned] = useState(false);
  const [ownedItemsLoaded, setOwnedItemsLoaded] = useState(false);
  const [previewItemId, setPreviewItemId] = useState<HeartShopItemId | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<HeartShopItemId | null>(null);
  const [completedItemId, setCompletedItemId] = useState<HeartShopItemId | null>(null);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [applyingFreeItemId, setApplyingFreeItemId] = useState<HeartShopCharacterItemId | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<HeartShopItemId | null>(null);
  const [restoringCharacterState, setRestoringCharacterState] = useState(false);
  const historyStackRef = useRef<HeartShopHistoryKind[]>([]);
  const mapPreviewRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  const purchasingRef = useRef(false);

  const ownedById = useMemo(() => new Map(ownedItems.map(item => [item.itemId, item])), [ownedItems]);
  const enabledItemIds = useMemo(
    () => ownedItems.filter(item => item.isEnabled).map(item => item.itemId),
    [ownedItems],
  );
  const enabledMapItemIds = useMemo(
    () => enabledItemIds.filter(isHeartShopMapItemId),
    [enabledItemIds],
  );
  const displayedMapItemIds = useMemo(() => {
    if (!mapScenePreviewItemId || enabledMapItemIds.includes(mapScenePreviewItemId)) {
      return enabledMapItemIds;
    }
    return [...enabledMapItemIds, mapScenePreviewItemId];
  }, [enabledMapItemIds, mapScenePreviewItemId]);
  const normalizedTotalDays = Math.max(0, Math.floor(totalDays || 0));
  const visibleMapCycles = useMemo(
    () => getVisibleRewardMapCycles(normalizedTotalDays),
    [normalizedTotalDays],
  );
  const unlockedMapSections = useMemo(
    () => new Set(visibleMapCycles.map(cycle => cycle.kind)),
    [visibleMapCycles],
  );
  const activeMapCycle = visibleMapCycles.find(cycle => cycle.kind === activeMapSection) ?? null;
  const currentLayers = useMemo(
    () => getProfileCharacterLayersForItemIds(enabledItemIds, avatarType),
    [avatarType, enabledItemIds],
  );
  const characterShopDisplayedLayers = useMemo(() => {
    const previewItemIds = Object.values(characterShopPreviewItemIds).filter(
      (itemId): itemId is HeartShopCharacterItemId => Boolean(itemId),
    );
    const previewLayers = getProfileCharacterLayersForItemIds(previewItemIds, avatarType);
    const previewSlots = new Set(previewLayers.map(layer => layer.slot));
    return [
      ...currentLayers.filter(layer => !previewSlots.has(layer.slot)),
      ...previewLayers,
    ];
  }, [avatarType, characterShopPreviewItemIds, currentLayers]);
  const ownedCharacterDisplayedLayers = useMemo(() => {
    const previewItemIds = Object.values(ownedCharacterPreviewItemIds).filter(
      (itemId): itemId is HeartShopCharacterItemId => Boolean(itemId),
    );
    const previewLayers = getProfileCharacterLayersForItemIds(previewItemIds, avatarType);
    const previewSlots = new Set(previewLayers.map(layer => layer.slot));
    return [
      ...currentLayers.filter(layer => !previewSlots.has(layer.slot)),
      ...previewLayers,
    ];
  }, [avatarType, currentLayers, ownedCharacterPreviewItemIds]);
  const hasCharacterShopPreview = Object.keys(characterShopPreviewItemIds).length > 0;
  const hasOwnedCharacterPreview = Object.keys(ownedCharacterPreviewItemIds).length > 0;
  const visibleMapItems = useMemo(
    () => HEART_SHOP_MAP_CATALOG
      .filter(item => item.mapKinds.includes(activeMapSection))
      .sort((a, b) => {
        const badgeRank = (item: typeof a) => item.isBest ? 0 : item.isNew ? 1 : 2;
        return badgeRank(a) - badgeRank(b) || a.sortOrder - b.sortOrder;
      }),
    [activeMapSection],
  );
  const visibleCharacterItems = useMemo(() => {
    const slot = CHARACTER_CATEGORY_SLOT[activeCharacterCategory];
    return HEART_SHOP_CHARACTER_CATALOG
      .filter(item => (item.avatarType === "shared" || item.avatarType === avatarType) && (!slot || item.slot === slot))
      .sort((a, b) =>
        Number(Boolean(b.isNew)) - Number(Boolean(a.isNew))
        || (b.newPriority ?? 0) - (a.newPriority ?? 0)
        || a.sortOrder - b.sortOrder,
      );
  }, [activeCharacterCategory, avatarType]);
  const ownedCharacterItems = useMemo(
    () => HEART_SHOP_CHARACTER_CATALOG.filter(item => (item.avatarType === "shared" || item.avatarType === avatarType) && ownedById.has(item.id)),
    [avatarType, ownedById],
  );
  const enabledOwnedCharacterItemIds = useMemo(
    () => ownedCharacterItems
      .filter(item => ownedById.get(item.id)?.isEnabled)
      .map(item => item.id),
    [ownedById, ownedCharacterItems],
  );
  const hasStoredCharacterChanges = ownedCharacterSnapshotItemIds !== null
    && !haveSameItemIds(ownedCharacterSnapshotItemIds, enabledOwnedCharacterItemIds);
  const canRestoreOwnedCharacterState = ownedCharacterSnapshotItemIds !== null
    && (hasOwnedCharacterPreview || hasStoredCharacterChanges);
  const ownedMapItems = useMemo(
    () => HEART_SHOP_MAP_CATALOG.filter(item => ownedById.has(item.id)),
    [ownedById],
  );
  const visibleOwnedCharacterItems = useMemo(
    () => ownedCharacterItems.filter(item =>
      isOwnedCharacterItemInCategory(item, activeOwnedCharacterCategory),
    ),
    [activeOwnedCharacterCategory, ownedCharacterItems],
  );

  const previewItem = getHeartShopCatalogItem(previewItemId);
  const selectedItem = getHeartShopCatalogItem(selectedItemId);
  const completedItem = getHeartShopCatalogItem(completedItemId);

  useEffect(() => setLocalBalance(heartBalance), [heartBalance]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { purchasingRef.current = purchasing; }, [purchasing]);

  function pushHistory(kind: HeartShopHistoryKind) {
    if (typeof window === "undefined") return;
    const stack = historyStackRef.current;
    if (stack[stack.length - 1] === kind) return;
    const currentState = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
    window.history.pushState({ ...currentState, rootsHeartShop: kind }, "", window.location.href);
    historyStackRef.current = [...stack, kind];
  }

  function replaceHistory(kind: HeartShopHistoryKind) {
    if (typeof window === "undefined") return;
    const stack = historyStackRef.current;
    if (stack.length === 0) {
      pushHistory(kind);
      return;
    }
    const currentState = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
    window.history.replaceState({ ...currentState, rootsHeartShop: kind }, "", window.location.href);
    historyStackRef.current = [...stack.slice(0, -1), kind];
  }

  function closeTopLayer() {
    if (typeof window !== "undefined" && historyStackRef.current.length > 0) {
      window.history.back();
      return;
    }
    onCloseRef.current();
  }

  function openPreview(itemId: HeartShopItemId) {
    pushHistory("preview");
    setPreviewItemId(itemId);
  }

  function previewMapItemInScene(itemId: HeartShopMapItemId) {
    setMapScenePreviewItemId(current => current === itemId ? null : itemId);
    window.requestAnimationFrame(() => {
      mapPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function applyCharacterShopOutfitPreview(item: HeartShopCharacterCatalogItem) {
    setCharacterShopPreviewItemIds(current => {
      const next = { ...current };
      const currentItemId = currentLayers.find(layer => layer.slot === item.slot)?.id;
      if (currentItemId === item.id) {
        delete next[item.slot];
      } else {
        next[item.slot] = item.id;
      }
      return next;
    });
  }

  function applyOwnedCharacterOutfitPreview(item: HeartShopCharacterCatalogItem) {
    setOwnedCharacterPreviewItemIds(current => {
      const next = { ...current };
      const currentItemId = currentLayers.find(layer => layer.slot === item.slot)?.id;
      if (currentItemId === item.id) {
        delete next[item.slot];
      } else {
        next[item.slot] = item.id;
      }
      return next;
    });
  }

  function openPurchase(itemId: HeartShopItemId) {
    setPurchaseError("");
    pushHistory("purchase");
    setSelectedItemId(itemId);
  }

  function openPurchaseFromPreview(itemId: HeartShopItemId) {
    setPreviewItemId(null);
    setPurchaseError("");
    replaceHistory("purchase");
    setSelectedItemId(itemId);
  }

  function publishOwnedItems(items: OwnedHeartShopItem[]) {
    setOwnedItems(items);
    onOwnedItemsChange?.(items);
  }

  async function reloadOwnedItems(supabase: ReturnType<typeof createClient>) {
    const items = await loadOwnedHeartShopItems(supabase);
    publishOwnedItems(items);
    return items;
  }

  function getCharacterPreviewLayers(item: HeartShopCharacterCatalogItem): ProfileCharacterLayer[] {
    return [
      ...currentLayers.filter(layer => layer.slot !== item.slot),
      ...getProfileCharacterLayersForItemIds([item.id], avatarType),
    ];
  }

  function getItemName(item: HeartShopCatalogItem) {
    return isHeartShopMapCatalogItem(item)
      ? text.items[item.id].name
      : getProfileCharacterItemText(item.id, lang).name;
  }

  function getItemDescription(item: HeartShopCatalogItem) {
    return isHeartShopMapCatalogItem(item)
      ? text.items[item.id].description
      : getProfileCharacterItemText(item.id, lang).description;
  }

  useEffect(() => {
    function handlePopState() {
      const stack = historyStackRef.current;
      const activeLayer = stack[stack.length - 1] ?? null;
      if (!activeLayer) return;
      historyStackRef.current = stack.slice(0, -1);

      if (activeLayer === "preview") setPreviewItemId(null);
      if (activeLayer === "purchase") {
        if (purchasingRef.current) {
          pushHistory("purchase");
          return;
        }
        setSelectedItemId(null);
        setPurchaseError("");
      }
      if (activeLayer === "complete") setCompletedItemId(null);
      if (activeLayer === "shop") onCloseRef.current();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!show) return;
    if (historyStackRef.current.length === 0) pushHistory("shop");
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setActiveTab("character");
    setActiveMapSection(getDefaultMapSection(normalizedTotalDays));
    setActiveCharacterCategory("all");
    setActiveOwnedSection("character");
    setActiveOwnedCharacterCategory("tops");
    setMapScenePreviewItemId(null);
    setCharacterShopPreviewItemIds({});
    setOwnedCharacterPreviewItemIds({});
    setOwnedCharacterSnapshotItemIds(null);
    setOwnedItemsLoaded(false);
    setRestoringCharacterState(false);
    setNotice("");
    setPreviewItemId(null);
    setSelectedItemId(null);
    setCompletedItemId(null);
    setPurchaseError("");
    setApplyingFreeItemId(null);
    return () => { document.body.style.overflow = previousOverflow; };
  }, [show, normalizedTotalDays]);

  useEffect(() => {
    if (!unlockedMapSections.has(activeMapSection)) {
      setActiveMapSection(getDefaultMapSection(normalizedTotalDays));
    }
  }, [activeMapSection, normalizedTotalDays, unlockedMapSections]);

  useEffect(() => {
    setMapScenePreviewItemId(null);
  }, [activeMapSection]);

  useEffect(() => {
    if (activeTab !== "map") setMapScenePreviewItemId(null);
  }, [activeTab]);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    const supabase = createClient();
    setLoadingOwned(true);
    setOwnedItemsLoaded(false);
    void loadOwnedHeartShopItems(supabase)
      .then(items => {
        if (!cancelled) publishOwnedItems(items);
      })
      .catch(error => {
        console.warn("사랑 상점 구매 내역 조회 실패:", error);
        if (!cancelled) {
          publishOwnedItems([]);
          setNotice(text.shopUnavailable);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOwned(false);
          setOwnedItemsLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [show, text.shopUnavailable]);

  useEffect(() => {
    if (
      !show
      || !ownedItemsLoaded
      || activeTab !== "owned"
      || activeOwnedSection !== "character"
      || ownedCharacterSnapshotItemIds !== null
    ) {
      return;
    }
    setOwnedCharacterSnapshotItemIds(enabledOwnedCharacterItemIds);
  }, [
    activeOwnedSection,
    activeTab,
    enabledOwnedCharacterItemIds,
    ownedCharacterSnapshotItemIds,
    ownedItemsLoaded,
    show,
  ]);

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
        await reloadOwnedItems(supabase);
        setSelectedItemId(null);
        replaceHistory("complete");
        setCompletedItemId(selectedItem.id);
        return;
      }
      if (result.alreadyOwned) {
        await reloadOwnedItems(supabase);
        closeTopLayer();
        setNotice(text.alreadyOwned);
        setActiveOwnedSection(isHeartShopCharacterCatalogItem(selectedItem) ? "character" : "map");
        setActiveTab("owned");
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

  async function applyFreeBackground(item: HeartShopCharacterCatalogItem) {
    if (item.slot !== "background" || item.price !== 0 || applyingFreeItemId) return;
    setApplyingFreeItemId(item.id);
    try {
      const supabase = createClient();
      const result = await applyFreeHeartShopItem(supabase, item.id);
      if (!result.applied) throw new Error(result.reason || "apply_failed");
      await reloadOwnedItems(supabase);
      setCharacterShopPreviewItemIds(current => {
        const next = { ...current };
        delete next.background;
        return next;
      });
      setNotice(text.applySuccess);
    } catch (error) {
      console.warn("사랑 상점 무료 배경 적용 실패:", error);
      setNotice(text.applyFailed);
    } finally {
      setApplyingFreeItemId(null);
    }
  }

  async function toggleOwnedItem(item: OwnedHeartShopItem) {
    if (togglingItemId || restoringCharacterState) return;
    const nextEnabled = !item.isEnabled;
    if (
      nextEnabled
      && peaceArkStageNumber === 9
      && isHeartShopPeaceArkStaticItemId(item.itemId)
    ) {
      setNotice(text.arkFloodToggleUnavailable);
      return;
    }
    setTogglingItemId(item.itemId);
    try {
      const supabase = createClient();
      const result = await setHeartShopItemEnabled(supabase, item.itemId, !item.isEnabled);
      if (!result.updated) throw new Error(result.reason || "toggle_failed");
      await reloadOwnedItems(supabase);
      const catalogItem = getHeartShopCatalogItem(item.itemId);
      if (catalogItem && isHeartShopCharacterCatalogItem(catalogItem)) {
        setOwnedCharacterPreviewItemIds(current => {
          if (!current[catalogItem.slot]) return current;
          const next = { ...current };
          delete next[catalogItem.slot];
          return next;
        });
      }
    } catch (error) {
      console.warn("사랑 상점 아이템 표시 설정 실패:", error);
      setNotice(text.toggleFailed);
    } finally {
      setTogglingItemId(null);
    }
  }


  async function restoreOwnedCharacterState() {
    if (
      restoringCharacterState
      || togglingItemId
      || ownedCharacterSnapshotItemIds === null
      || !canRestoreOwnedCharacterState
    ) {
      return;
    }

    const snapshotIds = new Set<HeartShopItemId>(ownedCharacterSnapshotItemIds);
    const relevantItemIds = new Set<HeartShopItemId>(ownedCharacterItems.map(item => item.id));
    const relevantOwnedItems = ownedItems.filter(
      item => isHeartShopCharacterItemId(item.itemId) && relevantItemIds.has(item.itemId),
    );
    const currentEnabledIds = new Set<HeartShopItemId>(
      relevantOwnedItems.filter(item => item.isEnabled).map(item => item.itemId),
    );
    const itemsToDisable = relevantOwnedItems.filter(
      item => item.isEnabled && !snapshotIds.has(item.itemId),
    );
    const itemsToEnable = ownedCharacterSnapshotItemIds.filter(
      itemId => !currentEnabledIds.has(itemId),
    );

    setRestoringCharacterState(true);
    setOwnedCharacterPreviewItemIds({});
    try {
      if (itemsToDisable.length > 0 || itemsToEnable.length > 0) {
        const supabase = createClient();

        for (const item of itemsToDisable) {
          const result = await setHeartShopItemEnabled(supabase, item.itemId, false);
          if (!result.updated) throw new Error(result.reason || "restore_disable_failed");
        }

        for (const itemId of itemsToEnable) {
          const result = await setHeartShopItemEnabled(supabase, itemId, true);
          if (!result.updated) throw new Error(result.reason || "restore_enable_failed");
        }

        await reloadOwnedItems(supabase);
      }
      setNotice(text.restorePreviousSuccess);
    } catch (error) {
      console.warn("사랑 상점 변경 전 상태 복원 실패:", error);
      try {
        await reloadOwnedItems(createClient());
      } catch (reloadError) {
        console.warn("사랑 상점 복원 실패 후 상태 재조회 실패:", reloadError);
      }
      setNotice(text.restorePreviousFailed);
    } finally {
      setRestoringCharacterState(false);
    }
  }

  if (!show) return null;

  const tabs: { id: HeartShopTab; label: string }[] = [
    { id: "character", label: text.characterTab },
    { id: "map", label: text.mapTab },
    { id: "owned", label: text.ownedTab },
  ];
  const characterCategories: { id: ProfileCharacterCategory; label: string }[] = [
    { id: "all", label: profileText.categories.all },
    { id: "backgrounds", label: profileText.categories.backgrounds },
    { id: "pets", label: profileText.categories.pets },
    { id: "tops", label: profileText.categories.tops },
    { id: "bottoms", label: profileText.categories.bottoms },
    { id: "shoes", label: profileText.categories.shoes },
    { id: "eyewear", label: profileText.categories.eyewear },
    { id: "headwear", label: profileText.categories.headwear },
  ];
  if (avatarType === "rootswoman") {
    characterCategories.push(
      { id: "accessories", label: profileText.categories.accessories },
      { id: "bags", label: profileText.categories.bags },
    );
  }
  const ownedCharacterCategories: { id: HeartShopOwnedCharacterCategory; label: string }[] = [
    { id: "tops", label: profileText.categories.tops },
    { id: "bottoms", label: profileText.categories.bottoms },
    { id: "shoes", label: profileText.categories.shoes },
    { id: "accessories", label: text.ownedAccessoriesCategoryLabel },
    { id: "backgrounds", label: profileText.categories.backgrounds },
    { id: "pets", label: profileText.categories.pets },
  ];
  function renderCharacterPreview(item: HeartShopCharacterCatalogItem, width: string | number) {
    return (
      <ProfileCharacterPreview
        avatarType={avatarType}
        alt={getItemName(item)}
        layers={getCharacterPreviewLayers(item)}
        forceSquareCanvas
        style={{ width }}
      />
    );
  }

  function getMapPreviewBadge(itemId: HeartShopMapItemId) {
    return isHeartShopPeaceArkStaticItemId(itemId) ? text.staticPreviewBadge : text.previewBadge;
  }

  function getMapPreviewTitle(itemId: HeartShopMapItemId) {
    return isHeartShopPeaceArkStaticItemId(itemId) ? text.staticPreviewTitle : text.previewTitle;
  }

  function renderDialogVisual(item: HeartShopCatalogItem) {
    return isHeartShopMapCatalogItem(item) ? (
      <HeartShopFriendSprite
        itemId={item.id}
        renderWidth={getLargeSpriteWidth(item.id)}
        alt={getItemName(item)}
      />
    ) : renderCharacterPreview(item, 170);
  }

  function renderPurchaseDialogVisual(item: HeartShopCatalogItem) {
    return isHeartShopMapCatalogItem(item) ? renderDialogVisual(item) : (
      <CharacterItemLayerPreview item={item} alt={getItemName(item)} maxWidth={220} />
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={text.title}
      style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", justifyContent: "center", background: "rgba(24,25,27,.28)", overflow: "hidden", overscrollBehavior: "contain" }}
    >
      {notice && (
        <div role="status" style={{ position: "fixed", top: 74, left: "50%", transform: "translateX(-50%)", zIndex: 560, width: "calc(100% - 40px)", maxWidth: 390, padding: "11px 14px", borderRadius: 16, background: "var(--bg2)", border: "1px solid var(--border)", boxShadow: "0 12px 30px rgba(55,43,31,.16)", color: "var(--text)", fontSize: 12, fontWeight: 800, textAlign: "center" }}>
          {notice}
        </div>
      )}

      <div style={{ minHeight: "100dvh", height: "100dvh", width: "100%", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", overflow: "hidden", overscrollBehavior: "contain", background: "radial-gradient(circle at 90% 4%, rgba(232,197,71,.14), transparent 25%), linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)" }}>
        <header style={{ position: "relative", zIndex: 10, flexShrink: 0, display: "grid", gridTemplateColumns: "44px 1fr auto", alignItems: "center", gap: 8, padding: "calc(10px + env(safe-area-inset-top)) 16px 11px", background: "var(--heart-shop-header-surface)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(122,157,122,.15)" }}>
          <button type="button" onClick={closeTopLayer} aria-label={text.closeLabel} style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={19} />
          </button>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 950, color: "var(--text)", textAlign: "center" }}>{text.title}</h2>
          <div aria-label={`${text.balanceLabel} ${localBalance}`} style={{ minWidth: 72, height: 38, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(232,197,71,.36)", background: "var(--heart-shop-balance-surface)", color: "var(--heart-shop-balance-text)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 13, fontWeight: 950, whiteSpace: "nowrap" }}>
            <span aria-hidden="true">💛</span><span>{localBalance}</span>
          </div>
        </header>

        <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: activeTab === "character" ? "hidden" : "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: activeTab === "character" ? "16px 16px 0" : "16px 16px calc(28px + env(safe-area-inset-bottom))" }}>
          <div style={{ flexShrink: 0, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, padding: 5, borderRadius: 18, background: "var(--bg3)", border: "1px solid var(--border)", marginBottom: 16 }}>
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} style={{ minHeight: 40, padding: "8px 6px", borderRadius: 14, border: active ? "1px solid rgba(122,157,122,.38)" : "1px solid transparent", background: active ? "var(--heart-shop-action)" : "transparent", color: active ? "var(--heart-shop-on-action)" : "var(--text2)", fontSize: 11.5, fontWeight: 900, cursor: "pointer", lineHeight: 1.25 }}>
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
                  display: "flex",
                  gap: 7,
                  overflowX: "auto",
                  padding: 4,
                  marginBottom: 14,
                  borderRadius: 16,
                  background: "rgba(122,157,122,.07)",
                  border: "1px solid rgba(122,157,122,.2)",
                  scrollSnapType: "x proximity",
                  scrollbarWidth: "none",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {MAP_OPTIONS.map(option => {
                  const active = activeMapSection === option.id;
                  const unlocked = unlockedMapSections.has(option.id);
                  const label = option.id === "garden"
                    ? text.gardenMapLabel
                    : option.id === "peaceArk"
                      ? text.peaceArkMapLabel
                      : text.nehemiahMapLabel;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-disabled={!unlocked}
                      disabled={!unlocked}
                      onClick={() => {
                        if (unlocked) setActiveMapSection(option.id);
                      }}
                      style={{
                        flex: "0 0 auto",
                        minWidth: 132,
                        minHeight: 48,
                        padding: "7px 12px",
                        borderRadius: 13,
                        border: active ? "1px solid rgba(122,157,122,.38)" : "1px solid transparent",
                        background: active
                          ? "rgba(122,157,122,.15)"
                          : unlocked
                            ? "transparent"
                            : "rgba(125,127,124,.055)",
                        color: active
                          ? "var(--sage-dark)"
                          : unlocked
                            ? "var(--text2)"
                            : "var(--heart-shop-muted-text)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 3,
                        fontSize: 11,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                        cursor: unlocked ? "pointer" : "default",
                        opacity: unlocked ? 1 : 0.62,
                        scrollSnapAlign: "start",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {!unlocked && <LockKeyhole size={12} aria-hidden="true" />}
                        {label}
                      </span>
                      {!unlocked && (
                        <small style={{ fontSize: 8.5, fontWeight: 800 }}>
                          {formatHeartShopText(text.mapUnlockDayLabel, { day: option.unlockDay })}
                        </small>
                      )}
                    </button>
                  );
                })}
              </div>

              {activeMapCycle && (
                <div ref={mapPreviewRef} style={{ marginBottom: 14 }}>
                  <HeartShopMapPreview
                    cycle={activeMapCycle}
                    mapKind={activeMapSection}
                    label={activeMapSection === "garden"
                      ? text.gardenMapLabel
                      : activeMapSection === "peaceArk"
                        ? text.peaceArkMapLabel
                        : text.nehemiahMapLabel}
                    avatarType={avatarType}
                    enabledItemIds={displayedMapItemIds}
                  />
                  {mapScenePreviewItemId && (
                    <div
                      role="status"
                      style={{
                        marginTop: 7,
                        color: "var(--sage-dark)",
                        fontSize: 10.5,
                        lineHeight: 1.4,
                        fontWeight: 850,
                        textAlign: "center",
                      }}
                    >
                      {text.staticPreviewTitle}: {text.items[mapScenePreviewItemId].name}
                    </div>
                  )}
                </div>
              )}

              {visibleMapItems.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 11 }}>
                  {visibleMapItems.map(item => {
                    const itemText = text.items[item.id];
                    const owned = ownedById.has(item.id);
                    return (
                      <article key={item.id} className="card" style={{ minWidth: 0, padding: "10px 10px 11px", display: "flex", flexDirection: "column", border: "1px solid var(--heart-shop-card-border)", background: "var(--heart-shop-card-surface)", boxShadow: "0 8px 24px rgba(75,62,45,.06)" }}>
                        <div style={{ position: "relative", width: "100%", height: 112, marginBottom: 10 }}>
                          <button
                            type="button"
                            onClick={() => previewMapItemInScene(item.id)}
                            aria-label={`${text.staticPreviewTitle}: ${itemText.name}`}
                            aria-pressed={mapScenePreviewItemId === item.id}
                            style={{
                              position: "relative",
                              width: "100%",
                              height: "100%",
                              padding: 0,
                              borderRadius: 18,
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: mapScenePreviewItemId === item.id
                                ? "rgba(122,157,122,.12)"
                                : "var(--heart-shop-preview-surface)",
                              border: mapScenePreviewItemId === item.id
                                ? "2px solid rgba(101,142,105,.72)"
                                : "1px solid var(--heart-shop-preview-border)",
                              cursor: "pointer",
                            }}
                          >
                            {(item.isBest || item.isNew) && (
                              <span
                                aria-label={item.isBest ? text.bestLabel : text.newLabel}
                                style={{
                                  position: "absolute",
                                  top: 7,
                                  left: 7,
                                  zIndex: 2,
                                  borderRadius: 999,
                                  padding: "4px 8px",
                                  background: item.isBest ? "#d4a337" : "#e87568",
                                  color: "#fff",
                                  boxShadow: "0 2px 7px rgba(71,41,35,.24)",
                                  fontSize: 9,
                                  lineHeight: 1,
                                  fontWeight: 950,
                                  letterSpacing: ".2px",
                                }}
                              >
                                {item.isBest ? text.bestLabel : text.newLabel}
                              </span>
                            )}
                            {mapScenePreviewItemId === item.id && (
                              <span
                                aria-hidden="true"
                                style={{
                                  position: "absolute",
                                  top: 7,
                                  right: 7,
                                  zIndex: 2,
                                  width: 24,
                                  height: 24,
                                  borderRadius: 999,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "var(--heart-shop-action)",
                                  color: "var(--heart-shop-on-action)",
                                  boxShadow: "0 2px 7px rgba(71,41,35,.18)",
                                }}
                              >
                                <CheckCircle2 size={15} strokeWidth={2.7} />
                              </span>
                            )}
                            <img src={item.previewPath} alt={itemText.name} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openPreview(item.id)}
                            aria-label={`${itemText.name} · ${getMapPreviewBadge(item.id)}`}
                            style={{
                              position: "absolute",
                              right: 7,
                              bottom: 7,
                              zIndex: 3,
                              border: "none",
                              borderRadius: 999,
                              padding: "4px 7px",
                              background: "rgba(26,28,30,.72)",
                              color: "#fff",
                              fontSize: 8.5,
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            {getMapPreviewBadge(item.id)}
                          </button>
                        </div>
                        <h3 style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 950, color: "var(--text)" }}>{itemText.name}</h3>
                        <p style={{ margin: 0, minHeight: 36, color: "var(--heart-shop-muted-text)", fontSize: 10.5, lineHeight: 1.45, fontWeight: 650 }}>{itemText.description}</p>
                        <div style={{ color: "var(--heart-shop-price-text)", fontSize: 13, fontWeight: 950, margin: "10px 0 9px", textAlign: "center" }}>💛 {item.price}</div>
                        <button type="button" onClick={() => { if (owned) { setActiveOwnedSection("map"); setActiveTab("owned"); } else { openPurchase(item.id); } }} style={{ width: "100%", minHeight: 38, border: owned ? "1px solid var(--border)" : "none", borderRadius: 13, background: owned ? "var(--bg3)" : "var(--heart-shop-action)", color: owned ? "var(--sage-dark)" : "var(--heart-shop-on-action)", fontSize: 11.5, fontWeight: 950, cursor: "pointer" }}>
                          {owned ? text.ownedButton : text.purchaseButton}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="card" style={{ minHeight: 330, padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", border: "1px dashed rgba(122,157,122,.34)", background: "var(--heart-shop-card-surface-quiet)" }}>
                  <PackageOpen size={35} style={{ marginBottom: 17, color: "var(--sage-dark)" }} />
                  <h3 style={{ margin: "0 0 9px", color: "var(--text)", fontSize: 18, fontWeight: 950 }}>{text.peaceArkComingSoonTitle}</h3>
                  <p style={{ margin: 0, maxWidth: 290, color: "var(--heart-shop-muted-text)", fontSize: 12.5, lineHeight: 1.65, fontWeight: 650 }}>{text.peaceArkComingSoonBody}</p>
                </div>
              )}
            </section>
          )}

          {activeTab === "character" && (
            <section style={{ flex: 1, minHeight: 0, margin: "0 -16px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div className="card" style={{ position: "relative", flexShrink: 0, margin: "0 16px", padding: "10px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", border: "1px solid var(--heart-shop-card-border)", background: "var(--heart-shop-look-preview)" }}>
                <button
                  type="button"
                  onClick={() => setCharacterShopPreviewItemIds({})}
                  disabled={!hasCharacterShopPreview}
                  aria-label={profileText.restoreOutfitLabel}
                  title={profileText.restoreOutfitLabel}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 12,
                    zIndex: 1,
                    width: 34,
                    height: 34,
                    padding: 0,
                    borderRadius: 999,
                    border: hasCharacterShopPreview ? "1px solid rgba(122,157,122,.38)" : "1px solid var(--border)",
                    background: hasCharacterShopPreview ? "var(--heart-shop-reset-surface)" : "var(--heart-shop-reset-surface-muted)",
                    color: hasCharacterShopPreview ? "var(--sage-dark)" : "var(--heart-shop-muted-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: hasCharacterShopPreview ? "pointer" : "default",
                    opacity: hasCharacterShopPreview ? 1 : 0.45,
                  }}
                >
                  <RotateCcw size={18} strokeWidth={2.5} aria-hidden="true" />
                </button>
                <div style={{ borderRadius: 999, padding: "5px 10px", marginBottom: 4, background: "rgba(122,157,122,.12)", color: "var(--sage-dark)", fontSize: 10.5, fontWeight: 900 }}>{text.currentLookTitle}</div>
                <ProfileCharacterPreview avatarType={avatarType} alt={getRootsAvatarLabel(avatarType, lang)} layers={characterShopDisplayedLayers} forceSquareCanvas style={{ width: "clamp(120px,20dvh,180px)" }} />
              </div>

              <div role="tablist" aria-label={text.characterTab} style={{ flexShrink: 0, display: "flex", gap: 7, overflowX: "auto", padding: "2px 16px 8px", marginTop: 10, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                {characterCategories.map(category => {
                  const active = activeCharacterCategory === category.id;
                  return (
                    <button key={category.id} type="button" role="tab" aria-selected={active} onClick={() => setActiveCharacterCategory(category.id)} style={{ flex: "0 0 auto", minHeight: 36, padding: "7px 12px", borderRadius: 999, border: active ? "1px solid rgba(122,157,122,.36)" : "1px solid var(--border)", background: active ? "rgba(122,157,122,.14)" : "var(--bg2)", color: active ? "var(--sage-dark)" : "var(--text2)", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap", cursor: "pointer" }}>
                      {category.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: "0 16px calc(28px + env(safe-area-inset-bottom))" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 11 }}>
                  {visibleCharacterItems.map(item => {
                    const itemText = getProfileCharacterItemText(item.id, lang);
                    const owned = ownedById.has(item.id);
                    const ownedItem = ownedById.get(item.id);
                    const isFreeBackground = item.slot === "background" && item.price === 0;
                    const isApplied = isFreeBackground && ownedItem?.isEnabled === true;
                    const isApplying = applyingFreeItemId === item.id;
                    const previewing = characterShopPreviewItemIds[item.slot] === item.id;
                    const previewLabel = `${profileText.previewLabel}: ${itemText.name}`;
                    return (
                      <article key={item.id} className="card" style={{ minWidth: 0, padding: "9px 9px 11px", display: "flex", flexDirection: "column", border: "1px solid var(--heart-shop-card-border)", background: "var(--heart-shop-card-surface)" }}>
                        <button
                          type="button"
                          onClick={() => applyCharacterShopOutfitPreview(item)}
                          aria-label={previewLabel}
                          title={previewLabel}
                          aria-pressed={previewing}
                          style={{
                            position: "relative",
                            width: "100%",
                            height: 176,
                            padding: 12,
                            borderRadius: 18,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: previewing ? "var(--heart-shop-item-preview-active)" : "var(--heart-shop-item-preview)",
                            border: previewing ? "2px solid rgba(101,142,105,.62)" : "1px solid rgba(122,157,122,.17)",
                            marginBottom: 9,
                            cursor: "pointer",
                          }}
                        >
                          {item.isNew && (
                            <span
                              aria-label={text.newLabel}
                              style={{
                                position: "absolute",
                                top: 7,
                                left: 7,
                                zIndex: 2,
                                borderRadius: 999,
                                padding: "4px 8px",
                                background: "#e87568",
                                color: "#fff",
                                boxShadow: "0 2px 7px rgba(71,41,35,.24)",
                                fontSize: 9,
                                lineHeight: 1,
                                fontWeight: 950,
                                letterSpacing: ".2px",
                              }}
                            >
                              {text.newLabel}
                            </span>
                          )}
                          <CharacterItemLayerPreview item={item} alt={itemText.name} maxWidth={145} />
                        </button>
                        <h3 style={{ margin: "0 0 4px", minHeight: 34, fontSize: 12.5, lineHeight: 1.35, fontWeight: 950, color: "var(--text)" }}>{itemText.name}</h3>
                        <div style={{ color: isFreeBackground ? "var(--sage-dark)" : "var(--heart-shop-price-text)", fontSize: 12.5, fontWeight: 950, margin: "6px 0 8px", textAlign: "center" }}>
                          {isFreeBackground ? text.freeLabel : `💛 ${item.price}`}
                        </div>
                        <button
                          type="button"
                          disabled={isApplying}
                          onClick={() => {
                            if (isFreeBackground) {
                              void applyFreeBackground(item);
                            } else if (owned) {
                              setActiveOwnedSection("character");
                              setActiveTab("owned");
                            } else {
                              openPurchase(item.id);
                            }
                          }}
                          style={{
                            width: "100%",
                            minHeight: 38,
                            padding: "7px 8px",
                            border: owned || isApplied ? "1px solid var(--border)" : "none",
                            borderRadius: 13,
                            background: (owned && !isFreeBackground) || isApplied ? "var(--bg3)" : "var(--heart-shop-action)",
                            color: (owned && !isFreeBackground) || isApplied ? "var(--sage-dark)" : "var(--heart-shop-on-action)",
                            fontSize: 10.5,
                            lineHeight: 1.2,
                            fontWeight: 950,
                            cursor: isApplying ? "default" : "pointer",
                            opacity: isApplying ? 0.7 : 1,
                          }}
                        >
                          {isFreeBackground
                            ? isApplying
                              ? text.applyingLabel
                              : isApplied
                                ? text.appliedButton
                                : text.applyButton
                            : owned
                              ? text.ownedButton
                              : text.purchaseButton}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {activeTab === "owned" && (
            <section>
              <div role="tablist" aria-label={text.ownedTab} style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, padding: 4, marginBottom: 14, borderRadius: 16, background: "rgba(122,157,122,.07)", border: "1px solid rgba(122,157,122,.2)" }}>
                {(["character", "map"] as const).map(section => {
                  const active = activeOwnedSection === section;
                  return (
                    <button key={section} type="button" role="tab" aria-selected={active} onClick={() => setActiveOwnedSection(section)} style={{ minHeight: 42, padding: "8px 7px", borderRadius: 13, border: active ? "1px solid rgba(122,157,122,.34)" : "1px solid transparent", background: active ? "rgba(122,157,122,.14)" : "transparent", color: active ? "var(--sage-dark)" : "var(--text2)", fontSize: 11.5, fontWeight: 900, cursor: "pointer" }}>
                      {section === "character" ? text.characterOwnedTitle : text.mapOwnedTitle}
                    </button>
                  );
                })}
              </div>

              {loadingOwned ? (
                <div className="card" style={{ minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, color: "var(--heart-shop-muted-text)", fontSize: 13, fontWeight: 750 }}><Loader2 size={18} className="spin" />{text.loadingOwned}</div>
              ) : activeOwnedSection === "character" && ownedCharacterItems.length === 0 ? (
                <div className="card" style={{ minHeight: 360, padding: "34px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", background: "var(--heart-shop-card-surface-empty)" }}>
                  <PackageOpen size={38} style={{ marginBottom: 18, color: "var(--sage-dark)" }} />
                  <h3 style={{ margin: "0 0 10px", color: "var(--text)", fontSize: 19, fontWeight: 950 }}>{text.ownedEmptyTitle}</h3>
                  <p style={{ margin: 0, maxWidth: 310, color: "var(--heart-shop-muted-text)", fontSize: 13, lineHeight: 1.65, fontWeight: 650 }}>{text.characterOwnedEmptyBody}</p>
                </div>
              ) : activeOwnedSection === "character" ? (
                <div className="card" style={{ padding: "0 14px 6px", background: "var(--heart-shop-card-surface-owned)" }}>
                  <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "10px 16px", borderRadius: 18, background: "var(--heart-shop-owned-preview)", marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => void restoreOwnedCharacterState()}
                      disabled={!canRestoreOwnedCharacterState || restoringCharacterState}
                      aria-label={text.restorePreviousLabel}
                      title={text.restorePreviousLabel}
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 12,
                        zIndex: 1,
                        width: 34,
                        height: 34,
                        padding: 0,
                        borderRadius: 999,
                        border: canRestoreOwnedCharacterState ? "1px solid rgba(122,157,122,.38)" : "1px solid var(--border)",
                        background: canRestoreOwnedCharacterState ? "var(--heart-shop-reset-surface)" : "var(--heart-shop-reset-surface-muted)",
                        color: canRestoreOwnedCharacterState ? "var(--sage-dark)" : "var(--heart-shop-muted-text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: canRestoreOwnedCharacterState && !restoringCharacterState ? "pointer" : "default",
                        opacity: canRestoreOwnedCharacterState ? 1 : 0.45,
                      }}
                    >
                      {restoringCharacterState
                        ? <Loader2 size={18} className="spin" aria-hidden="true" />
                        : <RotateCcw size={18} strokeWidth={2.5} aria-hidden="true" />}
                    </button>
                    <div style={{ borderRadius: 999, padding: "5px 10px", marginBottom: 4, background: "rgba(122,157,122,.12)", color: "var(--sage-dark)", fontSize: 10.5, fontWeight: 900 }}>{text.currentLookTitle}</div>
                    <ProfileCharacterPreview avatarType={avatarType} alt={getRootsAvatarLabel(avatarType, lang)} layers={ownedCharacterDisplayedLayers} forceSquareCanvas style={{ width: "clamp(120px,20dvh,180px)" }} />
                  </div>
                  <p style={{ margin: "4px 2px 10px", color: "var(--heart-shop-muted-text)", fontSize: 10.5, lineHeight: 1.5, fontWeight: 650 }}>{text.sameSlotHint}</p>
                  <div
                    role="tablist"
                    aria-label={text.characterOwnedTitle}
                    style={{
                      display: "flex",
                      gap: 7,
                      overflowX: "auto",
                      padding: "2px 0 9px",
                      scrollbarWidth: "none",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {ownedCharacterCategories.map(category => {
                      const active = activeOwnedCharacterCategory === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setActiveOwnedCharacterCategory(category.id)}
                          style={{
                            flex: "0 0 auto",
                            minHeight: 34,
                            padding: "6px 11px",
                            borderRadius: 999,
                            border: active ? "1px solid rgba(122,157,122,.36)" : "1px solid var(--border)",
                            background: active ? "rgba(122,157,122,.14)" : "var(--bg2)",
                            color: active ? "var(--sage-dark)" : "var(--text2)",
                            fontSize: 10.5,
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
                  {visibleOwnedCharacterItems.length === 0 ? (
                    <div style={{ minHeight: 150, padding: "26px 14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "var(--heart-shop-muted-text)" }}>
                      <PackageOpen size={30} style={{ marginBottom: 10, color: "var(--sage-dark)" }} />
                      <strong style={{ color: "var(--text)", fontSize: 13, marginBottom: 5 }}>{profileText.emptyTitle}</strong>
                      <span style={{ fontSize: 11, lineHeight: 1.5, fontWeight: 650 }}>{profileText.emptyBody}</span>
                    </div>
                  ) : visibleOwnedCharacterItems.map((catalogItem, index) => {
                    const owned = ownedById.get(catalogItem.id)!;
                    const name = getProfileCharacterItemText(catalogItem.id, lang).name;
                    const previewing = ownedCharacterPreviewItemIds[catalogItem.slot] === catalogItem.id;
                    return (
                      <div key={owned.itemId} style={{ minHeight: 72, display: "grid", gridTemplateColumns: "minmax(0,1fr) 76px", alignItems: "center", gap: 10, borderBottom: index < visibleOwnedCharacterItems.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <button
                          type="button"
                          onClick={() => applyOwnedCharacterOutfitPreview(catalogItem)}
                          aria-label={`${profileText.previewLabel}: ${name}`}
                          aria-pressed={previewing}
                          style={{
                            minWidth: 0,
                            minHeight: 68,
                            padding: 0,
                            border: "none",
                            background: previewing ? "rgba(122,157,122,.08)" : "transparent",
                            borderRadius: 11,
                            display: "grid",
                            gridTemplateColumns: "52px minmax(0,1fr)",
                            alignItems: "center",
                            gap: 10,
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ width: 50, height: 58, padding: 5, borderRadius: 10, border: previewing ? "2px solid rgba(122,157,122,.58)" : "1px solid var(--border)", background: "rgba(122,157,122,.06)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CharacterItemLayerPreview item={catalogItem} alt={name} maxWidth={44} />
                          </div>
                          <span style={{ minWidth: 0, color: previewing ? "var(--sage-dark)" : "var(--text)", fontSize: 12, lineHeight: 1.35, fontWeight: 900 }}>{name}</span>
                        </button>
                        <HeartShopToggleSwitch
                          enabled={owned.isEnabled}
                          loading={restoringCharacterState || togglingItemId === owned.itemId}
                          enabledLabel={text.enabledLabel}
                          disabledLabel={text.disabledLabel}
                          ariaLabel={name}
                          onChange={() => void toggleOwnedItem(owned)}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : ownedMapItems.length === 0 ? (
                <div className="card" style={{ minHeight: 360, padding: "34px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", background: "var(--heart-shop-card-surface-empty)" }}>
                  <PackageOpen size={38} style={{ marginBottom: 18, color: "var(--sage-dark)" }} />
                  <h3 style={{ margin: "0 0 10px", color: "var(--text)", fontSize: 19, fontWeight: 950 }}>{text.ownedEmptyTitle}</h3>
                  <p style={{ margin: 0, maxWidth: 310, color: "var(--heart-shop-muted-text)", fontSize: 13, lineHeight: 1.65, fontWeight: 650 }}>{text.ownedEmptyBody}</p>
                </div>
              ) : (
                <div>
                  <p style={{ margin: "0 2px 10px", color: "var(--text2)", fontSize: 11.5, lineHeight: 1.5, fontWeight: 700 }}>{text.ownedIntro}</p>
                  <div className="card" style={{ padding: "6px 14px", background: "var(--heart-shop-card-surface-owned)" }}>
                    {ownedMapItems.map((catalogItem, index) => {
                      const owned = ownedById.get(catalogItem.id)!;
                      return (
                        <div
                          key={owned.itemId}
                          style={{
                            minHeight: 82,
                            display: "grid",
                            gridTemplateColumns: "minmax(0,1fr) 76px",
                            alignItems: "center",
                            gap: 11,
                            borderBottom: index < ownedMapItems.length - 1 ? "1px solid var(--border)" : "none",
                          }}
                        >
                          <div
                            style={{
                              minWidth: 0,
                              minHeight: 76,
                              display: "grid",
                              gridTemplateColumns: "64px minmax(0,1fr)",
                              alignItems: "center",
                              gap: 11,
                            }}
                          >
                            <div
                              style={{
                                width: 60,
                                height: 60,
                                padding: 5,
                                borderRadius: 12,
                                border: "1px solid rgba(122,157,122,.18)",
                                background: "var(--heart-shop-preview-surface)",
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <img
                                src={catalogItem.previewPath}
                                alt={text.items[catalogItem.id].name}
                                draggable={false}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                  imageRendering: "pixelated",
                                  userSelect: "none",
                                  pointerEvents: "none",
                                }}
                              />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.35, fontWeight: 900 }}>
                                {text.items[catalogItem.id].name}
                              </div>
                              <div style={{ marginTop: 3, color: "var(--heart-shop-muted-text)", fontSize: 9.8, lineHeight: 1.4, fontWeight: 650 }}>
                                {text.items[catalogItem.id].description}
                              </div>
                            </div>
                          </div>
                          <HeartShopToggleSwitch
                            enabled={owned.isEnabled}
                            loading={togglingItemId === owned.itemId}
                            enabledLabel={text.enabledLabel}
                            disabledLabel={text.disabledLabel}
                            ariaLabel={text.items[catalogItem.id].name}
                            onChange={() => void toggleOwnedItem(owned)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {previewItem && (
        <div role="presentation" onClick={closeTopLayer} style={{ position: "fixed", inset: 0, zIndex: 538, display: "flex", alignItems: "center", justifyContent: "center", padding: 22, background: "rgba(28,29,30,.58)", backdropFilter: "blur(5px)" }}>
          <div role="dialog" aria-modal="true" aria-label={`${isHeartShopMapCatalogItem(previewItem) ? getMapPreviewTitle(previewItem.id) : text.characterPreviewTitle}: ${getItemName(previewItem)}`} onClick={event => event.stopPropagation()} style={{ width: "100%", maxWidth: 360, maxHeight: "calc(100dvh - 44px)", overflowY: "auto", borderRadius: 28, background: "var(--bg2)", border: "1px solid rgba(122,157,122,.28)", boxShadow: "0 24px 70px rgba(0,0,0,.3)", padding: "20px 18px 18px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", borderRadius: 999, background: "rgba(122,157,122,.12)", color: "var(--sage-dark)", padding: "5px 9px", fontSize: 10, fontWeight: 900, marginBottom: 8 }}>{isHeartShopMapCatalogItem(previewItem) ? getMapPreviewTitle(previewItem.id) : text.characterPreviewTitle}</div>
            <div style={{ minHeight: isHeartShopCharacterCatalogItem(previewItem) ? 248 : 180, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>{renderDialogVisual(previewItem)}</div>
            <h3 style={{ margin: "0 0 8px", color: "var(--text)", fontSize: 20, lineHeight: 1.35, fontWeight: 950 }}>{getItemName(previewItem)}</h3>
            <p style={{ margin: "0 auto", maxWidth: 310, color: "var(--text2)", fontSize: 13, lineHeight: 1.65, fontWeight: 650 }}>{getItemDescription(previewItem)}</p>
            <div style={{ marginTop: 12, color: "var(--heart-shop-price-text)", fontSize: 16, fontWeight: 950 }}>💛 {previewItem.price}</div>
            <div style={{ display: "grid", gridTemplateColumns: ".85fr 1.15fr", gap: 9, marginTop: 18 }}>
              <button type="button" onClick={closeTopLayer} style={{ minHeight: 46, borderRadius: 15, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text2)", fontSize: 12.5, fontWeight: 900, cursor: "pointer" }}>{text.closePreviewButton}</button>
              <button type="button" onClick={() => { if (ownedById.has(previewItem.id)) { setActiveOwnedSection(isHeartShopCharacterCatalogItem(previewItem) ? "character" : "map"); setActiveTab("owned"); closeTopLayer(); } else { openPurchaseFromPreview(previewItem.id); } }} style={{ minHeight: 46, borderRadius: 15, border: ownedById.has(previewItem.id) ? "1px solid var(--border)" : "none", background: ownedById.has(previewItem.id) ? "var(--bg3)" : "var(--heart-shop-action)", color: ownedById.has(previewItem.id) ? "var(--sage-dark)" : "var(--heart-shop-on-action)", fontSize: 12.5, fontWeight: 950, cursor: "pointer" }}>
                {ownedById.has(previewItem.id) ? text.ownedButton : text.purchaseButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div role="presentation" onClick={() => { if (!purchasing) closeTopLayer(); }} style={{ position: "fixed", inset: 0, zIndex: 540, display: "flex", alignItems: "center", justifyContent: "center", padding: 22, background: "rgba(28,29,30,.58)", backdropFilter: "blur(5px)" }}>
          <div role="dialog" aria-modal="true" aria-label={isHeartShopMapCatalogItem(selectedItem) ? text.items[selectedItem.id].purchaseTitle : text.characterPurchaseTitle} onClick={event => event.stopPropagation()} style={{ width: "100%", maxWidth: 360, maxHeight: "calc(100dvh - 44px)", overflowY: "auto", borderRadius: 28, background: "var(--bg2)", border: "1px solid rgba(232,197,71,.3)", boxShadow: "0 24px 70px rgba(0,0,0,.3)", padding: "22px 18px 18px", textAlign: "center" }}>
            <div style={{ minHeight: isHeartShopCharacterCatalogItem(selectedItem) ? 210 : 170, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>{renderPurchaseDialogVisual(selectedItem)}</div>
            <h3 style={{ margin: "0 0 12px", color: "var(--text)", fontSize: 20, lineHeight: 1.45, fontWeight: 950 }}>{isHeartShopMapCatalogItem(selectedItem) ? text.items[selectedItem.id].purchaseTitle : text.characterPurchaseTitle}</h3>
            <p style={{ margin: "0 auto", maxWidth: 310, color: "var(--text2)", fontSize: 13, lineHeight: 1.65, fontWeight: 650 }}>{isHeartShopMapCatalogItem(selectedItem) ? text.items[selectedItem.id].purchaseBody : formatHeartShopText(text.characterPurchaseBody, { price: selectedItem.price })}</p>
            {purchaseError && <p style={{ margin: "13px 0 0", color: "#c85b55", fontSize: 12, lineHeight: 1.5, fontWeight: 850 }}>{purchaseError}</p>}
            <div style={{ display: "grid", gridTemplateColumns: ".85fr 1.15fr", gap: 9, marginTop: 20 }}>
              <button type="button" onClick={closeTopLayer} disabled={purchasing} style={{ minHeight: 46, borderRadius: 15, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text2)", fontSize: 12.5, fontWeight: 900, cursor: purchasing ? "default" : "pointer" }}>{text.cancelButton}</button>
              <button type="button" onClick={() => void confirmPurchase()} disabled={purchasing} style={{ minHeight: 46, borderRadius: 15, border: "none", background: "var(--heart-shop-action)", color: "var(--heart-shop-on-action)", fontSize: 12.5, fontWeight: 950, cursor: purchasing ? "default" : "pointer", opacity: purchasing ? .7 : 1 }}>
                {purchasing ? text.purchasingLabel : formatHeartShopText(text.purchaseAction, { price: selectedItem.price })}
              </button>
            </div>
          </div>
        </div>
      )}

      {completedItem && (
        <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 545, display: "flex", alignItems: "center", justifyContent: "center", padding: 22, background: "rgba(28,29,30,.58)", backdropFilter: "blur(5px)" }}>
          <div role="dialog" aria-modal="true" aria-label={isHeartShopMapCatalogItem(completedItem) ? text.items[completedItem.id].completeTitle : text.characterCompleteTitle} style={{ width: "100%", maxWidth: 360, maxHeight: "calc(100dvh - 44px)", overflowY: "auto", borderRadius: 28, background: "var(--bg2)", border: "1px solid rgba(232,197,71,.34)", boxShadow: "0 24px 70px rgba(0,0,0,.3)", padding: "22px 18px 18px", textAlign: "center" }}>
            <div style={{ width: 58, height: 58, borderRadius: "50%", margin: "0 auto 6px", background: "rgba(122,157,122,.14)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sage-dark)" }}><CheckCircle2 size={31} /></div>
            <div style={{ minHeight: isHeartShopCharacterCatalogItem(completedItem) ? 248 : 165, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>{renderDialogVisual(completedItem)}</div>
            <h3 style={{ margin: "0 0 12px", color: "var(--text)", fontSize: 20, lineHeight: 1.45, fontWeight: 950 }}>{isHeartShopMapCatalogItem(completedItem) ? text.items[completedItem.id].completeTitle : text.characterCompleteTitle}</h3>
            <p style={{ margin: "0 auto", maxWidth: 310, color: "var(--text2)", fontSize: 13, lineHeight: 1.65, fontWeight: 650 }}>{isHeartShopMapCatalogItem(completedItem) ? text.items[completedItem.id].completeBody : text.characterCompleteBody}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 20 }}>
              <button type="button" onClick={closeTopLayer} style={{ minHeight: 46, borderRadius: 15, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text2)", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>{text.continueShoppingButton}</button>
              <button type="button" onClick={() => { setActiveOwnedSection(isHeartShopCharacterCatalogItem(completedItem) ? "character" : "map"); setActiveTab("owned"); closeTopLayer(); }} style={{ minHeight: 46, borderRadius: 15, border: "none", background: "var(--heart-shop-action)", color: "var(--heart-shop-on-action)", fontSize: 12, fontWeight: 950, cursor: "pointer" }}>{text.viewOwnedButton}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
