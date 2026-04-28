"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t, type Lang } from "@/lib/i18n";
import { translateBibleRef } from "@/lib/bibleBooks";
import { getLocalDateString } from "@/lib/date";
import { ChevronLeft, Check, Loader2, Plus, Trash2, ChevronDown, BookOpen, X, ChevronUp } from "lucide-react";

const OT_BOOKS = ["창세기","출애굽기","레위기","민수기","신명기","여호수아","사사기","룻기","사무엘상","사무엘하","열왕기상","열왕기하","역대상","역대하","에스라","느헤미야","에스더","욥기","시편","잠언","전도서","아가","이사야","예레미야","예레미야애가","에스겔","다니엘","호세아","요엘","아모스","오바댜","요나","미가","나훔","하박국","스바냐","학개","스가랴","말라기"];
const NT_BOOKS = ["마태복음","마가복음","누가복음","요한복음","사도행전","로마서","고린도전서","고린도후서","갈라디아서","에베소서","빌립보서","골로새서","데살로니가전서","데살로니가후서","디모데전서","디모데후서","디도서","빌레몬서","히브리서","야고보서","베드로전서","베드로후서","요한일서","요한이서","요한삼서","유다서","요한계시록"];

// 번역본 목록 (하드코딩)
const TRANSLATIONS = [
  { group: "한국어", items: [
    { id: 92, name: "개역개정" },
    { id: 84, name: "개역한글" },
    { id: 98, name: "새번역" },
    { id: 88, name: "쉬운성경" },
    { id: 89, name: "우리말성경" },
    { id: 90, name: "바른성경" },
    { id: 83, name: "현대인의성경" },
    { id: 81, name: "공동번역" },
    { id: 99, name: "새한글" },
    { id: 87, name: "한글KJV" },
  ]},
  { group: "English", items: [
    { id: 67, name: "KJV" },
    { id: 80, name: "NIV" },
    { id: 100, name: "ESV" },
    { id: 62, name: "NASB" },
    { id: 82, name: "NLT" },
    { id: 95, name: "The Message" },
  ]},
  { group: "Deutsch", items: [
    { id: 29, name: "Luther" },
    { id: 27, name: "Elberfelder" },
    { id: 97, name: "Hoffnung für Alle" },
  ]},
  { group: "Français", items: [
    { id: 26, name: "Louis Segond" },
    { id: 24, name: "Jérusalem" },
  ]},
];

const ALL_TRANSLATIONS = TRANSLATIONS.flatMap(g => g.items);

// 번역본 ID → 언어 코드
const TRANSLATION_LANG: Record<number, string> = {
  92:"KO", 84:"KO", 98:"KO", 88:"KO", 89:"KO", 90:"KO", 83:"KO", 81:"KO", 99:"KO", 87:"KO",
  67:"EN", 80:"EN", 100:"EN", 62:"EN", 82:"EN", 95:"EN",
  29:"DE", 27:"DE", 97:"DE",
  26:"FR", 24:"FR",
};

// 언어별 책 이름 (구약 39권 + 신약 27권)
const BOOK_NAMES: Record<string, string[]> = {
  KO: ["창세기","출애굽기","레위기","민수기","신명기","여호수아","사사기","룻기","사무엘상","사무엘하","열왕기상","열왕기하","역대상","역대하","에스라","느헤미야","에스더","욥기","시편","잠언","전도서","아가","이사야","예레미야","예레미야애가","에스겔","다니엘","호세아","요엘","아모스","오바댜","요나","미가","나훔","하박국","스바냐","학개","스가랴","말라기","마태복음","마가복음","누가복음","요한복음","사도행전","로마서","고린도전서","고린도후서","갈라디아서","에베소서","빌립보서","골로새서","데살로니가전서","데살로니가후서","디모데전서","디모데후서","디도서","빌레몬서","히브리서","야고보서","베드로전서","베드로후서","요한일서","요한이서","요한삼서","유다서","요한계시록"],
  EN: ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"],
  DE: ["1. Mose","2. Mose","3. Mose","4. Mose","5. Mose","Josua","Richter","Rut","1. Samuel","2. Samuel","1. Könige","2. Könige","1. Chronik","2. Chronik","Esra","Nehemia","Ester","Hiob","Psalmen","Sprüche","Prediger","Hoheslied","Jesaja","Jeremia","Klagelieder","Hesekiel","Daniel","Hosea","Joel","Amos","Obadja","Jona","Micha","Nahum","Habakuk","Zefanja","Haggai","Sacharja","Maleachi","Matthäus","Markus","Lukas","Johannes","Apostelgeschichte","Römer","1. Korinther","2. Korinther","Galater","Epheser","Philipper","Kolosser","1. Thessalonicher","2. Thessalonicher","1. Timotheus","2. Timotheus","Titus","Philemon","Hebräer","Jakobus","1. Petrus","2. Petrus","1. Johannes","2. Johannes","3. Johannes","Judas","Offenbarung"],
  FR: ["Genèse","Exode","Lévitique","Nombres","Deutéronome","Josué","Juges","Ruth","1 Samuel","2 Samuel","1 Rois","2 Rois","1 Chroniques","2 Chroniques","Esdras","Néhémie","Esther","Job","Psaumes","Proverbes","Ecclésiaste","Cantique","Ésaïe","Jérémie","Lamentations","Ézéchiel","Daniel","Osée","Joël","Amos","Abdias","Jonas","Michée","Nahum","Habacuc","Sophonie","Aggée","Zacharie","Malachie","Matthieu","Marc","Luc","Jean","Actes","Romains","1 Corinthiens","2 Corinthiens","Galates","Éphésiens","Philippiens","Colossiens","1 Thessaloniciens","2 Thessaloniciens","1 Timothée","2 Timothée","Tite","Philémon","Hébreux","Jacques","1 Pierre","2 Pierre","1 Jean","2 Jean","3 Jean","Jude","Apocalypse"],
};

function isSunday(dateStr: string) {
  return new Date(dateStr + "T12:00:00").getDay() === 0;
}

