"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LANG_META, type Lang, t } from "@/lib/i18n";
import { markLangSelected } from "@/lib/useLang";

const LANG_DEFAULT_TRANSLATION: Record<Lang, number> = {
  ko: 92,  // 개역개정
  de: 97,  // Hoffnung für Alle
  en: 80,  // NIV
  fr: 26,  // Louis Segond
};

const LANG_LIST: { code: Lang; flag: string; name: string }[] = [
  { code: "ko", flag: "🇰🇷", name: "한국어" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
];

const TEXTS: Record<Lang, {
  tagline: string; desc: string;
  f1t: string; f1s: string; f2t: string; f2s: string;
  f3t: string; f3s: string; f4t: string; f4s: string;
  verse_ref: string; verse_text: string;
  badge_label: string;
  btn_start: string; btn_login: string; footer: string;
}> = {
  ko: {
    tagline: "말씀에 뿌리내리고, 함께 자라다",
    desc: "매일의 영적습관 혼자서 어려우셨나요?\n이제 루츠와 함께 해보세요!\n\n겨자씨 한 알이 자라, 공중의 새들이 깃들이는 나무가 되기까지\n100일 루틴을 시작해보세요.\n하나님과 매일 말씀과 기도로 동행하기를 소원하는 여러분을 축복합니다!",
    f1t: "큐티 (Quiet Time)", f1s: "6단계로 말씀을 깊이 묵상하고 삶에 적용해요.\n자유형식과 주일예배 큐티도 지원해요",
    f2t: "기도", f2s: "기도 제목을 기록하고, 응답되면 간증으로 남겨요.\n오늘의 말씀도 매일 받아볼 수 있어요",
    f3t: "나의 정원", f3s: "매일 루틴을 완료하면 나무가 자라고,\n100일마다 성령의 열매를 맺어요",
    f4t: "커뮤니티", f4s: "서로 중보기도하고, 큐티를 나누며,\n주님 안에서 형제 자매들과 함께 성장해요",
    verse_ref: "빌립보서 4:4", verse_text: "\"주 안에서 항상 기뻐하라\n내가 다시 말하노니 기뻐하라\"",
    badge_label: "성령의 열매",
    btn_start: "시작하기 →", btn_login: "이미 계정이 있어요", footer: "무료 · 광고 없음",
  },
  de: {
    tagline: "In Gottes Wort verwurzelt, gemeinsam wachsen",
    desc: "Fällt es Ihnen schwer, alleine eine geistliche Routine zu halten?\nVersuchen Sie es jetzt mit Roots!\n\nStarten Sie die 100-Tage-Routine\n— vom Senfkorn zum Baum, in dem die Vögel nisten.\nWir segnen alle, die sich danach sehnen,\ntäglich mit Gottes Wort und Gebet zu leben!",
    f1t: "Stille Zeit", f1s: "Gottes Wort in 6 Schritten meditieren und im Alltag anwenden.\nFreie Form und Sonntagsgottesdienst werden auch unterstützt",
    f2t: "Gebet", f2s: "Gebetsanliegen aufschreiben und bei Erhörung ein Zeugnis hinterlassen.\nTägliche Bibelverse empfangen",
    f3t: "Mein Garten", f3s: "Tägliche Routine lässt Ihren Baum wachsen —\nalle 100 Tage eine Frucht des Geistes",
    f4t: "Gemeinde", f4s: "Füreinander beten, Stille Zeiten teilen und\nals Geschwister im Herrn gemeinsam wachsen",
    verse_ref: "Philipper 4,4", verse_text: "\"Freuet euch in dem Herrn allewege,\nund abermals sage ich: Freuet euch!\"",
    badge_label: "Früchte des Geistes",
    btn_start: "Jetzt starten →", btn_login: "Ich habe bereits ein Konto", footer: "Kostenlos · Keine Werbung",
  },
  en: {
    tagline: "Rooted in God's Word, Growing Together",
    desc: "Struggling to keep a daily spiritual habit on your own?\nTry it with Roots!\n\nStart the 100-day routine\n— from a mustard seed to a tree where birds come to nest.\nWe bless everyone who longs to walk with God\ndaily through His Word and prayer!",
    f1t: "Quiet Time", f1s: "Meditate on God's Word in 6 steps and apply it to your life.\nFree-form and Sunday worship QT also supported",
    f2t: "Prayer", f2s: "Record prayer requests and leave testimonies when answered.\nReceive a daily Bible verse tailored to your heart",
    f3t: "My Garden", f3s: "Complete daily routines to grow your tree —\nearn a fruit of the Spirit every 100 days",
    f4t: "Community", f4s: "Pray for one another, share Quiet Times,\nand grow together as brothers and sisters in the Lord",
    verse_ref: "Philippians 4:4", verse_text: "\"Rejoice in the Lord always.\nI will say it again: Rejoice!\"",
    badge_label: "Fruits of the Spirit",
    btn_start: "Get Started →", btn_login: "I already have an account", footer: "Free · No Ads",
  },
  fr: {
    tagline: "Enracinés dans la Parole, grandissons ensemble",
    desc: "Difficile de maintenir une habitude spirituelle seul(e) ?\nEssayez avec Roots !\n\nCommencez la routine de 100 jours\n— d'une graine de moutarde à un arbre où les oiseaux viennent nicher.\nNous bénissons tous ceux qui désirent marcher chaque jour\navec Dieu dans Sa Parole et la prière !",
    f1t: "Méditation (Quiet Time)", f1s: "Méditez la Parole de Dieu en 6 étapes et appliquez-la dans votre vie.\nForme libre et culte du dimanche aussi",
    f2t: "Prière", f2s: "Notez vos sujets de prière et témoignez des prières exaucées.\nRecevez un verset biblique quotidien",
    f3t: "Mon Jardin", f3s: "Complétez vos routines pour faire grandir votre arbre —\nun fruit de l'Esprit tous les 100 jours",
    f4t: "Communauté", f4s: "Priez les uns pour les autres, partagez vos méditations\net grandissez ensemble en tant que frères et sœurs dans le Seigneur",
    verse_ref: "Philippiens 4:4", verse_text: "\"Réjouissez-vous toujours dans le Seigneur ;\nje le répète, réjouissez-vous !\"",
    badge_label: "Fruits de l'Esprit",
    btn_start: "Commencer →", btn_login: "J'ai déjà un compte", footer: "Gratuit · Sans publicité",
  },
};

function NL({ text }: { text: string }) {
  return <>{text.split("\n").map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</>;
}

export default function WelcomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ko");
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const tx = TEXTS[lang];
  const currentLangMeta = LANG_LIST.find(l => l.code === lang)!;

  useEffect(() => {
    // 이미 언어 선택한 적 있으면 그 언어로
    const stored = localStorage.getItem("roots_lang");
    if (stored && ["ko", "de", "en", "fr"].includes(stored)) {
      setLang(stored as Lang);
    }
  }, []);

  function selectLang(code: Lang) {
    setLang(code);
    setShowLangDropdown(false);
    // 언어 저장 (앱 전체에 적용됨)
    localStorage.setItem("roots_lang", code);
    markLangSelected();
  }

  function goSignup() {
    // 언어 + 기본 성경 번역 저장
    localStorage.setItem("roots_lang", lang);
    localStorage.setItem("roots_default_translation", String(LANG_DEFAULT_TRANSLATION[lang]));
    markLangSelected();
    router.push("/signup");
  }

  function goLogin() {
    localStorage.setItem("roots_lang", lang);
    localStorage.setItem("roots_default_translation", String(LANG_DEFAULT_TRANSLATION[lang]));
    markLangSelected();
    router.push("/login");
  }

  const features = [
    { icon: "📖", title: tx.f1t, sub: tx.f1s, color: "sage" },
    { icon: "🙏", title: tx.f2t, sub: tx.f2s, color: "terra" },
    { icon: "🌱", title: tx.f3t, sub: tx.f3s, color: "sage" },
    { icon: "🤝", title: tx.f4t, sub: tx.f4s, color: "blue" },
  ];

  const badges = ["badge_love", "badge_peace", "badge_joy", "badge_goodness", "badge_kindness", "badge_patience"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", position: "relative" }}>
      {/* 언어 선택 드롭다운 */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 30 }}>
        <button
          onClick={() => setShowLangDropdown(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            height: 36, padding: "0 12px", borderRadius: 999,
            border: "1px solid var(--border)", background: "rgba(255,255,255,0.64)",
            color: "var(--text)", fontSize: 13, fontWeight: 700,
            boxShadow: "0 6px 18px rgba(0,0,0,0.05)", cursor: "pointer",
            backdropFilter: "blur(8px)",
          }}
        >
          <span style={{ fontSize: 16 }}>{currentLangMeta.flag}</span>
          <span>{lang.toUpperCase()}</span>
        </button>

        {showLangDropdown && (
          <>
            <div onClick={() => setShowLangDropdown(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
            <div style={{
              position: "absolute", right: 0, top: 44, width: 178,
              background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 18,
              padding: 6, boxShadow: "0 14px 38px rgba(0,0,0,0.14)", zIndex: 31,
            }}>
              {LANG_LIST.map(opt => (
                <button
                  key={opt.code}
                  onClick={() => selectLang(opt.code)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 9,
                    border: "none", borderRadius: 12, padding: "10px",
                    background: opt.code === lang ? "var(--sage-light)" : "transparent",
                    color: opt.code === lang ? "var(--sage-dark)" : "var(--text)",
                    cursor: "pointer", textAlign: "left", fontSize: 13,
                    fontWeight: opt.code === lang ? 800 : 600,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{opt.flag}</span>
                  <span>{opt.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Hero */}
      <div style={{ background: "linear-gradient(180deg, var(--sage-light) 0%, var(--bg) 100%)", padding: "52px 28px 28px", textAlign: "center" }}>
        {/* 새싹 SVG */}
        <svg width="60" height="75" viewBox="0 0 80 100" fill="none" style={{ marginBottom: 16 }}>
          <path d="M40 90 Q38 70 40 50" stroke="#7A9D7A" strokeWidth="3" strokeLinecap="round"/>
          <path d="M40 65 Q25 55 22 40 Q35 42 40 55" fill="#7A9D7A" opacity="0.85"/>
          <path d="M40 58 Q55 48 58 33 Q45 35 40 48" fill="#5C8A58" opacity="0.85"/>
          <ellipse cx="40" cy="90" rx="18" ry="5" fill="#C4956A" opacity="0.4"/>
        </svg>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 40, fontWeight: 900, color: "var(--text)", letterSpacing: -1.5, marginBottom: 10 }}>Roots</h1>
        <p style={{ fontSize: 14, color: "var(--sage-dark)", fontWeight: 700, marginBottom: 16, lineHeight: 1.5 }}>{tx.tagline}</p>
        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.9, whiteSpace: "pre-line" }}>{tx.desc}</p>
      </div>

      {/* 정원 이미지 */}
      <div style={{ margin: "0 20px", borderRadius: 20, overflow: "hidden", border: "1px solid var(--border)" }}>
        <Image src="/tree11.png" alt="Garden" width={800} height={300} style={{ width: "100%", height: 155, objectFit: "cover", imageRendering: "pixelated" }} />
      </div>

      {/* 구분선 */}
      <div style={{ width: 40, height: 2, background: "var(--beige)", margin: "22px auto", borderRadius: 2 }} />

      {/* 기능 소개 */}
      <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 14px", background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--border)" }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0,
              background: f.color === "sage" ? "var(--sage-light)" : f.color === "terra" ? "var(--terra-light)" : "rgba(122,157,200,0.15)",
            }}>{f.icon}</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{f.title}</p>
              <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6, whiteSpace: "pre-line" }}>{f.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 말씀 미리보기 */}
      <div style={{ margin: "20px 22px 0", padding: 20, background: "var(--sage-light)", borderRadius: 16, textAlign: "center", border: "1px solid rgba(122,157,122,0.2)" }}>
        <p style={{ fontSize: 10, color: "var(--sage-dark)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>{tx.verse_ref}</p>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 14, color: "var(--text)", lineHeight: 1.9, fontStyle: "italic", whiteSpace: "pre-line" }}>{tx.verse_text}</p>
      </div>

      {/* 성령의 열매 */}
      <div style={{ padding: "20px 22px 0", textAlign: "center" }}>
        <p style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, marginBottom: 10 }}>{tx.badge_label}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {badges.map(b => (
            <div key={b} style={{ width: 42, height: 42, borderRadius: "50%", border: "2px solid var(--border)", overflow: "hidden" }}>
              <Image src={`/${b}.png`} alt="" width={42} height={42} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      </div>

      {/* CTA 버튼 */}
      <div style={{ padding: "22px 22px 10px" }}>
        <button onClick={goSignup} className="btn-primary" style={{ width: "100%", minHeight: 52, fontSize: 16, borderRadius: 14 }}>
          {tx.btn_start}
        </button>
        <button onClick={goLogin} style={{
          width: "100%", padding: 15, background: "transparent", color: "var(--sage-dark)",
          border: "1.5px solid var(--sage)", borderRadius: 14, fontSize: 14, fontWeight: 600,
          cursor: "pointer", marginTop: 10,
        }}>
          {tx.btn_login}
        </button>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "14px 22px 32px" }}>
        <p style={{ fontSize: 10, color: "var(--text3)" }}>{tx.footer}</p>
      </div>
    </div>
  );
}
