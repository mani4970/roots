"use client";

import { useEffect, useState } from "react";
import { ADVENT_ASSETS, ADVENT_TILE_DAYS, getAdventItemName, type AdventItemReward, type AdventReward } from "@/lib/adventCalendar";
import type { RootsAvatarType } from "@/lib/avatar";
import { translateBibleRef } from "@/lib/bibleBooks";
import { t, type Lang } from "@/lib/i18n";
import { downloadWordCard, supportsWordCardShare } from "@/lib/wordCardImage";
import { getHeartShopCatalogItem } from "@/lib/heartShopCatalog";
import { getAdventHeartShopItemId } from "@/lib/heartShopItems";
import HeartShopItemArt from "@/components/HeartShopItemArt";
import HomeHubDialog from "@/components/HomeHubDialog";
import styles from "./AdventCalendarDialogs.module.css";

type TileState = "future" | "today" | "missed" | "claimable" | "received";

const CALENDAR_TITLE = "Advent Calendar";
type CalendarNotice = "today" | "missed" | "load" | "claim";
const CALENDAR_COPY: Record<Lang, { teaser: string; artAlt: string; labels: Record<TileState, string>; notices: Record<CalendarNotice, string> }> = {
  ko: {
    teaser: "12월 1일부터 시작해요",
    artAlt: "성탄 달력 그림",
    labels: { future: "아직 열리지 않은 날짜", today: "묵상 전", missed: "지나간 날짜", claimable: "선물 받기", received: "수령 완료" },
    notices: {
      today: "오늘 묵상 완료 후 열 수 있어요",
      missed: "이날의 말씀 묵상 기록이 없어요.",
      load: "달력을 불러오지 못했어요.",
      claim: "선물을 받았는지 확인하지 못했어요.",
    },
  },
  en: {
    teaser: "Starts December 1",
    artAlt: "Nativity scene on the Advent Calendar",
    labels: { future: "Not available yet", today: "Reflection pending", missed: "Past date", claimable: "Claim gift", received: "Gift claimed" },
    notices: {
      today: "Open after completing today’s Bible Reflection",
      missed: "There’s no Bible Reflection for this day.",
      load: "We couldn’t load the calendar.",
      claim: "We couldn’t confirm your gift.",
    },
  },
  de: {
    teaser: "Ab 1. Dezember",
    artAlt: "Krippenszene auf dem Adventskalender",
    labels: { future: "Noch nicht verfügbar", today: "Stille Zeit offen", missed: "Vergangener Tag", claimable: "Geschenk abholen", received: "Geschenk abgeholt" },
    notices: {
      today: "Öffnet nach der heutigen Stillen Zeit",
      missed: "Für diesen Tag gibt es keinen Eintrag zur Stillen Zeit.",
      load: "Der Kalender konnte nicht geladen werden.",
      claim: "Wir konnten die Abholung des Geschenks nicht bestätigen.",
    },
  },
  fr: {
    teaser: "Dès le 1er décembre",
    artAlt: "Scène de la Nativité du calendrier de l’Avent",
    labels: { future: "Pas encore disponible", today: "Méditation en attente", missed: "Jour passé", claimable: "Recevoir le cadeau", received: "Cadeau reçu" },
    notices: {
      today: "À ouvrir après la méditation biblique du jour",
      missed: "Il n’y a pas de méditation biblique pour ce jour.",
      load: "Impossible de charger le calendrier.",
      claim: "Impossible de confirmer la réception du cadeau.",
    },
  },
  es: {
    teaser: "Desde el 1 de diciembre",
    artAlt: "Escena del nacimiento del calendario de Adviento",
    labels: { future: "Aún no disponible", today: "Meditación pendiente", missed: "Día pasado", claimable: "Recoger regalo", received: "Regalo recibido" },
    notices: {
      today: "Podrás abrirlo al terminar la meditación bíblica de hoy",
      missed: "No hay una meditación bíblica guardada para este día.",
      load: "No pudimos cargar el calendario.",
      claim: "No pudimos confirmar la entrega del regalo.",
    },
  },
};
const GIFT_COPY = {
  ko: {
    title: "{date} 선물",
    hearts: "하트 {count}개를 받았어요!",
    viewItem: "보러 가기",
    viewBadge: "배지 보기",
    sharing: "공유",
    saveError: "말씀 카드를 저장하지 못했어요.",
    shareError: "말씀 카드를 공유하지 못했어요.",
    completedArt: "완성된 성탄 달력",
    blessing: "예수님의 탄생을 기다리며 24일간 말씀으로 하루하루를 기다린 당신을 축복합니다!",
  },
  en: {
    title: "{date} Gift",
    hearts: "You received {count} hearts!",
    viewItem: "View Item",
    viewBadge: "View Badge",
    sharing: "Share",
    saveError: "Couldn’t save the Scripture card.",
    shareError: "Couldn’t share the Scripture card.",
    completedArt: "Completed Advent Calendar",
    blessing: "May God bless you as you waited for Jesus’ birth, spending each of these 24 days in his Word!",
  },
  de: {
    title: "Geschenk vom {date}",
    hearts: "Du hast {count} Herzen bekommen!",
    viewItem: "Ansehen",
    viewBadge: "Abzeichen ansehen",
    sharing: "Teilen",
    saveError: "Die Bibelverskarte konnte nicht gespeichert werden.",
    shareError: "Die Bibelverskarte konnte nicht geteilt werden.",
    completedArt: "Vollständiger Adventskalender",
    blessing: "Gott segne dich! Du hast 24 Tage lang jeden Tag mit seinem Wort auf Jesu Geburt gewartet.",
  },
  fr: {
    title: "Cadeau du {date}",
    hearts: "Vous avez reçu {count} cœurs !",
    viewItem: "Voir l’objet",
    viewBadge: "Voir le badge",
    sharing: "Partager",
    saveError: "Impossible d’enregistrer la carte biblique.",
    shareError: "Impossible de partager la carte biblique.",
    completedArt: "Calendrier de l’Avent terminé",
    blessing: "Que Dieu vous bénisse pour ces 24 jours passés dans sa Parole en attendant la naissance de Jésus !",
  },
  es: {
    title: "Regalo del {date}",
    hearts: "¡Recibiste {count} corazones!",
    viewItem: "Ver artículo",
    viewBadge: "Ver insignia",
    sharing: "Compartir",
    saveError: "No pudimos guardar la tarjeta bíblica.",
    shareError: "No pudimos compartir la tarjeta bíblica.",
    completedArt: "Calendario de Adviento completado",
    blessing: "¡Que Dios te bendiga por haber esperado el nacimiento de Jesús pasando cada uno de estos 24 días en su Palabra!",
  },
} satisfies Record<Lang, Record<string, string>>;

