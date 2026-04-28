"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { translateBibleRef } from "@/lib/bibleBooks";
import { t } from "@/lib/i18n";
import { getDateLocale, parseLocalDateString } from "@/lib/date";
import { Loader2, Plus, X, Users, Share2, Copy, Check, ChevronRight, ArrowLeft, Sparkles, Heart, HandHeart, BookOpen, CheckCircle2 } from "lucide-react";

const REACTIONS = [
  { id: "bless", label: "축복해요", label_de: "Gesegnet", label_en: "Blessed", label_fr: "Béni" },
  { id: "cheer", label: "응원해요", label_de: "Ermutigung", label_en: "Encouraged", label_fr: "Encouragé" },
  { id: "pray", label: "함께기도해요", label_de: "Gemeinsam beten", label_en: "Praying together", label_fr: "Prière ensemble" },
];

function ReactionIcon({ id, selected }: { id: string; selected: boolean }) {
  const color = selected ? "var(--sage-dark)" : "currentColor";
  if (id === "bless") return <Sparkles size={14} strokeWidth={1.9} style={{ color }} />;
  if (id === "cheer") return <Heart size={14} strokeWidth={1.9} style={{ color }} />;
  return <HandHeart size={14} strokeWidth={1.9} style={{ color }} />;
}

const APP_URL = "https://christian-roots.com";

function Avatar({ url, name, size = 28 }: { url?: string; name?: string; size?: number; emoji?: string }) {
  if (url) return <img src={url} alt={name ?? "프로필"} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  const initial = (name?.trim()?.[0] ?? "R").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--sage-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.36, fontWeight: 800, color: "var(--sage-dark)" }}>{initial}</span>
    </div>
  );
}

const SECTIONS = [
  { key: "opening_prayer", label: "들어가는 기도", label_de: "Eröffnungsgebet", label_en: "Opening Prayer", label_fr: "Prière d’ouverture" },
  { key: "summary", label: "본문 요약", label_de: "Zusammenfassung", label_en: "Summary", label_fr: "Résumé" },
  { key: "key_verse", label: "붙잡은 말씀", label_de: "Schlüsselvers", label_en: "Key Verse", label_fr: "Verset clé", italic: true },
  { key: "meditation", label: "느낌과 묵상", label_de: "Empfinden & Meditation", label_en: "Reflection & Meditation", label_fr: "Réflexion & méditation" },
  { key: "application", label: "성품 (적용)", label_de: "Charakter (Anwendung)", label_en: "Character (Application)", label_fr: "Caractère (application)" },
  { key: "decision", label: "행동 (결단)", label_de: "Handlung (Entschluss)", label_en: "Action (Resolution)", label_fr: "Action (décision)", isDecision: true },
  { key: "closing_prayer", label: "올려드리는 기도", label_de: "Abschlussgebet", label_en: "Closing Prayer", label_fr: "Prière finale" },
];

