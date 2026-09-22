import type { Lang } from "@/lib/i18n";
import { getDateLocale, parseLocalDateString } from "@/lib/date";

type WordCardCopy = {
  received: string; todayLoading: string; todayLoadError: string; receive: string; recall: string; todayTitle: string; decision: string;
  encouragement: string; viewRecord: string; save: string; share: string;
  close: string; confirm: string; emptyTitle: string; emptyHint: string; retry: string; loading: string; loadError: string; missing: string;
  preparingImage: string; imageError: string; downloadStarted: string;
  imageShareUnavailable: string; nativeImageHelp: string; shareError: string;
  sourcePending: string; sourceUnavailable: string; passage: string;
  scrollLabel: string; imageAlt: string;
  missingDecision: string; recordAvailable: string; photoAlt: string; photoLoading: string;
  photoError: string; photoMissing: string; photoOpen: string;
  entryCheckError: string; savedPhotos: string; savedFiles: string; savingImage: string; saveError: string; photoPermissionHelp: string;
};

// No forced line breaks: each language uses its available width naturally.
export const WORD_CARD_TEXT: Record<Lang, WordCardCopy> = {
  ko: {
    entryCheckError: "오늘 말씀을 받았는지 확인하지 못했어요. 다시 시도해주세요.",
    savedPhotos: "사진에 말씀 카드를 저장했어요.",
    savedFiles: "선택한 위치에 말씀 카드를 저장했어요.",
    savingImage: "말씀 카드를 저장하고 있어요.",
    saveError: "말씀 카드를 저장하지 못했어요. 다시 시도해주세요.",
    photoPermissionHelp: "사진 추가 권한을 허용해주세요. 공유하기에서 파일에 저장할 수도 있어요.",

    confirm: "확인", emptyTitle: "일주일 전 오늘 묵상 기록이 없어요.",
    emptyHint: "다음주를 위해 오늘 묵상을 남겨보세요!",
    received: "오늘 받은 말씀 보기", todayLoading: "오늘 받은 말씀을 불러오고 있어요.",
    todayLoadError: "오늘 받은 말씀을 불러오지 못했어요. 잠시 후 다시 시도해주세요.",
    receive: "오늘의 말씀 카드 받기", recall: "지난주 내가 붙잡은 말씀",
    todayTitle: "오늘 하나님이 내게 주신 말씀", decision: "나의 결단",
    encouragement: "하나님이 내게 주신 말씀 다시 한 번 마음에 새기고 삶으로 살아내봐요.",
    viewRecord: "지난 묵상 보러가기", save: "저장하기", share: "공유하기",
    close: "닫기", retry: "다시 시도", loading: "지난주 묵상을 불러오고 있어요.",
    loadError: "지난주 묵상을 불러오지 못했어요. 잠시 후 다시 시도해주세요.",
    missing: "지난주 묵상은 있지만, 붙잡은 말씀과 결단이 없어요.",
    preparingImage: "카드 이미지를 준비하고 있어요.", imageError: "이미지를 준비하지 못했어요. 다시 시도해주세요.",
    downloadStarted: "이미지 다운로드를 요청했어요.",
    imageShareUnavailable: "이 브라우저는 이미지 공유를 지원하지 않아요. 저장한 카드를 원하는 앱에서 공유해주세요.",
    nativeImageHelp: "이 앱 버전에는 이미지 저장·공유 연결이 없어요. 새 버전으로 업데이트한 뒤 다시 시도해주세요.",
    shareError: "카드를 공유하지 못했어요. 다시 시도해주세요.",
    sourcePending: "선택한 절의 출처를 확인하고 있어요.",
    sourceUnavailable: "말씀 원문은 그대로 표시했어요. 정확한 출처는 그날의 묵상에서 확인해주세요.",
    passage: "묵상 본문", scrollLabel: "지난주 묵상 카드 내용, 길면 스크롤해서 읽기", imageAlt: "오늘 하나님이 내게 주신 말씀 카드",
    missingDecision: "지난주 묵상은 있지만, 결단이 없어요.",
    recordAvailable: "지난주 묵상 기록이 있어요. 지난 묵상에서 내용을 확인해주세요.",
    photoAlt: "일주일 전 묵상 사진",
    photoLoading: "사진을 불러오고 있어요.",
    photoError: "사진을 불러오지 못했어요. 다시 시도해주세요.",
    photoMissing: "사진을 찾을 수 없어요. 지난 묵상에서 확인해주세요.",
    photoOpen: "사진 크게 보기",
  },
  en: {
    entryCheckError: "We could not check whether you received today’s word. Please try again.",
    savedPhotos: "Your word card was saved to Photos.",
    savedFiles: "Your word card was saved to the selected location.",
    savingImage: "Saving your word card…",
    saveError: "We could not save your card. Please try again.",
    photoPermissionHelp: "Allow permission to add photos. You can also use Share to save the image to Files.",

    confirm: "OK", emptyTitle: "There is no reflection from this day last week.",
    emptyHint: "Leave a reflection today to revisit next week!",
    received: "View today’s verse", todayLoading: "Loading today’s verse…",
    todayLoadError: "We couldn’t load today’s verse. Please try again.",
    receive: "Get today’s verse card", recall: "My verse from last week",
    todayTitle: "God’s word for me today", decision: "My commitment",
    encouragement: "Let’s take God’s word to heart once more and live it out.",
    viewRecord: "View that reflection", save: "Save image", share: "Share",
    close: "Close", retry: "Try again", loading: "Loading last week’s reflection…",
    loadError: "We couldn’t load your reflection. Please try again.", missing: "You have a reflection from last week, but no selected word or commitment.",
    preparingImage: "Preparing your card image…", imageError: "We couldn’t prepare the image. Please try again.",
    downloadStarted: "Image download requested.",
    imageShareUnavailable: "This browser can’t share image files. Save the card, then share it from your preferred app.",
    nativeImageHelp: "This app version does not include image export. Update the app and try again.",
    shareError: "We couldn’t share the card. Please try again.", sourcePending: "Checking the selected verse’s reference…",
    sourceUnavailable: "Your original text is shown unchanged. Open that reflection to check the reference.",
    passage: "Reflection passage", scrollLabel: "Last week’s reflection card; scroll to read more", imageAlt: "God’s word for me today — verse card",
    missingDecision: "You have a reflection from last week, but no commitment.",
    recordAvailable: "You have a reflection from last week. Open it to see what you wrote.",
    photoAlt: "Reflection photo from a week ago",
    photoLoading: "Loading your photo…",
    photoError: "We couldn’t load the photo. Please try again.",
    photoMissing: "The photo could not be found. Please open that reflection.",
    photoOpen: "Enlarge photo",
  },
  de: {
    entryCheckError: "Wir konnten nicht prüfen, ob du das heutige Wort schon erhalten hast. Bitte versuche es erneut.",
    savedPhotos: "Deine Wortkarte wurde in Fotos gespeichert.",
    savedFiles: "Deine Wortkarte wurde am gewählten Ort gespeichert.",
    savingImage: "Deine Wortkarte wird gespeichert…",
    saveError: "Die Karte konnte nicht gespeichert werden. Bitte versuche es erneut.",
    photoPermissionHelp: "Erlaube das Hinzufügen von Fotos. Über Teilen kannst du das Bild auch in Dateien speichern.",

    confirm: "OK", emptyTitle: "Für diesen Tag vor einer Woche gibt es keine Stille Zeit.",
    emptyHint: "Halte heute deine Stille Zeit fest, um nächste Woche darauf zurückzublicken!",
    received: "Heutiges Wort ansehen", todayLoading: "Dein heutiges Wort wird geladen…",
    todayLoadError: "Dein heutiges Wort konnte nicht geladen werden. Bitte versuche es erneut.",
    receive: "Heutige Verskarte erhalten", recall: "Mein Wort von letzter Woche",
    todayTitle: "Gottes Wort für mich heute", decision: "Mein Entschluss",
    encouragement: "Nimm dir Gottes Wort erneut zu Herzen und lebe danach.",
    viewRecord: "Zur damaligen Stillen Zeit", save: "Bild speichern", share: "Teilen",
    close: "Schließen", retry: "Erneut versuchen", loading: "Deine Stille Zeit von letzter Woche wird geladen…",
    loadError: "Deine Stille Zeit konnte nicht geladen werden. Bitte versuche es erneut.", missing: "Du hast letzte Woche eine Stille Zeit festgehalten, aber kein Bibelwort und keinen Entschluss.",
    preparingImage: "Dein Kartenbild wird vorbereitet…", imageError: "Das Bild konnte nicht erstellt werden. Bitte versuche es erneut.",
    downloadStarted: "Der Bilddownload wurde angefordert.",
    imageShareUnavailable: "Dieser Browser unterstützt das Teilen von Bilddateien nicht. Speichere die Karte und teile sie über deine gewünschte App.",
    nativeImageHelp: "Diese App-Version enthält den Bildexport noch nicht. Aktualisiere die App und versuche es erneut.",
    shareError: "Die Karte konnte nicht geteilt werden. Bitte versuche es erneut.", sourcePending: "Die Bibelstelle des ausgewählten Verses wird geprüft…",
    sourceUnavailable: "Dein Originaltext bleibt unverändert. Prüfe die Bibelstelle in der damaligen Stillen Zeit.",
    passage: "Gelesener Bibelabschnitt", scrollLabel: "Karte der Stillen Zeit von letzter Woche; zum Weiterlesen scrollen", imageAlt: "Gottes Wort für mich heute — Verskarte",
    missingDecision: "Du hast letzte Woche eine Stille Zeit festgehalten, aber keinen Entschluss.",
    recordAvailable: "Du hast letzte Woche eine Stille Zeit festgehalten. Öffne sie, um den Inhalt anzusehen.",
    photoAlt: "Foto der Stillen Zeit von vor einer Woche",
    photoLoading: "Dein Foto wird geladen…",
    photoError: "Das Foto konnte nicht geladen werden. Bitte versuche es erneut.",
    photoMissing: "Das Foto wurde nicht gefunden. Öffne bitte die damalige Stille Zeit.",
    photoOpen: "Foto vergrößern",
  },
  fr: {
    entryCheckError: "Impossible de vérifier si tu as déjà reçu ta parole du jour. Réessaie.",
    savedPhotos: "Ta carte a été enregistrée dans Photos.",
    savedFiles: "Ta carte a été enregistrée à l’emplacement choisi.",
    savingImage: "Enregistrement de ta carte…",
    saveError: "Impossible d’enregistrer la carte. Réessaie.",
    photoPermissionHelp: "Autorise l’ajout de photos. Tu peux aussi utiliser Partager pour enregistrer l’image dans Fichiers.",

    confirm: "OK", emptyTitle: "Il n’y a pas de méditation pour ce jour de la semaine passée.",
    emptyHint: "Note ta méditation d’aujourd’hui pour y revenir la semaine prochaine !",
    received: "Voir ma parole du jour", todayLoading: "Chargement de ta parole du jour…",
    todayLoadError: "Impossible de charger ta parole du jour. Réessaie dans un instant.",
    receive: "Recevoir ma carte du jour", recall: "Ma parole de la semaine passée",
    todayTitle: "La parole que Dieu me donne aujourd’hui", decision: "Mon engagement",
    encouragement: "Gardons à nouveau dans notre cœur la parole que Dieu nous a donnée et mettons-la en pratique.",
    viewRecord: "Voir cette méditation", save: "Enregistrer", share: "Partager",
    close: "Fermer", retry: "Réessayer", loading: "Chargement de la méditation de la semaine passée…",
    loadError: "Impossible de charger ta méditation. Réessaie dans un instant.", missing: "Tu as une méditation de la semaine passée, mais aucune parole retenue ni aucun engagement.",
    preparingImage: "Préparation de l’image…", imageError: "Impossible de préparer l’image. Réessaie.",
    downloadStarted: "Le téléchargement de l’image a été demandé.",
    imageShareUnavailable: "Ce navigateur ne permet pas de partager des images. Enregistre la carte, puis partage-la depuis l’application de ton choix.",
    nativeImageHelp: "Cette version de l’application ne contient pas l’export d’images. Mets l’application à jour, puis réessaie.",
    shareError: "Impossible de partager la carte. Réessaie.", sourcePending: "Vérification de la référence du verset choisi…",
    sourceUnavailable: "Ton texte original est affiché sans modification. Consulte cette méditation pour vérifier la référence.",
    passage: "Passage médité", scrollLabel: "Carte de méditation de la semaine passée ; faire défiler pour lire la suite", imageAlt: "La parole que Dieu me donne aujourd’hui — carte biblique",
    missingDecision: "Tu as une méditation de la semaine passée, mais aucun engagement.",
    recordAvailable: "Tu as une méditation de la semaine passée. Ouvre-la pour en revoir le contenu.",
    photoAlt: "Photo de méditation d’il y a une semaine",
    photoLoading: "Chargement de ta photo…",
    photoError: "Impossible de charger la photo. Réessaie.",
    photoMissing: "La photo est introuvable. Ouvre cette méditation pour la consulter.",
    photoOpen: "Agrandir la photo",
  },
  es: {
    entryCheckError: "No pudimos comprobar si ya recibiste la palabra de hoy. Inténtalo de nuevo.",
    savedPhotos: "Tu tarjeta se ha guardado en Fotos.",
    savedFiles: "Tu tarjeta se ha guardado en la ubicación elegida.",
    savingImage: "Guardando tu tarjeta…",
    saveError: "No pudimos guardar la tarjeta. Inténtalo de nuevo.",
    photoPermissionHelp: "Permite añadir fotos. También puedes usar Compartir para guardar la imagen en Archivos.",

    confirm: "Aceptar", emptyTitle: "No hay una meditación de hace una semana.",
    emptyHint: "¡Escribe tu meditación de hoy para volver a ella la próxima semana!",
    received: "Ver mi palabra de hoy", todayLoading: "Cargando tu palabra de hoy…",
    todayLoadError: "No pudimos cargar tu palabra de hoy. Inténtalo de nuevo.",
    receive: "Recibir mi tarjeta de hoy", recall: "Mi palabra de la semana pasada",
    todayTitle: "La palabra que Dios me da hoy", decision: "Mi compromiso",
    encouragement: "Guardemos de nuevo en el corazón la palabra que Dios nos ha dado y vivamos conforme a ella.",
    viewRecord: "Ver aquella meditación", save: "Guardar imagen", share: "Compartir",
    close: "Cerrar", retry: "Reintentar", loading: "Cargando la meditación de la semana pasada…",
    loadError: "No pudimos cargar tu meditación. Inténtalo de nuevo.", missing: "Tienes una meditación de la semana pasada, pero no anotaste una palabra ni un compromiso.",
    preparingImage: "Preparando la imagen de tu tarjeta…", imageError: "No pudimos preparar la imagen. Inténtalo de nuevo.",
    downloadStarted: "Se ha solicitado la descarga de la imagen.",
    imageShareUnavailable: "Este navegador no permite compartir imágenes. Guarda la tarjeta y compártela desde la aplicación que prefieras.",
    nativeImageHelp: "Esta versión de la aplicación aún no incluye la exportación de imágenes. Actualízala e inténtalo de nuevo.",
    shareError: "No pudimos compartir la tarjeta. Inténtalo de nuevo.", sourcePending: "Comprobando la referencia del versículo elegido…",
    sourceUnavailable: "Tu texto original se muestra sin cambios. Consulta aquella meditación para comprobar la referencia.",
    passage: "Pasaje meditado", scrollLabel: "Tarjeta de meditación de la semana pasada; desplázate para seguir leyendo", imageAlt: "La palabra que Dios me da hoy — tarjeta bíblica",
    missingDecision: "Tienes una meditación de la semana pasada, pero no anotaste un compromiso.",
    recordAvailable: "Tienes una meditación de la semana pasada. Ábrela para ver su contenido.",
    photoAlt: "Foto de meditación de hace una semana",
    photoLoading: "Cargando tu foto…",
    photoError: "No pudimos cargar la foto. Inténtalo de nuevo.",
    photoMissing: "No se encontró la foto. Abre aquella meditación para consultarla.",
    photoOpen: "Ampliar foto",
  },
};

