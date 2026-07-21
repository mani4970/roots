"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { storageGet, storageSet } from "@/lib/clientStorage";
import { loadQTDraftBackup, mergeQtDraftRowWithBackup, removeQTDraftBackup, saveQTDraftBackup } from "@/lib/qtDraftBackup";
import { getPendingAwardedBadgesKey, recordBibleReflectionProgress } from "@/lib/reflectionProgress";
import { useLang } from "@/lib/useLang";
import { t, type Lang } from "@/lib/i18n";
import { translateBibleRef } from "@/lib/bibleBooks";
import { getLocalDateString } from "@/lib/date";
import { markBibleReflectionCompletedForNotifications } from "@/lib/localNotifications";
import { ChevronLeft, Check, Loader2, Plus, Trash2, ChevronDown, BookOpen, X, ChevronUp, Calendar, Save } from "lucide-react";
import { ALL_TRANSLATIONS, BIBLE_CHAPTERS, BOOK_NAMES, NT_BOOKS, OT_BOOKS, TRANSLATION_LANG, TRANSLATIONS } from "@/lib/bibleData";
import { BAR_LABELS_6, STEPS_6, STEPS_SUNDAY } from "@/lib/qtWriteConfig";
import SharePromptModal, { type ShareTargetGroup, type ShareTargetPartner } from "@/components/SharePromptModal";
import { loadSharePromptOptions } from "@/lib/sharePromptOptions";
import { createBibleReflectionShareNotificationsBestEffort } from "@/lib/notifications/create";
import { recordCompanionChallengeReflectionCompletedBestEffort } from "@/lib/companionChallenges";
import QTAutoSaveStatus, { type QTAutoSaveStatusHandle, type QTAutoSaveStatusValue } from "@/components/QTAutoSaveStatus";
import CursorStableTextarea from "@/components/CursorStableTextarea";

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
  "본문 글씨": { de: "Bibeltext", en: "Bible text", fr: "Texte biblique" },
  "번역본": { de: "Übersetzung", en: "Translation", fr: "Traduction" },
  "본문 요약 & 붙잡은 말씀": { de: "Zusammenfassung & Schlüsselvers", en: "Summary & Key Verse", fr: "Résumé & verset clé" },
  "본문을 읽고 마음에 새겨요": { de: "Den Text lesen und ins Herz aufnehmen", en: "Read and engrave the text in your heart", fr: "Lisez le texte et gardez-le dans votre cœur" },
  "느낌과 묵상": { de: "Empfinden & Meditation", en: "Reflection & Meditation", fr: "Méditation" },
  "이 말씀이 내게 주는 의미": { de: "Was bedeutet das Wort für mich?", en: "What this Word means to me", fr: "Ce que cette Parole signifie pour moi" },
  "적용과 결단": { de: "Anwendung & Entschluss", en: "Application & Resolution", fr: "Décision" },
  "오늘 하루 어떻게 살 건가요?": { de: "Wie leben Sie heute?", en: "How will you live today?", fr: "Comment allez-vous vivre aujourd’hui ?" },
  "올려드리는 기도": { de: "Abschlussgebet", en: "Closing Prayer", fr: "Prière finale" },
  "말씀으로 드리는 기도": { de: "Gebet mit dem Wort", en: "Prayer with the Word", fr: "Prière avec la Parole" },
  // 6단계 placeholder / hint
  "주님, 오늘 말씀 앞에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.": { de: "Herr, ich komme heute vor dein Wort...\nÖffne meine Augen, Ohren und mein Herz.", en: "Lord, I come before your word today...\nOpen my eyes, ears, and heart.", fr: "Seigneur, je viens devant ta Parole aujourd’hui...\nOuvre mes yeux, mes oreilles et mon cœur." },
  "짧아도 괜찮아요. 마음을 열고 주님께 나아가는 기도예요.": { de: "Kurz reicht auch. Ein Gebet mit offenem Herzen.", en: "Short is fine. A prayer with an open heart.", fr: "Court, c’est très bien. Une prière avec un cœur ouvert." },
  "이 말씀이 오늘 내 삶에 무슨 말씀인가요?\n솔직하게 느낀 것을 써보세요.": { de: "Was sagt dieses Wort in mein Leben hinein?\nSchreiben Sie ehrlich, was Sie empfinden.", en: "What does this word mean for my life? Write honestly about your feelings.", fr: "Que dit cette Parole dans ma vie aujourd’hui ?\nÉcrivez honnêtement ce que vous ressentez." },
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
  "주님, 오늘 예배에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.": { de: "Herr, ich komme heute zum Gottesdienst...\nÖffne meine Augen, Ohren und mein Herz.", en: "Lord, I come before your word today...\nOpen my eyes, ears, and heart.", fr: "Seigneur, je viens au culte aujourd’hui...\nOuvre mes yeux, mes oreilles et mon cœur." },
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
  "임시저장됐어요! 나중에 이어쓸 수 있어요": { de: "Als Entwurf gespeichert", en: "Saved as draft", fr: "Brouillon enregistré" },
  "자동 임시저장 중...": { de: "Automatisches Speichern...", en: "Auto-saving...", fr: "Enregistrement automatique..." },
  "자동 임시저장됨": { de: "Automatisch gespeichert", en: "Auto-saved", fr: "Enregistré automatiquement" },
  "자동 임시저장됨 · {time}": { de: "Automatisch gespeichert · {time}", en: "Auto-saved · {time}", fr: "Enregistré automatiquement · {time}" },
  "작성 내용은 자동으로 임시저장돼요": { de: "Ihre Eingaben werden automatisch als Entwurf gespeichert", en: "Your writing is auto-saved as a draft", fr: "Votre texte est enregistré automatiquement comme brouillon" },
  "자동 임시저장 실패 · 수동 임시저장을 눌러주세요": { de: "Automatisches Speichern fehlgeschlagen · Bitte manuell speichern", en: "Auto-save failed · Please save manually", fr: "Échec de l’enregistrement automatique · Enregistrez manuellement" },
  "수정 모드에서는 자동 임시저장이 꺼져 있어요": { de: "Im Bearbeitungsmodus ist die automatische Speicherung deaktiviert", en: "Auto-save is off while editing", fr: "L’enregistrement automatique est désactivé pendant la modification" },
  "임시저장에 실패했어요. 다시 시도해주세요.": { de: "Speichern fehlgeschlagen. Erneut versuchen", en: "Save failed. Try again", fr: "Échec. Veuillez réessayer" },
  "저장에 실패했어요. 다시 시도해주세요.": { de: "Speichern fehlgeschlagen. Erneut versuchen", en: "Save failed. Try again", fr: "Échec. Veuillez réessayer" },
  "말씀동행 반영에 실패했어요. 다시 완료해주세요.": { de: "Die Speicherung deines Fortschritts ist fehlgeschlagen. Bitte schließe die Andacht erneut ab.", en: "Your Word Walk progress could not be saved. Please complete it again.", fr: "La progression de votre cheminement n’a pas pu être enregistrée. Veuillez terminer à nouveau." },
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
  "이전": { de: "Zurück", en: "Back", fr: "Retour" },
  "더보기": { de: "Mehr", en: "More", fr: "Voir plus" },
  "접기": { de: "Weniger", en: "Less", fr: "Réduire" },
  "다음 단계 →": { de: "Nächster Schritt →", en: "Next Step →", fr: "Étape suivante →" },
  "← 이전": { de: "← Zurück", en: "← Back", fr: "← Retour" },
  "임시저장하고 나중에 이어쓰기": { de: "Als Entwurf speichern", en: "Save as draft", fr: "Enregistrer comme brouillon" },
  "성품 (마음의 결심)": { de: "Charakter (Haltung des Herzens)", en: "Character (heart's decision)", fr: "Caractère (décision du cœur)" },
  "행동 (구체적인 결단)": { de: "Handlung (konkreter Vorsatz)", en: "Action (concrete resolution)", fr: "Action (décision concrète)" },
  "절을 탭하면 붙잡은 말씀에 추가돼요": { de: "Tippen Sie auf einen Vers, um ihn als Schlüsselvers zu speichern", en: "Tap a verse to add it as key verse", fr: "Touchez un verset pour l’ajouter au verset clé" },
  "2단계 · 본문 요약": { de: "Schritt 2 · Zusammenfassung", en: "Step 2 · Summary", fr: "Étape 2 · Résumé du passage" },
  "3단계 · 붙잡은 말씀": { de: "Schritt 3 · Schlüsselvers", en: "Step 3 · Key Verse", fr: "Étape 3 · Verset clé" },
  "(위 절 탭하면 자동 추가)": { de: "(Vers oben antippen)", en: "(Tap verse above)", fr: "(Touchez un verset ci-dessus pour l’ajouter)" },
  "행동 1": { de: "Handlung 1", en: "Action 1", fr: "Action 1" },
  "단계": { de: "Schritt", en: "Step", fr: "Étape" },
  "자유 큐티": { de: "Freie Stille Zeit", en: "Free Quiet Time", fr: "QT libre" },
  "오늘의 묵상": { de: "Heutige Meditation", en: "Today's Meditation", fr: "Méditation du jour" },
  "결단 — 말씀을 삶에 적용해보세요!": { de: "Vorsatz — Wort im Leben anwenden!", en: "Resolution — Apply the Word to life!", fr: "Décision — appliquez la Parole dans votre vie !" },
  "결단 1": { de: "Vorsatz 1", en: "Resolution 1", fr: "Décision 1" },
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
  "설교 제목": { ko: "제목", de: "Titel", en: "Title", fr: "Titre" },
  "본문 말씀": { de: "Bibelstelle", en: "Bible passage", fr: "Passage biblique" },
  "깨달음 (말씀이 내게 주는 것)": { de: "Erkenntnis (Was das Wort mir sagt)", en: "Insight (what the Word gives me)", fr: "Compréhension (ce que la Parole me donne)" },
  "오늘 설교를 통해 하나님이 내게 하신 말씀은 무엇인가요?": { de: "Was hat Gott mir heute durch die Predigt gesagt?", en: "What did God say to me through today's sermon?", fr: "Qu’est-ce que Dieu m’a dit aujourd’hui à travers le sermon ?" },
  "구약": { de: "AT", en: "OT", fr: "Ancien Testament" },
  "신약": { de: "NT", en: "NT", fr: "Nouveau Testament" },
  "임시저장은 오늘 큐티에만 가능해요.": { de: "Entwürfe nur für heute", en: "Drafts only for today's QT", fr: "Brouillons : QT du jour seulement" },
  "이미 큐티 기록이 있어요": { de: "QT für {date} vorhanden", en: "QT exists for {date}", fr: "QT existant pour le {date}" },
  "끝 장": { de: "Endkapitel", en: "End chapter", fr: "Chapitre de fin" },
  "말씀을 삶에 적용해보세요!": { de: "Wort im Leben anwenden!", en: "Apply the Word to life!", fr: "Appliquez la Parole dans votre vie !" },
  "결단": { de: "Entschluss", en: "Resolution", fr: "Décision" },
  "말씀 추가하기 (여러 본문일 경우)": { de: "Abschnitt hinzufügen (bei mehreren Texten)", en: "Add passage (for multiple passages)", fr: "Ajouter un passage (si plusieurs passages)" },
  "여러 본문 추가": { de: "Weiteren Bibeltext hinzufügen", en: "Add another passage", fr: "Ajouter un autre passage" },
  "본문 선택 완료": { de: "Bibeltext-Auswahl abschließen", en: "Finish passage selection", fr: "Terminer la sélection du passage" },
  "여러 본문을 묵상하려면 본문을 바꿔 추가해주세요.": { de: "Wenn Sie mehrere Bibeltexte betrachten möchten, wählen Sie einen weiteren Text und fügen Sie ihn hinzu.", en: "To reflect on multiple passages, choose another passage and add it.", fr: "Pour méditer plusieurs passages, choisissez un autre passage puis ajoutez-le." },
  "성품": { de: "Charakter", en: "Character", fr: "Caractère" },
  "행동": { de: "Handlung", en: "action", fr: "Action" },
  "은 마음을 정하는 것,": { de: " ist die Entscheidung des Herzens, ", en: " is the decision of the heart, ", fr: " est la décision du cœur, " },
  "은 손과 발로 드러나는 것이에요.": { de: " wird mit Händen und Füßen sichtbar.", en: " is shown through hands and feet.", fr: " se manifeste par les mains et les pieds." },
};

const QT_WRITE_FALLBACK_LANG_BY_LANG: Partial<Record<Lang, Lang>> = {
  fr: "en",
};

/** QT Write 전용 번역 함수 — 매핑에 없는 문자열은 원본 그대로 반환 */
function trQT(str: string, lang: Lang): string {
  const entry = QT_WRITE_TRANSLATIONS[str];
  const fallbackLang = QT_WRITE_FALLBACK_LANG_BY_LANG[lang];
  return entry?.[lang] ?? (fallbackLang ? entry?.[fallbackLang] : undefined) ?? str;
}

function trQTVars(str: string, lang: Lang, vars: Record<string, string | number>): string {
  let out = trQT(str, lang);
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return out;
}

type QTWriteMode = "6step" | "sunday" | "free";
type DraftSnapshot = {
  selectedDate: string;
  mode: QTWriteMode;
  currentStep: number;
  bibleRef: string;
  keyVerse: string;
  answers: Record<string, string>;
  decisions: string[];
  freeText: string;
  sermonTitle: string;
  passageRefs: string[];
};
type SaveDraftOptions = {
  silent?: boolean;
  markSaving?: boolean;
  snapshot?: DraftSnapshot;
  signature?: string;
};

type CompleteSaveOptions = {
  visibility?: string;
  partnerRecipientIds?: string[];
};

