"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";
import {
  ACTIVITY_BADGE_PRESENTATIONS_EVENT, ACTIVITY_BADGE_PRESENTATIONS_STORAGE_PREFIX,
  acknowledgeActivityBadges, getActivityBadgeKeyFromImage, getActivityBadgePopup,
  readLocalPendingActivityBadges, recordActivityBadgeAwards,
  type ActivityBadgeKey, type ActivityBadgePopup,
} from "@/lib/activityBadgePresentations";

type QueuedPopup = { ownerId: string; popup: ActivityBadgePopup; key: ActivityBadgeKey | null };
type Options = { supabase?: SupabaseClient; userId: string | null | undefined; lang: Lang; enabled?: boolean };

/** Origin-page queue only. Home owns restoring pending awards after navigation. */
export function useActivityBadgePopupQueue({ supabase, userId, lang, enabled = true }: Options) {
  const client = useMemo(() => supabase ?? createClient(), [supabase]);
  const [queue, setQueue] = useState<QueuedPopup[]>([]);
  const queueRef = useRef<QueuedPopup[]>([]);
  const ownerRef = useRef(userId);
  // undefined means no auth event yet; null means an observed signed-out session.
  const authOwnerRef = useRef<string | null | undefined>(undefined);
  const langRef = useRef(lang);
  const mountedRef = useRef(true);
  ownerRef.current = userId;
  langRef.current = lang;

  const replaceQueue = useCallback((next: QueuedPopup[]) => {
    queueRef.current = next;
    if (mountedRef.current) setQueue(next);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    authOwnerRef.current = undefined;
    if (!client.auth?.onAuthStateChange) return;
    let active = true;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const authOwner = session?.user?.id ?? null;
      authOwnerRef.current = authOwner;
      // An auth event revokes stale page props immediately, before any late RPC can enqueue.
      replaceQueue(queueRef.current.filter(item => item.ownerId === authOwner));
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [client, replaceQueue]);

  useEffect(() => {
    replaceQueue(queueRef.current.filter(item => item.ownerId === userId));
    const pruneAcknowledged = () => {
      if (!userId || ownerRef.current !== userId) return;
      const pending = new Set(readLocalPendingActivityBadges(userId));
      const next = queueRef.current.filter(item => item.ownerId === userId && (!item.key || pending.has(item.key)));
      if (next.length !== queueRef.current.length) replaceQueue(next);
    };
    const onChange = (event: Event) => {
      if ((event as CustomEvent<{ userId?: string }>).detail?.userId === userId) pruneAcknowledged();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === `${ACTIVITY_BADGE_PRESENTATIONS_STORAGE_PREFIX}${userId}`) pruneAcknowledged();
    };
    window.addEventListener(ACTIVITY_BADGE_PRESENTATIONS_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ACTIVITY_BADGE_PRESENTATIONS_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId, replaceQueue]);

  const enqueueAwardedBadges = useCallback((keys: readonly unknown[], awardUserId: string) => {
    // Persist before checking mount/active account. A late RPC still belongs to its original owner.
    const incoming = recordActivityBadgeAwards(client, awardUserId, keys);
    if (!mountedRef.current || !awardUserId || ownerRef.current !== awardUserId
      || authOwnerRef.current !== undefined && authOwnerRef.current !== awardUserId) return;
    const current = queueRef.current.filter(item => item.ownerId === awardUserId);
    const alreadyQueued = new Set(current.map(item => item.key));
    const next = incoming.filter(key => !alreadyQueued.has(key)).map(key => ({
      ownerId: awardUserId, key, popup: getActivityBadgePopup(key, langRef.current),
    }));
    if (next.length) replaceQueue([...current, ...next]);
  }, [client, replaceQueue]);

  const enqueuePopup = useCallback((popup: ActivityBadgePopup, awardUserId: string) => {
    const key = getActivityBadgeKeyFromImage(popup.img);
    const incoming = key ? recordActivityBadgeAwards(client, awardUserId, [key]) : [];
    if (!mountedRef.current || !awardUserId || ownerRef.current !== awardUserId
      || authOwnerRef.current !== undefined && authOwnerRef.current !== awardUserId || key && incoming.length === 0) return;
    const current = queueRef.current.filter(item => item.ownerId === awardUserId);
    if (current.some(item => key ? item.key === key : item.popup.img === popup.img && item.popup.title === popup.title)) return;
    replaceQueue([...current, { ownerId: awardUserId, popup, key }]);
  }, [client, replaceQueue]);

  const visible = enabled && queue[0]?.ownerId === userId
    && (authOwnerRef.current === undefined || authOwnerRef.current === userId) ? queue[0] : null;
  const badgePopup = visible ? visible.key ? getActivityBadgePopup(visible.key, lang) : visible.popup : null;
  const closeBadgePopup = useCallback(() => {
    // A repeated click before the next render cannot acknowledge an unseen next item.
    if (!visible || ownerRef.current !== visible.ownerId || queueRef.current[0] !== visible
      || authOwnerRef.current !== undefined && authOwnerRef.current !== visible.ownerId) return;
    replaceQueue(queueRef.current.slice(1));
    if (visible.key) void acknowledgeActivityBadges(client, visible.ownerId, [visible.key]);
  }, [visible, client, replaceQueue]);

  const resetBadgePopups = useCallback(() => { replaceQueue([]); }, [replaceQueue]);
  return { badgePopup, enqueueAwardedBadges, enqueuePopup, closeBadgePopup, resetBadgePopups };
}
