"use client";
import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import PrayerCardDeck, { type PrayerCardEntry } from "@/components/PrayerCardDeck";
import { getPrayerCardText } from "@/lib/prayerCardText";
import { removeIntercessionFromList } from "@/lib/prayerIntercession";
import styles from "./PrayerExperience.module.css";
import Celebration from "@/components/Celebration";
import ConfettiBurst from "@/components/ConfettiBurst";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t, type TKey } from "@/lib/i18n";
import { getDateLocale, getLocalDateString } from "@/lib/date";
import { Plus, CheckCircle, Loader2, Send, Pencil, X, Check, MoreHorizontal, Trash2 } from "lucide-react";
import SharePromptModal, { type ShareTargetPartner } from "@/components/SharePromptModal";
import { checkAndAwardAnsweredPrayerBadge, getRewardBadgePopup } from "@/lib/rewardBadges";
import { createAnsweredPrayerNotificationsBestEffort, createPrayerShareNotificationsBestEffort } from "@/lib/notifications/create";
import { loadProfileCards, mapProfileCards } from "@/lib/profileCards";
import { getSharePromptBulkSelectionLabels, loadSharePromptOptions } from "@/lib/sharePromptOptions";
import {
  sortAnsweredPrayerRows,
  sortPrayerRequestRows,
} from "@/lib/communityContentOrder";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";

type PrayerCategory = "mine" | "intercession";
type PrayerStatus = "ongoing" | "answered";
type PrayerView = { status: PrayerStatus; category: PrayerCategory };

function isPrayerCategory(value: unknown): value is PrayerCategory {
  return value === "mine" || value === "intercession";
}

function prayerViewFromHistory(state: any): PrayerView | null {
  const view = state?.rootsPrayerView;
  if ((view?.status === "ongoing" || view?.status === "answered") && isPrayerCategory(view?.category)) {
    return { status: view.status, category: view.category };
  }
  // Preserve browser entries created before the two-level tabs were introduced.
  const legacy = state?.rootsPrayerTab;
  if (legacy === "answered") return { status: "answered", category: "mine" };
  if (isPrayerCategory(legacy)) return { status: "ongoing", category: legacy };
  return null;
}

export type PrayerExperienceProps = {
  variant?: "page" | "popup";
  onClose?: () => void;
  initialAnswerId?: string | null;
  onDataChanged?: () => void;
  nestedBackRef?: MutableRefObject<(() => boolean) | null>;
};

