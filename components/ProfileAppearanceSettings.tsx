"use client";

import { useEffect, useId, useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { storageGet, storageSet } from "@/lib/clientStorage";
import type { Lang } from "@/lib/i18n";
import styles from "./ProfileAppearanceSettings.module.css";

type Theme = "light" | "dark";

const TEXT = {
  ko: { appearance: "화면 설정", light: "밝게", dark: "어둡게" },
  en: { appearance: "Appearance", light: "Light", dark: "Dark" },
  de: { appearance: "Darstellung", light: "Hell", dark: "Dunkel" },
  fr: { appearance: "Apparence", light: "Clair", dark: "Sombre" },
  es: { appearance: "Apariencia", light: "Claro", dark: "Oscuro" },
} satisfies Record<Lang, { appearance: string; light: string; dark: string }>;

export default function ProfileAppearanceSettings({ lang }: { lang: Lang }) {
  const labelId = useId();
  const [theme, setTheme] = useState<Theme | null>(null);
  const copy = TEXT[lang];

  useEffect(() => {
    const saved = storageGet("roots_theme");
    setTheme(saved === "light" || saved === "dark"
      ? saved
      : document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  function changeTheme(nextTheme: Theme) {
    if (nextTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    storageSet("roots_theme", nextTheme);
    setTheme(nextTheme);
  }

  return (
    <div className={styles.card} role="group" aria-labelledby={labelId}>
      <p id={labelId} className={styles.label}>{copy.appearance}</p>
      <div className={styles.options}>
        {(["light", "dark"] as const).map(option => (
          <button
            key={option}
            type="button"
            className={styles.option}
            aria-pressed={theme === option}
            onClick={() => changeTheme(option)}
          >
            {option === "light" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            <span>{copy[option]}</span>
            <Check size={14} aria-hidden="true" className={theme === option ? styles.check : styles.hiddenCheck} />
          </button>
        ))}
      </div>
    </div>
  );
}
