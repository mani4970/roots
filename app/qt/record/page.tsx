"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t, type Lang, type TKey } from "@/lib/i18n";
import { translateBibleRef } from "@/lib/bibleBooks";
import { getDateLocale, parseLocalDateString } from "@/lib/date";
import { ChevronLeft, Loader2, Share2, Check, Copy, Globe, Lock, X } from "lucide-react";


// QT Record 전용 라벨 매핑
const QT_RECORD_LABEL_KEYS: Record<string, TKey> = {
  "돌아가기": "qt_record_back",
  "전체 복사": "qt_record_copy_all",
  "복사됨! ✓": "qt_record_copied",
  "나누기": "qt_record_share",
  "공유 중 (수정)": "qt_record_shared_edit",
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
  const [myGroups, setMyGroups] = useState<any[]>([]);
  // 다중 선택: "all" | groupId 배열
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  // 현재 공유 대상들
  const [sharedTargets, setSharedTargets] = useState<string[]>([]);
  const lang = useLang();
  const [badgePopup, setBadgePopup] = useState<{img:string;title:string;msg:string}|null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
        if (data) {
          setRecord(data);
          // 현재 공유 상태 파싱 (visibility는 "private" | "all" | "group_xxx" | "all,group_xxx,group_yyy")
          const v = data.visibility ?? "private";
          if (v !== "private") {
            setSharedTargets(v.split(",").filter(Boolean));
          }
        }
        // 내가 속한 그룹 — Supabase에서 로드
        if (user) {
          const { data: memberRows } = await supabase.from("group_members")
            .select("group_id").eq("user_id", user.id);
          const gIds = (memberRows ?? []).map((r: any) => r.group_id);
          if (gIds.length > 0) {
            const { data: groupData } = await supabase.from("groups")
              .select("id, name, is_public").in("id", gIds);
            setMyGroups(groupData ?? []);
          }
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

  async function doShare() {
    if (selectedTargets.length === 0) return;
    setSharing(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // visibility: "all,group_xxx,group_yyy" 형태로 저장
      // 단 "all"이 있으면 그룹도 포함해서 쉼표로 합치기
      const newVisibility = selectedTargets.join(",");
      const { error, data } = await supabase.from("qt_records")
        .update({ visibility: newVisibility })
        .eq("id", id)
        .eq("user_id", user?.id)
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
      setRecord((r: any) => ({ ...r, visibility: newVisibility }));
      setSharedTargets(selectedTargets);
      // 말씀 배달부 + 요셉 뱃지 체크
      // 전체 공개뿐 아니라 그룹 나눔도 QT 나눔으로 인정합니다.
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          const { data: prof } = await supabase.from("profiles")
            .select("badge_qt_bird, badge_joseph").eq("id", u.id).single();
          const { data: shares } = await supabase.from("qt_records")
            .select("id").eq("user_id", u.id).eq("is_draft", false)
            .not("visibility", "is", null).neq("visibility", "private");
          const shareCount = (shares?.length ?? 0);
          const updates: any = {};
          if (!prof?.badge_joseph && shareCount >= 1) {
            updates.badge_joseph = true;
          }
          if (!prof?.badge_qt_bird && shareCount >= 50) {
            updates.badge_qt_bird = true;
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from("profiles").update(updates).eq("id", u.id);
            if (updates.badge_joseph && !prof?.badge_joseph) {
              setBadgePopup({ img: "/badge_joseph.webp", title: t("qt_record_badge_joseph_title", lang), msg: t("badge_joseph_msg", lang) });
            } else if (updates.badge_qt_bird) {
              setBadgePopup({ img: "/badge_rootswoman_rest.webp", title: t("qt_record_badge_qt_bird_title", lang), msg: t("badge_qt_bird_msg", lang) });
            }
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

  async function unshare() {
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("qt_records")
        .update({ visibility: "private" })
        .eq("id", id)
        .eq("user_id", user?.id);
      if (error) throw error;
      setRecord((r: any) => ({ ...r, visibility: "private" }));
      setSharedTargets([]);
    } catch (error) {
      console.error("qt unshare failed", error);
      setNotice(t("qt_record_error_share", lang));
    }
  }

  function openShareModal() {
    // 현재 공유 중인 것들을 초기 선택으로
    setSelectedTargets(sharedTargets.length > 0 ? [...sharedTargets] : []);
    setShowShareModal(true);
  }

  function copyAll() {
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
    navigator.clipboard.writeText(parts).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function getShareLabel() {
    if (sharedTargets.length === 0) return null;
    const labels: string[] = [];
    if (sharedTargets.includes("all")) labels.push(trR("전체 커뮤니티", lang));
    sharedTargets.filter(t => t !== "all").forEach(t => {
      const gId = t.startsWith("group_") ? t.replace("group_", "") : t;
      const g = myGroups.find(g => g.id === gId);
      if (g) labels.push(`'${g.name}'`);
    });
    return labels.length > 0 ? t("qt_record_shared_label", lang, { labels: labels.join(", ") }) : null;
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>;
  if (!record) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "var(--text3)" }}>{t("qt_record_not_found", lang)}</p></div>;

  const isShared = sharedTargets.length > 0;
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
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 40 }}>
      {notice && (
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 220, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", maxWidth: 320, width: "calc(100% - 40px)", textAlign: "center" }}>
          {notice}
        </div>
      )}
      {badgePopup && (
        <div onClick={() => setBadgePopup(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,28,30,0.92)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
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
      <div style={{ background: "var(--bg)", padding: "56px 20px 18px", borderBottom: "1px solid var(--border)" }}>
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
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <button onClick={copyAll} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontSize: 12, color: copied ? "var(--sage-dark)" : "var(--text2)" }}>
          <Copy size={14} /> {copied ? trR("복사됨! ✓", lang) : trR("전체 복사", lang)}
        </button>
        {isShared ? (
          <button onClick={openShareModal} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 12, border: "1px solid var(--sage)", background: "var(--sage-light)", cursor: "pointer", fontSize: 12, color: "var(--sage-dark)" }}>
            <Check size={14} /> {trR("공유 중 (수정)", lang)}
          </button>
        ) : (
          <button onClick={openShareModal} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontSize: 12, color: "var(--text2)" }}>
            <Share2 size={14} /> {trR("나누기", lang)}
          </button>
        )}

      </div>

      {/* 나누기 모달 */}

      {/* 나누기 모달 */}
      {showShareModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 260, display: "flex", alignItems: "center", justifyContent: "center", padding: "calc(18px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom))", overflow: "hidden", overscrollBehavior: "contain" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 480, borderRadius: 26, padding: "20px 18px 16px", border: "1px solid var(--border)", maxHeight: "min(720px, calc(100dvh - 36px - env(safe-area-inset-top) - env(safe-area-inset-bottom)))", display: "flex", flexDirection: "column", boxShadow: "0 18px 52px rgba(0,0,0,0.28)", overflow: "hidden" }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{trR("큐티 나누기", lang)}</h2>
                <button onClick={() => setShowShareModal(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, marginBottom: 14 }}>{trR("여러 곳에 동시에 나눌 수 있어요 (복수 선택 가능)", lang)}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, overflowY: "auto", minHeight: 0, flex: "1 1 auto", paddingRight: 2, overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
              {/* 전체 커뮤니티 */}
              <button onClick={() => toggleTarget("all")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: `1px solid ${selectedTargets.includes("all") ? "var(--sage)" : "var(--border)"}`, background: selectedTargets.includes("all") ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "left", flexShrink: 0 }}>
                <Globe size={20} style={{ color: selectedTargets.includes("all") ? "var(--sage-dark)" : "var(--text3)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: selectedTargets.includes("all") ? "var(--sage-dark)" : "var(--text)" }}>{trR("전체 커뮤니티", lang)}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{trR("모든 Roots 사용자에게 공개", lang)}</p>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selectedTargets.includes("all") ? "var(--sage)" : "var(--border)"}`, background: selectedTargets.includes("all") ? "var(--sage)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {selectedTargets.includes("all") && <Check size={12} style={{ color: "white" }} />}
                </div>
              </button>

              {/* 내 그룹들 */}
              {myGroups.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginTop: 4, paddingLeft: 4, flexShrink: 0 }}>{trR("내 그룹", lang)}</p>
                  {myGroups.map(g => {
                    const key = `group_${g.id}`;
                    const isSelected = selectedTargets.includes(key);
                    return (
                      <button key={g.id} onClick={() => toggleTarget(key)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: `1px solid ${isSelected ? "var(--sage)" : "var(--border)"}`, background: isSelected ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "left", flexShrink: 0 }}>
                        <Lock size={20} style={{ color: isSelected ? "var(--sage-dark)" : "var(--text3)", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: isSelected ? "var(--sage-dark)" : "var(--text)" }}>{g.name}</p>
                          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{g.is_public ? trR("공개 그룹", lang) : trR("비공개 그룹", lang)}</p>
                        </div>
                        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isSelected ? "var(--sage)" : "var(--border)"}`, background: isSelected ? "var(--sage)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isSelected && <Check size={12} style={{ color: "white" }} />}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {myGroups.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "8px 0" }}>
                  {trR("그룹이 없어요. 커뮤니티에서 그룹을 만들어보세요!", lang)}
                </p>
              )}
            </div>

            <div style={{ flexShrink: 0, paddingTop: 4, background: "var(--bg2)" }}>
              {selectedTargets.length > 0 && (
                <p style={{ fontSize: 11, color: "var(--sage-dark)", textAlign: "center", marginBottom: 12, fontWeight: 600 }}>
                  {t("qt_record_selected_count", lang, { count: selectedTargets.length })}
                </p>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowShareModal(false)} className="btn-outline" style={{ flex: 1 }}>{trR("취소", lang)}</button>
                <button onClick={doShare} disabled={sharing || selectedTargets.length === 0} className="btn-sage" style={{ flex: 1 }}>
                  {sharing ? <Loader2 size={16} className="spin" /> : `${trR("나누기", lang)}${selectedTargets.length > 0 ? ` (${selectedTargets.length})` : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {(record?.qt_mode === "sunday"
          ? [...SECTIONS].sort((a, b) => { const order = ["opening_prayer","meditation","application","decision","closing_prayer","summary"]; return order.indexOf(a.key) - order.indexOf(b.key); })
          : SECTIONS
        ).map(({ key, label, italic, isDecision }) => {
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
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>}>
      <RecordContent />
    </Suspense>
  );
}
