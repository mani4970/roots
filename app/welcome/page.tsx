"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveLangLocally } from "@/lib/useLang";
import { storageGet } from "@/lib/clientStorage";
import styles from "./page.module.css";

// ── Types & constants ──────────────────────────────────────────────

type Lang = "ko" | "en" | "de" | "fr";

const LANG_LIST: { code: Lang; flag: string; name: string }[] = [
  { code: "ko", flag: "🇰🇷", name: "한국어" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
];


// ── Translations ───────────────────────────────────────────────────

const TEXTS: Record<Lang, {
  tagline: string;
  descParts: [string, string, string];
  growthEyebrow: string;
  growthTitle: string;
  growthSub: string;
  growthStart: string;
  growthEnd: string;
  badgeLabel: string;
  badgeSub: string;
  badgeNames: string[];
  featuresLabel: string;
  f1t: string; f1s: string;
  f2t: string; f2s: string;
  f3t: string; f3s: string;
  verseRef: string; verse: string;
  btnStart: string; btnLogin: string;
  footer: string; footer2: string;
}> = {
  ko: {
    tagline: "매일 말씀과 동행하는 삶, 루츠와 함께",
    descParts: [
      "오늘 감정과 상태에 맞는 말씀을 받고,",
      "매일 QT와 기도를 통해 하나님과 동행하며",
      "믿음의 뿌리를 깊이 내려보세요.",
    ],
    growthEyebrow: "나의 정원",
    growthTitle: "100일 동안 자라는\n나의 정원",
    growthSub: "매일 QT와 기도, 그리고 결단을 통해 영적 습관을 쌓아가면,\n100일 후 말씀의 뿌리가 깊게 심겨지고\n열매를 맺는 아름다운 나의 정원이 됩니다.",
    growthStart: "시작",
    growthEnd: "100일 후",
    badgeLabel: "성령의 열매와 신앙의 결실",
    badgeSub: "성령의 열매뿐 아니라 신앙의 결실을 이룰 때마다 배지를 받으며\n즐겁게 영적 습관을 형성해 나가요.",
    badgeNames: ["사랑", "희락", "화평", "오래 참음", "자비", "양선", "충성", "온유", "절제"],
    featuresLabel: "기능",
    f1t: "큐티",
    f1s: "6단계, 자유형식, 주일예배 QT를\n상황에 맞게 기록합니다.",
    f2t: "기도",
    f2s: "기도 제목을 기록하고\n응답의 순간을 남깁니다.",
    f3t: "공동체",
    f3s: "서로를 위해 기도하고\n말씀의 여정을 나눕니다.",
    verseRef: "시편 1:1–2",
    verse: "복 있는 사람은 오직 여호와의\n율법을 즐거워하여 그의 율법을\n주야로 묵상하는도다",
    btnStart: "시작하기",
    btnLogin: "이미 계정이 있어요",
    footer: "차분한 말씀 루틴",
    footer2: "광고 없이 사용",
  },
  en: {
    tagline: "A daily rhythm rooted in Scripture",
    descParts: [
      "Receive a verse for your heart today,",
      "continue with QT and prayer,",
      "and let quiet roots grow deeper.",
    ],
    growthEyebrow: "My Garden",
    growthTitle: "A garden that grows\nfor 100 days",
    growthSub: "As you build spiritual habits every day through QT, prayer, and commitment,\nafter 100 days the roots of the Word are planted deeply\nand become your beautiful garden that bears fruit.",
    growthStart: "Start",
    growthEnd: "After 100 days",
    badgeLabel: "Fruits of the Spirit and faith milestones",
    badgeSub: "As your faith bears fruit, you collect badges and build a joyful spiritual habit step by step.",
    badgeNames: ["Love", "Joy", "Peace", "Patience", "Kindness", "Goodness", "Faithfulness", "Gentleness", "Self-Control"],
    featuresLabel: "Features",
    f1t: "Quiet Time",
    f1s: "Use a 6-step guide, free writing,\nor Sunday worship notes.",
    f2t: "Prayer",
    f2s: "Keep prayer requests and\nrecord answered prayers.",
    f3t: "Community",
    f3s: "Pray for one another\nand share your walk with Scripture.",
    verseRef: "Psalm 1:1–2",
    verse: "Blessed is the one whose delight\nis in the law of the LORD,\nand who meditates on his law day and night.",
    btnStart: "Get Started",
    btnLogin: "I already have an account",
    footer: "Quiet Scripture rhythm",
    footer2: "No ads",
  },
  de: {
    tagline: "Ein täglicher Rhythmus im Wort Gottes",
    descParts: [
      "Empfangen Sie ein Wort für Ihr heutiges Herz,",
      "gehen Sie weiter mit QT und Gebet,",
      "und lassen Sie stille Wurzeln wachsen.",
    ],
    growthEyebrow: "Mein Garten",
    growthTitle: "Ein Garten, der\n100 Tage wächst",
    growthSub: "Wenn Sie jeden Tag durch QT, Gebet und eine Entscheidung geistliche Gewohnheiten aufbauen,\nwerden nach 100 Tagen die Wurzeln des Wortes tief eingepflanzt\nund Ihr schöner Garten trägt Frucht.",
    growthStart: "Start",
    growthEnd: "Nach 100 Tagen",
    badgeLabel: "Früchte des Geistes und Glaubensschritte",
    badgeSub: "Wenn Ihr Glaube Frucht trägt, sammeln Sie Abzeichen und formen Schritt für Schritt eine Freude an geistlichen Gewohnheiten.",
    badgeNames: ["Liebe", "Freude", "Friede", "Geduld", "Freundlichkeit", "Güte", "Treue", "Sanftmut", "Selbstbeherrschung"],
    featuresLabel: "Funktionen",
    f1t: "Stille Zeit",
    f1s: "6-Schritte-Guide, freies Schreiben\nund Notizen zum Sonntagsgottesdienst.",
    f2t: "Gebet",
    f2s: "Gebetsanliegen festhalten\nund Erhörungen bewahren.",
    f3t: "Gemeinde",
    f3s: "Füreinander beten\nund den Weg im Wort teilen.",
    verseRef: "Psalm 1,1–2",
    verse: "Wohl dem, der Lust hat am Gesetz\ndes HERRN und über sein Gesetz\nnachsinnt Tag und Nacht.",
    btnStart: "Jetzt starten",
    btnLogin: "Ich habe bereits ein Konto",
    footer: "Ruhiger Bibelrhythmus",
    footer2: "Ohne Werbung",
  },
  fr: {
    tagline: "Un rythme quotidien enraciné dans la Parole",
    descParts: [
      "Recevez un verset pour votre cœur aujourd’hui,",
      "continuez avec le QT et la prière,",
      "et laissez les racines grandir en silence.",
    ],
    growthEyebrow: "Mon jardin",
    growthTitle: "Un jardin qui grandit\npendant 100 jours",
    growthSub: "En cultivant chaque jour une habitude spirituelle par le QT, la prière et une décision,\naprès 100 jours les racines de la Parole s’enfoncent profondément\net deviennent votre beau jardin qui porte du fruit.",
    growthStart: "Début",
    growthEnd: "Après 100 jours",
    badgeLabel: "Fruits de l’Esprit et étapes de foi",
    badgeSub: "À chaque fruit porté dans la foi, vous recevez des badges et construisez avec joie une habitude spirituelle.",
    badgeNames: ["Amour", "Joie", "Paix", "Patience", "Bienveillance", "Bonté", "Fidélité", "Douceur", "Maîtrise"],
    featuresLabel: "Fonctions",
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
    footer: "Rythme biblique paisible",
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

const FRUIT_FILE_KEYS = ["love", "joy", "peace", "patience", "kindness", "goodness", "faithfulness", "gentleness", "self_control"] as const;

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

  const tx = TEXTS[lang];
  const currentLangMeta = LANG_LIST.find((l) => l.code === lang)!;

  // Restore saved lang
  useEffect(() => {
    const stored = storageGet("roots_lang");
    if (stored && ["ko", "de", "en", "fr"].includes(stored)) {
      setLang(stored as Lang);
    }
  }, []);

  function selectLang(code: Lang) {
    setLang(code);
    setShowDropdown(false);
    saveLangLocally(code);
  }

  function goSignup() {
    saveLangLocally(lang);
    router.push("/signup");
  }

  function goLogin() {
    saveLangLocally(lang);
    router.push("/login");
  }


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
              <Image
                src="/roots-logo-transparent-96.png"
                alt="Roots sprout"
                width={42}
                height={42}
                style={{ objectFit: "contain" }}
              />
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

          {/* Tree start → 100 days */}
          <div className={styles.growthCompare}>
            <div className={styles.growthTreeCard}>
              <div className={styles.growthTreeImage}>
                <Image
                  src="/tree1.webp"
                  alt={tx.growthStart}
                  fill
                  className={styles.treeFrameImg}
                  style={{ objectFit: "cover", imageRendering: "pixelated" }}
                  priority
                />
              </div>
              <div className={styles.growthTreeLabel}>{tx.growthStart}</div>
            </div>

            <div className={styles.growthArrow}>→</div>

            <div className={styles.growthTreeCard}>
              <div className={styles.growthTreeImage}>
                <Image
                  src="/tree11.webp"
                  alt={tx.growthEnd}
                  fill
                  className={styles.treeFrameImg}
                  style={{ objectFit: "cover", imageRendering: "pixelated" }}
                />
              </div>
              <div className={styles.growthTreeLabel}>{tx.growthEnd}</div>
            </div>
          </div>
        </div>

        {/* ── Badges ── */}
        <div className={styles.sectionLabel}>{tx.badgeLabel}</div>
        <div className={styles.sectionSub}>{tx.badgeSub}</div>
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
          {tx.featuresLabel}
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
