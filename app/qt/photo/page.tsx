"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ImagePlus, Loader2, X, Check, UploadCloud, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getPendingAwardedBadgesKey, recordBibleReflectionProgress } from "@/lib/reflectionProgress";
import { markBibleReflectionCompletedForNotifications } from "@/lib/localNotifications";
import { storageSet } from "@/lib/clientStorage";
import { getLocalDateString, parseLocalDateString } from "@/lib/date";
import { useLang } from "@/lib/useLang";
import { t, type Lang } from "@/lib/i18n";
import { translateBibleRef } from "@/lib/bibleBooks";
import { BIBLE_CHAPTERS, NT_BOOKS, OT_BOOKS, TRANSLATIONS, TRANSLATION_LANG } from "@/lib/bibleData";
import SharePromptModal, { type ShareTargetGroup, type ShareTargetPartner } from "@/components/SharePromptModal";
import { loadSharePromptOptions } from "@/lib/sharePromptOptions";
import { createBibleReflectionShareNotificationsBestEffort } from "@/lib/notifications/create";
import { recordCompanionChallengeReflectionCompletedBestEffort } from "@/lib/companionChallenges";

type CompletePhotoOptions = {
  visibility?: string;
  partnerRecipientIds?: string[];
};

const PHOTO_BUCKET = "qt-photos";
const PHOTO_MAX_INPUT_SIZE = 15 * 1024 * 1024;
const BOOKS = [...OT_BOOKS, ...NT_BOOKS];

