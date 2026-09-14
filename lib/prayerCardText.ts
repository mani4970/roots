import type { Lang } from "@/lib/i18n";

type PrayerCardText = {
  heading: string;
  openCards: string;
  addPrayer: string;
  interceding: string;
  added: string;
  viewIntercession: string;
  loading: string;
  error: string;
  addError: string;
  addedRefreshError: string;
  retry: string;
  mine: string;
  intercession: string;
  ongoing: string;
  answered: string;
  statusLabel: string;
  categoryLabel: string;
  removeIntercession: string;
  removeIntercessionTitle: string;
  removeIntercessionMessage: string;
  removeIntercessionConfirm: string;
  removingIntercession: string;
  removeIntercessionSuccess: string;
  removeIntercessionAlreadyAbsent: string;
  removeIntercessionError: string;
  removeIntercessionCountSyncError: string;
  close: string;
  empty: string;
  emptyMine: string;
  emptyIntercession: string;
  emptyAnsweredIntercessionTitle: string;
  emptyAnsweredIntercessionSub: string;
  bodyLabel: string;
  carouselLabel: string;
  cardLabel: (index: number, total: number) => string;
};

const TEXT: Record<Lang, PrayerCardText> = {
  ko: {
    heading: "하나님께 찾고 구해요",
    openCards: "기도 카드 보기",
    addPrayer: "기도 소원 추가하기",
    interceding: "중보 기도 중이에요",
    added: "중보 기도에 추가됐어요!",
    viewIntercession: "중보 기도 보기",
    loading: "기도를 불러오고 있어요.",
    error: "기도를 불러오지 못했어요. 다시 시도해주세요.",
    addError: "중보 기도에 추가하지 못했어요. 다시 시도해주세요.",
    addedRefreshError: "중보 기도는 추가됐지만 표시를 새로 불러오지 못했어요. 기도 탭에서 확인해주세요.",
    retry: "다시 시도",
    mine: "나의 기도",
    intercession: "중보 기도",
    ongoing: "기도 중",
    answered: "기도 응답",
    statusLabel: "기도 상태",
    categoryLabel: "기도 종류",
    removeIntercession: "삭제",
    removeIntercessionTitle: "내 중보 목록에서 삭제할까요?",
    removeIntercessionMessage: "이 기도는 내 중보 목록에서만 삭제돼요. 원래 기도는 그대로 남아 있어요.",
    removeIntercessionConfirm: "목록에서 삭제",
    removingIntercession: "삭제하고 있어요.",
    removeIntercessionSuccess: "내 중보 목록에서 삭제했어요.",
    removeIntercessionAlreadyAbsent: "이미 내 중보 목록에서 삭제된 기도예요.",
    removeIntercessionError: "내 중보 목록에서 삭제하지 못했어요. 다시 시도해주세요.",
    removeIntercessionCountSyncError: "내 중보 목록에서 삭제했지만 표시된 수를 새로 불러오지 못했어요.",
    close: "닫기",
    empty: "아직 기도 중인 제목이 없어요.",
    emptyMine: "아직 나의 기도가 없어요.",
    emptyIntercession: "아직 중보 기도가 없어요.",
    emptyAnsweredIntercessionTitle: "아직 응답받은 중보 기도가 없어요.",
    emptyAnsweredIntercessionSub: "중보하던 기도에 응답이 기록되면 여기에 표시돼요.",
    bodyLabel: "기도 내용",
    carouselLabel: "기도 카드",
    cardLabel: (index, total) => `${total}개의 기도 중 ${index}번째`,
  },
  de: {
    heading: "Gott suchen und ihn bitten",
    openCards: "Gebetskarten ansehen",
    addPrayer: "Gebetsanliegen hinzufügen",
    interceding: "Ich bete dafür",
    added: "Zur Fürbitte hinzugefügt!",
    viewIntercession: "Fürbitten ansehen",
    loading: "Gebete werden geladen.",
    error: "Die Gebete konnten nicht geladen werden. Bitte versuche es erneut.",
    addError: "Das Gebet konnte nicht zu deinen Fürbitten hinzugefügt werden. Bitte versuche es erneut.",
    addedRefreshError: "Die Fürbitte wurde hinzugefügt, aber die Anzeige konnte nicht aktualisiert werden. Bitte sieh im Gebet-Tab nach.",
    retry: "Erneut versuchen",
    mine: "Meine Gebete",
    intercession: "Fürbitten",
    ongoing: "Im Gebet",
    answered: "Erhört",
    statusLabel: "Gebetsstatus",
    categoryLabel: "Gebetsart",
    removeIntercession: "Löschen",
    removeIntercessionTitle: "Aus deinen Fürbitten entfernen?",
    removeIntercessionMessage: "Dieses Gebet wird nur aus deiner Fürbittenliste entfernt. Das ursprüngliche Gebet bleibt erhalten.",
    removeIntercessionConfirm: "Aus der Liste entfernen",
    removingIntercession: "Wird entfernt.",
    removeIntercessionSuccess: "Aus deinen Fürbitten entfernt.",
    removeIntercessionAlreadyAbsent: "Dieses Gebet steht nicht mehr auf deiner Fürbittenliste.",
    removeIntercessionError: "Das Gebet konnte nicht aus deinen Fürbitten entfernt werden. Bitte versuche es erneut.",
    removeIntercessionCountSyncError: "Aus deinen Fürbitten entfernt, aber die angezeigte Anzahl konnte nicht aktualisiert werden.",
    close: "Schließen",
    empty: "Es gibt noch keine offenen Gebetsanliegen.",
    emptyMine: "Du hast noch keine Gebetsanliegen.",
    emptyIntercession: "Du hast noch keine Fürbitten.",
    emptyAnsweredIntercessionTitle: "Du hast noch keine erhörten Fürbitten.",
    emptyAnsweredIntercessionSub: "Sobald ein Gebet aus deinen Fürbitten als erhört markiert wird, erscheint es hier.",
    bodyLabel: "Gebetsanliegen",
    carouselLabel: "Gebetskarten",
    cardLabel: (index, total) => `Gebet ${index} von ${total}`,
  },
  en: {
    heading: "Seek God and ask in prayer",
    openCards: "View prayer cards",
    addPrayer: "Add a prayer request",
    interceding: "Praying for this request",
    added: "Added to your intercessions!",
    viewIntercession: "View intercessions",
    loading: "Loading prayers.",
    error: "We couldn't load the prayers. Please try again.",
    addError: "We couldn't add this prayer to your intercessions. Please try again.",
    addedRefreshError: "The intercession was added, but the display couldn't be refreshed. Please check the Prayer tab.",
    retry: "Try again",
    mine: "My prayers",
    intercession: "Intercessions",
    ongoing: "Ongoing",
    answered: "Answered",
    statusLabel: "Prayer status",
    categoryLabel: "Prayer type",
    removeIntercession: "Delete",
    removeIntercessionTitle: "Remove from your intercessions?",
    removeIntercessionMessage: "This only removes the prayer from your intercession list. The original prayer will remain.",
    removeIntercessionConfirm: "Remove from list",
    removingIntercession: "Removing.",
    removeIntercessionSuccess: "Removed from your intercessions.",
    removeIntercessionAlreadyAbsent: "This prayer is no longer in your intercession list.",
    removeIntercessionError: "We couldn't remove this prayer from your intercessions. Please try again.",
    removeIntercessionCountSyncError: "Removed from your intercessions, but the count couldn't be refreshed.",
    close: "Close",
    empty: "There are no ongoing prayer requests yet.",
    emptyMine: "You have no prayer requests yet.",
    emptyIntercession: "You have no intercessions yet.",
    emptyAnsweredIntercessionTitle: "You have no answered intercessions yet.",
    emptyAnsweredIntercessionSub: "Prayers from your intercessions will appear here when they are marked as answered.",
    bodyLabel: "Prayer request",
    carouselLabel: "Prayer cards",
    cardLabel: (index, total) => `Prayer ${index} of ${total}`,
  },
  fr: {
    heading: "Cherchons Dieu dans la prière",
    openCards: "Voir les cartes de prière",
    addPrayer: "Ajouter un sujet de prière",
    interceding: "Je prie pour ce sujet",
    added: "Ajoutée à vos intercessions !",
    viewIntercession: "Voir les intercessions",
    loading: "Chargement des prières.",
    error: "Impossible de charger les prières. Veuillez réessayer.",
    addError: "Impossible d’ajouter cette prière à vos intercessions. Veuillez réessayer.",
    addedRefreshError: "L’intercession a été ajoutée, mais l’affichage n’a pas pu être actualisé. Consultez l’onglet Prière.",
    retry: "Réessayer",
    mine: "Mes prières",
    intercession: "Intercessions",
    ongoing: "En cours",
    answered: "Exaucées",
    statusLabel: "État de la prière",
    categoryLabel: "Type de prière",
    removeIntercession: "Supprimer",
    removeIntercessionTitle: "Retirer de vos intercessions ?",
    removeIntercessionMessage: "Cette prière sera retirée uniquement de votre liste d’intercessions. La prière d’origine sera conservée.",
    removeIntercessionConfirm: "Retirer de la liste",
    removingIntercession: "Retrait en cours.",
    removeIntercessionSuccess: "Retirée de vos intercessions.",
    removeIntercessionAlreadyAbsent: "Cette prière ne figure déjà plus dans votre liste d’intercessions.",
    removeIntercessionError: "Impossible de retirer cette prière de vos intercessions. Veuillez réessayer.",
    removeIntercessionCountSyncError: "La prière a été retirée de vos intercessions, mais le compteur n’a pas pu être actualisé.",
    close: "Fermer",
    empty: "Il n’y a pas encore de sujets de prière en cours.",
    emptyMine: "Vous n’avez pas encore de sujets de prière.",
    emptyIntercession: "Vous n’avez pas encore d’intercessions.",
    emptyAnsweredIntercessionTitle: "Vous n’avez pas encore d’intercessions exaucées.",
    emptyAnsweredIntercessionSub: "Les prières de vos intercessions apparaîtront ici lorsqu’elles seront marquées comme exaucées.",
    bodyLabel: "Sujet de prière",
    carouselLabel: "Cartes de prière",
    cardLabel: (index, total) => `Prière ${index} sur ${total}`,
  },
  es: {
    heading: "Busquemos a Dios en oración",
    openCards: "Ver tarjetas de oración",
    addPrayer: "Añadir una petición de oración",
    interceding: "Estoy orando por esta petición",
    added: "¡Añadida a tus intercesiones!",
    viewIntercession: "Ver intercesiones",
    loading: "Cargando oraciones.",
    error: "No se pudieron cargar las oraciones. Inténtalo de nuevo.",
    addError: "No se pudo añadir esta oración a tus intercesiones. Inténtalo de nuevo.",
    addedRefreshError: "La intercesión se añadió, pero no se pudo actualizar la pantalla. Compruébala en la pestaña Oración.",
    retry: "Reintentar",
    mine: "Mis oraciones",
    intercession: "Intercesiones",
    ongoing: "En curso",
    answered: "Respondidas",
    statusLabel: "Estado de la oración",
    categoryLabel: "Tipo de oración",
    removeIntercession: "Eliminar",
    removeIntercessionTitle: "¿Quitar de tus intercesiones?",
    removeIntercessionMessage: "Esta oración solo se quitará de tu lista de intercesiones. La oración original se conservará.",
    removeIntercessionConfirm: "Quitar de la lista",
    removingIntercession: "Quitando de la lista.",
    removeIntercessionSuccess: "Se ha quitado de tus intercesiones.",
    removeIntercessionAlreadyAbsent: "Esta oración ya no está en tu lista de intercesiones.",
    removeIntercessionError: "No se pudo quitar esta oración de tus intercesiones. Inténtalo de nuevo.",
    removeIntercessionCountSyncError: "La oración se quitó de tus intercesiones, pero no se pudo actualizar el contador.",
    close: "Cerrar",
    empty: "Aún no hay peticiones de oración en curso.",
    emptyMine: "Aún no tienes peticiones de oración.",
    emptyIntercession: "Aún no tienes intercesiones.",
    emptyAnsweredIntercessionTitle: "Aún no tienes intercesiones respondidas.",
    emptyAnsweredIntercessionSub: "Las oraciones de tus intercesiones aparecerán aquí cuando se marquen como respondidas.",
    bodyLabel: "Petición de oración",
    carouselLabel: "Tarjetas de oración",
    cardLabel: (index, total) => `Oración ${index} de ${total}`,
  },
};

export function getPrayerCardText(lang: Lang): PrayerCardText {
  return TEXT[lang] ?? TEXT.ko;
}
