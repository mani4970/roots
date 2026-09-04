export type OnboardingLanguage = "ko" | "de" | "en" | "fr" | "es";

type OnboardingSlideText = {
  title: string;
  desc: string;
};

type OnboardingText = {
  slides: readonly OnboardingSlideText[];
  previous: string;
  next: string;
  start: string;
};

const ONBOARDING_TEXT = {
  ko: {
    slides: [
      {
        title: "루츠에 오신 것을 환영해요",
        desc: "말씀을 묵상하고, 기도하고, 공동체와 함께 나누며 하나님과 동행하는 매일의 영적 습관을 만들어가요.",
      },
      {
        title: "말씀 묵상 (QT)",
        desc: "루츠가 준비한 오늘의 본문이나 가지고 있는 QT책으로 묵상할 수 있어요. 6단계 묵상, 자유형식, 사진 묵상 중 나에게 맞는 방법을 선택하세요.",
      },
      {
        title: "기도",
        desc: "기도 제목과 응답을 기록하고, 동역자와 그룹에 나누어 보세요. 서로 중보하고 받은 은혜를 함께 나누고 축복해요.",
      },
      {
        title: "꾸준함을 돕는 기능",
        desc: "말씀 묵상을 완료할 때마다 성경 이야기 맵이 자라나요. 100일마다 새로운 맵을 만나고, 배지와 성령의 열매를 모아보세요.",
      },
      {
        title: "하트를 모아 나만의 루츠를 꾸며요",
        desc: "다른 사람들의 묵상을 축복하고 함께 기도하고 축복하며 하트를 모아보세요. 모은 하트로 나의 맵과 캐릭터를 원하는 모습으로 꾸밀 수 있어요.",
      },
      {
        title: "",
        desc: "오늘부터 크리스천 루츠와 함께 매일의 영적 습관을 만들어갈 당신을 축복합니다!",
      },
    ],
    previous: "이전",
    next: "다음",
    start: "시작하기",
  },
  de: {
    slides: [
      {
        title: "Willkommen bei Christian Roots",
        desc: "Betrachten Sie Gottes Wort, beten Sie und tauschen Sie sich in der Gemeinschaft aus. Entwickeln Sie so tägliche geistliche Gewohnheiten für ein Leben mit Gott.",
      },
      {
        title: "Stille Zeit",
        desc: "Nutzen Sie den von Roots vorbereiteten Abschnitt des Tages oder Ihr eigenes Andachtsbuch. Wählen Sie zwischen der Stillen Zeit in 6 Schritten, der freien Stillen Zeit und dem Festhalten per Foto.",
      },
      {
        title: "Gebet",
        desc: "Halten Sie Gebetsanliegen und erhörte Gebete fest und teilen Sie sie mit Glaubenspartnern und Gruppen. Treten Sie füreinander ein, teilen Sie empfangene Gnade und segnen Sie einander.",
      },
      {
        title: "Hilfen zum Dranbleiben",
        desc: "Mit jeder abgeschlossenen Stillen Zeit wächst eine biblische Geschichte auf Ihrer Karte. Entdecken Sie alle 100 Tage eine neue Karte und sammeln Sie Abzeichen und Früchte des Geistes.",
      },
      {
        title: "Herzen sammeln und Roots gestalten",
        desc: "Segnen Sie die Stillen Zeiten anderer und beten Sie gemeinsam, um Herzen zu sammeln. Mit Ihren Herzen können Sie Ihre Karte und Ihren Charakter nach Ihren Wünschen gestalten.",
      },
      {
        title: "",
        desc: "Mögen Sie gesegnet sein, wenn Sie ab heute mit Christian Roots tägliche geistliche Gewohnheiten entwickeln!",
      },
    ],
    previous: "Zurück",
    next: "Weiter",
    start: "Loslegen",
  },
  en: {
    slides: [
      {
        title: "Welcome to Christian Roots",
        desc: "Reflect on God’s Word, pray, and share in community as you build daily spiritual habits for walking with God.",
      },
      {
        title: "Bible Reflection (QT)",
        desc: "Reflect with today’s passage prepared by Roots or with your own devotional book. Choose the 6-step, free-form, or photo Bible Reflection—whichever suits you best.",
      },
      {
        title: "Prayer",
        desc: "Record your prayer requests and answers, and share them with faith partners and groups. Pray for one another, share the grace you have received, and bless each other.",
      },
      {
        title: "Features that help you stay consistent",
        desc: "Each time you complete a Bible Reflection, a Bible story map grows. Discover a new map every 100 days, and collect badges and fruits of the Spirit.",
      },
      {
        title: "Collect Hearts and make Roots your own",
        desc: "Bless other people’s Bible Reflections and pray together to collect Hearts. Use your Hearts to decorate your map and customize your character however you like.",
      },
      {
        title: "",
        desc: "Blessings as you begin building daily spiritual habits with Christian Roots today!",
      },
    ],
    previous: "Back",
    next: "Next",
    start: "Start",
  },
  fr: {
    slides: [
      {
        title: "Bienvenue sur Christian Roots",
        desc: "Méditez la Parole de Dieu, priez et partagez en communauté afin de développer des habitudes spirituelles quotidiennes pour marcher avec Dieu.",
      },
      {
        title: "Méditation biblique (QT)",
        desc: "Méditez le passage du jour préparé par Roots ou utilisez votre propre livre de méditation. Choisissez la méditation en 6 étapes, le format libre ou la méditation en photo, selon ce qui vous convient.",
      },
      {
        title: "Prière",
        desc: "Notez vos sujets de prière et les réponses reçues, puis partagez-les avec vos partenaires de foi et vos groupes. Priez les uns pour les autres, partagez la grâce reçue et bénissez-vous mutuellement.",
      },
      {
        title: "Des outils pour persévérer",
        desc: "Chaque méditation biblique terminée fait grandir une histoire biblique sur votre carte. Découvrez une nouvelle carte tous les 100 jours et collectionnez des badges et les fruits de l’Esprit.",
      },
      {
        title: "Collectionnez des Cœurs et personnalisez Roots",
        desc: "Bénissez les méditations bibliques des autres et priez ensemble pour collectionner des Cœurs. Utilisez vos Cœurs pour décorer votre carte et personnaliser votre personnage à votre goût.",
      },
      {
        title: "",
        desc: "Soyez béni(e) alors que vous commencez dès aujourd’hui à développer des habitudes spirituelles quotidiennes avec Christian Roots !",
      },
    ],
    previous: "Précédent",
    next: "Suivant",
    start: "Commencer",
  },
  es: {
    slides: [
      {
        title: "Te damos la bienvenida a Christian Roots",
        desc: "Medita en la Palabra de Dios, ora y comparte en comunidad mientras desarrollas hábitos espirituales diarios para caminar con Dios.",
      },
      {
        title: "Meditación bíblica (QT)",
        desc: "Medita con el pasaje de hoy preparado por Roots o con tu propio libro devocional. Elige la meditación en 6 pasos, el formato libre o la meditación con foto, según lo que mejor se adapte a ti.",
      },
      {
        title: "Oración",
        desc: "Registra tus peticiones y respuestas de oración y compártelas con compañeros de fe y grupos. Intercede por los demás, comparte la gracia recibida y bendice a otros.",
      },
      {
        title: "Funciones para ayudarte a ser constante",
        desc: "Cada vez que completas una meditación bíblica, una historia de la Biblia crece en tu mapa. Descubre un mapa nuevo cada 100 días y reúne insignias y frutos del Espíritu.",
      },
      {
        title: "Reúne Corazones y haz tuyo Roots",
        desc: "Bendice las meditaciones bíblicas de otras personas y ora con ellas para reunir Corazones. Usa tus Corazones para decorar tu mapa y personalizar tu personaje como quieras.",
      },
      {
        title: "",
        desc: "¡Bendiciones mientras empiezas hoy a desarrollar hábitos espirituales diarios con Christian Roots!",
      },
    ],
    previous: "Anterior",
    next: "Siguiente",
    start: "Comenzar",
  },
} as const satisfies Record<OnboardingLanguage, OnboardingText>;

function isOnboardingLanguage(lang: string): lang is OnboardingLanguage {
  return lang === "ko" || lang === "de" || lang === "en" || lang === "fr" || lang === "es";
}

export function getOnboardingText(lang: string): OnboardingText {
  return ONBOARDING_TEXT[isOnboardingLanguage(lang) ? lang : "ko"];
}
