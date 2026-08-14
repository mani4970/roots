"use client";

import { Suspense, useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Camera as NativeCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera as CameraIcon, ChevronLeft, ImagePlus, Images, Loader2, RotateCcw, X, Check, UploadCloud, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getPendingAwardedBadgesKey, recordBibleReflectionProgress } from "@/lib/reflectionProgress";
import { markBibleReflectionCompletedForNotifications } from "@/lib/localNotifications";
import { storageGet, storageRemove, storageSet } from "@/lib/clientStorage";
import { getLocalDateString, parseLocalDateString } from "@/lib/date";
import { useLang } from "@/lib/useLang";
import { t, type Lang } from "@/lib/i18n";
import { translateBibleRef } from "@/lib/bibleBooks";
import { BIBLE_CHAPTERS, NT_BOOKS, OT_BOOKS, TRANSLATIONS, TRANSLATION_LANG } from "@/lib/bibleData";
import { normalizeSelectableTranslationId } from "@/lib/translationDefaults";
import CursorStableInput from "@/components/CursorStableInput";
import CursorStableTextarea from "@/components/CursorStableTextarea";
import SharePromptModal, { type ShareTargetGroup, type ShareTargetPartner } from "@/components/SharePromptModal";
import { getSharePromptBulkSelectionLabels, loadSharePromptOptions } from "@/lib/sharePromptOptions";
import { createBibleReflectionShareNotificationsBestEffort } from "@/lib/notifications/create";
import { recordCompanionChallengeReflectionCompletedBestEffort } from "@/lib/companionChallenges";
import { prepareQTPhoto, QTPhotoPreparationError, type PreparedQTPhoto } from "@/lib/qtPhotoProcessing";
import { removeQTPhotoBestEffort, uploadQTPhotoDurably } from "@/lib/qtPhotoStorage";
import {
  createQTPhotoAttemptId,
  flushQTPhotoDiagnostics,
  getQTPhotoDiagnosticError,
  recordQTPhotoDiagnostic,
  type QTPhotoSource,
} from "@/lib/qtPhotoDiagnostics";
import {
  findCompletedQTRecordForDate,
  getQTPhotoAuthenticatedUser,
  insertQTPhotoRecordDurably,
  loadOwnedQTPhotoRecord,
  QTPhotoRecordError,
  type QTPhotoRecordPatch,
  updateQTPhotoRecordDurably,
} from "@/lib/qtPhotoRecord";

type CompletePhotoOptions = {
  visibility?: string;
  partnerRecipientIds?: string[];
};

type PhotoSaveStage =
  | "photo-process"
  | "auth"
  | "duplicate-check"
  | "upload"
  | "upload-verify"
  | "record"
  | "edit-load"
  | "edit-record"
  | "recipients"
  | "progress"
  | "notifications"
  | "complete";


type ParsedPhotoReference = {
  book: string;
  chapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
};

const PHOTO_BUCKET = "qt-photos";
const PENDING_NATIVE_SOURCE_KEY = "roots_qt_photo_pending_native_source";
const OPTIONAL_STAGE_TIMEOUT_MS = 25_000;
const NOTIFICATION_STAGE_TIMEOUT_MS = 12_000;
const BOOKS = [...OT_BOOKS, ...NT_BOOKS];

type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    platform?: string;
    mobile?: boolean;
  };
};

function looksLikeAndroidWebRuntime() {
  if (typeof navigator === "undefined") return false;

  const nav = navigator as NavigatorWithUAData;
  const userAgent = nav.userAgent || "";
  const platform = nav.platform || "";
  const uaPlatform = nav.userAgentData?.platform || "";
  const mobileHint =
    nav.userAgentData?.mobile === true ||
    /Mobile|;\s*wv\)|GSA\//i.test(userAgent) ||
    nav.maxTouchPoints > 0;
  const iosHint =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Mac/i.test(platform) && nav.maxTouchPoints > 1);

  return (
    /Android/i.test(userAgent) ||
    /Android/i.test(uaPlatform) ||
    /Android/i.test(platform) ||
    (!iosHint && /GSA\//i.test(userAgent) && mobileHint) ||
    (!iosHint && /Linux/i.test(platform) && mobileHint)
  );
}

function isSynchronousRootsNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

