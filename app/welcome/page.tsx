"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";

// ── Types & constants ──────────────────────────────────────────────

type Lang = "ko" | "en" | "de" | "fr";

const LANG_DEFAULT_TRANSLATION: Record<Lang, number> = {
  ko: 92,
  de: 97,
  en: 80,
  fr: 26,
};

const LANG_LIST: { code: Lang; flag: string; name: string }[] = [
  { code: "ko", flag: "🇰🇷", name: "한국어" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
];

// tree1 = Day 0, tree2 = Day 10, ..., tree11 = Day 100
const STAGE_DAYS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const MILESTONES = [0, 25, 50, 75, 100];


// ── Translations ───────────────────────────────────────────────────

const TEXTS: Record<Lang, {
  tagline: string;
  descParts: [string, string, string];
  growthEyebrow: string;
  growthTitle: string;
  growthSub: string;
  badgeLabel: string;
  badgeNames: string[];
  f1t: string; f1s: string;
  f2t: string; f2s: string;
  f3t: string; f3s: string;
  verseRef: string; verse: string;
  btnStart: string; btnLogin: string;
  footer: string; footer2: string;
}> = {
  ko: {
    tagline: "말씀에 뿌리내리고, 함께 자라다",
    descParts: [
      "매일의 영적 습관, 혼자서 어려우셨나요?",
      "겨자씨 한 알이 자라 나무가 되기까지,",
      "루츠와 함께 시작해 보세요.",
    ],
    growthEyebrow: "나의 정원",
    growthTitle: "매일 루틴을 완료하면\n나무가 자라요",
    growthSub: "100일을 완료하면 성령의 열매 뱃지를 받아요",
    badgeLabel: "성령의 열매",
    badgeNames: ["사랑", "화평", "희락", "양선", "친절", "절제"],
    f1t: "큐티",
    f1s: "6단계로 말씀을 깊이 묵상하고\n삶에 적용해요. 자유형식과\n주일예배 큐티도 지원해요",
    f2t: "기도",
    f2s: "기도 제목을 기록하고\n응답되면 간증으로 남겨요",
    f3t: "커뮤니티",
    f3s: "서로 중보기도하고,\n큐티를 나누며\n형제 자매들과 함께 성장해요",
    verseRef: "시편 1:1–2",
    verse: "복 있는 사람은 오직 여호와의\n율법을 즐거워하여 그의 율법을\n주야로 묵상하는도다",
    btnStart: "시작하기",
    btnLogin: "이미 계정이 있어요",
    footer: "무료",
    footer2: "광고 없음",
  },
  en: {
    tagline: "Rooted in God's Word, Growing Together",
    descParts: [
      "Struggling to keep a daily spiritual habit on your own?",
      "From a mustard seed to a sheltering tree —",
      "start your journey with Roots.",
    ],
    growthEyebrow: "My Garden",
    growthTitle: "Complete your daily routine\nand watch your tree grow",
    growthSub: "Finish 100 days and earn a Fruit of the Spirit badge",
    badgeLabel: "Fruits of the Spirit",
    badgeNames: ["Love", "Peace", "Joy", "Goodness", "Kindness", "Self-Control"],
    f1t: "Quiet Time",
    f1s: "Meditate in 6 steps and apply\nGod's Word to your daily life.\nFree-form & Sunday worship supported",
    f2t: "Prayer",
    f2s: "Record prayer requests and\nleave testimonies when answered",
    f3t: "Community",
    f3s: "Pray for one another,\nshare Quiet Times,\nand grow together in the Lord",
    verseRef: "Psalm 1:1–2",
    verse: "Blessed is the one whose delight\nis in the law of the LORD,\nand who meditates on his law day and night.",
    btnStart: "Get Started",
    btnLogin: "I already have an account",
    footer: "Free",
    footer2: "No Ads",
  },
  de: {
    tagline: "In Gottes Wort verwurzelt, gemeinsam wachsen",
    descParts: [
      "Fällt es Ihnen schwer, alleine eine geistliche Routine zu halten?",
      "Vom Senfkorn zum Baum, in dem die Vögel nisten —",
      "starten Sie mit Roots.",
    ],
    growthEyebrow: "Mein Garten",
    growthTitle: "Tägliche Routine lässt\nIhren Baum wachsen",
    growthSub: "Nach 100 Tagen erhalten Sie eine Frucht des Geistes",
    badgeLabel: "Früchte des Geistes",
    badgeNames: ["Liebe", "Friede", "Freude", "Güte", "Freundl.", "Selbstbeh."],
    f1t: "Stille Zeit",
    f1s: "Gottes Wort in 6 Schritten meditieren\nund im Alltag anwenden.\nFreie Form & Sonntagsgottesdienst",
    f2t: "Gebet",
    f2s: "Gebetsanliegen aufschreiben und\nbei Erhörung ein Zeugnis hinterlassen",
    f3t: "Gemeinde",
    f3s: "Füreinander beten,\nStille Zeiten teilen\nund als Geschwister im Herrn wachsen",
    verseRef: "Psalm 1,1–2",
    verse: "Wohl dem, der Lust hat am Gesetz\ndes HERRN und über sein Gesetz\nnachsinnt Tag und Nacht.",
    btnStart: "Jetzt starten",
    btnLogin: "Ich habe bereits ein Konto",
    footer: "Kostenlos",
    footer2: "Keine Werbung",
  },
  fr: {
    tagline: "Enracinés dans la Parole, grandissons ensemble",
    descParts: [
      "Difficile de maintenir une habitude spirituelle seul(e) ?",
      "D'une graine de moutarde à un arbre où les oiseaux nichent —",
      "commencez avec Roots.",
    ],
    growthEyebrow: "Mon Jardin",
    growthTitle: "Complétez votre routine\net regardez votre arbre grandir",
    growthSub: "Terminez 100 jours et recevez un fruit de l'Esprit",
    badgeLabel: "Fruits de l'Esprit",
    badgeNames: ["Amour", "Paix", "Joie", "Bonté", "Douceur", "Maîtrise"],
    f1t: "Méditation",
    f1s: "Méditez la Parole en 6 étapes\net appliquez-la dans votre vie.\nForme libre & culte du dimanche",
    f2t: "Prière",
    f2s: "Notez vos sujets de prière et\ntémoignez des prières exaucées",
    f3t: "Communauté",
    f3s: "Priez les uns pour les autres, partagez\nles méditations et grandissez ensemble",
    verseRef: "Psaume 1:1–2",
    verse: "Heureux l'homme qui trouve son plaisir\ndans la loi de l'Éternel,\net qui la médite jour et nuit !",
    btnStart: "Commencer",
    btnLogin: "J'ai déjà un compte",
    footer: "Gratuit",
    footer2: "Sans publicité",
  },
};

// ── SVG Icons ──────────────────────────────────────────────────────

function IconBook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="12" y1="7" x2="16" y2="7" />
      <line x1="12" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function IconPrayer() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V8a6 6 0 0 0-12 0v3" />
      <path d="M6 11h12l1 8H5l1-8z" />
      <line x1="12" y1="11" x2="12" y2="15" />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconLeaf() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 28 Q14 20 16 12" stroke="#4A6F4A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 18 Q8 14 7 6 Q16 7 16 16" fill="#4A6F4A" opacity={0.7} />
      <path d="M16 14 Q24 10 25 2 Q16 3 16 12" fill="#2C4A2C" opacity={0.6} />
    </svg>
  );
}

