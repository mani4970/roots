"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { getLanguageOptions, LANG_META, t, type Lang } from "@/lib/i18n";
import ObservationPopup from "@/components/ObservationPopup";
import styles from "./HomeHeader.module.css";

type HeaderMenu = "language" | null;

type HomeHeaderProps = {
  children: ReactNode;
  userId?: string | null;
  lang: Lang;
  menu: HeaderMenu;
  onMenuChange: (menu: HeaderMenu) => void;
  onLanguageChange: (lang: Lang) => void;
};

export default function HomeHeader({ children, userId, lang, menu, onMenuChange, onLanguageChange }: HomeHeaderProps) {
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const previousMenuRef = useRef<HeaderMenu>(null);
  const restoreFocusRef = useRef(true);

  useEffect(() => {
    if (menu) {
      const selected = menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]');
      selected?.focus({ preventScroll: true });
    } else if (previousMenuRef.current && restoreFocusRef.current) {
      languageButtonRef.current?.focus({ preventScroll: true });
    }
    previousMenuRef.current = menu;
    restoreFocusRef.current = true;
  }, [menu]);

  function closeMenu(restoreFocus = true) {
    restoreFocusRef.current = restoreFocus;
    onMenuChange(null);
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }
    if (event.key === "Tab") {
      closeMenu(false);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
    items[next]?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>, target: Exclude<HeaderMenu, null>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      onMenuChange(target);
    }
  }

  return (
    <div className={styles.header}>
      <div className={`${styles.title} header-title`}>{children}</div>
      <div className={styles.controls} data-open={menu !== null}>
        {menu && <div className={styles.backdrop} onClick={() => closeMenu()} aria-hidden="true" />}
        <div className={styles.control}>
          <button
            ref={languageButtonRef}
            type="button"
            className={styles.trigger}
            aria-label={`${t("auth_language_aria", lang)}: ${LANG_META[lang].nativeName}`}
            aria-haspopup="menu"
            aria-expanded={menu === "language"}
            aria-controls={menu === "language" ? "home-language-menu" : undefined}
            onClick={() => onMenuChange(menu === "language" ? null : "language")}
            onKeyDown={event => handleTriggerKeyDown(event, "language")}
          >
            <Globe size={15} aria-hidden="true" />
            <span lang={lang}>{LANG_META[lang].nativeName}</span>
            <ChevronDown size={12} className={menu === "language" ? styles.chevronOpen : undefined} aria-hidden="true" />
          </button>
          <ObservationPopup userId={userId} kind="language_picker" queued={menu === "language"} instanceKey="home_menu">
            {menu === "language" && (
              <div ref={menuRef} id="home-language-menu" role="menu" aria-label={t("auth_language_aria", lang)} className={`${styles.menu} roots-elevation-popover`} onKeyDown={handleMenuKeyDown}>
                {getLanguageOptions().map(option => (
                  <button key={option.code} type="button" role="menuitemradio" aria-checked={lang === option.code} tabIndex={-1} className={styles.option} onClick={() => onLanguageChange(option.code)}>
                    <span lang={option.code}>{option.nativeName}</span>
                    {lang === option.code && <Check size={16} className={styles.check} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </ObservationPopup>
        </div>
      </div>
    </div>
  );
}