const PHOTO_COPY = {
  title: { ko: "사진으로 묵상 기록하기", de: "Reflexion als Foto speichern", en: "Record reflection with a photo", fr: "Enregistrer une méditation en photo" },
  sub: { ko: "책이나 노트에 묵상한 내용을 사진으로 남겨요.", de: "Speichere deine handschriftliche Reflexion als Foto.", en: "Save a photo of your reflection from a book or notebook.", fr: "Gardez une photo de votre méditation écrite dans un livre ou un carnet." },
  passage: { ko: "묵상 본문", de: "Bibelstelle", en: "Passage", fr: "Passage" },
  todayOnly: { ko: "사진 묵상은 오늘 날짜의 말씀 묵상으로 저장됩니다.", de: "Die Foto-Reflexion wird für heute gespeichert.", en: "Photo reflections are saved as today's Bible reflection.", fr: "La méditation photo est enregistrée pour aujourd’hui." },
  catchupOnly: { ko: "지난 말씀 묵상 기록으로 저장됩니다. 말씀동행일은 증가하지 않아요.", de: "Wird als nachgetragene Reflexion gespeichert. Dein Fortschritt wird nicht erhöht.", en: "This will be saved as a past Bible reflection. Word Walk progress will not increase.", fr: "Cette méditation sera enregistrée pour une date passée. La progression n’augmentera pas." },
  choosePhoto: { ko: "사진 선택하기", de: "Foto auswählen", en: "Choose photo", fr: "Choisir une photo" },
  changePhoto: { ko: "사진 바꾸기", de: "Foto ändern", en: "Change photo", fr: "Changer la photo" },
  memoLabel: { ko: "메모 또는 제목", de: "Notiz oder Titel", en: "Note or title", fr: "Note ou titre" },
  memoPlaceholder: { ko: "선택사항이에요. 오늘 받은 은혜를 짧게 적어도 좋아요.", de: "Optional. Du kannst kurz notieren, was du heute empfangen hast.", en: "Optional. You can briefly note the grace you received today.", fr: "Facultatif. Vous pouvez noter brièvement la grâce reçue aujourd’hui." },
  shareAndSave: { ko: "나눔 설정하고 저장하기", de: "Teilen einstellen und speichern", en: "Set sharing and save", fr: "Définir le partage et enregistrer" },
  customPassage: { ko: "본문 정하기", de: "Bibelstelle wählen", en: "Choose passage", fr: "Choisir le passage" },
  translation: { ko: "성경 번역본", de: "Bibelübersetzung", en: "Bible translation", fr: "Traduction biblique" },
  sermonTitle: { ko: "설교 제목", de: "Predigttitel", en: "Sermon title", fr: "Titre du sermon" },
  sermonTitlePlaceholder: { ko: "예: 두려워하지 말라", de: "z. B. Fürchte dich nicht", en: "e.g. Do not be afraid", fr: "ex. N’aie pas peur" },
  book: { ko: "성경", de: "Buch", en: "Book", fr: "Livre" },
  chapter: { ko: "시작 장", de: "Startkapitel", en: "Start chapter", fr: "Chapitre de début" },
  verse: { ko: "시작 절", de: "Startvers", en: "Start verse", fr: "Verset de début" },
  endChapter: { ko: "끝 장", de: "Endkapitel", en: "End chapter", fr: "Chapitre de fin" },
  endVerse: { ko: "끝 절", de: "Endvers", en: "End verse", fr: "Verset de fin" },
  addPassage: { ko: "선택한 본문 추가", de: "Ausgewählten Bibeltext hinzufügen", en: "Add selected passage", fr: "Ajouter le passage sélectionné" },
  addPassageHelp: { ko: "여러 본문을 묵상하려면 본문을 바꿔 추가해주세요.", de: "Wenn Sie mehrere Bibeltexte betrachten möchten, wählen Sie einen weiteren Text und fügen Sie ihn hinzu.", en: "To reflect on multiple passages, choose another passage and add it.", fr: "Pour méditer plusieurs passages, choisissez un autre passage puis ajoutez-le." },
  saveError: { ko: "사진 묵상 저장에 실패했어요. 다시 시도해주세요.", de: "Die Foto-Reflexion konnte nicht gespeichert werden. Bitte versuche es erneut.", en: "Could not save the photo reflection. Please try again.", fr: "Impossible d’enregistrer la méditation photo. Veuillez réessayer." },
  needPhoto: { ko: "사진을 먼저 선택해주세요.", de: "Bitte wähle zuerst ein Foto aus.", en: "Please choose a photo first.", fr: "Veuillez d’abord choisir une photo." },
  unsupportedPhoto: { ko: "이미지 파일만 선택할 수 있어요.", de: "Bitte wähle eine Bilddatei aus.", en: "Please choose an image file.", fr: "Veuillez choisir un fichier image." },
  photoTooLarge: { ko: "15MB 이하의 사진만 선택할 수 있어요.", de: "Bitte wähle ein Foto bis 15 MB aus.", en: "Please choose a photo up to 15 MB.", fr: "Veuillez choisir une photo de 15 Mo maximum." },
  alreadyDone: { ko: "해당 날짜의 말씀 묵상 기록이 이미 있어요.", de: "Für dieses Datum gibt es bereits eine Reflexion.", en: "You already have a Bible reflection for this date.", fr: "Vous avez déjà une méditation biblique pour cette date." },
  progressError: { ko: "말씀동행 반영에 실패했어요. 다시 완료해주세요.", de: "Die Speicherung deines Fortschritts ist fehlgeschlagen. Bitte schließe die Andacht erneut ab.", en: "Your Word Walk progress could not be saved. Please complete it again.", fr: "La progression de votre cheminement n’a pas pu être enregistrée. Veuillez terminer à nouveau." },
} as const;

function pc(key: keyof typeof PHOTO_COPY, lang: string) {
  const entry = PHOTO_COPY[key] as any;
  return entry[lang] ?? entry.ko;
}

function getBibleDisplayLang(translationId: number, fallbackLang: string): Lang {
  const bibleLang = TRANSLATION_LANG[translationId] ?? "KO";
  if (bibleLang === "EN") return "en";
  if (bibleLang === "DE") return "de";
  if (bibleLang === "FR") return "fr";
  if (fallbackLang === "en" || fallbackLang === "de" || fallbackLang === "fr" || fallbackLang === "ko") return fallbackLang;
  return "ko";
}

function buildRef(book: string, chapter: number, start: number, end: number, endChapter?: number | null) {
  if (endChapter && endChapter !== chapter) return `${book} ${chapter}:${start}-${endChapter}:${end}`;
  return `${book} ${chapter}:${start}${end !== start ? `-${end}` : ""}`;
}

function buildSundayBibleRef(title: string, refs: string[]) {
  const cleanTitle = title.trim();
  const cleanRefs = refs.filter(Boolean).join(", ");
  if (!cleanTitle && !cleanRefs) return "";
  if (cleanRefs) return `설교: ${cleanTitle} (${cleanRefs})`;
  return `설교: ${cleanTitle}`;
}