type CalendarProps = {
  lang: Lang;
  open: boolean;
  teaser: boolean;
  currentDay: number;
  studied: ReadonlySet<number>;
  claimed: Pick<ReadonlySet<number>, "has">;
  pendingClaimDay?: number | null;
  error?: "load" | "claim" | null;
  onClose: () => void;
  onClaim: (day: number) => void;
  onRetry?: () => void;
  loading?: boolean;
};

export function AdventCalendarDialog({
  lang, open, teaser, currentDay, studied, claimed, pendingClaimDay, error, onClose, onClaim, onRetry,
  loading = false,
}: CalendarProps) {
  const copy = CALENDAR_COPY[lang];
  const dateFormatter = new Intl.DateTimeFormat(lang, { month: "long", day: "numeric", timeZone: "UTC" });
  const [notice, setNotice] = useState<"today" | "missed" | null>(null);
  useEffect(() => setNotice(null), [open, currentDay]);

  function tileState(day: number): TileState {
    if (teaser || day > currentDay) return "future";
    if (claimed.has(day)) return "received";
    if (studied.has(day)) return "claimable";
    return day === currentDay ? "today" : "missed";
  }

  function pressTile(day: number, state: TileState) {
    if (state === "today" || state === "missed") {
      setNotice(state);
    } else if (state !== "future") {
      setNotice(null);
      onClaim(day);
    }
  }

  return (
    <HomeHubDialog open={open} title={CALENDAR_TITLE} closeLabel={t("close", lang)} hideTitle onClose={onClose} busy={pendingClaimDay != null}>
      <div lang={lang} data-advent-calendar-dialog>
        <p aria-hidden="true" className={styles.calendarTitle}>{CALENDAR_TITLE}</p>
        {loading && !teaser ? (
          <p className={styles.notice} role="status">{t("loading", lang)}</p>
        ) : error === "load" && !teaser ? (
          <div className={styles.loadError}>
            <p role="status">{copy.notices.load}</p>
            <button type="button" className="btn-outline" onClick={onRetry}>{t("common_retry", lang)}</button>
          </div>
        ) : (
          <>
            <div className={styles.art} data-advent-calendar>
              {/* The single original image preserves the exact illustration across tile edges. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ADVENT_ASSETS}/calendar.webp`} width={1296} height={1536} alt={copy.artAlt} className={teaser ? styles.blurred : undefined} />
              {!teaser && (
                <div className={styles.grid}>
                  {ADVENT_TILE_DAYS.map(day => {
                    const state = tileState(day);
                    const tileClass = [styles.tile, styles[state], pendingClaimDay === day ? styles.opening : ""].filter(Boolean).join(" ");
                    return (
                      <button
                        key={day}
                        type="button"
                        className={tileClass}
                        data-advent-day={day}
                        aria-label={`${dateFormatter.format(Date.UTC(2026, 11, day))}, ${copy.labels[state]}`}
                        aria-current={day === currentDay ? "date" : undefined}
                        disabled={state === "future" || pendingClaimDay != null}
                        onClick={() => pressTile(day, state)}
                      >
                        {state !== "received" && <span aria-hidden="true" className={styles.number}>{day}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {teaser && <div className={styles.cover}><p>{copy.teaser}</p></div>}
            </div>
            {!teaser && (
              <div className={styles.noticeArea}>
                <p className={styles.notice} aria-live="polite">{error === "claim" ? copy.notices.claim : notice && copy.notices[notice]}</p>
                {error === "claim" && <button type="button" className="btn-outline" onClick={onRetry}>{t("common_retry", lang)}</button>}
              </div>
            )}
          </>
        )}
      </div>
    </HomeHubDialog>
  );
}

type GiftProps = {
  open: boolean;
  day: number;
  lang: Lang;
  reward: AdventReward | null;
  avatarType?: RootsAvatarType;
  onClose: () => void;
  onViewBadge: () => void;
  onViewItem: (item: AdventItemReward) => void;
};

export function AdventGiftDialog({
  open, day, lang, reward, avatarType = "rootsman", onClose, onViewBadge, onViewItem,
}: GiftProps) {
  const copy = GIFT_COPY[lang];
  const [feedback, setFeedback] = useState<"saveError" | "shareError" | null>(null);
  const [verseFile, setVerseFile] = useState<File | null>(null);
  const verseFilename = reward?.type === "verse" ? reward.file.replace("_ko.webp", `_${lang}.webp`) : null;
  const verseUrl = verseFilename ? `${ADVENT_ASSETS}/${verseFilename}` : null;
  const localizedChapterAndVerse = reward?.type === "verse" ? reward.localizedChapterAndVerse?.[lang] : undefined;
  const item = reward?.type === "item"
    ? getHeartShopCatalogItem(getAdventHeartShopItemId(reward.itemId, avatarType))
    : null;
  const verseName = reward?.type === "verse"
    ? translateBibleRef(localizedChapterAndVerse ? reward.name.replace(/\S+$/, localizedChapterAndVerse) : reward.name, lang)
    : undefined;

  useEffect(() => {
    setFeedback(null);
    setVerseFile(null);
    if (!open || !verseUrl || !verseFilename) return;
    const controller = new AbortController();
    fetch(verseUrl, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Advent verse card could not be loaded.");
        return response.blob();
      })
      .then(blob => {
        if (!controller.signal.aborted) setVerseFile(new File([blob], verseFilename, { type: "image/webp" }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [open, day, verseUrl, verseFilename]);

  function save() {
    if (!verseUrl || !verseFilename) return;
    setFeedback(null);
    try {
      if (verseFile) {
        downloadWordCard(verseFile);
      } else {
        const link = document.createElement("a");
        link.href = verseUrl;
        link.download = verseFilename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch {
      setFeedback("saveError");
    }
  }

  async function share() {
    if (!verseFile || !supportsWordCardShare(verseFile)) {
      save();
      return;
    }
    setFeedback(null);
    try {
      await navigator.share({ files: [verseFile], title: verseName });
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "AbortError") {
        setFeedback("shareError");
      }
    }
  }

  const date = new Intl.DateTimeFormat(lang, { month: "long", day: "numeric", timeZone: "UTC" })
    .format(Date.UTC(2026, 11, day));
  const title = copy.title.replace("{date}", date);
  return (
    <HomeHubDialog open={open && reward != null} title={title} closeLabel={t("close", lang)} hideTitle onClose={onClose}>
      <div lang={lang}>
        <p aria-hidden="true" className={styles.giftTitle}>{title}</p>
        <div className={styles.gift} data-advent-reward={reward?.type}>
          {reward?.type === "hearts" && (
            <>
              <span aria-hidden="true" className={styles.heart}>♥</span>
              <p className={styles.rewardName}>{copy.hearts.replace("{count}", String(reward.count))}</p>
              <button type="button" className="btn-sage" onClick={onClose}>{t("confirm", lang)}</button>
            </>
          )}
          {verseUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.verse} src={verseUrl} width={1176} height={1806} alt={verseName} />
              <div className={styles.actions}>
                <button type="button" className="btn-sage" onClick={save}>{t("save", lang)}</button>
                <button type="button" className="btn-outline" onClick={share}>{copy.sharing}</button>
              </div>
              {feedback && <p className={styles.notice} role="status">{copy[feedback]}</p>}
            </>
          )}
          {reward?.type === "item" && (
            <>
              {item && (
                <div className={styles.itemFrame}>
                  <HeartShopItemArt item={item} alt="" maxWidth={168} maxHeight={148} />
                </div>
              )}
              <p className={styles.rewardName}>{getAdventItemName(reward, lang)}</p>
              <button type="button" className="btn-sage" onClick={() => onViewItem(reward)}>{copy.viewItem}</button>
            </>
          )}
          {reward?.type === "badge" && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.completed} src={`${ADVENT_ASSETS}/calendar.webp`} width={1296} height={1536} alt={copy.completedArt} />
              <p className={styles.blessing}>{copy.blessing}</p>
              <button type="button" className="btn-sage" onClick={onViewBadge}>{copy.viewBadge}</button>
            </>
          )}
        </div>
      </div>
    </HomeHubDialog>
  );
}
