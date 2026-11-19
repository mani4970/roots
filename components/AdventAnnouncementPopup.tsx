"use client";

import Image from "next/image";
import HomeHubDialog from "@/components/HomeHubDialog";
import { ADVENT_ASSETS } from "@/lib/adventCalendar";
import { t, type Lang } from "@/lib/i18n";
import styles from "./AdventAnnouncementPopup.module.css";

const COPY: Record<Lang, { title: string; body: string }> = {
  ko: {
    title: "예수님의 탄생을 기다리는 어드벤트 캘린더가 곧 시작돼요!",
    body: "12월 1일부터 24일까지,\n매일 묵상을 마치고 하루에 하나씩 선물을 열어 보세요!",
  },
  en: {
    title: "The Advent Calendar begins soon as we await Jesus’ birth!",
    body: "From December 1 to 24,\nfinish your daily Bible Reflection and open one gift each day!",
  },
  de: {
    title: "Bald beginnt der Adventskalender in Vorfreude auf Jesu Geburt!",
    body: "Vom 1. bis 24. Dezember,\nöffne jeden Tag nach deiner Stillen Zeit ein Geschenk!",
  },
  fr: {
    title: "Le calendrier de l’Avent pour attendre la naissance de Jésus commence bientôt !",
    body: "Du 1er au 24 décembre,\ntermine ta méditation biblique et ouvre un cadeau chaque jour !",
  },
  es: {
    title: "¡Pronto empieza el calendario de Adviento para esperar el nacimiento de Jesús!",
    body: "Del 1 al 24 de diciembre,\ntermina tu meditación bíblica y abre un regalo cada día!",
  },
};

type Props = {
  open: boolean;
  lang: Lang;
  onClose: () => void;
};

export default function AdventAnnouncementPopup({ open, lang, onClose }: Props) {
  const copy = COPY[lang];

  return (
    <HomeHubDialog open={open} title={copy.title} closeLabel={t("close", lang)}
      onClose={onClose} compact hideTitle>
      <div className={styles.notice} lang={lang}>
        <p className={styles.title} aria-hidden="true">{copy.title}</p>
        <p className={styles.body}>{copy.body}</p>
        <Image className={styles.calendar} src={`${ADVENT_ASSETS}/calendar.webp`}
          width={1296} height={1536} sizes="168px" alt="" />
        <button type="button" className="btn-sage" onClick={onClose}>{t("confirm", lang)}</button>
      </div>
    </HomeHubDialog>
  );
}
