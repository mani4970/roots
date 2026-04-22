import { ko } from './locales/ko';
import { en } from './locales/en';
import { de } from './locales/de';
import { SUPPORTED_LANGS, FALLBACK_LANG, LANG_META, type Lang, type TKey, type LocaleDict } from './locales';

export { SUPPORTED_LANGS, FALLBACK_LANG, LANG_META, type Lang, type TKey };

export const locales: Record<Lang, LocaleDict> = { ko, en, de };

export const T = Object.freeze(
  Object.fromEntries(
    (Object.keys(ko) as TKey[]).map((key) => [
      key,
      Object.fromEntries(
        SUPPORTED_LANGS.map((lang) => [lang, locales[lang][key] ?? locales[FALLBACK_LANG][key] ?? key])
      ),
    ])
  )
) as Record<TKey, Record<Lang, string>>;

export function t(key: TKey, lang: Lang = FALLBACK_LANG, vars?: Record<string, string | number>): string {
  let str = locales[lang]?.[key] ?? locales[FALLBACK_LANG]?.[key] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

export function isLang(x: unknown): x is Lang {
  return typeof x === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(x);
}

export function getLanguageOptions() {
  return SUPPORTED_LANGS.map((code) => ({ code, ...LANG_META[code] }));
}

export function pickText(lang: Lang, text: Partial<Record<Lang, string>>, fallback = ''): string {
  return text[lang] ?? text[FALLBACK_LANG] ?? fallback;
}

export function getDateLocale(lang: Lang): string {
  if (lang === 'de') return 'de-DE';
  if (lang === 'en') return 'en-US';
  return 'ko-KR';
}
