import type { Lang } from "@/lib/i18n";

const TEXT = {
  ko: {
    title: "댓글 알림",
    unread: "읽지 않은 댓글 알림이 있어요",
    empty: "아직 받은 댓글 알림이 없어요.",
    loading: "알림을 불러오는 중이에요.",
    error: "알림을 불러오지 못했어요.",
    retry: "다시 시도",
    more: "이전 알림 보기",
    close: "닫기",
    unknown: "동역자",
    comment: "{name}님이 묵상에 댓글을 남겼어요.",
    reply: "{name}님이 댓글에 답글을 남겼어요.",
    pushBody: "앱에서 확인해보세요.",
    unavailable: "댓글이 삭제되었거나 지금은 볼 수 없어요.",
    opening: "댓글을 여는 중이에요.",
    acknowledgeError: "읽음 처리를 완료하지 못했어요.",
    setting: "댓글·답글 알림",
    settingDescription: "내 묵상과 댓글에 달린 새 댓글·답글을 알려드려요.",
    pushTitle: "공동체 알림",
    pushDescription: "묵상·기도 나눔과 댓글 소식을 핸드폰 알림으로 받아요.",
  },
  en: {
    title: "Comment notifications",
    unread: "You have unread comment notifications",
    empty: "No comment notifications yet.",
    loading: "Loading notifications…",
    error: "Could not load notifications.",
    retry: "Try again",
    more: "Earlier notifications",
    close: "Close",
    unknown: "Faith partner",
    comment: "{name} commented on your reflection.",
    reply: "{name} replied to your comment.",
    pushBody: "Open the app to read it.",
    unavailable: "This comment was deleted or is no longer available.",
    opening: "Opening the comment…",
    acknowledgeError: "Could not mark this notification as read.",
    setting: "Comments and replies",
    settingDescription:
      "Get notified about new comments and replies on your reflections and comments.",
    pushTitle: "Community notifications",
    pushDescription:
      "Get reflection, prayer, comment and reply updates on your phone.",
  },
  de: {
    title: "Kommentarhinweise",
    unread: "Du hast ungelesene Kommentarhinweise",
    empty: "Noch keine Kommentarhinweise.",
    loading: "Hinweise werden geladen…",
    error: "Hinweise konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    more: "Ältere Hinweise",
    close: "Schließen",
    unknown: "Glaubenspartner",
    comment: "{name} hat deine Stille Zeit kommentiert.",
    reply: "{name} hat auf deinen Kommentar geantwortet.",
    pushBody: "Öffne die App, um ihn zu lesen.",
    unavailable:
      "Dieser Kommentar wurde gelöscht oder ist nicht mehr verfügbar.",
    opening: "Kommentar wird geöffnet…",
    acknowledgeError: "Der Hinweis konnte nicht als gelesen markiert werden.",
    setting: "Kommentare und Antworten",
    settingDescription:
      "Erhalte Hinweise zu neuen Kommentaren und Antworten auf deine Stille Zeit und Kommentare.",
    pushTitle: "Gemeinschaftshinweise",
    pushDescription:
      "Erhalte Neuigkeiten zu Stille Zeit, Gebeten, Kommentaren und Antworten auf deinem Handy.",
  },
  fr: {
    title: "Notifications de commentaires",
    unread: "Vous avez des notifications de commentaires non lues",
    empty: "Aucune notification de commentaire pour le moment.",
    loading: "Chargement des notifications…",
    error: "Impossible de charger les notifications.",
    retry: "Réessayer",
    more: "Notifications précédentes",
    close: "Fermer",
    unknown: "Partenaire de foi",
    comment: "{name} a commenté votre méditation biblique.",
    reply: "{name} a répondu à votre commentaire.",
    pushBody: "Ouvrez l’application pour le lire.",
    unavailable: "Ce commentaire a été supprimé ou n’est plus disponible.",
    opening: "Ouverture du commentaire…",
    acknowledgeError: "Impossible de marquer cette notification comme lue.",
    setting: "Commentaires et réponses",
    settingDescription:
      "Recevez les nouveaux commentaires et réponses à vos méditations bibliques et commentaires.",
    pushTitle: "Notifications de la communauté",
    pushDescription:
      "Recevez les nouvelles méditations bibliques, prières, commentaires et réponses sur votre téléphone.",
  },
  es: {
    title: "Notificaciones de comentarios",
    unread: "Tienes notificaciones de comentarios sin leer",
    empty: "Todavía no hay notificaciones de comentarios.",
    loading: "Cargando notificaciones…",
    error: "No se pudieron cargar las notificaciones.",
    retry: "Reintentar",
    more: "Notificaciones anteriores",
    close: "Cerrar",
    unknown: "Compañero de fe",
    comment: "{name} comentó tu devocional.",
    reply: "{name} respondió a tu comentario.",
    pushBody: "Abre la aplicación para leerlo.",
    unavailable: "Este comentario se eliminó o ya no está disponible.",
    opening: "Abriendo el comentario…",
    acknowledgeError: "No se pudo marcar esta notificación como leída.",
    setting: "Comentarios y respuestas",
    settingDescription:
      "Recibe avisos de nuevos comentarios y respuestas en tus devocionales y comentarios.",
    pushTitle: "Notificaciones de la comunidad",
    pushDescription:
      "Recibe novedades de devocionales, oraciones, comentarios y respuestas en tu teléfono.",
  },
} satisfies Record<Lang, Record<string, string>>;

export function getCommentNotificationText(lang: Lang) {
  return TEXT[lang] ?? TEXT.en;
}
export function commentNotificationMessage(
  kind: "comment" | "reply",
  name: string | null | undefined,
  lang: Lang,
) {
  const text = getCommentNotificationText(lang);
  return text[kind].replace("{name}", name?.trim() || text.unknown);
}