const QT_AUTO_SAVE_DEBOUNCE_MS = 2500;

function QTWriteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const lang = useLang();
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" | "info" } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const BIBLE_TEXT_SIZES = [16, 18, 20, 22] as const;
  const [bibleTextSizeIndex, setBibleTextSizeIndex] = useState(() => {
    if (typeof window === "undefined") return 1;
    const saved = storageGet("roots_qt_bible_text_size_index");
    const parsed = saved ? Number.parseInt(saved, 10) : 1;
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), BIBLE_TEXT_SIZES.length - 1) : 1;
  });
  const bibleTextFontSize = BIBLE_TEXT_SIZES[bibleTextSizeIndex];

  function changeBibleTextSize(delta: number) {
    setBibleTextSizeIndex(prev => {
      const next = Math.min(Math.max(prev + delta, 0), BIBLE_TEXT_SIZES.length - 1);
      storageSet("roots_qt_bible_text_size_index", String(next));
      return next;
    });
  }

  function BibleTextSizeControl() {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted-readable)", whiteSpace: "nowrap" }}>{trQT("본문 글씨", lang)}</span>
        <button
          type="button"
          onClick={() => changeBibleTextSize(-1)}
          disabled={bibleTextSizeIndex === 0}
          aria-label="Decrease Bible text size"
          style={{ minWidth: 32, height: 28, borderRadius: 999, border: "1px solid var(--border)", background: bibleTextSizeIndex === 0 ? "var(--bg3)" : "var(--bg2)", color: bibleTextSizeIndex === 0 ? "var(--text3)" : "var(--sage-dark)", fontSize: 12, fontWeight: 800, cursor: bibleTextSizeIndex === 0 ? "default" : "pointer", opacity: bibleTextSizeIndex === 0 ? 0.45 : 1 }}
        >
          A-
        </button>
        <button
          type="button"
          onClick={() => changeBibleTextSize(1)}
          disabled={bibleTextSizeIndex === BIBLE_TEXT_SIZES.length - 1}
          aria-label="Increase Bible text size"
          style={{ minWidth: 32, height: 28, borderRadius: 999, border: "1px solid var(--border)", background: bibleTextSizeIndex === BIBLE_TEXT_SIZES.length - 1 ? "var(--bg3)" : "var(--bg2)", color: bibleTextSizeIndex === BIBLE_TEXT_SIZES.length - 1 ? "var(--text3)" : "var(--sage-dark)", fontSize: 12, fontWeight: 800, cursor: bibleTextSizeIndex === BIBLE_TEXT_SIZES.length - 1 ? "default" : "pointer", opacity: bibleTextSizeIndex === BIBLE_TEXT_SIZES.length - 1 ? 0.45 : 1 }}
        >
          A+
        </button>
      </div>
    );
  }

  function CompactBibleTextSizeButtons() {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => changeBibleTextSize(-1)}
          disabled={bibleTextSizeIndex === 0}
          aria-label="Decrease Bible text size"
          title={trQT("본문 글씨", lang)}
          style={{ minWidth: 24, height: 22, borderRadius: 999, border: "1px solid var(--border)", background: bibleTextSizeIndex === 0 ? "var(--bg3)" : "var(--bg2)", color: bibleTextSizeIndex === 0 ? "var(--text3)" : "var(--sage-dark)", fontSize: 10, fontWeight: 800, cursor: bibleTextSizeIndex === 0 ? "default" : "pointer", opacity: bibleTextSizeIndex === 0 ? 0.45 : 1, padding: "0 5px" }}
        >
          A-
        </button>
        <button
          type="button"
          onClick={() => changeBibleTextSize(1)}
          disabled={bibleTextSizeIndex === BIBLE_TEXT_SIZES.length - 1}
          aria-label="Increase Bible text size"
          title={trQT("본문 글씨", lang)}
          style={{ minWidth: 24, height: 22, borderRadius: 999, border: "1px solid var(--border)", background: bibleTextSizeIndex === BIBLE_TEXT_SIZES.length - 1 ? "var(--bg3)" : "var(--bg2)", color: bibleTextSizeIndex === BIBLE_TEXT_SIZES.length - 1 ? "var(--text3)" : "var(--sage-dark)", fontSize: 10, fontWeight: 800, cursor: bibleTextSizeIndex === BIBLE_TEXT_SIZES.length - 1 ? "default" : "pointer", opacity: bibleTextSizeIndex === BIBLE_TEXT_SIZES.length - 1 ? 0.45 : 1, padding: "0 5px" }}
        >
          A+
        </button>
      </div>
    );
  }

  function BibleTranslationSelect({ compact = false }: { compact?: boolean }) {
    return (
      <select
        value={selectedTranslation}
        onChange={async e => {
          const newId = parseInt(e.target.value);
          setSelectedTranslation(newId);
          storageSet("roots_default_translation", String(newId));
          if (passages.length > 0 || (bibleRef && passageVerses.length > 0)) {
            await reloadDisplayPassagesWithTranslation(newId);
          }
        }}
        aria-label={trQT("번역본", lang)}
        style={compact
          ? { maxWidth: 86, fontSize: 9, color: "var(--sage-dark)", background: "rgba(122,157,122,0.15)", border: "1px solid rgba(122,157,122,0.3)", borderRadius: 999, padding: "2px 4px", cursor: "pointer", fontWeight: 700, flexShrink: 0 }
          : { width: "100%", fontSize: 13, color: "var(--text)", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", cursor: "pointer", fontWeight: 600, marginBottom: 8 }
        }
      >
        {TRANSLATIONS.map(group => (
          <optgroup key={group.group} label={group.group}>
            {group.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </optgroup>
        ))}
      </select>
    );
  }

  function showToast(message: string, kind: "success" | "error" | "info" = "info") {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message, kind });
    // 에러는 더 오래 보여줘야 사용자가 인지 가능
    const duration = kind === "error" ? 4000 : 2800;
    toastTimerRef.current = window.setTimeout(() => setToast(null), duration);
  }
  const initMode = params.get("mode") as "6step" | "sunday" | "free" | null;
  const editId = params.get("editId");
  const isEditMode = Boolean(editId);
  const isResume = params.get("resume") === "true";
  const isCatchUp = params.get("catchup") === "true";
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
      const saved = storageGet("roots_default_translation");
      if (saved) return parseInt(saved);
    }
    return 92;
  });
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);

  const [mode, setMode] = useState<QTWriteMode>(() => {
    if (initMode === "free") return "free";
    if (initMode === "sunday") return "sunday";
    if (initMode === "6step") return "6step";
    return isSunday(initialDate) ? "sunday" : "6step";
  });

  // 말씀 선택 (6step, free)
  // - 6단계: 오늘 스케줄/지난 날짜 스케줄이 있으면 본문을 자동 로드한다.
  // - 자유형식: 지난 큐티라도 qt_schedule을 자동 로드하지 않고, 일반 자유형식처럼 사용자가 직접 본문을 선택한다.
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
  type VerseNum = number | string;
  type PassageVerse = { num: VerseNum; text: string };
  type PassageItem = { book: string; chapter: string; startV: string; endV: string; endChapter: string; cross: boolean; verses: PassageVerse[]; ref: string };
  const [passages, setPassages] = useState<PassageItem[]>([]);
  const [activePassageIndex, setActivePassageIndex] = useState(0);

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
  const [passageVerses, setPassageVerses] = useState<PassageVerse[]>([]);
  const [bibleRef, setBibleRef] = useState("");
  const [keyVerse, setKeyVerse] = useState("");
  const [selectedVerseNums, setSelectedVerseNums] = useState<string[]>([]);
  const [passageExpanded, setPassageExpanded] = useState(false); // 자유형식 더보기
  const [versePreviewExpanded, setVersePreviewExpanded] = useState(false); // 6단계 말씀 미리보기 더보기

  // 큐티 작성
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [freeText, setFreeText] = useState("");
  // Auto-save feedback is isolated from the writer tree so visual status updates
  // cannot re-render an active textarea during Korean IME composition.
  const autoSaveStatusViewRef = useRef<QTAutoSaveStatusHandle | null>(null);
  const autoSaveStatusStateRef = useRef<{ status: QTAutoSaveStatusValue; savedAt: string }>({
    status: "idle",
    savedAt: "",
  });
  const [showCompleteSharePrompt, setShowCompleteSharePrompt] = useState(false);
  const [completeShareTargets, setCompleteShareTargets] = useState<string[]>([]);
  const [completeShareGroups, setCompleteShareGroups] = useState<ShareTargetGroup[]>([]);
  const [completeSharePartners, setCompleteSharePartners] = useState<ShareTargetPartner[]>([]);
  const [loadingCompleteShareOptions, setLoadingCompleteShareOptions] = useState(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const autoSavingRef = useRef(false);
  const queuedAutoSaveRef = useRef<{ snapshot: DraftSnapshot; signature: string } | null>(null);
  const lastAutoSaveSignatureRef = useRef("");
  const [draftBackupUserId, setDraftBackupUserId] = useState("");
  const latestDraftSnapshotRef = useRef<DraftSnapshot | null>(null);

  // 주일예배 설교 정보
  const [sermonTitle, setSermonTitle] = useState("");
  const [sermonRef, setSermonRef] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadDraftBackupUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled) setDraftBackupUserId(user?.id ?? "");
      } catch {
        if (!cancelled) setDraftBackupUserId("");
      }
    };
    void loadDraftBackupUser();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (activePassageIndex >= passages.length) {
      setActivePassageIndex(Math.max(0, passages.length - 1));
    }
  }, [activePassageIndex, passages.length]);

  function buildSundayBibleRef(title: string, refs: string[]) {
    const cleanTitle = title.trim();
    const cleanRefs = Array.from(new Set(refs.map(ref => ref.trim()).filter(Boolean))).join(", ");
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


  const SHORT_TO_FULL_BOOKS: Record<string, string> = {
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
    "딛":"디도서","몬":"빌레몬","히":"히브리서","약":"야고보서",
    "벧전":"베드로전서","벧후":"베드로후서","요일":"요한일서","요이":"요한이서",
    "요삼":"요한삼서","유":"유다서","계":"요한계시록",
  };

  function toKoreanBookName(name: string) {
    const normalized = SHORT_TO_FULL_BOOKS[name] ?? name;
    const koBooks = [...BOOK_NAMES.KO];
    for (const names of Object.values(BOOK_NAMES)) {
      const idx = names.indexOf(normalized);
      if (idx >= 0) return koBooks[idx] ?? normalized;
    }
    return normalized;
  }

  function parseBibleRefParts(ref: string) {
    const match = String(ref).trim().match(/^(.+?)\s+(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
    if (!match) return null;
    const [, rawBook, chap, sv, evChap, ev] = match;
    const bookName = SHORT_TO_FULL_BOOKS[rawBook] ?? rawBook;
    const finalEndChapter = evChap ?? chap;
    const finalEndVerse = ev ?? sv;
    return { bookName, chap, sv, finalEndChapter, finalEndVerse, cross: finalEndChapter !== chap };
  }

  async function loadPassageItemFromRef(ref: string): Promise<PassageItem | null> {
    const parts = parseBibleRefParts(ref);
    if (!parts) return null;
    const { bookName, chap, sv, finalEndChapter, finalEndVerse, cross } = parts;
    if (cross) {
      const koBook = toKoreanBookName(bookName);
      const maxV1 = (BIBLE_CHAPTERS[koBook] ?? [])[parseInt(chap) - 1] ?? 176;
      const r1 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(bookName)}&chapter=${chap}&startVerse=${sv}&endVerse=${maxV1}`);
      const d1 = await r1.json();
      const r2 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(bookName)}&chapter=${finalEndChapter}&startVerse=1&endVerse=${finalEndVerse}`);
      const d2 = await r2.json();
      const verses = [
        ...(d1.verses ?? []).map((v: any) => ({ ...v, num: `${chap}:${v.num}` })),
        ...(d2.verses ?? []).map((v: any) => ({ ...v, num: `${finalEndChapter}:${v.num}` })),
      ];
      return { book: bookName, chapter: chap, startV: sv, endV: finalEndVerse, endChapter: finalEndChapter, cross: true, verses, ref };
    }
    const res = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(bookName)}&chapter=${chap}&startVerse=${sv}&endVerse=${finalEndVerse}`);
    const data = await res.json();
    return { book: bookName, chapter: chap, startV: sv, endV: finalEndVerse, endChapter: finalEndChapter, cross: false, verses: data.verses ?? [], ref: data.reference || ref };
  }

  async function restoreSermonPassages(rawRef?: string | null, options: { restoreTitle?: boolean } = {}) {
    const parsed = parseSundayBibleRef(rawRef);
    if (parsed.title && options.restoreTitle !== false) setSermonTitle(parsed.title);
    const refs = parsed.refs.filter(Boolean);
    if (refs.length === 0) return false;

    const loaded = await Promise.all(refs.map(async ref => {
      try {
        return await loadPassageItemFromRef(ref);
      } catch {
        return null;
      }
    }));
    const items = loaded.map((item, idx) => item ?? { book: "", chapter: "", startV: "", endV: "", endChapter: "", cross: refs[idx].includes("-") && refs[idx].includes(":"), verses: [], ref: refs[idx] });
    const first = items[0];
    if (first) {
      setBibleRef(first.ref);
      setBook(first.book || book);
      setChapter(first.chapter || chapter);
      setStartV(first.startV || startV);
      setEndChapter(first.endChapter || first.chapter || endChapter);
      setEndV(first.endV || endV);
      setCrossChapter(Boolean(first.cross));
      setPassageVerses(first.verses ?? []);
      setPassages(items);
      setActivePassageIndex(0);
      setBibleStep("done");
      setSundayBibleStep("done");
    }
    return true;
  }


  // 스케줄 자동 말씀 로드
  // - 오늘 6단계 QT: URL로 전달된 오늘 스케줄 사용
  // - 지난 큐티 6단계: 선택한 날짜의 qt_schedule을 다시 조회해서 기록 보완용으로 로드
  // - 자유형식 지난 큐티: qt_schedule 자동 로드 없이 일반 자유형식처럼 수동 본문 선택으로 시작
  useEffect(() => {
    const loadSchedulePassage = async () => {
      // resume=true일 때는 draft 복원이 끝날 때까지 빈 화면을 유지해
      // 기본 말씀 선택 화면이 잠깐 보이는 flicker를 막는다.
      if (isResume || isEditMode) return;
      if (mode !== "6step") {
        setPageReady(true);
        return;
      }

      let schedule: {
        book: string;
        chapter: string;
        startVerse: string;
        endVerse: string;
        endChapter: string | null;
      } | null = null;

      if (hasSchedule) {
        schedule = {
          book: schedBook!,
          chapter: schedChapter!,
          startVerse: schedStartV!,
          endVerse: schedEndV!,
          endChapter: schedEndChapter,
        };
      } else if (isCatchUp) {
        try {
          const supabase = createClient();
          const { data: sched } = await supabase
            .from("qt_schedule")
            .select("book,chapter,start_verse,end_verse,end_chapter")
            .eq("date", selectedDate)
            .maybeSingle();
          if (sched) {
            schedule = {
              book: sched.book,
              chapter: String(sched.chapter),
              startVerse: String(sched.start_verse),
              endVerse: String(sched.end_verse),
              endChapter: sched.end_chapter ? String(sched.end_chapter) : null,
            };
          }
        } catch {
          // 지난 날짜 스케줄 조회 실패 시 수동 선택 화면으로 진입
        }
      }

      if (!schedule) {
        setPageReady(true);
        return;
      }

      try {
        const bookName = schedule.book;
        const chap = schedule.chapter;
        const sv = schedule.startVerse;
        const ev = schedule.endVerse;
        const evChap = schedule.endChapter;

        setBook(bookName);
        setChapter(chap);
        setStartV(sv);
        setEndV(ev);
        setEndChapter(evChap ?? chap);
        setCrossChapter(Boolean(evChap && evChap !== chap));

        let allVerses: PassageVerse[] = [];
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
      } finally {
        setPageReady(true);
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
      if (isEditMode && editId) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        const { data: record, error } = await supabase
          .from("qt_records")
          .select("*")
          .eq("id", editId)
          .eq("user_id", user.id)
          .eq("is_draft", false)
          .maybeSingle();
        if (error || !record) {
          showToast(t("qt_record_error_load", lang), "error");
          setPageReady(true);
          return;
        }

        resetDraftState();
        setSelectedDate(record.date ?? todayStr);
        setMode(record.qt_mode ?? "6step");
        setCur(0);

        const isSermonRef = String(record.bible_ref ?? "").trim().startsWith("설교:");
        const isLegacyFreeSermonRef = record.qt_mode === "free" && isSermonRef;
        const restoredSermonPassages = (record.qt_mode === "sunday" || isLegacyFreeSermonRef)
          ? await restoreSermonPassages(record.bible_ref, { restoreTitle: record.qt_mode === "sunday" })
          : false;
        if (!restoredSermonPassages && record.bible_ref && !isLegacyFreeSermonRef) {
          setBibleRef(record.bible_ref);
          setBibleStep("done");
        }

        if (record.key_verse) {
          setKeyVerse(record.key_verse);
          setBibleStep("done");
          const restoredNums = String(record.key_verse)
            .split("\n")
            .map((line: string) => {
              const m = line.match(/^\s*(\d+(?::\d+)?)\s/);
              return m ? m[1] : null;
            })
            .filter((n: string | null): n is string => Boolean(n));
          if (restoredNums.length > 0) setSelectedVerseNums(restoredNums);
        }
        if (record.opening_prayer) setAnswers(p => ({ ...p, opening_prayer: record.opening_prayer }));
        if (record.summary) setAnswers(p => ({ ...p, summary: record.summary }));
        if (record.meditation) {
          if (record.qt_mode === "free") setFreeText(record.meditation);
          else setAnswers(p => ({ ...p, meditation: record.meditation }));
        }
        if (record.application) setAnswers(p => ({ ...p, application: record.application }));
        if (record.closing_prayer) setAnswers(p => ({ ...p, closing_prayer: record.closing_prayer }));
        if (record.decision) {
          const dList = String(record.decision).split("\n").map((d: string) => d.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
          if (dList.length > 0) setDecisions(dList);
        }

        const refForReload = restoredSermonPassages || isLegacyFreeSermonRef ? null : record.bible_ref;
        if (refForReload) {
          try {
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
            const match = String(refForReload).match(/^(.+?)\s+(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
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
          } catch {
            // 본문 재로드 실패해도 저장된 QT 내용은 수정 가능
          }
        }
        setPageReady(true);
        return;
      }
      if (!isResume) {
        if (!hasSchedule) setPageReady(true);
        return;
      } // 이어쓰기 모드일 때만 로드
      if (selectedDate !== todayStr) {
        resetDraftState();
        setPageReady(true);
        return;
      }
      const { createClient: cc } = await import("@/lib/supabase");
      const supabase = cc();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPageReady(true);
        return;
      }
      const { data: drafts, error } = await supabase.from("qt_records")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", selectedDate)
        .eq("is_draft", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) {
        setPageReady(true);
        return;
      }
      const localBackup = loadQTDraftBackup(user.id, selectedDate);
      let draft = drafts?.[0] ?? null;
      if (!draft && localBackup) {
        draft = mergeQtDraftRowWithBackup({
          qt_mode: localBackup.mode,
          current_step: localBackup.currentStep,
          bible_ref: "",
          key_verse: "",
          opening_prayer: "",
          summary: "",
          meditation: "",
          application: "",
          decision: "",
          closing_prayer: "",
        }, localBackup);
      }
      if (!draft) {
        resetDraftState();
        setPageReady(true);
        return;
      }
      draft = mergeQtDraftRowWithBackup(draft, localBackup);

      resetDraftState();

      // 기존 draft 데이터 복원
      if (draft.qt_mode) setMode(draft.qt_mode);
      const isDraftSermonRef = String(draft.bible_ref ?? "").trim().startsWith("설교:");
      const isLegacyFreeDraftSermonRef = draft.qt_mode === "free" && isDraftSermonRef;
      const restoredDraftSermonPassages = (draft.qt_mode === "sunday" || isLegacyFreeDraftSermonRef)
        ? await restoreSermonPassages(draft.bible_ref, { restoreTitle: draft.qt_mode === "sunday" })
        : false;
      if (!restoredDraftSermonPassages && draft.bible_ref && !isLegacyFreeDraftSermonRef) {
        setBibleRef(draft.bible_ref);
      }
      if (draft.key_verse) {
        setKeyVerse(draft.key_verse);
        setBibleStep("done");
        // keyVerse 형식: "1 본문...\n2 다른본문..." — 각 줄 첫 단어가 절 번호
        // 본문에서 클릭한 흔적(selectedVerseNums)도 함께 복원해야
        // 사용자가 다시 클릭했을 때 중복 추가되지 않음
        const restoredNums = String(draft.key_verse)
          .split("\n")
          .map((line: string) => {
            const m = line.match(/^\s*(\d+(?::\d+)?)\s/);
            return m ? m[1] : null;
          })
          .filter((n: string | null): n is string => Boolean(n));
        if (restoredNums.length > 0) setSelectedVerseNums(restoredNums);
      }
      if (draft.opening_prayer) setAnswers(p => ({ ...p, opening_prayer: draft.opening_prayer }));
      if (draft.summary) setAnswers(p => ({ ...p, summary: draft.summary }));
      if (draft.meditation) {
        if (draft.qt_mode === "free") setFreeText(draft.meditation);
        else setAnswers(p => ({ ...p, meditation: draft.meditation }));
      }
      if (draft.application) setAnswers(p => ({ ...p, application: draft.application }));
      if (draft.closing_prayer) setAnswers(p => ({ ...p, closing_prayer: draft.closing_prayer }));
      if (draft.decision) {
        const dList = draft.decision.split("\n").filter((d: string) => d.trim());
        if (dList.length > 0) setDecisions(dList);
      }

      // 말씀 본문 재로드 (bible_ref가 있으면)
      const refForReload = restoredDraftSermonPassages || isLegacyFreeDraftSermonRef ? null : draft.bible_ref;
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
      setPageReady(true);
    }
    loadDraft();
  }, [isResume, isEditMode, editId, selectedDate]);

  const translationName = ALL_TRANSLATIONS.find(t => t.id === selectedTranslation)?.name ?? "개역개정";

  // 번역본 변경 시 현재 본문 다시 로드
  async function reloadPassageWithTranslation(newTranslationId: number) {
    if (!bibleRef || passageVerses.length === 0) return;
    setLoadingBible(true);
    try {
      const effectiveEndChapter = crossChapter ? endChapter : chapter;
      if (crossChapter && effectiveEndChapter !== chapter) {
        const allKo = [...OT_BOOKS, ...NT_BOOKS];
        const allLoc = [...OT_BOOKS_LOCAL, ...NT_BOOKS_LOCAL];
        const koBook = (() => { const i=allLoc.indexOf(book); return i>=0?allKo[i]:book; })();
        const maxV1 = (BIBLE_CHAPTERS[koBook]??[])[parseInt(chapter)-1]??176;
        const r1 = await fetch(`/api/bible?translation=${newTranslationId}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${maxV1}`);
        const d1 = await r1.json();
        const r2 = await fetch(`/api/bible?translation=${newTranslationId}&book=${encodeURIComponent(book)}&chapter=${effectiveEndChapter}&startVerse=1&endVerse=${endV}`);
        const d2 = await r2.json();
        const allVerses = [...(d1.verses??[]).map((v:any)=>({...v,num:`${chapter}:${v.num}`})), ...(d2.verses??[]).map((v:any)=>({...v,num:`${effectiveEndChapter}:${v.num}`}))];
        if (allVerses.length > 0) setPassageVerses(allVerses);
      } else {
        const res = await fetch(`/api/bible?translation=${newTranslationId}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${endV}`);
        const data = await res.json();
        if (data.verses && data.verses.length > 0) setPassageVerses(data.verses);
      }
    } catch (e) { /* 로드 실패 무시 */ }
    setLoadingBible(false);
  }

  async function fetchPassageItemWithTranslation(item: PassageItem, newTranslationId: number): Promise<PassageItem> {
    const effectiveEndChapter = item.cross ? item.endChapter : item.chapter;
    const koBook = (() => {
      const all = [...OT_BOOKS, ...NT_BOOKS];
      const loc = [...OT_BOOKS_LOCAL, ...NT_BOOKS_LOCAL];
      const i = loc.indexOf(item.book);
      return i >= 0 ? all[i] : item.book;
    })();

    if (item.cross && effectiveEndChapter !== item.chapter) {
      const maxV1 = (BIBLE_CHAPTERS[koBook] ?? [])[parseInt(item.chapter) - 1] ?? 176;
      const r1 = await fetch(`/api/bible?translation=${newTranslationId}&book=${encodeURIComponent(item.book)}&chapter=${item.chapter}&startVerse=${item.startV}&endVerse=${maxV1}`);
      const d1 = await r1.json();
      const r2 = await fetch(`/api/bible?translation=${newTranslationId}&book=${encodeURIComponent(item.book)}&chapter=${effectiveEndChapter}&startVerse=1&endVerse=${item.endV}`);
      const d2 = await r2.json();
      const verses = [
        ...(d1.verses ?? []).map((v: any) => ({ ...v, num: `${item.chapter}:${v.num}` })),
        ...(d2.verses ?? []).map((v: any) => ({ ...v, num: `${effectiveEndChapter}:${v.num}` })),
      ];
      return { ...item, verses, ref: `${item.book} ${item.chapter}:${item.startV}-${effectiveEndChapter}:${item.endV}` };
    }

    const res = await fetch(`/api/bible?translation=${newTranslationId}&book=${encodeURIComponent(item.book)}&chapter=${item.chapter}&startVerse=${item.startV}&endVerse=${item.endV}`);
    const data = await res.json();
    return { ...item, verses: data.verses ?? [], ref: data.reference || item.ref };
  }

  async function reloadDisplayPassagesWithTranslation(newTranslationId: number) {
    const displayPassages = getDisplayPassages();
    if (displayPassages.length === 0) return;

    setLoadingBible(true);
    try {
      const reloaded = await Promise.all(displayPassages.map(item => fetchPassageItemWithTranslation(item, newTranslationId)));
      const safeIndex = Math.min(activePassageIndex, reloaded.length - 1);
      const active = reloaded[safeIndex] ?? reloaded[0];

      if (passages.length > 0) {
        setPassages(reloaded);
      }
      if (active) {
        setPassageVerses(active.verses);
        setBibleRef(active.ref);
      }
    } catch (e) {
      // 번역본 변경 중 본문 재로드가 실패해도 작성 중인 묵상 내용은 유지합니다.
    } finally {
      setLoadingBible(false);
    }
  }

  function resetFreePassageSelection() {
    setBibleStep("select");
    setPassageVerses([]);
    setBibleRef("");
    setPassages([]);
    setKeyVerse("");
    setSelectedVerseNums([]);
    setPassageExpanded(false);
    setVersePreviewExpanded(false);
    setFreeText("");
    setDecisions([""]);
    setBibleError("");
  }

  async function loadPassage() {
    setLoadingBible(true); setBibleError("");
    try {
      let allVerses: PassageVerse[] = [];
      let refStr = "";

      const effectiveEndChapter = crossChapter ? endChapter : chapter;
      if (crossChapter && effectiveEndChapter !== chapter) {
        // 장 넘어가는 경우: 시작장 끝까지 + 끝장 처음부터
        const koBook = (() => { const all=[...OT_BOOKS,...NT_BOOKS]; const loc=[...OT_BOOKS_LOCAL,...NT_BOOKS_LOCAL]; const i=loc.indexOf(book); return i>=0?all[i]:book; })();
        const maxV1 = (BIBLE_CHAPTERS[koBook]??[])[parseInt(chapter)-1]??176;
        const res1 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${maxV1}`);
        const d1 = await res1.json();
        const res2 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${effectiveEndChapter}&startVerse=1&endVerse=${endV}`);
        const d2 = await res2.json();
        const v1 = (d1.verses??[]).map((v:any)=>({...v, num: `${chapter}:${v.num}`}));
        const v2 = (d2.verses??[]).map((v:any)=>({...v, num: `${effectiveEndChapter}:${v.num}`}));
        allVerses = [...v1, ...v2];
        refStr = `${book} ${chapter}:${startV}-${effectiveEndChapter}:${endV}`;
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

  function normalizePassageRef(ref: string) {
    return String(ref ?? "").replace(/\s+/g, " ").trim();
  }

  async function fetchCurrentSelectedPassageItem(): Promise<PassageItem | null> {
    const effectiveEndChapter = crossChapter ? endChapter : chapter;

    if (!crossChapter && parseInt(endV, 10) < parseInt(startV, 10)) {
      setBibleError(trQT("끝 절이 시작 절보다 작아요", lang));
      return null;
    }

    const koBook = (() => {
      const all = [...OT_BOOKS, ...NT_BOOKS];
      const loc = [...OT_BOOKS_LOCAL, ...NT_BOOKS_LOCAL];
      const i = loc.indexOf(book);
      return i >= 0 ? all[i] : book;
    })();

    let vers: PassageVerse[] = [];
    let refStr = "";

    if (crossChapter && effectiveEndChapter !== chapter) {
      const maxV1 = (BIBLE_CHAPTERS[koBook] ?? [])[parseInt(chapter, 10) - 1] ?? 176;
      const r1 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${maxV1}`);
      const d1 = await r1.json();
      if (d1.error) throw new Error(d1.error);

      const r2 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${effectiveEndChapter}&startVerse=1&endVerse=${endV}`);
      const d2 = await r2.json();
      if (d2.error) throw new Error(d2.error);

      vers = [
        ...(d1.verses ?? []).map((v: any) => ({ ...v, num: `${chapter}:${v.num}` })),
        ...(d2.verses ?? []).map((v: any) => ({ ...v, num: `${effectiveEndChapter}:${v.num}` })),
      ];
      refStr = `${book} ${chapter}:${startV}-${effectiveEndChapter}:${endV}`;
    } else {
      const r = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${endV}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      vers = d.verses ?? [];
      refStr = d.reference;
    }

    if (vers.length === 0 || !refStr) {
      setBibleError(trQT("본문을 불러오지 못했어요.", lang));
      return null;
    }

    return {
      book,
      chapter,
      startV,
      endV,
      endChapter: effectiveEndChapter,
      cross: crossChapter,
      verses: vers,
      ref: refStr,
    };
  }

  // 여러 본문 추가: 현재 선택 본문을 목록에 저장하고, 선택 화면에 머무른다.
  async function addPassage(options: { stayOnSelect?: boolean } = {}) {
    setLoadingBible(true);
    setBibleError("");
    try {
      const current = await fetchCurrentSelectedPassageItem();
      if (!current) return;

      const currentKey = normalizePassageRef(current.ref);
      const existingIndex = passages.findIndex(p => normalizePassageRef(p.ref) === currentKey);
      const nextPassages = existingIndex >= 0 ? passages : [...passages, current];

      setPassages(nextPassages);
      setActivePassageIndex(existingIndex >= 0 ? existingIndex : nextPassages.length - 1);

      // 첫 번째 말씀이 없으면 메인으로도 설정
      if (!bibleRef) {
        setPassageVerses(current.verses);
        setBibleRef(current.ref);
        if (!options.stayOnSelect) {
          setBibleStep("done");
          setSundayBibleStep("done");
        }
      }
      if (mode === "sunday" && !options.stayOnSelect) setSundayBibleStep("done");
    } catch {
      setBibleError(trQT("본문을 불러오지 못했어요.", lang));
    } finally {
      setLoadingBible(false);
    }
  }

  async function completeSundayPassageSelection() {
    setLoadingBible(true);
    setBibleError("");
    try {
      const current = await fetchCurrentSelectedPassageItem();
      if (!current) {
        if (!bibleError) setBibleError(trQT("본문을 불러오지 못했어요.", lang));
        return;
      }

      const currentKey = normalizePassageRef(current.ref);
      const existingIndex = passages.findIndex(p => normalizePassageRef(p.ref) === currentKey);

      // 주일예배 묵상에서는 “여러 본문 추가”를 누른 본문만 passages 목록에 둔다.
      // 일반적으로 “본문 선택 완료”만 누른 경우에는 bibleRef/passageVerses만 갱신해서,
      // 설교 정보 탭으로 돌아와 다른 본문을 고르면 기존 단일 본문이 자연스럽게 교체된다.
      const finalPassages = passages.length === 0
        ? []
        : existingIndex >= 0
          ? passages
          : [...passages, current];
      const firstPassage = finalPassages[0] ?? current;

      setPassages(finalPassages);
      setActivePassageIndex(finalPassages.length > 0
        ? Math.max(0, existingIndex >= 0 ? existingIndex : finalPassages.length - 1)
        : 0
      );
      setPassageVerses(firstPassage.verses ?? current.verses);
      setBibleRef(firstPassage.ref || current.ref);
      setBibleStep("done");
      setSundayBibleStep("done");
      setSelectedVerseNums([]);
      setKeyVerse("");
      setCur(c => Math.min(c + 1, STEPS_SUNDAY.length - 1));
    } catch {
      setBibleError(trQT("본문을 불러오지 못했어요.", lang));
    } finally {
      setLoadingBible(false);
    }
  }

  // 본문 선택 완료: 단일 본문은 현재 선택을 바로 불러오고,
  // 여러 본문을 추가한 경우에는 마지막 현재 선택까지 자동으로 포함한다.
  async function completePassageSelection() {
    setLoadingBible(true);
    setBibleError("");
    try {
      const current = await fetchCurrentSelectedPassageItem();
      if (!current) return;

      if (passages.length === 0) {
        setPassages([]);
        setActivePassageIndex(0);
        setPassageVerses(current.verses);
        setBibleRef(current.ref);
      } else {
        const currentKey = normalizePassageRef(current.ref);
        const existingIndex = passages.findIndex(p => normalizePassageRef(p.ref) === currentKey);
        const finalPassages = existingIndex >= 0 ? passages : [...passages, current];
        const finalActiveIndex = existingIndex >= 0 ? existingIndex : finalPassages.length - 1;
        const firstPassage = finalPassages[0] ?? current;

        setPassages(finalPassages);
        setActivePassageIndex(Math.max(0, finalActiveIndex));
        setPassageVerses(firstPassage.verses);
        setBibleRef(firstPassage.ref);
      }

      setBibleStep("done");
      setSundayBibleStep("done");
      setSelectedVerseNums([]);
      setKeyVerse("");
    } catch {
      setBibleError(trQT("본문을 불러오지 못했어요.", lang));
    } finally {
      setLoadingBible(false);
    }
  }

  function renderPassageSelectionCard() {
    const allKoBooks = [...OT_BOOKS, ...NT_BOOKS];
    const allLocalBooks = [...OT_BOOKS_LOCAL, ...NT_BOOKS_LOCAL];
    const koBookName = (() => {
      const index = allLocalBooks.indexOf(book);
      return index >= 0 ? allKoBooks[index] : book;
    })();
    const chaptersData = BIBLE_CHAPTERS[koBookName] ?? [];
    const maxChapter = chaptersData.length || 150;
    const maxStartV = chaptersData[parseInt(chapter) - 1] ?? 176;
    const effectiveEndChapter = endChapter || chapter;
    const maxEndV = chaptersData[parseInt(effectiveEndChapter) - 1] ?? 176;

    return (
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{trQT("본문 말씀", lang)}</p>
          <p style={{ fontSize: 11, color: "var(--text-muted-readable)", lineHeight: 1.6 }}>{trQT("큐티할 말씀을 먼저 선택해요", lang)}</p>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>{trQT("성경 책", lang)}</label>
          <button onClick={() => setShowBookPicker(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", color: "var(--text)", fontSize: 14 }}>
            <span>{book}</span><ChevronDown size={16} style={{ color: "var(--text3)" }} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>{trQT("시작 장", lang)}</label>
            <select value={chapter} onChange={e => handleChapterChange(e.target.value)} className="input-field" style={{ padding: "12px 8px" }}>
              {Array.from({ length: maxChapter }, (_, i) => String(i + 1)).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>{trQT("시작 절", lang)}</label>
            <select value={startV} onChange={e => { setStartV(e.target.value); if (effectiveEndChapter === chapter && parseInt(e.target.value) > parseInt(endV)) setEndV(e.target.value); }} className="input-field" style={{ padding: "12px 8px" }}>
              {Array.from({ length: maxStartV }, (_, i) => String(i + 1)).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>{trQT("끝 장", lang)}</label>
            <select value={effectiveEndChapter} onChange={e => { setEndChapter(e.target.value); setCrossChapter(e.target.value !== chapter); if (e.target.value === chapter && parseInt(startV) > parseInt(endV)) setEndV(startV); }} className="input-field" style={{ padding: "12px 8px" }}>
              {Array.from({ length: maxChapter }, (_, i) => String(i + 1)).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>{trQT("끝 절", lang)}</label>
            <select value={endV} onChange={e => setEndV(e.target.value)} className="input-field" style={{ padding: "12px 8px" }}>
              {Array.from({ length: maxEndV }, (_, i) => String(i + 1)).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        {bibleError && <p style={{ fontSize: 12, color: "#E05050" }}>{bibleError}</p>}

        <button onClick={() => { void addPassage({ stayOnSelect: true }); }} disabled={loadingBible} className="btn-outline" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {loadingBible ? <><Loader2 size={16} className="spin" />{trQT("불러오는 중...", lang)}</> : <><Plus size={16} /> {trQT("여러 본문 추가", lang)}</>}
        </button>
        <p style={{ fontSize: 11, color: "var(--text-muted-readable)", lineHeight: 1.45, marginTop: -4 }}>
          {trQT("여러 본문을 묵상하려면 본문을 바꿔 추가해주세요.", lang)}
        </p>

        {passages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {passages.map((p, i) => (
              <div key={`${p.ref}-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-sage-selected)", borderRadius: 10, padding: "8px 12px", border: "1px solid var(--border-sage-soft)" }}>
                <span style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 700 }}><BookOpen size={13} /> {translateBibleRef(p.ref, (currentLang.toLowerCase() as Lang) || lang)}</span>
                <button onClick={() => setPassages(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={14}/></button>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => { void completePassageSelection(); }} disabled={loadingBible} className="btn-sage">
          {loadingBible ? <><Loader2 size={16} className="spin" />{trQT("불러오는 중...", lang)}</> : <><BookOpen size={16} />{trQT("본문 선택 완료", lang)}</>}
        </button>
      </div>
    );
  }

  function getDisplayPassages(): PassageItem[] {
    if (passages.length > 0) return passages;
    if (!bibleRef || passageVerses.length === 0) return [];
    return [{ book, chapter, startV, endV, endChapter, cross: crossChapter, verses: passageVerses, ref: bibleRef }];
  }

  function renderSelectedPassageViewer(options: { showTextSizeButtons?: boolean; showTranslation?: boolean } = {}) {
    const displayPassages = getDisplayPassages();
    if (displayPassages.length === 0) return null;
    const safeIndex = Math.min(activePassageIndex, displayPassages.length - 1);
    const activePassage = displayPassages[safeIndex] ?? displayPassages[0];
    const verses = activePassage.verses ?? [];
    const hasMultiplePassages = displayPassages.length > 1;

    return (
      <div style={{ background: "var(--surface-sage-subtle)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border-sage-soft)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasMultiplePassages ? 10 : 8, gap: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)", flex: 1, minWidth: 96, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <BookOpen size={13} style={{ verticalAlign: "text-bottom", marginRight: 4 }} /> {translateBibleRef(activePassage.ref, (currentLang.toLowerCase() as Lang) || lang)}
          </p>
          {options.showTranslation !== false && <BibleTranslationSelect compact />}
          {loadingBible && <Loader2 size={11} className="spin" style={{ color: "var(--sage-dark)", flexShrink: 0 }} />}
          {options.showTextSizeButtons && <CompactBibleTextSizeButtons />}
        </div>
        {hasMultiplePassages && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>
            {displayPassages.map((p, i) => {
              const selected = i === safeIndex;
              return (
                <button key={`${p.ref}-${i}`} onClick={() => { setActivePassageIndex(i); setPassageExpanded(false); }} style={{ flexShrink: 0, border: `1px solid ${selected ? "var(--border-sage-strong)" : "var(--border-sage-soft)"}`, background: selected ? "var(--surface-sage-selected)" : "var(--surface-card)", color: selected ? "var(--sage-dark)" : "var(--text2)", borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                  {translateBibleRef(p.ref, (currentLang.toLowerCase() as Lang) || lang)}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ overflow: "hidden", maxHeight: !passageExpanded && verses.length > 3 ? 90 : undefined, transition: "max-height 0.3s" }}>
          {verses.map(v => (
            <p key={v.num} style={{ fontSize: bibleTextFontSize, color: "var(--text)", lineHeight: 1.75, marginBottom: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", marginRight: 4 }}>{v.num}</span>{v.text}
            </p>
          ))}
        </div>
        {verses.length > 3 && (
          <button onClick={() => setPassageExpanded(p => !p)} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, background: "none", border: "none", color: "var(--sage-dark)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {passageExpanded ? <><ChevronUp size={14} />{trQT("접기", lang)}</> : <><ChevronDown size={14} />{trQT("더보기", lang)}</>}
          </button>
        )}
      </div>
    );
  }

  function normalizeVerseNum(num: VerseNum) {
    return String(num).trim();
  }

  function selectVerse(verseText: string, num: VerseNum) {
    const verseId = normalizeVerseNum(num);
    if (!verseId) return;

    if (selectedVerseNums.includes(verseId)) {
      setSelectedVerseNums(prev => prev.filter(n => n !== verseId));
      setKeyVerse(prev => prev.split("\n").filter(l => !l.startsWith(`${verseId} `)).join("\n").trim());
    } else {
      // 안전장치: keyVerse에 이미 같은 절 번호로 시작하는 줄이 있다면 중복 방지.
      // 장이 넘어가는 본문은 "20:41"처럼 장:절을 고유 ID로 사용합니다.
      const alreadyInKeyVerse = keyVerse.split("\n").some(l => l.startsWith(`${verseId} `));
      setSelectedVerseNums(prev => prev.includes(verseId) ? prev : [...prev, verseId]);
      if (!alreadyInKeyVerse) {
        const line = `${verseId} ${verseText}`;
        setKeyVerse(prev => prev ? prev + "\n" + line : line);
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    }
  }

  function set(key: string, val: string) {
    setAnswers(prev => {
      const next = { ...prev, [key]: val };
      persistDraftBackup({ ...getDraftSnapshot(), answers: next });
      return next;
    });
  }
  function addDecision() {
    setDecisions(prev => {
      const next = [...prev, ""];
      persistDraftBackup({ ...getDraftSnapshot(), decisions: next });
      return next;
    });
  }
  function removeDecision(i: number) {
    setDecisions(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      persistDraftBackup({ ...getDraftSnapshot(), decisions: next.length > 0 ? next : [""] });
      return next;
    });
  }
  function updateDecision(i: number, val: string) {
    setDecisions(prev => {
      const next = prev.map((d, idx) => idx === i ? val : d);
      persistDraftBackup({ ...getDraftSnapshot(), decisions: next });
      return next;
    });
  }
  function updateFreeText(val: string) {
    setFreeText(val);
    persistDraftBackup({ ...getDraftSnapshot(), freeText: val });
  }
  function updateKeyVerseText(val: string) {
    setKeyVerse(val);
    persistDraftBackup({ ...getDraftSnapshot(), keyVerse: val });
  }
  function updateSermonTitleText(val: string) {
    setSermonTitle(val);
    persistDraftBackup({ ...getDraftSnapshot(), sermonTitle: val });
  }

  function getDraftSnapshot(): DraftSnapshot {
    return {
      selectedDate,
      mode,
      currentStep: cur,
      bibleRef,
      keyVerse,
      answers,
      decisions,
      freeText,
      sermonTitle: mode === "sunday" ? sermonTitle : "",
      passageRefs: passages.map(p => p.ref).filter(Boolean),
    };
  }

  function hasDraftContent(snapshot: DraftSnapshot) {
    return Boolean(
      snapshot.bibleRef.trim() ||
      snapshot.keyVerse.trim() ||
      snapshot.freeText.trim() ||
      snapshot.sermonTitle.trim() ||
      snapshot.passageRefs.length > 0 ||
      Object.values(snapshot.answers).some(value => value.trim()) ||
      snapshot.decisions.some(value => value.trim())
    );
  }

  function persistDraftBackup(snapshot: DraftSnapshot = getDraftSnapshot()) {
    latestDraftSnapshotRef.current = snapshot;
    if (!draftBackupUserId || snapshot.selectedDate !== todayStr || isEditMode || !hasDraftContent(snapshot)) return;

    saveQTDraftBackup({
      userId: draftBackupUserId,
      date: snapshot.selectedDate,
      mode: snapshot.mode,
      currentStep: snapshot.currentStep,
      bibleRef: snapshot.bibleRef,
      keyVerse: snapshot.keyVerse,
      answers: snapshot.answers,
      decisions: snapshot.decisions,
      freeText: snapshot.freeText,
      sermonTitle: snapshot.sermonTitle,
      passageRefs: snapshot.passageRefs,
      updatedAt: new Date().toISOString(),
    });
  }

  function getDraftSignature(snapshot: DraftSnapshot) {
    return JSON.stringify(snapshot);
  }

  function buildDraftData(userId: string, snapshot: DraftSnapshot) {
    const decisionText = snapshot.decisions.filter(d => d.trim()).join("\n");
    const sundayRefs = [snapshot.bibleRef, ...snapshot.passageRefs].filter(Boolean);
    const draftBibleRef = snapshot.mode === "sunday"
      ? buildSundayBibleRef(snapshot.sermonTitle, sundayRefs)
      : snapshot.bibleRef;

    return {
      user_id: userId,
      date: snapshot.selectedDate,
      qt_mode: snapshot.mode,
      is_draft: true,
      current_step: snapshot.currentStep,
      bible_ref: draftBibleRef,
      key_verse: snapshot.keyVerse,
      opening_prayer: snapshot.mode === "free" ? "" : (snapshot.answers.opening_prayer ?? ""),
      summary: snapshot.mode === "free" ? "" : (snapshot.answers.summary ?? ""),
      meditation: snapshot.mode === "free" ? snapshot.freeText : (snapshot.answers.meditation ?? ""),
      application: snapshot.mode === "free" ? "" : (snapshot.answers.application ?? ""),
      decision: decisionText,
      closing_prayer: snapshot.mode === "free" ? "" : (snapshot.answers.closing_prayer ?? ""),
    };
  }

  function updateAutoSaveStatus(status: QTAutoSaveStatusValue, savedAt?: string) {
    const nextSavedAt = savedAt ?? autoSaveStatusStateRef.current.savedAt;
    autoSaveStatusStateRef.current = { status, savedAt: nextSavedAt };
    autoSaveStatusViewRef.current?.setStatus(status, nextSavedAt);
  }

  function renderAutoSaveStatus() {
    return (
      <QTAutoSaveStatus
        ref={autoSaveStatusViewRef}
        initialStatus={autoSaveStatusStateRef.current.status}
        initialSavedAt={autoSaveStatusStateRef.current.savedAt}
        isEditMode={isEditMode}
        visible={isEditMode || selectedDate === todayStr}
        idleText={trQT("작성 내용은 자동으로 임시저장돼요", lang)}
        savingText={trQT("자동 임시저장 중...", lang)}
        savedText={trQT("자동 임시저장됨", lang)}
        savedWithTimeText={trQT("자동 임시저장됨 · {time}", lang)}
        errorText={trQT("자동 임시저장 실패 · 수동 임시저장을 눌러주세요", lang)}
        editModeText={trQT("수정 모드에서는 자동 임시저장이 꺼져 있어요", lang)}
      />
    );
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
    return `${d} (${day})${d === todayStr ? ` ${trQT("· 오늘", lang)}` : ""}`;
  };
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return getLocalDateString(d);
  });

  async function saveDraft(options: SaveDraftOptions = {}) {
    if (isEditMode) return false;
    const silent = options.silent ?? false;
    const markSaving = options.markSaving ?? true;
    const snapshot = options.snapshot ?? getDraftSnapshot();
    const signature = options.signature ?? getDraftSignature(snapshot);

    if (snapshot.selectedDate !== todayStr) {
      if (!silent) showToast(trQT("임시저장은 오늘 큐티에만 가능해요.", lang), "info");
      return false;
    }

    if (!hasDraftContent(snapshot)) return false;

    // WebView가 백그라운드로 내려가면 네트워크 임시저장이 중단될 수 있으므로,
    // Supabase 저장을 시도하기 전에 먼저 기기 안에 최신 초안을 즉시 남긴다.
    persistDraftBackup(snapshot);

    if (!markSaving && autoSavingRef.current) {
      queuedAutoSaveRef.current = { snapshot, signature };
      return false;
    }

    if (markSaving) setSaving(true);
    else {
      autoSavingRef.current = true;
      updateAutoSaveStatus("saving");
    }

    // Supabase 호출이 매달리는 경우를 대비한 타임아웃 헬퍼.
    // 네트워크 끊김·세션 만료·CORS 등으로 응답이 안 올 때, 사용자가 페이지를 떠나기 전에
    // 명확한 실패 토스트가 뜨도록 강제로 throw 한다.
    const withTimeout = <T,>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> =>
      new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          reject(new Error(`[saveDraft timeout] ${label} (${ms}ms)`));
        }, ms);
        Promise.resolve(promise).then(
          (v) => { window.clearTimeout(timer); resolve(v); },
          (e) => { window.clearTimeout(timer); reject(e); }
        );
      });

    try {
      const supabase = createClient();
      const { data: { user } } = await withTimeout(supabase.auth.getUser(), 6000, "auth.getUser");
      if (!user) {
        if (!silent) router.push("/login");
        else updateAutoSaveStatus("error");
        return false;
      }

      const draftData = buildDraftData(user.id, snapshot);

      const { data: rows, error: rowsError } = await withTimeout(
        supabase.from("qt_records")
          .select("id,is_draft,created_at")
          .eq("user_id", user.id)
          .eq("date", snapshot.selectedDate)
          .order("created_at", { ascending: false }),
        8000,
        "select existing rows"
      );
      if (rowsError) throw rowsError;

      const completedRecord = rows?.find((row: any) => row.is_draft === false);
      if (completedRecord) {
        if (!silent) showToast(trQTVars("이미 큐티 기록이 있어요", lang, { date: snapshot.selectedDate }), "info");
        return false;
      }

      const draftRecord = rows?.find((row: any) => row.is_draft === true);
      if (draftRecord) {
        const { error } = await withTimeout(
          supabase.from("qt_records").update(draftData).eq("id", draftRecord.id).eq("is_draft", true),
          8000,
          "update draft"
        );
        if (error) throw error;
      } else {
        const { error } = await withTimeout(
          supabase.from("qt_records").insert(draftData),
          8000,
          "insert draft"
        );
        if (error) throw error;
      }

      lastAutoSaveSignatureRef.current = signature;
      if (silent) {
        updateAutoSaveStatus("saved", new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } else {
        showToast(trQT("임시저장됐어요! 나중에 이어쓸 수 있어요", lang), "success");
        updateAutoSaveStatus("saved", new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
      return true;
    } catch (e) {
      // 디버깅을 위한 상세 로그 — 사용자가 다음에 같은 문제 보고할 때 콘솔에서 즉시 추적 가능
      console.error("[saveDraft] failed:", e);
      if (silent) updateAutoSaveStatus("error");
      else showToast(trQT("임시저장에 실패했어요. 다시 시도해주세요.", lang), "error");
      return false;
    } finally {
      if (markSaving) setSaving(false);
      else {
        autoSavingRef.current = false;
        const queued = queuedAutoSaveRef.current;
        if (queued && queued.signature !== lastAutoSaveSignatureRef.current) {
          queuedAutoSaveRef.current = null;
          autoSaveTimerRef.current = window.setTimeout(() => {
            void saveDraft({ silent: true, markSaving: false, snapshot: queued.snapshot, signature: queued.signature });
          }, 600);
        }
      }
    }
  }

  useEffect(() => {
    if (isEditMode || !pageReady || selectedDate !== todayStr || !draftBackupUserId) return;
    const snapshot = getDraftSnapshot();
    latestDraftSnapshotRef.current = snapshot;
    if (hasDraftContent(snapshot)) persistDraftBackup(snapshot);
  }, [draftBackupUserId, isEditMode, pageReady, selectedDate, todayStr, mode, cur, bibleRef, keyVerse, answers, decisions, freeText, sermonTitle, passages]);

  useEffect(() => {
    if (isEditMode || !draftBackupUserId) return;
    const persistLatestBeforeLeave = () => {
      const snapshot = latestDraftSnapshotRef.current ?? getDraftSnapshot();
      persistDraftBackup(snapshot);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistLatestBeforeLeave();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", persistLatestBeforeLeave);
    window.addEventListener("beforeunload", persistLatestBeforeLeave);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", persistLatestBeforeLeave);
      window.removeEventListener("beforeunload", persistLatestBeforeLeave);
    };
  }, [draftBackupUserId, isEditMode, selectedDate, todayStr, mode, cur, bibleRef, keyVerse, answers, decisions, freeText, sermonTitle, passages]);

  useEffect(() => {
    if (isEditMode || !pageReady || selectedDate !== todayStr) return;

    const snapshot = getDraftSnapshot();
    if (!hasDraftContent(snapshot)) {
      updateAutoSaveStatus("idle");
      return;
    }

    const signature = getDraftSignature(snapshot);
    if (signature === lastAutoSaveSignatureRef.current) return;

    if (autoSaveStatusStateRef.current.status !== "error") {
      updateAutoSaveStatus("idle");
    }

    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      void saveDraft({ silent: true, markSaving: false, snapshot, signature });
    }, QT_AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [isEditMode, pageReady, selectedDate, todayStr, mode, cur, bibleRef, keyVerse, answers, decisions, freeText, sermonTitle, passages]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  function splitShareTargets(targets: string[]) {
    const partnerRecipientIds = Array.from(new Set(
      targets
        .filter(target => target.startsWith("partner_"))
        .map(target => target.replace(/^partner_/, ""))
        .filter(Boolean)
    ));
    const visibilityTargets = Array.from(new Set(targets.filter(target => target === "all" || target.startsWith("group_"))));
    const visibility = visibilityTargets.length > 0 ? visibilityTargets.join(",") : "private";
    return { visibility, partnerRecipientIds };
  }

  async function loadCompleteShareOptions() {
    setLoadingCompleteShareOptions(true);
    try {
      const options = await loadSharePromptOptions(t("profile_default_name", lang));
      setCompleteShareGroups(options.groups);
      setCompleteSharePartners(options.partners);
    } catch (error) {
      console.error("qt complete share options load failed", error);
      setCompleteShareGroups([]);
      setCompleteSharePartners([]);
    } finally {
      setLoadingCompleteShareOptions(false);
    }
  }

  function toggleCompleteShareTarget(target: string) {
    setCompleteShareTargets(prev =>
      prev.includes(target) ? prev.filter(item => item !== target) : [...prev, target]
    );
  }

  function openCompleteSharePrompt() {
    if (isEditMode) {
      void save();
      return;
    }
    setCompleteShareTargets([]);
    setShowCompleteSharePrompt(true);
    void loadCompleteShareOptions();
  }

  function closeCompleteSharePrompt() {
    if (saving) return;
    setShowCompleteSharePrompt(false);
    setCompleteShareTargets([]);
  }

  async function replaceQtRecordRecipients(supabase: ReturnType<typeof createClient>, recordId: string, ownerId: string, recipientIds: string[]) {
    const { error: deleteError } = await supabase
      .from("qt_record_recipients")
      .delete()
      .eq("qt_record_id", recordId)
      .eq("owner_id", ownerId);
    if (deleteError) throw deleteError;

    if (recipientIds.length === 0) return;

    const { error: insertError } = await supabase
      .from("qt_record_recipients")
      .insert(recipientIds.map(recipientId => ({
        qt_record_id: recordId,
        owner_id: ownerId,
        recipient_id: recipientId,
      })));
    if (insertError) throw insertError;
  }

  function renderCompleteSharePrompt() {
    if (!showCompleteSharePrompt || isEditMode) return null;

    return (
      <SharePromptModal
        title={t("qt_complete_share_title", lang)}
        description={t("qt_complete_share_sub", lang)}
        helperText={t("qt_complete_share_helper", lang)}
        allLabel={t("qt_record_share_all", lang)}
        allSubLabel={t("qt_record_share_all_sub", lang)}
        partnersLabel={t("share_prompt_partners", lang)}
        partnerSubLabel={t("share_prompt_partner_sub", lang)}
        noPartnersLabel={t("share_prompt_no_partners", lang)}
          invitePartnersLabel={t("share_prompt_invite_partners", lang)}
          onInvitePartners={() => router.push("/community")}
        groupsLabel={t("qt_record_my_groups", lang)}
        publicGroupLabel={t("qt_record_public_group", lang)}
        privateGroupLabel={t("qt_record_private_group", lang)}
        noGroupsLabel={t("qt_record_no_groups", lang)}
        selectedCountLabel={t("qt_record_selected_count", lang, { count: completeShareTargets.length })}
        loadingLabel={t("loading", lang)}
        shareActionLabel={t("qt_complete_share_action", lang)}
        privateActionLabel={t("share_prompt_private_action", lang)}
        closeLabel={t("close", lang)}
        groups={completeShareGroups}
        partners={completeSharePartners}
        selectedTargets={completeShareTargets}
        saving={saving}
        loadingGroups={loadingCompleteShareOptions}
        loadingPartners={loadingCompleteShareOptions}
        onToggleTarget={toggleCompleteShareTarget}
        onClose={closeCompleteSharePrompt}
        onPrivate={() => { void save({ visibility: "private", partnerRecipientIds: [] }); }}
        onShare={() => { if (completeShareTargets.length > 0) void save(splitShareTargets(completeShareTargets)); }}
      />
    );
  }

  function buildCompleteRecordData(userId: string, options: CompleteSaveOptions = {}) {
    const decisionText = decisions.filter(d => d.trim()).join("\n");
    let recordData: any = { user_id: userId, date: selectedDate, qt_mode: mode };

    if (mode === "free") {
      recordData = {
        ...recordData,
        bible_ref: bibleRef,
        key_verse: keyVerse,
        meditation: freeText,
        decision: decisionText,
      };
    } else if (mode === "sunday") {
      const allRefs = [bibleRef, ...passages.map(p => p.ref)].filter(Boolean);
      recordData = {
        ...recordData,
        bible_ref: buildSundayBibleRef(sermonTitle, allRefs),
        opening_prayer: answers.opening_prayer ?? "",
        summary: answers.summary ?? "",
        meditation: answers.meditation ?? "",
        application: answers.application ?? "",
        decision: decisionText,
        closing_prayer: answers.closing_prayer ?? "",
      };
    } else {
      recordData = {
        ...recordData,
        bible_ref: bibleRef,
        key_verse: keyVerse,
        opening_prayer: answers.opening_prayer ?? "",
        summary: answers.summary ?? "",
        meditation: answers.meditation ?? "",
        application: answers.application ?? "",
        decision: decisionText,
        closing_prayer: answers.closing_prayer ?? "",
      };
    }
    if (typeof options.visibility === "string") {
      recordData.visibility = options.visibility;
    }
    return recordData;
  }

  
  async function recordProgressBeforeCompletion(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
    if (selectedDate !== getLocalDateString()) return true;

    try {
      const progress = await recordBibleReflectionProgress(supabase, userId, selectedDate);
      if (progress.awardedBadges.length > 0) {
        storageSet(getPendingAwardedBadgesKey(userId, selectedDate), JSON.stringify(progress.awardedBadges));
      }
      await recordCompanionChallengeReflectionCompletedBestEffort(supabase, selectedDate);
      storageSet(`qt_completion_pending_watering_${userId}_${selectedDate}`, "true");
      return true;
    } catch (progressError) {
      console.warn("말씀 묵상 progress 업데이트 실패:", progressError);
      showToast(trQT("말씀동행 반영에 실패했어요. 다시 완료해주세요.", lang), "error");
      return false;
    }
  }

  async function save(options: CompleteSaveOptions = {}) {
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    queuedAutoSaveRef.current = null;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const recordData = buildCompleteRecordData(user.id, options);

      if (isEditMode && editId) {
        const { error } = await supabase.from("qt_records")
          .update({ ...recordData, is_draft: false, current_step: cur })
          .eq("id", editId)
          .eq("user_id", user.id)
          .eq("is_draft", false);
        if (error) {
          showToast(trQT("저장에 실패했어요. 다시 시도해주세요.", lang), "error");
          return;
        }
        setShowCompleteSharePrompt(false);
        setCompleteShareTargets([]);
        router.push(`/qt/record?id=${editId}`);
        return;
      }

      const { data: rows, error: rowsError } = await supabase.from("qt_records")
        .select("id,is_draft,created_at")
        .eq("user_id", user.id)
        .eq("date", selectedDate)
        .order("created_at", { ascending: false });
      if (rowsError) { showToast(trQT("저장에 실패했어요. 다시 시도해주세요.", lang), "error"); return; }

      const completedRecord = rows?.find((row: any) => row.is_draft === false);
      const draftRecord = rows?.find((row: any) => row.is_draft === true);

      // 완료된 기록이 이미 있더라도, 오늘 progress가 누락된 상태라면 먼저 복구를 시도합니다.
      // 저장 성공 후 progress 반영이 실패했던 사용자가 다시 완료 버튼을 눌렀을 때 조용히 막히지 않게 합니다.
      if (completedRecord) {
        if (selectedDate === getLocalDateString()) {
          if (typeof options.visibility === "string") {
            const sharedAt = options.visibility === "private" ? null : new Date().toISOString();
            let { error: visibilityError } = await supabase.from("qt_records")
              .update({ visibility: options.visibility, shared_at: sharedAt })
              .eq("id", completedRecord.id)
              .eq("user_id", user.id);
            if (visibilityError && /shared_at/i.test(visibilityError.message ?? "")) {
              console.warn("qt_records.shared_at column is not available yet. Retrying visibility update without shared_at:", visibilityError.message);
              const retry = await supabase.from("qt_records")
                .update({ visibility: options.visibility })
                .eq("id", completedRecord.id)
                .eq("user_id", user.id);
              visibilityError = retry.error;
            }
            if (visibilityError) {
              console.warn("말씀 묵상 그룹/전체 공유 저장 실패:", visibilityError);
              showToast(trQT("저장에 실패했어요. 다시 시도해주세요.", lang), "error");
              return;
            }
          }

          if (Array.isArray(options.partnerRecipientIds)) {
            try {
              await replaceQtRecordRecipients(supabase, completedRecord.id, user.id, options.partnerRecipientIds);
            } catch (recipientError) {
              console.warn("말씀 묵상 동역자 공유 저장 실패:", recipientError);
              showToast(trQT("저장에 실패했어요. 다시 시도해주세요.", lang), "error");
              return;
            }
          }

          const progressSaved = await recordProgressBeforeCompletion(supabase, user.id);
          if (!progressSaved) return;

          try {
            await markBibleReflectionCompletedForNotifications(selectedDate, lang);
          } catch (notificationError) {
            console.warn("말씀 묵상 완료 알림 상태 업데이트 실패:", notificationError);
          }

          await createBibleReflectionShareNotificationsBestEffort({
            qtRecordId: String(completedRecord.id),
            visibility: options.visibility,
            partnerRecipientIds: options.partnerRecipientIds,
          });

          removeQTDraftBackup(user.id, selectedDate);
          setShowCompleteSharePrompt(false);
          setCompleteShareTargets([]);
          router.push("/qt/complete");
          return;
        }

        showToast(trQTVars("이미 큐티 기록이 있어요", lang, { date: selectedDate }), "info");
        return;
      }

      let completedRecordId = "";

      // draft가 있으면 update, 없으면 insert
      if (draftRecord) {
        const { data: updatedRecord, error } = await supabase.from("qt_records")
          .update({ ...recordData, is_draft: false })
          .eq("id", draftRecord.id)
          .select("id")
          .single();
        if (error) { showToast(trQT("저장에 실패했어요. 다시 시도해주세요.", lang), "error"); return; }
        completedRecordId = updatedRecord?.id ?? draftRecord.id;
      } else {
        const { data: insertedRecord, error } = await supabase.from("qt_records")
          .insert({ ...recordData, is_draft: false })
          .select("id")
          .single();
        if (error) {
          const { qt_mode, ...withoutMode } = recordData;
          const { data: fallbackInsertedRecord, error: e2 } = await supabase.from("qt_records")
            .insert({ ...withoutMode, is_draft: false })
            .select("id")
            .single();
          if (e2) { showToast(trQT("저장에 실패했어요. 다시 시도해주세요.", lang), "error"); return; }
          completedRecordId = fallbackInsertedRecord?.id ?? "";
        } else {
          completedRecordId = insertedRecord?.id ?? "";
        }
      }

      if (completedRecordId && Array.isArray(options.partnerRecipientIds)) {
        try {
          await replaceQtRecordRecipients(supabase, completedRecordId, user.id, options.partnerRecipientIds);
        } catch (recipientError) {
          console.warn("말씀 묵상 동역자 공유 저장 실패:", recipientError);
          showToast(trQT("저장에 실패했어요. 다시 시도해주세요.", lang), "error");
          return;
        }
      }

      // 오늘 말씀 묵상 완료는 홈/물주기 UI에 도달하기 전에도 progress가 먼저 저장되어야 합니다.
      // progress 저장 실패를 조용히 넘기면 사용자의 말씀동행이 누락될 수 있으므로,
      // 완료 화면으로 넘어가기 전에 반드시 저장 성공을 확인합니다.
      const progressSaved = await recordProgressBeforeCompletion(supabase, user.id);
      if (!progressSaved) return;

      // 알림 상태 업데이트는 progress 저장 성공 후 처리합니다.
      // 실패해도 말씀 묵상 완료 자체를 막지는 않습니다.
      if (selectedDate === getLocalDateString()) {
        try {
          await markBibleReflectionCompletedForNotifications(selectedDate, lang);
        } catch (notificationError) {
          console.warn("말씀 묵상 완료 알림 상태 업데이트 실패:", notificationError);
        }
      }
      if (completedRecordId) {
        await createBibleReflectionShareNotificationsBestEffort({
          qtRecordId: completedRecordId,
          visibility: options.visibility,
          partnerRecipientIds: options.partnerRecipientIds,
        });
      }
      removeQTDraftBackup(user.id, selectedDate);
      setShowCompleteSharePrompt(false);
      setCompleteShareTargets([]);
      router.push("/qt/complete");
    } finally { setSaving(false); }
  }

  // ─── 말씀 선택 화면 (6step & free) ───
  if (!pageReady) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;

  if ((mode === "6step" || mode === "free") && bibleStep === "select") {
    return (
      <div className="roots-qt-phase2a" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {toast && (
        <div
          className="roots-elevation-toast"
          role={toast.kind === "error" ? "alert" : "status"}
          aria-live={toast.kind === "error" ? "assertive" : "polite"}
          style={{
            position: "fixed",
            bottom: 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 300,
            background:
              toast.kind === "success"
                ? "var(--sage-action)"
                : toast.kind === "error"
                ? "#C44A4A"
                : "var(--bg2)",
            color: toast.kind === "success" ? "var(--on-sage-action)" : toast.kind === "info" ? "var(--text)" : "#fff",
            border: toast.kind === "info" ? "1px solid var(--border)" : "none",
            borderRadius: 12,
            padding: "11px 16px",
            fontSize: 14,
            fontWeight: 700,
            maxWidth: "calc(100vw - 16px)",
            width: "max-content",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            animation: "qtToastIn 220ms cubic-bezier(0.2,0.8,0.2,1)",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>
            {toast.kind === "success" ? "✓" : toast.kind === "error" ? "✗" : "ℹ"}
          </span>
          <span style={{ lineHeight: 1.35 }}>{toast.message}</span>
        </div>
      )}
        <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text-muted-readable)", cursor: "pointer" }}>
              <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{trQT("나가기", lang)}</span>
            </button>
            <span style={{ fontSize: 11, color: "var(--text-muted-readable)" }}>{selectedDate === todayStr ? trQT("오늘", lang) : selectedDate}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            {mode === "free" ? trQT("오늘의 말씀 찾기 (선택)", lang) : trQT("오늘의 말씀 찾기", lang)}
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted-readable)" }}>{trQT("큐티할 말씀을 먼저 선택해요", lang)}</p>
        </div>

        <div style={{ flex: 1, padding: "16px 16px 100px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
          {/* 날짜 + 번역본 */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowDatePicker(true)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", cursor: "pointer" }}>
              <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}><Calendar size={13} /> {selectedDate === todayStr ? trQT("오늘", lang) : selectedDate}</span>
              <ChevronDown size={12} style={{ color: "var(--text3)", marginLeft: "auto" }} />
            </button>
            <button onClick={() => setShowTranslationPicker(true)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", cursor: "pointer" }}>
              <span style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 600 }}><BookOpen size={13} /> {translationName}</span>
              <ChevronDown size={12} style={{ color: "var(--text3)", marginLeft: "auto" }} />
            </button>
          </div>

          {renderPassageSelectionCard()}

          {mode === "free" && (
            <button onClick={() => setBibleStep("done")} style={{ background: "none", border: "none", color: "var(--text-muted-readable)", fontSize: 12, cursor: "pointer", textDecoration: "underline", textAlign: "center" }}>
              {trQT("말씀 없이 자유롭게 작성하기", lang)}
            </button>
          )}
        </div>

        {/* 책 선택 모달 */}
        {showBookPicker && (
          <div style={{ position: "fixed", inset: 0, background: "var(--overlay-sheet)", zIndex: 50, display: "flex", alignItems: "flex-end" }}>
            <div className="roots-elevation-sheet" style={{ background: "var(--surface-card)", width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: "20px 0", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "0 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{trQT("성경 책 선택", lang)}</h3>
                <button onClick={() => setShowBookPicker(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 20 }}>✕</button>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {[{ label: trQT("구약", lang), books: OT_BOOKS_LOCAL }, { label: trQT("신약", lang), books: NT_BOOKS_LOCAL }].map(({ label, books }) => (
                  <div key={label}>
                    <div style={{ padding: "10px 20px 4px" }}><p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)", letterSpacing: "1px" }}>{label}</p></div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "6px 16px" }}>
                      {books.map(b => (
                        <button key={b} onClick={() => { setBook(b); setShowBookPicker(false); }} style={{ padding: "8px 4px", borderRadius: 10, border: `1px solid ${book === b ? "var(--border-sage-strong)" : "var(--border)"}`, background: book === b ? "var(--surface-sage-selected)" : "var(--surface-card-muted)", color: book === b ? "var(--sage-dark)" : "var(--text2)", fontSize: 11, cursor: "pointer", fontWeight: book === b ? 600 : 400 }}>
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
          <div style={{ position: "fixed", inset: 0, background: "var(--overlay-sheet)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div className="roots-elevation-sheet" style={{ background: "var(--surface-card)", width: "100%", maxWidth: 480, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>번역본 선택</h3>
                <button onClick={() => setShowTranslationPicker(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
              </div>
              {TRANSLATIONS.map(group => (
                <div key={group.group} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)", letterSpacing: "1px", marginBottom: 8 }}>{group.group}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {group.items.map(t => (
                      <button key={t.id} onClick={() => {
                const newLang = TRANSLATION_LANG[t.id] ?? "KO";
                const newBooks = BOOK_NAMES[newLang] ?? BOOK_NAMES["KO"];
                setBook(newBooks[0]); // 첫 번째 책으로 리셋
                setSelectedTranslation(t.id);
                setShowTranslationPicker(false);
              }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, border: `1px solid ${selectedTranslation === t.id ? "var(--border-sage-strong)" : "var(--border)"}`, background: selectedTranslation === t.id ? "var(--surface-sage-selected)" : "var(--surface-card-muted)", cursor: "pointer" }}>
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
          <div style={{ position: "fixed", inset: 0, background: "var(--overlay-sheet)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div className="roots-elevation-sheet" style={{ background: "var(--surface-card)", width: "100%", maxWidth: 480, borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", maxHeight: "60vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>날짜 선택</h3>
                <button onClick={() => setShowDatePicker(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {dateOptions.map(d => (
                  <button key={d} onClick={() => handleDateChange(d)} style={{ padding: "12px 16px", borderRadius: 14, border: `1px solid ${selectedDate === d ? "var(--border-sage-strong)" : "var(--border)"}`, background: selectedDate === d ? "var(--surface-sage-selected)" : "var(--surface-card-muted)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
      <div className="roots-qt-phase2a" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {renderCompleteSharePrompt()}
      {toast && (
        <div
          className="roots-elevation-toast"
          role={toast.kind === "error" ? "alert" : "status"}
          aria-live={toast.kind === "error" ? "assertive" : "polite"}
          style={{
            position: "fixed",
            bottom: 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 300,
            background:
              toast.kind === "success"
                ? "var(--sage-action)"
                : toast.kind === "error"
                ? "#C44A4A"
                : "var(--bg2)",
            color: toast.kind === "success" ? "var(--on-sage-action)" : toast.kind === "info" ? "var(--text)" : "#fff",
            border: toast.kind === "info" ? "1px solid var(--border)" : "none",
            borderRadius: 12,
            padding: "11px 16px",
            fontSize: 14,
            fontWeight: 700,
            maxWidth: "calc(100vw - 16px)",
            width: "max-content",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            animation: "qtToastIn 220ms cubic-bezier(0.2,0.8,0.2,1)",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>
            {toast.kind === "success" ? "✓" : toast.kind === "error" ? "✗" : "ℹ"}
          </span>
          <span style={{ lineHeight: 1.35 }}>{toast.message}</span>
        </div>
      )}
        <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={hasPassage ? resetFreePassageSelection : () => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text-muted-readable)", cursor: "pointer" }}>
              <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{hasPassage ? trQT("이전", lang) : trQT("나가기", lang)}</span>
            </button>
            <span style={{ fontSize: 11, color: "var(--text-muted-readable)" }}>{selectedDate === todayStr ? trQT("오늘", lang) : selectedDate}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{trQT("자유 큐티", lang)}</h1>
        </div>

        <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {/* 본문 표시 (선택사항) */}
          {hasPassage && (
            <div>
              {renderSelectedPassageViewer({ showTextSizeButtons: true })}
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>{trQT("오늘의 묵상", lang)}</label>
            <CursorStableTextarea className="textarea-field" rows={10} placeholder={trQT("오늘 읽은 말씀, 느낀 점, 깨달음을 자유롭게 적어보세요...", lang)} value={freeText} onValueChange={updateFreeText} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 8 }}>
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
            <button onClick={addDecision} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px dashed var(--border)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", marginTop: 8, width: "100%", color: "var(--text-muted-readable)", fontSize: 12 }}>
              <Plus size={14} /> {t("qt_record_add_decision", lang)}
            </button>
          </div>
        </div>

        <div style={{ padding: "12px 16px 32px", flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={openCompleteSharePrompt} disabled={(!freeText.trim() && !decisions.some(d => d.trim())) || saving} className="btn-sage">
            {saving ? <><Loader2 size={18} className="spin" />{trQT("저장 중...", lang)}</> : <><Check size={18} />{isEditMode ? t("qt_record_edit_save", lang) : trQT("큐티 완료", lang)}</>}
          </button>
          {!isEditMode && (
            <button onClick={() => saveDraft()} disabled={saving || selectedDate !== todayStr} style={{ width: "100%", padding: "10px", background: "none", border: "1px dashed var(--border)", borderRadius: 12, color: "var(--text-muted-readable)", fontSize: 12, cursor: saving || selectedDate !== todayStr ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: saving || selectedDate !== todayStr ? 0.55 : 1 }}>
              {trQT("임시저장하고 나중에 이어쓰기", lang)}
            </button>
          )}
          {renderAutoSaveStatus()}
        </div>
      </div>
    );
  }

  // ─── 주일예배 작성 화면 ───
  if (mode === "sunday") {
    const step = STEPS_SUNDAY[cur] as any;

    return (
      <div className="roots-qt-phase2a" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {renderCompleteSharePrompt()}
      {toast && (
        <div
          className="roots-elevation-toast"
          role={toast.kind === "error" ? "alert" : "status"}
          aria-live={toast.kind === "error" ? "assertive" : "polite"}
          style={{
            position: "fixed",
            bottom: 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 300,
            background:
              toast.kind === "success"
                ? "var(--sage-action)"
                : toast.kind === "error"
                ? "#C44A4A"
                : "var(--bg2)",
            color: toast.kind === "success" ? "var(--on-sage-action)" : toast.kind === "info" ? "var(--text)" : "#fff",
            border: toast.kind === "info" ? "1px solid var(--border)" : "none",
            borderRadius: 12,
            padding: "11px 16px",
            fontSize: 14,
            fontWeight: 700,
            maxWidth: "calc(100vw - 16px)",
            width: "max-content",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            animation: "qtToastIn 220ms cubic-bezier(0.2,0.8,0.2,1)",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>
            {toast.kind === "success" ? "✓" : toast.kind === "error" ? "✗" : "ℹ"}
          </span>
          <span style={{ lineHeight: 1.35 }}>{toast.message}</span>
        </div>
      )}
        <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text-muted-readable)", cursor: "pointer" }}>
              <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{trQT("나가기", lang)}</span>
            </button>
            <span style={{ fontSize: 11, color: "var(--text-muted-readable)" }}>{selectedDate === todayStr ? trQT("오늘", lang) : selectedDate}</span>
          </div>
          <div className="step-bar" style={{ marginBottom: 8 }}>
            {STEPS_SUNDAY.map((_, i) => <div key={i} className={`step-bar-item ${i < cur ? "done" : i === cur ? "curr" : ""}`} />)}
          </div>
          <p style={{ fontSize: 10, color: "var(--text-muted-readable)", marginBottom: 4 }}>{cur + 1} / {STEPS_SUNDAY.length} {trQT("단계", lang)}</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{trQT(step.title, lang)}</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted-readable)", marginTop: 3 }}>{trQT(step.subtitle, lang)}</p>
        </div>

        {/* 본문 표시 (0단계 아닐 때, 본문이 있으면) */}
        {!step.isSermonInfo && getDisplayPassages().length > 0 && (
          <div style={{ padding: "0 16px", marginTop: 0, flexShrink: 0 }}>
            {renderSelectedPassageViewer({ showTextSizeButtons: true })}
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
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{trQT("본문 말씀", lang)}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted-readable)", lineHeight: 1.6 }}>{trQT("설교 제목과 본문 말씀을 적어요", lang)}</p>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>{trQT("설교 제목", lang)}</label>
                <input type="text" className="input-field" placeholder={trQT("예: 두려워하지 말라", lang)} value={sermonTitle} onChange={e => updateSermonTitleText(e.target.value)} />
              </div>
              {/* 성경 본문 선택: 완료 후 다시 설교 정보 탭으로 돌아와도 항상 재선택할 수 있게 한다. */}
              <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>{trQT("본문 말씀", lang)}</label>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 4 }}>{trQT("번역본", lang)}</label>
                  <BibleTranslationSelect />
                  {/* 성경 책 선택 */}
                  <select className="input-field" value={book} onChange={e => { setBook(e.target.value); setChapter("1"); setStartV("1"); setEndV("1"); setEndChapter("1"); setCrossChapter(false); }} style={{ marginBottom: 8 }}>
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
                          <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 4 }}>{trQT("시작 장", lang)}</label>
                          <select className="input-field" value={chapter} onChange={e => { handleChapterChange(e.target.value); setStartV("1"); setEndV("1"); }} style={{ padding: "12px 8px" }}>
                            {Array.from({ length: maxChapter }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 4 }}>{trQT("시작 절", lang)}</label>
                          <select className="input-field" value={startV} onChange={e => { setStartV(e.target.value); if (endChapter === chapter && parseInt(e.target.value) > parseInt(endV)) setEndV(e.target.value); }} style={{ padding: "12px 8px" }}>
                            {Array.from({ length: maxStartV }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 4 }}>{trQT("끝 장", lang)}</label>
                          <select className="input-field" value={endChapter} onChange={e => { setEndChapter(e.target.value); setCrossChapter(e.target.value !== chapter); }} style={{ padding: "12px 8px" }}>
                            {Array.from({ length: maxChapter }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 4 }}>{trQT("끝 절", lang)}</label>
                          <select className="input-field" value={endV} onChange={e => setEndV(e.target.value)} style={{ padding: "12px 8px" }}>
                            {Array.from({ length: maxEndV }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      </div>
                    );
                  })()}
                  <button onClick={() => { void addPassage({ stayOnSelect: true }); }} disabled={loadingBible} className="btn-outline" style={{ marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {loadingBible ? <><Loader2 size={16} className="spin" />{trQT("불러오는 중...", lang)}</> : <><Plus size={16} /> {trQT("여러 본문 추가", lang)}</>}
                  </button>
                  <p style={{ fontSize: 11, color: "var(--text-muted-readable)", lineHeight: 1.45, margin: "0 0 8px" }}>
                    {trQT("여러 본문을 묵상하려면 본문을 바꿔 추가해주세요.", lang)}
                  </p>
                  {passages.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                      {passages.map((p, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-sage-selected)", borderRadius: 10, padding: "8px 12px", border: "1px solid var(--border-sage-soft)" }}>
                          <span style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 600 }}><BookOpen size={13} /> {p.ref}</span>
                          <button onClick={() => setPassages(prev => prev.filter((_,j)=>j!==i))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {bibleError && <p style={{ color: "#e74c3c", fontSize: 12 }}>{bibleError}</p>}
                </div>
            </div>
          )}

          {/* 깨달음과 결단 단계 */}
          {step.isDecision && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>{trQT("깨달음 (말씀이 내게 주는 것)", lang)}</label>
                <p style={{ fontSize: 12, color: "var(--text-muted-readable)", lineHeight: 1.6, marginBottom: 8 }}>{trQT("오늘 설교를 통해 하나님이 내게 하신 말씀은 무엇인가요?", lang)}</p>
                <CursorStableTextarea className="textarea-field" rows={4} placeholder={trQT("개인적이고 솔직하게 써보세요...", lang)} value={answers.meditation ?? ""} onValueChange={value => set("meditation", value)} />
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
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>{trQT("성품 (마음의 결심)", lang)}</label>
                  <CursorStableTextarea className="textarea-field" rows={2} placeholder={trQT("이 말씀 앞에서 어떤 마음을 품기로 결심했나요?", lang)} value={answers.application ?? ""} onValueChange={value => set("application", value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 8 }}>{trQT("행동 (구체적인 결단)", lang)}</label>
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
                  <button onClick={addDecision} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px dashed var(--border)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", marginTop: 8, width: "100%", color: "var(--text-muted-readable)", fontSize: 12 }}>
                    <Plus size={14} /> {t("qt_record_add_decision", lang)}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 일반 텍스트 단계 (들어가는기도, 말씀요약, 올려드리는기도) */}
          {!step.isSermonInfo && !step.isDecision && (
            <>
              <p style={{ fontSize: 12, color: "var(--text-muted-readable)", lineHeight: 1.6 }}>{trQT(step.hint, lang)}</p>
              <CursorStableTextarea className="textarea-field" rows={9} placeholder={trQT(step.placeholder, lang)} value={answers[step.id] ?? ""} onValueChange={value => set(step.id, value)} />
            </>
          )}
        </div>

        <div style={{ padding: "12px 16px 32px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {cur > 0 && <button onClick={() => setCur(c => c - 1)} className="btn-outline" style={{ flex: 1 }}>{trQT("← 이전", lang)}</button>}
            {step.isLast ? (
              <button onClick={openCompleteSharePrompt} disabled={saving} className="btn-sage" style={{ flex: cur > 0 ? 2 : 1 }}>
                {saving ? <><Loader2 size={18} className="spin" />{trQT("저장 중...", lang)}</> : <><Check size={18} />{isEditMode ? t("qt_record_edit_save", lang) : trQT("큐티 완료", lang)}</>}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (step.isSermonInfo) {
                    void completeSundayPassageSelection();
                    return;
                  }
                  setCur(c => c + 1);
                }}
                disabled={step.isSermonInfo && loadingBible}
                className="btn-primary"
                style={{ flex: cur > 0 ? 2 : 1 }}
              >
                {step.isSermonInfo
                  ? (loadingBible ? <><Loader2 size={16} className="spin" />{trQT("불러오는 중...", lang)}</> : trQT("본문 선택 완료", lang))
                  : trQT("다음 단계 →", lang)}
              </button>
            )}
          </div>
          {/* 임시저장 버튼 */}
          {!isEditMode && (
            <button onClick={() => saveDraft()} disabled={saving || selectedDate !== todayStr} style={{ width: "100%", padding: "10px", background: "none", border: "1px dashed var(--border)", borderRadius: 12, color: "var(--text-muted-readable)", fontSize: 12, cursor: saving || selectedDate !== todayStr ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: saving || selectedDate !== todayStr ? 0.55 : 1 }}>
              {trQT("임시저장하고 나중에 이어쓰기", lang)}
            </button>
          )}
          {renderAutoSaveStatus()}
        </div>
      </div>
    );
  }

  // ─── 6단계 작성 화면 ───
  const step6 = STEPS_6[cur];
  return (
    <div className="roots-qt-phase2a" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {renderCompleteSharePrompt()}
      {toast && (
        <div
          className="roots-elevation-toast"
          role={toast.kind === "error" ? "alert" : "status"}
          aria-live={toast.kind === "error" ? "assertive" : "polite"}
          style={{
            position: "fixed",
            bottom: 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 300,
            background:
              toast.kind === "success"
                ? "var(--sage-action)"
                : toast.kind === "error"
                ? "#C44A4A"
                : "var(--bg2)",
            color: toast.kind === "success" ? "var(--on-sage-action)" : toast.kind === "info" ? "var(--text)" : "#fff",
            border: toast.kind === "info" ? "1px solid var(--border)" : "none",
            borderRadius: 12,
            padding: "11px 16px",
            fontSize: 14,
            fontWeight: 700,
            maxWidth: "calc(100vw - 16px)",
            width: "max-content",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            animation: "qtToastIn 220ms cubic-bezier(0.2,0.8,0.2,1)",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>
            {toast.kind === "success" ? "✓" : toast.kind === "error" ? "✗" : "ℹ"}
          </span>
          <span style={{ lineHeight: 1.35 }}>{toast.message}</span>
        </div>
      )}
      <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text-muted-readable)", cursor: "pointer" }}>
            <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{trQT("나가기", lang)}</span>
          </button>
          <span style={{ fontSize: 11, color: "var(--text-muted-readable)" }}>{selectedDate === todayStr ? trQT("오늘", lang) : selectedDate}</span>
        </div>

        {/* 말씀 미리보기 */}
        {!step6.isPassageStep && getDisplayPassages().length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {renderSelectedPassageViewer({ showTextSizeButtons: true })}
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
        <p style={{ fontSize: 10, color: "var(--text-muted-readable)", marginBottom: 4 }}>
          {step6.barIdx.map(i => trQT(BAR_LABELS_6[i], lang)).join(" & ")}
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{trQT(step6.title, lang)}</h1>
        <p style={{ fontSize: 12, color: "var(--text-muted-readable)", marginTop: 3 }}>{trQT(step6.subtitle, lang)}</p>
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

          {/* 본문 전체 보기 */}
          {getDisplayPassages().length > 0 && (() => {
            const displayPassages = getDisplayPassages();
            const safeIndex = Math.min(activePassageIndex, displayPassages.length - 1);
            const activePassage = displayPassages[safeIndex] ?? displayPassages[0];
            const verses = activePassage.verses ?? [];
            const hasMultiplePassages = displayPassages.length > 1;
            return (
              <div>
                <div style={{ background: "var(--surface-sage-subtle)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border-sage-soft)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasMultiplePassages ? 10 : 8, gap: 6 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)", flex: 1, minWidth: 96, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><BookOpen size={13} style={{ verticalAlign: "text-bottom", marginRight: 4 }} /> {translateBibleRef(activePassage.ref, (currentLang.toLowerCase() as Lang) || lang)}</p>
                    <BibleTranslationSelect compact />
                    {loadingBible && <Loader2 size={11} className="spin" style={{ color: "var(--sage-dark)", flexShrink: 0 }} />}
                    <CompactBibleTextSizeButtons />
                  </div>
                  {hasMultiplePassages && (
                    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>
                      {displayPassages.map((p, i) => {
                        const selected = i === safeIndex;
                        return (
                          <button key={`${p.ref}-${i}`} onClick={() => { setActivePassageIndex(i); setPassageExpanded(false); }} style={{ flexShrink: 0, border: `1px solid ${selected ? "var(--border-sage-strong)" : "var(--border-sage-soft)"}`, background: selected ? "var(--surface-sage-selected)" : "var(--surface-card)", color: selected ? "var(--sage-dark)" : "var(--text2)", borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                            {translateBibleRef(p.ref, (currentLang.toLowerCase() as Lang) || lang)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {verses.map(v => {
                      const verseId = normalizeVerseNum(v.num);
                      const isSelected = selectedVerseNums.includes(verseId);
                      return (
                        <button key={`${activePassage.ref}-${verseId}`} onClick={() => selectVerse(String(v.text), v.num)} style={{ textAlign: "left", background: isSelected ? "var(--surface-sage-selected)" : "var(--surface-sage-subtle)", borderRadius: 8, padding: "8px 10px", border: `1px solid ${isSelected ? "var(--border-sage-strong)" : "var(--border-sage-soft)"}`, cursor: "pointer", display: "flex", gap: 8, alignItems: "flex-start", transition: "all 0.15s" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? "var(--sage-dark)" : "var(--sage)", flexShrink: 0, minWidth: verseId.includes(":") ? 32 : 16 }}>{verseId}</span>
                          <span style={{ fontSize: bibleTextFontSize, color: isSelected ? "var(--sage-dark)" : "var(--text)", lineHeight: 1.7, fontWeight: isSelected ? 600 : 400 }}>{v.text}</span>
                          {isSelected && <Check size={13} style={{ color: "var(--sage)", marginLeft: "auto", flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: 10, color: "var(--sage-dark)", marginTop: 8, fontWeight: 600 }}>{trQT("절을 탭하면 붙잡은 말씀에 추가돼요", lang)}</p>
                </div>
              </div>
            );
          })()}

          {/* 2단계: 본문 요약 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>
              {trQT("2단계 · 본문 요약", lang)}
            </label>
            <CursorStableTextarea className="textarea-field" rows={4} placeholder={trQT("본문 내용을 자신의 말로 요약해보세요...", lang)} value={answers.summary ?? ""} onValueChange={value => set("summary", value)} />
          </div>

          {/* 3단계: 붙잡은 말씀 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>
              {trQT("3단계 · 붙잡은 말씀", lang)} <span style={{ fontWeight: 400 }}>{trQT("(위 절 탭하면 자동 추가)", lang)}</span>
            </label>
            <CursorStableTextarea className="textarea-field" rows={3} placeholder={trQT("마음에 와닿은 구절을 적거나 위에서 선택하세요...", lang)} value={keyVerse} onValueChange={updateKeyVerseText} />
          </div>
        </div>
      )}

      {/* 결단 단계 */}
      {step6.isDecision && (
        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "var(--bg2)", borderRadius: 12, padding: "12px 14px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
              {t("qtw_decision_hint_prefix", lang)}
              <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>{t("qtw_decision_hint_character", lang)}</span>
              {t("qtw_decision_hint_middle", lang)}
              {t("qtw_decision_hint_action_article", lang)}
              <span style={{ fontWeight: 700, color: "var(--terra-dark)" }}>{t("qtw_decision_hint_action", lang)}</span>
              {t("qtw_decision_hint_suffix", lang)}
            </p>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 6 }}>{trQT("성품 (마음의 결심)", lang)}</label>
            <CursorStableTextarea className="textarea-field" rows={3} placeholder={trQT("이 말씀 앞에서 어떤 마음을 품기로 결심했나요?", lang)} value={answers.application ?? ""} onValueChange={value => set("application", value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted-readable)", display: "block", marginBottom: 8 }}>{trQT("행동 (구체적인 결단)", lang)}</label>
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
            <button onClick={addDecision} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px dashed var(--border)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", marginTop: 8, width: "100%", color: "var(--text-muted-readable)", fontSize: 12 }}>
              <Plus size={14} /> {t("qt_record_add_decision", lang)}
            </button>
          </div>
        </div>
      )}

      {/* 일반 텍스트 단계 (들어가는기도, 느낌과묵상, 올려드리는기도) */}
      {!step6.isPassageStep && !step6.isDecision && (
        <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>

          <p style={{ fontSize: 12, color: "var(--text-muted-readable)", lineHeight: 1.6 }}>{trQT(step6.hint, lang)}</p>

          {step6.id === "meditation" && keyVerse.trim() && (
            <div style={{ background: "var(--surface-sage-subtle)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border-sage-soft)" }}>
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

          <CursorStableTextarea className="textarea-field" rows={9} placeholder={trQT(step6.placeholder, lang)} value={answers[step6.id] ?? ""} onValueChange={value => set(step6.id, value)} />
        </div>
      )}

      {/* 하단 버튼 */}
      <div style={{ padding: "12px 16px 32px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {cur > 0 && <button onClick={() => setCur(c => c - 1)} className="btn-outline" style={{ flex: 1 }}>{trQT("← 이전", lang)}</button>}
          {step6.isLast ? (
            <button onClick={openCompleteSharePrompt} disabled={saving} className="btn-sage" style={{ flex: cur > 0 ? 2 : 1 }}>
              {saving ? <><Loader2 size={18} className="spin" />{trQT("저장 중...", lang)}</> : <><Check size={18} />{isEditMode ? t("qt_record_edit_save", lang) : trQT("큐티 완료", lang)}</>}
            </button>
          ) : (
            <button onClick={() => setCur(c => c + 1)} className="btn-primary" style={{ flex: cur > 0 ? 2 : 1 }}>{trQT("다음 단계 →", lang)}</button>
          )}
        </div>
        {/* 임시저장 버튼 */}
        {!isEditMode && (
          <button
            onClick={() => saveDraft()}
            disabled={saving || selectedDate !== todayStr}
            style={{ width: "100%", padding: "10px", background: "none", border: "1px dashed var(--border)", borderRadius: 12, color: "var(--text-muted-readable)", fontSize: 12, cursor: saving || selectedDate !== todayStr ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: saving || selectedDate !== todayStr ? 0.55 : 1 }}
          >
            {trQT("임시저장하고 나중에 이어쓰기", lang)}
          </button>
        )}
        {renderAutoSaveStatus()}
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