export default function CommunityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"prayer" | "qt" | "group">("prayer");
  const [prayerTab, setPrayerTab] = useState<"praying" | "answered">("praying");
  const lang = useLang();
  const [badgePopup, setBadgePopup] = useState<{img:string;title:string;msg:string}|null>(null);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [answeredPrayers, setAnsweredPrayers] = useState<any[]>([]);
  const [qtShares, setQtShares] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 중보기도
  const [prayedIds, setPrayedIds] = useState<string[]>([]);

  // 기도 응답 좋아요: user_id + prayer_id 기준으로 1회만 허용
  const [likedPrayerIds, setLikedPrayerIds] = useState<string[]>([]);

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
      // 기도 중 (미응답)
      const { data } = await supabase.from("prayer_items")
        .select("*").eq("visibility", "all").eq("is_answered", false)
        .order("created_at", { ascending: false });
      if (data) {
        const profMap = await fetchProfiles(supabase, data);
        setPrayers(data.map((r: any) => ({ ...r, profiles: profMap[r.user_id] ?? null })));
      }
      // 응답됨 (간증 있는 것)
      const { data: answered } = await supabase.from("prayer_items")
        .select("*").eq("visibility", "all").eq("is_answered", true)
        .order("answered_at", { ascending: false });
      if (answered) {
        const profMap2 = await fetchProfiles(supabase, answered);
        const answeredIds = answered.map((r: any) => r.id);
        let likeCounts: Record<string, number> = {};
        let myLikedIds: string[] = [];

        if (answeredIds.length > 0) {
          const { data: likes } = await supabase
            .from("prayer_likes")
            .select("prayer_id,user_id")
            .in("prayer_id", answeredIds);

          (likes ?? []).forEach((like: any) => {
            likeCounts[like.prayer_id] = (likeCounts[like.prayer_id] ?? 0) + 1;
            if (like.user_id === user.id) myLikedIds.push(like.prayer_id);
          });
        }

        setLikedPrayerIds(myLikedIds);
        setAnsweredPrayers(answered.map((r: any) => ({ ...r, like_count: likeCounts[r.id] ?? 0, profiles: profMap2[r.user_id] ?? null })));
      } else {
        setLikedPrayerIds([]);
        setAnsweredPrayers([]);
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

    // 바울 뱃지 체크 (함께 기도 30번)
    try {
      const { data: prof } = await supabase.from("profiles")
        .select("badge_paul").eq("id", user.id).single();
      if (!prof?.badge_paul) {
        const { data: logs } = await supabase.from("user_prayer_logs")
          .select("id").eq("user_id", user.id);
        if ((logs?.length ?? 0) >= 30) {
          await supabase.from("profiles").update({ badge_paul: true }).eq("id", user.id);
          setBadgePopup({ img: "/badge_paul.png", title: lang === "de" ? "Paulus-Abzeichen! 📜" : lang === "fr" ? "Badge Paul ! 📜" : lang === "en" ? "Paul Badge! 📜" : "바울 배지 획득! 📜", msg: t("badge_paul_msg", lang) });
        }
      }
    } catch (e) {}
  }

  async function createGroup() {
    if (!groupName.trim() || !userId) return;
    setSavingGroup(true);
    const supabase = createClient();
    // 베드로 뱃지 체크 (첫 그룹 만들기)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from("profiles")
          .select("badge_peter").eq("id", user.id).single();
        if (!prof?.badge_peter) {
          const { data: myGroups } = await supabase.from("groups")
            .select("id").eq("created_by", user.id);
          if ((myGroups?.length ?? 0) === 0) {
            await supabase.from("profiles").update({ badge_peter: true }).eq("id", user.id);
            setBadgePopup({ img: "/badge_peter.png", title: lang === "de" ? "Petrus-Abzeichen! 🐟" : lang === "fr" ? "Badge Pierre ! 🐟" : lang === "en" ? "Peter Badge! 🐟" : "베드로 배지 획득! 🐟", msg: t("badge_peter_msg", lang) });
          }
        }
      }
    } catch (e) {}
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
    const text = lang === "de" ? `🌱 Roots - Einladung zur Gruppe ${group.name}!\n\nEine christliche App zum Verwurzeln in Gottes Wort.\nKomm dazu 👇\n${APP_URL}/join?group=${group.id}` : lang === "fr" ? `🌱 Roots - Invitation to group ${group.name}!\n\nA Christian app to root yourself in God's Word.\nJoin us 👇\n${APP_URL}/join?group=${group.id}` : lang === "en" ? `🌱 Roots - Invitation to group ${group.name}!\n\nA Christian app to root yourself in God's Word.\nJoin us 👇\n${APP_URL}/join?group=${group.id}` : `🌱 Roots - ${group.name} 그룹에 초대합니다!\n\n말씀에 뿌리내리고, 함께 자라는 크리스천 앱이에요.\n함께해요 👇\n${APP_URL}/join?group=${group.id}`;
    if (navigator.share) navigator.share({ title: `Roots - ${group.name}`, text });
    else copyInviteLink(group.id);
  }

  function shareApp() {
    const text = lang === "de" ? `🌱 Roots - In Gottes Wort verwurzelt, gemeinsam wachsen\n\nEine christliche App mit Stille Zeit, Gebet und Vorsätzen.\nMach mit! 👇\n${APP_URL}` : lang === "fr" ? `🌱 Roots - Enraciné dans la Parole, grandir ensemble\n\nUne application chrétienne avec QT, prière et décisions.\nRejoignez-nous ! 👇\n${APP_URL}` : lang === "en" ? `🌱 Roots - Rooted in God's Word, growing together\n\nA Christian app with Quiet Time, Prayer and Resolutions.\nJoin us! 👇\n${APP_URL}` : `🌱 Roots - 말씀에 뿌리내리고, 함께 자라다\n\n매일 큐티, 기도, 결단으로 나무를 키우는 크리스천 앱이에요.\n같이 시작해요! 👇\n${APP_URL}`;
    if (navigator.share) navigator.share({ title: lang === "de" ? "Roots-Einladung" : lang === "fr" ? "Invitation Roots" : lang === "en" ? "Roots-Einladung" : "Roots 앱 초대", text });
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
              <ReactionIcon id={reaction.id} selected={isSelected} />
              <span>{lang === "de" ? reaction.label_de : lang === "fr" ? reaction.label_fr : lang === "en" ? reaction.label_en : reaction.label}</span>
              {count > 0 && <span style={{ fontWeight: 700, color: isSelected ? "var(--sage-dark)" : "var(--text2)", marginLeft: 2 }}>{count}</span>}
            </button>
          );
        })}

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
                <Avatar url={r.profiles?.avatar_url} name={r.profiles?.name} size={36} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{r.profiles?.name ?? (lang === "de" ? "Unbekannt" : lang === "fr" ? "Inconnu" : lang === "en" ? "Unknown" : "이름 없음")}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)" }}>{parseLocalDateString(r.date).toLocaleDateString(getDateLocale(lang), { month: "long", day: "numeric", weekday: "short" })}</p>
                </div>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={22} /></button>
            </div>
            {r.bible_ref && (
              <div style={{ background: "var(--terra-light)", borderRadius: 14, padding: "12px 14px", marginBottom: 16, border: "1px solid rgba(196,149,106,0.2)" }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "var(--terra-dark)" }}>{translateBibleRef(r.bible_ref, lang)}</p>
                {r.key_verse && <p style={{ fontSize: 13, color: "var(--terra-dark)", lineHeight: 1.7, marginTop: 6, fontStyle: "italic", whiteSpace: "pre-line" }}>"{r.key_verse}"</p>}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {SECTIONS.filter(s => s.key !== "key_verse" && r[s.key]).sort((a, b) => { if (r.qt_mode === "sunday") { const order = ["opening_prayer","meditation","application","decision","closing_prayer","summary"]; return order.indexOf(a.key) - order.indexOf(b.key); } return 0; }).map((s) => { const { key, label: rawLabel, label_de: rawLabelDe, label_en: rawLabelEn, label_fr: rawLabelFr, italic, isDecision } = s; const isSundaySummary = key === "summary" && r.qt_mode === "sunday"; const label = isSundaySummary ? "말씀 요약" : rawLabel; const label_de = isSundaySummary ? "Predigtzusammenfassung" : rawLabelDe; const label_en = isSundaySummary ? "Sermon Summary" : rawLabelEn; const label_fr = isSundaySummary ? "Résumé du message" : rawLabelFr; return (
                <div key={key}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>{lang === "de" ? label_de : lang === "fr" ? (label_fr ?? label_en) : lang === "en" ? label_en : label}</p>
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
              ); })}
            </div>
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 20, paddingTop: 16 }}>
              <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10, fontWeight: 600 }}>{lang === "de" ? "Reagieren Sie auf diese Stille Zeit" : lang === "fr" ? "Réagissez à ce QT" : lang === "en" ? "React to this Quiet Time" : "이 말씀 묵상에 반응해주세요"}</p>
              <ReactionButtons qtId={r.id} onReact={reactToQT} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const TABS = [{ id: "prayer", label: t("community_tab_prayer", lang) }, { id: "qt", label: t("community_tab_qt", lang) }, { id: "group", label: t("community_tab_group", lang) }];

  if (selectedGroup) {
    return (
      <div className="page">
        <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => { setSelectedGroup(null); setGroupQts([]); setDetailQt(null); }} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
            <ArrowLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{selectedGroup.name}</h1>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: selectedGroup.is_public ? "var(--sage-light)" : "var(--bg3)", color: selectedGroup.is_public ? "var(--sage-dark)" : "var(--text3)", border: `1px solid ${selectedGroup.is_public ? "rgba(122,157,122,0.3)" : "var(--border)"}` }}>
              {selectedGroup.is_public ? (lang === "de" ? "Öffentlich" : lang === "fr" ? "Public" : lang === "en" ? "Public" : "공개") : (lang === "de" ? "Privat" : lang === "fr" ? "Privé" : lang === "en" ? "Private" : "비공개")}
            </span>
          </div>
          {selectedGroup.description && <p style={{ fontSize: 13, color: "var(--text3)" }}>{selectedGroup.description}</p>}
          <p style={{ fontSize: 12, color: "var(--sage-dark)", marginTop: 6, fontWeight: 600 }}>{lang === "de" ? `👥 ${selectedGroup.member_count} Mitglieder` : lang === "fr" ? `👥 ${selectedGroup.member_count} membres` : lang === "en" ? `👥 ${selectedGroup.member_count} members` : `👥 ${selectedGroup.member_count}명 참여 중`}</p>
        </div>

        <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {!selectedGroup.isMember ? (
              <button onClick={() => joinGroup(selectedGroup.id)} className="btn-sage" style={{ flex: 1 }}>{lang === "de" ? "Beitreten" : lang === "fr" ? "Rejoindre" : lang === "en" ? "Join" : "참여하기"}</button>
            ) : (
              <div style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg2)", textAlign: "center", fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>{lang === "de" ? "✓ Mitglied" : lang === "fr" ? "✓ Membre" : lang === "en" ? "✓ Member" : "✓ 참여 중"}</div>
            )}
            <button onClick={() => copyInviteLink(selectedGroup.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: copiedId === selectedGroup.id ? "var(--sage-light)" : "var(--bg2)", cursor: "pointer", fontSize: 12, color: copiedId === selectedGroup.id ? "var(--sage-dark)" : "var(--text2)", fontWeight: 600 }}>
              {copiedId === selectedGroup.id ? <Check size={13} /> : <Copy size={13} />}
              {copiedId === selectedGroup.id ? (lang === "de" ? "Kopiert!" : lang === "fr" ? "Copié !" : lang === "en" ? "Copied!" : "복사됨!") : (lang === "de" ? "Link kopieren" : lang === "fr" ? "Copier le lien" : lang === "en" ? "Copy link" : "링크 복사")}
            </button>
            <button onClick={() => shareInvite(selectedGroup)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "12px", borderRadius: 14, background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.3)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--sage-dark)" }}>
              <Share2 size={13} />{lang === "de" ? "Einladen" : lang === "fr" ? "Inviter" : lang === "en" ? "Invite" : "초대"}
            </button>
          </div>

          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>{lang === "de" ? "Gruppen-QT-Austausch" : lang === "fr" ? "Partage QT du groupe" : lang === "en" ? "Group QT exchange" : "그룹 큐티 나눔"}</p>
            {loadingGroupQts ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} style={{ color: "var(--sage)" }} className="spin" /></div>
            ) : groupQts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--border)" }}>
                <BookOpen size={24} style={{ color: "var(--text3)", marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: "var(--text3)" }}>{lang === "de" ? "Noch keine geteilten QTs in dieser Gruppe" : lang === "fr" ? "Aucun QT partagé dans ce groupe pour l’instant" : lang === "en" ? "No shared QTs in this group yet" : "아직 이 그룹에 나눈 큐티가 없어요"}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {groupQts.map(r => (
                  <div key={r.id} className="card" style={{ cursor: "pointer" }} onClick={() => setDetailQt(r)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar url={r.profiles?.avatar_url} name={r.profiles?.name} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{r.profiles?.name ?? (lang === "de" ? "Unbekannt" : lang === "fr" ? "Inconnu" : lang === "en" ? "Unknown" : "이름 없음")}</span>
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>{parseLocalDateString(r.date).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--terra)", marginBottom: 4 }}>{r.bible_ref ? translateBibleRef(r.bible_ref, lang) : (lang === "de" ? "Freie Meditation" : lang === "fr" ? "Méditation libre" : lang === "en" ? "Free Meditation" : "자유 묵상")}</p>
                    {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 10 }}>"{r.key_verse.slice(0, 60)}{r.key_verse.length > 60 ? "..." : ""}"</p>}
                    <div onClick={e => e.stopPropagation()}>
                      <ReactionButtons qtId={r.id} onReact={reactToQT} />
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 8, textAlign: "right" }}>{lang === "de" ? "Antippen für Details →" : lang === "fr" ? "Appuyez pour voir les détails →" : lang === "en" ? "Tap for details →" : "탭하여 전체 보기 →"}</p>
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
              {lang === "de" ? "Danke" : lang === "fr" ? "Merci" : lang === "en" ? "Thank you" : "감사해요"}
            </button>
          </div>
        </div>
      )}
      <div style={{ background: "var(--bg)", padding: "56px 20px 0", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>{lang === "de" ? "Gemeinde" : lang === "fr" ? "Communauté" : lang === "en" ? "Community" : "커뮤니티"}</h1>
            <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>{lang === "de" ? "Gemeinsam beten und Gottes Wort teilen" : lang === "fr" ? "Prier ensemble et partager la Parole de Dieu" : lang === "en" ? "Pray together and share God's Word" : "함께 기도하고 말씀을 나눠요"}</p>
          </div>
          <button onClick={shareApp} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.3)", borderRadius: 20, padding: "7px 12px", cursor: "pointer", marginTop: 4 }}>
            <Share2 size={13} style={{ color: "var(--sage-dark)" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--sage-dark)" }}>{lang === "de" ? "Einladen" : lang === "fr" ? "Inviter" : lang === "en" ? "Invite" : "앱 초대"}</span>
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
          <>
            {/* 기도 중 / 응답됐어요 서브탭 */}
            <div style={{ display: "flex", marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
              {[
                { key: "praying", label: lang === "de" ? "Im Gebet" : lang === "fr" ? "En prière" : lang === "en" ? "Praying" : "기도 중", count: prayers.length },
                { key: "answered", label: lang === "de" ? "Erhört ✨" : lang === "fr" ? "Exaucées ✨" : lang === "en" ? "Answered ✨" : "응답됐어요 ✨", count: answeredPrayers.length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setPrayerTab(key as any)}
                  style={{ flex: 1, padding: "10px 0 12px", background: "none", border: "none", borderBottom: prayerTab === key ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <span style={{ fontSize: 13, fontWeight: prayerTab === key ? 700 : 400, color: prayerTab === key ? "var(--sage-dark)" : "var(--text3)" }}>{label}</span>
                  {count > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: prayerTab === key ? "var(--bg)" : "var(--text3)", background: prayerTab === key ? "var(--sage)" : "var(--border)", borderRadius: 20, padding: "1px 7px" }}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 기도 중 */}
            {prayerTab === "praying" && (
              prayers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <HandHeart size={30} style={{ color: "var(--text3)", marginBottom: 10 }} />
                  <p style={{ color: "var(--text3)", fontSize: 14 }}>{lang === "de" ? "Noch keine Fürbitten" : lang === "fr" ? "Aucune demande d’intercession pour l’instant" : lang === "en" ? "No intercession requests yet" : "아직 중보기도 요청이 없어요"}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {prayers.map(p => (
                    <div key={p.id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Avatar url={p.profiles?.avatar_url} name={p.profiles?.name} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{p.profiles?.name ?? (lang === "de" ? "Unbekannt" : lang === "fr" ? "Inconnu" : lang === "en" ? "Unknown" : "이름 없음")}</span>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}</span>
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", marginBottom: 12, whiteSpace: "pre-line" }}>{p.content}</p>
                      <button onClick={() => prayTogether(p.id)} disabled={prayedIds.includes(p.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px", borderRadius: 12, border: `1px solid ${prayedIds.includes(p.id) ? "var(--sage)" : "var(--border)"}`, background: prayedIds.includes(p.id) ? "var(--sage-light)" : "var(--bg2)", cursor: prayedIds.includes(p.id) ? "default" : "pointer" }}>
                        <span style={{ fontSize: 14 }}>{prayedIds.includes(p.id) ? <CheckCircle2 size={14} /> : <HandHeart size={14} />}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: prayedIds.includes(p.id) ? "var(--sage-dark)" : "var(--text2)" }}>
                          {prayedIds.includes(p.id)
                            ? (lang === "de" ? `Gebetet${(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}` : ""}` : lang === "fr" ? `J'ai prié${(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}` : ""}` : lang === "en" ? `Prayed${(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}` : ""}` : `기도했어요${(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}명` : ""}`)
                            : (lang === "de" ? `Gemeinsam beten${(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}` : ""}` : lang === "fr" ? `Prier ensemble${(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}` : ""}` : lang === "en" ? `Pray together${(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}` : ""}` : `함께 기도할게요${(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}명` : ""}`)}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* 응답됐어요 */}
            {prayerTab === "answered" && (
              answeredPrayers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <p style={{ fontSize: 32, marginBottom: 10 }}>✨</p>
                  <p style={{ color: "var(--text3)", fontSize: 14 }}>{lang === "de" ? "Noch keine erhörten Gebete" : lang === "fr" ? "Aucune prière exaucée pour l’instant" : lang === "en" ? "No answered prayers yet" : "아직 응답된 기도가 없어요"}</p>
                  <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 6 }}>{lang === "de" ? "Erhörte Gebete erscheinen hier" : lang === "fr" ? "Les prières exaucées apparaîtront ici" : lang === "en" ? "Answered prayers appear here" : "기도가 응답되면 이곳에 나타나요"}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {answeredPrayers.map(p => (
                    <div key={p.id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Avatar url={p.profiles?.avatar_url} name={p.profiles?.name} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{p.profiles?.name ?? (lang === "de" ? "Unbekannt" : lang === "fr" ? "Inconnu" : lang === "en" ? "Unknown" : "이름 없음")}</span>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--text3)" }}>
                          {p.answered_at ? new Date(p.answered_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" }) : ""}
                        </span>
                      </div>
                      {/* 기도 제목 */}
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", marginBottom: 8, whiteSpace: "pre-line", textDecoration: "line-through", opacity: 0.7 }}>{p.content}</p>
                      {/* 간증 */}
                      {p.testimony && (
                        <div style={{ background: "rgba(232,197,71,0.08)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(232,197,71,0.25)", marginBottom: 8 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(232,197,71,0.9)", marginBottom: 4 }}>{lang === "de" ? "Gebetszeugnis" : lang === "fr" ? "Témoignage de prière" : lang === "en" ? "Prayer testimony" : "기도 응답 간증"}</p>
                          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic" }}>"{p.testimony}"</p>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--sage-dark)", fontWeight: 600 }}>{lang === "de" ? "Erhört" : lang === "fr" ? "Exaucée" : lang === "en" ? "Answered" : "응답됨"}</span>
                          {(p.prayer_count ?? 0) > 0 && (
                            <span style={{ fontSize: 11, color: "var(--text3)" }}>{lang === "de" ? `· ${p.prayer_count} haben mitgebetet` : lang === "fr" ? `· ${p.prayer_count} ont prié ensemble` : lang === "en" ? `· ${p.prayer_count} prayed together` : `· ${p.prayer_count}명이 함께 기도했어요`}</span>
                          )}
                        </div>
                        {/* 좋아요 */}
                        <button
                          onClick={async () => {
                            if (!userId || likedPrayerIds.includes(p.id)) return;
                            const supabase = createClient();
                            const { error } = await supabase
                              .from("prayer_likes")
                              .insert({ prayer_id: p.id, user_id: userId });

                            // 23505 = unique violation. 이미 누른 경우에는 화면만 동기화합니다.
                            if (error && error.code !== "23505") return;

                            setLikedPrayerIds(prev => prev.includes(p.id) ? prev : [...prev, p.id]);
                            setAnsweredPrayers(prev => prev.map(ap => ap.id === p.id ? { ...ap, like_count: Math.max(ap.like_count ?? 0, (p.like_count ?? 0) + 1) } : ap));
                          }}
                          disabled={likedPrayerIds.includes(p.id)}
                          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: likedPrayerIds.includes(p.id) ? "default" : "pointer", padding: "4px 8px", borderRadius: 20 }}
                        >
                          <span style={{ fontSize: 18, color: likedPrayerIds.includes(p.id) ? "#E05050" : "var(--text3)", transition: "transform 0.2s", transform: likedPrayerIds.includes(p.id) ? "scale(1.1)" : "scale(1)" }}>
                            <Heart size={17} strokeWidth={1.9} fill={likedPrayerIds.includes(p.id) ? "#E05050" : "none"} />
                          </span>
                          {(p.like_count ?? 0) > 0 && (
                            <span style={{ fontSize: 12, color: likedPrayerIds.includes(p.id) ? "#E05050" : "var(--text3)", fontWeight: 700 }}>
                              {p.like_count}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>

        ) : tab === "qt" ? (
          <>
            <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12 }}>{lang === "de" ? "In der Gemeinde geteilte QTs" : lang === "fr" ? "QT partagés dans la communauté" : lang === "en" ? "QTs shared in the community" : "전체 커뮤니티에 공유된 큐티예요"}</p>
            {qtShares.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <BookOpen size={30} style={{ color: "var(--text3)", marginBottom: 10 }} />
                <p style={{ color: "var(--text3)", fontSize: 14 }}>{lang === "de" ? "Noch keine geteilten QTs" : lang === "fr" ? "Aucun QT partagé pour l’instant" : lang === "en" ? "No shared QTs yet" : "아직 나눈 큐티가 없어요"}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {qtShares.map(r => (
                  <div key={r.id} className="card" style={{ cursor: "pointer" }} onClick={() => setDetailQt(r)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar url={r.profiles?.avatar_url} name={r.profiles?.name} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{r.profiles?.name ?? (lang === "de" ? "Unbekannt" : lang === "fr" ? "Inconnu" : lang === "en" ? "Unknown" : "이름 없음")}</span>
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>{parseLocalDateString(r.date).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--terra)", marginBottom: 4 }}>{r.bible_ref ? translateBibleRef(r.bible_ref, lang) : (lang === "de" ? "Freie Meditation" : lang === "fr" ? "Méditation libre" : lang === "en" ? "Free Meditation" : "자유 묵상")}</p>
                    {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 10 }}>"{r.key_verse.slice(0, 60)}{r.key_verse.length > 60 ? "..." : ""}"</p>}
                    <div onClick={e => e.stopPropagation()}>
                      <ReactionButtons qtId={r.id} onReact={reactToQT} />
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 8, textAlign: "right" }}>{lang === "de" ? "Antippen für Details →" : lang === "fr" ? "Appuyez pour voir les détails →" : lang === "en" ? "Tap for details →" : "탭하여 전체 보기 →"}</p>
                  </div>
                ))}
              </div>
            )}
            {detailQt && <QTDetailModal r={detailQt} onClose={() => setDetailQt(null)} />}
          </>

        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setShowGroupForm(true)} className="btn-sage" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={16} /> {lang === "de" ? "Neue Gruppe erstellen" : lang === "fr" ? "Créer un groupe" : lang === "en" ? "Create new group" : "새 그룹 만들기"}
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
                        {g.is_public ? (lang === "de" ? "Öffentlich" : lang === "fr" ? "Public" : lang === "en" ? "Public" : "공개") : (lang === "de" ? "Privat" : lang === "fr" ? "Privé" : lang === "en" ? "Private" : "비공개")}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Users size={11} style={{ color: "var(--text3)" }} />
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>{g.member_count}</span>
                      {g.isMember && <span style={{ fontSize: 10, color: "var(--sage-dark)", fontWeight: 600, marginLeft: 6 }}>✓ {lang === "de" ? "Mitglied" : lang === "fr" ? "Membre" : lang === "en" ? "Member" : "참여 중"}</span>}
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
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{lang === "de" ? "Neue Gruppe erstellen" : lang === "fr" ? "Créer un groupe" : lang === "en" ? "Create new group" : "새 그룹 만들기"}</h2>
              <button onClick={() => setShowGroupForm(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{lang === "de" ? "Gruppenname *" : lang === "fr" ? "Nom du groupe *" : lang === "en" ? "Group name *" : "그룹 이름 *"}</label>
                <input type="text" className="input-field" placeholder={lang === "de" ? "z. B. Jugendgebetsgruppe" : lang === "fr" ? "ex. Groupe de prière des jeunes" : lang === "en" ? "e.g. Youth prayer group" : "예: 청년부 큐티 모임"} value={groupName} onChange={e => setGroupName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{lang === "de" ? "Beschreibung (optional)" : lang === "fr" ? "Description (optionnelle)" : lang === "en" ? "Description (optional)" : "소개 (선택)"}</label>
                <textarea className="textarea-field" rows={2} placeholder={lang === "de" ? "Gruppe beschreiben..." : lang === "fr" ? "Décrire le groupe..." : lang === "en" ? "Describe the group..." : "그룹을 소개해주세요..."} value={groupDesc} onChange={e => setGroupDesc(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 8 }}>{lang === "de" ? "Sichtbarkeit" : lang === "fr" ? "Visibilité" : lang === "en" ? "Visibility" : "공개 설정"}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ v: true, emoji: "🌍", label: lang === "de" ? "Öffentlich" : lang === "fr" ? "Public" : lang === "en" ? "Public" : "공개", sub: lang === "de" ? "Für alle sichtbar" : lang === "fr" ? "Visible par tous" : lang === "en" ? "Visible to all" : "누구나 볼 수 있어요" }, { v: false, emoji: "🔒", label: lang === "de" ? "Privat" : lang === "fr" ? "Privé" : lang === "en" ? "Private" : "비공개", sub: lang === "de" ? "Nur per Einladung" : lang === "fr" ? "By invitation only" : lang === "en" ? "By invitation only" : "초대링크로만 참여" }].map(opt => (
                    <button key={String(opt.v)} onClick={() => setIsPublic(opt.v)} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, border: `1px solid ${isPublic === opt.v ? "var(--sage)" : "var(--border)"}`, background: isPublic === opt.v ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 16, marginBottom: 3 }}>{opt.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isPublic === opt.v ? "var(--sage-dark)" : "var(--text)" }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn-outline" onClick={() => setShowGroupForm(false)} style={{ flex: 1 }}>{lang === "de" ? "Abbrechen" : lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "취소"}</button>
                <button className="btn-sage" onClick={createGroup} disabled={savingGroup || !groupName.trim()} style={{ flex: 1 }}>
                  {savingGroup ? <Loader2 size={16} className="spin" /> : (lang === "de" ? "Erstellen" : lang === "fr" ? "Créer" : lang === "en" ? "Create" : "만들기")}
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
