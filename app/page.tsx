"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TreeGrowth from "@/components/TreeGrowth";
import Celebration from "@/components/Celebration";
import Onboarding from "@/components/Onboarding";
import RootsManPopup from "@/components/RootsManPopup";
import WelcomeBackPopup from "@/components/WelcomeBackPopup";
import LanguagePicker from "@/components/LanguagePicker";
import GardenUpdatePopup from "@/components/GardenUpdatePopup";
import { createClient } from "@/lib/supabase";
import { useLang, setPreferredLang, isFirstLaunch } from "@/lib/useLang";
import { getLanguageOptions, LANG_META, type Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { ChevronRight, Check, Globe } from "lucide-react";

function getGreetingKey(): "home_greeting_morning" | "home_greeting_afternoon" | "home_greeting_evening" | "home_greeting_night" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "home_greeting_morning";
  if (h >= 12 && h < 17) return "home_greeting_afternoon";
  if (h >= 17 && h < 21) return "home_greeting_evening";
  return "home_greeting_night";
}

function getTreeSubMsgKey(streak: number): "tree_sub_1"|"tree_sub_14"|"tree_sub_29"|"tree_sub_59"|"tree_sub_79"|"tree_sub_99"|"tree_sub_129"|"tree_sub_max" {
  if (streak <= 1) return "tree_sub_1";
  if (streak <= 14) return "tree_sub_14";
  if (streak <= 29) return "tree_sub_29";
  if (streak <= 59) return "tree_sub_59";
  if (streak <= 79) return "tree_sub_79";
  if (streak <= 99) return "tree_sub_99";
  if (streak <= 129) return "tree_sub_129";
  return "tree_sub_max";
}

