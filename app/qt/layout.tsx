"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { QTDesktopContext } from "./QTDesktopContext";
import { usePathname } from "next/navigation";
import BottomNav, { NavLinks } from "@/components/BottomNav";
import { FALLBACK_LANG } from "@/lib/i18n";

export default function QTLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isReadingPage = path === "/qt" || path === "/qt/record";
  const [wideDesktop, setWideDesktop] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    if (!document.documentElement.hasAttribute("data-roots-desktop-client")) {
      setWideDesktop(false);
      return;
    }
    const width = window.matchMedia("(min-width: 960px)");
    const update = () => setWideDesktop(width.matches);
    update();
    width.addEventListener("change", update);
    return () => width.removeEventListener("change", update);
  }, []);

  return (
    <div className="roots-qt-shell">
      {(isReadingPage || wideDesktop) && <BottomNav />}
      {!isReadingPage && wideDesktop === null && (
        <NavLinks lang={FALLBACK_LANG} path={path} desktopPlaceholder />
      )}
      <div className="roots-qt-desktop-content" data-reading-page={isReadingPage}>
        <QTDesktopContext.Provider value={wideDesktop === true}>
          {children}
        </QTDesktopContext.Provider>
      </div>
    </div>
  );
}
