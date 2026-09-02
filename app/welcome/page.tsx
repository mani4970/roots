"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveLangLocally } from "@/lib/useLang";
import { storageGet } from "@/lib/clientStorage";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import styles from "./page.module.css";

// ── Types & constants ──────────────────────────────────────────────

type WelcomeCopyLang = "ko" | "en" | "de" | "fr" | "es";

const WELCOME_LANG_ORDER = ["ko", "en", "de", "fr", "es"] as const satisfies readonly WelcomeCopyLang[];
const LANG_LIST: readonly { code: WelcomeCopyLang; flag: string; name: string }[] = [
  { code: "ko", flag: "🇰🇷", name: "한국어" },
  { code: "en", flag: "🇺🇸", name: "English" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "es", flag: "🇪🇸", name: "Español" },
];

function isWelcomeCopyLang(value: unknown): value is WelcomeCopyLang {
  return typeof value === "string" && WELCOME_LANG_ORDER.includes(value as WelcomeCopyLang);
}

const APP_STORE_URL = "https://apps.apple.com/app/christian-roots/id6769063816";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.rootspuce.app";

// ── Translations ───────────────────────────────────────────────────

const TEXTS: Record<WelcomeCopyLang, {
  languageLabel: string;
  heroHeadline: string;
  heroDescription: string;
  growthEyebrow: string;
  growthTitle: string;
  growthSub: string;
  growthStart: string;
  growthEnd: string;
  badgeLabel: string;
  badgeSub: string;
  badgeNames: string[];
  faithBadgeNames: string[];
  featuresLabel: string;
  f1t: string; f1s: string;
  f2t: string; f2s: string;
  f3t: string; f3s: string;
  verseRef: string; verse: string;
  btnStart: string; btnLogin: string;
  storePrompt: string; appStore: string; googlePlay: string;
  footer: string; footer2: string;
}> = {
  ko: {
    languageLabel: "언어 선택",
    heroHeadline: "매일의 영적 습관,\n루츠와 함께 만들어가요",
    heroDescription: "말씀 묵상하고, 기도하고, 공동체와 함께 나누며\n하나님과 동행하는 하루를 살아가요.",
    growthEyebrow: "꾸준함이 보이는 여정",
    growthTitle: "매일의 묵상이 눈에 보이는\n여정으로 자라요",
    growthSub: "매일 말씀 묵상을 완료할 때마다 성경 이야기 맵이 자라나요.\n100일 단위로 새로운 맵을 만날 수 있어요!",
    growthStart: "시작",
    growthEnd: "100일 후",
    badgeLabel: "영적 습관의 결실을 배지로 간직해요",
    badgeSub: "신앙의 여정에서 얻은 배지를 모으고 100일마다 성령의 열매를 모으며\n받은 은혜를 기억해요.",
    badgeNames: ["사랑", "희락", "화평", "오래 참음", "자비", "양선", "충성", "온유", "절제"],
    faithBadgeNames: ["모세", "다윗", "요셉", "말씀 배달부", "말씀의 평안"],
    featuresLabel: "루츠의 기능",
    f1t: "말씀 묵상",
    f1s: "하나님이 오늘 내게 주시는 말씀을 묵상하고 삶에 적용해요.",
    f2t: "기도",
    f2s: "기도 제목과 응답을 기록하며 하나님께 나아가요.",
    f3t: "공동체",
    f3s: "동역자, 그룹과 서로 묵상을 나누고, 기도하고 받은 은혜를 나눠요.",
    verseRef: "시편 1:1–2",
    verse: "복 있는 사람은 오직 여호와의\n율법을 즐거워하여 그의 율법을\n주야로 묵상하는도다",
    btnStart: "시작하기",
    btnLogin: "이미 계정이 있어요",
    storePrompt: "앱으로 더 편하게 사용해보세요",
    appStore: "App Store",
    googlePlay: "Google Play",
    footer: "말씀 동행",
    footer2: "광고 없이 사용",
  },
  en: {
    languageLabel: "Choose language",
    heroHeadline: "Build daily spiritual habits\nwith Roots",
    heroDescription: "Reflect on the Word, pray, and share the grace you receive in community\nas you walk with God each day.",
    growthEyebrow: "A visible journey",
    growthTitle: "See your journey grow\nwith each Bible Reflection",
    growthSub: "Each day you complete a Bible Reflection, a Bible story grows within the map.\nDiscover a new map every 100 days!",
    growthStart: "Start",
    growthEnd: "After 100 days",
    badgeLabel: "Keep the fruit of your spiritual habits as badges",
    badgeSub: "Collect badges earned along your faith journey and a Fruit of the Spirit every 100 days,\nand remember the grace God has given you.",
    badgeNames: ["Love", "Joy", "Peace", "Patience", "Kindness", "Goodness", "Faithfulness", "Gentleness", "Self-Control"],
    faithBadgeNames: ["Moses", "David", "Joseph", "Word Carrier", "Peace in the Word"],
    featuresLabel: "Roots Features",
    f1t: "Bible Reflection",
    f1s: "Reflect on the Word God has for you today and put it into practice.",
    f2t: "Prayer",
    f2s: "Record prayer requests and answers as you draw near to God.",
    f3t: "Community",
    f3s: "Share Bible Reflections with faith partners and groups, pray together, and share the grace you receive.",
    verseRef: "Psalm 1:1–2",
    verse: "Blessed is the one whose delight\nis in the law of the LORD,\nand who meditates on his law day and night.",
    btnStart: "Get Started",
    btnLogin: "I already have an account",
    storePrompt: "Use Roots more easily in the app",
    appStore: "App Store",
    googlePlay: "Google Play",
    footer: "Word walk",
    footer2: "No ads",
  },
  de: {
    languageLabel: "Sprache auswählen",
    heroHeadline: "Bauen Sie mit Roots tägliche\ngeistliche Gewohnheiten auf",
    heroDescription: "Denken Sie über Gottes Wort nach, beten Sie und teilen Sie die empfangene Gnade in der Gemeinschaft.\nSo leben Sie jeden Tag mit Gott.",
    growthEyebrow: "Ein sichtbarer Weg",
    growthTitle: "Mit jeder Stillen Zeit\nwird Ihr Weg sichtbar",
    growthSub: "Mit jeder abgeschlossenen Stillen Zeit wächst eine biblische Geschichte auf Ihrer Karte weiter.\nAlle 100 Tage entdecken Sie eine neue Karte!",
    growthStart: "Start",
    growthEnd: "Nach 100 Tagen",
    badgeLabel: "Bewahren Sie die Früchte Ihrer geistlichen Gewohnheiten als Abzeichen",
    badgeSub: "Sammeln Sie Abzeichen aus Ihrem Glaubensweg und alle 100 Tage eine Frucht des Geistes,\num sich an die Gnade zu erinnern, die Gott Ihnen geschenkt hat.",
    badgeNames: ["Liebe", "Freude", "Friede", "Geduld", "Freundlichkeit", "Güte", "Treue", "Sanftmut", "Selbstbeherrschung"],
    faithBadgeNames: ["Mose", "David", "Josef", "Wortüberbringer", "Ruhe im Wort"],
    featuresLabel: "Funktionen von Roots",
    f1t: "Stille Zeit",
    f1s: "Denken Sie über das Wort nach, das Gott Ihnen heute schenkt, und setzen Sie es im Alltag um.",
    f2t: "Gebet",
    f2s: "Halten Sie Gebetsanliegen und Gebetserhörungen fest und kommen Sie damit zu Gott.",
    f3t: "Gemeinschaft",
    f3s: "Teilen Sie Ihre Stille Zeit mit Glaubenspartnern und Gruppen, beten Sie miteinander und teilen Sie die empfangene Gnade.",
    verseRef: "Psalm 1,1–2",
    verse: "Wohl dem, der Lust hat am Gesetz\ndes HERRN und über sein Gesetz\nnachsinnt Tag und Nacht.",
    btnStart: "Jetzt starten",
    btnLogin: "Ich habe bereits ein Konto",
    storePrompt: "Nutzen Sie Roots bequemer in der App",
    appStore: "App Store",
    googlePlay: "Google Play",
    footer: "Wortweg",
    footer2: "Ohne Werbung",
  },
  fr: {
    languageLabel: "Choisir la langue",
    heroHeadline: "Avec Roots, construisez chaque jour\nvos habitudes spirituelles",
    heroDescription: "Méditez la Parole, priez et partagez en communauté la grâce reçue\npour vivre chaque jour avec Dieu.",
    growthEyebrow: "Un chemin visible",
    growthTitle: "Voyez votre chemin grandir\nà chaque méditation",
    growthSub: "À chaque méditation biblique terminée, une histoire biblique grandit sur la carte.\nDécouvrez une nouvelle carte tous les 100 jours !",
    growthStart: "Début",
    growthEnd: "Après 100 jours",
    badgeLabel: "Gardez les fruits de vos habitudes spirituelles sous forme de badges",
    badgeSub: "Collectionnez les badges obtenus sur votre chemin de foi et un fruit de l’Esprit tous les 100 jours,\npour vous souvenir de la grâce reçue de Dieu.",
    badgeNames: ["Amour", "Joie", "Paix", "Patience", "Bienveillance", "Bonté", "Fidélité", "Douceur", "Maîtrise"],
    faithBadgeNames: ["Moïse", "David", "Joseph", "Porteur de la Parole", "Paix dans la Parole"],
    featuresLabel: "Fonctionnalités de Roots",
    f1t: "Méditation biblique",
    f1s: "Méditez la Parole que Dieu vous donne aujourd’hui et mettez-la en pratique.",
    f2t: "Prière",
    f2s: "Notez vos sujets de prière et les réponses reçues en vous approchant de Dieu.",
    f3t: "Communauté",
    f3s: "Partagez vos méditations avec vos partenaires de foi et vos groupes, priez ensemble et partagez la grâce reçue.",
    verseRef: "Psaume 1:1–2",
    verse: "Heureux l'homme qui trouve son plaisir\ndans la loi de l'Éternel,\net qui la médite jour et nuit !",
    btnStart: "Commencer",
    btnLogin: "J'ai déjà un compte",
    storePrompt: "Utilisez Roots plus facilement dans l’application",
    appStore: "App Store",
    googlePlay: "Google Play",
    footer: "Marche avec la Parole",
    footer2: "Sans publicité",
  },
  es: {
    languageLabel: "Elegir idioma",
    heroHeadline: "Crea hábitos espirituales cada día\ncon Roots",
    heroDescription: "Medita en la Palabra, ora y comparte en comunidad la gracia recibida\npara vivir cada día caminando con Dios.",
    growthEyebrow: "Un camino visible",
    growthTitle: "Mira cómo crece tu camino\ncon cada meditación",
    growthSub: "Cada día que completas una meditación bíblica, una historia bíblica crece en el mapa.\n¡Descubre un mapa nuevo cada 100 días!",
    growthStart: "Inicio",
    growthEnd: "Después de 100 días",
    badgeLabel: "Guarda en insignias el fruto de tus hábitos espirituales",
    badgeSub: "Reúne las insignias ganadas en tu camino de fe y un fruto del Espíritu cada 100 días,\ny recuerda la gracia que Dios te ha dado.",
    badgeNames: ["Amor", "Alegría", "Paz", "Paciencia", "Amabilidad", "Bondad", "Fidelidad", "Mansedumbre", "Dominio propio"],
    faithBadgeNames: ["Moisés", "David", "José", "Mensajero de la Palabra", "Paz en la Palabra"],
    featuresLabel: "Funciones de Roots",
    f1t: "Meditación bíblica",
    f1s: "Medita en la Palabra que Dios tiene hoy para ti y ponla en práctica.",
    f2t: "Oración",
    f2s: "Registra tus peticiones y respuestas de oración mientras te acercas a Dios.",
    f3t: "Comunidad",
    f3s: "Comparte tus meditaciones con compañeros de fe y grupos, ora junto a ellos y comparte la gracia recibida.",
    verseRef: "Salmo 1:2",
    verse: "sino que en la Ley del SEÑOR se deleita\ny día y noche medita en ella.",
    btnStart: "Comenzar",
    btnLogin: "Ya tengo una cuenta",
    storePrompt: "Usa Roots más cómodamente en la app",
    appStore: "App Store",
    googlePlay: "Google Play",
    footer: "Caminar con la Palabra",
    footer2: "Sin anuncios",
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

function IconGlobe() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      className={`${styles.langChevron} ${open ? styles.langChevronOpen : ""}`}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function getWelcomeRedirect() {
  if (typeof window === "undefined") return "";
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) return "";
  return `?redirect=${encodeURIComponent(redirect)}`;
}

function IconLeaf() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 28 Q14 20 16 12" stroke="var(--auth-sage-text)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 18 Q8 14 7 6 Q16 7 16 16" fill="var(--auth-sage-text)" opacity={0.7} />
      <path d="M16 14 Q24 10 25 2 Q16 3 16 12" fill="var(--auth-sage-text)" opacity={0.6} />
    </svg>
  );
}

