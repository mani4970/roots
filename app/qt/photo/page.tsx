"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera as NativeCamera, CameraResultType, CameraSource } from "@capacitor/camera";
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
import CursorStableInput from "@/components/CursorStableInput";
import CursorStableTextarea from "@/components/CursorStableTextarea";
import SharePromptModal, { type ShareTargetGroup, type ShareTargetPartner } from "@/components/SharePromptModal";
import { getSharePromptBulkSelectionLabels, loadSharePromptOptions } from "@/lib/sharePromptOptions";
import { createBibleReflectionShareNotificationsBestEffort } from "@/lib/notifications/create";
import { recordCompanionChallengeReflectionCompletedBestEffort } from "@/lib/companionChallenges";
import { prepareQTPhoto, QTPhotoPreparationError, type PreparedQTPhoto } from "@/lib/qtPhotoProcessing";

type CompletePhotoOptions = {
  visibility?: string;
  partnerRecipientIds?: string[];
};

type PhotoSaveStage =
  | "auth"
  | "duplicate-check"
  | "upload"
  | "record"
  | "recipients"
  | "progress"
  | "notifications";

const PHOTO_BUCKET = "qt-photos";
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
  preparingPhoto: { ko: "저장할 사진을 안전하게 준비하고 있어요…", de: "Das Foto wird sicher vorbereitet…", en: "Preparing the photo safely…", fr: "Préparation sécurisée de la photo…" },
  photoReadError: { ko: "이 사진 형식을 읽지 못했어요. 다른 사진이나 원본 사진의 스크린샷을 선택해주세요.", de: "Dieses Fotoformat konnte nicht gelesen werden. Bitte wähle ein anderes Foto oder einen Screenshot des Originals.", en: "This photo format could not be read. Choose another photo or a screenshot of the original.", fr: "Ce format de photo n’a pas pu être lu. Choisissez une autre photo ou une capture d’écran de l’original." },
  photoBlankOrBlack: { ko: "사진 변환 결과가 비어 있거나 검게 나와 저장하지 않았어요. 원본 사진의 스크린샷을 선택해주세요.", de: "Das umgewandelte Foto war leer oder schwarz und wurde nicht gespeichert. Bitte wähle einen Screenshot des Originals.", en: "The converted photo was blank or black, so it was not saved. Choose a screenshot of the original.", fr: "La photo convertie était vide ou noire et n’a pas été enregistrée. Choisissez une capture d’écran de l’original." },
  photoProcessError: { ko: "사진을 저장용으로 변환하지 못했어요. 다른 사진을 선택해주세요.", de: "Das Foto konnte nicht für die Speicherung verarbeitet werden. Bitte wähle ein anderes Foto.", en: "The photo could not be prepared for saving. Choose another photo.", fr: "La photo n’a pas pu être préparée pour l’enregistrement. Choisissez-en une autre." },
  uploadError: { ko: "사진 업로드에 실패했어요. 인터넷 연결을 확인한 뒤 다시 시도해주세요.", de: "Das Hochladen des Fotos ist fehlgeschlagen. Prüfe deine Internetverbindung und versuche es erneut.", en: "The photo upload failed. Check your internet connection and try again.", fr: "Le téléversement de la photo a échoué. Vérifiez votre connexion Internet et réessayez." },
  recordError: { ko: "사진은 준비됐지만 묵상 기록 저장에 실패했어요. 다시 시도해주세요.", de: "Das Foto ist vorbereitet, aber die Reflexion konnte nicht gespeichert werden. Bitte versuche es erneut.", en: "The photo was prepared, but the reflection record could not be saved. Please try again.", fr: "La photo a été préparée, mais la méditation n’a pas pu être enregistrée. Veuillez réessayer." },
  savedShareWarning: { ko: "사진 묵상은 저장됐지만 일부 나눔 설정을 반영하지 못했어요.", de: "Die Foto-Reflexion wurde gespeichert, aber einige Freigabeeinstellungen konnten nicht übernommen werden.", en: "The photo reflection was saved, but some sharing settings could not be applied.", fr: "La méditation photo a été enregistrée, mais certains réglages de partage n’ont pas pu être appliqués." },
  savedFollowupWarning: { ko: "사진 묵상은 안전하게 저장됐어요. 완료 상태를 다시 확인해주세요.", de: "Die Foto-Reflexion wurde sicher gespeichert. Bitte prüfe den Abschlussstatus erneut.", en: "The photo reflection was safely saved. Please check the completion status again.", fr: "La méditation photo a été enregistrée en toute sécurité. Vérifiez à nouveau son état de finalisation." },
  needPhoto: { ko: "사진을 먼저 선택해주세요.", de: "Bitte wähle zuerst ein Foto aus.", en: "Please choose a photo first.", fr: "Veuillez d’abord choisir une photo." },
  unsupportedPhoto: { ko: "지원되는 이미지 파일을 선택해주세요.", de: "Bitte wähle eine Bilddatei aus.", en: "Please choose an image file.", fr: "Veuillez choisir un fichier image." },
  photoTooLarge: { ko: "15MB 이하의 사진만 선택할 수 있어요.", de: "Bitte wähle ein Foto bis 15 MB aus.", en: "Please choose a photo up to 15 MB.", fr: "Veuillez choisir une photo de 15 Mo maximum." },
  compressedPhotoTooLarge: { ko: "사진을 2MB 이하로 줄이지 못했어요. 다른 사진을 선택해주세요.", de: "Das Foto konnte nicht auf unter 2 MB verkleinert werden. Bitte wähle ein anderes Foto.", en: "The photo could not be reduced below 2 MB. Please choose another photo.", fr: "La photo n’a pas pu être réduite à moins de 2 Mo. Veuillez en choisir une autre." },
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

