import { FALLBACK_LANG, isLang, type Lang } from "@/lib/i18n";

const TEXT: Record<Lang, { title: string; from: (name: string) => string; unknown: string }> = {
  ko: { title: "🎁 선물이 도착했어요!", from: name => `${name}님이 선물을 보냈어요!`, unknown: "동역자" },
  en: { title: "🎁 A gift for you!", from: name => `${name} sent you a gift!`, unknown: "A faith partner" },
  de: { title: "🎁 Ein Geschenk für dich!", from: name => `${name} hat dir ein Geschenk geschickt!`, unknown: "Ein Glaubenspartner" },
  fr: { title: "🎁 Un cadeau pour vous !", from: name => `${name} vous a envoyé un cadeau !`, unknown: "Un partenaire de foi" },
  es: { title: "🎁 ¡Tienes un regalo!", from: name => `¡${name} te ha enviado un regalo!`, unknown: "Un compañero de fe" },
};

export function giftNotificationMessage(name: string | null | undefined, locale: unknown) {
  const lang = isLang(locale) ? locale : FALLBACK_LANG;
  const copy = TEXT[lang];
  const sender = name?.trim() || copy.unknown;
  return { title: copy.title, body: Array.from(copy.from(sender)).slice(0, 240).join("") };
}