export function getWordCardText(lang: Lang): WordCardCopy {
  return WORD_CARD_TEXT[lang];
}

export type RecallDescriptionContent = "wordAndDecision" | "word" | "decision" | "photo";

export function getRecallDescription(date: string, lang: Lang, today?: string, content: RecallDescriptionContent = "wordAndDecision"): string {
  const value = parseLocalDateString(date);
  const showYear = Boolean(today && date.slice(0, 4) !== today.slice(0, 4));
  if (lang === "ko") {
    const weekday = value.toLocaleDateString("ko-KR", { weekday: "long" });
    const shortDate = value.toLocaleDateString("ko-KR", { ...(showYear ? { year: "numeric" as const } : {}), month: "long", day: "numeric" });
    const suffix = { wordAndDecision: "내가 붙잡은 말씀과 결단", word: "내가 붙잡은 말씀", decision: "내가 남긴 결단", photo: "사진으로 남긴 묵상" }[content];
    return `지난주 ${weekday} ${shortDate}, ${suffix}`;
  }
  const formatted = value.toLocaleDateString(getDateLocale(lang), {
    weekday: "long", month: "long", day: "numeric", ...(showYear ? { year: "numeric" as const } : {}),
  });
  const suffix = {
    en: { wordAndDecision: "the word I held onto and my commitment", word: "the word I held onto", decision: "my commitment", photo: "my photo reflection" },
    de: { wordAndDecision: "mein Bibelwort und mein Entschluss", word: "mein Bibelwort", decision: "mein Entschluss", photo: "meine Stille Zeit als Foto" },
    fr: { wordAndDecision: "ma parole retenue et mon engagement", word: "ma parole retenue", decision: "mon engagement", photo: "ma méditation en photo" },
    es: { wordAndDecision: "la palabra que guardé y mi compromiso", word: "la palabra que guardé", decision: "mi compromiso", photo: "mi meditación en foto" },
  }[lang][content];
  return `${formatted} · ${suffix}`;
}