// ── Badge image ───────────────────────────────────────────────────

const FRUIT_FILE_KEYS = ["love", "peace", "joy", "goodness", "kindness", "patience"] as const;

function BadgeImage({ fileKey, label }: { fileKey: string; label: string }) {
  return (
    <Image
      src={`/badge_${fileKey}.png`}
      alt={label}
      width={44}
      height={44}
      style={{ borderRadius: "50%", objectFit: "cover" }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────

export default function WelcomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ko");
  const [showDropdown, setShowDropdown] = useState(false);

  // Tree animation state
  const [treeStage, setTreeStage] = useState(1); // 1–11
  const [displayDay, setDisplayDay] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);

  const tx = TEXTS[lang];
  const currentLangMeta = LANG_LIST.find((l) => l.code === lang)!;

  // Restore saved lang
  useEffect(() => {
    const stored = localStorage.getItem("roots_lang");
    if (stored && ["ko", "de", "en", "fr"].includes(stored)) {
      setLang(stored as Lang);
    }
  }, []);

  // Animate day counter
  const animateDay = useCallback((from: number, to: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const duration = 700;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayDay(Math.round(from + (to - from) * ease));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Tree stage cycling
  useEffect(() => {
    setTreeStage(1);
    setDisplayDay(0);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTreeStage((prev) => {
        const next = prev >= 11 ? 1 : prev + 1;
        const fromDay = STAGE_DAYS[prev - 1];
        const toDay = STAGE_DAYS[next - 1];
        animateDay(fromDay, toDay);
        return next;
      });
    }, 1600);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animateDay]);

  function selectLang(code: Lang) {
    setLang(code);
    setShowDropdown(false);
    localStorage.setItem("roots_lang", code);
  }

  function goSignup() {
    localStorage.setItem("roots_lang", lang);
    localStorage.setItem("roots_default_translation", String(LANG_DEFAULT_TRANSLATION[lang]));
    router.push("/signup");
  }

  function goLogin() {
    localStorage.setItem("roots_lang", lang);
    localStorage.setItem("roots_default_translation", String(LANG_DEFAULT_TRANSLATION[lang]));
    router.push("/login");
  }

  const progressPct = ((treeStage - 1) / 10) * 100;

  return (
    <div className={styles.page}>
      <div className={styles.phone}>

        {/* ── Lang bar ── */}
        <div className={styles.langBar}>
          <button className={styles.langBtn} onClick={() => setShowDropdown((v) => !v)}>
            <span>{currentLangMeta.flag}</span>
            <span>{lang.toUpperCase()}</span>
          </button>
          {showDropdown && (
            <>
              <div
                onClick={() => setShowDropdown(false)}
                style={{ position: "fixed", inset: 0, zIndex: 19 }}
              />
              <div className={styles.langDropdown} style={{ zIndex: 21 }}>
                {LANG_LIST.map((opt) => (
                  <button
                    key={opt.code}
                    className={`${styles.langOpt} ${opt.code === lang ? styles.langOptActive : ""}`}
                    onClick={() => selectLang(opt.code)}
                  >
                    <span>{opt.flag}</span>
                    <span>{opt.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Hero ── */}
        <div className={styles.hero}>
          <div className={styles.heroBg} />
          <div className={styles.ring} style={{ width: 300, height: 300, top: -120, right: -100 }} />
          <div className={styles.ring} style={{ width: 180, height: 180, top: -40, right: 30 }} />

          <h1 className={styles.heroTitle}>
            Roots
            <span className={styles.sproutInline}>
              <IconLeaf />
            </span>
          </h1>
          <p className={styles.heroTitleSub}>{tx.tagline}</p>
          <p className={styles.heroDesc}>
            {tx.descParts[0]}
            <br />
            {tx.descParts[1]}
            <br />
            <strong className={styles.heroDescStrong}>{tx.descParts[2]}</strong>
          </p>
        </div>

        {/* ── Tree growth section ── */}
        <div className={styles.growthSection}>
          <div className={styles.growthHeader}>
            <div className={styles.growthEyebrow}>{tx.growthEyebrow}</div>
            <div className={styles.growthTitle} style={{ whiteSpace: "pre-line" }}>
              {tx.growthTitle}
            </div>
            <div className={styles.growthSub}>{tx.growthSub}</div>
          </div>

          {/* Tree frames — crossfade */}
          <div className={styles.treeStage}>
            {Array.from({ length: 11 }, (_, i) => (
              <div
                key={i + 1}
                className={`${styles.treeFrame} ${treeStage === i + 1 ? styles.treeFrameVisible : ""}`}
              >
                <Image
                  src={`/tree${i + 1}.png`}
                  alt={`tree stage ${i + 1}`}
                  fill
                  className={styles.treeFrameImg}
                  style={{ objectFit: "cover", imageRendering: "pixelated" }}
                  priority={i === 0}
                />
              </div>
            ))}

            {/* Day badge overlay */}
            <div className={styles.dayBadge}>
              <span className={styles.dayBadgeNum}>Day {displayDay}</span>
              <span className={styles.dayBadgeLabel}>/ 100</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className={styles.growthProgress}>
            <div className={styles.progressBarTrack}>
              <div className={styles.progressBarFill} style={{ width: `${progressPct}%` }} />
            </div>
            <div className={styles.progressMilestones}>
              {MILESTONES.map((m) => (
                <span
                  key={m}
                  className={`${styles.milestone} ${STAGE_DAYS[treeStage - 1] >= m ? styles.milestonePassed : ""}`}
                >
                  Day {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Badges ── */}
        <div className={styles.sectionLabel}>{tx.badgeLabel}</div>
        <div className={styles.badgesSection}>
          <div className={styles.badgesRow}>
            {FRUIT_FILE_KEYS.map((key, i) => (
              <div key={key} className={styles.badgePh}>
                <BadgeImage fileKey={key} label={tx.badgeNames[i]} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Features ── */}
        <div className={styles.sectionLabel} style={{ marginTop: 28 }}>
          {lang === "ko" ? "기능" : lang === "de" ? "Funktionen" : lang === "fr" ? "Fonctions" : "Features"}
        </div>
        <div className={styles.features}>
          {/* Big: Quiet Time */}
          <div className={styles.featBig}>
            <svg className={styles.featBigBg} width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="55" fill="white" />
            </svg>
            <div className={styles.featIcon} style={{ color: "var(--cream)" }}>
              <IconBook />
            </div>
            <div className={styles.featTitle}>{tx.f1t}</div>
            <div className={styles.featSub}>{tx.f1s}</div>
          </div>

          {/* Row: Prayer + Community */}
          <div className={styles.featRow}>
            <div className={`${styles.featSm} ${styles.featSmTerra}`}>
              <div className={styles.featIcon} style={{ color: "var(--terra)" }}>
                <IconPrayer />
              </div>
              <div className={styles.featSmTitle}>{tx.f2t}</div>
              <div className={styles.featSmSub}>{tx.f2s}</div>
            </div>
            <div className={styles.featSm}>
              <div className={styles.featIcon} style={{ color: "var(--green)" }}>
                <IconPeople />
              </div>
              <div className={styles.featSmTitle}>{tx.f3t}</div>
              <div className={styles.featSmSub}>{tx.f3s}</div>
            </div>
          </div>
        </div>

        {/* ── Verse ── */}
        <div className={styles.verseBlock}>
          <div className={styles.verseQuote}>&ldquo;</div>
          <div className={styles.verseRef}>{tx.verseRef}</div>
          <div className={styles.verseText}>{tx.verse}</div>
        </div>

        {/* ── CTA ── */}
        <div className={styles.footerCta}>
          <button className={styles.btnPrimary} onClick={goSignup}>
            {tx.btnStart} <IconArrow />
          </button>
          <button className={styles.btnOutline} onClick={goLogin}>
            {tx.btnLogin}
          </button>
        </div>

        <div className={styles.footerNote}>
          {tx.footer}
          <span className={styles.footerDot}>·</span>
          {tx.footer2}
        </div>

      </div>
    </div>
  );
}
