"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConfettiBurst from "@/components/ConfettiBurst";
import PhotoViewerModal from "@/components/PhotoViewerModal";
import BottomNav from "@/components/BottomNav";
import SharePromptModal, { type ShareTargetGroup, type ShareTargetPartner } from "@/components/SharePromptModal";
import { createClient } from "@/lib/supabase";
import { loadSharePromptOptions } from "@/lib/sharePromptOptions";
import { useLang } from "@/lib/useLang";
import { t, type Lang, type TKey } from "@/lib/i18n";
import { translateBibleRef } from "@/lib/bibleBooks";
import { getDateLocale, parseLocalDateString } from "@/lib/date";
import { copyText } from "@/lib/nativeShare";
import { ChevronLeft, Loader2, Share2, Check, Copy, X, Edit3 } from "lucide-react";
import { createBibleReflectionShareNotificationsBestEffort } from "@/lib/notifications/create";


// QT Record 전용 라벨 매핑
const QT_RECORD_LABEL_KEYS: Record<string, TKey> = {
  "돌아가기": "qt_record_back",
  "전체 복사": "qt_record_copy_all",
  "복사됨! ✓": "qt_record_copied",
  "나누기": "qt_record_share",
  "공유 중 (수정)": "qt_record_shared_edit",
  "큐티 수정": "qt_record_edit",
  "취소": "qt_record_cancel",
  "큐티 나누기": "qt_record_share_title",
  "여러 곳에 동시에 나눌 수 있어요 (복수 선택 가능)": "qt_record_share_sub",
  "전체 커뮤니티": "qt_record_share_all",
  "모든 Roots 사용자에게 공개": "qt_record_share_all_sub",
  "내 그룹": "qt_record_my_groups",
  "공개 그룹": "qt_record_public_group",
  "비공개 그룹": "qt_record_private_group",
  "그룹이 없어요. 커뮤니티에서 그룹을 만들어보세요!": "qt_record_no_groups",
  "들어가는 기도": "qt_record_section_opening_prayer",
  "본문 요약": "qt_record_section_summary",
  "말씀 요약": "qt_record_section_sermon_summary",
  "붙잡은 말씀": "qt_record_section_key_verse",
  "느낌과 묵상": "qt_record_section_meditation",
  "성품 (적용)": "qt_record_section_application",
  "적용과 결단": "qt_record_section_application_decision",
  "행동 (결단)": "qt_record_section_decision",
  "올려드리는 기도": "qt_record_section_closing_prayer",
  "제목": "qt_record_sermon_title_label",
};
function trR(s: string, lang: Lang): string {
  const key = QT_RECORD_LABEL_KEYS[s];
  return key ? t(key, lang) : s;
}
function sectionLabel(key: string, qtMode?: string, lang?: Lang): string {
  if (key === "summary") return trR(qtMode === "sunday" ? "말씀 요약" : "본문 요약", lang || "ko");
  const map: Record<string, string> = {
    opening_prayer: "들어가는 기도",
    key_verse: "붙잡은 말씀",
    meditation: "느낌과 묵상",
    application: "성품 (적용)",
    decision: "행동 (결단)",
    closing_prayer: "올려드리는 기도",
  };
  return trR(map[key] || key, lang || "ko");
}

function RecordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [myGroups, setMyGroups] = useState<ShareTargetGroup[]>([]);
  const [myPartners, setMyPartners] = useState<ShareTargetPartner[]>([]);
  // 다중 선택: "all" | "group_<id>" | "partner_<id>" 배열
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  // 현재 공유 대상들
  const [sharedTargets, setSharedTargets] = useState<string[]>([]);
  const lang = useLang();
  const [badgePopup, setBadgePopup] = useState<{img:string;title:string;msg:string}|null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!showShareModal) return;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [showShareModal]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase.from("qt_records").select("*").eq("id", id).single();
        let visibilityTargets: string[] = [];
        if (data) {
          setRecord(data);
          if (data.photo_path) {
            const { data: signed } = await supabase.storage.from("qt-photos").createSignedUrl(data.photo_path, 60 * 60);
            setPhotoUrl(signed?.signedUrl ?? null);
          } else {
            setPhotoUrl(null);
          }
          // 현재 공유 상태 파싱 (visibility는 "private" | "all" | "group_xxx" | "all,group_xxx,group_yyy")
          const v = data.visibility ?? "private";
          visibilityTargets = v !== "private" ? v.split(",").map((part: string) => part.trim()).filter(Boolean) : [];
        }
        // 내가 속한 그룹 / 동역자 — 공통 나눔 옵션 로더로 로드
        // 완료 전 나눔 팝업과 기록 상세 나누기 팝업의 정렬 기준을 동일하게 유지합니다.
        if (user) {
          try {
            const shareOptions = await loadSharePromptOptions(t("profile_default_name", lang));
            setMyGroups(shareOptions.groups);
            setMyPartners(shareOptions.partners);
          } catch (shareOptionsError) {
            console.error("qt record share options load failed", shareOptionsError);
            setMyGroups([]);
            setMyPartners([]);
          }

          if (id) {
            const { data: recipientRows } = await supabase
              .from("qt_record_recipients")
              .select("recipient_id")
              .eq("qt_record_id", id)
              .eq("owner_id", user.id);
            const partnerTargets = (recipientRows ?? []).map((row: any) => `partner_${row.recipient_id}`).filter(Boolean);
            setSharedTargets(Array.from(new Set([...visibilityTargets, ...partnerTargets])));
          } else {
            setSharedTargets(visibilityTargets);
          }
        } else {
          setSharedTargets(visibilityTargets);
        }
      } catch (error) {
        console.error("qt record load failed", error);
        setNotice(t("qt_record_error_load", lang));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, lang]);

  function toggleTarget(target: string) {
    setSelectedTargets(prev =>
      prev.includes(target) ? prev.filter(t => t !== target) : [...prev, target]
    );
  }

  function splitShareTargets(targets: string[]) {
    const partnerRecipientIds = Array.from(new Set(
      targets
        .filter(target => target.startsWith("partner_"))
        .map(target => target.replace(/^partner_/, ""))
        .filter(Boolean)
    ));
    const visibilityTargets = Array.from(new Set(targets.filter(target => target === "all" || target.startsWith("group_"))));
    const visibility = visibilityTargets.length > 0 ? visibilityTargets.join(",") : "private";
    return { visibility, partnerRecipientIds };
  }

  async function replaceQtRecipients(supabase: ReturnType<typeof createClient>, qtRecordId: string, ownerId: string, recipientIds: string[]) {
    const { error: deleteError } = await supabase
      .from("qt_record_recipients")
      .delete()
      .eq("qt_record_id", qtRecordId)
      .eq("owner_id", ownerId);
    if (deleteError) throw deleteError;

    if (recipientIds.length === 0) return;

    const { error: insertError } = await supabase
      .from("qt_record_recipients")
      .insert(recipientIds.map(recipientId => ({
        qt_record_id: qtRecordId,
        owner_id: ownerId,
        recipient_id: recipientId,
      })));
    if (insertError) throw insertError;
  }

  async function saveShareTargets(privateOnly = false) {
    if (!id || (!privateOnly && selectedTargets.length === 0)) return;
    setSharing(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { visibility: newVisibility, partnerRecipientIds } = privateOnly
        ? { visibility: "private", partnerRecipientIds: [] as string[] }
        : splitShareTargets(selectedTargets);

      const sharedAt = newVisibility === "private" ? null : new Date().toISOString();
      let { error } = await supabase.from("qt_records")
        .update({ visibility: newVisibility, shared_at: sharedAt })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error && /shared_at/i.test(error.message ?? "")) {
        console.warn("qt_records.shared_at column is not available yet. Retrying visibility update without shared_at:", error.message);
        const retry = await supabase.from("qt_records")
          .update({ visibility: newVisibility })
          .eq("id", id)
          .eq("user_id", user.id);
        error = retry.error;
      }
      if (error) throw error;

      await replaceQtRecipients(supabase, id, user.id, partnerRecipientIds);

      if (!privateOnly) {
        await createBibleReflectionShareNotificationsBestEffort({
          qtRecordId: id,
          visibility: newVisibility,
          partnerRecipientIds,
        });
      }

      setRecord((r: any) => ({ ...r, visibility: newVisibility, shared_at: sharedAt }));
      setSharedTargets(privateOnly ? [] : Array.from(new Set(selectedTargets)));
      // 요셉(첫 QT 나눔), 말씀 배달부(30회), 말씀의 평안(50회) 배지 체크
      // 전체/그룹 공유와 동역자 공유 모두 QT 나눔으로 인정합니다.
      if (!privateOnly) {
        try {
            const { data: prof } = await supabase.from("profiles")
              .select("badge_qt_bird, badge_word_peace, badge_joseph").eq("id", user.id).single();
            const { data: visibilityShares } = await supabase.from("qt_records")
              .select("id").eq("user_id", user.id).eq("is_draft", false)
              .not("visibility", "is", null).neq("visibility", "private").neq("visibility", "");
            const { data: partnerShares } = await supabase.from("qt_record_recipients")
              .select("qt_record_id").eq("owner_id", user.id);
            const sharedIds = new Set([
              ...((visibilityShares ?? []).map((row: any) => row.id)),
              ...((partnerShares ?? []).map((row: any) => row.qt_record_id)),
            ]);
            const shareCount = sharedIds.size;
            const updates: any = {};
            if (!prof?.badge_joseph && shareCount >= 1) updates.badge_joseph = true;
            if (!prof?.badge_qt_bird && shareCount >= 30) updates.badge_qt_bird = true;
            if (!prof?.badge_word_peace && shareCount >= 50) updates.badge_word_peace = true;
            if (Object.keys(updates).length > 0) {
              await supabase.from("profiles").update(updates).eq("id", user.id);
              if (updates.badge_word_peace) {
                setBadgePopup({ img: "/badge_rootswoman_rest.webp", title: t("qt_record_badge_word_peace_title", lang), msg: t("badge_word_peace_msg", lang) });
              } else if (updates.badge_qt_bird) {
                setBadgePopup({ img: "/qt_bird.webp", title: t("qt_record_badge_qt_bird_title", lang), msg: t("badge_qt_bird_msg", lang) });
              } else if (updates.badge_joseph) {
                setBadgePopup({ img: "/badge_joseph.webp", title: t("qt_record_badge_joseph_title", lang), msg: t("badge_joseph_msg", lang) });
              }
            }
          } catch (e) { /* 뱃지 체크 실패해도 나눔은 완료 */ }
      }
      setShowShareModal(false);
    } catch (error) {
      console.error("qt share failed", error);
      setNotice(t("qt_record_error_share", lang));
    } finally {
      setSharing(false);
    }
  }

  function openShareModal() {
    // 현재 공유 중인 것들을 초기 선택으로
    setSelectedTargets(sharedTargets.length > 0 ? [...sharedTargets] : []);
    setShowShareModal(true);
  }

  async function copyAll() {
    if (!record) return;
    const isSunday = record.qt_mode === "sunday";
    // 한국어 + 주일예배일 때 날짜 끝에 "주일" 추가 (예: "2026년 5월 3일 주일")
    const dateObj = parseLocalDateString(record.date);
    const dateStrBase = dateObj.toLocaleDateString(getDateLocale(lang), { year: "numeric", month: "long", day: "numeric" });
    const dateStr = isSunday && lang === "ko"
      ? `${dateStrBase} 주일`
      : isSunday
        ? dateStrBase
        : dateObj.toLocaleDateString(getDateLocale(lang), { year: "numeric", month: "long", day: "numeric", weekday: "short" });
    const decisions = record.decision
      ? record.decision.split("\n").filter((d: string) => d.trim()).map((d: string, i: number) => `${i + 1}. ${d}`).join("\n")
      : "";

    // 주일예배 본문 형식: "설교: <제목> (<참조>)"
    // 복사 시: 첫 줄에 날짜 · 참조, 둘째 줄에 "제목: \n<제목>" 형태로
    let headerLine: string;
    if (isSunday) {
      const raw = String(record.bible_ref ?? "").trim();
      let title = "";
      let refsText = "";
      if (raw.startsWith("설교:")) {
        const body = raw.replace(/^설교:\s*/, "").trim();
        const match = body.match(/^(.*?)(?:\s*\((.*)\))?$/);
        title = (match?.[1] ?? "").trim();
        refsText = (match?.[2] ?? "").trim();
      } else {
        refsText = raw;
      }
      const translatedRefs = refsText ? translateBibleRef(refsText, lang) : "";
      headerLine = translatedRefs
        ? `📖 ${dateStr} · ${translatedRefs}\n${trR("제목", lang)}: ${title}`
        : `📖 ${dateStr}\n${trR("제목", lang)}: ${title}`;
    } else {
      headerLine = `📖 ${dateStr} · ${translateBibleRef(record.bible_ref, lang)}`;
    }

    // 주일예배: 화면 표시 순서대로 복사 (들어가는 기도 → 느낌과 묵상 → 적용과 결단 → 올려드리는 기도 → 말씀 요약)
    // 6단계: 기존 순서 유지 (들어가는 기도 → 본문 요약 → 붙잡은 말씀 → 느낌과 묵상 → 적용과 결단 → 올려드리는 기도)
    const sundayParts = [
      headerLine,
      record.opening_prayer ? `\n${trR("들어가는 기도", lang)}\n${record.opening_prayer}` : "",
      record.meditation ? `\n${trR("느낌과 묵상", lang)}\n${record.meditation}` : "",
      (record.application || decisions) ? `\n${trR("적용과 결단", lang)}\n${record.application ?? ""}${decisions ? "\n" + decisions : ""}` : "",
      record.closing_prayer ? `\n${trR("올려드리는 기도", lang)}\n${record.closing_prayer}` : "",
      record.summary ? `\n${trR("말씀 요약", lang)}\n${record.summary}` : "",
    ];

    const sixStepParts = [
      headerLine,
      record.opening_prayer ? `\n${trR("들어가는 기도", lang)}\n${record.opening_prayer}` : "",
      record.summary ? `\n${trR("본문 요약", lang)}\n${record.summary}` : "",
      record.key_verse ? `\n${trR("붙잡은 말씀", lang)}\n${record.key_verse}` : "",
      record.meditation ? `\n${trR("느낌과 묵상", lang)}\n${record.meditation}` : "",
      (record.application || decisions) ? `\n${trR("적용과 결단", lang)}\n${record.application ?? ""}${decisions ? "\n" + decisions : ""}` : "",
      record.closing_prayer ? `\n${trR("올려드리는 기도", lang)}\n${record.closing_prayer}` : "",
    ];

    const parts = (isSunday ? sundayParts : sixStepParts).filter(Boolean).join("\n");
    const ok = await copyText(parts);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setNotice(t("qt_record_error_share", lang));
    }
  }

  function goEdit() {
    if (!record?.id) return;
    router.push(`/qt/write?editId=${record.id}`);
  }

  function getShareLabel() {
    if (sharedTargets.length === 0) return null;
    const labels: string[] = [];
    if (sharedTargets.includes("all")) labels.push(trR("전체 커뮤니티", lang));
    sharedTargets.filter(target => target.startsWith("partner_")).forEach(target => {
      const partnerId = target.replace("partner_", "");
      const partner = myPartners.find(item => item.id === partnerId);
      if (partner) labels.push(`'${partner.name}'`);
    });
    sharedTargets.filter(target => target.startsWith("group_")).forEach(target => {
      const groupId = target.replace("group_", "");
      const group = myGroups.find(item => item.id === groupId);
      if (group) labels.push(`'${group.name}'`);
    });
    return labels.length > 0 ? t("qt_record_shared_label", lang, { labels: labels.join(", ") }) : null;
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: "calc(82px + var(--bottom-nav-bottom-padding))" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /><BottomNav /></div>;
  if (!record) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: "calc(82px + var(--bottom-nav-bottom-padding))" }}><p style={{ color: "var(--text3)" }}>{t("qt_record_not_found", lang)}</p><BottomNav /></div>;

  const isShared = sharedTargets.length > 0;
  const isPhotoRecord = record?.reflection_type === "photo" || record?.qt_mode === "photo" || !!record?.photo_path;
  const SECTIONS = [
    { key: "opening_prayer", label: sectionLabel("opening_prayer", record?.qt_mode, lang) },
    { key: "summary", label: sectionLabel("summary", record?.qt_mode, lang) },
    { key: "key_verse", label: sectionLabel("key_verse", record?.qt_mode, lang), italic: true },
    { key: "meditation", label: sectionLabel("meditation", record?.qt_mode, lang) },
    { key: "application", label: sectionLabel("application", record?.qt_mode, lang) },
    { key: "decision", label: sectionLabel("decision", record?.qt_mode, lang), isDecision: true },
    { key: "closing_prayer", label: sectionLabel("closing_prayer", record?.qt_mode, lang) },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: "calc(104px + var(--bottom-nav-bottom-padding))" }}>
      {notice && (
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 220, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", maxWidth: 320, width: "calc(100% - 40px)", textAlign: "center" }}>
          {notice}
        </div>
      )}
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
      <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{trR("돌아가기", lang)}</span>
        </button>
        <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>
          {parseLocalDateString(record.date).toLocaleDateString(getDateLocale(lang), { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--terra-dark)" }}>{translateBibleRef(record.bible_ref, lang)}</h1>
        {isShared && getShareLabel() && (
          <p style={{ fontSize: 11, color: "var(--sage-dark)", marginTop: 4 }}>📢 {getShareLabel()}</p>
        )}
      </div>

      {/* 액션 버튼 */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: isPhotoRecord ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <button onClick={copyAll} style={{ minWidth: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 6px", borderRadius: 12, border: copied ? "1px solid var(--sage)" : "1px solid var(--border)", background: copied ? "var(--sage-light)" : "var(--bg2)", cursor: "pointer", fontSize: 12, color: copied ? "var(--sage-dark)" : "var(--text2)", whiteSpace: "nowrap" }}>
          <Copy size={14} /> {copied ? trR("복사됨! ✓", lang) : trR("전체 복사", lang)}
        </button>
        <button onClick={openShareModal} style={{ minWidth: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 6px", borderRadius: 12, border: isShared ? "1px solid var(--sage)" : "1px solid var(--border)", background: isShared ? "var(--sage-light)" : "var(--bg2)", cursor: "pointer", fontSize: 12, color: isShared ? "var(--sage-dark)" : "var(--text2)", whiteSpace: "nowrap" }}>
          {isShared ? <Check size={14} /> : <Share2 size={14} />} {trR("나누기", lang)}
        </button>
        {!isPhotoRecord && (
          <button onClick={goEdit} style={{ minWidth: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 6px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>
            <Edit3 size={14} /> {trR("큐티 수정", lang)}
          </button>
        )}
      </div>

      {/* 나누기 모달 */}
      {showShareModal && (
        <SharePromptModal
          title={trR("큐티 나누기", lang)}
          description={trR("여러 곳에 동시에 나눌 수 있어요 (복수 선택 가능)", lang)}
          helperText={t("qt_complete_share_helper", lang)}
          allLabel={trR("전체 커뮤니티", lang)}
          allSubLabel={trR("모든 Roots 사용자에게 공개", lang)}
          partnersLabel={t("share_prompt_partners", lang)}
          partnerSubLabel={t("share_prompt_partner_sub", lang)}
          noPartnersLabel={t("share_prompt_no_partners", lang)}
          invitePartnersLabel={t("share_prompt_invite_partners", lang)}
          onInvitePartners={() => router.push("/community")}
          groupsLabel={trR("내 그룹", lang)}
          publicGroupLabel={trR("공개 그룹", lang)}
          privateGroupLabel={trR("비공개 그룹", lang)}
          noGroupsLabel={trR("그룹이 없어요. 커뮤니티에서 그룹을 만들어보세요!", lang)}
          selectedCountLabel={t("qt_record_selected_count", lang, { count: selectedTargets.length })}
          loadingLabel={t("loading", lang)}
          shareActionLabel={trR("나누기", lang)}
          privateActionLabel={t("share_prompt_private_action", lang)}
          closeLabel={t("close", lang)}
          groups={myGroups}
          partners={myPartners}
          selectedTargets={selectedTargets}
          saving={sharing}
          onToggleTarget={toggleTarget}
          onClose={() => setShowShareModal(false)}
          onPrivate={() => { void saveShareTargets(true); }}
          onShare={() => { void saveShareTargets(false); }}
        />
      )}

      {photoUrl && photoViewerOpen && <PhotoViewerModal src={photoUrl} alt="photo reflection" onClose={() => setPhotoViewerOpen(false)} />}

      {isPhotoRecord && (
        <div style={{ padding: "16px 16px 0" }}>
          <div className="card">
            {photoUrl ? (
              <button type="button" onClick={() => setPhotoViewerOpen(true)} style={{ width: "100%", display: "block", padding: 0, border: "none", background: "transparent", cursor: "zoom-in", marginBottom: record.photo_caption || record.meditation ? 12 : 0 }}>
                <img src={photoUrl} alt="photo reflection" loading="lazy" decoding="async" style={{ width: "100%", maxHeight: 520, objectFit: "contain", borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg3)" }} />
              </button>
            ) : (
              <div style={{ padding: 28, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>사진을 불러오는 중이에요.</div>
            )}
            {(record.photo_caption || record.meditation) && (
              <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-line" }}>{record.photo_caption || record.meditation}</p>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {(record?.qt_mode === "sunday"
          ? [...SECTIONS].sort((a, b) => { const order = ["opening_prayer","meditation","application","decision","closing_prayer","summary"]; return order.indexOf(a.key) - order.indexOf(b.key); })
          : SECTIONS
        ).map(({ key, label, italic, isDecision }) => {
          if (isPhotoRecord) return null;
          const value = record[key];
          if (!value) return null;
          return (
            <div key={key} className="card">
              <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>{trR(label, lang)}</p>
              {isDecision ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {value.split("\n").filter((d: string) => d.trim()).map((d: string, i: number) => (
                    <p key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>{i + 1}.</span> {d}
                    </p>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, fontStyle: italic ? "italic" : "normal", whiteSpace: "pre-line" }}>{value}</p>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: "calc(82px + var(--bottom-nav-bottom-padding))" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /><BottomNav /></div>}>
      <RecordContent />
    </Suspense>
  );
}