function splitShareTargets(targets: string[]) {
  const hasAll = targets.includes("all");
  const groupTargets = targets.filter(target => target.startsWith("group_")).map(target => target.slice("group_".length));
  const partnerRecipientIds = targets.filter(target => target.startsWith("partner_")).map(target => target.slice("partner_".length));
  const visibilityParts = [
    ...(hasAll ? ["all"] : []),
    ...groupTargets.map(groupId => `group_${groupId}`),
  ];
  return {
    visibility: visibilityParts.length > 0 ? visibilityParts.join(",") : "private",
    partnerRecipientIds,
  };
}

async function replaceQtRecordRecipients(supabase: ReturnType<typeof createClient>, qtRecordId: string, ownerId: string, recipientIds: string[]) {
  const { error: deleteError } = await supabase
    .from("qt_record_recipients")
    .delete()
    .eq("qt_record_id", qtRecordId)
    .eq("owner_id", ownerId);
  if (deleteError) throw deleteError;

  const uniqueRecipientIds = Array.from(new Set(recipientIds.filter(Boolean)));
  if (uniqueRecipientIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("qt_record_recipients")
    .insert(uniqueRecipientIds.map(recipientId => ({ qt_record_id: qtRecordId, owner_id: ownerId, recipient_id: recipientId })));
  if (insertError) throw insertError;
}

async function compressImage(file: File): Promise<Blob> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imageUrl;
    });
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image compression failed")), "image/jpeg", 0.84);
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function PhotoReflectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = useLang();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const today = getLocalDateString();
  const requestedDate = searchParams.get("date") || today;
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : today;
  const isCatchup = searchParams.get("catchup") === "true" && targetDate !== today;
  const source = searchParams.get("source") === "scheduled" ? "scheduled" : "custom";
  const sundayContext = searchParams.get("sundayContext") === "true" || parseLocalDateString(targetDate).getDay() === 0;
  const scheduledBook = searchParams.get("schedBook") ?? "";
  const scheduledChapter = Number(searchParams.get("schedChapter") ?? "0");
  const scheduledStart = Number(searchParams.get("schedStartV") ?? "1");
  const scheduledEnd = Number(searchParams.get("schedEndV") ?? scheduledStart);
  const scheduledEndChapter = searchParams.get("schedEndChapter") ? Number(searchParams.get("schedEndChapter")) : null;

  const [book, setBook] = useState(scheduledBook || "창세기");
  const [chapter, setChapter] = useState(scheduledChapter || 1);
  const [startVerse, setStartVerse] = useState(scheduledStart || 1);
  const [endChapter, setEndChapter] = useState(scheduledEndChapter || scheduledChapter || 1);
  const [endVerse, setEndVerse] = useState(scheduledEnd || 1);
  const [selectedTranslation, setSelectedTranslation] = useState<number>(() => {
    if (typeof window === "undefined") return 92;
    const saved = window.localStorage.getItem("roots_default_translation");
    const parsed = saved ? Number(saved) : 92;
    return Number.isFinite(parsed) ? parsed : 92;
  });
  const [sermonTitle, setSermonTitle] = useState("");
  const [extraRefs, setExtraRefs] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTargets, setShareTargets] = useState<string[]>([]);
  const [groups, setGroups] = useState<ShareTargetGroup[]>([]);
  const [partners, setPartners] = useState<ShareTargetPartner[]>([]);
  const [loadingShareOptions, setLoadingShareOptions] = useState(false);

  const maxChapter = BIBLE_CHAPTERS[book]?.length ?? 1;
  const safeEndChapter = Math.min(Math.max(endChapter, chapter), maxChapter);
  const maxStartVerses = BIBLE_CHAPTERS[book]?.[chapter - 1] ?? 1;
  const maxEndVerses = BIBLE_CHAPTERS[book]?.[safeEndChapter - 1] ?? maxStartVerses;
  const currentCustomRef = buildRef(
    book,
    chapter,
    Math.min(startVerse, maxStartVerses),
    safeEndChapter === chapter ? Math.max(Math.min(startVerse, maxStartVerses), Math.min(endVerse, maxEndVerses)) : Math.min(endVerse, maxEndVerses),
    safeEndChapter,
  );
  const bibleDisplayLang = getBibleDisplayLang(selectedTranslation, lang);
  const scheduledRef = source === "scheduled" && scheduledBook && scheduledChapter
    ? buildRef(scheduledBook, scheduledChapter, scheduledStart, scheduledEnd, scheduledEndChapter)
    : "";
  const customRefs = extraRefs.length > 0 ? extraRefs : [currentCustomRef];
  const bibleRef = scheduledRef || (sundayContext ? buildSundayBibleRef(sermonTitle, customRefs) : customRefs.join(", "));

  useEffect(() => {
    setChapter(1);
    setEndChapter(1);
    setStartVerse(1);
    setEndVerse(1);
  }, [book]);

  useEffect(() => {
    const max = BIBLE_CHAPTERS[book]?.[chapter - 1] ?? 1;
    setStartVerse(prev => Math.min(prev, max));
    setEndChapter(prev => Math.max(prev, chapter));
    setEndVerse(prev => Math.min(Math.max(prev, 1), max));
  }, [book, chapter]);

  useEffect(() => {
    const max = BIBLE_CHAPTERS[book]?.[safeEndChapter - 1] ?? 1;
    setEndVerse(prev => Math.min(Math.max(prev, 1), max));
  }, [book, safeEndChapter]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      showNotice(pc("unsupportedPhoto", lang));
      return;
    }
    if (selected.size > PHOTO_MAX_INPUT_SIZE) {
      showNotice(pc("photoTooLarge", lang));
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function loadShareOptions() {
    setLoadingShareOptions(true);
    try {
      const options = await loadSharePromptOptions(t("profile_default_name", lang));
      setGroups(options.groups);
      setPartners(options.partners);
    } catch (error) {
      console.error("photo reflection share options load failed", error);
      setGroups([]);
      setPartners([]);
    } finally {
      setLoadingShareOptions(false);
    }
  }

  function addCurrentPassage() {
    setExtraRefs(prev => prev.includes(currentCustomRef) ? prev : [...prev, currentCustomRef]);
  }

  function removeExtraRef(ref: string) {
    setExtraRefs(prev => prev.filter(item => item !== ref));
  }

  function openSharePrompt() {
    if (!file) {
      showNotice(pc("needPhoto", lang));
      return;
    }
    setShareTargets([]);
    setShowShareModal(true);
    void loadShareOptions();
  }

  function toggleTarget(target: string) {
    setShareTargets(prev => prev.includes(target) ? prev.filter(item => item !== target) : [...prev, target]);
  }

  async function recordTodayPhotoProgress(supabase: ReturnType<typeof createClient>, userId: string) {
    const progress = await recordBibleReflectionProgress(supabase, userId, today);
    if (progress.updated) {
      if (progress.awardedBadges.length > 0) {
        storageSet(getPendingAwardedBadgesKey(userId, today), JSON.stringify(progress.awardedBadges));
      }
      await recordCompanionChallengeReflectionCompletedBestEffort(supabase, today);
      storageSet(`qt_completion_pending_watering_${userId}_${today}`, "true");
    }
    return progress.updated;
  }

  async function savePhotoReflection(options: CompletePhotoOptions = {}) {
    if (!file || saving) {
      if (!file) showNotice(pc("needPhoto", lang));
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setSaving(true);
    let uploadedPath: string | null = null;
    let insertedRecordId: string | null = null;
    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("qt_records")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", targetDate)
        .eq("is_draft", false)
        .limit(1);
      if (existingError) throw existingError;
      if ((existingRows ?? []).length > 0) {
        if (targetDate === today) {
          try {
            const recoveredProgress = await recordTodayPhotoProgress(supabase, user.id);
            if (recoveredProgress) {
              try {
                await markBibleReflectionCompletedForNotifications(today, lang);
              } catch (notificationError) {
                console.warn("photo reflection notification completion update failed", notificationError);
              }
              setShowShareModal(false);
              router.push("/qt/complete");
              return;
            }
          } catch (progressError) {
            console.warn("photo reflection progress recovery failed", progressError);
            showNotice(pc("progressError", lang));
            return;
          }
        }
        showNotice(pc("alreadyDone", lang));
        router.push("/qt");
        return;
      }

      const compressed = await compressImage(file);
      const random = Math.random().toString(36).slice(2, 10);
      uploadedPath = `${user.id}/${targetDate}/${Date.now()}-${random}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(uploadedPath, compressed, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;

      const visibility = options.visibility ?? "private";
      const { data: insertedRecord, error: insertError } = await supabase
        .from("qt_records")
        .insert({
          user_id: user.id,
          date: targetDate,
          qt_mode: "photo",
          reflection_type: "photo",
          bible_ref: bibleRef,
          meditation: caption.trim(),
          photo_caption: caption.trim(),
          photo_path: uploadedPath,
          visibility,
          is_draft: false,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const recordId = insertedRecord?.id;
      if (!recordId) throw new Error("Photo record id missing");
      insertedRecordId = String(recordId);

      if (Array.isArray(options.partnerRecipientIds)) {
        await replaceQtRecordRecipients(supabase, recordId, user.id, options.partnerRecipientIds);
      }

      if (targetDate === today) {
        try {
          await recordTodayPhotoProgress(supabase, user.id);
        } catch (progressError) {
          console.warn("photo reflection progress failed", progressError);
          showNotice(pc("progressError", lang));
          return;
        }

        try {
          await markBibleReflectionCompletedForNotifications(today, lang);
        } catch (notificationError) {
          console.warn("photo reflection notification completion update failed", notificationError);
        }

        await createBibleReflectionShareNotificationsBestEffort({
          qtRecordId: insertedRecordId,
          visibility,
          partnerRecipientIds: options.partnerRecipientIds,
        });

        setShowShareModal(false);
        router.push("/qt/complete");
        return;
      }

      await createBibleReflectionShareNotificationsBestEffort({
        qtRecordId: insertedRecordId,
        visibility,
        partnerRecipientIds: options.partnerRecipientIds,
      });

      setShowShareModal(false);
      router.push(`/qt/record?id=${recordId}`);
    } catch (error) {
      console.error("photo reflection save failed", error);
      if (insertedRecordId) {
        const { error: rollbackError } = await supabase
          .from("qt_records")
          .delete()
          .eq("id", insertedRecordId)
          .eq("user_id", user.id);
        if (rollbackError) console.warn("photo reflection record rollback failed", rollbackError);
      }
      if (uploadedPath) {
        await supabase.storage.from(PHOTO_BUCKET).remove([uploadedPath]).catch(() => undefined);
      }
      showNotice(pc("saveError", lang));
    } finally {
      setSaving(false);
    }
  }

  const chapterOptions = Array.from({ length: maxChapter }, (_, i) => i + 1);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 40 }}>
      {notice && (
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 240, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", maxWidth: 340, width: "calc(100% - 40px)", textAlign: "center" }}>
          {notice}
        </div>
      )}

      <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 16, background: "var(--sage-light)", color: "var(--sage-dark)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ImagePlus size={23} />
          </div>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 850, color: "var(--text)", marginBottom: 3 }}>{pc("title", lang)}</h1>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5 }}>{pc("sub", lang)}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card-sage">
          <p style={{ fontSize: 10, fontWeight: 800, color: "var(--sage-dark)", letterSpacing: "0.7px", marginBottom: 6 }}>{pc("passage", lang)}</p>
          <p style={{ fontSize: 16, fontWeight: 850, color: "var(--text)", marginBottom: 4 }}>{translateBibleRef(bibleRef, bibleDisplayLang)}</p>
          {isCatchup && (
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)", marginBottom: 4 }}>{parseLocalDateString(targetDate).toLocaleDateString()}</p>
          )}
          <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.55 }}>{isCatchup ? pc("catchupOnly", lang) : pc("todayOnly", lang)}</p>
        </div>

        {source === "custom" && (
          <div className="card">
            <p style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", marginBottom: 12 }}>{pc("customPassage", lang)}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)" }}>{pc("translation", lang)}</span>
                <select
                  className="input-field"
                  value={selectedTranslation}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setSelectedTranslation(next);
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("roots_default_translation", String(next));
                    }
                  }}
                >
                  {TRANSLATIONS.map(group => (
                    <optgroup key={group.group} label={group.group}>
                      {group.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              {sundayContext && (
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)" }}>{pc("sermonTitle", lang)}</span>
                  <input className="input-field" value={sermonTitle} onChange={e => setSermonTitle(e.target.value)} placeholder={pc("sermonTitlePlaceholder", lang)} />
                </label>
              )}
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)" }}>{pc("book", lang)}</span>
                <select className="input-field" value={book} onChange={e => setBook(e.target.value)}>
                  {BOOKS.map(item => <option key={item} value={item}>{translateBibleRef(item, bibleDisplayLang)}</option>)}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)" }}>{pc("chapter", lang)}</span>
                  <select className="input-field" value={chapter} onChange={e => { const next = Number(e.target.value); setChapter(next); setEndChapter(prev => Math.max(prev, next)); }}>
                    {chapterOptions.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)" }}>{pc("verse", lang)}</span>
                  <select className="input-field" value={Math.min(startVerse, maxStartVerses)} onChange={e => { const next = Number(e.target.value); setStartVerse(next); if (safeEndChapter === chapter && next > endVerse) setEndVerse(next); }}>
                    {Array.from({ length: maxStartVerses }, (_, i) => i + 1).map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)" }}>{pc("endChapter", lang)}</span>
                  <select className="input-field" value={safeEndChapter} onChange={e => { const next = Number(e.target.value); setEndChapter(next); if (next === chapter && startVerse > endVerse) setEndVerse(startVerse); }}>
                    {chapterOptions.filter(item => item >= chapter).map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)" }}>{pc("endVerse", lang)}</span>
                  <select className="input-field" value={safeEndChapter === chapter ? Math.max(endVerse, startVerse) : Math.min(endVerse, maxEndVerses)} onChange={e => setEndVerse(Number(e.target.value))}>
                    {Array.from({ length: maxEndVerses }, (_, i) => i + 1).filter(v => safeEndChapter !== chapter || v >= startVerse).map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
              <button type="button" onClick={addCurrentPassage} className="btn-outline" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Plus size={15} /> {pc("addPassage", lang)}
              </button>
              <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.45, marginTop: -4 }}>
                {pc("addPassageHelp", lang)}
              </p>
              {extraRefs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {extraRefs.map(ref => (
                    <div key={ref} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--sage-light)", borderRadius: 10, padding: "8px 10px", border: "1px solid rgba(122,157,122,0.24)" }}>
                      <span style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 700 }}>{translateBibleRef(ref, bibleDisplayLang)}</span>
                      <button type="button" onClick={() => removeExtraRef(ref)} style={{ border: "none", background: "none", color: "var(--text3)", cursor: "pointer" }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="card" style={{ textAlign: "center" }}>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
          {previewUrl ? (
            <div>
              <img src={previewUrl} alt="preview" style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg3)", marginBottom: 12 }} />
              <button onClick={() => fileInputRef.current?.click()} className="btn-outline" style={{ width: "100%" }}>{pc("changePhoto", lang)}</button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} style={{ width: "100%", minHeight: 170, borderRadius: 20, border: "1.5px dashed var(--sage)", background: "var(--sage-light)", color: "var(--sage-dark)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", fontWeight: 800 }}>
              <UploadCloud size={34} />
              {pc("choosePhoto", lang)}
            </button>
          )}
        </div>

        <label className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)" }}>{pc("memoLabel", lang)}</span>
          <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder={pc("memoPlaceholder", lang)} rows={4} className="input-field" style={{ resize: "vertical", lineHeight: 1.6 }} />
        </label>

        <button onClick={openSharePrompt} disabled={saving} className="btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {saving ? <Loader2 size={18} className="spin" /> : <Check size={18} />} {pc("shareAndSave", lang)}
        </button>
      </div>

      {showShareModal && (
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
          selectedCountLabel={t("qt_record_selected_count", lang, { count: shareTargets.length })}
          loadingLabel={t("loading", lang)}
          shareActionLabel={t("qt_complete_share_action", lang)}
          privateActionLabel={t("share_prompt_private_action", lang)}
          closeLabel={t("close", lang)}
          groups={groups}
          partners={partners}
          selectedTargets={shareTargets}
          saving={saving || loadingShareOptions}
          loadingGroups={loadingShareOptions}
          loadingPartners={loadingShareOptions}
          onToggleTarget={toggleTarget}
          onClose={() => !saving && setShowShareModal(false)}
          onPrivate={() => { void savePhotoReflection({ visibility: "private", partnerRecipientIds: [] }); }}
          onShare={() => { void savePhotoReflection(splitShareTargets(shareTargets)); }}
        />
      )}
    </div>
  );
}

export default function PhotoReflectionPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>}>
      <PhotoReflectionContent />
    </Suspense>
  );
}
