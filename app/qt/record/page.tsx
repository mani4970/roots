"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t, type Lang } from "@/lib/i18n";
import { translateBibleRef } from "@/lib/bibleBooks";
import { ChevronLeft, Loader2, Share2, Check, Copy, Globe, Lock, X } from "lucide-react";


// QT Record 전용 번역 매핑
const QTR_TR: Record<string, Partial<Record<Lang, string>>> = {
  "돌아가기": { de: "Zurück" },
  "전체 복사": { de: "Alles kopieren" },
  "복사됨! ✓": { de: "Kopiert! ✓" },
  "나누기": { de: "Teilen" },
  "공유 중 (수정)": { de: "Geteilt (ändern)" },
  "취소": { de: "Abbrechen" },
  "큐티 나누기": { de: "Stille Zeit teilen" },
  "여러 곳에 동시에 나눌 수 있어요 (복수 선택 가능)": { de: "Gleichzeitig an mehrere Orte teilen (Mehrfachauswahl)" },
  "전체 커뮤니티": { de: "Gesamte Gemeinde" },
  "모든 Roots 사용자에게 공개": { de: "Für alle Roots-Nutzer sichtbar" },
  "내 그룹": { de: "Meine Gruppen" },
  "공개 그룹": { de: "Öffentliche Gruppe" },
  "비공개 그룹": { de: "Private Gruppe" },
  "그룹이 없어요. 커뮤니티에서 그룹을 만들어보세요!": { de: "Keine Gruppen. Erstellen Sie eine in der Gemeinde!" },
  "들어가는 기도": { de: "Eröffnungsgebet" },
  "본문 요약": { de: "Zusammenfassung" },
  "붙잡은 말씀": { de: "Schlüsselvers" },
  "느낌과 묵상": { de: "Empfinden & Meditation" },
  "성품 (적용)": { de: "Charakter (Anwendung)" },
  "행동 (결단)": { de: "Handlung (Entschluss)" },
  "올려드리는 기도": { de: "Abschlussgebet" },
};
function trR(s: string, lang: Lang): string { return lang === "ko" ? s : QTR_TR[s]?.[lang] ?? s; }

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

  useEffect(() => {
    async function load() {
      if (!id) return;
      const supabase = createClient();
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
      setLoading(false);
    }
    load();
  }, [id]);

  function toggleTarget(target: string) {
    setSelectedTargets(prev =>
      prev.includes(target) ? prev.filter(t => t !== target) : [...prev, target]
    );
  }

  async function doShare() {
    if (selectedTargets.length === 0) return;
    setSharing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // visibility: "all,group_xxx,group_yyy" 형태로 저장
    // 단 "all"이 있으면 그룹도 포함해서 쉼표로 합치기
    const newVisibility = selectedTargets.join(",");
    const { error, data } = await supabase.from("qt_records")
      .update({ visibility: newVisibility })
      .eq("id", id)
      .eq("user_id", user?.id)
      .select();
    if (!error && data && data.length > 0) {
      setRecord((r: any) => ({ ...r, visibility: newVisibility }));
      setSharedTargets(selectedTargets);
      // 말씀 배달부 + 요셉 뱃지 체크
      if (selectedTargets.includes("all")) {
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
            if (!prof?.badge_qt_bird && shareCount >= 30) {
              updates.badge_qt_bird = true;
            }
            if (Object.keys(updates).length > 0) {
              await supabase.from("profiles").update(updates).eq("id", u.id);
              if (updates.badge_joseph && !prof?.badge_joseph) {
                setBadgePopup({ img: "/badge_joseph.png", title: lang === "de" ? "Josef-Abzeichen! 🌈" : "요셉 배지 획득! 🌈", msg: t("badge_joseph_msg", lang) });
              } else if (updates.badge_qt_bird) {
                setBadgePopup({ img: "/qt_bird.png", title: lang === "de" ? "Wortüberbringer-Abzeichen! 🕊️" : "말씀 배달부 배지 획득! 🕊️", msg: t("badge_qt_bird_msg", lang) });
              }
            }
          }
        } catch (e) { /* 뱃지 체크 실패해도 나눔은 완료 */ }
      }
    }
    setSharing(false);
    setShowShareModal(false);
  }

  async function unshare() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("qt_records")
      .update({ visibility: "private" })
      .eq("id", id)
      .eq("user_id", user?.id);
    if (!error) {
      setRecord((r: any) => ({ ...r, visibility: "private" }));
      setSharedTargets([]);
    }
  }

  function openShareModal() {
    // 현재 공유 중인 것들을 초기 선택으로
    setSelectedTargets(sharedTargets.length > 0 ? [...sharedTargets] : []);
    setShowShareModal(true);
  }

  function copyAll() {
    if (!record) return;
    const date = new Date(record.date).toLocaleDateString(lang === "de" ? "de-DE" : "ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
    const decisions = record.decision
      ? record.decision.split("\n").filter((d: string) => d.trim()).map((d: string, i: number) => `${i + 1}. ${d}`).join("\n")
      : "";
    const parts = [
      `📖 ${date} · ${translateBibleRef(record.bible_ref, lang)}`,
      record.opening_prayer ? `\n들어가는 기도\n${record.opening_prayer}` : "",
      record.summary ? `\n본문 요약\n${record.summary}` : "",
      record.key_verse ? `\n붙잡은 말씀\n${record.key_verse}` : "",
      record.meditation ? `\n느낌과 묵상\n${record.meditation}` : "",
      (record.application || decisions) ? `\n적용과 결단\n${record.application ?? ""}${decisions ? "\n" + decisions : ""}` : "",
      record.closing_prayer ? `\n올려드리는 기도\n${record.closing_prayer}` : "",
      "\n\n— 말씀에 뿌리내리다, Roots",
    ].filter(Boolean).join("\n");
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
    return labels.length > 0 ? (lang === "de" ? `Geteilt: ${labels.join(", ")}` : `${labels.join(", ")}에 공유 중`) : null;
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>;
  if (!record) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "var(--text3)" }}>기록을 찾을 수 없어요</p></div>;

  const isShared = sharedTargets.length > 0;
  const SECTIONS = [
    { key: "opening_prayer", label: "들어가는 기도" },
    { key: "summary", label: "본문 요약" },
    { key: "key_verse", label: "붙잡은 말씀", italic: true },
    { key: "meditation", label: "느낌과 묵상" },
    { key: "application", label: "성품 (적용)" },
    { key: "decision", label: "행동 (결단)", isDecision: true },
    { key: "closing_prayer", label: "올려드리는 기도" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 40 }}>
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
              감사해요 🙏
            </button>
          </div>
        </div>
      )}
      <div style={{ background: "var(--bg)", padding: "56px 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{trR("돌아가기", lang)}</span>
        </button>
        <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>
          {new Date(record.date).toLocaleDateString(lang === "de" ? "de-DE" : "ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
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
      {showShareModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 480, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", border: "1px solid var(--border)", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{trR("큐티 나누기", lang)}</h2>
              <button onClick={() => setShowShareModal(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>{trR("여러 곳에 동시에 나눌 수 있어요 (복수 선택 가능)", lang)}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {/* 전체 커뮤니티 */}
              <button onClick={() => toggleTarget("all")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: `1px solid ${selectedTargets.includes("all") ? "var(--sage)" : "var(--border)"}`, background: selectedTargets.includes("all") ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "left" }}>
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
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginTop: 4, paddingLeft: 4 }}>{trR("내 그룹", lang)}</p>
                  {myGroups.map(g => {
                    const key = `group_${g.id}`;
                    const isSelected = selectedTargets.includes(key);
                    return (
                      <button key={g.id} onClick={() => toggleTarget(key)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: `1px solid ${isSelected ? "var(--sage)" : "var(--border)"}`, background: isSelected ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "left" }}>
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

            {selectedTargets.length > 0 && (
              <p style={{ fontSize: 11, color: "var(--sage-dark)", textAlign: "center", marginBottom: 12, fontWeight: 600 }}>
                {selectedTargets.length} {lang === "de" ? "Orte zum Teilen" : "곳에 나누기"}
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
      )}

      <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {SECTIONS.map(({ key, label, italic, isDecision }) => {
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