// ── Badge image ───────────────────────────────────────────────────

const WELCOME_FRUIT_FILE_KEYS = ["love", "joy", "peace"] as const;
const WELCOME_FAITH_BADGES = [
  { src: "/badge_mose.webp", labelIndex: 0 },
  { src: "/badge_david.webp", labelIndex: 1 },
  { src: "/badge_joseph.webp", labelIndex: 2 },
  { src: "/qt_bird.webp", labelIndex: 3 },
  { src: "/badge_rootswoman_rest.webp", labelIndex: 4 },
] as const;

function BadgeImage({ src, label }: { src: string; label: string }) {
  return (
    <Image
      src={src}
      alt={label}
      width={54}
      height={54}
      style={{ borderRadius: "50%", objectFit: "cover" }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────

export default function WelcomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<WelcomeCopyLang>("en");
  const [showDropdown, setShowDropdown] = useState(false);

  useAndroidBackHandler(() => {
    if (!showDropdown) return false;
    setShowDropdown(false);
    return true;
  });

  const tx = TEXTS[lang];
  const currentLangMeta = LANG_LIST.find((l) => l.code === lang)!;

  // Restore saved lang
  useEffect(() => {
    const stored = storageGet("roots_lang");
    if (isWelcomeCopyLang(stored)) {
      setLang(stored);
    }
  }, []);

  function selectLang(code: WelcomeCopyLang) {
    setLang(code);
    setShowDropdown(false);
    saveLangLocally(code);
  }

  function goSignup() {
    saveLangLocally(lang);
    router.push(`/signup${getWelcomeRedirect()}`);
  }

  function goLogin() {
    saveLangLocally(lang);
    router.push(`/login${getWelcomeRedirect()}`);
  }


  return (
    <div className={`${styles.page} roots-auth-phase2g`}>
      <div className={styles.phone}>

        {/* ── Lang bar ── */}
        <div className={styles.langBar}>
          <button
            type="button"
            className={styles.langBtn}
            onClick={() => setShowDropdown((v) => !v)}
            aria-label={tx.languageLabel}
            aria-expanded={showDropdown}
            aria-haspopup="menu"
          >
            <IconGlobe />
            <span>{currentLangMeta.name}</span>
            <IconChevronDown open={showDropdown} />
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
                    type="button"
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
          <p className={styles.heroTitleSub}>{tx.heroHeadline}</p>
          <p className={styles.heroDesc}>{tx.heroDescription}</p>
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
          <div className={styles.badgesGroup}>
            <div className={styles.badgesRow}>
              {WELCOME_FRUIT_FILE_KEYS.map((key, i) => (
                <div key={key} className={styles.badgePh}>
                  <BadgeImage src={`/badge_${key}.webp`} label={tx.badgeNames[i]} />
                </div>
              ))}
            </div>
            <div className={styles.badgesRow}>
              {WELCOME_FAITH_BADGES.map(({ src, labelIndex }) => (
                <div key={src} className={styles.badgePh}>
                  <BadgeImage src={src} label={tx.faithBadgeNames[labelIndex]} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Roots Features ── */}
        <div className={`${styles.sectionLabel} ${styles.featuresSectionLabel}`}>
          {tx.featuresLabel}
        </div>
        <div className={styles.features}>
          <div className={styles.featBig}>
            <svg className={styles.featBigBg} width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="55" fill="currentColor" />
            </svg>
            <div className={styles.featIcon} style={{ color: "var(--auth-welcome-on-deep)" }}>
              <IconBook />
            </div>
            <div className={styles.featTitle}>{tx.f1t}</div>
            <div className={styles.featSub}>{tx.f1s}</div>
          </div>

          <div className={styles.featRow}>
            <div className={`${styles.featSm} ${styles.featSmTerra}`}>
              <div className={styles.featIcon} style={{ color: "var(--terra)" }}>
                <IconPrayer />
              </div>
              <div className={styles.featSmTitle}>{tx.f2t}</div>
              <div className={styles.featSmSub}>{tx.f2s}</div>
            </div>
            <div className={styles.featSm}>
              <div className={styles.featIcon} style={{ color: "var(--auth-sage-text)" }}>
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
          <div className={styles.storeBlock} aria-label={tx.storePrompt}>
            <div className={styles.storePrompt}>{tx.storePrompt}</div>
            <div className={styles.storeButtons}>
              <a className={styles.storeButton} href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                <span className={styles.storeIcon}></span>
                <span>{tx.appStore}</span>
              </a>
              <a className={styles.storeButton} href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">
                <span className={styles.storeIcon}>▶</span>
                <span>{tx.googlePlay}</span>
              </a>
            </div>
          </div>
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
