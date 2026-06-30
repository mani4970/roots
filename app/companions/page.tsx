"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import ConfettiBurst from "@/components/ConfettiBurst";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t, type TKey } from "@/lib/i18n";
import { copyText, shareInvite as shareInviteContent } from "@/lib/nativeShare";
import { isInAppBrowser } from "@/lib/inAppBrowser";
import { clearSharePromptOptionsCache } from "@/lib/sharePromptOptions";
import { checkAndAwardCompanionBadge, getRewardBadgePopup } from "@/lib/rewardBadges";
import { ArrowLeft, Check, Copy, Loader2, Share2, UserMinus, UserPlus, X } from "lucide-react";

const ROOTS_WEB_ORIGIN = "https://www.christian-roots.com";
const APP_STORE_URL = "https://apps.apple.com/app/christian-roots/id6769063816";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.rootspuce.app";

type ProfileRow = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  streak_days?: number | null;
};

type CompanionRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at?: string | null;
  responded_at?: string | null;
};

type CompanionWithProfile = CompanionRow & { other: ProfileRow | null };

function Avatar({ profile, size = 42 }: { profile?: ProfileRow | null; size?: number }) {
  const name = profile?.name?.trim() || "Roots";
  const initial = name[0]?.toUpperCase() ?? "R";
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--sage-light)", color: "var(--sage-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, border: "1px solid rgba(122,157,122,0.28)", flexShrink: 0 }}>
      {initial}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="sec-label" style={{ marginTop: 18 }}>{children}</div>;
}

function CompanionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = useLang();
  const inviteUserId = searchParams.get("invite");
  const c = (key: TKey, vars?: Record<string, string | number>) => t(key, lang, vars);

  const [userId, setUserId] = useState("");
  const [myProfile, setMyProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [rows, setRows] = useState<CompanionRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [inviteProfile, setInviteProfile] = useState<ProfileRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CompanionWithProfile | null>(null);
  const [badgePopup, setBadgePopup] = useState<{ img: string; title: string; msg: string } | null>(null);

  const inviteUrl = useMemo(() => userId ? `${ROOTS_WEB_ORIGIN}/companions?invite=${userId}` : `${ROOTS_WEB_ORIGIN}/welcome?from=invite`, [userId]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  function currentCompanionsRedirectPath() {
    const query = searchParams.toString();
    return `/companions${query ? `?${query}` : ""}`;
  }

  function setBusy(id: string, busy: boolean) {
    setBusyIds(current => busy ? Array.from(new Set([...current, id])) : current.filter(item => item !== id));
  }

  function otherId(row: CompanionRow) {
    return row.requester_id === userId ? row.receiver_id : row.requester_id;
  }

  function withProfiles(list: CompanionRow[]): CompanionWithProfile[] {
    return list.map(row => ({ ...row, other: profiles[otherId(row)] ?? null }));
  }

  const accepted = withProfiles(rows.filter(row => row.status === "accepted"));
  const received = withProfiles(rows.filter(row => row.status === "pending" && row.receiver_id === userId));
  const sent = withProfiles(rows.filter(row => row.status === "pending" && row.requester_id === userId));

  function relationWith(targetId: string) {
    return rows.find(row =>
      (row.requester_id === userId && row.receiver_id === targetId) ||
      (row.requester_id === targetId && row.receiver_id === userId)
    );
  }

  async function loadAll() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (inviteUserId) {
        setUserId("");
        setMyProfile(null);
        setRows([]);
        setProfiles({});
        setInviteProfile(null);
        setLoading(false);
        return;
      }
      router.push(`/welcome?redirect=${encodeURIComponent(currentCompanionsRedirectPath())}`);
      return;
    }
    setUserId(user.id);

    const { data: me } = await supabase.from("profiles").select("id,name,avatar_url,streak_days").eq("id", user.id).maybeSingle();
    setMyProfile((me ?? null) as ProfileRow | null);

    const { data: companionRows, error } = await supabase
      .from("companions")
      .select("id,requester_id,receiver_id,status,created_at,updated_at,responded_at")
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("동행 목록 조회 실패:", error);
      setRows([]);
      setProfiles({});
      setLoading(false);
      return;
    }

    const nextRows = (companionRows ?? []) as CompanionRow[];
    setRows(nextRows);

    const ids = Array.from(new Set(nextRows.flatMap(row => [row.requester_id, row.receiver_id]).filter(id => id && id !== user.id)));
    if (inviteUserId && inviteUserId !== user.id) ids.push(inviteUserId);
    const uniqueIds = Array.from(new Set(ids));

    if (uniqueIds.length > 0) {
      const { data: profileRows } = await supabase.from("profiles").select("id,name,avatar_url,streak_days").in("id", uniqueIds);
      const profileMap: Record<string, ProfileRow> = {};
      (profileRows ?? []).forEach((profile: any) => { profileMap[profile.id] = profile; });
      setProfiles(profileMap);
      setInviteProfile(inviteUserId && inviteUserId !== user.id ? profileMap[inviteUserId] ?? null : null);
    } else {
      setProfiles({});
      setInviteProfile(null);
    }
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, [inviteUserId]);

  async function acceptInvite(inviterId: string) {
    if (!userId || inviterId === userId) return;

    const existing = relationWith(inviterId);
    if (existing?.status === "accepted") {
      showToast(c("companions_already_connected"));
      return;
    }

    setBusy(`invite:${inviterId}`, true);
    try {
      const supabase = createClient();

      if (existing?.status === "pending") {
        const { error } = await supabase
          .from("companions")
          .update({ status: "accepted", responded_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("companions").insert({
          requester_id: inviterId,
          receiver_id: userId,
          status: "accepted",
          responded_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      clearSharePromptOptionsCache();
      showToast(c("companions_invite_accepted"));
      try {
        const awarded = await checkAndAwardCompanionBadge(supabase, userId);
        if (awarded) setBadgePopup(getRewardBadgePopup(awarded, lang));
      } catch (badgeError) {
        console.warn("동역자 보상 배지 확인 실패:", badgeError);
      }
      await loadAll();
    } catch (error: any) {
      console.error("동행 초대 수락 실패:", error);
      showToast(c("companions_invite_accept_fail"));
    } finally {
      setBusy(`invite:${inviterId}`, false);
    }
  }

  async function updateRequest(row: CompanionRow, status: "accepted" | "declined") {
    setBusy(row.id, true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("companions").update({ status, responded_at: new Date().toISOString() }).eq("id", row.id);
      if (error) throw error;
      if (status === "accepted") {
        clearSharePromptOptionsCache();
        try {
          const awarded = await checkAndAwardCompanionBadge(supabase, userId);
          if (awarded) setBadgePopup(getRewardBadgePopup(awarded, lang));
        } catch (badgeError) {
          console.warn("동역자 보상 배지 확인 실패:", badgeError);
        }
      }
      showToast(status === "accepted" ? c("companions_request_accepted") : c("companions_request_declined"));
      await loadAll();
    } catch (error) {
      console.error("동행 요청 응답 실패:", error);
      showToast(c("companions_update_fail"));
    } finally {
      setBusy(row.id, false);
    }
  }

  async function deleteRelation(row: CompanionRow) {
    setBusy(row.id, true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("companions").delete().eq("id", row.id);
      if (error) throw error;
      if (row.status === "accepted") clearSharePromptOptionsCache();
      showToast(row.status === "accepted" ? c("companions_removed") : c("companions_request_cancelled"));
      await loadAll();
    } catch (error) {
      console.error("동행 삭제 실패:", error);
      showToast(c("companions_update_fail"));
    } finally {
      setBusy(row.id, false);
      setRemoveTarget(null);
    }
  }

  async function shareInvite() {
    if (!userId) return;
    const title = c("companions_invite_share_title");
    const name = myProfile?.name || "Roots";
    const text = c("companions_invite_share_text", { name });
    const result = await shareInviteContent({ title, text, url: inviteUrl });
    if (result === "copied") showToast(c("companions_invite_copied"));
  }

  async function copyInvite() {
    await copyText(inviteUrl);
    showToast(c("companions_invite_copied"));
  }

  function ProfileLine({ profile }: { profile: ProfileRow | null }) {
    const name = profile?.name || c("profile_default_name");
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <Avatar profile={profile} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 850, color: "var(--text)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
          <p style={{ fontSize: 11, color: "var(--text3)" }}>{t("profile_streak", lang, { n: profile?.streak_days ?? 0 })}</p>
        </div>
      </div>
    );
  }

  function EmptyCard({ text }: { text: string }) {
    return <div className="card" style={{ padding: "18px 14px", textAlign: "center", fontSize: 13, color: "var(--text3)", lineHeight: 1.55 }}>{text}</div>;
  }

  if (loading) {
    return (
      <main className="page-wrap" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="spin" size={22} style={{ color: "var(--sage)" }} />
      </main>
    );
  }

  if (!userId && inviteUserId) {
    const redirectPath = currentCompanionsRedirectPath();
    return (
      <main className="page-wrap" style={{ minHeight: "100dvh", padding: "56px 20px 36px", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <img src="/roots-logo-transparent-160.png" alt="Roots" width={72} height={72} style={{ objectFit: "contain", marginBottom: 16 }} />
          <div className="card" style={{ padding: "26px 22px", borderRadius: 24, border: "1px solid rgba(122,157,122,0.26)", background: "linear-gradient(180deg, var(--bg2), var(--sage-light))", boxShadow: "0 16px 38px rgba(50,45,38,0.08)" }}>
            <p style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 850, marginBottom: 8 }}>{c("companions_invite_received")}</p>
            <h1 style={{ fontSize: 21, lineHeight: 1.35, fontWeight: 900, color: "var(--text)", marginBottom: 10 }}>{c("companions_invite_landing_title")}</h1>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text2)", marginBottom: 16 }}>{c("companions_invite_landing_body")}</p>
            {isInAppBrowser() && (
              <div style={{ background: "rgba(244,239,224,0.64)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, border: "1px solid rgba(122,157,122,0.18)", textAlign: "left" }}>
                <p style={{ fontSize: 11.5, color: "var(--sage-dark)", lineHeight: 1.55 }}>{c("invite_in_app_browser_hint")}</p>
              </div>
            )}
            <button onClick={() => router.push(`/signup?redirect=${encodeURIComponent(redirectPath)}`)} className="btn-sage" style={{ width: "100%", marginBottom: 10 }}>
              {c("companions_invite_landing_primary")}
            </button>
            <button onClick={() => router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`)} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 13, fontWeight: 850, cursor: "pointer" }}>
              {c("invite_login_existing")}
            </button>
            <div style={{ height: 1, background: "rgba(122,157,122,0.22)", margin: "18px 0 14px" }} />
            <p style={{ fontSize: 12, color: "var(--text3)", fontWeight: 750, marginBottom: 10 }}>{c("invite_app_download_prompt")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", padding: "10px 8px", borderRadius: 13, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text)", fontSize: 12, fontWeight: 850, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                <span></span><span>App Store</span>
              </a>
              <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", padding: "10px 8px", borderRadius: 13, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text)", fontSize: 12, fontWeight: 850, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                <span>▶</span><span>Google Play</span>
              </a>
            </div>
            <p style={{ fontSize: 10.5, color: "var(--text3)", lineHeight: 1.55, marginTop: 10 }}>{c("invite_app_download_hint")}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap" style={{ minHeight: "100dvh", padding: "var(--roots-page-top-padding) 16px 112px", background: "var(--bg)" }}>
      {toast && (
        <div style={{ position: "fixed", top: 74, left: "50%", transform: "translateX(-50%)", zIndex: 220, background: "rgba(37,44,38,0.94)", color: "white", padding: "10px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800, boxShadow: "0 10px 26px rgba(0,0,0,0.22)", maxWidth: "calc(100vw - 40px)", textAlign: "center" }}>
          {toast}
        </div>
      )}

      {badgePopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", padding: 20 }}>
          <ConfettiBurst />
          <div style={{ width: "100%", maxWidth: 360, borderRadius: 24, background: "var(--bg2)", border: "1px solid rgba(232,197,71,0.35)", padding: "26px 22px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}>
            <div style={{ width: 118, height: 118, margin: "0 auto 16px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(232,197,71,0.18), rgba(122,157,122,0.16))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={badgePopup.img} alt="badge" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 850, color: "rgba(232,197,71,0.95)", marginBottom: 10, lineHeight: 1.3 }}>{badgePopup.title}</h2>
            <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, marginBottom: 18 }}>{badgePopup.msg}</p>
            <button onClick={() => setBadgePopup(null)} className="btn-sage" style={{ width: "100%" }}>{t("badge_thanks", lang)}</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <button onClick={() => router.back()} aria-label={c("common_back")} style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginBottom: 4 }}>{c("companions_title")}</h1>
          <p style={{ fontSize: 12, color: "var(--text3)" }}>{c("companions_subtitle")}</p>
        </div>
        <div style={{ width: 38 }} />
      </div>

      {inviteUserId && inviteUserId !== userId && inviteProfile && (
        <div className="card" style={{ padding: 16, marginBottom: 16, border: "1px solid rgba(122,157,122,0.36)", background: "linear-gradient(180deg, var(--bg2), var(--sage-light))" }}>
          <p style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 850, marginBottom: 10 }}>{c("companions_invite_received")}</p>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: "var(--text)", marginBottom: 8 }}>
            {c("companions_invite_from", { name: inviteProfile.name || "Roots" })}
          </h2>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 14 }}>
            {c("companions_invite_accept_body")}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <ProfileLine profile={inviteProfile} />
            <button
              onClick={() => acceptInvite(inviteProfile.id)}
              disabled={busyIds.includes(`invite:${inviteProfile.id}`) || relationWith(inviteProfile.id)?.status === "accepted"}
              style={{ padding: "10px 12px", borderRadius: 14, border: "none", background: "var(--sage)", color: "var(--bg)", fontSize: 12, fontWeight: 850, cursor: "pointer", opacity: relationWith(inviteProfile.id)?.status === "accepted" ? 0.55 : 1, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
            >
              {busyIds.includes(`invite:${inviteProfile.id}`) ? <Loader2 size={13} className="spin" /> : <UserPlus size={13} />}
              {relationWith(inviteProfile.id)?.status === "accepted" ? c("companions_status_connected") : c("companions_accept_invite")}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 850, color: "var(--text)", marginBottom: 4 }}>{c("companions_invite_title")}</p>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5 }}>{c("companions_invite_desc")}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={shareInvite} style={{ flex: 1, padding: "12px 10px", borderRadius: 14, background: "var(--sage)", color: "var(--bg)", border: "none", fontSize: 13, fontWeight: 850, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer" }}>
            <Share2 size={14} /> {c("companions_invite_share")}
          </button>
          <button onClick={copyInvite} style={{ width: 46, borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Copy size={15} />
          </button>
        </div>
      </div>

      <SectionTitle>{c("companions_received_requests")}</SectionTitle>
      {received.length === 0 ? <EmptyCard text={c("companions_no_received_requests")} /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {received.map(row => (
            <div key={row.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <ProfileLine profile={row.other} />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => updateRequest(row, "accepted")} disabled={busyIds.includes(row.id)} style={{ width: 36, height: 36, borderRadius: 13, border: "none", background: "var(--sage)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {busyIds.includes(row.id) ? <Loader2 size={14} className="spin" /> : <Check size={15} />}
                </button>
                <button onClick={() => updateRequest(row, "declined")} disabled={busyIds.includes(row.id)} style={{ width: 36, height: 36, borderRadius: 13, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>{c("companions_my_companions")}</SectionTitle>
      {accepted.length === 0 ? <EmptyCard text={c("companions_empty") } /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {accepted.map(row => (
            <div key={row.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <ProfileLine profile={row.other} />
              <button onClick={() => setRemoveTarget(row)} disabled={busyIds.includes(row.id)} style={{ padding: "9px 11px", borderRadius: 13, border: "1px solid rgba(179,95,95,0.3)", background: "transparent", color: "#B35F5F", fontSize: 12, fontWeight: 850, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                {busyIds.includes(row.id) ? <Loader2 size={13} className="spin" /> : <UserMinus size={13} />}
                {c("companions_remove")}
              </button>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>{c("companions_sent_requests")}</SectionTitle>
      {sent.length === 0 ? <EmptyCard text={c("companions_no_sent_requests")} /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {sent.map(row => (
            <div key={row.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <ProfileLine profile={row.other} />
              <button onClick={() => deleteRelation(row)} disabled={busyIds.includes(row.id)} style={{ padding: "9px 11px", borderRadius: 13, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text3)", fontSize: 12, fontWeight: 850, cursor: "pointer", flexShrink: 0 }}>
                {c("companions_cancel_request")}
              </button>
            </div>
          ))}
        </div>
      )}

      {removeTarget && (
        <div onClick={() => setRemoveTarget(null)} style={{ position: "fixed", inset: 0, zIndex: 210, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 18px" }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 22, padding: 18, boxShadow: "0 20px 44px rgba(0,0,0,0.24)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", marginBottom: 8 }}>{c("companions_remove_confirm_title")}</h3>
            <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 14 }}>{c("companions_remove_confirm_body")}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setRemoveTarget(null)} style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text3)", fontSize: 12, fontWeight: 850, cursor: "pointer" }}>
                {c("cancel")}
              </button>
              <button onClick={() => deleteRelation(removeTarget)} disabled={busyIds.includes(removeTarget.id)} style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "none", background: "#E05050", color: "white", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
                {busyIds.includes(removeTarget.id) ? <Loader2 size={13} className="spin" /> : c("companions_remove_confirm_button")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 18 }} />
      <BottomNav />
    </main>
  );
}

export default function CompanionsPage() {
  return (
    <Suspense fallback={<main className="page-wrap" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 className="spin" size={22} style={{ color: "var(--sage)" }} /></main>}>
      <CompanionsContent />
    </Suspense>
  );
}
