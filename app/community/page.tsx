"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { Loader2, Plus, X, Users, Share2, Copy, Check, ChevronRight, ArrowLeft } from "lucide-react";

const REACTIONS = [
  { id: "bless", label: "축복해요", icon: "🙏" },
  { id: "cheer", label: "응원해요", icon: "💪" },
  { id: "pray", label: "기도해요", icon: "✨" },
];

const APP_URL = "https://roots-puce.vercel.app";


function Avatar({ url, name, size = 28 }: { url?: string; name?: string; size?: number }) {
  if (url) return (
    <img src={url} alt={name ?? "프로필"} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--sage-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.4 }}>🙏</span>
    </div>
  );
}

export default function CommunityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"prayer" | "qt" | "group">("prayer");
  const [prayers, setPrayers] = useState<any[]>([]);
  const [qtShares, setQtShares] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [prayedIds, setPrayedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [savingGroup, setSavingGroup] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [groupQts, setGroupQts] = useState<any[]>([]);
  const [loadingGroupQts, setLoadingGroupQts] = useState(false);

  useEffect(() => { loadData(); }, [tab]);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);

    const saved = localStorage.getItem(`comm_prayed_${user.id}`);
    if (saved) setPrayedIds(new Set(JSON.parse(saved)));
    const myRx = localStorage.getItem(`comm_reactions_${user.id}`);
    if (myRx) setMyReactions(JSON.parse(myRx));

    if (tab === "prayer") {
      const { data } = await supabase.from("prayer_items")
        .select("*, profiles(name, avatar_url)").eq("visibility", "all").eq("is_answered", false)
        .order("created_at", { ascending: false });
      if (data) setPrayers(data);

    } else if (tab === "qt") {
      const { data: memberRows } = await supabase.from("group_members")
        .select("group_id").eq("user_id", user.id);
      const myGroupIds = (memberRows ?? []).map((r: any) => `group_${r.group_id}`);
      const visibilities = ["all", ...myGroupIds];

      const { data } = await supabase.from("qt_records")
        .select("*, profiles(name, avatar_url)").in("visibility", visibilities)
        .order("created_at", { ascending: false }).limit(30);
      if (data) {
        setQtShares(data);
        const rxMap: Record<string, Record<string, number>> = {};
        data.forEach((r: any) => { if (r.reactions) rxMap[r.id] = r.reactions; });
        setReactions(rxMap);
      }

    } else {
      // 내가 속한 그룹 ID
      const { data: memberRows } = await supabase.from("group_members")
        .select("group_id").eq("user_id", user.id);
      const myGroupIds = (memberRows ?? []).map((r: any) => r.group_id);

      // 공개 그룹
      const { data: publicGroups } = await supabase.from("groups")
        .select("*").eq("is_public", true).order("created_at", { ascending: false });

      // 내가 속한 비공개 그룹
      let myPrivateGroups: any[] = [];
      if (myGroupIds.length > 0) {
        const { data } = await supabase.from("groups")
          .select("*").eq("is_public", false).in("id", myGroupIds);
        myPrivateGroups = data ?? [];
      }

      const all = [...(publicGroups ?? []), ...myPrivateGroups];
      const unique = all.filter((g, i, arr) => arr.findIndex(x => x.id === g.id) === i);

      // 멤버 수 + 내 참여 여부
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
    const { data } = await supabase.from("qt_records")
      .select("*, profiles(name, avatar_url)")
      .eq("visibility", `group_${group.id}`)
      .order("created_at", { ascending: false }).limit(20);
    setGroupQts(data ?? []);
    setLoadingGroupQts(false);
  }

  async function prayTogether(id: string) {
    if (prayedIds.has(id)) return;
    const supabase = createClient();
    const { data: current } = await supabase.from("prayer_items").select("prayer_count").eq("id", id).single();
    const newCount = (current?.prayer_count ?? 0) + 1;
    await supabase.from("prayer_items").update({ prayer_count: newCount }).eq("id", id);
    const newArr = Array.from(prayedIds).concat(id);
    setPrayedIds(new Set(newArr));
    if (userId) localStorage.setItem(`comm_prayed_${userId}`, JSON.stringify(newArr));
    setPrayers(prev => prev.map(p => p.id === id ? { ...p, prayer_count: newCount } : p));
  }

  function reactToQT(qtId: string, reactionId: string) {
    const current = reactions[qtId] ?? {};
    const myPrev = myReactions[qtId];
    let updated = { ...current };
    if (myPrev === reactionId) {
      updated[reactionId] = Math.max(0, (updated[reactionId] ?? 1) - 1);
      const newMy = { ...myReactions }; delete newMy[qtId];
      setMyReactions(newMy);
      if (userId) localStorage.setItem(`comm_reactions_${userId}`, JSON.stringify(newMy));
    } else {
      if (myPrev) updated[myPrev] = Math.max(0, (updated[myPrev] ?? 1) - 1);
      updated[reactionId] = (updated[reactionId] ?? 0) + 1;
      const newMy = { ...myReactions, [qtId]: reactionId };
      setMyReactions(newMy);
      if (userId) localStorage.setItem(`comm_reactions_${userId}`, JSON.stringify(newMy));
    }
    setReactions(prev => ({ ...prev, [qtId]: updated }));
  }

  async function createGroup() {
    if (!groupName.trim() || !userId) return;
    setSavingGroup(true);
    const supabase = createClient();
    const { data: newGroup, error } = await supabase.from("groups").insert({
      name: groupName.trim(),
      description: groupDesc.trim() || null,
      is_public: isPublic,
      created_by: userId,
    }).select().single();

    if (error || !newGroup) {
      console.error("그룹 생성 실패:", error);
      setSavingGroup(false);
      return;
    }

    await supabase.from("group_members").insert({ group_id: newGroup.id, user_id: userId });
    setGroupName(""); setGroupDesc(""); setIsPublic(true); setShowGroupForm(false); setSavingGroup(false);
    loadData();
  }

  async function joinGroup(groupId: string) {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("group_members").upsert(
      { group_id: groupId, user_id: userId },
      { onConflict: "group_id,user_id" }
    );
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, isMember: true, member_count: (g.member_count ?? 0) + 1 } : g
    ));
    if (selectedGroup?.id === groupId) {
      setSelectedGroup((g: any) => ({ ...g, isMember: true, member_count: (g.member_count ?? 0) + 1 }));
    }
  }

  function copyInviteLink(groupId: string) {
    const link = `${APP_URL}/join?group=${groupId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(groupId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function shareInvite(group: any) {
    const link = `${APP_URL}/join?group=${group.id}`;
    const text = `🌱 Roots - ${group.name} 그룹에 초대합니다!\n\n말씀에 뿌리내리고, 함께 자라는 크리스천 앱이에요.\n함께해요 👇\n${link}`;
    if (navigator.share) navigator.share({ title: `Roots - ${group.name}`, text });
    else copyInviteLink(group.id);
  }

  function shareApp() {
    const text = `🌱 Roots - 말씀에 뿌리내리고, 함께 자라다\n\n매일 큐티, 기도, 결단으로 나무를 키우는 크리스천 앱이에요.\n같이 시작해요! 👇\n${APP_URL}`;
    if (navigator.share) navigator.share({ title: "Roots 앱 초대", text });
    else navigator.clipboard.writeText(text);
  }

  const TABS = [
    { id: "prayer", label: "중보기도" },
    { id: "qt", label: "큐티 나눔" },
    { id: "group", label: "그룹" },
  ];

  if (selectedGroup) {
    return (
      <div className="page">
        <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => { setSelectedGroup(null); setGroupQts([]); }} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
            <ArrowLeft size={18} /><span style={{ fontSize: 13 }}>돌아가기</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{selectedGroup.name}</h1>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: selectedGroup.is_public ? "var(--sage-light)" : "var(--bg3)", color: selectedGroup.is_public ? "var(--sage-dark)" : "var(--text3)", border: `1px solid ${selectedGroup.is_public ? "rgba(122,157,122,0.3)" : "var(--border)"}` }}>
              {selectedGroup.is_public ? "공개" : "비공개"}
            </span>
          </div>
          {selectedGroup.description && <p style={{ fontSize: 13, color: "var(--text3)" }}>{selectedGroup.description}</p>}
          <p style={{ fontSize: 12, color: "var(--sage-dark)", marginTop: 6, fontWeight: 600 }}>👥 나 포함 {selectedGroup.member_count}명</p>
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
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                <Loader2 size={20} style={{ color: "var(--sage)" }} className="spin" />
              </div>
            ) : groupQts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 24, marginBottom: 8 }}>📖</p>
                <p style={{ fontSize: 13, color: "var(--text3)" }}>아직 이 그룹에 나눈 큐티가 없어요</p>
                <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>큐티 기록에서 이 그룹을 선택해 나눠보세요!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {groupQts.map(r => (
                  <div key={r.id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar url={r.profiles?.avatar_url} name={r.profiles?.name} size={28} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{r.profiles?.name ?? "익명"}</span>
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(r.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--terra)", marginBottom: 6 }}>{r.bible_ref}</p>
                    {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic" }}>"{r.key_verse.slice(0, 80)}{r.key_verse.length > 80 ? "..." : ""}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginTop: 12 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: tab === t.id ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "var(--sage-dark)" : "var(--text3)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
          </div>
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
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{p.profiles?.name ?? "익명"}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(p.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", marginBottom: 12 }}>{p.content}</p>
                  <button
                    onClick={() => prayTogether(p.id)}
                    disabled={prayedIds.has(p.id)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px", borderRadius: 12, border: `1px solid ${prayedIds.has(p.id) ? "var(--sage)" : "var(--border)"}`, background: prayedIds.has(p.id) ? "var(--sage-light)" : "var(--bg2)", cursor: prayedIds.has(p.id) ? "default" : "pointer" }}
                  >
                    <span style={{ fontSize: 14 }}>{prayedIds.has(p.id) ? "✅" : "🙏"}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: prayedIds.has(p.id) ? "var(--sage-dark)" : "var(--text2)" }}>
                      {prayedIds.has(p.id)
                        ? `기도했어요 · ${p.prayer_count ?? 0}명`
                        : `함께 기도할게요${(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}명` : ""}`}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )
        ) : tab === "qt" ? (
          qtShares.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: 32, marginBottom: 10 }}>📖</p>
              <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 나눈 큐티가 없어요</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {qtShares.map(r => {
                const isExpanded = expandedId === r.id;
                const rx = reactions[r.id] ?? {};
                return (
                  <div key={r.id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar url={r.profiles?.avatar_url} name={r.profiles?.name} size={28} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{r.profiles?.name ?? "익명"}</span>
                        {r.visibility !== "all" && <span style={{ fontSize: 9, color: "var(--text3)", background: "var(--bg3)", padding: "2px 6px", borderRadius: 8 }}>그룹</span>}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(r.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--terra)", marginBottom: 6 }}>{r.bible_ref}</p>
                    {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 8 }}>"{r.key_verse.slice(0, 60)}{r.key_verse.length > 60 ? "..." : ""}"</p>}
                    {isExpanded && r.meditation && (
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginBottom: 10 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 4 }}>느낌과 묵상</p>
                        <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.65 }}>{r.meditation}</p>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {REACTIONS.map(reaction => (
                          <button key={reaction.id} onClick={() => reactToQT(r.id, reaction.id)} style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 10px", borderRadius: 20, border: `1px solid ${myReactions[r.id] === reaction.id ? "var(--sage)" : "var(--border)"}`, background: myReactions[r.id] === reaction.id ? "var(--sage-light)" : "var(--bg2)", cursor: "pointer", fontSize: 11, color: myReactions[r.id] === reaction.id ? "var(--sage-dark)" : "var(--text3)" }}>
                            <span style={{ fontSize: 12 }}>{reaction.icon}</span>
                            {(rx[reaction.id] ?? 0) > 0 && <span>{rx[reaction.id]}</span>}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setExpandedId(isExpanded ? null : r.id)} style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>
                        {isExpanded ? "접기" : "더보기"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
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
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <Users size={11} style={{ color: "var(--text3)" }} />
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>{g.member_count}명</span>
                      </div>
                      {g.isMember && <span style={{ fontSize: 10, color: "var(--sage-dark)", fontWeight: 600 }}>✓ 참여 중</span>}
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
                  <button onClick={() => setIsPublic(true)} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, border: `1px solid ${isPublic ? "var(--sage)" : "var(--border)"}`, background: isPublic ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: 16, marginBottom: 3 }}>🌍</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isPublic ? "var(--sage-dark)" : "var(--text)" }}>공개</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>누구나 볼 수 있어요</div>
                  </button>
                  <button onClick={() => setIsPublic(false)} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, border: `1px solid ${!isPublic ? "var(--sage)" : "var(--border)"}`, background: !isPublic ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: 16, marginBottom: 3 }}>🔒</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: !isPublic ? "var(--sage-dark)" : "var(--text)" }}>비공개</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>초대링크로만 참여</div>
                  </button>
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
