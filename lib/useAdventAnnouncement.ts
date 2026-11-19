"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { storageGet, storageRemove, storageSet } from "@/lib/clientStorage";
import { createClient } from "@/lib/supabase";
import { withQtDraftTimeout } from "@/lib/qtDraftSync";
import { getUserCampaignLocalStorageKey, loadUserCampaignSeen, markUserCampaignSeen } from "@/lib/userCampaignImpressions";

const CAMPAIGN_KEY = "advent_2026_announcement";
const localReceipts = new Map<string, boolean>();
const pendingWrites = new Map<string, Promise<void>>();

function keys(userId: string) {
  const seen = getUserCampaignLocalStorageKey(CAMPAIGN_KEY, userId);
  return { seen, pending: `${seen}_pending` };
}

function hasReceipt(userId: string) {
  return localReceipts.has(userId) || !!storageGet(keys(userId).seen);
}

async function retryAcknowledgement(userId: string) {
  const key = keys(userId);
  if (!localReceipts.get(userId) && !storageGet(key.pending)) return;
  const existing = pendingWrites.get(userId);
  if (existing) return existing;
  const request = (async () => {
    try {
      await withQtDraftTimeout(markUserCampaignSeen(createClient(), userId, CAMPAIGN_KEY), 6_000, "Advent announcement confirmation");
      localReceipts.set(userId, false);
      storageRemove(key.pending);
    } catch { /* Keep the local receipt and retry when Home resumes or reconnects. */ }
  })();
  pendingWrites.set(userId, request);
  try { await request; }
  finally { if (pendingWrites.get(userId) === request) pendingWrites.delete(userId); }
}

export function useAdventAnnouncement(userId: string | null, localDate: string) {
  const eligibleUserId = userId && localDate >= "2026-11-26" && localDate < "2026-12-01" ? userId : null;
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  useEffect(() => {
    setPendingUserId(null);
    if (!eligibleUserId) return;
    const ownerId = eligibleUserId;
    const key = keys(ownerId);
    let cancelled = false;
    let generation = 0;
    let listener: { remove(): Promise<void> } | null = null;

    async function refresh() {
      if (cancelled || document.visibilityState === "hidden") return;
      const ticket = ++generation;
      if (hasReceipt(ownerId)) {
        setPendingUserId(null);
        void retryAcknowledgement(ownerId);
        return;
      }
      let seen: boolean | null = null;
      try {
        seen = await withQtDraftTimeout(loadUserCampaignSeen(createClient(), ownerId, CAMPAIGN_KEY), 6_000, "Advent announcement state");
      } catch { /* This optional notice retries without blocking Home. */ }
      if (cancelled || ticket !== generation) return;
      if (hasReceipt(ownerId)) {
        setPendingUserId(null);
        return;
      }
      if (seen === true) {
        localReceipts.set(ownerId, false);
        storageSet(key.seen, "true");
        storageRemove(key.pending);
      }
      setPendingUserId(seen === false ? ownerId : null);
    }

    function onStorage(event: StorageEvent) {
      if (event.key === key.seen || event.key === null) void refresh();
    }
    void refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", refresh);
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void refresh();
      }).then(handle => {
        if (cancelled) void handle.remove();
        else listener = handle;
      }).catch(() => {});
    }
    return () => {
      cancelled = true;
      generation += 1;
      window.removeEventListener("online", refresh);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", refresh);
      if (listener) void listener.remove();
    };
  }, [eligibleUserId]);

  const pending = eligibleUserId !== null && pendingUserId === eligibleUserId;
  function dismiss() {
    if (!pending || !eligibleUserId) return;
    const key = keys(eligibleUserId);
    localReceipts.set(eligibleUserId, true);
    storageSet(key.seen, "true");
    storageSet(key.pending, "true");
    setPendingUserId(null);
    void retryAcknowledgement(eligibleUserId);
  }

  return { pending, dismiss };
}
