import type { Lang } from "./i18n";
export type AuthNoticeKey = "auth_credentials" | "auth_duplicate" | "auth_email_pending" | "auth_rate" | "auth_network" | "auth_unavailable" | "auth_password" | "auth_generic";
const copy: Record<AuthNoticeKey, Record<Lang, string>> = {
  auth_credentials: {
    ko: "이메일 또는 비밀번호를 확인해 주세요. 비밀번호를 잊으셨다면 비밀번호 재설정을 이용해 주세요.",
    en: "Check your email and password. If you forgot your password, use the password reset option.",
    de: "Prüfe deine E-Mail-Adresse und dein Passwort. Falls du dein Passwort vergessen hast, kannst du es zurücksetzen.",
    fr: "Vérifiez votre adresse e-mail et votre mot de passe. Si vous avez oublié votre mot de passe, utilisez la réinitialisation.",
    es: "Revisa tu correo electrónico y contraseña. Si olvidaste tu contraseña, usa la opción para restablecerla.",
  },
  auth_duplicate: {
    ko: "이미 가입된 이메일이에요. 로그인하거나 비밀번호를 재설정해 주세요.",
    en: "This email is already registered. Sign in or reset your password.",
    de: "Diese E-Mail-Adresse ist bereits registriert. Melde dich an oder setze dein Passwort zurück.",
    fr: "Cette adresse e-mail est déjà inscrite. Connectez-vous ou réinitialisez votre mot de passe.",
    es: "Este correo electrónico ya está registrado. Inicia sesión o restablece tu contraseña.",
  },
  auth_email_pending: {
    ko: "이메일 인증이 필요해요. 받은 편지함과 스팸함에서 인증 메일을 확인해 주세요.",
    en: "Please verify your email. Check your inbox and spam folder for the confirmation email.",
    de: "Bitte bestätige deine E-Mail-Adresse. Prüfe deinen Posteingang und Spamordner auf die Bestätigungs-E-Mail.",
    fr: "Veuillez confirmer votre adresse e-mail. Vérifiez votre boîte de réception et vos courriers indésirables.",
    es: "Verifica tu correo electrónico. Busca el mensaje de confirmación en tu bandeja de entrada y en spam.",
  },
  auth_rate: {
    ko: "요청이 잠시 많아졌어요. 조금 기다린 뒤 다시 시도해 주세요.",
    en: "There have been too many requests. Wait a little and try again.",
    de: "Es gab zu viele Anfragen. Warte kurz und versuche es erneut.",
    fr: "Il y a eu trop de demandes. Patientez un peu, puis réessayez.",
    es: "Se han realizado demasiadas solicitudes. Espera un poco e inténtalo de nuevo.",
  },
  auth_network: {
    ko: "서버에 연결하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
    en: "Could not connect to the server. Check your internet connection and try again.",
    de: "Die Verbindung zum Server ist fehlgeschlagen. Prüfe deine Internetverbindung und versuche es erneut.",
    fr: "Impossible de se connecter au serveur. Vérifiez votre connexion Internet, puis réessayez.",
    es: "No se pudo conectar con el servidor. Revisa tu conexión a Internet e inténtalo de nuevo.",
  },
  auth_unavailable: {
    ko: "서버에서 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
    en: "The server could not process the request. Please try again shortly.",
    de: "Der Server konnte die Anfrage nicht bearbeiten. Bitte versuche es später erneut.",
    fr: "Le serveur n’a pas pu traiter la demande. Veuillez réessayer dans un instant.",
    es: "El servidor no pudo procesar la solicitud. Vuelve a intentarlo en un momento.",
  },
  auth_password: {
    ko: "비밀번호가 보안 조건을 충족하지 못했어요. 더 긴 비밀번호로 다시 시도해 주세요.",
    en: "Your password does not meet the security requirements. Try a longer password.",
    de: "Dein Passwort erfüllt die Sicherheitsanforderungen nicht. Versuche ein längeres Passwort.",
    fr: "Votre mot de passe ne respecte pas les exigences de sécurité. Essayez un mot de passe plus long.",
    es: "Tu contraseña no cumple los requisitos de seguridad. Prueba con una contraseña más larga.",
  },
  auth_generic: {
    ko: "요청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
    en: "The request could not be completed. Please try again shortly.",
    de: "Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
    fr: "La demande n’a pas pu être effectuée. Veuillez réessayer dans un instant.",
    es: "No se pudo completar la solicitud. Vuelve a intentarlo en un momento.",
  },
};
export function authErrorNotice(error: unknown, lang: Lang): { key: AuthNoticeKey; text: string } {
  let key: AuthNoticeKey = "auth_generic";
  try {
    const e = error as { code?: unknown; status?: unknown; name?: unknown } | null;
    const mapping: Record<string, AuthNoticeKey> = {
      invalid_credentials: "auth_credentials", user_already_exists: "auth_duplicate", email_exists: "auth_duplicate",
      email_not_confirmed: "auth_email_pending", weak_password: "auth_password",
      over_request_rate_limit: "auth_rate", over_email_send_rate_limit: "auth_rate",
    };
    const code = typeof e?.code === "string" ? e.code : "";
    if (Object.hasOwn(mapping, code)) key = mapping[code];
    else if (e?.status === 429) key = "auth_rate";
    else if (typeof e?.status === "number" && e.status >= 500) key = "auth_unavailable";
    else if (e?.name === "AuthRetryableFetchError" || e?.status === 0 || (typeof navigator !== "undefined" && navigator.onLine === false)) key = "auth_network";
  } catch { /* Never display raw SDK messages, emails or tokens. */ }
  return { key, text: copy[key][lang] ?? copy[key].en };
}
