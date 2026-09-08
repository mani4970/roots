import type { Lang } from "@/lib/i18n";

const COPY = {
  noPartners: {
    ko: "아직 동역자가 없어요.\n저장 완료 후, 홈에서 동역자를 추가해보세요!",
    en: "You don't have any partners yet.\nAfter saving, add partners from Home!",
    de: "Du hast noch keine Glaubenspartner.\nFüge nach dem Speichern auf der Startseite Glaubenspartner hinzu!",
    fr: "Vous n’avez pas encore de compagnons de foi.\nAprès l’enregistrement, ajoutez-en depuis l’accueil !",
    es: "Todavía no tienes compañeros de fe.\n¡Después de guardar, añádelos desde Inicio!",
  },
  leaveUnsaved: {
    ko: "저장하지 않은 내용이 사라져요. 나갈까요?",
    en: "Your unsaved changes will be lost. Leave this page?",
    de: "Nicht gespeicherte Änderungen gehen verloren. Möchtest du die Seite verlassen?",
    fr: "Les modifications non enregistrées seront perdues. Quitter cette page ?",
    es: "Se perderán los cambios sin guardar. ¿Quieres salir?",
  },
  savingWait: {
    ko: "저장 또는 사진 처리가 진행 중이에요. 잠시만 기다려주세요.",
    en: "Saving or photo processing is in progress. Please wait.",
    de: "Speichern oder Fotoverarbeitung läuft. Bitte warte kurz.",
    fr: "L’enregistrement ou le traitement de la photo est en cours. Veuillez patienter.",
    es: "Se está guardando o procesando la foto. Espera un momento.",
  },
  offline: {
    ko: "인터넷 연결이 끊겼어요. 이 화면에서 계속 작성할 수 있어요. 저장과 새 본문 불러오기는 연결 후 다시 시도해주세요.",
    en: "You're offline. You can keep writing here. Reconnect to save or load a new passage.",
    de: "Du bist offline. Du kannst hier weiterschreiben. Verbinde dich wieder, um zu speichern oder eine neue Bibelstelle zu laden.",
    fr: "Vous êtes hors ligne. Vous pouvez continuer à écrire ici. Reconnectez-vous pour enregistrer ou charger un nouveau passage.",
    es: "No tienes conexión. Puedes seguir escribiendo aquí. Vuelve a conectarte para guardar o cargar otro pasaje.",
  },
  savedPendingTitle: {
    ko: "묵상 내용은 저장됐어요",
    en: "Your Bible Reflection is saved",
    de: "Deine Stille Zeit ist gespeichert",
    fr: "Votre méditation biblique est enregistrée",
    es: "Tu meditación bíblica está guardada",
  },
  savedPendingDescription: {
    ko: "남은 나눔·완료 처리를 다시 시도해주세요. 저장된 글은 그대로 유지돼요.",
    en: "Retry the remaining sharing and completion steps. Your saved text will be kept.",
    de: "Versuche die verbleibenden Schritte zum Teilen und Abschließen erneut. Dein gespeicherter Text bleibt erhalten.",
    fr: "Réessayez les étapes restantes de partage et de finalisation. Votre texte enregistré sera conservé.",
    es: "Reintenta los pasos pendientes para compartir y finalizar. Se conservará el texto guardado.",
  },
  pendingShare: {
    ko: "묵상은 저장됐어요. 나눔을 다시 시도해주세요.",
    en: "Your Bible Reflection is saved. Please retry sharing.",
    de: "Deine Stille Zeit ist gespeichert. Bitte versuche das Teilen erneut.",
    fr: "Votre méditation biblique est enregistrée. Veuillez réessayer le partage.",
    es: "Tu meditación bíblica está guardada. Intenta compartirla de nuevo.",
  },
  pendingProgress: {
    ko: "묵상은 저장됐어요. 완료 처리를 다시 시도해주세요.",
    en: "Your Bible Reflection is saved. Please retry finalizing it.",
    de: "Deine Stille Zeit ist gespeichert. Bitte versuche den Abschluss erneut.",
    fr: "Votre méditation biblique est enregistrée. Veuillez réessayer la finalisation.",
    es: "Tu meditación bíblica está guardada. Intenta finalizarla de nuevo.",
  },
  existingRecordTitle: {
    ko: "이미 저장된 묵상이 있어요",
    en: "A saved Bible Reflection already exists",
    de: "Es gibt bereits eine gespeicherte Stille Zeit",
    fr: "Une méditation biblique est déjà enregistrée",
    es: "Ya existe una meditación bíblica guardada",
  },
  existingRecordDescription: {
    ko: "현재 화면의 글을 기존 기록에 덮어쓰지 않았어요. 저장된 기록을 확인한 뒤 수정해주세요.",
    en: "The text on this screen has not overwritten the existing record. Review the saved record before editing it.",
    de: "Der Text auf diesem Bildschirm hat den bestehenden Eintrag nicht überschrieben. Prüfe den gespeicherten Eintrag, bevor du ihn bearbeitest.",
    fr: "Le texte de cet écran n’a pas remplacé l’entrée existante. Consultez l’entrée enregistrée avant de la modifier.",
    es: "El texto de esta pantalla no ha sobrescrito el registro existente. Revisa el registro guardado antes de editarlo.",
  },
  retryCompletion: { ko: "남은 처리 다시 시도", en: "Retry remaining steps", de: "Verbleibende Schritte erneut versuchen", fr: "Réessayer les étapes restantes", es: "Reintentar los pasos pendientes" },
  currentUnsavedText: { ko: "현재 화면에서 작성한 내용", en: "Text written on this screen", de: "Auf diesem Bildschirm geschriebener Text", fr: "Texte rédigé sur cet écran", es: "Texto escrito en esta pantalla" },
  editSavedRecord: { ko: "저장된 묵상 수정하기", en: "Edit saved reflection", de: "Gespeicherte Stille Zeit bearbeiten", fr: "Modifier la méditation enregistrée", es: "Editar la meditación guardada" },
  viewSavedRecord: { ko: "저장된 묵상 확인하기", en: "View saved reflection", de: "Gespeicherte Stille Zeit ansehen", fr: "Voir la méditation enregistrée", es: "Ver la meditación guardada" },
} as const;

export function qtFlowCopy(key: keyof typeof COPY, lang: Lang | "es") {
  return COPY[key][lang] ?? COPY[key].en;
}
