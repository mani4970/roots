import type { Lang } from "@/lib/i18n";

const TEXT = {
  ko: {
    title: "댓글", placeholder: "축복의 메시지를 남겨보세요.",
    empty: "첫 댓글로 마음을 나눠보세요.", send: "남기기", sending: "저장 중…",
    edit: "수정", save: "저장", cancel: "취소", remove: "삭제", confirmRemove: "댓글을 삭제할까요?",
    confirm: "삭제", loadMore: "이전 댓글 보기", retry: "다시 시도", loading: "댓글을 불러오는 중이에요.",
    loadError: "댓글을 불러오지 못했어요. 다시 시도해주세요.",
    saveError: "댓글을 저장하지 못했어요. 나눔 권한과 연결 상태를 확인한 뒤 다시 시도해주세요.",
    deleteError: "댓글을 삭제하지 못했어요. 다시 시도해주세요.", edited: "수정됨", unknown: "사용자",
    profile: "프로필", signIn: "로그인하면 댓글을 남길 수 있어요.",
    all: "전체 커뮤니티에 공개되는 댓글이에요.", group: "현재 그룹 참여자끼리 나누는 댓글이에요.",
    partner: "이 묵상을 나눈 두 동역자 사이에서만 보이는 댓글이에요.",
  },
  en: {
    title: "Comments", placeholder: "Leave a message of blessing.",
    empty: "Be the first to share a comment.", send: "Post", sending: "Saving…",
    edit: "Edit", save: "Save", cancel: "Cancel", remove: "Delete", confirmRemove: "Delete this comment?",
    confirm: "Delete", loadMore: "Earlier comments", retry: "Try again", loading: "Loading comments…",
    loadError: "Comments could not be loaded. Please try again.",
    saveError: "Your comment could not be saved. Check your connection and access to this sharing space, then try again.",
    deleteError: "Your comment could not be deleted. Please try again.", edited: "Edited", unknown: "User",
    profile: "Profile", signIn: "Sign in to leave a comment.",
    all: "These comments are visible in the whole community.", group: "These comments are shared with current group members.",
    partner: "Only the two partners in this sharing space can see these comments.",
  },
  de: {
    title: "Kommentare", placeholder: "Hinterlasse eine Segensbotschaft.",
    empty: "Teile den ersten Kommentar.", send: "Senden", sending: "Wird gespeichert…",
    edit: "Bearbeiten", save: "Speichern", cancel: "Abbrechen", remove: "Löschen", confirmRemove: "Diesen Kommentar löschen?",
    confirm: "Löschen", loadMore: "Frühere Kommentare", retry: "Erneut versuchen", loading: "Kommentare werden geladen…",
    loadError: "Die Kommentare konnten nicht geladen werden. Bitte versuche es erneut.",
    saveError: "Dein Kommentar konnte nicht gespeichert werden. Prüfe deine Verbindung und deinen Zugriff auf diesen Bereich und versuche es erneut.",
    deleteError: "Dein Kommentar konnte nicht gelöscht werden. Bitte versuche es erneut.", edited: "Bearbeitet", unknown: "Nutzer",
    profile: "Profil", signIn: "Melde dich an, um einen Kommentar zu schreiben.",
    all: "Diese Kommentare sind in der gesamten Community sichtbar.", group: "Diese Kommentare sehen aktuelle Gruppenmitglieder.",
    partner: "Diese Kommentare sehen nur die beiden Partner in diesem Bereich.",
  },
  fr: {
    title: "Commentaires", placeholder: "Laissez un message de bénédiction.",
    empty: "Soyez la première personne à laisser un commentaire.", send: "Publier", sending: "Enregistrement…",
    edit: "Modifier", save: "Enregistrer", cancel: "Annuler", remove: "Supprimer", confirmRemove: "Supprimer ce commentaire ?",
    confirm: "Supprimer", loadMore: "Commentaires précédents", retry: "Réessayer", loading: "Chargement des commentaires…",
    loadError: "Impossible de charger les commentaires. Veuillez réessayer.",
    saveError: "Impossible d’enregistrer votre commentaire. Vérifiez votre connexion et votre accès à cet espace, puis réessayez.",
    deleteError: "Impossible de supprimer votre commentaire. Veuillez réessayer.", edited: "Modifié", unknown: "Utilisateur",
    profile: "Profil", signIn: "Connectez-vous pour laisser un commentaire.",
    all: "Ces commentaires sont visibles dans toute la communauté.", group: "Ces commentaires sont partagés avec les membres actuels du groupe.",
    partner: "Seuls les deux partenaires de cet espace peuvent voir ces commentaires.",
  },
  es: {
    title: "Comentarios", placeholder: "Deja un mensaje de bendición.",
    empty: "Sé la primera persona en dejar un comentario.", send: "Publicar", sending: "Guardando…",
    edit: "Editar", save: "Guardar", cancel: "Cancelar", remove: "Eliminar", confirmRemove: "¿Eliminar este comentario?",
    confirm: "Eliminar", loadMore: "Comentarios anteriores", retry: "Reintentar", loading: "Cargando comentarios…",
    loadError: "No se pudieron cargar los comentarios. Vuelve a intentarlo.",
    saveError: "No se pudo guardar tu comentario. Comprueba tu conexión y tu acceso a este espacio e inténtalo de nuevo.",
    deleteError: "No se pudo eliminar tu comentario. Vuelve a intentarlo.", edited: "Editado", unknown: "Usuario",
    profile: "Perfil", signIn: "Inicia sesión para dejar un comentario.",
    all: "Estos comentarios son visibles en toda la comunidad.", group: "Estos comentarios se comparten con los miembros actuales del grupo.",
    partner: "Solo los dos compañeros de este espacio pueden ver estos comentarios.",
  },
} satisfies Record<Lang, Record<string, string>>;

export function getQtCommentText(lang: Lang) {
  return TEXT[lang] ?? TEXT.ko;
}