function withPhotoStageTimeout<T>(
  operation: PromiseLike<T>,
  label: string,
  timeoutMs = OPTIONAL_STAGE_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    Promise.resolve(operation).then(
      value => {
        window.clearTimeout(timer);
        resolve(value);
      },
      error => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const PHOTO_COPY = {
  title: { ko: "사진으로 묵상 기록하기", de: "Reflexion als Foto speichern", en: "Record reflection with a photo", fr: "Enregistrer une méditation en photo" },
  sub: { ko: "책이나 노트에 묵상한 내용을 사진으로 남겨요.", de: "Speichere deine handschriftliche Reflexion als Foto.", en: "Save a photo of your reflection from a book or notebook.", fr: "Gardez une photo de votre méditation écrite dans un livre ou un carnet." },
  editTitle: { ko: "사진 묵상 수정하기", de: "Foto-Reflexion bearbeiten", en: "Edit photo reflection", fr: "Modifier la méditation photo" },
  editSub: { ko: "사진과 기록 내용을 안전하게 수정할 수 있어요.", de: "Du kannst das Foto und den Eintrag sicher bearbeiten.", en: "Safely update the photo and reflection details.", fr: "Modifiez en toute sécurité la photo et les détails de la méditation." },
  passage: { ko: "묵상 본문", de: "Bibelstelle", en: "Passage", fr: "Passage" },
  todayOnly: { ko: "사진 묵상은 오늘 날짜의 말씀 묵상으로 저장됩니다.", de: "Die Foto-Reflexion wird für heute gespeichert.", en: "Photo reflections are saved as today's Bible reflection.", fr: "La méditation photo est enregistrée pour aujourd’hui." },
  catchupOnly: { ko: "지난 말씀 묵상 기록으로 저장됩니다. 말씀동행일은 증가하지 않아요.", de: "Wird als nachgetragene Reflexion gespeichert. Dein Fortschritt wird nicht erhöht.", en: "This will be saved as a past Bible reflection. Word Walk progress will not increase.", fr: "Cette méditation sera enregistrée pour une date passée. La progression n’augmentera pas." },
  choosePhoto: { ko: "사진 추가하기", de: "Foto hinzufügen", en: "Add photo", fr: "Ajouter une photo" },
  androidWebAppOnly: { ko: "Android 웹에서는 사진 묵상 기록을 지원하지 않아요. Christian Roots 앱에서 이용해주세요.", de: "Foto-Reflexionen werden im Android-Webbrowser nicht unterstützt. Bitte nutze die Christian Roots App.", en: "Photo reflections aren't supported in Android web browsers. Please use the Christian Roots app.", fr: "Les méditations photo ne sont pas prises en charge dans les navigateurs Android. Utilisez l’application Christian Roots." },
  uploadNewPhoto: { ko: "새 사진 올리기", de: "Neues Foto hochladen", en: "Upload a new photo", fr: "Importer une nouvelle photo" },
  changePhoto: { ko: "사진 바꾸기", de: "Foto ändern", en: "Change photo", fr: "Changer la photo" },
  sourceTitle: { ko: "사진을 어떻게 추가할까요?", de: "Wie möchtest du das Foto hinzufügen?", en: "How would you like to add the photo?", fr: "Comment souhaitez-vous ajouter la photo ?" },
  takePhoto: { ko: "사진 촬영", de: "Foto aufnehmen", en: "Take photo", fr: "Prendre une photo" },
  chooseGallery: { ko: "갤러리에서 선택", de: "Aus Galerie wählen", en: "Choose from gallery", fr: "Choisir dans la galerie" },
  cancel: { ko: "취소", de: "Abbrechen", en: "Cancel", fr: "Annuler" },
  removePhoto: { ko: "사진 제거", de: "Foto entfernen", en: "Remove photo", fr: "Supprimer la photo" },
  restorePhoto: { ko: "기존 사진 다시 사용", de: "Vorheriges Foto wiederverwenden", en: "Use previous photo again", fr: "Réutiliser la photo précédente" },
  memoLabel: { ko: "메모 또는 제목", de: "Notiz oder Titel", en: "Note or title", fr: "Note ou titre" },
  memoPlaceholder: { ko: "선택사항이에요. 오늘 받은 은혜를 짧게 적어도 좋아요.", de: "Optional. Du kannst kurz notieren, was du heute empfangen hast.", en: "Optional. You can briefly note the grace you received today.", fr: "Facultatif. Vous pouvez noter brièvement la grâce reçue aujourd’hui." },
  shareAndSave: { ko: "나눔 설정하고 저장하기", de: "Teilen einstellen und speichern", en: "Set sharing and save", fr: "Définir le partage et enregistrer" },
  editSave: { ko: "수정 내용 저장하기", de: "Änderungen speichern", en: "Save changes", fr: "Enregistrer les modifications" },
  editLoading: { ko: "사진 묵상 기록을 불러오고 있어요…", de: "Die Foto-Reflexion wird geladen…", en: "Loading the photo reflection…", fr: "Chargement de la méditation photo…" },
  editLoadError: { ko: "수정할 사진 묵상 기록을 불러오지 못했어요.", de: "Die Foto-Reflexion konnte nicht geladen werden.", en: "Could not load the photo reflection to edit.", fr: "Impossible de charger la méditation photo à modifier." },
  editSaveError: { ko: "사진 묵상 수정 내용을 저장하지 못했어요. 기존 기록은 그대로 유지됩니다.", de: "Die Änderungen konnten nicht gespeichert werden. Der bisherige Eintrag bleibt erhalten.", en: "Could not save the changes. The existing record remains unchanged.", fr: "Impossible d’enregistrer les modifications. L’entrée existante reste inchangée." },
  editSaved: { ko: "사진 묵상 수정 내용을 저장했어요.", de: "Die Änderungen wurden gespeichert.", en: "Photo reflection changes saved.", fr: "Les modifications ont été enregistrées." },
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
  authError: { ko: "로그인 상태를 확인하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해주세요.", de: "Der Anmeldestatus konnte nicht geprüft werden. Prüfe die Internetverbindung und versuche es erneut.", en: "Could not verify your sign-in. Check your connection and try again.", fr: "Impossible de vérifier votre connexion. Vérifiez Internet et réessayez." },
  preflightError: { ko: "기존 묵상 기록을 확인하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해주세요.", de: "Vorhandene Einträge konnten nicht geprüft werden. Prüfe die Internetverbindung und versuche es erneut.", en: "Could not check your existing reflection. Check your connection and try again.", fr: "Impossible de vérifier votre méditation existante. Vérifiez Internet et réessayez." },
  cameraPermissionError: { ko: "카메라를 사용할 수 없어요. 기기 설정에서 Roots의 카메라 권한을 허용해주세요.", de: "Die Kamera ist nicht verfügbar. Erlaube Roots den Kamerazugriff in den Geräteeinstellungen.", en: "The camera is unavailable. Allow camera access for Roots in your device settings.", fr: "L’appareil photo n’est pas disponible. Autorisez l’accès à l’appareil photo pour Roots dans les réglages." },
  galleryPermissionError: { ko: "사진 보관함을 사용할 수 없어요. 기기 설정에서 Roots의 사진 접근 권한을 허용해주세요.", de: "Die Fotomediathek ist nicht verfügbar. Erlaube Roots den Fotozugriff in den Geräteeinstellungen.", en: "The photo library is unavailable. Allow photo access for Roots in your device settings.", fr: "La photothèque n’est pas disponible. Autorisez l’accès aux photos pour Roots dans les réglages." },
  uploadError: { ko: "사진 업로드에 실패했어요. 인터넷 연결을 확인한 뒤 다시 시도해주세요. 선택한 사진은 그대로 유지됩니다.", de: "Das Hochladen ist fehlgeschlagen. Prüfe die Internetverbindung und versuche es erneut. Das ausgewählte Foto bleibt erhalten.", en: "The photo upload failed. Check your connection and try again. The selected photo is still here.", fr: "Le téléversement a échoué. Vérifiez Internet et réessayez. La photo sélectionnée est conservée." },
  uploadVerifyError: { ko: "사진 업로드를 확인하지 못했어요. 잠시 후 다시 시도해주세요. 선택한 사진은 그대로 유지됩니다.", de: "Der Foto-Upload konnte nicht bestätigt werden. Versuche es später erneut. Das Foto bleibt erhalten.", en: "Could not verify the photo upload. Try again shortly. The selected photo is still here.", fr: "Impossible de vérifier le téléversement. Réessayez bientôt. La photo sélectionnée est conservée." },
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

function parseSimplePhotoReference(raw: string): ParsedPhotoReference | null {
  const match = raw.trim().match(/^(.+?)\s+(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
  if (!match) return null;
  const parsed = {
    book: match[1].trim(),
    chapter: Number(match[2]),
    startVerse: Number(match[3]),
    endChapter: match[4] ? Number(match[4]) : Number(match[2]),
    endVerse: match[5] ? Number(match[5]) : Number(match[3]),
  };
  if (!BOOKS.includes(parsed.book)) return null;
  if (![parsed.chapter, parsed.startVerse, parsed.endChapter, parsed.endVerse].every(Number.isFinite)) return null;
  return parsed;
}

function parseStoredPhotoBibleRef(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  let title = "";
  let referenceText = value;
  let sunday = value.startsWith("설교:");

  if (sunday) {
    const body = value.replace(/^설교:\s*/, "").trim();
    const parenthesisIndex = body.lastIndexOf(" (");
    const parenthesized = parenthesisIndex >= 0 && body.endsWith(")")
      ? body.slice(parenthesisIndex + 2, -1).trim()
      : "";
    if (parenthesized && /\d+:\d+/.test(parenthesized)) {
      title = body.slice(0, parenthesisIndex).trim();
      referenceText = parenthesized;
    } else {
      title = body;
      referenceText = "";
    }
  }

  const refs = referenceText
    ? referenceText.split(/\s*,\s*(?=[^,]+?\s+\d+:\d+)/).filter(Boolean)
    : [];
  const parsedRefs = refs.map(parseSimplePhotoReference).filter((item): item is ParsedPhotoReference => Boolean(item));
  return { sunday, title, refs, parsedRefs };
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

function isPhotoPermissionError(error: unknown) {
  const value = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
  const text = `${String(value.code ?? "")} ${String(value.message ?? error ?? "")}`.toLowerCase();
  return /permission|denied|not authorized|unauthorized|restricted/.test(text);
}

function isSupabaseAuthLikeError(error: unknown) {
  const code = getErrorCode(error).toLowerCase();
  const message = getErrorMessage(error).toLowerCase();
  return code === "401" || code === "403" || /jwt|token|not authenticated|auth session missing|refresh_token/.test(`${code} ${message}`);
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

function restoreIOSViewportAfterPhotoPicker(scrollY: number) {
  if (!(Capacitor.getPlatform() === "ios" && Capacitor.isNativePlatform())) return;

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) activeElement.blur();

  // iOS의 네이티브 카메라/사진 보관함이 닫힌 뒤 status bar와 safe-area가
  // 다시 overlay 상태처럼 계산되는 경우가 있어 공통 네이티브 viewport 설정을
  // 재적용하고, 사진 선택 전 페이지 위치를 여러 프레임에 걸쳐 복원합니다.
  const restore = () => {
    window.dispatchEvent(new Event("roots:native-viewport-refresh"));
    window.dispatchEvent(new Event("resize"));
    document.documentElement.style.setProperty("--roots-viewport-refresh", String(Date.now()));
    window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
  };

  window.setTimeout(restore, 80);
  window.setTimeout(restore, 260);
  window.setTimeout(restore, 650);
}

function storePendingNativePhotoChoice(source: QTPhotoSource, attemptId: string) {
  storageSet(PENDING_NATIVE_SOURCE_KEY, JSON.stringify({ source, attemptId }));
}

function readPendingNativePhotoChoice() {
  const raw = storageGet(PENDING_NATIVE_SOURCE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { source?: unknown; attemptId?: unknown };
    const source = parsed.source === "camera" || parsed.source === "gallery"
      ? parsed.source
      : "unknown";
    const attemptId = typeof parsed.attemptId === "string" && parsed.attemptId
      ? parsed.attemptId
      : createQTPhotoAttemptId();
    return { source: source as QTPhotoSource, attemptId };
  } catch {
    return { source: "unknown" as QTPhotoSource, attemptId: createQTPhotoAttemptId() };
  }
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
  if (stage === "auth") return pc("authError", lang);
  if (stage === "duplicate-check") return pc("preflightError", lang);
  if (stage === "upload") return pc("uploadError", lang);
  if (stage === "upload-verify") return pc("uploadVerifyError", lang);
  if (stage === "record" || stage === "edit-record") return pc("recordError", lang);
  return pc("saveError", lang);
}

function PhotoReflectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = useLang();
  const bulkSelectionLabels = getSharePromptBulkSelectionLabels(lang);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const saveLockRef = useRef(false);
  const skipBookResetRef = useRef<string | null>(null);
  const photoAttemptIdRef = useRef(createQTPhotoAttemptId());
  const pendingPhotoSourceRef = useRef<QTPhotoSource>("unknown");

  const editId = searchParams.get("editId");
  const isEditMode = Boolean(editId);
  const today = getLocalDateString();
  const requestedDate = searchParams.get("date") || today;
  const initialTargetDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : today;
  const [editTargetDate, setEditTargetDate] = useState<string | null>(null);
  const targetDate = isEditMode && editTargetDate ? editTargetDate : initialTargetDate;
  const isCatchup = targetDate !== today && (isEditMode || searchParams.get("catchup") === "true");
  const baseSundayContext = searchParams.get("sundayContext") === "true" || parseLocalDateString(targetDate).getDay() === 0;
  const [editSundayContext, setEditSundayContext] = useState<boolean | null>(null);
  const sundayContext = editSundayContext ?? baseSundayContext;
  const source = isEditMode ? "custom" : searchParams.get("source") === "scheduled" ? "scheduled" : "custom";
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
    const requested = searchParams.get("translation");
    if (requested) return normalizeSelectableTranslationId(requested, lang);
    if (typeof window === "undefined") return normalizeSelectableTranslationId(null, lang);
    return normalizeSelectableTranslationId(window.localStorage.getItem("roots_default_translation"), lang);
  });
  const [sermonTitle, setSermonTitle] = useState("");
  const [extraRefs, setExtraRefs] = useState<string[]>([]);
  const [preparedPhoto, setPreparedPhoto] = useState<PreparedQTPhoto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoSource, setPhotoSource] = useState<QTPhotoSource>("unknown");
  const [androidWebPhotoUnsupported, setAndroidWebPhotoUnsupported] = useState(false);
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [caption, setCaption] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTargets, setShareTargets] = useState<string[]>([]);
  const [groups, setGroups] = useState<ShareTargetGroup[]>([]);
  const [partners, setPartners] = useState<ShareTargetPartner[]>([]);
  const [loadingShareOptions, setLoadingShareOptions] = useState(false);
  const [editLoading, setEditLoading] = useState(isEditMode);
  const [editLoadError, setEditLoadError] = useState(false);
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [existingPhotoRemoved, setExistingPhotoRemoved] = useState(false);
  const [originalBibleRef, setOriginalBibleRef] = useState<string | null>(null);
  const [passageTouched, setPassageTouched] = useState(false);

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
  const effectiveBibleRef = isEditMode && !passageTouched && originalBibleRef
    ? originalBibleRef
    : bibleRef;

  useEffect(() => {
    if (skipBookResetRef.current === book) {
      skipBookResetRef.current = null;
      return;
    }
    skipBookResetRef.current = null;
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
    window.setTimeout(() => setNotice(null), 3200);
  }

  useEffect(() => {
    void flushQTPhotoDiagnostics();
    const flushWhenOnline = () => { void flushQTPhotoDiagnostics(); };
    window.addEventListener("online", flushWhenOnline);
    return () => window.removeEventListener("online", flushWhenOnline);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const androidLikeRuntime = looksLikeAndroidWebRuntime();
    if (!androidLikeRuntime) {
      setAndroidWebPhotoUnsupported(false);
      return () => {
        cancelled = true;
      };
    }

    // Web browsers on Android (including Google app in-app browsing) must stay
    // blocked. Only the actual installed Roots Android container is allowed.
    if (!isSynchronousRootsNativeAndroid()) {
      setAndroidWebPhotoUnsupported(true);
      return () => {
        cancelled = true;
      };
    }

    void CapacitorApp.getInfo()
      .then(info => {
        if (cancelled) return;
        setAndroidWebPhotoUnsupported(info.id !== "com.rootspuce.app");
      })
      .catch(() => {
        if (cancelled) return;
        setAndroidWebPhotoUnsupported(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    let disposed = false;

    void CapacitorApp.addListener("appRestoredResult", result => {
      const restored = result as unknown as {
        pluginId?: string;
        methodName?: string;
        success?: boolean;
        data?: { base64String?: string; format?: string };
        error?: { message?: string } | string;
      };
      if (restored.pluginId !== "Camera") return;

      const pending = readPendingNativePhotoChoice();
      storageRemove(PENDING_NATIVE_SOURCE_KEY);
      if (pending) {
        pendingPhotoSourceRef.current = pending.source;
        photoAttemptIdRef.current = pending.attemptId;
      }
      const sourceChoice = pending?.source === "camera" || pending?.source === "gallery"
        ? pending.source
        : "gallery";

      if (!restored.success || !restored.data?.base64String) {
        if (!isPhotoPickerCancellation(restored.error)) {
          recordQTPhotoDiagnostic({
            attemptId: photoAttemptIdRef.current,
            targetDate,
            operation: isEditMode ? "edit" : "create",
            stage: "photo-process",
            status: "failed",
            photoSource: sourceChoice,
            ...getQTPhotoDiagnosticError(restored.error),
          });
          showNotice(pc("photoReadError", lang));
        }
        return;
      }

      const selected = base64ToPhotoFile(
        restored.data.base64String,
        getNativePhotoMimeType(restored.data.format),
      );
      void prepareSelectedPhoto(selected, sourceChoice);
    }).then(handle => {
      if (disposed) void handle.remove();
      else listenerHandle = handle;
    });

    return () => {
      disposed = true;
      if (listenerHandle) void listenerHandle.remove();
    };
  // The listener needs current edit/date/language context after Android restores the app.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, lang, targetDate]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isEditMode || !editId) return;
    const editRecordId = editId;
    let cancelled = false;
    const attemptId = createQTPhotoAttemptId();
    photoAttemptIdRef.current = attemptId;

    async function loadEditRecord() {
      setEditLoading(true);
      setEditLoadError(false);
      recordQTPhotoDiagnostic({
        attemptId,
        targetDate,
        operation: "edit",
        stage: "edit-load",
        status: "started",
        photoSource: "existing",
      });

      try {
        const supabase = createClient();
        const user = await getQTPhotoAuthenticatedUser(supabase);
        const record = await loadOwnedQTPhotoRecord(supabase, editRecordId, user.id);
        if (cancelled) return;

        setEditTargetDate(record.date);
        setOriginalBibleRef(record.bible_ref ?? "");
        setPassageTouched(false);
        const parsedStoredRef = parseStoredPhotoBibleRef(record.bible_ref);
        const isSundayRecord = record.qt_mode === "sunday" || parsedStoredRef.sunday;
        setEditSundayContext(isSundayRecord);
        setCaption(String(record.photo_caption ?? record.meditation ?? ""));
        setExistingPhotoPath(record.photo_path ?? null);
        setExistingPhotoRemoved(false);
        setPhotoSource("existing");

        const versionId = Number(record.bible_version ?? "");
        if (Number.isFinite(versionId) && versionId > 0) setSelectedTranslation(versionId);

        if (isSundayRecord) setSermonTitle(parsedStoredRef.title);
        if (parsedStoredRef.refs.length > 0) {
          // A single stored reference is represented by the active selectors so
          // changing it works naturally. Multiple references stay in the list
          // and can be removed/re-added individually.
          setExtraRefs(parsedStoredRef.refs.length > 1 ? parsedStoredRef.refs : []);
          const first = parsedStoredRef.parsedRefs[0];
          if (first && BIBLE_CHAPTERS[first.book]) {
            skipBookResetRef.current = first.book;
            setBook(first.book);
            setChapter(first.chapter);
            setStartVerse(first.startVerse);
            setEndChapter(first.endChapter);
            setEndVerse(first.endVerse);
          }
        }

        if (record.photo_path) {
          const { data: signed, error: signedError } = await withPhotoStageTimeout(
            supabase.storage
              .from(PHOTO_BUCKET)
              .createSignedUrl(record.photo_path, 60 * 60) as unknown as PromiseLike<{
                data: { signedUrl?: string } | null;
                error: unknown;
              }>,
            "photo edit signed URL",
          );
          if (signedError) throw signedError;
          if (!cancelled) setExistingPhotoUrl(signed?.signedUrl ?? null);
        } else {
          setExistingPhotoUrl(record.photo_url ?? null);
        }

        recordQTPhotoDiagnostic({
          attemptId,
          targetDate: record.date,
          operation: "edit",
          stage: "edit-load",
          status: "ok",
          photoSource: "existing",
          storagePath: record.photo_path,
          qtRecordId: record.id,
        });
      } catch (error) {
        if (cancelled) return;
        const diagnostic = getQTPhotoDiagnosticError(error);
        recordQTPhotoDiagnostic({
          attemptId,
          targetDate,
          operation: "edit",
          stage: "edit-load",
          status: "failed",
          photoSource: "existing",
          ...diagnostic,
        });
        console.error("photo reflection edit load failed", error);
        setEditLoadError(true);
        showNotice(pc("editLoadError", lang));
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    }

    void loadEditRecord();
    return () => { cancelled = true; };
  // The edit record id is immutable for the lifetime of this page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, isEditMode]);

  async function prepareSelectedPhoto(selected: File, sourceChoice: QTPhotoSource) {
    const attemptId = photoAttemptIdRef.current || createQTPhotoAttemptId();
    photoAttemptIdRef.current = attemptId;
    setPreparingPhoto(true);
    recordQTPhotoDiagnostic({
      attemptId,
      targetDate,
      operation: isEditMode ? "edit" : "create",
      stage: "photo-process",
      status: "started",
      photoSource: sourceChoice,
      mimeType: selected.type || null,
      fileSize: selected.size,
    });

    try {
      const prepared = await prepareQTPhoto(selected, {
        validateDirectPixels: Capacitor.isNativePlatform(),
      });
      setPreparedPhoto(prepared);
      setPhotoSource(sourceChoice);
      setExistingPhotoRemoved(isEditMode);
      setPreviewUrl(URL.createObjectURL(prepared.blob));
      recordQTPhotoDiagnostic({
        attemptId,
        targetDate,
        operation: isEditMode ? "edit" : "create",
        stage: "photo-process",
        status: "ok",
        photoSource: sourceChoice,
        mimeType: prepared.sourceMimeType,
        fileSize: prepared.blob.size,
        width: prepared.width,
        height: prepared.height,
        wasTransformed: prepared.wasTransformed,
        metadata: { originalSize: prepared.originalSize },
      });
    } catch (error) {
      const diagnostic = getQTPhotoDiagnosticError(error);
      recordQTPhotoDiagnostic({
        attemptId,
        targetDate,
        operation: isEditMode ? "edit" : "create",
        stage: "photo-process",
        status: "failed",
        photoSource: sourceChoice,
        mimeType: selected.type || null,
        fileSize: selected.size,
        ...diagnostic,
      });
      console.error("photo reflection selection preparation failed", {
        source: sourceChoice,
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

  function choosePhoto() {
    if (preparingPhoto || saving) return;
    if (androidWebPhotoUnsupported) {
      showNotice(pc("androidWebAppOnly", lang));
      return;
    }
    setShowPhotoSourceModal(true);
  }

  async function choosePhotoSource(sourceChoice: "camera" | "gallery") {
    if (preparingPhoto || saving) return;
    if (androidWebPhotoUnsupported) {
      setShowPhotoSourceModal(false);
      showNotice(pc("androidWebAppOnly", lang));
      return;
    }
    const scrollYBeforePicker = window.scrollY;
    setShowPhotoSourceModal(false);
    pendingPhotoSourceRef.current = sourceChoice;
    photoAttemptIdRef.current = createQTPhotoAttemptId();

    if (Capacitor.isNativePlatform()) {
      setPreparingPhoto(true);
      storePendingNativePhotoChoice(sourceChoice, photoAttemptIdRef.current);
      try {
        const photo = await NativeCamera.getPhoto({
          source: sourceChoice === "camera" ? CameraSource.Camera : CameraSource.Photos,
          resultType: CameraResultType.Base64,
          quality: 90,
          width: 1800,
          height: 1800,
          correctOrientation: true,
          allowEditing: false,
          saveToGallery: false,
        });
        if (!photo.base64String) throw new QTPhotoPreparationError("decode_failed");
        const selected = base64ToPhotoFile(photo.base64String, getNativePhotoMimeType(photo.format));
        await prepareSelectedPhoto(selected, sourceChoice);
      } catch (error) {
        if (isPhotoPickerCancellation(error)) return;
        const diagnostic = getQTPhotoDiagnosticError(error);
        recordQTPhotoDiagnostic({
          attemptId: photoAttemptIdRef.current,
          targetDate,
          operation: isEditMode ? "edit" : "create",
          stage: "photo-process",
          status: "failed",
          photoSource: sourceChoice,
          ...diagnostic,
        });
        console.error("photo reflection native picker failed", error);
        if (isPhotoPermissionError(error)) {
          showNotice(pc(sourceChoice === "camera" ? "cameraPermissionError" : "galleryPermissionError", lang));
        } else {
          showNotice(getPhotoPreparationNotice(error, lang));
        }
      } finally {
        storageRemove(PENDING_NATIVE_SOURCE_KEY);
        setPreparingPhoto(false);
        restoreIOSViewportAfterPhotoPicker(scrollYBeforePicker);
      }
      return;
    }

    if (sourceChoice === "camera") cameraInputRef.current?.click();
    else galleryInputRef.current?.click();
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    sourceChoice: "camera" | "gallery",
  ) {
    const selected = event.target.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!selected) return;
    pendingPhotoSourceRef.current = sourceChoice;
    void prepareSelectedPhoto(selected, sourceChoice);
  }

  function clearPreparedPhoto() {
    setPreparedPhoto(null);
    setPhotoSource("unknown");
    setPreviewUrl(null);
  }

  function removeDisplayedPhoto() {
    if (preparedPhoto) {
      clearPreparedPhoto();
      return;
    }
    if (isEditMode && (existingPhotoPath || existingPhotoUrl)) {
      setExistingPhotoRemoved(true);
    }
  }

  function restoreExistingPhoto() {
    clearPreparedPhoto();
    setExistingPhotoRemoved(false);
    setPhotoSource("existing");
  }

  async function loadShareOptions() {
    setLoadingShareOptions(true);
    try {
      const options = await withPhotoStageTimeout(
        loadSharePromptOptions(t("profile_default_name", lang)),
        "photo share options",
      );
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

  function markPassageTouched() {
    if (isEditMode) setPassageTouched(true);
  }

  function addCurrentPassage() {
    markPassageTouched();
    setExtraRefs(prev => prev.includes(currentCustomRef) ? prev : [...prev, currentCustomRef]);
  }

  function removeExtraRef(ref: string) {
    markPassageTouched();
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

  async function recordTodayPhotoProgress(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    qtRecordId?: string | null,
  ) {
    const progress = await recordBibleReflectionProgress(supabase, userId, today);
    if (progress.updated) {
      if (progress.awardedBadges.length > 0) {
        storageSet(getPendingAwardedBadgesKey(userId, today), JSON.stringify(progress.awardedBadges));
      }
      storageSet(`qt_completion_pending_watering_${userId}_${today}`, "true");
    }

    // Keep the companion challenge as an independent reward layer. Even when
    // streak/progress was already recorded, retry the same-day companion ledger
    // so a prior transient failure cannot leave photo reflections behind.
    await recordCompanionChallengeReflectionCompletedBestEffort(supabase, today, qtRecordId);
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
    const attemptId = photoAttemptIdRef.current || createQTPhotoAttemptId();
    photoAttemptIdRef.current = attemptId;
    saveLockRef.current = true;
    setSaving(true);
    const supabase = createClient();
    let stage: PhotoSaveStage = "auth";
    let uploadedPath: string | null = null;
    let insertedRecordId: string | null = null;

    recordQTPhotoDiagnostic({
      attemptId,
      targetDate,
      operation: "create",
      stage: "auth",
      status: "started",
      photoSource,
      mimeType: photoToSave.sourceMimeType,
      fileSize: photoToSave.blob.size,
      width: photoToSave.width,
      height: photoToSave.height,
      wasTransformed: photoToSave.wasTransformed,
    });

    try {
      const user = await getQTPhotoAuthenticatedUser(supabase);
      recordQTPhotoDiagnostic({
        attemptId,
        targetDate,
        operation: "create",
        stage: "auth",
        status: "ok",
        photoSource,
      });

      stage = "duplicate-check";
      const existingRecord = await findCompletedQTRecordForDate(supabase, user.id, targetDate);
      if (existingRecord) {
        if (targetDate === today) {
          try {
            const recoveredProgress = await withPhotoStageTimeout(
              recordTodayPhotoProgress(supabase, user.id, existingRecord.id),
              "photo progress recovery",
            );
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

      uploadedPath = `${user.id}/${targetDate}/${attemptId}.${photoToSave.extension}`;

      stage = "upload";
      await uploadQTPhotoDurably(supabase, uploadedPath, photoToSave, attempt => {
        recordQTPhotoDiagnostic({
          attemptId,
          targetDate,
          operation: "create",
          stage: "upload",
          status: "started",
          photoSource,
          mimeType: photoToSave.contentType,
          fileSize: photoToSave.blob.size,
          width: photoToSave.width,
          height: photoToSave.height,
          wasTransformed: photoToSave.wasTransformed,
          storagePath: uploadedPath,
          metadata: { uploadAttempt: attempt },
        });
      });
      stage = "upload-verify";
      recordQTPhotoDiagnostic({
        attemptId,
        targetDate,
        operation: "create",
        stage: "upload-verify",
        status: "ok",
        photoSource,
        mimeType: photoToSave.contentType,
        fileSize: photoToSave.blob.size,
        width: photoToSave.width,
        height: photoToSave.height,
        wasTransformed: photoToSave.wasTransformed,
        storagePath: uploadedPath,
      });

      stage = "record";
      const insertedRecord = await insertQTPhotoRecordDurably(supabase, {
        id: attemptId,
        user_id: user.id,
        date: targetDate,
        qt_mode: "photo",
        reflection_type: "photo",
        bible_ref: bibleRef,
        bible_version: String(selectedTranslation),
        meditation: caption.trim(),
        photo_caption: caption.trim(),
        photo_path: uploadedPath,
        photo_url: null,
        visibility: "private",
        is_draft: false,
      });
      insertedRecordId = insertedRecord.id;
      const recordId = insertedRecord.id;
      recordQTPhotoDiagnostic({
        attemptId,
        targetDate,
        operation: "create",
        stage: "record",
        status: "ok",
        photoSource,
        storagePath: uploadedPath,
        qtRecordId: recordId,
      });

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
          await withPhotoStageTimeout(
            replaceQtRecordRecipients(supabase, recordId, user.id, requestedPartnerRecipientIds),
            "photo recipient save",
          );
        }
        if (requestedVisibility !== "private") {
          const { error: visibilityError } = await withPhotoStageTimeout(
            supabase
              .from("qt_records")
              .update({ visibility: requestedVisibility })
              .eq("id", recordId)
              .eq("user_id", user.id) as unknown as PromiseLike<{ error: unknown }>,
            "photo visibility save",
          );
          if (visibilityError) throw visibilityError;
        }
        recordQTPhotoDiagnostic({
          attemptId,
          targetDate,
          operation: "create",
          stage: "recipients",
          status: "ok",
          photoSource,
          storagePath: uploadedPath,
          qtRecordId: recordId,
        });
      } catch (sharingError) {
        sharingFailed = true;
        effectiveVisibility = "private";
        effectivePartnerRecipientIds = [];
        const diagnostic = getQTPhotoDiagnosticError(sharingError);
        recordQTPhotoDiagnostic({
          attemptId,
          targetDate,
          operation: "create",
          stage: "recipients",
          status: "warning",
          photoSource,
          storagePath: uploadedPath,
          qtRecordId: recordId,
          ...diagnostic,
        });
        console.warn("photo reflection sharing save failed; record kept private", sharingError);

        try {
          const { error: recipientCleanupError } = await withPhotoStageTimeout(
            supabase
              .from("qt_record_recipients")
              .delete()
              .eq("qt_record_id", recordId)
              .eq("owner_id", user.id) as unknown as PromiseLike<{ error: unknown }>,
            "photo recipient cleanup",
          );
          if (recipientCleanupError) console.warn("photo reflection recipient cleanup failed", recipientCleanupError);
        } catch (cleanupError) {
          console.warn("photo reflection recipient cleanup failed", cleanupError);
        }

        try {
          const { error: privateFallbackError } = await withPhotoStageTimeout(
            supabase
              .from("qt_records")
              .update({ visibility: "private" })
              .eq("id", recordId)
              .eq("user_id", user.id) as unknown as PromiseLike<{ error: unknown }>,
            "photo private fallback",
          );
          if (privateFallbackError) console.warn("photo reflection private fallback failed", privateFallbackError);
        } catch (fallbackError) {
          console.warn("photo reflection private fallback failed", fallbackError);
        }
      }

      if (targetDate === today) {
        stage = "progress";
        try {
          await withPhotoStageTimeout(
            recordTodayPhotoProgress(supabase, user.id, recordId),
            "photo progress save",
          );
        } catch (progressError) {
          const diagnostic = getQTPhotoDiagnosticError(progressError);
          recordQTPhotoDiagnostic({
            attemptId,
            targetDate,
            operation: "create",
            stage: "progress",
            status: "warning",
            photoSource,
            storagePath: uploadedPath,
            qtRecordId: recordId,
            ...diagnostic,
          });
          console.warn("photo reflection progress failed; record preserved", progressError);
          setShowShareModal(false);
          showNotice(pc("savedFollowupWarning", lang));
          window.setTimeout(() => router.push(`/qt/record?id=${recordId}`), 1400);
          return;
        }

        try {
          await markBibleReflectionCompletedForNotifications(today, lang);
        } catch (notificationError) {
          console.warn("photo reflection notification completion update failed", notificationError);
        }

        stage = "notifications";
        try {
          await withPhotoStageTimeout(
            createBibleReflectionShareNotificationsBestEffort({
              qtRecordId: recordId,
              visibility: effectiveVisibility,
              partnerRecipientIds: effectivePartnerRecipientIds,
            }),
            "photo share notifications",
            NOTIFICATION_STAGE_TIMEOUT_MS,
          );
        } catch (notificationError) {
          console.warn("photo reflection share notification creation failed", notificationError);
        }

        recordQTPhotoDiagnostic({
          attemptId,
          targetDate,
          operation: "create",
          stage: "complete",
          status: "ok",
          photoSource,
          storagePath: uploadedPath,
          qtRecordId: recordId,
          metadata: { sharingFailed },
        });
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
        await withPhotoStageTimeout(
          createBibleReflectionShareNotificationsBestEffort({
            qtRecordId: recordId,
            visibility: effectiveVisibility,
            partnerRecipientIds: effectivePartnerRecipientIds,
          }),
          "past photo share notifications",
          NOTIFICATION_STAGE_TIMEOUT_MS,
        );
      } catch (notificationError) {
        console.warn("past photo reflection share notification creation failed", notificationError);
      }

      recordQTPhotoDiagnostic({
        attemptId,
        targetDate,
        operation: "create",
        stage: "complete",
        status: "ok",
        photoSource,
        storagePath: uploadedPath,
        qtRecordId: recordId,
        metadata: { sharingFailed },
      });
      setShowShareModal(false);
      if (sharingFailed) {
        showNotice(pc("savedShareWarning", lang));
        window.setTimeout(() => router.push(`/qt/record?id=${recordId}`), 1400);
      } else {
        router.push(`/qt/record?id=${recordId}`);
      }
    } catch (error) {
      const diagnostic = getQTPhotoDiagnosticError(error);
      recordQTPhotoDiagnostic({
        attemptId,
        targetDate,
        operation: "create",
        stage,
        status: "failed",
        photoSource,
        mimeType: photoToSave.contentType,
        fileSize: photoToSave.blob.size,
        width: photoToSave.width,
        height: photoToSave.height,
        wasTransformed: photoToSave.wasTransformed,
        storagePath: uploadedPath,
        qtRecordId: insertedRecordId,
        ...diagnostic,
      });
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

      // Do not delete an uploaded object on an ambiguous database/network
      // failure. A harmless orphan is safer than deleting bytes that may have
      // been committed and linked while the mobile response was lost.
      const errorCode = getErrorCode(error);
      const duplicateCompleted = errorCode === "23505"
        || (error instanceof QTPhotoRecordError && error.code === "duplicate_completed");
      if (duplicateCompleted) {
        if (uploadedPath) await removeQTPhotoBestEffort(supabase, uploadedPath);
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
      void flushQTPhotoDiagnostics();
    }
  }

  async function savePhotoEdit() {
    if (!isEditMode || !editId) return;
    if (preparingPhoto) {
      showNotice(pc("preparingPhoto", lang));
      return;
    }
    const hasExistingPhoto = Boolean((existingPhotoPath || existingPhotoUrl) && !existingPhotoRemoved);
    if (!preparedPhoto && !hasExistingPhoto) {
      showNotice(pc("needPhoto", lang));
      return;
    }
    if (saveLockRef.current || saving) return;

    const attemptId = photoAttemptIdRef.current || createQTPhotoAttemptId();
    const sourceForEdit: QTPhotoSource = preparedPhoto ? photoSource : "existing";
    const supabase = createClient();
    saveLockRef.current = true;
    setSaving(true);
    let stage: PhotoSaveStage = "auth";
    let newUploadedPath: string | null = null;
    let oldPhotoPath: string | null = existingPhotoPath;

    try {
      recordQTPhotoDiagnostic({
        attemptId,
        targetDate,
        operation: "edit",
        stage: "auth",
        status: "started",
        photoSource: sourceForEdit,
      });
      const user = await getQTPhotoAuthenticatedUser(supabase);
      const currentRecord = await loadOwnedQTPhotoRecord(supabase, editId, user.id);
      oldPhotoPath = currentRecord.photo_path;
      recordQTPhotoDiagnostic({
        attemptId,
        targetDate: currentRecord.date,
        operation: "edit",
        stage: "auth",
        status: "ok",
        photoSource: sourceForEdit,
        qtRecordId: editId,
      });

      if (preparedPhoto) {
        newUploadedPath = `${user.id}/${currentRecord.date}/${attemptId}.${preparedPhoto.extension}`;
        stage = "upload";
        await uploadQTPhotoDurably(supabase, newUploadedPath, preparedPhoto, attempt => {
          recordQTPhotoDiagnostic({
            attemptId,
            targetDate: currentRecord.date,
            operation: "edit",
            stage: "upload",
            status: "started",
            photoSource: sourceForEdit,
            mimeType: preparedPhoto.contentType,
            fileSize: preparedPhoto.blob.size,
            width: preparedPhoto.width,
            height: preparedPhoto.height,
            wasTransformed: preparedPhoto.wasTransformed,
            storagePath: newUploadedPath,
            qtRecordId: editId,
            metadata: { uploadAttempt: attempt },
          });
        });
        stage = "upload-verify";
        recordQTPhotoDiagnostic({
          attemptId,
          targetDate: currentRecord.date,
          operation: "edit",
          stage: "upload-verify",
          status: "ok",
          photoSource: sourceForEdit,
          storagePath: newUploadedPath,
          qtRecordId: editId,
        });
      }

      stage = "edit-record";
      const patch: QTPhotoRecordPatch = {
        bible_ref: effectiveBibleRef,
        bible_version: String(selectedTranslation),
        meditation: caption.trim(),
        photo_caption: caption.trim(),
      };
      if (newUploadedPath) {
        patch.photo_path = newUploadedPath;
        patch.photo_url = null;
      }

      const updated = await updateQTPhotoRecordDurably(supabase, editId, user.id, patch);
      recordQTPhotoDiagnostic({
        attemptId,
        targetDate: currentRecord.date,
        operation: "edit",
        stage: "edit-record",
        status: "ok",
        photoSource: sourceForEdit,
        storagePath: updated.photo_path,
        qtRecordId: editId,
      });

      if (newUploadedPath && oldPhotoPath && oldPhotoPath !== newUploadedPath) {
        await removeQTPhotoBestEffort(supabase, oldPhotoPath);
      }

      recordQTPhotoDiagnostic({
        attemptId,
        targetDate: currentRecord.date,
        operation: "edit",
        stage: "complete",
        status: "ok",
        photoSource: sourceForEdit,
        storagePath: updated.photo_path,
        qtRecordId: editId,
      });
      router.push(`/qt/record?id=${editId}`);
    } catch (error) {
      const diagnostic = getQTPhotoDiagnosticError(error);
      recordQTPhotoDiagnostic({
        attemptId,
        targetDate,
        operation: "edit",
        stage,
        status: "failed",
        photoSource: sourceForEdit,
        storagePath: newUploadedPath,
        qtRecordId: editId,
        ...diagnostic,
      });
      console.error("photo reflection edit save failed", { stage, editId, error });

      // Recover an update whose success response was lost. Only remove the new
      // object after a successful read proves that the database still points
      // to the old photo. If that read is unavailable, keep the object rather
      // than risking deletion of a committed replacement.
      if (newUploadedPath) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const recoveryUserId = sessionData.session?.user?.id;
          if (recoveryUserId) {
            const recovered = await loadOwnedQTPhotoRecord(supabase, editId, recoveryUserId);
            if (recovered.photo_path === newUploadedPath) {
              if (oldPhotoPath && oldPhotoPath !== newUploadedPath) {
                await removeQTPhotoBestEffort(supabase, oldPhotoPath);
              }
              router.push(`/qt/record?id=${editId}`);
              return;
            }
            await removeQTPhotoBestEffort(supabase, newUploadedPath);
          }
        } catch (recoveryError) {
          console.warn("photo reflection edit recovery check failed; uploaded photo kept", recoveryError);
        }
      }

      if (error instanceof QTPhotoRecordError && error.code === "auth_failed") {
        showNotice(pc("authError", lang));
      } else {
        showNotice(pc("editSaveError", lang));
      }
    } finally {
      saveLockRef.current = false;
      setSaving(false);
      void flushQTPhotoDiagnostics();
    }
  }

  const chapterOptions = Array.from({ length: maxChapter }, (_, i) => i + 1);
  const displayedPhotoUrl = previewUrl || (!existingPhotoRemoved ? existingPhotoUrl : null);
  const hasUsablePhoto = Boolean(preparedPhoto || ((existingPhotoPath || existingPhotoUrl) && !existingPhotoRemoved));

  if (isEditMode && editLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--qt-page-surface)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="card" style={{ width: "100%", maxWidth: 360, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Loader2 size={30} className="spin" style={{ color: "var(--qt-sage-text)" }} />
          <p style={{ color: "var(--text2)", fontSize: 14, fontWeight: 750 }}>{pc("editLoading", lang)}</p>
        </div>
      </div>
    );
  }

  if (isEditMode && editLoadError) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--qt-page-surface)", padding: "var(--roots-page-top-padding) 20px 40px" }}>
        <button onClick={() => router.push(editId ? `/qt/record?id=${editId}` : "/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 24, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
        </button>
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.65 }}>{pc("editLoadError", lang)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="roots-qt-phase2a roots-qt-phase2h" style={{ minHeight: "100vh", background: "var(--qt-page-surface)", paddingBottom: 40 }}>
      {notice && (
        <div className="roots-elevation-toast" style={{ position: "fixed", top: "calc(18px + var(--safe-area-top))", left: "50%", transform: "translateX(-50%)", zIndex: 240, background: "var(--qt-toast-surface)", color: "var(--text)", border: "1px solid var(--qt-toast-border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, maxWidth: 340, width: "calc(100% - 40px)", textAlign: "center" }}>
          {notice}
        </div>
      )}

      <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => router.push(isEditMode && editId ? `/qt/record?id=${editId}` : "/qt")}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}
        >
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="roots-elevation-card-sage" style={{ width: 42, height: 42, borderRadius: 16, background: "var(--qt-sage-surface)", color: "var(--qt-sage-text)", border: "1px solid var(--qt-sage-border-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ImagePlus size={23} />
          </div>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 850, color: "var(--text)", marginBottom: 3 }}>{pc(isEditMode ? "editTitle" : "title", lang)}</h1>
            <p style={{ fontSize: 12, color: "var(--text-muted-readable)", lineHeight: 1.5 }}>{pc(isEditMode ? "editSub" : "sub", lang)}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card-sage">
          <p style={{ fontSize: 10, fontWeight: 800, color: "var(--sage-dark)", letterSpacing: "0.7px", marginBottom: 6 }}>{pc("passage", lang)}</p>
          <p style={{ fontSize: 16, fontWeight: 850, color: "var(--text)", marginBottom: 4 }}>{translateBibleRef(effectiveBibleRef, bibleDisplayLang)}</p>
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
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    const next = Number(e.target.value);
                    setSelectedTranslation(next);
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("roots_default_translation", String(next));
                    }
                  }}
                >
                  {TRANSLATIONS.map(group => (
                    <optgroup key={group.group} label={group.group}>
                      {group.items.map((item: { id: number; name: string }) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              {sundayContext && (
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("sermonTitle", lang)}</span>
                  <CursorStableInput className="input-field" value={sermonTitle} onValueChange={(value: string) => { markPassageTouched(); setSermonTitle(value); }} placeholder={pc("sermonTitlePlaceholder", lang)} />
                </label>
              )}
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("book", lang)}</span>
                <select className="input-field" value={book} onChange={(e: ChangeEvent<HTMLSelectElement>) => { markPassageTouched(); setBook(e.target.value); }}>
                  {BOOKS.map(item => <option key={item} value={item}>{translateBibleRef(item, bibleDisplayLang)}</option>)}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("chapter", lang)}</span>
                  <select className="input-field" value={chapter} onChange={(e: ChangeEvent<HTMLSelectElement>) => { markPassageTouched(); const next = Number(e.target.value); setChapter(next); setEndChapter(prev => Math.max(prev, next)); }}>
                    {chapterOptions.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("verse", lang)}</span>
                  <select className="input-field" value={Math.min(startVerse, maxStartVerses)} onChange={(e: ChangeEvent<HTMLSelectElement>) => { markPassageTouched(); const next = Number(e.target.value); setStartVerse(next); if (safeEndChapter === chapter && next > endVerse) setEndVerse(next); }}>
                    {Array.from({ length: maxStartVerses }, (_, i) => i + 1).map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("endChapter", lang)}</span>
                  <select className="input-field" value={safeEndChapter} onChange={(e: ChangeEvent<HTMLSelectElement>) => { markPassageTouched(); const next = Number(e.target.value); setEndChapter(next); if (next === chapter && startVerse > endVerse) setEndVerse(startVerse); }}>
                    {chapterOptions.filter(item => item >= chapter).map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted-readable)" }}>{pc("endVerse", lang)}</span>
                  <select className="input-field" value={safeEndChapter === chapter ? Math.max(endVerse, startVerse) : Math.min(endVerse, maxEndVerses)} onChange={(e: ChangeEvent<HTMLSelectElement>) => { markPassageTouched(); setEndVerse(Number(e.target.value)); }}>
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
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={(event: ChangeEvent<HTMLInputElement>) => handleFileChange(event, "gallery")}
            style={{ display: "none" }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event: ChangeEvent<HTMLInputElement>) => handleFileChange(event, "camera")}
            style={{ display: "none" }}
          />

          {preparingPhoto ? (
            <div style={{ minHeight: 170, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--qt-sage-text)" }}>
              <Loader2 size={30} className="spin" />
              <span style={{ fontSize: 13, fontWeight: 800 }}>{pc("preparingPhoto", lang)}</span>
            </div>
          ) : displayedPhotoUrl ? (
            <div>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <img
                  src={displayedPhotoUrl}
                  alt="photo reflection"
                  style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 18, border: "1px solid var(--qt-card-border)", background: "var(--qt-field-surface)", display: "block" }}
                />
                <button
                  type="button"
                  onClick={removeDisplayedPhoto}
                  disabled={saving}
                  aria-label={pc("removePhoto", lang)}
                  title={pc("removePhoto", lang)}
                  style={{ position: "absolute", top: 10, right: 10, width: 38, height: 38, borderRadius: 999, border: "1px solid rgba(255,255,255,0.45)", background: "rgba(20,24,28,0.78)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.22)" }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                className="qt-photo-upload"
                onClick={choosePhoto}
                disabled={saving}
                style={{ width: "100%", minHeight: 170, borderRadius: 20, border: "1.5px dashed var(--qt-sage-border)", background: "var(--qt-sage-surface)", color: "var(--qt-sage-text)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", fontWeight: 800 }}
              >
                <UploadCloud size={34} />
                {pc(isEditMode ? "uploadNewPhoto" : "choosePhoto", lang)}
              </button>
              {androidWebPhotoUnsupported && (
                <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text-muted-readable)", textAlign: "left", padding: "0 2px" }}>
                  {pc("androidWebAppOnly", lang)}
                </div>
              )}
              {isEditMode && existingPhotoRemoved && (existingPhotoPath || existingPhotoUrl) && (
                <button type="button" onClick={restoreExistingPhoto} disabled={saving} className="btn-outline" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <RotateCcw size={15} /> {pc("restorePhoto", lang)}
                </button>
              )}
            </div>
          )}
        </div>

        <label className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted-readable)" }}>{pc("memoLabel", lang)}</span>
          <CursorStableTextarea value={caption} onValueChange={setCaption} placeholder={pc("memoPlaceholder", lang)} rows={4} className="input-field" style={{ resize: "vertical", lineHeight: 1.6 }} />
        </label>

        <button
          type="button"
          onClick={() => {
            if (isEditMode) void savePhotoEdit();
            else openSharePrompt();
          }}
          disabled={saving || preparingPhoto || (isEditMode ? !hasUsablePhoto : !preparedPhoto)}
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {saving ? <Loader2 size={18} className="spin" /> : <Check size={18} />}
          {pc(isEditMode ? "editSave" : "shareAndSave", lang)}
        </button>
      </div>

      {showPhotoSourceModal && (
        <div
          onClick={() => !preparingPhoto && setShowPhotoSourceModal(false)}
          style={{ position: "fixed", inset: 0, zIndex: 260, background: "var(--overlay-modal)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px calc(18px + env(safe-area-inset-bottom))" }}
        >
          <div
            onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
            className="roots-elevation-modal"
            style={{ width: "100%", maxWidth: 440, borderRadius: 24, background: "var(--surface-card)", border: "1px solid var(--border)", padding: 18 }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 850, color: "var(--text)", textAlign: "center", marginBottom: 14 }}>{pc("sourceTitle", lang)}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <button
                type="button"
                onClick={() => void choosePhotoSource("camera")}
                className="btn-outline"
                style={{ minHeight: 96, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, fontWeight: 800 }}
              >
                <CameraIcon size={27} /> {pc("takePhoto", lang)}
              </button>
              <button
                type="button"
                onClick={() => void choosePhotoSource("gallery")}
                className="btn-outline"
                style={{ minHeight: 96, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, fontWeight: 800 }}
              >
                <Images size={27} /> {pc("chooseGallery", lang)}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowPhotoSourceModal(false)}
              style={{ width: "100%", marginTop: 10, padding: "12px 14px", borderRadius: 14, border: "none", background: "transparent", color: "var(--text3)", fontWeight: 750, cursor: "pointer" }}
            >
              {pc("cancel", lang)}
            </button>
          </div>
        </div>
      )}

      {!isEditMode && showShareModal && (
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