export default function PrayerExperience({ variant = "page", onClose, initialAnswerId, onDataChanged, nestedBackRef }: PrayerExperienceProps) {
  const isPopup = variant === "popup";
  const rootRef = useRef<HTMLDivElement>(null);
  const handledAnswerId = useRef<string | null>(null);
  const handledLink = useRef<string | null>(null);
  const [activeCardIds, setActiveCardIds] = useState<Partial<Record<PrayerCategory, string>>>({});
  const cardIndexes = useRef<Record<PrayerCategory, number>>({ mine: 0, intercession: 0 });
  const selectionTouched = useRef(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [viewportStyle, setViewportStyle] = useState<CSSProperties>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = useLang();
  const cardText = getPrayerCardText(lang);
  const bulkSelectionLabels = getSharePromptBulkSelectionLabels(lang);
  const [badgePopup, setBadgePopup] = useState<{img:string;title:string;msg:string}|null>(null);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [intercessionPrayers, setIntercessionPrayers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newPrayer, setNewPrayer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [view, setView] = useState<PrayerView>({ status: "ongoing", category: "mine" });
  const status = isPopup ? "ongoing" : view.status;
  const category = view.category;
  const [notice, setNotice] = useState<string | null>(null);
  const [testimonyPrayerId, setTestimonyPrayerId] = useState<string | null>(null);
  const [testimonyText, setTestimonyText] = useState("");
  const [savingTestimony, setSavingTestimony] = useState(false);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [myPartners, setMyPartners] = useState<ShareTargetPartner[]>([]);
  const [partnerSharedPrayerIds, setPartnerSharedPrayerIds] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePrayerId, setSharePrayerId] = useState<string | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [showCreateSharePrompt, setShowCreateSharePrompt] = useState(false);
  const [createShareTargets, setCreateShareTargets] = useState<string[]>([]);
  const [sharingIntercession, setSharingIntercession] = useState(false);
  const [actionMenuPrayerId, setActionMenuPrayerId] = useState<string | null>(null);
  const [pendingDeletePrayerId, setPendingDeletePrayerId] = useState<string | null>(null);
  const [deletingPrayer, setDeletingPrayer] = useState(false);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [removingIntercession, setRemovingIntercession] = useState(false);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const removalInFlight = useRef(false);

  const c = (key: TKey, vars?: Record<string, string | number>) => t(key, lang, vars);

  function consumeNestedLayer() {
    if (pendingRemovalId || removalInFlight.current) {
      if (!removalInFlight.current) {
        setPendingRemovalId(null);
        setRemovalError(null);
      }
      return true;
    }
    if (pendingDeletePrayerId) {
      if (!deletingPrayer) setPendingDeletePrayerId(null);
      return true;
    }
    if (badgePopup) {
      setBadgePopup(null);
      return true;
    }
    // Saving a prayer must finish before dismissing its form or the popup.
    if (saving || savingTestimony || savingEdit || sharingIntercession || deletingPrayer) return true;
    if (showCreateSharePrompt) {
      if (!saving) closeCreateSharePrompt();
      return true;
    }
    if (showShareModal) {
      if (!sharingIntercession) closeIntercessionShareModal();
      return true;
    }
    if (testimonyPrayerId) {
      if (!savingTestimony) {
        setTestimonyPrayerId(null);
        setTestimonyText("");
      }
      return true;
    }
    if (showForm) {
      if (!saving) setShowForm(false);
      return true;
    }
    if (celebration) {
      setCelebration(false);
      return true;
    }
    if (actionMenuPrayerId) {
      setActionMenuPrayerId(null);
      return true;
    }
    if (editId) {
      setEditId(null);
      setEditText("");
      return true;
    }
    return false;
  }

  if (nestedBackRef) nestedBackRef.current = consumeNestedLayer;
  useEffect(() => () => { if (nestedBackRef) nestedBackRef.current = null; }, [nestedBackRef]);

  function closeTopLayer() {
    if (consumeNestedLayer()) return true;
    if (isPopup) {
      onClose?.();
      return true;
    }
    return false;
  }

  useAndroidBackHandler(closeTopLayer);

  const closeRef = useRef(closeTopLayer);
  closeRef.current = closeTopLayer;
  const modalOpen = isPopup || !!testimonyPrayerId || !!editId || showForm || showShareModal || showCreateSharePrompt || !!pendingDeletePrayerId || !!pendingRemovalId || !!badgePopup || celebration;

  useEffect(() => {
    if (!modalOpen) return;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const updateViewport = () => {
      const zoom = Number.parseFloat(getComputedStyle(document.body).zoom) || 1;
      const viewport = window.visualViewport;
      setViewportStyle({
        "--prayer-visible-height": `${(viewport?.height ?? window.innerHeight) / zoom}px`,
        "--prayer-visible-top": `${(viewport?.offsetTop ?? 0) / zoom}px`,
      } as CSSProperties);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (closeRef.current()) { event.preventDefault(); event.stopPropagation(); }
        return;
      }
      if (event.key !== "Tab" || !rootRef.current) return;
      const dialogs = Array.from(rootRef.current.querySelectorAll<HTMLElement>('[data-prayer-dialog], div[style*="position: fixed"]'))
        .filter(element => element.getClientRects().length > 0 && element.querySelector("button, textarea"))
        .sort((a, b) => (Number.parseInt(getComputedStyle(b).zIndex, 10) || 0) - (Number.parseInt(getComputedStyle(a).zIndex, 10) || 0));
      const dialog = dialogs[0] ?? rootRef.current;
      const elements = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]')).filter(element => element.getClientRects().length > 0 && !element.closest('[aria-hidden="true"]'));
      if (!elements.length) { event.preventDefault(); dialog.focus(); return; }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    if (isPopup) rootRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      window.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      document.removeEventListener("keydown", keydown);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [modalOpen, isPopup]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function setActiveCardFor(nextCategory: PrayerCategory, id: string) {
    setActiveCardIds(previous => previous[nextCategory] === id ? previous : { ...previous, [nextCategory]: id });
  }

  function selectPrayerView(nextView: PrayerView) {
    selectionTouched.current = true;
    const normalized = isPopup ? { ...nextView, status: "ongoing" as const } : nextView;
    setActionMenuPrayerId(null);
    if (normalized.status === status && normalized.category === category) return;
    if (!isPopup) {
      try {
        const currentState = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
        window.history.pushState(
          { ...currentState, rootsPrayerView: normalized, rootsPrayerTab: normalized.status === "answered" ? "answered" : normalized.category, rootsPrayerCardIds: activeCardIds },
          "",
          window.location.href,
        );
      } catch {
        // The selection still changes if browser history is unavailable.
      }
    }
    setView(normalized);
  }

  useEffect(() => {
    if (isPopup) return;
    const restored = prayerViewFromHistory(window.history.state);
    if (restored) {
      selectionTouched.current = true;
      setView(restored);
      handledLink.current = searchParams.toString();
      const cards = window.history.state?.rootsPrayerCardIds;
      if (cards && typeof cards === "object") setActiveCardIds({
        mine: typeof cards.mine === "string" ? cards.mine : undefined,
        intercession: typeof cards.intercession === "string" ? cards.intercession : undefined,
      });
    }
    setHistoryReady(true);
  }, [isPopup]);

  useEffect(() => {
    if (isPopup || !historyReady) return;
    try {
      const currentState = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
      window.history.replaceState(
        { ...currentState, rootsPrayerView: view, rootsPrayerTab: status === "answered" ? "answered" : category, rootsPrayerCardIds: activeCardIds },
        "",
        window.location.href,
      );
    } catch {
      // Keep the prayer page usable without mutable history state.
    }
  }, [view, activeCardIds, status, category, isPopup, historyReady]);

  useEffect(() => {
    if (isPopup) return;
    function handlePrayerPopState(event: PopStateEvent) {
      const restored = prayerViewFromHistory(event.state);
      if (!restored) return;
      selectionTouched.current = true;
      setView(restored);
      setActionMenuPrayerId(null);
      const cards = event.state?.rootsPrayerCardIds;
      if (cards && typeof cards === "object") setActiveCardIds(previous => ({
        mine: typeof cards.mine === "string" ? cards.mine : previous.mine,
        intercession: typeof cards.intercession === "string" ? cards.intercession : previous.intercession,
      }));
    }
    window.addEventListener("popstate", handlePrayerPopState);
    return () => window.removeEventListener("popstate", handlePrayerPopState);
  }, [isPopup]);

  useEffect(() => { loadPrayers(); }, []);

  useEffect(() => {
    if (!isPopup && searchParams.get("compose") === "1") {
      selectionTouched.current = true;
      setView({ status: "ongoing", category: "mine" });
      setShowForm(true);
      router.replace("/prayer");
    }
  }, [searchParams, router, isPopup]);


  function visibilityTargets(visibility?: string | null) {
    return (visibility ?? "private")
      .split(",")
      .map(target => target.trim())
      .filter(target => target && target !== "private");
  }

  function isSharedVisibility(visibility?: string | null) {
    return visibilityTargets(visibility).length > 0;
  }

  function splitShareTargets(targets: string[]) {
    const partnerRecipientIds = Array.from(new Set(
      targets
        .filter(target => target.startsWith("partner_"))
        .map(target => target.replace(/^partner_/, ""))
        .filter(Boolean)
    ));
    const visibilityTargets = targets.filter(target => target === "all" || target.startsWith("group_"));
    const visibility = visibilityTargets.includes("all")
      ? "all"
      : visibilityTargets.length > 0
        ? visibilityTargets.join(",")
        : "private";
    return { visibility, partnerRecipientIds };
  }

  function isSharedPrayer(prayer: any) {
    return isSharedVisibility(prayer.visibility) || partnerSharedPrayerIds.has(String(prayer.id));
  }

  function toggleTarget(target: string) {
    setSelectedTargets(prev =>
      prev.includes(target) ? prev.filter(item => item !== target) : [...prev, target]
    );
  }

  function toggleCreateShareTarget(target: string) {
    setCreateShareTargets(prev =>
      prev.includes(target) ? prev.filter(item => item !== target) : [...prev, target]
    );
  }

  function openCreateSharePrompt() {
    if (!newPrayer.trim() || saving) return;
    setCreateShareTargets([]);
    setShowCreateSharePrompt(true);
  }

  function closeCreateSharePrompt() {
    if (saving) return;
    setShowCreateSharePrompt(false);
    setCreateShareTargets([]);
  }

  function closeIntercessionShareModal() {
    if (sharingIntercession) return;
    setShowShareModal(false);
    setSharePrayerId(null);
    setSelectedTargets([]);
  }

  function normalizedGroups() {
    return myGroups.map((group: any) => ({
      id: String(group.id),
      name: String(group.name ?? ""),
      is_public: !!group.is_public,
      isFavorite: !!group.isFavorite,
    }));
  }

  async function replacePrayerRecipients(supabase: ReturnType<typeof createClient>, prayerItemId: string, ownerId: string, recipientIds: string[]) {
    const { error: deleteError } = await supabase
      .from("prayer_item_recipients")
      .delete()
      .eq("prayer_item_id", prayerItemId)
      .eq("owner_id", ownerId);
    if (deleteError) throw deleteError;

    if (recipientIds.length === 0) return;

    const { error: insertError } = await supabase
      .from("prayer_item_recipients")
      .insert(recipientIds.map(recipientId => ({
        prayer_item_id: prayerItemId,
        owner_id: ownerId,
        recipient_id: recipientId,
      })));
    if (insertError) throw insertError;
  }

  async function loadPrayerRecipientTargets(prayerId: string) {
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from("prayer_item_recipients")
        .select("recipient_id")
        .eq("prayer_item_id", prayerId);
      const partnerTargets = (data ?? []).map((row: any) => `partner_${row.recipient_id}`).filter(Boolean);
      setSelectedTargets(prev => Array.from(new Set([...prev, ...partnerTargets])));
    } catch (error) {
      console.warn("기도 동역자 공유 대상 조회 실패:", error);
    }
  }

  function openIntercessionShare(prayer: any) {
    setSharePrayerId(prayer.id);
    setSelectedTargets(visibilityTargets(prayer.visibility));
    setShowShareModal(true);
    void loadPrayerRecipientTargets(prayer.id);
  }

  async function fetchProfiles(supabase: any, rows: any[]) {
    const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));
    if (userIds.length === 0) return {};

    return mapProfileCards(await loadProfileCards(supabase, userIds));
  }

  async function loadPrayers() {
    setLoading(true);
    setLoadError(false);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      try {
        const shareOptions = await loadSharePromptOptions(
          c("profile_default_name"),
          { force: true },
        );
        setMyGroups(shareOptions.groups);
        setMyPartners(shareOptions.partners);
      } catch (shareOptionsError) {
        console.error("prayer share options load failed", shareOptionsError);
        setMyPartners([]);
        setMyGroups([]);
      }

      const { data: partnerRecipientRows, error: recipientLoadError } = await supabase
        .from("prayer_item_recipients")
        .select("prayer_item_id")
        .eq("owner_id", user.id);
      if (recipientLoadError) throw recipientLoadError;
      setPartnerSharedPrayerIds(new Set((partnerRecipientRows ?? []).map((row: any) => String(row.prayer_item_id))));

      const { data, error: ownLoadError } = await supabase
        .from("prayer_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (ownLoadError) throw ownLoadError;
      if (data) {
        setPrayers(data);
        // Display-name enrichment must not block otherwise available prayers.
        void fetchProfiles(supabase, data).then(profileMap => {
          setPrayers(current => current.map(row => row.user_id === user.id
            ? { ...row, profiles: profileMap[row.user_id] ?? row.profiles ?? null }
            : row));
        }).catch(error => console.warn("prayer author name load failed", error));
      }

      const { data: logs, error: logLoadError } = await supabase
        .from("user_prayer_logs")
        .select("prayer_id")
        .eq("user_id", user.id);

      if (logLoadError) throw logLoadError;
      const prayerIds = Array.from(new Set((logs ?? []).map((log: any) => log.prayer_id).filter(Boolean)));
      if (prayerIds.length === 0) {
        setIntercessionPrayers([]);
      } else {
        const { data: intercessionData, error: intercessionLoadError } = await supabase
          .from("prayer_items")
          .select("*")
          .in("id", prayerIds)
          .order("is_answered", { ascending: true })
          .order("created_at", { ascending: false });

        if (intercessionLoadError) throw intercessionLoadError;
        if (intercessionData) {
          const profileMap = await fetchProfiles(supabase, intercessionData);
          setIntercessionPrayers(intercessionData.map((row: any) => ({
            ...row,
            profiles: profileMap[row.user_id] ?? null,
          })));
        }
      }
    } catch (error) {
      console.error("prayer load failed", error);
      setLoadError(true);
      setNotice(c("network_error_retry"));
    } finally {
      setLoading(false);
    }
  }

  async function submit(visibility = "private", partnerRecipientIds: string[] = []) {
    if (!newPrayer.trim() || !userId || saving) return;
    setSaving(true);
    const supabase = createClient();
    try {
      const { data: insertedPrayer, error: insertError } = await supabase.from("prayer_items").insert({
        user_id: userId,
        content: newPrayer.trim(),
        is_anonymous: false,
        visibility,
      }).select("id").single();
      if (insertError) throw insertError;

      try {
        if (insertedPrayer?.id) {
          await replacePrayerRecipients(supabase, insertedPrayer.id, userId, partnerRecipientIds);
        }
      } catch (recipientError) {
        if (insertedPrayer?.id) {
          await supabase.from("prayer_items").delete().eq("id", insertedPrayer.id);
        }
        throw recipientError;
      }

      const { error: prayerCompletionError } = await supabase.from("daily_prayer_completions").upsert({
        user_id: userId,
        date: getLocalDateString(),
        source: "written",
      }, { onConflict: "user_id,date" });
      if (prayerCompletionError) {
        if (insertedPrayer?.id) {
          await supabase.from("prayer_items").delete().eq("id", insertedPrayer.id);
        }
        throw prayerCompletionError;
      }

      if (insertedPrayer?.id) {
        await createPrayerShareNotificationsBestEffort({
          prayerItemId: String(insertedPrayer.id),
          visibility,
          partnerRecipientIds,
        });
      }

      setNewPrayer("");
      setShowForm(false);
      setShowCreateSharePrompt(false);
      setCreateShareTargets([]);
      setCelebration(true);
      await loadPrayers();
      onDataChanged?.();
    } catch (error) {
      console.error("prayer submit failed", error);
      setNotice(c("prayer_error_save"));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editText.trim() || !editId || savingEdit) return;
    setSavingEdit(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.from("prayer_items").update({ content: editText.trim() }).eq("id", editId);
      if (error) {
        setNotice(c("prayer_error_edit"));
        return;
      }
      setEditId(null); setEditText("");
      await loadPrayers();
      onDataChanged?.();
    } catch (error) {
      console.error("prayer edit failed", error);
      setNotice(c("prayer_error_edit"));
    } finally {
      setSavingEdit(false);
    }
  }
  function startEditPrayer(prayer: any) {
    setActionMenuPrayerId(null);
    setEditId(prayer.id);
    setEditText(prayer.content);
  }

  function openDeletePrayer(prayerId: string) {
    setActionMenuPrayerId(null);
    setPendingDeletePrayerId(prayerId);
  }

  async function deletePrayer() {
    if (!pendingDeletePrayerId || deletingPrayer) return;
    setDeletingPrayer(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      await supabase
        .from("user_prayer_logs")
        .delete()
        .eq("prayer_id", pendingDeletePrayerId)
        .eq("user_id", user.id);

      const { error } = await supabase
        .from("prayer_items")
        .delete()
        .eq("id", pendingDeletePrayerId)
        .eq("user_id", user.id);

      if (error) {
        setNotice(c("prayer_error_delete"));
        return;
      }

      if (editId === pendingDeletePrayerId) {
        setEditId(null);
        setEditText("");
      }
      if (testimonyPrayerId === pendingDeletePrayerId) {
        setTestimonyPrayerId(null);
        setTestimonyText("");
      }
      setPrayers(prev => prev.filter(prayer => prayer.id !== pendingDeletePrayerId));
      setPendingDeletePrayerId(null);
      setNotice(c("prayer_delete_success"));
      await loadPrayers();
      onDataChanged?.();
    } catch (error) {
      console.error("prayer delete failed", error);
      setNotice(c("prayer_error_delete"));
    } finally {
      setDeletingPrayer(false);
    }
  }


  async function removeIntercession() {
    if (!pendingRemovalId || !userId || removalInFlight.current) return;
    const prayerId = pendingRemovalId;
    removalInFlight.current = true;
    setRemovingIntercession(true);
    setRemovalError(null);
    try {
      const result = await removeIntercessionFromList(createClient(), prayerId, userId);
      setIntercessionPrayers(previous => previous.filter(prayer => String(prayer.id) !== prayerId));
      await loadPrayers();
      onDataChanged?.();
      setPendingRemovalId(null);
      setNotice(!result.countSynced ? cardText.removeIntercessionCountSyncError : result.removed ? cardText.removeIntercessionSuccess : cardText.removeIntercessionAlreadyAbsent);
    } catch (error) {
      console.error("intercession removal failed", error);
      setRemovalError(cardText.removeIntercessionError);
    } finally {
      removalInFlight.current = false;
      setRemovingIntercession(false);
    }
  }


  async function saveIntercessionTargets(privateOnly = false) {
    if (!sharePrayerId || (!privateOnly && selectedTargets.length === 0) || sharingIntercession) return;
    setSharingIntercession(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { visibility: newVisibility, partnerRecipientIds } = privateOnly
        ? { visibility: "private", partnerRecipientIds: [] as string[] }
        : splitShareTargets(selectedTargets);
      const sharedAt = new Date().toISOString();
      let { error: visibilityError } = await supabase
        .from("prayer_items")
        .update({ visibility: newVisibility, shared_at: sharedAt })
        .eq("id", sharePrayerId)
        .eq("user_id", user.id);
      if (visibilityError && /shared_at/i.test(visibilityError.message ?? "")) {
        console.warn("prayer_items.shared_at column is not available yet. Retrying without shared_at:", visibilityError.message);
        const retry = await supabase
          .from("prayer_items")
          .update({ visibility: newVisibility })
          .eq("id", sharePrayerId)
          .eq("user_id", user.id);
        visibilityError = retry.error;
      }
      if (visibilityError) {
        setNotice(c("prayer_error_intercession"));
        return;
      }

      try {
        await replacePrayerRecipients(supabase, sharePrayerId, user.id, partnerRecipientIds);
      } catch (recipientError) {
        console.warn("기도 동역자 공유 저장 실패:", recipientError);
        setNotice(c("prayer_error_intercession"));
        return;
      }

      if (!privateOnly) {
        await createPrayerShareNotificationsBestEffort({
          prayerItemId: sharePrayerId,
          visibility: newVisibility,
          partnerRecipientIds,
        });
      }

      // 중보기도 요청 배지는 서버가 실제 공개/그룹/동역자 공유 기록을
      // 다시 확인한 뒤 현재 사용자에게만 원자적으로 지급합니다.
      const { data: prayerBadgeAward, error: prayerBadgeAwardError } = await supabase.rpc(
        "award_own_prayer_share_badges",
        {
          p_user_id: user.id,
          p_include_partner_recipients: true,
        },
      );
      if (prayerBadgeAwardError) {
        console.warn("기도 공유 배지를 저장하지 못했어요:", prayerBadgeAwardError.message);
      } else {
        const awardedBadges = new Set(
          Array.isArray(prayerBadgeAward?.awarded_badges)
            ? prayerBadgeAward.awarded_badges.map((key: unknown) => String(key))
            : [],
        );
        if (awardedBadges.has("badge_prayer_ember")) {
          setBadgePopup({
            img: "/badge_rootswoman_fire.webp",
            title: c("prayer_badge_ember_popup"),
            msg: t("badge_prayer_ember_msg", lang),
          });
        } else if (awardedBadges.has("badge_prayer_warrior")) {
          setBadgePopup({
            img: "/prayer_warrior.webp",
            title: c("prayer_badge_warrior_popup"),
            msg: t("badge_prayer_warrior_msg", lang),
          });
        }
      }

      setShowShareModal(false);
      setSharePrayerId(null);
      setSelectedTargets([]);
      await loadPrayers();
      onDataChanged?.();
    } catch (error) {
      console.error("intercession request failed", error);
      setNotice(c("prayer_error_intercession"));
    } finally {
      setSharingIntercession(false);
    }
  }

  async function saveAnsweredPrayer() {
    if (!testimonyPrayerId || !testimonyText.trim() || savingTestimony) return;
    setSavingTestimony(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentPrayer = prayers.find((prayer: any) => String(prayer.id) === String(testimonyPrayerId));
      if (!user || !currentPrayer || String(currentPrayer.user_id) !== user.id || currentPrayer.is_answered) {
        setNotice(c("prayer_error_answered"));
        return;
      }
      const { data: savedAnswer, error } = await supabase.from("prayer_items").update({
        is_answered: true,
        testimony: testimonyText.trim(),
        answered_at: new Date().toISOString(),
      }).eq("id", testimonyPrayerId).eq("user_id", user.id).or("is_answered.eq.false,is_answered.is.null").select("id").single();
      if (error || !savedAnswer) {
        setNotice(c("prayer_error_answered"));
        return;
      }

      if (user) {
        try {
          const { data: recipientRows } = await supabase
            .from("prayer_item_recipients")
            .select("recipient_id")
            .eq("prayer_item_id", testimonyPrayerId)
            .eq("owner_id", user.id);
          await createAnsweredPrayerNotificationsBestEffort({
            prayerItemId: testimonyPrayerId,
            visibility: currentPrayer?.visibility ?? null,
            partnerRecipientIds: (recipientRows ?? []).map((row: any) => String(row.recipient_id)).filter(Boolean),
          });
        } catch (notificationError) {
          console.warn("기도 응답 알림 생성 실패:", notificationError);
        }
      }
      // 노아 뱃지는 기도 응답 저장이 성공한 뒤에만 지급합니다.
      let existingAnsweredBadgeAwarded = false;
      if (user) {
        const { data: noahAward, error: noahAwardError } = await supabase.rpc("award_own_noah_badge", {
          p_user_id: user.id,
          p_prayer_item_id: testimonyPrayerId,
        });
        if (noahAwardError) {
          console.warn("노아 배지를 저장하지 못했어요:", noahAwardError.message);
        } else if (noahAward?.awarded === true) {
          existingAnsweredBadgeAwarded = true;
          setBadgePopup({ img: "/badge_noah.webp", title: c("prayer_badge_noah_popup"), msg: t("badge_noah_msg", lang) });
        }

        try {
          const awarded = await checkAndAwardAnsweredPrayerBadge(supabase, user.id);
          if (awarded && !existingAnsweredBadgeAwarded) {
            const popup = getRewardBadgePopup(awarded, lang);
            setBadgePopup(popup);
          }
        } catch (badgeError) {
          console.warn("기도 응답 보상 배지 확인 실패:", badgeError);
        }
      }
      setTestimonyPrayerId(null);
      setTestimonyText("");
      await loadPrayers();
      onDataChanged?.();
      setView({ status: isPopup ? "ongoing" : "answered", category: "mine" });
    } catch (error) {
      console.error("answered prayer save failed", error);
      setNotice(c("prayer_error_answered"));
    } finally {
      setSavingTestimony(false);
    }
  }

  function openAnsweredPrayer(id: string) {
    if (!prayers.some(prayer => String(prayer.id) === String(id) && String(prayer.user_id) === userId && !prayer.is_answered)) return;
    setTestimonyPrayerId(id);
    setTestimonyText("");
  }

  const myPrayingList = sortPrayerRequestRows(
    prayers.filter((prayer) => !prayer.is_answered),
  );
  const answeredList = sortAnsweredPrayerRows(
    prayers.filter((prayer) => prayer.is_answered),
  );
  const intercessionPrayingList = sortPrayerRequestRows(
    intercessionPrayers.filter((prayer) => !prayer.is_answered),
  );
  const intercessionAnsweredList = sortAnsweredPrayerRows(
    intercessionPrayers.filter((prayer) => prayer.is_answered),
  );
  const ongoingList = category === "mine" ? myPrayingList : intercessionPrayingList;
  // Keep the underlying IDs for history/actions, but distinguish the two roles
  // in the rail if a legacy intercession also references an owned prayer.
  const activePrayerId = ongoingList.find(prayer => String(prayer.id) === activeCardIds[category])?.id
    ?? ongoingList[Math.min(cardIndexes.current[category], Math.max(0, ongoingList.length - 1))]?.id;
  const activeCardId = activePrayerId ? `${category}:${activePrayerId}` : null;
  const currentList = status === "ongoing"
    ? ongoingList
    : category === "mine" ? answeredList : intercessionAnsweredList;
  const showDeck = status === "ongoing" && currentList.length > 0;
  const emptyIconSrc = status === "answered" ? "/icon-prayer-answered.webp" : category === "mine" ? "/icon-prayer-request.webp" : "/icon-pray.webp";
  const emptyTitle = status === "answered"
    ? category === "intercession" ? cardText.emptyAnsweredIntercessionTitle : c("prayer_empty_answered_title")
    : category === "mine" ? c("prayer_empty_mine_title") : c("prayer_empty_intercession_title");
  const emptySub = status === "answered"
    ? category === "intercession" ? cardText.emptyAnsweredIntercessionSub : c("prayer_empty_answered_sub")
    : category === "mine" ? c("prayer_empty_mine_sub") : c("prayer_empty_intercession_sub");

  useEffect(() => {
    if (loading || loadError) return;
    // A reload or deletion keeps this category and its surviving card (or nearest index).
    for (const nextCategory of ["mine", "intercession"] as const) {
      const rows = nextCategory === "mine" ? myPrayingList : intercessionPrayingList;
      const savedId = activeCardIds[nextCategory];
      const savedIndex = rows.findIndex(prayer => String(prayer.id) === savedId);
      if (savedIndex >= 0) cardIndexes.current[nextCategory] = savedIndex;
      else if (rows.length > 0) {
        const index = Math.min(cardIndexes.current[nextCategory], rows.length - 1);
        cardIndexes.current[nextCategory] = index;
        setActiveCardFor(nextCategory, String(rows[index].id));
      }
    }
  }, [loading, loadError, prayers, intercessionPrayers, activeCardIds]);

  function profileName(prayer: any) {
    if (prayer.is_anonymous) return c("prayer_intercession_anonymous");
    return prayer.profiles?.name || c(prayer.user_id === userId ? "profile_default_name" : "prayer_intercession_anonymous");
  }

  useEffect(() => {
    if (loading || loadError || !initialAnswerId || handledAnswerId.current === initialAnswerId) return;
    handledAnswerId.current = initialAnswerId;
    const ownedPrayer = prayers.find(prayer => String(prayer.id) === initialAnswerId && String(prayer.user_id) === userId && !prayer.is_answered);
    if (!ownedPrayer) {
      setNotice(c("prayer_error_answered"));
      return;
    }
    selectionTouched.current = true;
    setView({ status: "ongoing", category: "mine" });
    setActiveCardFor("mine", initialAnswerId);
    setTestimonyPrayerId(initialAnswerId);
    setTestimonyText("");
  }, [loading, loadError, initialAnswerId, prayers, userId]);

  useEffect(() => {
    if (isPopup || loading || loadError) return;
    const query = searchParams.toString();
    if (handledLink.current === query) return;
    handledLink.current = query;
    const requestedTab = searchParams.get("tab");
    const requestedId = searchParams.get("prayerId");
    if (requestedTab === "answered" || isPrayerCategory(requestedTab)) {
      selectionTouched.current = true;
      const requestedCategory = isPrayerCategory(searchParams.get("category"))
        ? searchParams.get("category") as PrayerCategory
        : requestedTab === "intercession" ? "intercession" : "mine";
      const rows = requestedCategory === "intercession" ? intercessionPrayers : prayers;
      const selected = requestedId ? rows.find(prayer => String(prayer.id) === requestedId) : null;
      const requestedStatus = selected
        ? selected.is_answered ? "answered" : "ongoing"
        : requestedTab === "answered" || searchParams.get("status") === "answered" ? "answered" : "ongoing";
      setView({ status: requestedStatus, category: requestedCategory });
      if (selected && !selected.is_answered) setActiveCardFor(requestedCategory, String(selected.id));
      if (requestedId && !selected) setNotice(c("network_error_retry"));
    }
  }, [isPopup, loading, loadError, searchParams, prayers, intercessionPrayers]);

  const initialDeckSelected = useRef(false);
  useEffect(() => {
    if (loading || loadError || initialDeckSelected.current) return;
    initialDeckSelected.current = true;
    if (!selectionTouched.current && !initialAnswerId && (isPopup || !searchParams.get("tab")) && myPrayingList.length === 0 && intercessionPrayingList.length > 0) {
      setView({ status: "ongoing", category: "intercession" });
      setActiveCardFor("intercession", String(intercessionPrayingList[0].id));
    }
  }, [loading, loadError, initialAnswerId, isPopup, searchParams, myPrayingList, intercessionPrayingList]);

  function handleActiveCard(id: string) {
    const nextCategory = id.startsWith("mine:") ? "mine" : id.startsWith("intercession:") ? "intercession" : null;
    if (!nextCategory) return;
    const prayerId = id.slice(nextCategory.length + 1);
    const rows = nextCategory === "mine" ? myPrayingList : intercessionPrayingList;
    const index = rows.findIndex(prayer => String(prayer.id) === prayerId);
    if (index < 0) return;
    selectionTouched.current = true;
    cardIndexes.current[nextCategory] = index;
    setActiveCardFor(nextCategory, prayerId);
    setView(previous => previous.category === nextCategory ? previous : { ...previous, category: nextCategory });
    setActionMenuPrayerId(null);
  }

  function cardMenu(prayer: any) {
    return (
      <div className={styles.cardMenu}>
        <button type="button" className={styles.iconButton} aria-label={c("prayer_actions")} aria-expanded={actionMenuPrayerId === prayer.id} onClick={() => setActionMenuPrayerId(actionMenuPrayerId === prayer.id ? null : prayer.id)}><MoreHorizontal size={20} /></button>
        {actionMenuPrayerId === prayer.id && <div className={styles.menuPopover}>
          <button type="button" onClick={() => startEditPrayer(prayer)}><Pencil size={15} />{c("prayer_edit")}</button>
          <button type="button" onClick={() => { setActionMenuPrayerId(null); openIntercessionShare(prayer); }}><Send size={15} />{c(isSharedPrayer(prayer) ? "prayer_edit_intercession_share" : "prayer_request_intercession")}</button>
          <button type="button" onClick={() => openDeletePrayer(prayer.id)} className={styles.deleteAction}><Trash2 size={15} />{c("prayer_delete")}</button>
        </div>}
      </div>
    );
  }

  function intercessionMenu(prayer: any) {
    return (
      <div className={styles.cardMenu}>
        <button type="button" className={styles.iconButton} aria-label={c("prayer_actions")} aria-expanded={actionMenuPrayerId === prayer.id} onClick={() => setActionMenuPrayerId(actionMenuPrayerId === prayer.id ? null : prayer.id)}><MoreHorizontal size={20} /></button>
        {actionMenuPrayerId === prayer.id && <div className={styles.menuPopover}>
          <button type="button" className={styles.deleteAction} onClick={() => { setActionMenuPrayerId(null); setRemovalError(null); setPendingRemovalId(String(prayer.id)); }}><Trash2 size={15} />{cardText.removeIntercession}</button>
        </div>}
      </div>
    );
  }

  function cardHeader(prayer: any, kind: PrayerCategory) {
    return <div className={styles.cardMeta}>
      <span className={styles.cardAuthor}>{profileName(prayer)}</span>
      <time className={styles.cardDate} dateTime={prayer.created_at}>{new Date(prayer.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}</time>
      {kind === "mine" ? cardMenu(prayer) : intercessionMenu(prayer)}
    </div>;
  }

  const cardEntries: PrayerCardEntry[] = [
    ...myPrayingList.map(prayer => ({
      id: `mine:${prayer.id}`,
      kind: "mine" as const,
      content: String(prayer.content ?? ""),
      authorName: profileName(prayer),
      header: cardHeader(prayer, "mine"),
      actions: <button type="button" className={styles.answerButton} onClick={() => openAnsweredPrayer(String(prayer.id))}><CheckCircle size={17} />{c("prayer_answered_cta")}</button>,
    })),
    ...intercessionPrayingList.map(prayer => ({
      id: `intercession:${prayer.id}`,
      kind: "intercession" as const,
      content: String(prayer.content ?? ""),
      authorName: profileName(prayer),
      header: cardHeader(prayer, "intercession"),
      actions: <div className={`${styles.answerButton} ${styles.intercedingStatus}`}><CheckCircle size={17} />{cardText.interceding}</div>,
    })),
  ];

  return (
    <div ref={rootRef} className={`roots-prayer-phase2c ${isPopup ? styles.popup : `page ${styles.page}`}`} style={viewportStyle} role={isPopup ? "dialog" : undefined} aria-modal={isPopup ? true : undefined} aria-label={isPopup ? cardText.heading : undefined} tabIndex={isPopup ? -1 : undefined}>
      {badgePopup && (
        <div onClick={() => setBadgePopup(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--prayer-reward-overlay)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
          <ConfettiBurst variant="fixed" zIndex={201} />
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--prayer-modal-surface)", borderRadius: 28, border: "1px solid var(--prayer-gold-border)", width: "100%", maxWidth: 340, padding: "32px 24px 28px", textAlign: "center", boxShadow: "var(--shadow-modal)" }}>
            <div style={{ width: 120, height: 120, margin: "0 auto 16px" }}>
              <img src={badgePopup.img} alt={badgePopup.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--prayer-gold-text)", marginBottom: 10, lineHeight: 1.3 }}>{badgePopup.title}</h2>
            <div style={{ padding: "14px 16px", background: "var(--prayer-gold-surface)", borderRadius: 14, border: "1px solid var(--prayer-gold-border)", marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{badgePopup.msg}</p>
            </div>
            <button onClick={() => setBadgePopup(null)} style={{ width: "100%", padding: "13px", background: "var(--prayer-gold-action)", color: "var(--prayer-on-gold-action)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {t("badge_thanks", lang)}
            </button>
          </div>
        </div>
      )}
      {notice && (
        <div style={{ position: "fixed", top: 84, left: "50%", transform: "translateX(-50%)", zIndex: 210, background: "var(--prayer-toast-surface)", color: "var(--prayer-toast-text)", padding: "12px 16px", borderRadius: 14, border: "1px solid var(--prayer-toast-border)", fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow-toast)", maxWidth: 320, width: "calc(100% - 40px)", textAlign: "center" }}>
          {notice}
        </div>
      )}
      <Celebration
        show={celebration}
        message={c("prayer_saved_message")}
        subMessage={c("prayer_saved_sub")}
        iconSrc="/icon-pray.webp"
        iconAlt={c("nav_prayer")}
        onClose={() => setCelebration(false)}
      />

      {showCreateSharePrompt && (
        <SharePromptModal
          title={c("prayer_complete_share_title")}
          description={c("prayer_complete_share_sub")}
          helperText={c("prayer_complete_share_helper")}
          allLabel={c("prayer_intercession_share_all")}
          allSubLabel={c("prayer_intercession_share_all_sub")}
          partnersLabel={c("share_prompt_partners")}
          partnerSubLabel={c("share_prompt_partner_sub")}
          noPartnersLabel={c("share_prompt_no_partners")}
          invitePartnersLabel={c("share_prompt_invite_partners")}
          onInvitePartners={() => router.push("/community")}
          groupsLabel={c("prayer_intercession_my_groups")}
          publicGroupLabel={c("prayer_intercession_public_group")}
          privateGroupLabel={c("prayer_intercession_private_group")}
          noGroupsLabel={c("prayer_intercession_no_groups")}
          selectedCountLabel={c("prayer_intercession_selected_count", { count: createShareTargets.length })}
          selectAllLabel={bulkSelectionLabels.selectAll}
          deselectAllLabel={bulkSelectionLabels.deselectAll}
          showMoreLabel={bulkSelectionLabels.showMore}
          showLessLabel={bulkSelectionLabels.showLess}
          loadingLabel={c("loading")}
          shareActionLabel={c("prayer_intercession_share_action")}
          privateActionLabel={c("share_prompt_private_action")}
          closeLabel={c("close")}
          groups={normalizedGroups()}
          partners={myPartners}
          selectedTargets={createShareTargets}
          saving={saving}
          onToggleTarget={toggleCreateShareTarget}
          onChangeTargets={setCreateShareTargets}
          onClose={closeCreateSharePrompt}
          onPrivate={() => { void submit("private", []); }}
          onShare={() => { if (createShareTargets.length > 0) { const { visibility, partnerRecipientIds } = splitShareTargets(createShareTargets); void submit(visibility, partnerRecipientIds); } }}
        />
      )}

      <div className={isPopup ? styles.popupShell : styles.pageShell}>
      <header className={styles.header}>
        <div className={styles.headingRow}>
          <h1>{cardText.heading}</h1>
          {isPopup && <button type="button" className={styles.iconButton} onClick={closeTopLayer} disabled={saving || savingTestimony || sharingIntercession || deletingPrayer || savingEdit || removingIntercession} aria-label={c("close")}><X size={22} /></button>}
        </div>

        {!isPopup && <div className={styles.statusTabs} role="group" aria-label={cardText.statusLabel}>
          {(["ongoing", "answered"] as const).map(nextStatus => (
            <button key={nextStatus} type="button" aria-pressed={status === nextStatus} onClick={() => selectPrayerView({ status: nextStatus, category: nextStatus === "answered" ? "mine" : category })}>
              {nextStatus === "ongoing" ? cardText.ongoing : cardText.answered}
            </button>
          ))}
        </div>}
        <div className={styles.categoryTabs} role="group" aria-label={cardText.categoryLabel}>
          {([
            { key: "mine", label: cardText.mine, count: status === "ongoing" ? myPrayingList.length : answeredList.length },
            { key: "intercession", label: cardText.intercession, count: status === "ongoing" ? intercessionPrayingList.length : intercessionAnsweredList.length },
          ] as const).map(({ key, label, count }) => (
            <button key={key} type="button" aria-pressed={category === key} onClick={() => selectPrayerView({ status, category: key })}>
              <span>{label}</span><span className={styles.tabCount}>{count}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Active prayers use cards; answered prayers keep the existing list and testimony markup. */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
          </div>
        ) : loadError ? (
          <div className={styles.loadError} role="alert">
            <p>{c("network_error_retry")}</p>
            <button type="button" className="btn-outline" onClick={() => { void loadPrayers(); }}>{cardText.retry}</button>
          </div>
        ) : currentList.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
              <img src={emptyIconSrc} alt="" style={{ width: 54, height: 54, objectFit: "contain", opacity: 0.55 }} />
            </div>
            <p style={{ color: "var(--prayer-muted-text)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              {emptyTitle}
            </p>
            <p style={{ color: "var(--prayer-muted-text)", fontSize: 12, lineHeight: 1.6 }}>
              {emptySub}
            </p>
          </div>
        ) : (
          <>
          {showDeck && <PrayerCardDeck countByKind className={styles.cardDeck} items={cardEntries} lang={lang} activeId={activeCardId} onActiveChange={handleActiveCard} ariaLabel={cardText.carouselLabel} />}
          {!isPopup && status === "answered" && <div className={styles.answeredList} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentList.map(p => (
              <div key={p.id} className={`prayer-card ${p.is_answered ? "answered" : ""}`} style={{ position: "relative" }} data-prayer-answer-id={String(p.id)}>

                {category !== "intercession" && editId !== p.id && (
                  <div style={{ position: "absolute", top: 2, right: 2, zIndex: 3 }}>
                    <button
                      type="button"
                      aria-label={c("prayer_actions")}
                      aria-expanded={actionMenuPrayerId === p.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActionMenuPrayerId(actionMenuPrayerId === p.id ? null : p.id);
                      }}
                      style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: "transparent", color: "var(--prayer-muted-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                    >
                      <MoreHorizontal size={16} aria-hidden="true" />
                    </button>
                    {actionMenuPrayerId === p.id && (
                      <div onClick={(event) => event.stopPropagation()} style={{ position: "absolute", top: 46, right: 0, minWidth: 132, background: "var(--prayer-popover-surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 6, boxShadow: "var(--shadow-popover)", zIndex: 4 }}>
                        {!p.is_answered && (
                          <button onClick={() => startEditPrayer(p)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", background: "transparent", border: "none", borderRadius: 10, color: "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                            <Pencil size={13} /> {c("prayer_edit")}
                          </button>
                        )}
                        <button onClick={() => openDeletePrayer(p.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", background: "transparent", border: "none", borderRadius: 10, color: "var(--prayer-danger-text)", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                          <Trash2 size={13} /> {c("prayer_delete")}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {category === "intercession" && <div className={styles.answeredIntercessionMenu}>{intercessionMenu(p)}</div>}
                {category === "intercession" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingRight: 34 }}>
                    {p.profiles?.avatar_url && !p.is_anonymous ? (
                      <img
                        src={p.profiles.avatar_url}
                        alt=""
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid var(--border)",
                          WebkitTouchCallout: "none",
                          WebkitUserSelect: "none",
                          userSelect: "none",
                        }}
                      />
                    ) : (
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--prayer-terra-chip-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src="/icon-pray.webp" alt="" style={{ width: 17, height: 17, objectFit: "contain" }} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", lineHeight: 1.2 }}>{profileName(p)}</p>
                      <p style={{ fontSize: 10, color: "var(--prayer-muted-text)", lineHeight: 1.2 }}>{c("prayer_intercession_card_sub")}</p>
                    </div>
                  </div>
                )}

                {/* 응답 배지 */}
                {p.is_answered && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingRight: 34 }}>
                    <CheckCircle size={14} style={{ color: "var(--prayer-terra-text)" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--prayer-terra-text)" }}>{c("prayer_answered_badge")}</span>
                    {p.answered_at && (
                      <span style={{ fontSize: 10, color: "var(--prayer-muted-text)", marginLeft: "auto" }}>
                        {new Date(p.answered_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                )}

                {/* 중보기도 요청 중 */}
                {isSharedPrayer(p) && !p.is_answered && category !== "intercession" && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--prayer-sage-text)", background: "var(--prayer-sage-surface)", padding: "3px 10px", borderRadius: 20, border: "1px solid var(--prayer-sage-border)" }}>
                      {c("prayer_intercession_badge", { count: p.prayer_count ?? 0 })}
                    </span>
                  </div>
                )}

                {category === "intercession" && !p.is_answered && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "var(--prayer-terra-text)", background: "var(--prayer-terra-chip-surface)", padding: "3px 10px", borderRadius: 20, border: "1px solid var(--prayer-terra-border)" }}>
                      {c("prayer_intercession_praying_badge", { count: p.prayer_count ?? 0 })}
                    </span>
                  </div>
                )}

                {/* 수정 모드 */}
                {editId === p.id && category !== "intercession" ? (
                  <div>
                    <textarea className="textarea-field" rows={3} value={editText}
                      onChange={e => setEditText(e.target.value)} style={{ marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={saveEdit} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: 10, background: "var(--prayer-sage-action)", color: "var(--prayer-on-sage-action)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        <Check size={13} /> {c("prayer_save")}
                      </button>
                      <button onClick={() => setEditId(null)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: 10, background: "var(--bg3)", color: "var(--prayer-muted-text)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12 }}>
                        <X size={13} /> {c("prayer_cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 10, color: "var(--text)", paddingRight: 34, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
                      {p.content} {p.is_answered && category !== "intercession" && <span style={{ fontSize: 10, color: "var(--prayer-muted-text)" }}>({new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })})</span>}
                    </p>

                    {/* 간증 */}
                    {p.testimony && (
                      <div style={{ background: "var(--prayer-terra-surface)", borderRadius: 10, padding: "10px 12px", marginBottom: 10, border: "1px solid var(--prayer-terra-border-soft)" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--prayer-terra-text)", marginBottom: 4 }}>{c("prayer_testimony")}</p>
                        <p style={{ color: "var(--text2)", fontSize: 12, lineHeight: 1.6, fontStyle: "italic" }}>"{p.testimony}"</p>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {!p.is_answered && category !== "intercession" && (
                          <>
                            <button onClick={() => openAnsweredPrayer(p.id)}
                              style={{ fontSize: 10, color: "var(--prayer-terra-text)", border: "1px solid var(--prayer-terra-border-strong)", padding: "5px 10px", borderRadius: 20, background: "var(--prayer-terra-surface)", cursor: "pointer" }}>
                              {c("prayer_answered_cta")}
                            </button>
                            <button onClick={() => openIntercessionShare(p)}
                              style={{ fontSize: 10, color: "var(--prayer-sage-text)", border: "1px solid var(--prayer-sage-border)", padding: "5px 10px", borderRadius: 20, background: "var(--prayer-sage-surface)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                              <Send size={10} /> {c(isSharedPrayer(p) ? "prayer_edit_intercession_share" : "prayer_request_intercession")}
                            </button>
                          </>
                        )}
                      </div>
                      {!p.is_answered && <span style={{ fontSize: 10, color: "var(--prayer-muted-text)" }}>
                        {new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}
                      </span>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>}
          </>
        )}
      </div>
      {isPopup && <div className={styles.popupFooter}>
        {category === "mine" && <button type="button" className={styles.addPrayer} onClick={() => setShowForm(true)}><Plus size={16} />{isPopup ? cardText.addPrayer : c("prayer_write_title")}</button>}
      </div>}
      </div>

      {pendingRemovalId && (
        <div className={`${styles.formOverlay} ${styles.removalOverlay}`} data-prayer-dialog role="dialog" aria-modal="true" aria-labelledby="prayer-removal-title" aria-describedby="prayer-removal-description" aria-busy={removingIntercession} tabIndex={-1}>
          <div className={styles.removalDialog}>
            <h2 id="prayer-removal-title">{cardText.removeIntercessionTitle}</h2>
            <p id="prayer-removal-description">{cardText.removeIntercessionMessage}</p>
            {removalError && <p className={styles.removalError} role="alert">{removalError}</p>}
            <div className={styles.removalActions}>
              <button type="button" className="btn-outline" disabled={removingIntercession} onClick={() => { if (!removalInFlight.current) { setPendingRemovalId(null); setRemovalError(null); } }}>{c("prayer_cancel")}</button>
              <button type="button" className={styles.confirmRemoval} disabled={removingIntercession} onClick={() => { void removeIntercession(); }}>
                {removingIntercession ? <><Loader2 size={16} className="spin" aria-hidden="true" />{cardText.removingIntercession}</> : cardText.removeIntercessionConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeletePrayerId && (
        <div style={{ position: "fixed", inset: 0, background: "var(--overlay-modal)", zIndex: 255, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--prayer-modal-surface)", width: "100%", maxWidth: 370, borderRadius: 24, padding: 24, border: "1px solid var(--border)", boxShadow: "var(--shadow-modal)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{c("prayer_delete_title")}</h2>
            <p style={{ fontSize: 13, color: "var(--prayer-muted-text)", lineHeight: 1.7, marginBottom: 18 }}>{c("prayer_delete_msg")}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-outline" onClick={() => setPendingDeletePrayerId(null)} disabled={deletingPrayer} style={{ flex: 1 }}>{c("prayer_cancel")}</button>
              <button onClick={deletePrayer} disabled={deletingPrayer} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "none", background: "var(--prayer-danger-action)", color: "var(--prayer-on-danger-action)", fontSize: 13, fontWeight: 800, cursor: deletingPrayer ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {deletingPrayer ? <Loader2 size={16} className="spin" /> : c("prayer_delete_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <SharePromptModal
          title={c("prayer_intercession_share_title")}
          description={c("prayer_intercession_share_sub")}
          helperText={c("prayer_complete_share_helper")}
          allLabel={c("prayer_intercession_share_all")}
          allSubLabel={c("prayer_intercession_share_all_sub")}
          partnersLabel={c("share_prompt_partners")}
          partnerSubLabel={c("share_prompt_partner_sub")}
          noPartnersLabel={c("share_prompt_no_partners")}
          invitePartnersLabel={c("share_prompt_invite_partners")}
          onInvitePartners={() => router.push("/community")}
          groupsLabel={c("prayer_intercession_my_groups")}
          publicGroupLabel={c("prayer_intercession_public_group")}
          privateGroupLabel={c("prayer_intercession_private_group")}
          noGroupsLabel={c("prayer_intercession_no_groups")}
          selectedCountLabel={c("prayer_intercession_selected_count", { count: selectedTargets.length })}
          selectAllLabel={bulkSelectionLabels.selectAll}
          deselectAllLabel={bulkSelectionLabels.deselectAll}
          showMoreLabel={bulkSelectionLabels.showMore}
          showLessLabel={bulkSelectionLabels.showLess}
          loadingLabel={c("loading")}
          shareActionLabel={c("prayer_intercession_share_action")}
          privateActionLabel={c("share_prompt_private_action")}
          closeLabel={c("close")}
          groups={normalizedGroups()}
          partners={myPartners}
          selectedTargets={selectedTargets}
          saving={sharingIntercession}
          onToggleTarget={toggleTarget}
          onChangeTargets={setSelectedTargets}
          onClose={closeIntercessionShareModal}
          onPrivate={() => { void saveIntercessionTargets(true); }}
          onShare={() => { void saveIntercessionTargets(false); }}
        />
      )}

      {testimonyPrayerId && (
        <div className={styles.formOverlay} data-prayer-dialog role="dialog" aria-modal="true" aria-label={c("prayer_share_answered_title")} tabIndex={-1}>
          <div style={{ background: "var(--prayer-modal-surface)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)", boxShadow: "var(--shadow-modal)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
              {c("prayer_share_answered_title")}
            </h2>
            <p style={{ fontSize: 12, color: "var(--prayer-muted-text)", marginBottom: 14 }}>
              {c("prayer_share_answered_desc")}
            </p>
            <textarea
              className="textarea-field"
              rows={4}
              placeholder={c("prayer_share_answered_placeholder")}
              value={testimonyText}
              onChange={e => setTestimonyText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-outline" disabled={savingTestimony} onClick={() => { setTestimonyPrayerId(null); setTestimonyText(""); }} style={{ flex: 1 }}>
                {c("prayer_cancel")}
              </button>
              <button className="btn-sage roots-prayer-action" onClick={saveAnsweredPrayer} disabled={savingTestimony || !testimonyText.trim()} style={{ flex: 1 }}>
                {savingTestimony ? <Loader2 size={16} className="spin" /> : c("prayer_save_action")}
              </button>
            </div>
          </div>
        </div>
      )}

      {editId && (
        <div className={styles.formOverlay} data-prayer-dialog role="dialog" aria-modal="true" aria-label={c("prayer_edit")} tabIndex={-1}>
          <div style={{ background: "var(--prayer-modal-surface)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)", boxShadow: "var(--shadow-modal)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>{c("prayer_edit")}</h2>
            <textarea className="textarea-field" rows={4} value={editText} aria-label={c("prayer_edit")} onChange={event => setEditText(event.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" className="btn-outline" disabled={savingEdit} onClick={() => { setEditId(null); setEditText(""); }} style={{ flex: 1 }}>{c("prayer_cancel")}</button>
              <button type="button" className="btn-sage roots-prayer-action" disabled={savingEdit || !editText.trim()} onClick={saveEdit} style={{ flex: 1 }}>{savingEdit ? <Loader2 size={16} className="spin" /> : c("prayer_save")}</button>
            </div>
          </div>
        </div>
      )}

      {/* 기도 작성 폼 */}
      {showForm && (
        <div className={styles.formOverlay} data-prayer-dialog role="dialog" aria-modal="true" aria-label={c("prayer_write_title")} tabIndex={-1}>
          <div style={{ background: "var(--prayer-modal-surface)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)", boxShadow: "var(--shadow-modal)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{c("prayer_write_title")}</h2>
            <p style={{ fontSize: 12, color: "var(--prayer-muted-text)", marginBottom: 14 }}>{c("prayer_write_desc")}</p>
            <textarea className="textarea-field" rows={4}
              placeholder={c("prayer_write_placeholder")}
              value={newPrayer} onChange={e => setNewPrayer(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-outline" disabled={saving} onClick={() => setShowForm(false)} style={{ flex: 1 }}>{c("prayer_cancel")}</button>
              <button className="btn-sage roots-prayer-action" onClick={openCreateSharePrompt} disabled={saving || !newPrayer.trim()} style={{ flex: 1 }}>
                {saving ? <Loader2 size={16} className="spin" /> : c("prayer_save_action")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* + 버튼 (나의 기도 탭에서만) */}
      {!isPopup && status === "ongoing" && category === "mine" && (
        <div className="roots-prayer-fab-frame">
          <button
            type="button"
            className="roots-prayer-fab"
            onClick={() => setShowForm(true)}
            aria-label={c("prayer_write_title")}
            style={{ position: "fixed", bottom: "calc(82px + var(--bottom-nav-safe-extra))", right: 16, width: 52, height: 52, background: "var(--prayer-sage-action)", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, cursor: "pointer", boxShadow: "var(--prayer-fab-shadow)" }}
          >
            <Plus size={22} aria-hidden="true" style={{ color: "var(--prayer-on-sage-action)" }} />
          </button>
        </div>
      )}

      {!isPopup && <BottomNav />}
    </div>
  );
}
