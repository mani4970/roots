"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase";
import { storageGetJson, storageRemove, storageSetJson } from "@/lib/clientStorage";
import { acknowledgeGift, fetchPendingGifts, getGiftItem, getGiftText, type PendingGift } from "@/lib/heartShopGifts";
import type { Lang } from "@/lib/i18n";
import HeartShopItemArt from "@/components/HeartShopItemArt";
import HeartShopGiftPopup from "@/components/HeartShopGiftPopup";

function readAcknowledgements(key: string): string[] {
  const ids = storageGetJson<unknown>(key, []);
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

async function uploadAcknowledgement(key: string, giftId: string) {
  try {
    if (!await acknowledgeGift(giftId)) return;
    const remaining = readAcknowledgements(key).filter(id => id !== giftId);
    if (remaining.length) storageSetJson(key, remaining);
    else storageRemove(key);
  } catch { /* Home retries the account's pending acknowledgements on resume or reconnect. */ }
}

type Props = { userId: string; lang: Lang; eligible: boolean };

export default function HomeHeartShopGift({ userId, lang, eligible }: Props) {
  const router = useRouter();
  const [gifts, setGifts] = useState<PendingGift[]>([]);
  const dismissedThisVisit = useRef(false);
  const [editing, setEditing] = useState(false);
  const handled = useRef(new Set<string>());
  const currentAccount = useRef<string | null>(null);
  const key = `roots_shop_gift_ack_${userId}`;

  useEffect(() => {
    const client = createClient();
    let active = true;
    let generation = 0;
    let nativeActive = true;
    let foreground = document.visibilityState !== "hidden";

    async function refresh() {
      if (!active || !foreground) return;
      const ticket = ++generation;
      const current = () => active && generation === ticket;
      try {
        const { data } = await client.auth.getSession();
        if (!current()) return;
        currentAccount.current = data.session?.user.id ?? null;
        if (currentAccount.current !== userId) { setGifts([]); return; }
        const acknowledged = readAcknowledgements(key);
        acknowledged.forEach(id => handled.current.add(id));
        await Promise.all(acknowledged.map(id => uploadAcknowledgement(key, id)));
        if (!current() || dismissedThisVisit.current) return;
        const unread = await fetchPendingGifts();
        if (current() && !dismissedThisVisit.current && currentAccount.current === userId) {
          setGifts(unread.filter(gift => !handled.current.has(gift.giftId)));
        }
      } catch { /* This optional popup must not block Home when its RPC is unavailable. */ }
    }

    function updateForeground() {
      const next = nativeActive && document.visibilityState !== "hidden";
      if (!active || foreground === next) return;
      foreground = next;
      if (foreground) {
        dismissedThisVisit.current = false;
        void refresh();
      } else {
        ++generation;
        setGifts([]);
      }
    }
    function updateEditing(element: EventTarget | null) {
      setEditing(element instanceof HTMLElement && element.matches("textarea, input:not([type=button]), [contenteditable=true]"));
    }
    function onFocus(event: FocusEvent) {
      updateEditing(event.type === "focusout" ? event.relatedTarget : event.target);
    }
    function onStorage(event: StorageEvent) {
      if (event.key !== key || !event.newValue) return;
      try {
        const ids: unknown = JSON.parse(event.newValue);
        if (!Array.isArray(ids)) return;
        ids.forEach(id => { if (typeof id === "string") handled.current.add(id); });
        setGifts(items => items.filter(gift => !handled.current.has(gift.giftId)));
      } catch { /* Storage notifications can be unavailable or malformed. */ }
    }
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const previous = currentAccount.current;
      currentAccount.current = session?.user.id ?? null;
      if (currentAccount.current !== userId) { ++generation; setGifts([]); }
      else if (previous !== userId) window.setTimeout(() => { void refresh(); }, 0);
    });
    // INITIAL_SESSION schedules the first read when the SDK restores the session.
    window.addEventListener("online", refresh);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", updateForeground);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocus);
    updateEditing(document.activeElement);
    let appListener: { remove(): Promise<void> } | undefined;
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void App.addListener("appStateChange", ({ isActive }) => {
        nativeActive = isActive;
        updateForeground();
      }).then(listener => { if (active) appListener = listener; else void listener.remove(); }).catch(() => {});
    }
    return () => {
      active = false;
      currentAccount.current = null;
      subscription.unsubscribe();
      window.removeEventListener("online", refresh);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", updateForeground);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocus);
      if (appListener) void appListener.remove();
    };
  }, [key, userId]);

  const gift = eligible && !editing && currentAccount.current === userId
    ? gifts.find(candidate => !!getGiftItem(candidate.itemKey, lang)) : undefined;
  const item = gift && getGiftItem(gift.itemKey, lang);
  if (!gift || !item) return null;
  const copy = getGiftText(lang);
  function handleGift(receipt: PendingGift, open: boolean) {
    if (dismissedThisVisit.current || currentAccount.current !== userId || handled.current.has(receipt.giftId)) return;
    dismissedThisVisit.current = true;
    handled.current.add(receipt.giftId);
    storageSetJson(key, [...new Set([...readAcknowledgements(key), receipt.giftId])]);
    setGifts([]);
    void uploadAcknowledgement(key, receipt.giftId);
    if (open) {
      router.push(`/profile?openHeartShop=1&giftItem=${encodeURIComponent(receipt.itemKey)}`);
    }
  }

  return <HeartShopGiftPopup key={gift.giftId} received title={copy.receivedFrom(gift.senderName?.trim() || copy.companion)}
    itemName={item.name} visual={<HeartShopItemArt item={item.catalogItem} alt="" maxWidth={106} />}
    primaryLabel={copy.viewGift} onPrimary={() => handleGift(gift, true)}
    secondaryLabel={copy.later} onSecondary={() => handleGift(gift, false)} />;
}
