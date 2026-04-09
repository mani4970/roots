"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { Loader2, Plus, X, Users, Share2, Copy, Check, ChevronRight, ArrowLeft } from "lucide-react";

const REACTIONS = [
  { id: "bless", label: "축복해요", icon: "🙏" },
  { id: "cheer", label: "응원해요", icon: "💪" },
  { id: "pray", label: "함께기도해요", icon: "✨" },
];

const APP_URL = "https://roots-puce.vercel.app";

function Avatar({ url, name, size = 28, emoji = "🙏" }: { url?: string; name?: string; size?: number; emoji?: string }) {
  if (url) return <img src={url} alt={name ?? "프로필"} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--sage-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.4 }}>{emoji}</span>
    </div>
  );
}

const SECTIONS = [
  { key: "opening_prayer", label: "들어가는 기도" },
  { key: "summary", label: "본문 요약" },
  { key: "key_verse", label: "붙잡은 말씀", italic: true },
  { key: "meditation", label: "느낌과 묵상" },
  { key: "application", label: "성품 (적용)" },
  { key: "decision", label: "행동 (결단)", isDecision: true },
  { key: "closing_prayer", label: "올려드리는 기도" },
];

export default function CommunityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"prayer" | "qt" | "group">("prayer");
  const [prayers, setPrayers] = useState<any[]>([]);
  const [qtShares, setQtShares] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 중보기도
  const [prayedIds, setPrayedIds] = useState<string[]>([]);

  // 큐티 반응: { [qtId]: { bless: 3, cheer: 1, pray: 2 } }
  const [qtReactionCounts, setQtReactionCounts] = useState<Record<string, Record<string, number>>>({});
  // 내 반응: { [qtId]: "bless" | "cheer" | "pray" }
  const [myQtReactions, setMyQtReactions] = useState<Record<string, string>>({});

  // 그룹
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [savingGroup, setSavingGroup] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [groupQts, setGroupQts] = useState<any[]>([]);
  const [loadingGroupQts, setLoadingGroupQts] = useState(false);
  const [detailQt, setDetailQt] = useState<any | null>(null);

  useEffect(() => { loadData(); }, [tab]);

  // 프로필 fetch 헬퍼
  async function fetchProfiles(supabase: any, data: any[]) {
    const uids = Array.from(new Set(data.map((r: any) => r.user_id)));
    if (uids.length === 0) return {};
    const { data: profs } = await supabase.from("profiles").select("id, name, avatar_url").in("id", uids);
    const map: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { map[p.id] = p; });
    return map;
  }

  // qt_reactions 로드 헬퍼 - qtIds 목록의 반응 카운트 + 내 반응 가져오기
  async function fetchQtReactions(supabase: any, qtIds: string[], uid: string) {
    if (qtIds.length === 0) return { counts: {}, mine: {} };
    const { data: rxData } = await supabase.from("qt_reactions")
      .select("qt_id, reaction, user_id")
      .in("qt_id", qtIds);

    const counts: Record<string, Record<string, number>> = {};
    const mine: Record<string, string> = {};

    (rxData ?? []).forEach((r: any) => {
      if (!counts[r.qt_id]) counts[r.qt_id] = {};
      counts[r.qt_id][r.reaction] = (counts[r.qt_id][r.reaction] ?? 0) + 1;
      if (r.user_id === uid) mine[r.qt_id] = r.reaction;
    });
    return { counts, mine };
  }

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);

    // prayedIds: DB에서 로드
    const { data: prayLogs } = await supabase.from("user_prayer_logs")
      .select("prayer_id").eq("user_id", user.id);
    const dbPrayed = (prayLogs ?? []).map((r: any) => r.prayer_id);
    setPrayedIds(dbPrayed);
    localStorage.setItem(`comm_prayed_${user.id}`, JSON.stringify(dbPrayed));

    if (tab === "prayer") {
      const { data } = await supabase.from("prayer_items")
        .select("*").eq("visibility", "all").eq("is_answered", false)
        .order("created_at", { ascending: false });
      if (data) {
        const profMap = await fetchProfiles(supabase, data);
        setPrayers(data.map((r: any) => ({ ...r, profiles: profMap[r.user_id] ?? null })));
      }

    } else if (tab === "qt") {
      const { data } = await supabase.from("qt_records")
        .select("*").ilike("visibility", "%all%")
        .order("created_at", { ascending: false }).limit(30);
      if (data) {
        const profMap = await fetchProfiles(supabase, data);
        const withProfs = data.map((r: any) => ({ ...r, profiles: profMap[r.user_id] ?? null }));
        setQtShares(withProfs);
        // 반응 카운트 로드
        const qtIds = data.map((r: any) => r.id);
        const { counts, mine } = await fetchQtReactions(supabase, qtIds, user.id);
        setQtReactionCounts(counts);
        setMyQtReactions(mine);
      }

    } else {
      const { data: memberRows } = await supabase.from("group_members")
        .select("group_id").eq("user_id", user.id);
      const myGroupIds = (memberRows ?? []).map((r: any) => r.group_id);

      const { data: publicGroups } = await supabase.from("groups")
        .select("*").eq("is_public", true).order("created_at", { ascending: false });

      let myPrivateGroups: any[] = [];
      if (myGroupIds.length > 0) {
        const { data } = await supabase.from("groups")
          .select("*").eq("is_public", false).in("id", myGroupIds);
        myPrivateGroups = data ?? [];
      }

      const all = [...(publicGroups ?? []), ...myPrivateGroups];
      const unique = all.filter((g, i, arr) => arr.findIndex(x => x.id === g.id) === i);
      const withMeta = await Promise.all(unique.map(async (g) => {
        const { count } = await supabase.from("group_members")
          .select("*", { count: "exact", head: true }).eq("group_id", g.id);
        return { ...g, member_count: count ?? 0, isMember: myGroupIds.includes(g.id) };
      }));
      setGroups(withMeta);
    }
    setLoading(false);
  }

  async function loadGroupDetail(group: any) {
    setSelectedGroup(group);
    setLoadingGroupQts(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("qt_records")
      .select("*").ilike("visibility", `%group_${group.id}%`)
      .order("created_at", { ascending: false }).limit(30);
    if (data && user) {
      const profMap = await fetchProfiles(supabase, data);
      const withProfs = data.map((r: any) => ({ ...r, profiles: profMap[r.user_id] ?? null }));
      setGroupQts(withProfs);
      // 반응 카운트 로드
      const qtIds = data.map((r: any) => r.id);
      const { counts, mine } = await fetchQtReactions(supabase, qtIds, user.id);
      setQtReactionCounts(prev => ({ ...prev, ...counts }));
      setMyQtReactions(prev => ({ ...prev, ...mine }));
    }
    setLoadingGroupQts(false);
  }

  // 통합 반응 함수 (큐티 나눔 + 그룹 큐티 공용)
  async function reactToQT(qtId: string, reactionId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const myPrev = myQtReactions[qtId];

    if (myPrev === reactionId) {
      // 같은 반응 → 취소
      const { error: delErr } = await supabase.from("qt_reactions")
        .delete().eq("qt_id", qtId).eq("user_id", user.id);
      if (delErr) { console.error("반응 취소 실패:", delErr); return; }
      setMyQtReactions(prev => { const n = { ...prev }; delete n[qtId]; return n; });
      setQtReactionCounts(prev => ({
        ...prev,
        [qtId]: { ...prev[qtId], [reactionId]: Math.max(0, (prev[qtId]?.[reactionId] ?? 1) - 1) }
      }));
    } else {
      // 새 반응 or 변경 — insert 먼저, 실패하면 update
      const { error: upsertErr } = await supabase.from("qt_reactions").upsert(
        { qt_id: qtId, user_id: user.id, reaction: reactionId },
        { onConflict: "qt_id,user_id" }
      );
      if (upsertErr) {
        console.error("반응 저장 실패:", upsertErr);
        // onConflict가 안 먹히는 경우 update 시도
        const { error: updateErr } = await supabase.from("qt_reactions")
          .update({ reaction: reactionId })
          .eq("qt_id", qtId).eq("user_id", user.id);
        if (updateErr) { console.error("반응 update도 실패:", updateErr); return; }
      }
      setMyQtReactions(prev => ({ ...prev, [qtId]: reactionId }));
      setQtReactionCounts(prev => {
        const cur = { ...prev[qtId] };
        if (myPrev) cur[myPrev] = Math.max(0, (cur[myPrev] ?? 1) - 1);
        cur[reactionId] = (cur[reactionId] ?? 0) + 1;
        return { ...prev, [qtId]: cur };
      });
    }
  }

  async function prayTogether(id: string) {
    if (prayedIds.includes(id)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 중복 체크
    const { data: existing } = await supabase.from("user_prayer_logs")
      .select("id").eq("user_id", user.id).eq("prayer_id", id).maybeSingle();
    if (existing) {
      setPrayedIds(prev => prev.includes(id) ? prev : [...prev, id]);
      return;
    }

    // 로그 저장
    const { error: logError } = await supabase.from("user_prayer_logs")
      .insert({ user_id: user.id, prayer_id: id });
    if (logError) {
      if (logError.code === "23505") setPrayedIds(prev => [...prev, id]);
      return;
    }

    // 카운트 증가
    const { error: rpcError } = await supabase.rpc("increment_prayer_count", { prayer_id: id });
    let newCount = 0;
    if (rpcError) {
      const { data: cur } = await supabase.from("prayer_items").select("prayer_count").eq("id", id).single();
      newCount = (cur?.prayer_count ?? 0) + 1;
      await supabase.from("prayer_items").update({ prayer_count: newCount }).eq("id", id);
    } else {
      const { data: cur } = await supabase.from("prayer_items").select("prayer_count").eq("id", id).single();
      newCount = cur?.prayer_count ?? 1;
    }

    setPrayedIds(prev => [...prev, id]);
    localStorage.setItem(`comm_prayed_${user.id}`, JSON.stringify([...prayedIds, id]));
    setPrayers(prev => prev.map(p => p.id === id ? { ...p, prayer_count: newCount } : p));
  }

  async function createGroup() {
    if (!groupName.trim() || !userId) return;
    setSavingGroup(true);
    const supabase = createClient();
    const { data: newGroup, error } = await supabase.from("groups").insert({
      name: groupName.trim(), description: groupDesc.trim() || null,
      is_public: isPublic, created_by: userId,
    }).select().single();
    if (error || !newGroup) { setSavingGroup(false); return; }
    await supabase.from("group_members").insert({ group_id: newGroup.id, user_id: userId });
    setGroupName(""); setGroupDesc(""); setIsPublic(true); setShowGroupForm(false); setSavingGroup(false);
    loadData();
  }

  async function joinGroup(groupId: string) {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("group_members").upsert({ group_id: groupId, user_id: userId }, { onConflict: "group_id,user_id" });
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isMember: true, member_count: (g.member_count ?? 0) + 1 } : g));
    if (selectedGroup?.id === groupId) setSelectedGroup((g: any) => ({ ...g, isMember: true, member_count: (g.member_count ?? 0) + 1 }));
  }

  function copyInviteLink(groupId: string) {
    navigator.clipboard.writeText(`${APP_URL}/join?group=${groupId}`).then(() => { setCopiedId(groupId); setTimeout(() => setCopiedId(null), 2000); });
  }

  function shareInvite(group: any) {
    const text = `🌱 Roots - ${group.name} 그룹에 초대합니다!\n\n말씀에 뿌리내리고, 함께 자라는 크리스천 앱이에요.\n함께해요 👇\n${APP_URL}/join?group=${group.id}`;
    if (navigator.share) navigator.share({ title: `Roots - ${group.name}`, text });
    else copyInviteLink(group.id);
  }

  function shareApp() {
    const text = `🌱 Roots - 말씀에 뿌리내리고, 함께 자라다\n\n매일 큐티, 기도, 결단으로 나무를 키우는 크리스천 앱이에요.\n같이 시작해요! 👇\n${APP_URL}`;
    if (navigator.share) navigator.share({ title: "Roots 앱 초대", text });
    else navigator.clipboard.writeText(text);
  }

  // 반응 버튼 컴포넌트
  function ReactionButtons({ qtId, onReact }: { qtId: string; onReact: (qtId: string, rx: string) => void }) {
    const counts = qtReactionCounts[qtId] ?? {};
    const myRx = myQtReactions[qtId];
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {REACTIONS.map(reaction => {
          const count = counts[reaction.id] ?? 0;
          const isSelected = myRx === reaction.id;
          return (
            <button key={reaction.id} onClick={() => onReact(qtId, reaction.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 20, border: `1.5px solid ${isSelected ? "var(--sage)" : "var(--border)"}`, background: isSelected ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", fontSize: 12, color: isSelected ? "var(--sage-dark)" : "var(--text3)", fontWeight: isSelected ? 700 : 400, transition: "all 0.15s" }}>
              <span style={{ fontSize: 14 }}>{reaction.icon}</span>
              <span>{reaction.label}</span>
              {count > 0 && <span style={{ fontWeight: 700, color: isSelected ? "var(--sage-dark)" : "var(--text2)", marginLeft: 2 }}>{count}</span>}
            </button>
          );
        })}
        {total > 0 && (
          <span style={{ fontSize: 11, color: "var(--text3)", alignSelf: "center", marginLeft: 2 }}>총 {total}개</span>
        )}
      </div>
    );
  }

  // 큐티 전체보기 모달
  function QTDetailModal({ r, onClose }: { r: any; onClose: () => void }) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, overflowY: "auto" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px 40px" }}>
          <div style={{ background: "var(--bg2)", borderRadius: 24, border: "1px solid var(--border)", width: "100%", maxWidth: 480, padding: "24px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar url={r.profiles?.avatar_url} name={r.profiles?.name} size={36} emoji="📖" />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{r.profiles?.name ?? "이름 없음"}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)" }}>{new Date(r.date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</p>
                </div>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={22} /></button>
            </div>
            {r.bible_ref && (
              <div style={{ background: "var(--terra-light)", borderRadius: 14, padding: "12px 14px", marginBottom: 16, border: "1px solid rgba(196,149,106,0.2)" }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "var(--terra-dark)" }}>{r.bible_ref}</p>
                {r.key_verse && <p style={{ fontSize: 13, color: "var(--terra-dark)", lineHeight: 1.7, marginTop: 6, fontStyle: "italic", whiteSpace: "pre-line" }}>"{r.key_verse}"</p>}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {SECTIONS.filter(s => s.key !== "key_verse" && r[s.key]).map(({ key, label, italic, isDecision }) => (
                <div key={key}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
                  {isDecision ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {r[key].split("\n").filter((d: string) => d.trim()).map((d: string, i: number) => (
                        <p key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
                          <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>{i + 1}.</span> {d}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, fontStyle: italic ? "italic" : "normal", whiteSpace: "pre-line" }}>{r[key]}</p>
                  )}
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 20, paddingTop: 16 }}>
              <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10, fontWeight: 600 }}>이 말씀 묵상에 반응해주세요</p>
              <ReactionButtons qtId={r.id} onReact={reactToQT} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const TABS = [{ id: "prayer", label: "중보기도" }, { id: "qt", label: "큐티 나눔" }, { id: "group", label: "그룹" }];

  if (selectedGroup) {
    return (
      <div className="page">
        <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => { setSelectedGroup(null); setGroupQts([]); setDetailQt(null); }} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
            <ArrowLeft size={18} /><span style={{ fontSize: 13 }}>돌아가기</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{selectedGroup.name}</h1>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: selectedGroup.is_public ? "var(--sage-light)" : "var(--bg3)", color: selectedGroup.is_public ? "var(--sage-dark)" : "var(--text3)", border: `1px solid ${selectedGroup.is_public ? "rgba(122,157,122,0.3)" : "var(--border)"}` }}>
              {selectedGroup.is_public ? "공개" : "비공개"}
            </span>
          </div>
          {selectedGroup.description && <p style={{ fontSize: 13, color: "var(--text3)" }}>{selectedGroup.description}</p>}
          <p style={{ fontSize: 12, color: "var(--sage-dark)", marginTop: 6, fontWeight: 600 }}>👥 {selectedGroup.member_count}명 참여 중</p>
        </div>

        <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {!selectedGroup.isMember ? (
              <button onClick={() => joinGroup(selectedGroup.id)} className="btn-sage" style={{ flex: 1 }}>참여하기</button>
            ) : (
              <div style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg2)", textAlign: "center", fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>✓ 참여 중</div>
            )}
            <button onClick={() => copyInviteLink(selectedGroup.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: copiedId === selectedGroup.id ? "var(--sage-light)" : "var(--bg2)", cursor: "pointer", fontSize: 12, color: copiedId === selectedGroup.id ? "var(--sage-dark)" : "var(--text2)", fontWeight: 600 }}>
              {copiedId === selectedGroup.id ? <Check size={13} /> : <Copy size={13} />}
              {copiedId === selectedGroup.id ? "복사됨!" : "링크 복사"}
            </button>
            <button onClick={() => shareInvite(selectedGroup)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "12px", borderRadius: 14, background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.3)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--sage-dark)" }}>
              <Share2 size={13} />초대
            </button>
          </div>

          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>그룹 큐티 나눔</p>
            {loadingGroupQts ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} style={{ color: "var(--sage)" }} className="spin" /></div>
            ) : groupQts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 24, marginBottom: 8 }}>📖</p>
                <p style={{ fontSize: 13, color: "var(--text3)" }}>아직 이 그룹에 나눈 큐티가 없어요</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {groupQts.map(r => (
                  <div key={r.id} className="card" style={{ cursor: "pointer" }} onClick={() => setDetailQt(r)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar url={r.profiles?.avatar_url} name={r.profiles?.name} emoji="📖" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{r.profiles?.name ?? "이름 없음"}</span>
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(r.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--terra)", marginBottom: 4 }}>{r.bible_ref || "자유 묵상"}</p>
                    {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 10 }}>"{r.key_verse.slice(0, 60)}{r.key_verse.length > 60 ? "..." : ""}"</p>}
                    <div onClick={e => e.stopPropagation()}>
                      <ReactionButtons qtId={r.id} onReact={reactToQT} />
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 8, textAlign: "right" }}>탭하여 전체 보기 →</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {detailQt && <QTDetailModal r={detailQt} onClose={() => setDetailQt(null)} />}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ background: "var(--bg)", padding: "56px 20px 0", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>커뮤니티</h1>
            <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>함께 기도하고 말씀을 나눠요</p>
          </div>
          <button onClick={shareApp} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.3)", borderRadius: 20, padding: "7px 12px", cursor: "pointer", marginTop: 4 }}>
            <Share2 size={13} style={{ color: "var(--sage-dark)" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--sage-dark)" }}>앱 초대</span>
          </button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginTop: 12 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: tab === t.id ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "var(--sage-dark)" : "var(--text3)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>

        ) : tab === "prayer" ? (
          prayers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: 32, marginBottom: 10 }}>🙏</p>
              <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 중보기도 요청이 없어요</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {prayers.map(p => (
                <div key={p.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Avatar url={p.profiles?.avatar_url} name={p.profiles?.name} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{p.profiles?.name ?? "이름 없음"}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(p.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", marginBottom: 12, whiteSpace: "pre-line" }}>{p.content}</p>
                  <button onClick={() => prayTogether(p.id)} disabled={prayedIds.includes(p.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px", borderRadius: 12, border: `1px solid ${prayedIds.includes(p.id) ? "var(--sage)" : "var(--border)"}`, background: prayedIds.includes(p.id) ? "var(--sage-light)" : "var(--bg2)", cursor: prayedIds.includes(p.id) ? "default" : "pointer" }}>
                    <span style={{ fontSize: 14 }}>{prayedIds.includes(p.id) ? "✅" : "🙏"}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: prayedIds.includes(p.id) ? "var(--sage-dark)" : "var(--text2)" }}>
                      {prayedIds.includes(p.id)
                        ? `기도했어요${(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}명` : ""}`
                        : `함께 기도할게요${(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}명` : ""}`}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )

        ) : tab === "qt" ? (
          <>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12 }}>전체 커뮤니티에 공유된 큐티예요</p>
            {qtShares.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>📖</p>
                <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 나눈 큐티가 없어요</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {qtShares.map(r => (
                  <div key={r.id} className="card" style={{ cursor: "pointer" }} onClick={() => setDetailQt(r)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar url={r.profiles?.avatar_url} name={r.profiles?.name} emoji="📖" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{r.profiles?.name ?? "이름 없음"}</span>
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(r.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--terra)", marginBottom: 4 }}>{r.bible_ref || "자유 묵상"}</p>
                    {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 10 }}>"{r.key_verse.slice(0, 60)}{r.key_verse.length > 60 ? "..." : ""}"</p>}
                    <div onClick={e => e.stopPropagation()}>
                      <ReactionButtons qtId={r.id} onReact={reactToQT} />
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 8, textAlign: "right" }}>탭하여 전체 보기 →</p>
                  </div>
                ))}
              </div>
            )}
            {detailQt && <QTDetailModal r={detailQt} onClose={() => setDetailQt(null)} />}
          </>

        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setShowGroupForm(true)} className="btn-sage" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={16} /> 새 그룹 만들기
            </button>
            {groups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>👥</p>
                <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 그룹이 없어요</p>
              </div>
            ) : (
              groups.map(g => (
                <button key={g.id} onClick={() => loadGroupDetail(g)} style={{ width: "100%", textAlign: "left", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{g.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: g.is_public ? "var(--sage-light)" : "var(--bg3)", color: g.is_public ? "var(--sage-dark)" : "var(--text3)", border: `1px solid ${g.is_public ? "rgba(122,157,122,0.3)" : "var(--border)"}` }}>
                        {g.is_public ? "공개" : "비공개"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Users size={11} style={{ color: "var(--text3)" }} />
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>{g.member_count}명</span>
                      {g.isMember && <span style={{ fontSize: 10, color: "var(--sage-dark)", fontWeight: 600, marginLeft: 6 }}>✓ 참여 중</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: "var(--text3)", flexShrink: 0 }} />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {showGroupForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>새 그룹 만들기</h2>
              <button onClick={() => setShowGroupForm(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>그룹 이름 *</label>
                <input type="text" className="input-field" placeholder="예: 청년부 큐티 모임" value={groupName} onChange={e => setGroupName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>소개 (선택)</label>
                <textarea className="textarea-field" rows={2} placeholder="그룹을 소개해주세요..." value={groupDesc} onChange={e => setGroupDesc(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 8 }}>공개 설정</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ v: true, emoji: "🌍", label: "공개", sub: "누구나 볼 수 있어요" }, { v: false, emoji: "🔒", label: "비공개", sub: "초대링크로만 참여" }].map(opt => (
                    <button key={String(opt.v)} onClick={() => setIsPublic(opt.v)} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, border: `1px solid ${isPublic === opt.v ? "var(--sage)" : "var(--border)"}`, background: isPublic === opt.v ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 16, marginBottom: 3 }}>{opt.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isPublic === opt.v ? "var(--sage-dark)" : "var(--text)" }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn-outline" onClick={() => setShowGroupForm(false)} style={{ flex: 1 }}>취소</button>
                <button className="btn-sage" onClick={createGroup} disabled={savingGroup || !groupName.trim()} style={{ flex: 1 }}>
                  {savingGroup ? <Loader2 size={16} className="spin" /> : "만들기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