function isPhotoPickerCancellation(error: unknown) {
  const value = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
  const code = String(value.code ?? "").toLowerCase();
  const message = String(value.message ?? error ?? "").toLowerCase();
  return code.includes("cancel") || message.includes("cancelled") || message.includes("canceled") || message.includes("user cancelled");
}

function getNativePhotoMimeType(format: string | undefined) {
  const normalized = String(format ?? "jpeg").toLowerCase();
  if (normalized === "png") return "image/png";
  if (normalized === "webp") return "image/webp";
  return "image/jpeg";
}

function base64ToPhotoFile(base64: string, mimeType: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return new File([bytes], `qt-photo.${extension}`, { type: mimeType, lastModified: Date.now() });
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "";
  if ("code" in error) return String((error as { code?: unknown }).code ?? "");
  if ("statusCode" in error) return String((error as { statusCode?: unknown }).statusCode ?? "");
  return "";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 280);
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").slice(0, 280);
  }
  return String(error ?? "").slice(0, 280);
}

function getPhotoPreparationNotice(error: unknown, lang: string) {
  if (!(error instanceof QTPhotoPreparationError)) return pc("photoProcessError", lang);
  if (error.code === "unsupported") return pc("unsupportedPhoto", lang);
  if (error.code === "input_too_large") return pc("photoTooLarge", lang);
  if (error.code === "decode_failed" || error.code === "invalid_dimensions") return pc("photoReadError", lang);
  if (error.code === "blank_or_black") return pc("photoBlankOrBlack", lang);
  if (error.code === "stored_too_large") return pc("compressedPhotoTooLarge", lang);
  return pc("photoProcessError", lang);
}

function getPhotoSaveNotice(stage: PhotoSaveStage, lang: string) {
  if (stage === "upload") return pc("uploadError", lang);
  if (stage === "record") return pc("recordError", lang);
  return pc("saveError", lang);
}

function PhotoReflectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = useLang();
  const bulkSelectionLabels = getSharePromptBulkSelectionLabels(lang);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveLockRef = useRef(false);

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
  const [preparedPhoto, setPreparedPhoto] = useState<PreparedQTPhoto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
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

  async function prepareSelectedPhoto(selected: File, source: "native" | "web") {
    setPreparingPhoto(true);
    try {
      const prepared = await prepareQTPhoto(selected);
      setPreparedPhoto(prepared);
      setPreviewUrl(URL.createObjectURL(prepared.blob));
    } catch (error) {
      console.error("photo reflection selection preparation failed", {
        source,
        targetDate,
        isCatchup,
        fileType: selected.type || null,
        fileSize: selected.size,
        code: getErrorCode(error),
        message: getErrorMessage(error),
        error,
      });
      showNotice(getPhotoPreparationNotice(error, lang));
    } finally {
      setPreparingPhoto(false);
    }
  }

  async function choosePhoto() {
    if (preparingPhoto || saving) return;

    if (Capacitor.isNativePlatform()) {
      setPreparingPhoto(true);
      try {
        // Normalize device-specific HEIC/HDR/color-space photos in the native
        // photo library before the bytes enter the WebView.
        const photo = await NativeCamera.getPhoto({
          source: CameraSource.Photos,
          resultType: CameraResultType.Base64,
          quality: 90,
          width: 1800,
          height: 1800,
          correctOrientation: true,
          allowEditing: false,
        });
        if (!photo.base64String) throw new QTPhotoPreparationError("decode_failed");
        const selected = base64ToPhotoFile(photo.base64String, getNativePhotoMimeType(photo.format));
        const prepared = await prepareQTPhoto(selected);
        setPreparedPhoto(prepared);
        setPreviewUrl(URL.createObjectURL(prepared.blob));
      } catch (error) {
        if (isPhotoPickerCancellation(error)) return;
        console.error("photo reflection native picker failed", {
          targetDate,
          isCatchup,
          code: getErrorCode(error),
          message: getErrorMessage(error),
          error,
        });
        showNotice(getPhotoPreparationNotice(error, lang));
      } finally {
        setPreparingPhoto(false);
      }
      return;
    }

    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!selected) return;
    void prepareSelectedPhoto(selected, "web");
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
    if (preparingPhoto) {
      showNotice(pc("preparingPhoto", lang));
      return;
    }
    if (!preparedPhoto) {
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
    if (preparingPhoto) {
      showNotice(pc("preparingPhoto", lang));
      return;
    }
    if (!preparedPhoto) {
      showNotice(pc("needPhoto", lang));
      return;
    }
    if (saveLockRef.current || saving) return;

    const photoToSave = preparedPhoto;
    saveLockRef.current = true;
    setSaving(true);
    const supabase = createClient();
    let stage: PhotoSaveStage = "auth";
    let uploadedPath: string | null = null;
    let insertedRecordId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      stage = "duplicate-check";
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

      const random = Math.random().toString(36).slice(2, 10);
      uploadedPath = `${user.id}/${targetDate}/${Date.now()}-${random}.${photoToSave.extension}`;

      stage = "upload";
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(uploadedPath, photoToSave.blob, {
          contentType: photoToSave.contentType,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      // Create the durable record privately first. A later group/partner metadata
      // error must never erase an uploaded reflection.
      stage = "record";
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
          visibility: "private",
          is_draft: false,
        })
        .select("id,photo_path,date")
        .single();
      if (insertError) throw insertError;

      const recordId = insertedRecord?.id;
      if (!recordId || insertedRecord.photo_path !== uploadedPath || insertedRecord.date !== targetDate) {
        throw new Error("Photo reflection verification failed");
      }
      insertedRecordId = String(recordId);

      const requestedVisibility = options.visibility ?? "private";
      const requestedPartnerRecipientIds = Array.isArray(options.partnerRecipientIds)
        ? options.partnerRecipientIds
        : [];
      let effectiveVisibility = requestedVisibility;
      let effectivePartnerRecipientIds = requestedPartnerRecipientIds;
      let sharingFailed = false;

      stage = "recipients";
      try {
        if (requestedPartnerRecipientIds.length > 0) {
          await replaceQtRecordRecipients(supabase, recordId, user.id, requestedPartnerRecipientIds);
        }
        if (requestedVisibility !== "private") {
          const { error: visibilityError } = await supabase
            .from("qt_records")
            .update({ visibility: requestedVisibility })
            .eq("id", recordId)
            .eq("user_id", user.id);
          if (visibilityError) throw visibilityError;
        }
      } catch (sharingError) {
        sharingFailed = true;
        effectiveVisibility = "private";
        effectivePartnerRecipientIds = [];
        console.warn("photo reflection sharing save failed; record kept private", {
          targetDate,
          isCatchup,
          code: getErrorCode(sharingError),
          message: getErrorMessage(sharingError),
        });

        const { error: recipientCleanupError } = await supabase
          .from("qt_record_recipients")
          .delete()
          .eq("qt_record_id", recordId)
          .eq("owner_id", user.id);
        if (recipientCleanupError) console.warn("photo reflection recipient cleanup failed", recipientCleanupError);

        const { error: privateFallbackError } = await supabase
          .from("qt_records")
          .update({ visibility: "private" })
          .eq("id", recordId)
          .eq("user_id", user.id);
        if (privateFallbackError) console.warn("photo reflection private fallback failed", privateFallbackError);
      }

      if (targetDate === today) {
        stage = "progress";
        try {
          await recordTodayPhotoProgress(supabase, user.id);
        } catch (progressError) {
          console.warn("photo reflection progress failed; record preserved", progressError);
          showNotice(pc("progressError", lang));
          return;
        }

        try {
          await markBibleReflectionCompletedForNotifications(today, lang);
        } catch (notificationError) {
          console.warn("photo reflection notification completion update failed", notificationError);
        }

        stage = "notifications";
        try {
          await createBibleReflectionShareNotificationsBestEffort({
            qtRecordId: recordId,
            visibility: effectiveVisibility,
            partnerRecipientIds: effectivePartnerRecipientIds,
          });
        } catch (notificationError) {
          console.warn("photo reflection share notification creation failed", notificationError);
        }

        setShowShareModal(false);
        if (sharingFailed) {
          showNotice(pc("savedShareWarning", lang));
          window.setTimeout(() => router.push("/qt/complete"), 1400);
        } else {
          router.push("/qt/complete");
        }
        return;
      }

      stage = "notifications";
      try {
        await createBibleReflectionShareNotificationsBestEffort({
          qtRecordId: recordId,
          visibility: effectiveVisibility,
          partnerRecipientIds: effectivePartnerRecipientIds,
        });
      } catch (notificationError) {
        console.warn("past photo reflection share notification creation failed", notificationError);
      }

      setShowShareModal(false);
      if (sharingFailed) {
        showNotice(pc("savedShareWarning", lang));
        window.setTimeout(() => router.push(`/qt/record?id=${recordId}`), 1400);
      } else {
        router.push(`/qt/record?id=${recordId}`);
      }
    } catch (error) {
      console.error("photo reflection save failed", {
        stage,
        targetDate,
        isCatchup,
        preparedPhoto: {
          contentType: photoToSave.contentType,
          size: photoToSave.blob.size,
          width: photoToSave.width,
          height: photoToSave.height,
          originalSize: photoToSave.originalSize,
          wasTransformed: photoToSave.wasTransformed,
        },
        code: getErrorCode(error),
        message: getErrorMessage(error),
        error,
      });

      // Remove only an unreferenced upload. Once the core row exists, later
      // optional sharing/progress/notification failures must not delete it.
      if (!insertedRecordId && uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from(PHOTO_BUCKET).remove([uploadedPath]);
        if (cleanupError) console.warn("photo reflection upload cleanup failed", cleanupError);
      }

      const errorCode = getErrorCode(error);
      if (errorCode === "23505") {
        setShowShareModal(false);
        showNotice(pc("alreadyDone", lang));
        router.push("/qt");
      } else if (insertedRecordId) {
        setShowShareModal(false);
        showNotice(pc("savedFollowupWarning", lang));
        window.setTimeout(() => {
          router.push(targetDate === today ? "/qt/complete" : `/qt/record?id=${insertedRecordId}`);
        }, 1400);
      } else {
        showNotice(getPhotoSaveNotice(stage, lang));
      }
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  }

  const chapterOptions = Array.from({ length: maxChapter }, (_, i) => i + 1);

  return (
    <div className="roots-qt-phase2a roots-qt-phase2h" style={{ minHeight: "100vh", background: "var(--qt-page-surface)", paddingBottom: 40 }}>
      {notice && (
        <div className="roots-elevation-toast" style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 240, background: "var(--qt-toast-surface)", color: "var(--text)", border: "1px solid var(--qt-toast-border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, maxWidth: 340, width: "calc(100% - 40px)", textAlign: "center" }}>
          {notice}
        </div>
      )}

      <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="roots-elevation-card-sage" style={{ width: 42, height: 42, borderRadius: 16, background: "var(--qt-sage-surface)", color: "var(--qt-sage-text)", border: "1px solid var(--qt-sage-border-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ImagePlus size={23} />
          </div>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 850, color: "var(--text)", marginBottom: 3 }}>{pc("title", lang)}</h1>
            <p style={{ fontSize: 12, color: "var(--text-muted-readable)", lineHeight: 1.5 }}>{pc("sub", lang)}</p>
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
          <p style={{ fontSize: 11, color: "var(--text-muted-readable)", lineHeight: 1.55 }}>{isCatchup ? pc("catchupOnly", lang) : pc("todayOnly", lang)}</p>
        </div>

        {source === "custom" && (
          <div className="card">
            <p style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", marginBottom: 12 }}>{pc("customPassage", lang)}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("translation", lang)}</span>
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
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("sermonTitle", lang)}</span>
                  <CursorStableInput className="input-field" value={sermonTitle} onValueChange={setSermonTitle} placeholder={pc("sermonTitlePlaceholder", lang)} />
                </label>
              )}
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("book", lang)}</span>
                <select className="input-field" value={book} onChange={e => setBook(e.target.value)}>
                  {BOOKS.map(item => <option key={item} value={item}>{translateBibleRef(item, bibleDisplayLang)}</option>)}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("chapter", lang)}</span>
                  <select className="input-field" value={chapter} onChange={e => { const next = Number(e.target.value); setChapter(next); setEndChapter(prev => Math.max(prev, next)); }}>
                    {chapterOptions.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("verse", lang)}</span>
                  <select className="input-field" value={Math.min(startVerse, maxStartVerses)} onChange={e => { const next = Number(e.target.value); setStartVerse(next); if (safeEndChapter === chapter && next > endVerse) setEndVerse(next); }}>
                    {Array.from({ length: maxStartVerses }, (_, i) => i + 1).map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("endChapter", lang)}</span>
                  <select className="input-field" value={safeEndChapter} onChange={e => { const next = Number(e.target.value); setEndChapter(next); if (next === chapter && startVerse > endVerse) setEndVerse(startVerse); }}>
                    {chapterOptions.filter(item => item >= chapter).map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("endVerse", lang)}</span>
                  <select className="input-field" value={safeEndChapter === chapter ? Math.max(endVerse, startVerse) : Math.min(endVerse, maxEndVerses)} onChange={e => setEndVerse(Number(e.target.value))}>
                    {Array.from({ length: maxEndVerses }, (_, i) => i + 1).filter(v => safeEndChapter !== chapter || v >= startVerse).map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
              <button type="button" onClick={addCurrentPassage} className="btn-outline" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Plus size={15} /> {pc("addPassage", lang)}
              </button>
              <p style={{ fontSize: 11, color: "var(--text-muted-readable)", lineHeight: 1.45, marginTop: -4 }}>
                {pc("addPassageHelp", lang)}
              </p>
              {extraRefs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {extraRefs.map(ref => (
                    <div key={ref} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--qt-sage-surface)", borderRadius: 10, padding: "8px 10px", border: "1px solid var(--qt-sage-border-soft)" }}>
                      <span style={{ fontSize: 12, color: "var(--qt-sage-text)", fontWeight: 700 }}>{translateBibleRef(ref, bibleDisplayLang)}</span>
                      <button type="button" onClick={() => removeExtraRef(ref)} style={{ border: "none", background: "none", color: "var(--text3)", cursor: "pointer" }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="card" style={{ textAlign: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {preparingPhoto ? (
            <div style={{ minHeight: 170, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--qt-sage-text)" }}>
              <Loader2 size={30} className="spin" />
              <span style={{ fontSize: 13, fontWeight: 800 }}>{pc("preparingPhoto", lang)}</span>
            </div>
          ) : previewUrl ? (
            <div>
              <img src={previewUrl} alt="preview" style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 18, border: "1px solid var(--qt-card-border)", background: "var(--qt-field-surface)", marginBottom: 12 }} />
              <button type="button" onClick={() => void choosePhoto()} disabled={saving} className="btn-outline" style={{ width: "100%" }}>{pc("changePhoto", lang)}</button>
            </div>
          ) : (
            <button type="button" className="qt-photo-upload" onClick={() => void choosePhoto()} disabled={saving} style={{ width: "100%", minHeight: 170, borderRadius: 20, border: "1.5px dashed var(--qt-sage-border)", background: "var(--qt-sage-surface)", color: "var(--qt-sage-text)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", fontWeight: 800 }}>
              <UploadCloud size={34} />
              {pc("choosePhoto", lang)}
            </button>
          )}
        </div>

        <label className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted-readable)" }}>{pc("memoLabel", lang)}</span>
          <CursorStableTextarea value={caption} onValueChange={setCaption} placeholder={pc("memoPlaceholder", lang)} rows={4} className="input-field" style={{ resize: "vertical", lineHeight: 1.6 }} />
        </label>

        <button type="button" onClick={openSharePrompt} disabled={saving || preparingPhoto || !preparedPhoto} className="btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
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
          selectAllLabel={bulkSelectionLabels.selectAll}
          deselectAllLabel={bulkSelectionLabels.deselectAll}
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
          onChangeTargets={setShareTargets}
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
