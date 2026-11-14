import type { Lang } from "@/lib/i18n";

export type GratitudeText = {
  title: string;
  description: string;
  todayTab: string;
  historyTab: string;
  close: string;
  save: string;
  saving: string;
  saved: string;
  addItem: string;
  removeItem: (index: number) => string;
  itemLabel: (index: number) => string;
  placeholder: string;
  loading: string;
  retry: string;
  loadError: string;
  saveError: string;
  deleteError: string;
  conflict: string;
  reload: string;
  discardConfirm: string;
  cancel: string;
  edit: string;
  delete: string;
  deleteConfirm: string;
  emptyHistory: string;
  loadMore: string;
  draftLabel: string;
  recoverDraft: string;
  discardDraft: string;
  discardDraftConfirm: string;
  maxItems: string;
  storageUnavailable: string;
  olderDraftNotice: string;
  goToday: string;
  authError: string;
};

const TEXT: Record<Lang, GratitudeText> = {
  ko: {
    title: "오늘의 감사", description: "오늘 하루, 감사한 일들을 남겨보세요",
    todayTab: "오늘의 감사", historyTab: "지난 기록", close: "닫기",
    save: "저장하기", saving: "저장 중…", saved: "저장했어요",
    addItem: "감사 추가", removeItem: index => `감사 ${index} 삭제`, itemLabel: index => `감사 ${index}`,
    placeholder: "감사한 일을 적어보세요", loading: "불러오는 중…", retry: "다시 시도",
    loadError: "기록을 불러오지 못했어요. 다시 시도해주세요.",
    saveError: "저장을 확인하지 못했어요. 입력한 내용은 유지돼요. 다시 시도해주세요.",
    deleteError: "삭제를 확인하지 못했어요. 다시 불러와 확인해주세요.",
    conflict: "다른 곳에서 기록이 변경됐어요. 입력한 내용은 유지돼요. 다시 불러오면 현재 입력은 저장된 내용으로 바뀝니다.",
    reload: "다시 불러오기", discardConfirm: "현재 입력을 버리고 저장된 내용을 불러올까요?",
    cancel: "취소", edit: "수정", delete: "삭제", deleteConfirm: "이날의 감사 기록을 삭제할까요?",
    emptyHistory: "지난 감사 기록이 아직 없어요.", loadMore: "더 보기", draftLabel: "작성 중",
    recoverDraft: "이어서 쓰기", discardDraft: "임시 내용 지우기", discardDraftConfirm: "이날 작성 중인 내용을 지울까요?", maxItems: "감사는 한 번에 50개까지 적을 수 있어요.",
    storageUnavailable: "이 기기에서 임시 저장을 할 수 없어요. 앱을 종료하기 전에 저장해주세요.",
    olderDraftNotice: "날짜가 바뀌었어요. 작성 중인 감사는 아래 날짜로 저장됩니다.",
    goToday: "오늘로 이동", authError: "로그인을 확인한 뒤 다시 시도해주세요.",
  },
  en: {
    title: "Today's gratitude", description: "Write down what you’re grateful for today",
    todayTab: "Today", historyTab: "History", close: "Close",
    save: "Save", saving: "Saving…", saved: "Saved",
    addItem: "Add gratitude", removeItem: index => `Remove item ${index}`, itemLabel: index => `Gratitude ${index}`,
    placeholder: "What are you grateful for?", loading: "Loading…", retry: "Try again",
    loadError: "Couldn’t load your entries. Please try again.",
    saveError: "Couldn’t confirm the save. Your writing is kept. Please try again.",
    deleteError: "Couldn’t confirm deletion. Reload to check.",
    conflict: "This entry changed elsewhere. Your writing is kept. Reloading replaces it with the saved entry.",
    reload: "Reload", discardConfirm: "Discard your current writing and load the saved entry?",
    cancel: "Cancel", edit: "Edit", delete: "Delete", deleteConfirm: "Delete this day’s gratitude entry?",
    emptyHistory: "No past gratitude entries yet.", loadMore: "Show more", draftLabel: "Draft",
    recoverDraft: "Continue writing", discardDraft: "Discard draft", discardDraftConfirm: "Discard this day’s unsaved writing?", maxItems: "You can add up to 50 gratitude items.",
    storageUnavailable: "Drafts can’t be stored on this device. Save before closing the app.",
    olderDraftNotice: "It’s a new day. Your writing will be saved under the date below.",
    goToday: "Go to today", authError: "Please check your sign-in and try again.",
  },
  de: {
    title: "Dankbarkeit heute", description: "Halte fest, wofür du heute dankbar bist",
    todayTab: "Heute", historyTab: "Rückblick", close: "Schließen",
    save: "Speichern", saving: "Wird gespeichert…", saved: "Gespeichert",
    addItem: "Dank hinzufügen", removeItem: index => `Punkt ${index} entfernen`, itemLabel: index => `Dank ${index}`,
    placeholder: "Wofür bist du dankbar?", loading: "Wird geladen…", retry: "Erneut versuchen",
    loadError: "Deine Einträge konnten nicht geladen werden. Bitte versuche es erneut.",
    saveError: "Das Speichern konnte nicht bestätigt werden. Dein Text bleibt erhalten. Bitte versuche es erneut.",
    deleteError: "Das Löschen konnte nicht bestätigt werden. Lade die Einträge zur Prüfung neu.",
    conflict: "Dieser Eintrag wurde andernorts geändert. Dein Text bleibt erhalten. Beim Neuladen wird er durch den gespeicherten Eintrag ersetzt.",
    reload: "Neu laden", discardConfirm: "Deinen aktuellen Text verwerfen und den gespeicherten Eintrag laden?",
    cancel: "Abbrechen", edit: "Bearbeiten", delete: "Löschen", deleteConfirm: "Den Dankbarkeitseintrag dieses Tages löschen?",
    emptyHistory: "Hier stehen bald deine vergangenen Dankbarkeitseinträge.", loadMore: "Mehr anzeigen", draftLabel: "Entwurf",
    recoverDraft: "Weiterschreiben", discardDraft: "Entwurf verwerfen", discardDraftConfirm: "Den ungespeicherten Text dieses Tages verwerfen?", maxItems: "Du kannst bis zu 50 Dankbarkeitspunkte hinzufügen.",
    storageUnavailable: "Entwürfe können auf diesem Gerät nicht gespeichert werden. Speichere vor dem Schließen der App.",
    olderDraftNotice: "Ein neuer Tag hat begonnen. Dein Text wird unter dem Datum unten gespeichert.",
    goToday: "Zu heute", authError: "Bitte prüfe deine Anmeldung und versuche es erneut.",
  },
  fr: {
    title: "Gratitude du jour", description: "Note ce qui t’inspire de la gratitude aujourd’hui",
    todayTab: "Aujourd’hui", historyTab: "Historique", close: "Fermer",
    save: "Enregistrer", saving: "Enregistrement…", saved: "Enregistré",
    addItem: "Ajouter un merci", removeItem: index => `Retirer le point ${index}`, itemLabel: index => `Gratitude ${index}`,
    placeholder: "Pour quoi veux-tu dire merci ?", loading: "Chargement…", retry: "Réessayer",
    loadError: "Impossible de charger tes notes. Réessaie.",
    saveError: "L’enregistrement n’a pas pu être confirmé. Ton texte est conservé. Réessaie.",
    deleteError: "La suppression n’a pas pu être confirmée. Recharge pour vérifier.",
    conflict: "Cette note a été modifiée ailleurs. Ton texte est conservé. Recharger le remplacera par la note enregistrée.",
    reload: "Recharger", discardConfirm: "Abandonner ton texte actuel et charger la note enregistrée ?",
    cancel: "Annuler", edit: "Modifier", delete: "Supprimer", deleteConfirm: "Supprimer la note de gratitude de ce jour ?",
    emptyHistory: "Aucune note de gratitude passée pour le moment.", loadMore: "Voir plus", draftLabel: "Brouillon",
    recoverDraft: "Continuer", discardDraft: "Effacer le brouillon", discardDraftConfirm: "Effacer le texte non enregistré de ce jour ?", maxItems: "Tu peux ajouter jusqu’à 50 sujets de gratitude.",
    storageUnavailable: "Les brouillons ne peuvent pas être conservés sur cet appareil. Enregistre avant de fermer l’application.",
    olderDraftNotice: "Une nouvelle journée commence. Ton texte sera enregistré à la date ci-dessous.",
    goToday: "Revenir à aujourd’hui", authError: "Vérifie ta connexion à ton compte, puis réessaie.",
  },
  es: {
    title: "Gratitud de hoy", description: "Anota las cosas por las que das gracias hoy",
    todayTab: "Hoy", historyTab: "Historial", close: "Cerrar",
    save: "Guardar", saving: "Guardando…", saved: "Guardado",
    addItem: "Añadir gratitud", removeItem: index => `Quitar el punto ${index}`, itemLabel: index => `Gratitud ${index}`,
    placeholder: "¿Por qué das gracias?", loading: "Cargando…", retry: "Reintentar",
    loadError: "No se pudieron cargar tus notas. Inténtalo de nuevo.",
    saveError: "No se pudo confirmar que se guardara. Tu texto se conserva. Inténtalo de nuevo.",
    deleteError: "No se pudo confirmar la eliminación. Recarga para comprobarlo.",
    conflict: "Esta nota cambió en otro lugar. Tu texto se conserva. Al recargar, se sustituirá por la nota guardada.",
    reload: "Recargar", discardConfirm: "¿Descartar tu texto actual y cargar la nota guardada?",
    cancel: "Cancelar", edit: "Editar", delete: "Eliminar", deleteConfirm: "¿Eliminar la nota de gratitud de este día?",
    emptyHistory: "Todavía no hay notas de gratitud anteriores.", loadMore: "Ver más", draftLabel: "Borrador",
    recoverDraft: "Seguir escribiendo", discardDraft: "Descartar borrador", discardDraftConfirm: "¿Descartar el texto sin guardar de este día?", maxItems: "Puedes añadir hasta 50 motivos de gratitud.",
    storageUnavailable: "No se pueden conservar borradores en este dispositivo. Guarda antes de cerrar la aplicación.",
    olderDraftNotice: "Ha comenzado un nuevo día. Tu texto se guardará con la fecha de abajo.",
    goToday: "Ir a hoy", authError: "Comprueba tu sesión e inténtalo de nuevo.",
  },
};

export function getGratitudeText(lang: Lang): GratitudeText {
  return TEXT[lang];
}