// ─── QT Write 번역 매핑 ──
// 원본 STEPS_6 / STEPS_SUNDAY 배열의 한국어 문자열을 key로 쓰고,
// 렌더링 시점에 `trQT(str, lang)` 로 감싸서 독일어/영어로 변환.
// 배열 구조를 건드리지 않아 기존 로직(step.id, step.isPassageStep 등) 그대로 동작.
const QT_WRITE_TRANSLATIONS: Record<string, Partial<Record<Lang, string>>> = {
  // 6단계 제목/부제목
  "들어가는 기도": { de: "Eröffnungsgebet", en: "Opening Prayer", fr: "Prière d’ouverture" },
  "말씀 앞에 나아가기 전 기도": { de: "Gebet vor dem Wort", en: "Prayer before the Word", fr: "Prière avant la Parole" },
  "본문 요약 & 붙잡은 말씀": { de: "Zusammenfassung & Schlüsselvers", en: "Summary & Key Verse", fr: "Résumé & verset clé" },
  "본문을 읽고 마음에 새겨요": { de: "Den Text lesen und ins Herz aufnehmen", en: "Read and engrave the text in your heart", fr: "Lisez le texte et gardez-le dans votre cœur" },
  "느낌과 묵상": { de: "Empfinden & Meditation", en: "Reflection & Meditation", fr: "Méditation" },
  "이 말씀이 내게 주는 의미": { de: "Was bedeutet das Wort für mich?", en: "What this Word means to me", fr: "Ce que cette Parole signifie pour moi" },
  "적용과 결단": { de: "Anwendung & Entschluss", en: "Application & Resolution", fr: "Décision" },
  "오늘 하루 어떻게 살 건가요?": { de: "Wie leben Sie heute?", en: "How will you live today?", fr: "Comment allez-vous vivre aujourd’hui ?" },
  "올려드리는 기도": { de: "Abschlussgebet", en: "Closing Prayer", fr: "Prière finale" },
  "말씀으로 드리는 기도": { de: "Gebet mit dem Wort", en: "Prayer with the Word", fr: "Prière avec la Parole" },
  // 6단계 placeholder / hint
  "주님, 오늘 말씀 앞에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.": { de: "Herr, ich komme heute vor dein Wort...\nÖffne meine Augen, Ohren und mein Herz.", en: "Lord, I come before your word today...\nOpen my eyes, ears, and heart.", fr: "Seigneur, je viens devant ta Parole aujourd’hui...\\nOuvre mes yeux, mes oreilles et mon cœur." },
  "짧아도 괜찮아요. 마음을 열고 주님께 나아가는 기도예요.": { de: "Kurz reicht auch. Ein Gebet mit offenem Herzen.", en: "Short is fine. A prayer with an open heart.", fr: "Court, c’est très bien. Une prière avec un cœur ouvert." },
  "이 말씀이 오늘 내 삶에 무슨 말씀인가요?\n솔직하게 느낀 것을 써보세요.": { de: "Was sagt dieses Wort in mein Leben hinein?\nSchreiben Sie ehrlich, was Sie empfinden.", en: "What does this word mean for my life? Write honestly about your feelings.", fr: "Que dit cette Parole dans ma vie aujourd’hui ?\\nÉcrivez honnêtement ce que vous ressentez." },
  "정답이 없어요. 성령님의 이끄심에 맡겨봐요.": { de: "Es gibt keine richtige Antwort. Lassen Sie sich vom Heiligen Geist leiten.", en: "There's no right answer. Let the Holy Spirit guide you.", fr: "Il n’y a pas de bonne réponse unique. Laissez-vous guider par le Saint-Esprit." },
  "붙잡은 말씀으로 묵상해요": { de: "Mit dem Schlüsselvers meditieren", en: "Reflect with your key verse", fr: "Méditer avec le verset clé" },
  "이 말씀을 붙들고 느낌과 묵상을 적어보세요.": { de: "Halten Sie dieses Wort fest und schreiben Sie Ihre Gedanken auf.", en: "Hold on to this verse and write your reflection.", fr: "Appuyez-vous sur cette Parole et écrivez votre méditation." },
  "성품은 마음을 정하는 것, 행동은 손과 발로 드러나는 것이에요.": { de: "Charakter ist die Entscheidung des Herzens, Handlung wird mit Händen und Füßen sichtbar.", en: "Character is the decision of the heart, action is shown through hands and feet.", fr: "Le caractère est la décision du cœur ; l’action se voit par les mains et les pieds." },
  "말씀을 붙들고 기도를 올려드려요...": { de: "Gebet, das das Wort festhält...", en: "Hold on to the Word and pray...", fr: "Priez en vous appuyant sur la Parole..." },
  "말씀과 결단을 간결하게 다시 하나님께 올려드려요.": { de: "Wort und Entschluss noch einmal kurz vor Gott bringen.", en: "Bring the Word and resolution before God once more.", fr: "Présentez encore une fois la Parole et votre décision devant Dieu." },
  // 6단계 진행바 라벨
  "본문 요약": { de: "Zusammenf.", en: "Summary", fr: "Résumé du passage" },
  "붙잡은 말씀": { de: "Schlüsselvers", en: "Key Verse", fr: "Verset clé" },
  // 주일예배
  "설교 정보": { de: "Predigt-Info", en: "Sermon Info", fr: "Infos du sermon" },
  "설교 제목과 본문 말씀을 적어요": { de: "Titel und Bibelstelle der Predigt", en: "Write the sermon title and passage", fr: "Écrivez le titre du sermon et le passage biblique" },
  "예배 전 마음을 준비해요": { de: "Herz vor dem Gottesdienst vorbereiten", en: "Prepare your heart for worship", fr: "Préparez votre cœur avant le culte" },
  "주님, 오늘 예배에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.": { de: "Herr, ich komme heute zum Gottesdienst...\nÖffne meine Augen, Ohren und mein Herz.", en: "Lord, I come before your word today...\nOpen my eyes, ears, and heart.", fr: "Seigneur, je viens au culte aujourd’hui...\\nOuvre mes yeux, mes oreilles et mon cœur." },
  "예배 전 마음을 열고 주님께 나아가는 기도예요.": { de: "Gebet mit offenem Herzen vor dem Gottesdienst.", en: "A prayer with an open heart before worship.", fr: "Une prière pour ouvrir votre cœur devant Dieu avant le culte." },
  "말씀 요약": { de: "Zusammenfassung", en: "Summary", fr: "Résumé de la Parole" },
  "설교 말씀을 내 말로 요약해요": { de: "Predigt in eigenen Worten zusammenfassen", en: "Summarize the sermon in your own words", fr: "Résumez le sermon avec vos propres mots" },
  "오늘 설교 핵심 내용을 자신의 말로 요약해보세요...": { de: "Fassen Sie die Kernbotschaft der Predigt in eigenen Worten zusammen...", en: "Summarize the key message in your own words...", fr: "Résumez le message principal du sermon avec vos propres mots..." },
  "목사님이 전한 핵심 메시지를 나의 말로 정리해요.": { de: "Die Kernbotschaft des Pastors in eigene Worte fassen.", en: "Put the pastor's core message in your own words.", fr: "Reformulez avec vos mots le message central transmis par le pasteur." },
  "깨달음과 결단": { de: "Erkenntnis & Entschluss", en: "Insight & Resolution", fr: "Compréhension et décision" },
  "말씀이 내게 주는 깨달음과 결단": { de: "Erkenntnis und Entschluss aus dem Wort", en: "Insight and resolution from the Word", fr: "Ce que la Parole m’enseigne et ma décision" },
  "말씀을 통해 깨달은 것, 그리고 삶으로 살아낼 결단을 적어요.": { de: "Was Sie erkannt haben und wie Sie es leben wollen.", en: "What you realized and how you'll live it out.", fr: "Écrivez ce que vous avez compris par la Parole et la décision que vous voulez vivre." },
  "예배의 마무리 기도": { de: "Abschlussgebet des Gottesdienstes", en: "Closing prayer of worship", fr: "Prière finale du culte" },
  "오늘 받은 은혜와 결단을 하나님께 올려드려요...": { de: "Die empfangene Gnade und den Entschluss vor Gott bringen...", en: "Bring today's grace and resolution before God...", fr: "Présentez à Dieu la grâce reçue aujourd’hui et votre décision..." },
  "받은 말씀과 결단을 하나님께 올려드려요.": { de: "Das Wort und den Entschluss Gott darbringen.", en: "Offer the Word and resolution to God.", fr: "Offrez à Dieu la Parole reçue et votre décision." },
  // 에러 메시지 / alert
  "끝 절이 시작 절보다 작아요": { de: "Endvers ist kleiner als Startvers", en: "End verse is smaller than start verse", fr: "Le verset final est avant le verset initial" },
  "본문을 불러오지 못했어요.": { de: "Abschnitt konnte nicht geladen werden.", en: "Could not load the passage.", fr: "Impossible de charger le passage." },
  "임시저장됐어요! 나중에 이어쓸 수 있어요 😊": { de: "Als Entwurf gespeichert!\nSie können später weitermachen 😊", en: "Saved as draft!\nContinue later 😊", fr: "Brouillon enregistré !\nVous pourrez continuer plus tard 😊" },
  "임시저장에 실패했어요. 다시 시도해주세요.": { de: "Entwurf konnte nicht gespeichert werden. Bitte erneut versuchen.", en: "Draft save failed. Please try again.", fr: "Échec de l’enregistrement du brouillon. Veuillez réessayer." },
  "저장에 실패했어요. 다시 시도해주세요.": { de: "Speichern fehlgeschlagen. Bitte erneut versuchen.", en: "Save failed. Please try again.", fr: "Échec de l’enregistrement. Veuillez réessayer." },
  // UI 문자열
  "오늘": { de: "Heute", en: "Today", fr: "Aujourd’hui" },
  "오늘의 말씀 찾기": { de: "Heutigen Abschnitt finden", en: "Find today's passage", fr: "Trouver le passage du jour" },
  "오늘의 말씀 찾기 (선택)": { de: "Heutigen Abschnitt finden (optional)", en: "Find today's passage (optional)", fr: "Trouver le passage du jour (optionnel)" },
  "장이 넘어가는 말씀 (예: 9장 25절~10장 6절)": { de: "Kapitel-übergreifend (z. B. 9,25 – 10,6)", en: "Cross-chapter (e.g. 9:25 – 10:6)", fr: "Passage sur deux chapitres (ex. 9.25 – 10.6)" },
  "오늘 읽은 말씀, 느낀 점, 깨달음을 자유롭게 적어보세요...": { de: "Schreiben Sie frei über das Wort, Ihre Gedanken und Erkenntnisse...", en: "Write freely about the Word, your thoughts and insights...", fr: "Écrivez librement la Parole lue aujourd’hui, vos ressentis et vos découvertes..." },
  "예: 두려워하지 말라": { de: "z. B. Fürchte dich nicht", en: "e.g. Do not be afraid", fr: "ex. Ne crains pas" },
  "예: 이사야 41:10 / 요한복음 3:16": { de: "z. B. Jesaja 41,10 / Johannes 3,16", en: "e.g. Isaiah 41:10 / John 3:16", fr: "ex. Ésaïe 41.10 / Jean 3.16" },
  "개인적이고 솔직하게 써보세요...": { de: "Persönlich und ehrlich schreiben...", en: "Write personally and honestly...", fr: "Écrivez de façon personnelle et honnête..." },
  "이 말씀 앞에서 어떤 마음을 품기로 결심했나요?": { de: "Welche Haltung nehmen Sie vor diesem Wort ein?", en: "What attitude will you take before this Word?", fr: "Quelle disposition de cœur choisissez-vous devant cette Parole ?" },
  "본문 내용을 자신의 말로 요약해보세요...": { de: "Fassen Sie den Text in eigenen Worten zusammen...", en: "Summarize the text in your own words...", fr: "Résumez le texte avec vos propres mots..." },
  "마음에 와닿은 구절을 적거나 위에서 선택하세요...": { de: "Schreiben Sie den berührenden Vers oder wählen Sie oben...", en: "Write the verse that touched you or select above...", fr: "Écrivez le verset qui vous touche ou choisissez-le ci-dessus..." },
  // 요일 단어
  "일": { de: "So", en: "Sun", fr: "Dim" }, "월": { de: "Mo", en: "Mon", fr: "Lun" }, "화": { de: "Di", en: "Tue", fr: "Mar" }, "수": { de: "Mi", en: "Wed", fr: "Mer" },
  "목": { de: "Do", en: "Thu", fr: "Jeu" }, "금": { de: "Fr", en: "Fri", fr: "Ven" }, "토": { de: "Sa", en: "Sat", fr: "Sam" },
  "· 오늘": { de: "· Heute", en: "· Today", fr: "· Aujourd’hui" },
  // 버튼 / 라벨
  "나가기": { de: "Zurück", en: "Exit", fr: "Sortir" },
  "더보기": { de: "Mehr", en: "More", fr: "Voir plus" },
  "접기": { de: "Weniger", en: "Less", fr: "Réduire" },
  "다음 단계 →": { de: "Nächster Schritt →", en: "Next Step →", fr: "Étape suivante →" },
  "← 이전": { de: "← Zurück", en: "← Back", fr: "← Retour" },
  "💾 임시저장하고 나중에 이어쓰기": { de: "💾 Als Entwurf speichern", en: "💾 Save as draft", fr: "💾 Enregistrer comme brouillon" },
  "성품 (마음의 결심)": { de: "Charakter (Haltung des Herzens)", en: "Character (heart's decision)", fr: "Caractère (décision du cœur)" },
  "행동 (구체적인 실천)": { de: "Handlung (konkretes Tun)", en: "Action (concrete practice)", fr: "Action (pratique concrète)" },
  "행동 추가하기": { de: "Handlung hinzufügen", en: "Add action", fr: "Ajouter une action" },
  "💡 절을 탭하면 붙잡은 말씀에 추가돼요": { de: "💡 Tippen Sie auf einen Vers, um ihn als Schlüsselvers zu speichern", en: "💡 Tap a verse to add it as key verse", fr: "💡 Touchez un verset pour l’ajouter au verset clé" },
  "2단계 · 본문 요약": { de: "Schritt 2 · Zusammenfassung", en: "Step 2 · Summary", fr: "Étape 2 · Résumé du passage" },
  "3단계 · 붙잡은 말씀": { de: "Schritt 3 · Schlüsselvers", en: "Step 3 · Key Verse", fr: "Étape 3 · Verset clé" },
  "(위 절 탭하면 자동 추가)": { de: "(Vers oben antippen)", en: "(Tap verse above)", fr: "(Touchez un verset ci-dessus pour l’ajouter)" },
  "행동 1": { de: "Handlung 1", en: "Action 1", fr: "Action 1" },
  "단계": { de: "Schritt", en: "Step", fr: "Étape" },
  "자유 큐티": { de: "Freie Stille Zeit", en: "Free Quiet Time", fr: "QT libre" },
  "오늘의 묵상": { de: "Heutige Meditation", en: "Today's Meditation", fr: "Méditation du jour" },
  "결단 — 말씀을 삶에 적용해보세요!": { de: "Vorsatz — Wort im Leben anwenden!", en: "Resolution — Apply the Word to life!", fr: "Décision — appliquez la Parole dans votre vie !" },
  "결단 1": { de: "Vorsatz 1", en: "Resolution 1", fr: "Décision 1" },
  "결단 추가하기": { de: "Vorsatz hinzufügen", en: "Add resolution", fr: "Ajouter une décision" },
  "큐티 완료": { de: "QT abschließen", en: "QT Complete", fr: "QT terminé" },
  "저장 중...": { de: "Wird gespeichert...", en: "Saving...", fr: "Enregistrement..." },
  "성경 책": { de: "Buch der Bibel", en: "Book of the Bible", fr: "Livre biblique" },
  "성경 책 선택": { de: "Buch der Bibel wählen", en: "Select a book", fr: "Choisir un livre" },
  "시작 장": { de: "Anfangskapitel", en: "Start chapter", fr: "Chapitre de début" },
  "시작 절": { de: "Anfangsvers", en: "Start verse", fr: "Verset de début" },
  "끝 절": { de: "Endvers", en: "End verse", fr: "Verset de fin" },
  "말씀 불러오기": { de: "Abschnitt laden", en: "Load passage", fr: "Charger le passage" },
  "불러오는 중...": { de: "Wird geladen...", en: "Loading...", fr: "Chargement..." },
  "말씀 없이 자유롭게 작성하기": { de: "Ohne Abschnitt frei schreiben", en: "Write freely without a passage", fr: "Écrire librement sans passage" },
  "큐티할 말씀을 먼저 선택해요": { de: "Bitte zuerst einen Abschnitt wählen", en: "Please select a passage first", fr: "Veuillez d’abord choisir un passage" },
  "다시 선택": { de: "Neu wählen", en: "Reselect", fr: "Choisir à nouveau" },
  "설교 제목": { de: "Predigttitel", en: "Sermon title", fr: "Titre du sermon" },
  "본문 말씀": { de: "Bibelstelle", en: "Bible passage", fr: "Passage biblique" },
  "깨달음 (말씀이 내게 주는 것)": { de: "Erkenntnis (Was das Wort mir sagt)", en: "Insight (what the Word gives me)", fr: "Compréhension (ce que la Parole me donne)" },
  "오늘 설교를 통해 하나님이 내게 하신 말씀은 무엇인가요?": { de: "Was hat Gott mir heute durch die Predigt gesagt?", en: "What did God say to me through today's sermon?", fr: "Qu’est-ce que Dieu m’a dit aujourd’hui à travers le sermon ?" },
  "구약": { de: "AT", en: "OT", fr: "Ancien Testament" },
  "신약": { de: "NT", en: "NT", fr: "Nouveau Testament" },
  "임시저장은 오늘 큐티에만 가능해요.": { de: "Entwürfe können nur für heute gespeichert werden.", en: "Drafts can only be saved for today.", fr: "Les brouillons ne peuvent être enregistrés que pour le QT d’aujourd’hui." },
  "이미 큐티 기록이 있어요": { de: "Für {date} gibt es bereits einen QT-Eintrag.", en: "A QT record already exists for {date}." },
  "끝 장": { de: "Endkapitel", en: "End chapter", fr: "Chapitre de fin" },
  "말씀을 삶에 적용해보세요!": { de: "Wort im Leben anwenden!", en: "Apply the Word to life!", fr: "Appliquez la Parole dans votre vie !" },
  "성품": { de: "Charakter", en: "Character", fr: "Caractère" },
  "행동": { de: "Handlung", en: "action", fr: "Action" },
  "은 마음을 정하는 것,": { de: " ist die Entscheidung des Herzens, ", en: " is the decision of the heart, ", fr: " est la décision du cœur, " },
  "은 손과 발로 드러나는 것이에요.": { de: " wird mit Händen und Füßen sichtbar.", en: " is shown through hands and feet.", fr: " se manifeste par les mains et les pieds." },
};

