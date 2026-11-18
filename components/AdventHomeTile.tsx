"use client";

/* eslint-disable @next/next/no-img-element -- Keep the supplied pixel artwork and transparent edges as authored. */
import { ADVENT_ASSETS } from "@/lib/adventCalendar";
import type { Lang } from "@/lib/i18n";
import styles from "./AdventHomeTile.module.css";

type AdventHomeTileProps = {
  className?: string;
  lang: Lang;
  pending: boolean;
  open?: boolean;
  onOpen: () => void;
};

const GIFT_NOTICE: Record<Lang, string> = {
  ko: "선물이에요!",
  en: "A gift!",
  de: "Ein Geschenk!",
  fr: "Un cadeau\u00a0!",
  es: "¡Un regalo!",
};

export default function AdventHomeTile({
  className, lang, pending, open = false, onOpen,
}: AdventHomeTileProps) {
  const giftNotice = GIFT_NOTICE[lang];

  return (
    <button
      type="button"
      className={className ? `${className} ${styles.card}` : styles.card}
      lang={lang}
      aria-label={pending ? `Advent Calendar. ${giftNotice}` : "Advent Calendar"}
      aria-haspopup="dialog"
      aria-expanded={open}
      data-has-gift={pending || undefined}
      onClick={onOpen}
    >
      <span className={styles.art} aria-hidden="true">
        <span className={styles.snowTop}>
          <img src={`${ADVENT_ASSETS}/advent-snow-top.webp`} alt="" draggable={false} />
        </span>
        <span className={styles.giftRow}>
          <span className={styles.giftTrack}>
            <span className={styles.gift}>
              <img src={`${ADVENT_ASSETS}/advent-gift-box.webp`} alt="" draggable={false} />
            </span>
          </span>
          {pending && <span className={styles.bubble}>{giftNotice}</span>}
        </span>
        <img className={styles.title} src={`${ADVENT_ASSETS}/advent-calendar-title.webp`} alt="" draggable={false} />
      </span>
    </button>
  );
}