const gardenTopRef_scroll = () => {
  window.scrollTo({ top: 0, behavior: "instant" });
};

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [todayVerse, setTodayVerse] = useState<any>(null);
  const [myDecisions, setMyDecisions] = useState<{text:string;done:boolean}[]>([]);
  const [todayDone, setTodayDone] = useState({ qt: false, prayer: false, decision: false });
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState({ show: false, message: "", subMessage: "" });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRootsMan, setShowRootsMan] = useState(false);
  const [showRootsManPopup, setShowRootsManPopup] = useState(false);
  const [gardenPopup, setGardenPopup] = useState<{show:boolean; type:"garden"|"badge"; badgeIndex:number}>({
    show: false, type: "garden", badgeIndex: 0,
  });
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [welcomeBackDays, setWelcomeBackDays] = useState(0);
  const lang = useLang();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showFirstLangPicker, setShowFirstLangPicker] = useState(false);
  const [badgePopup, setBadgePopup] = useState<{img:string;title:string;msg:string}|null>(null);
  const celebrationShownRef = useRef(false);

  const decisionDone = todayDone.decision || myDecisions.some(d => d.done);
  const allDone = todayDone.qt && todayDone.prayer && decisionDone;

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (p) {
      setProfile(p);
      // 복귀 팝업: 3일 이상 안 왔으면 표시
      const lastCheckin = p.last_checkin ? p.last_checkin.split("T")[0] : null;
      if (lastCheckin) {
        const lastDate = new Date(lastCheckin);
        lastDate.setHours(0,0,0,0);
        const todayDate = new Date(); todayDate.setHours(0,0,0,0);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);
        const welcomeKey = `welcome_back_${new Date().toISOString().split("T")[0]}`;
        if (diffDays >= 3 && !localStorage.getItem(welcomeKey)) {
          localStorage.setItem(welcomeKey, "true");
          setWelcomeBackDays(diffDays);
          setShowWelcomeBack(true);
        }
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: ci } = await supabase.from("daily_checkins")
      .select("verse,mission,completed_mission,reference,message,prayer_checked")
      .eq("user_id", user.id).eq("date", today).maybeSingle();
    if (ci) setTodayVerse(ci);

    const { data: tqt } = await supabase.from("qt_records").select("id,decision").eq("user_id", user.id).eq("date", today).eq("is_draft", false).maybeSingle();
    const { data: tp } = await supabase.from("prayer_items").select("id").eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`).maybeSingle();
    const prayerChecked = ci?.prayer_checked ?? false;

    if (tqt?.decision) {
      const decisions = tqt.decision.split("\n").filter((d: string) => d.trim());
      const { data: dc } = await supabase.from("daily_checkins")
        .select("decisions_done").eq("user_id", user.id).eq("date", today).maybeSingle();
      const doneList: boolean[] = dc?.decisions_done
        ? JSON.parse(dc.decisions_done)
        : decisions.map(() => false);
      setMyDecisions(decisions.map((text: string, i: number) => ({ text, done: doneList[i] ?? false })));
    }

    const decisionVal = ci?.completed_mission ?? false;
    setTodayDone({ qt: !!tqt, prayer: !!tp || prayerChecked, decision: decisionVal });

    if (localStorage.getItem(`celebrated_${today}`)) {
      celebrationShownRef.current = true;
    }
    // 첫 실행 언어 선택 (아직 한 번도 선택한 적 없다면)
    if (isFirstLaunch()) {
      setShowFirstLangPicker(true);
    }
    if (!localStorage.getItem("onboarding_done")) { setShowOnboarding(true); }
    setLoading(false);
  }

  // allDone 감지 — 루틴 완료 축하 + streak 업데이트
  useEffect(() => {
    const onboardingDone = localStorage.getItem("onboarding_done");
    if (!loading && allDone && !celebrationShownRef.current && onboardingDone) {
      const today = new Date().toISOString().split("T")[0];
      if (!localStorage.getItem(`celebrated_${today}`)) {
        celebrationShownRef.current = true;
        localStorage.setItem(`celebrated_${today}`, "true");

        // 3개 루틴 모두 완료 시 streak 업데이트
        updateStreak(today);

        const streak = profile?.streak_days ?? 0;
        setCelebration({
          show: true,
          message: t("home_celebration_title", lang),
          subMessage: `${t("home_celebration_sub_prefix", lang)}${t(getTreeSubMsgKey(streak), lang)}`,
        });
      }
    }
  }, [allDone, loading]);

  // streak 업데이트 함수 (3개 루틴 완료 시 호출)
  async function updateStreak(today: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: p } = await supabase.from("profiles")
      .select("streak_days, total_days, last_checkin, badge_angel, badge_rootsman, badge_rootsman_bible, badge_david, badge_mose").eq("id", user.id).single();
    if (!p) return;
    const lastCheckinDate = p.last_checkin ? p.last_checkin.split("T")[0] : null;
    // 오늘 이미 streak 업데이트 했으면 스킵
    if (lastCheckinDate === today) return;
    const last = p.last_checkin ? new Date(p.last_checkin) : null;
    // 하루 빠져도 streak 유지 - 그냥 이어서 카운트
    let newStreak = last ? (p.streak_days ?? 0) + 1 : 1;
    const alreadyHasAngel = p.badge_angel ?? false;
    const alreadyHasRootsman = p.badge_rootsman ?? false;
    const alreadyHasRootsmanBible = p.badge_rootsman_bible ?? false;
    const alreadyHasMose = p.badge_mose ?? false;
    const alreadyHasDavid = p.badge_david ?? false;
    const badgeUpdate: any = {
      streak_days: newStreak,
      total_days: (p.total_days ?? 0) + 1,
      last_checkin: today,
    };
    if (newStreak >= 7 && !alreadyHasRootsman) badgeUpdate.badge_rootsman = true;
    if (newStreak >= 40 && !alreadyHasMose) badgeUpdate.badge_mose = true;
    if (newStreak >= 52 && !alreadyHasRootsmanBible) badgeUpdate.badge_rootsman_bible = true;
    if (newStreak >= 111 && !alreadyHasDavid) badgeUpdate.badge_david = true;
    if (newStreak >= 900 && !alreadyHasAngel) badgeUpdate.badge_angel = true;

    await supabase.from("profiles").update(badgeUpdate).eq("id", user.id);
    setProfile((prev: any) => prev ? { ...prev, ...badgeUpdate } : prev);

    // 뱃지 팝업 (우선순위대로)
    if (newStreak >= 7 && !alreadyHasRootsman) {
      setBadgePopup({ img: "/badge_rootsman.png", title: lang === "de" ? "Rootsman-Abzeichen! 🧑‍🌾" : "루츠맨 배지 획득! 🧑‍🌾", msg: t("badge_rootsman_msg", lang) });
    } else if (newStreak >= 40 && !alreadyHasMose) {
      setBadgePopup({ img: "/badge_mose.png", title: lang === "de" ? "Mose-Abzeichen! 🪄" : "모세 배지 획득! 🪄", msg: t("badge_mose_msg", lang) });
    } else if (newStreak >= 52 && !alreadyHasRootsmanBible) {
      setBadgePopup({ img: "/badge_rootsman_bible.png", title: lang === "de" ? "Rootsman Bibel-Abzeichen! 📖" : "루츠맨 성경 배지 획득! 📖", msg: t("badge_rootsman_bible_msg", lang) });
    } else if (newStreak >= 111 && !alreadyHasDavid) {
      setBadgePopup({ img: "/badge_david.png", title: lang === "de" ? "David-Abzeichen! 🗡️" : "다윗 배지 획득! 🗡️", msg: t("badge_david_msg", lang) });
    } else if (newStreak >= 900 && !alreadyHasAngel) {
      setBadgePopup({ img: "/angel.png", title: lang === "de" ? "Engel-Abzeichen! 👼" : "천사 배지 획득! 👼", msg: t("badge_angel_msg", lang) });
    }
  }

  // 10일 업데이트 팝업 확인
  useEffect(() => {
    if (!profile) return;
    const streak = profile.streak_days ?? 0;
    if (streak === 0) return;
    const today = new Date().toISOString().split("T")[0];

    // 100일 배지
    if (streak % 100 === 0) {
      const badgeKey = `badge_shown_${streak}`;
      if (!localStorage.getItem(badgeKey)) {
        localStorage.setItem(badgeKey, "true");
        const badgeIndex = Math.floor(streak / 100) - 1;
        setGardenPopup({ show: true, type: "badge", badgeIndex });
        return;
      }
    }

    // 10일 정원 업데이트 (100의 배수 제외)
    if (streak % 10 === 0 && streak % 100 !== 0) {
      const gardenKey = `garden_shown_${streak}`;
      if (!localStorage.getItem(gardenKey)) {
        localStorage.setItem(gardenKey, "true");
        setGardenPopup({ show: true, type: "garden", badgeIndex: 0 });
      }
    }
  }, [profile]);

  async function togglePrayer() {
    if (todayDone.prayer) return; // 이미 완료면 취소 불가
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("daily_checkins").upsert({
      user_id: user.id,
      date: today,
      prayer_checked: true,
    }, { onConflict: "user_id,date" });
    setTodayDone(p => ({ ...p, prayer: true }));
  }

  async function toggleAiDecision() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    if (todayDone.decision) return;
    await supabase.from("daily_checkins").upsert({
      user_id: user.id, date: today, completed_mission: true,
    }, { onConflict: "user_id,date" });
    setTodayDone(p => ({ ...p, decision: true }));
    if (!celebrationShownRef.current) {
      const today2 = new Date().toISOString().split("T")[0];
      if (!localStorage.getItem(`celebrated_${today2}`)) {
        setCelebration({ show: true, message: t("home_decision_celeb", lang), subMessage: t("home_decision_celeb_sub", lang) });
      }
    }
  }

  async function toggleMyDecision(i: number) {
    if (myDecisions[i].done) return;
    const today = new Date().toISOString().split("T")[0];
    const updated = myDecisions.map((d, idx) => idx === i ? { ...d, done: true } : d);
    setMyDecisions(updated);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from("daily_checkins")
        .update({ decisions_done: JSON.stringify(updated.map(d => d.done)) })
        .eq("user_id", user.id).eq("date", today);
      if (error) {
        await supabase.from("daily_checkins").insert({
          user_id: user.id, date: today,
          decisions_done: JSON.stringify(updated.map(d => d.done)),
        });
      }
    }
    if (!celebrationShownRef.current) {
      if (!localStorage.getItem(`celebrated_${today}`)) {
        setCelebration({ show: true, message: t("home_decision_celeb", lang), subMessage: t("home_decision_celeb_sub", lang) });
      }
    }
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <svg width="80" height="100" viewBox="0 0 80 100" fill="none">
        <path d="M40 90 Q38 70 40 50" stroke="#7A9D7A" strokeWidth="3" strokeLinecap="round"/>
        <path d="M40 65 Q25 55 22 40 Q35 42 40 55" fill="#7A9D7A" opacity="0.85"/>
        <path d="M40 58 Q55 48 58 33 Q45 35 40 48" fill="#5C8A58" opacity="0.85"/>
        <ellipse cx="40" cy="90" rx="18" ry="5" fill="#C4956A" opacity="0.4"/>
      </svg>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: 6 }}>Roots</h1>
        <p style={{ fontSize: 13, color: "var(--text3)" }}>{t("home_loading_sub", lang)}</p>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sage)", animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="page fade-in">
      {showFirstLangPicker && (
        <LanguagePicker onSelect={async (l) => {
          await setPreferredLang(l);
          setShowFirstLangPicker(false);
          window.location.reload();
        }} />
      )}
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}

      {/* 0. 복귀 팝업 */}
      <WelcomeBackPopup
        show={showWelcomeBack}
        daysSince={welcomeBackDays}
        onClose={() => setShowWelcomeBack(false)}
      />

      {/* 신앙의 결실 뱃지 팝업 */}
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
              {t("home_badge_thanks", lang)}
            </button>
          </div>
        </div>
      )}



      {/* 1. 루틴 완료 confetti 축하 */}
      <Celebration
        show={celebration.show}
        message={celebration.message}
        subMessage={celebration.subMessage}
        onClose={() => {
          setCelebration({ show: false, message: "", subMessage: "" });
          // 루틴 완료 축하였으면 → 농부 팝업 먼저 (RootsMan은 팝업 닫힌 후 스크롤 시 시작)
          if (celebration.message.includes("루틴")) {
            setShowRootsManPopup(true);
          }
        }}
      />

      {/* 2. 농부 팝업 (루틴 완료 후) */}
      <RootsManPopup
        show={showRootsManPopup}
        streakDays={profile?.streak_days ?? 0}
        onClose={() => {
          setShowRootsManPopup(false);
          // 홈 상단으로 즉시 스크롤 (smooth 대신 instant) 후 바로 농부 등장
          window.scrollTo({ top: 0, behavior: "instant" });
          setShowRootsMan(true);
        }}
      />

      {/* 3. 10일/100일 정원 업데이트 팝업 */}
      <GardenUpdatePopup
        show={gardenPopup.show}
        type={gardenPopup.type}
        streakDays={profile?.streak_days ?? 0}
        badgeIndex={gardenPopup.badgeIndex}
        onClose={() => {
          setGardenPopup(p => ({ ...p, show: false }));
          gardenTopRef_scroll();
        }}
      />

      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>{t(getGreetingKey(), lang)}</div>
          <div className="header-title">
            {(() => {
              const name = profile?.name ?? t("profile_default_name", lang);
              // {name} placeholder를 치환한 후, "정원"/"Garten" 부분을 <em>으로 감쌈
              const full = t("home_garden_my", lang, { name });
              const emWord = lang === "de" ? "Garten" : "정원";
              const idx = full.lastIndexOf(emWord);
              if (idx === -1) return full;
              return <>{full.slice(0, idx)}<em>{emWord}</em>{full.slice(idx + emWord.length)}</>;
            })()}
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowLangPicker(p => !p)} style={{ background: "none", border: "none", color: "var(--text3)", marginTop: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 20 }}>{LANG_META[lang].flag}</span>
          </button>
          {showLangPicker && (
            <div onClick={() => setShowLangPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          )}
          {showLangPicker && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "8px 0", zIndex: 100, minWidth: 150, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              {getLanguageOptions().map(opt => (
                <button key={opt.code} onClick={async () => {
                  setShowLangPicker(false);
                  await setPreferredLang(opt.code);
                  window.location.reload();
                }} style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: lang === opt.code ? "var(--sage-light)" : "none", border: "none", cursor: "pointer", fontSize: 14, color: lang === opt.code ? "var(--sage-dark)" : "var(--text)", fontWeight: lang === opt.code ? 700 : 400, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{opt.flag}</span>
                  <span>{opt.nativeName}</span>
                  {lang === opt.code && <span style={{ marginLeft: "auto", color: "var(--sage)" }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <TreeGrowth days={profile?.streak_days ?? 0} lastCheckin={profile?.last_checkin ?? null} showRootsMan={showRootsMan} />

      {/* 오늘의 말씀 */}
      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">{t("home_verse_section", lang)}</div>
        <div className="card-sage">
          {todayVerse?.verse ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", letterSpacing: "0.5px", marginBottom: 8 }}>{todayVerse.reference}</div>
              <p className="verse-text">"{todayVerse.verse}"</p>
              {todayVerse.message && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(122,157,122,0.2)", fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{todayVerse.message}</div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 12 }}>{t("home_verse_empty", lang)}</div>
              <Link href="/checkin"><button className="btn-sage">{t("home_verse_btn", lang)} <ChevronRight size={16} /></button></Link>
            </>
          )}
        </div>
      </div>

      {/* 추천 결단 */}
      {todayVerse?.mission && (
        <div style={{ padding: "0 16px 14px" }}>
          <div className="sec-label">{t("home_recommend_section", lang)}</div>
          <div className="card-terra">
            <div style={{ fontSize: 13, color: "var(--terra-dark)", lineHeight: 1.65, marginBottom: 12 }}>{todayVerse.mission}</div>
            <button onClick={toggleAiDecision} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: todayDone.decision ? "var(--sage)" : "rgba(255,255,255,0.06)", borderRadius: 12, border: `1px solid ${todayDone.decision ? "var(--sage)" : "rgba(196,149,106,0.3)"}`, cursor: "pointer", width: "100%" }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${todayDone.decision ? "white" : "var(--terra)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {todayDone.decision && <Check size={12} style={{ color: "white" }} />}
              </div>
              <span style={{ fontSize: 12, color: todayDone.decision ? "white" : "var(--text2)", fontWeight: todayDone.decision ? 600 : 400 }}>
                {todayDone.decision ? t("home_decision_practiced", lang) : t("home_decision_practice", lang)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 나의 결단 */}
      {myDecisions.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div className="sec-label">{t("home_my_decision", lang)}</div>
          <div className="card">
            {myDecisions.map((d, i) => (
              <button key={i} onClick={() => toggleMyDecision(i)} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "0 0 8px", width: "100%" }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${d.done ? "var(--sage)" : "var(--border)"}`, background: d.done ? "var(--sage)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {d.done && <Check size={12} style={{ color: "var(--bg)" }} />}
                </div>
                <span style={{ fontSize: 13, color: d.done ? "var(--text3)" : "var(--text)", lineHeight: 1.5, textDecoration: d.done ? "line-through" : "none" }}>
                  {i + 1}. {d.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 기도 체크 */}
      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">{t("home_prayer_section", lang)}</div>
        <div className="card" style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, marginBottom: 12 }}>
            {t("home_prayer_desc", lang)}
          </div>
          <button
            onClick={togglePrayer}
            disabled={todayDone.prayer}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: todayDone.prayer ? "var(--sage)" : "rgba(255,255,255,0.06)", borderRadius: 12, border: `1px solid ${todayDone.prayer ? "var(--sage)" : "var(--border)"}`, cursor: todayDone.prayer ? "default" : "pointer", width: "100%" }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${todayDone.prayer ? "white" : "var(--text3)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: todayDone.prayer ? "rgba(255,255,255,0.2)" : "transparent" }}>
              {todayDone.prayer && <Check size={12} style={{ color: "white" }} />}
            </div>
            <span style={{ fontSize: 12, color: todayDone.prayer ? "white" : "var(--text2)", fontWeight: todayDone.prayer ? 600 : 400 }}>
              {todayDone.prayer ? t("home_prayer_done_msg", lang) : t("home_prayer_yes", lang)}
            </span>
          </button>
        </div>
      </div>

      {/* 오늘의 루틴 - 상태 표시만 (클릭 불가) */}
      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">{t("home_routine_section", lang)}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: t("home_routine_qt", lang), done: todayDone.qt, icon: "📖" },
            { label: t("home_routine_prayer", lang), done: todayDone.prayer, icon: "🙏" },
            { label: t("home_routine_decision", lang), done: decisionDone, icon: "✊" },
          ].map(({ label, done, icon }) => {
            const bg = done ? "var(--sage-light)" : "var(--bg2)";
            const border = done ? "rgba(122,157,122,0.3)" : "var(--border)";
            const color = done ? "var(--sage-dark)" : "var(--text)";
            return (
              <div key={label} style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: "14px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color }}>{label}</div>
                <div style={{ fontSize: 9, color: done ? "var(--sage-dark)" : "var(--text3)", marginTop: 2 }}>{done ? t("home_routine_done", lang) : t("home_routine_notdone", lang)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