/** QT Write 전용 번역 함수 — 매핑에 없는 문자열은 원본 그대로 반환 */
function trQT(str: string, lang: Lang): string {
  if (lang === "ko") return str;
  return QT_WRITE_TRANSLATIONS[str]?.[lang] ?? (lang === "fr" ? QT_WRITE_TRANSLATIONS[str]?.en : undefined) ?? str;
}

function trQTVars(str: string, lang: Lang, vars: Record<string, string | number>): string {
  let out = trQT(str, lang);
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return out;
}

// 성경 66권 장별 최대 절수 데이터
const BIBLE_CHAPTERS: Record<string, number[]> = {"창세기": [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 23, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26], "출애굽기": [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38], "레위기": [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 24, 16, 30, 24, 20, 28, 27, 30, 20], "민수기": [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13], "신명기": [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12], "여호수아": [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33], "사사기": [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25], "룻기": [22, 23, 18, 22], "사무엘상": [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13], "사무엘하": [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25], "열왕기상": [53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53], "열왕기하": [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30], "역대상": [54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30], "역대하": [17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23], "에스라": [11, 70, 13, 24, 17, 22, 28, 36, 15, 44], "느헤미야": [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31], "에스더": [22, 23, 15, 17, 14, 14, 10, 17, 32, 3], "욥기": [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17], "시편": [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 20, 28, 22, 35, 45, 48, 43, 12, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6, 8, 10, 5, 7, 7, 8, 4, 2, 3, 8, 4, 8, 5, 8, 7, 4, 9, 2, 14, 14, 14, 9, 7, 6, 3, 9, 1, 7, 3, 4, 8, 3, 9, 4, 7, 6, 8, 4, 6, 8, 7, 8, 7, 5, 5, 9, 9, 16, 9, 6, 7, 7, 5, 3, 7, 6, 6], "잠언": [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31], "전도서": [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14], "아가": [17, 17, 11, 16, 16, 13, 13, 14], "이사야": [31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24], "예레미야": [19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34], "예레미야애가": [22, 22, 66, 22, 22], "에스겔": [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35], "다니엘": [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13], "호세아": [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9], "요엘": [20, 32, 21], "아모스": [15, 16, 15, 13, 27, 14, 17, 14, 15], "오바댜": [21], "요나": [17, 10, 10, 11], "미가": [16, 13, 12, 13, 15, 16, 20], "나훔": [15, 13, 19], "하박국": [17, 20, 19], "스바냐": [18, 15, 20], "학개": [15, 23], "스가랴": [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21], "말라기": [14, 17, 18, 6], "마태복음": [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20], "마가복음": [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20], "누가복음": [80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56, 53], "요한복음": [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25], "사도행전": [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31], "로마서": [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27], "고린도전서": [31, 16, 23, 21, 13, 20, 40, 34, 29, 22, 36, 30, 29, 33, 8], "고린도후서": [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 13], "갈라디아서": [24, 21, 29, 31, 26, 18], "에베소서": [23, 22, 21, 28, 30, 14], "빌립보서": [30, 30, 21, 23], "골로새서": [29, 23, 25, 18], "데살로니가전서": [10, 20, 13, 18, 28], "데살로니가후서": [12, 17, 18], "디모데전서": [20, 15, 16, 16, 25, 21], "디모데후서": [18, 26, 17, 22], "디도서": [16, 15, 15], "빌레몬서": [25], "히브리서": [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25], "야고보서": [27, 26, 18, 17, 20], "베드로전서": [25, 25, 22, 19, 14], "베드로후서": [21, 22, 18], "요한일서": [10, 29, 24, 21, 21], "요한이서": [13], "요한삼서": [14], "유다서": [25], "요한계시록": [20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21]};



// ─── 6단계 정의 ───
// 진행바: 6칸 (본문요약+붙잡은말씀은 2칸 동시 활성)
// 실제 화면: 5개 (0:들어가는기도 1:본문요약+붙잡은말씀 2:느낌과묵상 3:적용과결단 4:올려드리는기도)
const STEPS_6 = [
  { barIdx: [0],    title: "들어가는 기도",      subtitle: "말씀 앞에 나아가기 전 기도",  placeholder: "주님, 오늘 말씀 앞에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", hint: "짧아도 괜찮아요. 마음을 열고 주님께 나아가는 기도예요.", id: "opening_prayer" },
  { barIdx: [1, 2], title: "본문 요약 & 붙잡은 말씀", subtitle: "본문을 읽고 마음에 새겨요", placeholder: "", hint: "", id: "passage_step", isPassageStep: true },
  { barIdx: [3],    title: "느낌과 묵상",         subtitle: "이 말씀이 내게 주는 의미",     placeholder: "이 말씀이 오늘 내 삶에 무슨 말씀인가요?\n솔직하게 느낀 것을 써보세요.", hint: "정답이 없어요. 성령님의 이끄심에 맡겨봐요.", id: "meditation" },
  { barIdx: [4],    title: "적용과 결단",          subtitle: "오늘 하루 어떻게 살 건가요?", placeholder: "", hint: "성품은 마음을 정하는 것, 행동은 손과 발로 드러나는 것이에요.", id: "application", isDecision: true },
  { barIdx: [5],    title: "올려드리는 기도",       subtitle: "말씀으로 드리는 기도",         placeholder: "말씀을 붙들고 기도를 올려드려요...", hint: "말씀과 결단을 간결하게 다시 하나님께 올려드려요.", id: "closing_prayer", isLast: true },
];

const BAR_LABELS_6 = ["들어가는 기도", "본문 요약", "붙잡은 말씀", "느낌과 묵상", "적용과 결단", "올려드리는 기도"];

// ─── 주일예배 단계 (개편) ───
// 0: 설교 정보 + 말씀 선택
// 1: 들어가는 기도
// 2: 말씀 요약
// 3: 깨달음과 결단 (깨달음 + 성품 + 행동들)
// 4: 올려드리는 기도
const STEPS_SUNDAY = [
  { id: "sermon_info", title: "설교 정보", subtitle: "설교 제목과 본문 말씀을 적어요", isSermonInfo: true },
  { id: "opening_prayer", title: "들어가는 기도", subtitle: "예배 전 마음을 준비해요", placeholder: "주님, 오늘 예배에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", hint: "예배 전 마음을 열고 주님께 나아가는 기도예요." },
  { id: "summary", title: "말씀 요약", subtitle: "설교 말씀을 내 말로 요약해요", placeholder: "오늘 설교 핵심 내용을 자신의 말로 요약해보세요...", hint: "설교자가 전한 핵심 메시지를 나의 말로 정리해요." },
  { id: "meditation", title: "깨달음과 결단", subtitle: "말씀이 내게 주는 깨달음과 결단", placeholder: "", hint: "말씀을 통해 깨달은 것, 그리고 삶으로 살아낼 결단을 적어요.", isDecision: true },
  { id: "closing_prayer", title: "올려드리는 기도", subtitle: "예배의 마무리 기도", placeholder: "오늘 받은 은혜와 결단을 하나님께 올려드려요...", hint: "받은 말씀과 결단을 하나님께 올려드려요.", isLast: true },
];

function QTWriteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const lang = useLang();
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }
  const initMode = params.get("mode") as "6step" | "sunday" | "free" | null;
  const isResume = params.get("resume") === "true";
  // 오늘 스케줄 파라미터
  const schedBook = params.get("schedBook");
  const schedChapter = params.get("schedChapter");
  const schedStartV = params.get("schedStartV");
  const schedEndV = params.get("schedEndV");
  const schedEndChapter = params.get("schedEndChapter");
  const hasSchedule = !!(schedBook && schedChapter && schedStartV && schedEndV);
  const todayStr = getLocalDateString();
  const resumeDateParam = params.get("date");
  const initialDate = resumeDateParam || todayStr;

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const translationParam = params.get("translation");
  const [selectedTranslation, setSelectedTranslation] = useState(() => {
    if (translationParam) return parseInt(translationParam);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("roots_default_translation");
      if (saved) return parseInt(saved);
    }
    return 92;
  });
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);

  const [mode, setMode] = useState<"6step" | "sunday" | "free">(() => {
    if (initMode === "free") return "free";
    if (initMode === "sunday") return "sunday";
    if (initMode === "6step") return "6step";
    return isSunday(initialDate) ? "sunday" : "6step";
  });

  // 말씀 선택 (6step, free) - 스케줄 있으면 바로 "done"으로 시작
  const [bibleStep, setBibleStep] = useState<"select" | "done">(hasSchedule ? "done" : "select");
  const currentLang = TRANSLATION_LANG[selectedTranslation] ?? "KO";
  const currentBookNames = BOOK_NAMES[currentLang] ?? BOOK_NAMES["KO"];
  const OT_BOOKS_LOCAL = currentBookNames.slice(0, 39);
  const NT_BOOKS_LOCAL = currentBookNames.slice(39);
  // 말씀 선택 (단일)
  const [book, setBook] = useState(currentBookNames[0] ?? "창세기");
  const [chapter, setChapter] = useState("1");
  const [startV, setStartV] = useState("1");
  const [endV, setEndV] = useState("1");
  // 끝 장/절 (장 넘어가는 경우)
  const [endChapter, setEndChapter] = useState("1");
  const [crossChapter, setCrossChapter] = useState(false); // 장 넘어가는 말씀 여부

  // 말씀 여러 개 (추가 말씀)
  type PassageItem = { book: string; chapter: string; startV: string; endV: string; endChapter: string; cross: boolean; verses: {num:number;text:string}[]; ref: string };
  const [passages, setPassages] = useState<PassageItem[]>([]);

  // 주일예배 말씀 선택 step
  const [sundayBibleStep, setSundayBibleStep] = useState<"select"|"done">("select");
  const [pageReady, setPageReady] = useState(false);
  const [passageOpen, setPassageOpen] = useState(false);

  // 장 변경 시 절 범위 초과 자동 조정
  function handleChapterChange(newChapter: string) {
    setChapter(newChapter);
    setEndChapter(newChapter);
    const allKoBooks = [...OT_BOOKS, ...NT_BOOKS];
    const allLocalBooks = [...(BOOK_NAMES[currentLang] ?? BOOK_NAMES["KO"])];
    const idx = allLocalBooks.indexOf(book);
    const koBook = idx >= 0 ? allKoBooks[idx] : book;
    const maxV = (BIBLE_CHAPTERS[koBook] ?? [])[parseInt(newChapter)-1] ?? 176;
    if (parseInt(startV) > maxV) setStartV(String(maxV));
    if (parseInt(endV) > maxV) setEndV(String(maxV));
  }
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [loadingBible, setLoadingBible] = useState(false);
  const [bibleError, setBibleError] = useState("");
  const [passageVerses, setPassageVerses] = useState<{ num: number; text: string }[]>([]);
  const [bibleRef, setBibleRef] = useState("");
  const [keyVerse, setKeyVerse] = useState("");
  const [selectedVerseNums, setSelectedVerseNums] = useState<number[]>([]);
  const [passageExpanded, setPassageExpanded] = useState(false); // 자유형식 더보기
  const [versePreviewExpanded, setVersePreviewExpanded] = useState(false); // 6단계 말씀 미리보기 더보기

  // 큐티 작성
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [freeText, setFreeText] = useState("");

  // 주일예배 설교 정보
  const [sermonTitle, setSermonTitle] = useState("");
  const [sermonRef, setSermonRef] = useState("");

  function buildSundayBibleRef(title: string, refs: string[]) {
    const cleanTitle = title.trim();
    const cleanRefs = refs.filter(Boolean).join(", ");
    if (!cleanTitle && !cleanRefs) return "";
    if (cleanRefs) return `설교: ${cleanTitle} (${cleanRefs})`;
    return `설교: ${cleanTitle}`;
  }

  function parseSundayBibleRef(raw?: string | null) {
    const text = String(raw ?? "").trim();
    if (!text.startsWith("설교:")) return { title: "", refs: text ? [text] : [] };
    const body = text.replace(/^설교:\s*/, "").trim();
    const match = body.match(/^(.*?)(?:\s*\((.*)\))?$/);
    const title = (match?.[1] ?? "").trim();
    const refsText = (match?.[2] ?? "").trim();
    const refs = refsText ? refsText.split(/\s*,\s*/).filter(Boolean) : [];
    return { title, refs };
  }


  // 스케줄 자동 말씀 로드 (이어쓰기 아닐 때 + 스케줄 있을 때)
  useEffect(() => {
    const loadSchedulePassage = async () => {
      setPageReady(true);
      if (!hasSchedule || isResume || mode !== "6step") return;
      try {
        const bookName = schedBook!;
        const chap = schedChapter!;
        const sv = schedStartV!;
        const ev = schedEndV!;
        const evChap = schedEndChapter;

        setBook(bookName);
        setChapter(chap);
        setStartV(sv);
        setEndV(ev);

        let allVerses: {num: number; text: string}[] = [];
        let refStr = "";

        if (evChap && evChap !== chap) {
          setCrossChapter(true);
          setEndChapter(evChap);
          const allKo = [...OT_BOOKS, ...NT_BOOKS];
          const allLoc = [...OT_BOOKS_LOCAL, ...NT_BOOKS_LOCAL];
          const koBook = (() => { const i=allLoc.indexOf(bookName); return i>=0?allKo[i]:bookName; })();
          const maxV1 = (BIBLE_CHAPTERS[koBook]??[])[parseInt(chap)-1]??176;
          const r1 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(bookName)}&chapter=${chap}&startVerse=${sv}&endVerse=${maxV1}`);
          const d1 = await r1.json();
          const r2 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(bookName)}&chapter=${evChap}&startVerse=1&endVerse=${ev}`);
          const d2 = await r2.json();
          allVerses = [...(d1.verses??[]).map((v:any)=>({...v,num:`${chap}:${v.num}`})), ...(d2.verses??[]).map((v:any)=>({...v,num:`${evChap}:${v.num}`}))];
          refStr = `${bookName} ${chap}:${sv}-${evChap}:${ev}`;
        } else {
          const res = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(bookName)}&chapter=${chap}&startVerse=${sv}&endVerse=${ev}`);
          const data = await res.json();
          allVerses = data.verses ?? [];
          refStr = data.reference ?? `${bookName} ${chap}:${sv}-${ev}`;
        }

        if (allVerses.length > 0) {
          setPassageVerses(allVerses);
          setBibleRef(refStr);
          setBibleStep("done");
        }
      } catch (e) {
        // 스케줄 로드 실패해도 수동 선택 가능
      }
    };
    loadSchedulePassage();
  }, []);

  // 임시저장 데이터 로드
  useEffect(() => {
    const resetDraftState = () => {
      if (initMode === "free") setMode("free");
      else if (initMode === "sunday") setMode("sunday");
      else if (initMode === "6step") setMode("6step");
      else setMode(isSunday(selectedDate) ? "sunday" : "6step");

      setBibleRef("");
      setKeyVerse("");
      setPassageVerses([]);
      setSelectedVerseNums([]);
      setAnswers({});
      setDecisions([""]);
      setCur(0);
      setFreeText("");
      setPassages([]);
      setEndChapter("1");
      setCrossChapter(false);
      setBibleStep("select");
      setSundayBibleStep("select");
      setSermonTitle("");
      setSermonRef("");
    };

    const loadDraft = async () => {
      setPageReady(true);
    if (!isResume) return; // 이어쓰기 모드일 때만 로드
      if (selectedDate !== todayStr) {
        resetDraftState();
        return;
      }
      const { createClient: cc } = await import("@/lib/supabase");
      const supabase = cc();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: drafts, error } = await supabase.from("qt_records")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", selectedDate)
        .eq("is_draft", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) return;
      const draft = drafts?.[0];
      if (!draft) {
        resetDraftState();
        return;
      }

      resetDraftState();

      // 기존 draft 데이터 복원
      const sundayDraft = draft.qt_mode === "sunday" ? parseSundayBibleRef(draft.bible_ref) : null;
      if (draft.qt_mode) setMode(draft.qt_mode);
      if (sundayDraft) {
        setSermonTitle(sundayDraft.title);
        const [mainRef, ...extraRefs] = sundayDraft.refs;
        if (mainRef) {
          setBibleRef(mainRef);
          setBibleStep("done");
          setSundayBibleStep("done");
        }
        if (extraRefs.length > 0) {
          setPassages(extraRefs.map(ref => ({
            book: "",
            chapter: "",
            startV: "",
            endV: "",
            endChapter: "",
            cross: ref.includes("-") && ref.includes(":"),
            verses: [],
            ref,
          })));
        }
      } else if (draft.bible_ref) {
        setBibleRef(draft.bible_ref);
      }
      if (draft.key_verse) {
        setKeyVerse(draft.key_verse);
        setBibleStep("done");
      }
      if (draft.opening_prayer) setAnswers(p => ({ ...p, opening_prayer: draft.opening_prayer }));
      if (draft.summary) setAnswers(p => ({ ...p, summary: draft.summary }));
      if (draft.meditation) setAnswers(p => ({ ...p, meditation: draft.meditation }));
      if (draft.application) setAnswers(p => ({ ...p, application: draft.application }));
      if (draft.closing_prayer) setAnswers(p => ({ ...p, closing_prayer: draft.closing_prayer }));
      if (draft.decision) {
        const dList = draft.decision.split("\n").filter((d: string) => d.trim());
        if (dList.length > 0) setDecisions(dList);
      }

      // 말씀 본문 재로드 (bible_ref가 있으면)
      const refForReload = sundayDraft?.refs?.[0] ?? draft.bible_ref;
      if (refForReload) {
        try {
          // 약어 → 전체 이름 역변환 맵
          const SHORT_TO_FULL: Record<string, string> = {
            "창":"창세기","출":"출애굽기","레":"레위기","민":"민수기","신":"신명기",
            "수":"여호수아","삿":"사사기","룻":"룻기","삼상":"사무엘상","삼하":"사무엘하",
            "왕상":"열왕기상","왕하":"열왕기하","대상":"역대상","대하":"역대하","스":"에스라",
            "느":"느헤미야","에":"에스더","욥":"욥기","시":"시편","잠":"잠언",
            "전":"전도서","아":"아가","사":"이사야","렘":"예레미야","애":"예레미야애가",
            "겔":"에스겔","단":"다니엘","호":"호세아","욜":"요엘","암":"아모스",
            "옵":"오바댜","욘":"요나","미":"미가","나":"나훔","합":"하박국",
            "습":"스바냐","학":"학개","슥":"스가랴","말":"말라기",
            "마":"마태복음","막":"마가복음","눅":"누가복음","요":"요한복음",
            "행":"사도행전","롬":"로마서","고전":"고린도전서","고후":"고린도후서",
            "갈":"갈라디아서","엡":"에베소서","빌":"빌립보서","골":"골로새서",
            "살전":"데살로니가전서","살후":"데살로니가후서","딤전":"디모데전서","딤후":"디모데후서",
            "딛":"디도서","몬":"빌레몬서","히":"히브리서","약":"야고보서",
            "벧전":"베드로전서","벧후":"베드로후서","요일":"요한일서","요이":"요한이서",
            "요삼":"요한삼서","유":"유다서","계":"요한계시록",
          };

          const ref = refForReload;
          // "창 1:1-10", "창 1:1-2:3", "창세기 1:1-10" 지원
          const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
          if (match) {
            const [, abbr, chap, sv, evChap, ev] = match;
            const bookName = SHORT_TO_FULL[abbr] ?? abbr;
            const finalEndChapter = evChap ?? chap;
            const finalEndVerse = ev ?? sv;
            setBook(bookName);
            setChapter(chap);
            setStartV(sv);
            setEndChapter(finalEndChapter);
            setEndV(finalEndVerse);
            setCrossChapter(finalEndChapter !== chap);

            if (finalEndChapter !== chap) {
              const allKoBooks = [...OT_BOOKS, ...NT_BOOKS];
              const allLocalBooks = [...OT_BOOKS_LOCAL, ...NT_BOOKS_LOCAL];
              const idx = allLocalBooks.indexOf(bookName);
              const koBook = idx >= 0 ? allKoBooks[idx] : bookName;
              const maxV1 = (BIBLE_CHAPTERS[koBook] ?? [])[parseInt(chap)-1] ?? 176;
              const r1 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(bookName)}&chapter=${chap}&startVerse=${sv}&endVerse=${maxV1}`);
              const d1 = await r1.json();
              const r2 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(bookName)}&chapter=${finalEndChapter}&startVerse=1&endVerse=${finalEndVerse}`);
              const d2 = await r2.json();
              const verses = [...(d1.verses ?? []).map((v:any) => ({...v, num:`${chap}:${v.num}`})), ...(d2.verses ?? []).map((v:any) => ({...v, num:`${finalEndChapter}:${v.num}`}))];
              if (verses.length > 0) setPassageVerses(verses);
            } else {
              const res = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(bookName)}&chapter=${chap}&startVerse=${sv}&endVerse=${finalEndVerse}`);
              const data = await res.json();
              if (data.verses && data.verses.length > 0) setPassageVerses(data.verses);
            }
            setBibleStep("done");
            setSundayBibleStep("done");
          }
        } catch (e) {
          // 말씀 로드 실패해도 나머지 데이터는 복원됨
        }
      }

      // 저장된 단계로 이동
      const savedStep = draft.current_step ?? 0;
      if (savedStep > 0) setCur(savedStep);
    }
    loadDraft();
  }, [isResume, selectedDate]);

  const translationName = ALL_TRANSLATIONS.find(t => t.id === selectedTranslation)?.name ?? "개역개정";

  // 번역본 변경 시 현재 본문 다시 로드
  async function reloadPassageWithTranslation(newTranslationId: number) {
    if (!bibleRef || passageVerses.length === 0) return;
    setLoadingBible(true);
    try {
      if (endChapter !== chapter) {
        const allKo = [...OT_BOOKS, ...NT_BOOKS];
        const allLoc = [...OT_BOOKS_LOCAL, ...NT_BOOKS_LOCAL];
        const koBook = (() => { const i=allLoc.indexOf(book); return i>=0?allKo[i]:book; })();
        const maxV1 = (BIBLE_CHAPTERS[koBook]??[])[parseInt(chapter)-1]??176;
        const r1 = await fetch(`/api/bible?translation=${newTranslationId}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${maxV1}`);
        const d1 = await r1.json();
        const r2 = await fetch(`/api/bible?translation=${newTranslationId}&book=${encodeURIComponent(book)}&chapter=${endChapter}&startVerse=1&endVerse=${endV}`);
        const d2 = await r2.json();
        const allVerses = [...(d1.verses??[]).map((v:any)=>({...v,num:`${chapter}:${v.num}`})), ...(d2.verses??[]).map((v:any)=>({...v,num:`${endChapter}:${v.num}`}))];
        if (allVerses.length > 0) setPassageVerses(allVerses);
      } else {
        const res = await fetch(`/api/bible?translation=${newTranslationId}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${endV}`);
        const data = await res.json();
        if (data.verses && data.verses.length > 0) setPassageVerses(data.verses);
      }
    } catch (e) { /* 로드 실패 무시 */ }
    setLoadingBible(false);
  }

  async function loadPassage() {
    setLoadingBible(true); setBibleError("");
    try {
      let allVerses: {num:number;text:string}[] = [];
      let refStr = "";

      if (endChapter !== chapter) {
        // 장 넘어가는 경우: 시작장 끝까지 + 끝장 처음부터
        const koBook = (() => { const all=[...OT_BOOKS,...NT_BOOKS]; const loc=[...OT_BOOKS_LOCAL,...NT_BOOKS_LOCAL]; const i=loc.indexOf(book); return i>=0?all[i]:book; })();
        const maxV1 = (BIBLE_CHAPTERS[koBook]??[])[parseInt(chapter)-1]??176;
        const res1 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${maxV1}`);
        const d1 = await res1.json();
        const res2 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${endChapter}&startVerse=1&endVerse=${endV}`);
        const d2 = await res2.json();
        const v1 = (d1.verses??[]).map((v:any)=>({...v, num: `${chapter}:${v.num}`}));
        const v2 = (d2.verses??[]).map((v:any)=>({...v, num: `${endChapter}:${v.num}`}));
        allVerses = [...v1, ...v2];
        refStr = `${book} ${chapter}:${startV}-${endChapter}:${endV}`;
      } else {
        if (parseInt(endV) < parseInt(startV)) { setBibleError(trQT("끝 절이 시작 절보다 작아요", lang)); setLoadingBible(false); return; }
        const res = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${endV}`);
        const data = await res.json();
        if (data.error) { setBibleError(data.error); setLoadingBible(false); return; }
        allVerses = data.verses ?? [];
        refStr = data.reference;
      }

      setPassageVerses(allVerses);
      setBibleRef(refStr);
      setBibleStep("done");
      setSundayBibleStep("done");
      setSelectedVerseNums([]);
      setKeyVerse("");
    } catch { setBibleError(trQT("본문을 불러오지 못했어요.", lang)); }
    setLoadingBible(false);
  }

  const loadSundayPassage = loadPassage;

  // 말씀 추가하기 (passages 배열에 추가)
  async function addPassage() {
    setLoadingBible(true); setBibleError("");
    try {
      const koBook = (() => { const all=[...OT_BOOKS,...NT_BOOKS]; const loc=[...OT_BOOKS_LOCAL,...NT_BOOKS_LOCAL]; const i=loc.indexOf(book); return i>=0?all[i]:book; })();
      let vers: {num:number;text:string}[] = [];
      let refStr = "";
      if (endChapter !== chapter) {
        const maxV1 = (BIBLE_CHAPTERS[koBook]??[])[parseInt(chapter)-1]??176;
        const r1 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${maxV1}`);
        const d1 = await r1.json();
        const r2 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${endChapter}&startVerse=1&endVerse=${endV}`);
        const d2 = await r2.json();
        vers = [...(d1.verses??[]).map((v:any)=>({...v,num:`${chapter}:${v.num}`})), ...(d2.verses??[]).map((v:any)=>({...v,num:`${endChapter}:${v.num}`}))];
        refStr = `${book} ${chapter}:${startV}-${endChapter}:${endV}`;
      } else {
        const r = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${endV}`);
        const d = await r.json();
        vers = d.verses ?? []; refStr = d.reference;
      }
      if (vers.length > 0) {
        const newP: PassageItem = { book, chapter, startV, endV, endChapter, cross: crossChapter, verses: vers, ref: refStr };
        setPassages(prev => [...prev, newP]);
        // 첫 번째 말씀이 없으면 메인으로도 설정
        if (!bibleRef) { setPassageVerses(vers); setBibleRef(refStr); setBibleStep("done"); setSundayBibleStep("done"); }
        if (mode === "sunday") setSundayBibleStep("done");
      }
    } catch { setBibleError(trQT("본문을 불러오지 못했어요.", lang)); }
    setLoadingBible(false);
  }

  function selectVerse(verseText: string, num: number) {
    if (selectedVerseNums.includes(num)) {
      setSelectedVerseNums(prev => prev.filter(n => n !== num));
      setKeyVerse(prev => prev.split("\n").filter(l => !l.startsWith(`${num} `)).join("\n").trim());
    } else {
      setSelectedVerseNums(prev => [...prev, num]);
      const line = `${num} ${verseText}`;
      setKeyVerse(prev => prev ? prev + "\n" + line : line);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    }
  }

  function set(key: string, val: string) { setAnswers(p => ({ ...p, [key]: val })); }
  function addDecision() { setDecisions(p => [...p, ""]); }
  function removeDecision(i: number) { setDecisions(p => p.filter((_, idx) => idx !== i)); }
  function updateDecision(i: number, val: string) { setDecisions(p => p.map((d, idx) => idx === i ? val : d)); }

  // 6단계 canNext
  function canNext6(): boolean {
    const step = STEPS_6[cur];
    if (step.isPassageStep) return (answers.summary ?? "").trim().length > 0;
    if (step.isDecision) return decisions.some(d => d.trim().length > 0);
    return (answers[step.id] ?? "").trim().length > 0;
  }

  // 주일예배 canNext
  function canNextSunday(): boolean {
    const step = STEPS_SUNDAY[cur] as any;
    if (step.isSermonInfo) return sermonTitle.trim().length > 0 || bibleRef.length > 0;
    if (step.isDecision) return decisions.some(d => d.trim().length > 0);
    return (answers[step.id] ?? "").trim().length > 0;
  }

  // 진행바 상태 (6단계)
  function getBarState(barIdx: number): "done" | "curr" | "upcoming" {
    const currStep = STEPS_6[cur];
    const doneSteps = STEPS_6.slice(0, cur);
    const doneBarIdxs = doneSteps.flatMap(s => s.barIdx);
    if (doneBarIdxs.includes(barIdx)) return "done";
    if (currStep.barIdx.includes(barIdx)) return "curr";
    return "upcoming";
  }

  function handleDateChange(d: string) {
    setSelectedDate(d);
    setShowDatePicker(false);
  }

  const dateLabel = (d: string) => {
    const date = new Date(d + "T12:00:00");
    const day = trQT(["일", "월", "화", "수", "목", "금", "토"][date.getDay()], lang);
    return `${d} (${day})${d === todayStr ? ` ${trQT("· 오늘", lang)}` : ""}${isSunday(d) ? " 🙌" : ""}`;
  };
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return getLocalDateString(d);
  });

  async function saveDraft() {
    if (selectedDate !== todayStr) {
      showToast(trQT("임시저장은 오늘 큐티에만 가능해요.", lang));
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const decisionText = decisions.filter(d => d.trim()).join("\n");
      const sundayRefs = [bibleRef, ...passages.map(p => p.ref)].filter(Boolean);
      const draftBibleRef = mode === "sunday" ? buildSundayBibleRef(sermonTitle, sundayRefs) : bibleRef;
      const draftData: any = {
        user_id: user.id,
        date: selectedDate,
        qt_mode: mode,
        is_draft: true,
        current_step: cur,
        bible_ref: draftBibleRef,
        key_verse: keyVerse,
        opening_prayer: answers.opening_prayer ?? "",
        summary: answers.summary ?? "",
        meditation: answers.meditation ?? "",
        application: answers.application ?? "",
        decision: decisionText,
        closing_prayer: answers.closing_prayer ?? "",
      };

      const { data: rows, error: rowsError } = await supabase.from("qt_records")
        .select("id,is_draft,created_at")
        .eq("user_id", user.id)
        .eq("date", selectedDate)
        .order("created_at", { ascending: false });
      if (rowsError) throw rowsError;

      const completedRecord = rows?.find((row: any) => row.is_draft === false);
      if (completedRecord) {
        showToast(trQTVars("이미 큐티 기록이 있어요", lang, { date: selectedDate }));
        setSaving(false);
        return;
      }

      const draftRecord = rows?.find((row: any) => row.is_draft === true);
      if (draftRecord) {
        const { error } = await supabase.from("qt_records").update(draftData).eq("id", draftRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("qt_records").insert(draftData);
        if (error) throw error;
      }
      showToast(trQT("임시저장 됐어요!\n나중에 이어쓸 수 있어요 😊", lang));
    } catch (e) {
      showToast(trQT("임시저장에 실패했어요.\n다시 시도해주세요.", lang));
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: rows, error: rowsError } = await supabase.from("qt_records")
        .select("id,is_draft,created_at")
        .eq("user_id", user.id)
        .eq("date", selectedDate)
        .order("created_at", { ascending: false });
      if (rowsError) { showToast(trQT("저장에 실패했어요. 다시 시도해주세요.", lang)); setSaving(false); return; }

      const completedRecord = rows?.find((row: any) => row.is_draft === false);
      const draftRecord = rows?.find((row: any) => row.is_draft === true);

      // 완료된 기록이 이미 있으면 막기 (draft는 통과)
      if (completedRecord) { showToast(trQTVars("이미 큐티 기록이 있어요", lang, { date: selectedDate })); setSaving(false); return; }

      const decisionText = decisions.filter(d => d.trim()).join("\n");
      let insertData: any = { user_id: user.id, date: selectedDate, qt_mode: mode };

      if (mode === "free") {
        insertData = { ...insertData, bible_ref: bibleRef, key_verse: keyVerse, meditation: freeText, decision: decisionText };
      } else if (mode === "sunday") {
        // 말씀 ref: 메인 + 추가 말씀 합치기
        const allRefs = [bibleRef, ...passages.map(p => p.ref)].filter(Boolean);
        insertData = {
          ...insertData,
          bible_ref: buildSundayBibleRef(sermonTitle, allRefs),
          opening_prayer: answers.opening_prayer ?? "",
          summary: answers.summary ?? "",
          meditation: answers.meditation ?? "",
          application: answers.application ?? "",
          decision: decisionText,
          closing_prayer: answers.closing_prayer ?? "",
        };
      } else {
        insertData = {
          ...insertData,
          bible_ref: bibleRef, key_verse: keyVerse,
          opening_prayer: answers.opening_prayer ?? "",
          summary: answers.summary ?? "",
          meditation: answers.meditation ?? "",
          application: answers.application ?? "",
          decision: decisionText,
          closing_prayer: answers.closing_prayer ?? "",
        };
      }

      // draft가 있으면 update, 없으면 insert
      if (draftRecord) {
        const { error } = await supabase.from("qt_records")
          .update({ ...insertData, is_draft: false }).eq("id", draftRecord.id);
        if (error) { showToast(trQT("저장에 실패했어요. 다시 시도해주세요.", lang)); setSaving(false); return; }
      } else {
        const { error } = await supabase.from("qt_records").insert({ ...insertData, is_draft: false });
        if (error) {
          const { qt_mode, ...withoutMode } = insertData;
          const { error: e2 } = await supabase.from("qt_records").insert({ ...withoutMode, is_draft: false });
          if (e2) { showToast(trQT("저장에 실패했어요. 다시 시도해주세요.", lang)); setSaving(false); return; }
        }
      }

      // streak 업데이트는 홈(page.tsx)에서 3개 루틴 모두 완료 시 처리
      // 큐티 단독으로는 streak가 올라가지 않음
      router.push("/qt/complete");
    } finally { setSaving(false); }
  }

  // ─── 말씀 선택 화면 (6step & free) ───
  if (!pageReady) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;

  if ((mode === "6step" || mode === "free") && bibleStep === "select") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {toast && (
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
          {toast}
        </div>
      )}
        <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
              <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{trQT("나가기", lang)}</span>
            </button>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{selectedDate === todayStr ? trQT("오늘", lang) : selectedDate}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            {mode === "free" ? trQT("오늘의 말씀 찾기 (선택)", lang) : trQT("오늘의 말씀 찾기", lang)}
          </h1>
          <p style={{ fontSize: 12, color: "var(--text3)" }}>{trQT("큐티할 말씀을 먼저 선택해요", lang)}</p>
        </div>

        <div style={{ flex: 1, padding: "16px 16px 100px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
          {/* 날짜 + 번역본 */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowDatePicker(true)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", cursor: "pointer" }}>
              <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>📅 {selectedDate === todayStr ? trQT("오늘", lang) : selectedDate}</span>
              <ChevronDown size={12} style={{ color: "var(--text3)", marginLeft: "auto" }} />
            </button>
            <button onClick={() => setShowTranslationPicker(true)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", cursor: "pointer" }}>
              <span style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 600 }}>📖 {translationName}</span>
              <ChevronDown size={12} style={{ color: "var(--text3)", marginLeft: "auto" }} />
            </button>
          </div>

          {/* 책 선택 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{trQT("성경 책", lang)}</label>
            <button onClick={() => setShowBookPicker(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", color: "var(--text)", fontSize: 14 }}>
              <span>{book}</span><ChevronDown size={16} style={{ color: "var(--text3)" }} />
            </button>
          </div>

          {/* 장/절 선택 + 장 넘어가는 말씀 지원 */}
          {(() => {
            const allKoBooks = [...OT_BOOKS, ...NT_BOOKS];
            const allLocalBooks = [...OT_BOOKS_LOCAL, ...NT_BOOKS_LOCAL];
            const koBookName = (() => { const i=allLocalBooks.indexOf(book); return i>=0?allKoBooks[i]:book; })();
            const chaptersData = BIBLE_CHAPTERS[koBookName] ?? [];
            const maxChapter = chaptersData.length || 150;
            const maxStartV = chaptersData[parseInt(chapter)-1] ?? 176;
            const maxEndV = crossChapter ? (chaptersData[parseInt(endChapter)-1] ?? 176) : (chaptersData[parseInt(chapter)-1] ?? 176);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* 시작: 장 + 절 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{trQT("시작 장", lang)}</label>
                    <select value={chapter} onChange={e => handleChapterChange(e.target.value)} className="input-field" style={{ padding: "12px 8px" }}>
                      {Array.from({ length: maxChapter }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{trQT("시작 절", lang)}</label>
                    <select value={startV} onChange={e => { setStartV(e.target.value); if(!crossChapter && parseInt(e.target.value)>parseInt(endV)) setEndV(e.target.value); }} className="input-field" style={{ padding: "12px 8px" }}>
                      {Array.from({ length: maxStartV }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                {/* 장 넘어가기 토글 */}
                <button onClick={() => { setCrossChapter(p=>!p); if(!crossChapter) setEndChapter(chapter); }} style={{ display: "flex", alignItems: "center", gap: 6, background: crossChapter ? "var(--sage-light)" : "none", border: `1px solid ${crossChapter ? "var(--sage)" : "var(--border)"}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 12, color: crossChapter ? "var(--sage-dark)" : "var(--text3)" }}>
                  <span>{crossChapter ? "✓" : "+"}</span> {trQT("장이 넘어가는 말씀 (예: 9장 25절~10장 6절)", lang)}
                </button>
                {/* 끝: 장 + 절 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {crossChapter && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{trQT("끝 장", lang)}</label>
                      <select value={endChapter} onChange={e => setEndChapter(e.target.value)} className="input-field" style={{ padding: "12px 8px" }}>
                        {Array.from({ length: maxChapter }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{trQT("끝 절", lang)}</label>
                    <select value={endV} onChange={e => setEndV(e.target.value)} className="input-field" style={{ padding: "12px 8px" }}>
                      {Array.from({ length: maxEndV }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })()}

          {bibleError && <p style={{ fontSize: 12, color: "#E05050" }}>{bibleError}</p>}

          <button onClick={loadPassage} disabled={loadingBible} className="btn-sage">
            {loadingBible ? <><Loader2 size={16} className="spin" />{trQT("불러오는 중...", lang)}</> : <><BookOpen size={16} />{trQT("말씀 불러오기", lang)}</>}
          </button>

          {/* 말씀 추가 버튼 */}
          {(bibleRef || passages.length > 0) && (
            <button onClick={addPassage} disabled={loadingBible} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", border: "1px dashed var(--sage)", borderRadius: 12, background: "none", color: "var(--sage-dark)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Plus size={14} /> 말씀 추가하기 (여러 본문일 경우)
            </button>
          )}

          {/* 추가된 말씀 목록 */}
          {passages.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {passages.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--sage-light)", borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(122,157,122,0.3)" }}>
                  <span style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 600 }}>📖 {p.ref}</span>
                  <button onClick={() => setPassages(prev => prev.filter((_,j)=>j!==i))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={14}/></button>
                </div>
              ))}
            </div>
          )}

          {mode === "free" && (
            <button onClick={() => setBibleStep("done")} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 12, cursor: "pointer", textDecoration: "underline", textAlign: "center" }}>
              {trQT("말씀 없이 자유롭게 작성하기", lang)}
            </button>
          )}
        </div>

        {/* 책 선택 모달 */}
        {showBookPicker && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "flex-end" }}>
            <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: "20px 0", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "0 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{trQT("성경 책 선택", lang)}</h3>
                <button onClick={() => setShowBookPicker(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 20 }}>✕</button>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {[{ label: trQT("구약", lang), books: OT_BOOKS_LOCAL }, { label: trQT("신약", lang), books: NT_BOOKS_LOCAL }].map(({ label, books }) => (
                  <div key={label}>
                    <div style={{ padding: "10px 20px 4px" }}><p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px" }}>{label}</p></div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "6px 16px" }}>
                      {books.map(b => (
                        <button key={b} onClick={() => { setBook(b); setShowBookPicker(false); }} style={{ padding: "8px 4px", borderRadius: 10, border: `1px solid ${book === b ? "var(--sage)" : "var(--border)"}`, background: book === b ? "var(--sage-light)" : "var(--bg3)", color: book === b ? "var(--sage-dark)" : "var(--text2)", fontSize: 11, cursor: "pointer", fontWeight: book === b ? 600 : 400 }}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 번역본 선택 모달 */}
        {showTranslationPicker && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 480, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>번역본 선택</h3>
                <button onClick={() => setShowTranslationPicker(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
              </div>
              {TRANSLATIONS.map(group => (
                <div key={group.group} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", marginBottom: 8 }}>{group.group}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {group.items.map(t => (
                      <button key={t.id} onClick={() => {
                const newLang = TRANSLATION_LANG[t.id] ?? "KO";
                const newBooks = BOOK_NAMES[newLang] ?? BOOK_NAMES["KO"];
                setBook(newBooks[0]); // 첫 번째 책으로 리셋
                setSelectedTranslation(t.id);
                setShowTranslationPicker(false);
              }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, border: `1px solid ${selectedTranslation === t.id ? "var(--sage)" : "var(--border)"}`, background: selectedTranslation === t.id ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer" }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: selectedTranslation === t.id ? "var(--sage-dark)" : "var(--text)" }}>{t.name}</span>
                        {selectedTranslation === t.id && <Check size={14} style={{ color: "var(--sage)" }} />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 날짜 선택 모달 */}
        {showDatePicker && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 480, borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", maxHeight: "60vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>날짜 선택</h3>
                <button onClick={() => setShowDatePicker(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {dateOptions.map(d => (
                  <button key={d} onClick={() => handleDateChange(d)} style={{ padding: "12px 16px", borderRadius: 14, border: `1px solid ${selectedDate === d ? "var(--sage)" : "var(--border)"}`, background: selectedDate === d ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: selectedDate === d ? "var(--sage-dark)" : "var(--text)", fontWeight: selectedDate === d ? 700 : 400 }}>{dateLabel(d)}</span>
                    {selectedDate === d && <Check size={14} style={{ color: "var(--sage)" }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── 자유형식 작성 화면 ───
  if (mode === "free") {
    const hasPassage = passageVerses.length > 0;
    const LONG_THRESHOLD = 3; // 3절 이상이면 접기

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {toast && (
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
          {toast}
        </div>
      )}
        <div style={{ background: "var(--bg)", padding: "56px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
              <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{trQT("나가기", lang)}</span>
            </button>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{selectedDate === todayStr ? trQT("오늘", lang) : selectedDate}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{trQT("자유 큐티", lang)}</h1>
        </div>

        <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {/* 본문 표시 (선택사항) */}
          {hasPassage && (
            <div style={{ background: "var(--sage-light)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(122,157,122,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{translateBibleRef(bibleRef, (currentLang.toLowerCase() as Lang) || lang)} · {translationName}</p>
                <button onClick={() => setBibleStep("select")} style={{ fontSize: 10, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>{trQT("다시 선택", lang)}</button>
              </div>
              <div style={{ overflow: "hidden", maxHeight: !passageExpanded && passageVerses.length > LONG_THRESHOLD ? 90 : undefined, transition: "max-height 0.3s" }}>
                {passageVerses.map(v => (
                  <p key={v.num} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", marginRight: 4 }}>{v.num}</span>{v.text}
                  </p>
                ))}
              </div>
              {passageVerses.length > LONG_THRESHOLD && (
                <button onClick={() => setPassageExpanded(p => !p)} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, background: "none", border: "none", color: "var(--sage-dark)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {passageExpanded ? <><ChevronUp size={14} />{trQT("접기", lang)}</> : <><ChevronDown size={14} />{trQT("더보기", lang)}</>}
                </button>
              )}
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{trQT("오늘의 묵상", lang)}</label>
            <textarea className="textarea-field" rows={10} placeholder={trQT("오늘 읽은 말씀, 느낀 점, 깨달음을 자유롭게 적어보세요...", lang)} value={freeText} onChange={e => setFreeText(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 8 }}>
              <>{trQT("결단", lang)} <span style={{ color: "var(--sage-dark)" }}>— {trQT("말씀을 삶에 적용해보세요!", lang)}</span></>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {decisions.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{i + 1}</span>
                  </div>
                  <input type="text" className="input-field" placeholder={`${trQT("결단 1", lang).replace("1", String(i + 1))}`} value={d} onChange={e => updateDecision(i, e.target.value)} style={{ flex: 1 }} />
                  {decisions.length > 1 && <button onClick={() => removeDecision(i)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><Trash2 size={16} /></button>}
                </div>
              ))}
            </div>
            <button onClick={addDecision} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px dashed var(--border)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", marginTop: 8, width: "100%", color: "var(--text3)", fontSize: 12 }}>
              <Plus size={14} /> {trQT("결단 추가하기", lang)}
            </button>
          </div>
        </div>

        <div style={{ padding: "12px 16px 32px", flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
          <button onClick={save} disabled={(!freeText.trim() && !decisions.some(d => d.trim())) || saving} className="btn-sage">
            {saving ? <><Loader2 size={18} className="spin" />{trQT("저장 중...", lang)}</> : <><Check size={18} />{trQT("큐티 완료", lang)}</>}
          </button>
        </div>
      </div>
    );
  }

  // ─── 주일예배 작성 화면 ───
  if (mode === "sunday") {
    const step = STEPS_SUNDAY[cur] as any;

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {toast && (
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
          {toast}
        </div>
      )}
        <div style={{ background: "var(--bg)", padding: "56px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
              <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{trQT("나가기", lang)}</span>
            </button>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{selectedDate === todayStr ? trQT("오늘", lang) : selectedDate}</span>
          </div>
          <div className="step-bar" style={{ marginBottom: 8 }}>
            {STEPS_SUNDAY.map((_, i) => <div key={i} className={`step-bar-item ${i < cur ? "done" : i === cur ? "curr" : ""}`} />)}
          </div>
          <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>{cur + 1} / {STEPS_SUNDAY.length} {trQT("단계", lang)}</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{trQT(step.title, lang)}</h1>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{trQT(step.subtitle, lang)}</p>
        </div>

        {/* 본문 표시 (0단계 아닐 때, 본문이 있으면) */}
        {!step.isSermonInfo && bibleRef && passageVerses.length > 0 && (
          <div style={{ padding: "0 16px", marginTop: 0, flexShrink: 0 }}>
            <div style={{ background: "var(--sage-light)", borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)", overflow: "hidden" }}>
              <button onClick={() => setPassageOpen(v => !v)} style={{ width: "100%", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sage-dark)" }}>{translateBibleRef(bibleRef, (currentLang.toLowerCase() as Lang) || lang)}</span>
                <span style={{ fontSize: 10, color: "var(--text3)" }}>{passageOpen ? `▲ ${trQT("접기", lang)}` : `▼ ${trQT("더보기", lang)}`}</span>
              </button>
              {passageOpen && (
                <div style={{ padding: "0 14px 12px", maxHeight: 200, overflowY: "auto" }}>
                  {passageVerses.map(v => (
                    <p key={v.num} style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7, marginTop: 4 }}>
                      <span style={{ fontWeight: 700, color: "var(--sage-dark)", marginRight: 4 }}>{v.num}</span>{v.text}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 단계 탭 - 자유 클릭 */}
        <div style={{ display: "flex", overflowX: "auto", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {STEPS_SUNDAY.map((s, i) => {
            const done = i < cur; const isCurr = i === cur;
            return (
              <button key={i} onClick={() => setCur(i)} style={{ flexShrink: 0, padding: "10px 12px", background: "none", border: "none", borderBottom: isCurr ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)" }}>{i + 1}.</span>
                <span style={{ fontSize: 11, fontWeight: isCurr ? 700 : 400, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)", whiteSpace: "nowrap" }}>{trQT(s.title, lang)}</span>
                {done && <span style={{ fontSize: 10, color: "var(--sage)" }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* 0단계: 설교 정보 + 말씀 선택 */}
          {step.isSermonInfo && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{trQT("설교 제목", lang)}</label>
                <input type="text" className="input-field" placeholder={trQT("예: 두려워하지 말라", lang)} value={sermonTitle} onChange={e => setSermonTitle(e.target.value)} />
              </div>
              {/* 성경 본문 불러오기 (6단계와 동일한 UI) */}
              {sundayBibleStep === "select" ? (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{trQT("본문 말씀", lang)}</label>
                  {/* 성경 책 선택 */}
                  <select className="input-field" value={book} onChange={e => { setBook(e.target.value); setChapter("1"); setStartV("1"); setEndV("1"); }} style={{ marginBottom: 8 }}>
                    {[{ label: trQT("구약", lang), books: OT_BOOKS_LOCAL }, { label: trQT("신약", lang), books: NT_BOOKS_LOCAL }].map(({ label, books }) => (
                      <optgroup key={label} label={label}>
                        {books.map(b => <option key={b} value={b}>{b}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  {(() => {
                    const allKoBooks = [...OT_BOOKS, ...NT_BOOKS];
                    const allLocalBooks = [...OT_BOOKS_LOCAL, ...NT_BOOKS_LOCAL];
                    const koBookName = (() => { const i=allLocalBooks.indexOf(book); return i>=0?allKoBooks[i]:book; })();
                    const chaptersData = BIBLE_CHAPTERS[koBookName] ?? [];
                    const maxChapter = chaptersData.length || 150;
                    const maxStartV = chaptersData[parseInt(chapter)-1] ?? 176;
                    const maxEndV = chaptersData[parseInt(endChapter)-1] ?? 176;
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 4 }}>{trQT("시작 장", lang)}</label>
                          <select className="input-field" value={chapter} onChange={e => { handleChapterChange(e.target.value); setStartV("1"); setEndV("1"); }} style={{ padding: "12px 8px" }}>
                            {Array.from({ length: maxChapter }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 4 }}>{trQT("시작 절", lang)}</label>
                          <select className="input-field" value={startV} onChange={e => { setStartV(e.target.value); if (endChapter === chapter && parseInt(e.target.value) > parseInt(endV)) setEndV(e.target.value); }} style={{ padding: "12px 8px" }}>
                            {Array.from({ length: maxStartV }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 4 }}>{trQT("끝 장", lang)}</label>
                          <select className="input-field" value={endChapter} onChange={e => { setEndChapter(e.target.value); setCrossChapter(e.target.value !== chapter); }} style={{ padding: "12px 8px" }}>
                            {Array.from({ length: maxChapter }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 4 }}>{trQT("끝 절", lang)}</label>
                          <select className="input-field" value={endV} onChange={e => setEndV(e.target.value)} style={{ padding: "12px 8px" }}>
                            {Array.from({ length: maxEndV }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      </div>
                    );
                  })()}
                  <button onClick={bibleRef ? addPassage : loadSundayPassage} disabled={loadingBible} className="btn-primary" style={{ marginBottom: 8 }}>
                    {loadingBible ? trQT("불러오는 중...", lang) : bibleRef ? <><Plus size={16} /> {trQT("말씀 추가하기 (여러 본문일 경우)", lang)}</> : `📖 ${trQT("말씀 불러오기", lang)}`}
                  </button>
                  {passages.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                      {passages.map((p, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--sage-light)", borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(122,157,122,0.3)" }}>
                          <span style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 600 }}>📖 {p.ref}</span>
                          <button onClick={() => setPassages(prev => prev.filter((_,j)=>j!==i))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {bibleError && <p style={{ color: "#e74c3c", fontSize: 12 }}>{bibleError}</p>}
                </div>
              ) : (
                <div className="card-sage" style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{translateBibleRef(bibleRef, (currentLang.toLowerCase() as Lang) || lang)} · {translationName}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setSundayBibleStep("select"); }} style={{ fontSize: 11, color: "var(--sage-dark)", background: "none", border: "none", cursor: "pointer" }}>{trQT("말씀 추가하기 (여러 본문일 경우)", lang)}</button>
                      <button onClick={() => { setSundayBibleStep("select"); setPassageVerses([]); setBibleRef(""); setPassages([]); }} style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>{trQT("다시 선택", lang)}</button>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 6, lineHeight: 1.7, fontStyle: "italic" }}>
                    {passageVerses.slice(0, 2).map(v => `${v.num} ${v.text}`).join(" ")}
                    {passageVerses.length > 2 ? "..." : ""}
                  </p>
                  {passages.length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {passages.map((p, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "7px 10px", border: "1px solid rgba(122,157,122,0.18)" }}>
                          <span style={{ fontSize: 11, color: "var(--sage-dark)", fontWeight: 600 }}>+ {p.ref}</span>
                          <button onClick={() => setPassages(prev => prev.filter((_,j)=>j!==i))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={13}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 깨달음과 결단 단계 */}
          {step.isDecision && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{trQT("깨달음 (말씀이 내게 주는 것)", lang)}</label>
                <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, marginBottom: 8 }}>{trQT("오늘 설교를 통해 하나님이 내게 하신 말씀은 무엇인가요?", lang)}</p>
                <textarea className="textarea-field" rows={4} placeholder={trQT("개인적이고 솔직하게 써보세요...", lang)} value={answers.meditation ?? ""} onChange={e => set("meditation", e.target.value)} />
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div style={{ background: "var(--bg2)", borderRadius: 12, padding: "10px 14px", border: "1px solid var(--border)", marginBottom: 10 }}>
                  <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
                    <>
                      <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>{trQT("성품", lang)}</span>{trQT("은 마음을 정하는 것,", lang)}{" "}
                      <span style={{ fontWeight: 700, color: "var(--terra-dark)" }}>{trQT("행동", lang)}</span>{trQT("은 손과 발로 드러나는 것이에요.", lang)}
                    </>
                  </p>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{trQT("성품 (마음의 결심)", lang)}</label>
                  <textarea className="textarea-field" rows={2} placeholder={trQT("이 말씀 앞에서 어떤 마음을 품기로 결심했나요?", lang)} value={answers.application ?? ""} onChange={e => set("application", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 8 }}>{trQT("행동 (구체적인 실천)", lang)}</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {decisions.map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{i + 1}</span>
                        </div>
                        <input type="text" className="input-field" placeholder={`${trQT("행동 1", lang).replace("1", String(i + 1))}`} value={d} onChange={e => updateDecision(i, e.target.value)} style={{ flex: 1 }} />
                        {decisions.length > 1 && <button onClick={() => removeDecision(i)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><Trash2 size={16} /></button>}
                      </div>
                    ))}
                  </div>
                  <button onClick={addDecision} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px dashed var(--border)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", marginTop: 8, width: "100%", color: "var(--text3)", fontSize: 12 }}>
                    <Plus size={14} /> {trQT("행동 추가하기", lang)}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 일반 텍스트 단계 (들어가는기도, 말씀요약, 올려드리는기도) */}
          {!step.isSermonInfo && !step.isDecision && (
            <>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>{trQT(step.hint, lang)}</p>
              <textarea className="textarea-field" rows={9} placeholder={trQT(step.placeholder, lang)} value={answers[step.id] ?? ""} onChange={e => set(step.id, e.target.value)} />
            </>
          )}
        </div>

        <div style={{ padding: "12px 16px 32px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {cur > 0 && <button onClick={() => setCur(c => c - 1)} className="btn-outline" style={{ flex: 1 }}>{trQT("← 이전", lang)}</button>}
            {step.isLast ? (
              <button onClick={save} disabled={saving} className="btn-sage" style={{ flex: cur > 0 ? 2 : 1 }}>
                {saving ? <><Loader2 size={18} className="spin" />{trQT("저장 중...", lang)}</> : <><Check size={18} />{trQT("큐티 완료", lang)}</>}
              </button>
            ) : (
              <button onClick={() => setCur(c => c + 1)} className="btn-primary" style={{ flex: cur > 0 ? 2 : 1 }}>{trQT("다음 단계 →", lang)}</button>
            )}
          </div>
          {/* 임시저장 버튼 */}
          <button onClick={saveDraft} disabled={saving || selectedDate !== todayStr} style={{ width: "100%", padding: "10px", background: "none", border: "1px dashed var(--border)", borderRadius: 12, color: "var(--text3)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {trQT("💾 임시저장하고 나중에 이어쓰기", lang)}
          </button>
        </div>
      </div>
    );
  }

  // ─── 6단계 작성 화면 ───
  const step6 = STEPS_6[cur];
  const canNext6val = canNext6();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {toast && (
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
          {toast}
        </div>
      )}
      <div style={{ background: "var(--bg)", padding: "56px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
            <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{trQT("나가기", lang)}</span>
          </button>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>{selectedDate === todayStr ? trQT("오늘", lang) : selectedDate}</span>
        </div>

        {/* 말씀 미리보기 */}
        {bibleRef && (
          <div style={{ background: "var(--sage-light)", borderRadius: 12, padding: "10px 14px", marginBottom: 10, border: "1px solid rgba(122,157,122,0.3)" }}>
            {/* 상단: 본문 참조 + 번역본 선택 + 더보기/접기 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{translateBibleRef(bibleRef, (currentLang.toLowerCase() as Lang) || lang)}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* 번역본 선택 */}
                <select
                  value={selectedTranslation}
                  onChange={async e => {
                    const newId = parseInt(e.target.value);
                    setSelectedTranslation(newId);
                    await reloadPassageWithTranslation(newId);
                  }}
                  style={{ fontSize: 10, color: "var(--sage-dark)", background: "rgba(122,157,122,0.15)", border: "1px solid rgba(122,157,122,0.3)", borderRadius: 6, padding: "3px 6px", cursor: "pointer", fontWeight: 600 }}
                >
                  {ALL_TRANSLATIONS.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {loadingBible && <Loader2 size={11} className="spin" style={{ color: "var(--sage-dark)" }} />}
                {/* 더보기/접기 */}
                <button
                  onClick={() => setVersePreviewExpanded(p => !p)}
                  style={{ display: "flex", alignItems: "center", gap: 2, background: "none", border: "none", color: "var(--sage-dark)", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                >
                  {versePreviewExpanded ? <><ChevronUp size={13} />{trQT("접기", lang)}</> : <><ChevronDown size={13} />{trQT("더보기", lang)}</>}
                </button>
              </div>
            </div>
            {!versePreviewExpanded && (
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5, fontStyle: "italic" }}>
                {passageVerses[0]?.text?.slice(0, 60)}{passageVerses[0]?.text && passageVerses[0].text.length > 60 ? "..." : ""}
              </p>
            )}
            {versePreviewExpanded && passageVerses.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {passageVerses.map(v => (
                  <p key={v.num} style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", marginRight: 4 }}>{v.num}</span>
                    {v.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 진행바 — 6칸, 본문요약+붙잡은말씀 동시 활성 */}
        <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
          {BAR_LABELS_6.map((label, i) => {
            const state = getBarState(i);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: "100%", height: 4, borderRadius: 2, background: state === "done" ? "var(--sage)" : state === "curr" ? "var(--sage)" : "var(--border)", opacity: state === "curr" ? 1 : state === "done" ? 0.8 : 0.4, transition: "all 0.3s" }} />
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>
          {step6.barIdx.map(i => trQT(BAR_LABELS_6[i], lang)).join(" & ")}
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{trQT(step6.title, lang)}</h1>
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{trQT(step6.subtitle, lang)}</p>
      </div>

      {/* 단계 탭 */}
      <div style={{ display: "flex", overflowX: "auto", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {STEPS_6.map((s, i) => {
          const done = i < cur;
          const isCurr = i === cur;
          return (
            <button key={i} onClick={() => setCur(i)} style={{ flexShrink: 0, padding: "10px 12px", background: "none", border: "none", borderBottom: isCurr ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: isCurr ? 700 : 400, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)", whiteSpace: "nowrap" }}>{trQT(s.title, lang)}</span>
              {done && <span style={{ fontSize: 10, color: "var(--sage)" }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* 본문 요약 & 붙잡은 말씀 단계 */}
      {step6.isPassageStep && (
        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* 본문 전체 보기 (스케줄로 로드된 경우) */}
          {passageVerses.length > 0 && (
            <div style={{ background: "var(--sage-light)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(122,157,122,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>📖 {translateBibleRef(bibleRef, (currentLang.toLowerCase() as Lang) || lang)} · {translationName}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {passageVerses.map(v => (
                  <button key={v.num} onClick={() => selectVerse(String(v.text), typeof v.num === "number" ? v.num : 0)} style={{ textAlign: "left", background: selectedVerseNums.includes(typeof v.num === "number" ? v.num : 0) ? "var(--sage-light)" : "rgba(122,157,122,0.06)", borderRadius: 8, padding: "8px 10px", border: `1px solid ${selectedVerseNums.includes(typeof v.num === "number" ? v.num : 0) ? "var(--sage)" : "rgba(122,157,122,0.15)"}`, cursor: "pointer", display: "flex", gap: 8, alignItems: "flex-start", transition: "all 0.15s" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: selectedVerseNums.includes(typeof v.num === "number" ? v.num : 0) ? "var(--sage-dark)" : "var(--sage)", flexShrink: 0, minWidth: 16 }}>{v.num}</span>
                    <span style={{ fontSize: 13, color: selectedVerseNums.includes(typeof v.num === "number" ? v.num : 0) ? "var(--sage-dark)" : "var(--text)", lineHeight: 1.6, fontWeight: selectedVerseNums.includes(typeof v.num === "number" ? v.num : 0) ? 600 : 400 }}>{v.text}</span>
                    {selectedVerseNums.includes(typeof v.num === "number" ? v.num : 0) && <Check size={13} style={{ color: "var(--sage)", marginLeft: "auto", flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 10, color: "var(--sage-dark)", marginTop: 8, fontWeight: 600 }}>{trQT("💡 절을 탭하면 붙잡은 말씀에 추가돼요", lang)}</p>
            </div>
          )}

          {/* 2단계: 본문 요약 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>
              {trQT("2단계 · 본문 요약", lang)}
            </label>
            <textarea className="textarea-field" rows={4} placeholder={trQT("본문 내용을 자신의 말로 요약해보세요...", lang)} value={answers.summary ?? ""} onChange={e => set("summary", e.target.value)} />
          </div>

          {/* 3단계: 붙잡은 말씀 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>
              {trQT("3단계 · 붙잡은 말씀", lang)} <span style={{ fontWeight: 400 }}>{trQT("(위 절 탭하면 자동 추가)", lang)}</span>
            </label>
            <textarea className="textarea-field" rows={3} placeholder={trQT("마음에 와닿은 구절을 적거나 위에서 선택하세요...", lang)} value={keyVerse} onChange={e => setKeyVerse(e.target.value)} />
          </div>
        </div>
      )}

      {/* 결단 단계 */}
      {step6.isDecision && (
        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "var(--bg2)", borderRadius: 12, padding: "12px 14px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
              {lang === "de" ? <>
                <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>Charakter</span> ist die Entscheidung des Herzens,{" "}
                <span style={{ fontWeight: 700, color: "var(--terra-dark)" }}>Handlung</span> wird mit Händen und Füßen sichtbar.
              </> : lang === "en" ? <>
                <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>Character</span> is the decision of the heart,{" "}
                <span style={{ fontWeight: 700, color: "var(--terra-dark)" }}>action</span> is shown through hands and feet.
              </> : lang === "fr" ? <>
                Le <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>caractère</span> est la décision du cœur,{" "}
                l'<span style={{ fontWeight: 700, color: "var(--terra-dark)" }}>action</span> se manifeste par les mains et les pieds.
              </> : <>
                <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>성품</span>은 마음을 정하는 것,{" "}
                <span style={{ fontWeight: 700, color: "var(--terra-dark)" }}>행동</span>은 손과 발로 드러나는 것이에요.
              </>}
            </p>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{trQT("성품 (마음의 결심)", lang)}</label>
            <textarea className="textarea-field" rows={3} placeholder={trQT("이 말씀 앞에서 어떤 마음을 품기로 결심했나요?", lang)} value={answers.application ?? ""} onChange={e => set("application", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 8 }}>{trQT("행동 (구체적인 실천)", lang)}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {decisions.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{i + 1}</span>
                  </div>
                  <input type="text" className="input-field" placeholder={`${trQT("행동 1", lang).replace("1", String(i + 1))}`} value={d} onChange={e => updateDecision(i, e.target.value)} style={{ flex: 1 }} />
                  {decisions.length > 1 && <button onClick={() => removeDecision(i)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><Trash2 size={16} /></button>}
                </div>
              ))}
            </div>
            <button onClick={addDecision} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px dashed var(--border)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", marginTop: 8, width: "100%", color: "var(--text3)", fontSize: 12 }}>
              <Plus size={14} /> {trQT("행동 추가하기", lang)}
            </button>
          </div>
        </div>
      )}

      {/* 일반 텍스트 단계 (들어가는기도, 느낌과묵상, 올려드리는기도) */}
      {!step6.isPassageStep && !step6.isDecision && (
        <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>

          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>{trQT(step6.hint, lang)}</p>

          {step6.id === "meditation" && keyVerse.trim() && (
            <div style={{ background: "var(--sage-light)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(122,157,122,0.3)" }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: "var(--sage-dark)", marginBottom: 6 }}>
                {trQT("붙잡은 말씀으로 묵상해요", lang)}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {keyVerse.split("\n").filter(line => line.trim()).map((line, idx) => {
                  const match = line.trim().match(/^(\S+)\s+(.*)$/);
                  const num = match?.[1] ?? "";
                  const body = match?.[2] ?? line.trim();
                  return (
                    <p key={`${idx}-${line}`} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>
                      {num && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--sage-dark)", marginRight: 6 }}>{num}</span>}
                      {body}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          <textarea className="textarea-field" rows={9} placeholder={trQT(step6.placeholder, lang)} value={answers[step6.id] ?? ""} onChange={e => set(step6.id, e.target.value)} />
        </div>
      )}

      {/* 하단 버튼 */}
      <div style={{ padding: "12px 16px 32px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {cur > 0 && <button onClick={() => setCur(c => c - 1)} className="btn-outline" style={{ flex: 1 }}>{trQT("← 이전", lang)}</button>}
          {step6.isLast ? (
            <button onClick={save} disabled={!canNext6val || saving} className="btn-sage" style={{ flex: cur > 0 ? 2 : 1 }}>
              {saving ? <><Loader2 size={18} className="spin" />{trQT("저장 중...", lang)}</> : <><Check size={18} />{trQT("큐티 완료", lang)}</>}
            </button>
          ) : (
            <button onClick={() => setCur(c => c + 1)} className="btn-primary" style={{ flex: cur > 0 ? 2 : 1 }}>{trQT("다음 단계 →", lang)}</button>
          )}
        </div>
        {/* 임시저장 버튼 */}
        <button
          onClick={saveDraft}
          disabled={saving || selectedDate !== todayStr}
          style={{ width: "100%", padding: "10px", background: "none", border: "1px dashed var(--border)", borderRadius: 12, color: "var(--text3)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {trQT("💾 임시저장하고 나중에 이어쓰기", lang)}
        </button>
      </div>
    </div>
  );
}

export default function QTWritePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>}>
      <QTWriteContent />
    </Suspense>
  );
}
