"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
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

type PrayerTab = "mine" | "answered" | "intercession";


function PrayerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = useLang();
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
  const [tab, setTab] = useState<PrayerTab>("mine");
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

  const c = (key: TKey, vars?: Record<string, string | number>) => t(key, lang, vars);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => { loadPrayers(); }, []);

  useEffect(() => {
    if (searchParams.get("compose") === "1") {
      setTab("mine");
      setShowForm(true);
      router.replace("/prayer");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!showShareModal && !showCreateSharePrompt) return;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [showShareModal, showCreateSharePrompt]);

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

  function normalizedGroups() {
    return myGroups.map((group: any) => ({
      id: String(group.id),
      name: String(group.name ?? ""),
      is_public: !!group.is_public,
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
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data: memberRows } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      const groupIds = (memberRows ?? []).map((row: any) => row.group_id).filter(Boolean);
      if (groupIds.length > 0) {
        const { data: groupData } = await supabase
          .from("groups")
          .select("id, name, is_public")
          .in("id", groupIds);
        setMyGroups(groupData ?? []);
      } else {
        setMyGroups([]);
      }

      const { data: companionRows } = await supabase
        .from("companions")
        .select("requester_id, receiver_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
      const partnerIds = Array.from(new Set((companionRows ?? [])
        .map((row: any) => row.requester_id === user.id ? row.receiver_id : row.requester_id)
        .filter(Boolean)
      ));
      if (partnerIds.length > 0) {
        const profileMap = mapProfileCards(
          await loadProfileCards(supabase, partnerIds),
        );
        setMyPartners(partnerIds.map((partnerId: any) => ({
          id: String(partnerId),
          name: String(profileMap[partnerId]?.name ?? c("profile_default_name")),
          avatar_url: profileMap[partnerId]?.avatar_url ?? null,
        })));
      } else {
        setMyPartners([]);
      }

      const { data: partnerRecipientRows } = await supabase
        .from("prayer_item_recipients")
        .select("prayer_item_id")
        .eq("owner_id", user.id);
      setPartnerSharedPrayerIds(new Set((partnerRecipientRows ?? []).map((row: any) => String(row.prayer_item_id))));

      const { data } = await supabase
        .from("prayer_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setPrayers(data);

      const { data: logs } = await supabase
        .from("user_prayer_logs")
        .select("prayer_id")
        .eq("user_id", user.id);

      const prayerIds = Array.from(new Set((logs ?? []).map((log: any) => log.prayer_id).filter(Boolean)));
      if (prayerIds.length === 0) {
        setIntercessionPrayers([]);
      } else {
        const { data: intercessionData } = await supabase
          .from("prayer_items")
          .select("*")
          .in("id", prayerIds)
          .order("is_answered", { ascending: true })
          .order("created_at", { ascending: false });

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
    } catch (error) {
      console.error("prayer submit failed", error);
      setNotice(c("prayer_error_save"));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editText.trim() || !editId) return;
    const supabase = createClient();
    try {
      const { error } = await supabase.from("prayer_items").update({ content: editText.trim() }).eq("id", editId);
      if (error) {
        setNotice(c("prayer_error_edit"));
        return;
      }
      setEditId(null); setEditText("");
      loadPrayers();
    } catch (error) {
      console.error("prayer edit failed", error);
      setNotice(c("prayer_error_edit"));
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
    } catch (error) {
      console.error("prayer delete failed", error);
      setNotice(c("prayer_error_delete"));
    } finally {
      setDeletingPrayer(false);
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

      // 중보기도 요청 배지 체크
      // 전체 공개와 그룹 공유 모두 중보기도 요청으로 인정합니다.
      const { data: prof } = await supabase.from("profiles")
        .select("badge_prayer_ember, badge_prayer_warrior").eq("id", user.id).single();
      const { data: shared } = await supabase.from("prayer_items")
        .select("id, visibility").eq("user_id", user.id);
      const { data: partnerShared } = await supabase.from("prayer_item_recipients")
        .select("prayer_item_id").eq("owner_id", user.id);
      const sharedPrayerIds = new Set([
        ...(shared ?? []).filter((row: any) => isSharedVisibility(row.visibility)).map((row: any) => String(row.id)),
        ...(partnerShared ?? []).map((row: any) => String(row.prayer_item_id)),
      ]);
      const sharedCount = sharedPrayerIds.size;
      const badgeUpdates: Record<string, boolean> = {};
      if (!prof?.badge_prayer_ember && sharedCount >= 7) badgeUpdates.badge_prayer_ember = true;
      if (!prof?.badge_prayer_warrior && sharedCount >= 15) badgeUpdates.badge_prayer_warrior = true;
      if (Object.keys(badgeUpdates).length > 0) {
        await supabase.from("profiles").update(badgeUpdates).eq("id", user.id);
        if (badgeUpdates.badge_prayer_ember) {
          setBadgePopup({
            img: "/badge_rootswoman_fire.webp",
            title: c("prayer_badge_ember_popup"),
            msg: t("badge_prayer_ember_msg", lang),
          });
        } else if (badgeUpdates.badge_prayer_warrior) {
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
      const { error } = await supabase.from("prayer_items").update({
        is_answered: true,
        testimony: testimonyText.trim(),
        answered_at: new Date().toISOString(),
      }).eq("id", testimonyPrayerId);
      if (error) {
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
      setTab("answered");
    } catch (error) {
      console.error("answered prayer save failed", error);
      setNotice(c("prayer_error_answered"));
    } finally {
      setSavingTestimony(false);
    }
  }

  function openAnsweredPrayer(id: string) {
    setTestimonyPrayerId(id);
    setTestimonyText("");
  }

  const myPrayingList = prayers.filter(p => !p.is_answered);
  const answeredList = prayers.filter(p => p.is_answered);
  const currentList = tab === "mine" ? myPrayingList : tab === "answered" ? answeredList : intercessionPrayers;
  const emptyIconSrc = tab === "mine" ? "/icon-prayer-request.webp" : tab === "answered" ? "/icon-prayer-answered.webp" : "/icon-pray.webp";
  const emptyTitle = tab === "mine" ? c("prayer_empty_mine_title") : tab === "answered" ? c("prayer_empty_answered_title") : c("prayer_empty_intercession_title");
  const emptySub = tab === "mine" ? c("prayer_empty_mine_sub") : tab === "answered" ? c("prayer_empty_answered_sub") : c("prayer_empty_intercession_sub");

  function tabAccentColor(key: PrayerTab) {
    if (key === "intercession") return "var(--terra-dark)";
    return "var(--sage-dark)";
  }

  function tabAccentBg(key: PrayerTab) {
    if (key === "intercession") return "var(--terra-dark)";
    return "var(--sage)";
  }

  function profileName(prayer: any) {
    if (prayer.is_anonymous) return c("prayer_intercession_anonymous");
    return prayer.profiles?.name || c("prayer_intercession_anonymous");
  }

  return (
    <div className="page">
      {badgePopup && (
        <div onClick={() => setBadgePopup(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,28,30,0.92)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
          <ConfettiBurst variant="fixed" zIndex={201} />
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid rgba(232,197,71,0.4)", width: "100%", maxWidth: 340, padding: "32px 24px 28px", textAlign: "center" }}>
            <div style={{ width: 120, height: 120, margin: "0 auto 16px" }}>
              <img src={badgePopup.img} alt="badge" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "rgba(232,197,71,0.95)", marginBottom: 10, lineHeight: 1.3 }}>{badgePopup.title}</h2>
            <div style={{ padding: "14px 16px", background: "rgba(232,197,71,0.08)", borderRadius: 14, border: "1px solid rgba(232,197,71,0.25)", marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{badgePopup.msg}</p>
            </div>
            <button onClick={() => setBadgePopup(null)} style={{ width: "100%", padding: "13px", background: "rgba(232,197,71,0.9)", color: "#1a1c1e", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {t("badge_thanks", lang)}
            </button>
          </div>
        </div>
      )}
      {notice && (
        <div style={{ position: "fixed", top: 84, left: "50%", transform: "translateX(-50%)", zIndex: 210, background: "rgba(26,28,30,0.96)", color: "#fff", padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, fontWeight: 600, boxShadow: "0 8px 28px rgba(0,0,0,0.22)", maxWidth: 320, width: "calc(100% - 40px)", textAlign: "center" }}>
          {notice}
        </div>
      )}
      <Celebration
        show={celebration}
        message={c("prayer_saved_message")}
        subMessage={c("prayer_saved_sub")}
        iconSrc="/icon-pray.webp"
        iconAlt="Prayer"
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
          loadingLabel={c("loading")}
          shareActionLabel={c("prayer_intercession_share_action")}
          privateActionLabel={c("share_prompt_private_action")}
          closeLabel={c("close")}
          groups={normalizedGroups()}
          partners={myPartners}
          selectedTargets={createShareTargets}
          saving={saving}
          onToggleTarget={toggleCreateShareTarget}
          onClose={closeCreateSharePrompt}
          onPrivate={() => { void submit("private", []); }}
          onShare={() => { if (createShareTargets.length > 0) { const { visibility, partnerRecipientIds } = splitShareTargets(createShareTargets); void submit(visibility, partnerRecipientIds); } }}
        />
      )}

      {/* 헤더 */}
      <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 0", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{t("prayer_title", lang)}</h1>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, marginBottom: 16 }}>
          {c("prayer_sub_line1")}<br />
          {c("prayer_sub_line2")}<br />
          {c("prayer_sub_line3")}
        </p>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 0 }}>
          {([
            { key: "mine", label: t("prayer_tab_mine", lang), count: myPrayingList.length },
            { key: "answered", label: t("prayer_tab_answered", lang), count: answeredList.length },
            { key: "intercession", label: t("prayer_tab_intercession", lang), count: intercessionPrayers.length },
          ] as const).map(({ key, label, count }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, minWidth: 0, padding: "10px 0 12px",
                  background: "none", border: "none",
                  borderBottom: active ? `2px solid ${tabAccentColor(key)}` : "2px solid transparent",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? tabAccentColor(key) : "var(--text3)", whiteSpace: "nowrap", minWidth: 0 }}>
                  {label}
                </span>
                {count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: active ? "var(--bg)" : "var(--text3)", background: active ? tabAccentBg(key) : "var(--border)", borderRadius: 20, padding: "1px 6px", minWidth: 18, textAlign: "center", flexShrink: 0 }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 내용 */}
      <div style={{ padding: "16px 16px 100px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "52px 0" }}>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
              <img src={emptyIconSrc} alt="" style={{ width: 54, height: 54, objectFit: "contain", opacity: 0.55 }} />
            </div>
            <p style={{ color: "var(--text3)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              {emptyTitle}
            </p>
            <p style={{ color: "var(--text3)", fontSize: 12, lineHeight: 1.6 }}>
              {emptySub}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentList.map(p => (
              <div key={p.id} className={`prayer-card ${p.is_answered ? "answered" : ""}`} style={{ position: "relative" }}>

                {tab !== "intercession" && editId !== p.id && (
                  <div style={{ position: "absolute", top: 10, right: 10, zIndex: 3 }}>
                    <button
                      aria-label={c("prayer_actions")}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActionMenuPrayerId(actionMenuPrayerId === p.id ? null : p.id);
                      }}
                      style={{ width: 28, height: 28, borderRadius: 999, border: "none", background: "transparent", color: "var(--text3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {actionMenuPrayerId === p.id && (
                      <div onClick={(event) => event.stopPropagation()} style={{ position: "absolute", top: 34, right: 0, minWidth: 132, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 6, boxShadow: "0 12px 30px rgba(0,0,0,0.16)", zIndex: 4 }}>
                        {!p.is_answered && (
                          <button onClick={() => startEditPrayer(p)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", background: "transparent", border: "none", borderRadius: 10, color: "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                            <Pencil size={13} /> {c("prayer_edit")}
                          </button>
                        )}
                        <button onClick={() => openDeletePrayer(p.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", background: "transparent", border: "none", borderRadius: 10, color: "var(--danger, #B35C4A)", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                          <Trash2 size={13} /> {c("prayer_delete")}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {tab === "intercession" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
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
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(196,149,106,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src="/icon-pray.webp" alt="" style={{ width: 17, height: 17, objectFit: "contain" }} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", lineHeight: 1.2 }}>{profileName(p)}</p>
                      <p style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.2 }}>{c("prayer_intercession_card_sub")}</p>
                    </div>
                  </div>
                )}

                {/* 응답 배지 */}
                {p.is_answered && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingRight: tab !== "intercession" ? 34 : 0 }}>
                    <CheckCircle size={14} style={{ color: "var(--terra-dark)" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--terra-dark)" }}>{c("prayer_answered_badge")}</span>
                    {p.answered_at && (
                      <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: "auto" }}>
                        {new Date(p.answered_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                )}

                {/* 중보기도 요청 중 */}
                {isSharedPrayer(p) && !p.is_answered && tab !== "intercession" && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--sage-dark)", background: "var(--sage-light)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(122,157,122,0.3)" }}>
                      {c("prayer_intercession_badge", { count: p.prayer_count ?? 0 })}
                    </span>
                  </div>
                )}

                {tab === "intercession" && !p.is_answered && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "var(--terra-dark)", background: "rgba(196,149,106,0.12)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(196,149,106,0.28)" }}>
                      {c("prayer_intercession_praying_badge", { count: p.prayer_count ?? 0 })}
                    </span>
                  </div>
                )}

                {/* 수정 모드 */}
                {editId === p.id && tab !== "intercession" ? (
                  <div>
                    <textarea className="textarea-field" rows={3} value={editText}
                      onChange={e => setEditText(e.target.value)} style={{ marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={saveEdit} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: 10, background: "var(--sage)", color: "var(--bg)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        <Check size={13} /> {c("prayer_save")}
                      </button>
                      <button onClick={() => setEditId(null)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: 10, background: "var(--bg3)", color: "var(--text3)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12 }}>
                        <X size={13} /> {c("prayer_cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 10, color: "var(--text)", paddingRight: tab !== "intercession" ? 34 : 0, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
                      {p.content} {p.is_answered && tab !== "intercession" && <span style={{ fontSize: 10, color: "var(--text3)" }}>({new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })})</span>}
                    </p>

                    {/* 간증 */}
                    {p.testimony && (
                      <div style={{ background: "rgba(196,149,106,0.08)", borderRadius: 10, padding: "10px 12px", marginBottom: 10, border: "1px solid rgba(196,149,106,0.2)" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--terra-dark)", marginBottom: 4 }}>{c("prayer_testimony")}</p>
                        <p style={{ color: "var(--text2)", fontSize: 12, lineHeight: 1.6, fontStyle: "italic" }}>"{p.testimony}"</p>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {!p.is_answered && tab !== "intercession" && (
                          <>
                            <button onClick={() => openAnsweredPrayer(p.id)}
                              style={{ fontSize: 10, color: "var(--terra-dark)", border: "1px solid rgba(196,149,106,0.4)", padding: "5px 10px", borderRadius: 20, background: "rgba(196,149,106,0.08)", cursor: "pointer" }}>
                              {c("prayer_answered_cta")}
                            </button>
                            <button onClick={() => openIntercessionShare(p)}
                              style={{ fontSize: 10, color: "var(--sage-dark)", border: "1px solid rgba(122,157,122,0.3)", padding: "5px 10px", borderRadius: 20, background: "var(--sage-light)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                              <Send size={10} /> {c(isSharedPrayer(p) ? "prayer_edit_intercession_share" : "prayer_request_intercession")}
                            </button>
                          </>
                        )}
                      </div>
                      {!p.is_answered && <span style={{ fontSize: 10, color: "var(--text3)" }}>
                        {new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}
                      </span>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>


      {pendingDeletePrayerId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 255, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 370, borderRadius: 24, padding: 24, border: "1px solid var(--border)", boxShadow: "0 18px 52px rgba(0,0,0,0.25)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{c("prayer_delete_title")}</h2>
            <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, marginBottom: 18 }}>{c("prayer_delete_msg")}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-outline" onClick={() => setPendingDeletePrayerId(null)} disabled={deletingPrayer} style={{ flex: 1 }}>{c("prayer_cancel")}</button>
              <button onClick={deletePrayer} disabled={deletingPrayer} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "none", background: "var(--danger, #B35C4A)", color: "white", fontSize: 13, fontWeight: 800, cursor: deletingPrayer ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
          loadingLabel={c("loading")}
          shareActionLabel={c("prayer_intercession_share_action")}
          privateActionLabel={c("share_prompt_private_action")}
          closeLabel={c("close")}
          groups={normalizedGroups()}
          partners={myPartners}
          selectedTargets={selectedTargets}
          saving={sharingIntercession}
          onToggleTarget={toggleTarget}
          onClose={() => { setShowShareModal(false); setSharePrayerId(null); setSelectedTargets([]); }}
          onPrivate={() => { void saveIntercessionTargets(true); }}
          onShare={() => { void saveIntercessionTargets(false); }}
        />
      )}

      {testimonyPrayerId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 45, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
              {c("prayer_share_answered_title")}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>
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
              <button className="btn-outline" onClick={() => { setTestimonyPrayerId(null); setTestimonyText(""); }} style={{ flex: 1 }}>
                {c("prayer_cancel")}
              </button>
              <button className="btn-sage" onClick={saveAnsweredPrayer} disabled={savingTestimony || !testimonyText.trim()} style={{ flex: 1 }}>
                {savingTestimony ? <Loader2 size={16} className="spin" /> : c("prayer_save_action")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기도 작성 폼 */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{c("prayer_write_title")}</h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>{c("prayer_write_desc")}</p>
            <textarea className="textarea-field" rows={4}
              placeholder={c("prayer_write_placeholder")}
              value={newPrayer} onChange={e => setNewPrayer(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>{c("prayer_cancel")}</button>
              <button className="btn-sage" onClick={openCreateSharePrompt} disabled={saving || !newPrayer.trim()} style={{ flex: 1 }}>
                {saving ? <Loader2 size={16} className="spin" /> : c("prayer_save_action")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* + 버튼 (나의 기도 탭에서만) */}
      {tab === "mine" && (
        <button
          onClick={() => setShowForm(true)}
          style={{ position: "fixed", bottom: "calc(82px + var(--bottom-nav-safe-extra))", right: 16, width: 52, height: 52, background: "var(--sage)", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, cursor: "pointer", boxShadow: "0 4px 14px rgba(122,157,122,0.4)" }}
        >
          <Plus size={22} style={{ color: "var(--bg)" }} />
        </button>
      )}

      <BottomNav />
    </div>
  );
}


function PrayerPageFallback() {
  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
    </div>
  );
}

export default function PrayerPage() {
  return (
    <Suspense fallback={<PrayerPageFallback />}>
      <PrayerPageContent />
    </Suspense>
  );
}
