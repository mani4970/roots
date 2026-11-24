"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { QTDesktopContext } from "./QTDesktopContext";
import { usePathname } from "next/navigation";
import BottomNav, { NavLinks } from "@/components/BottomNav";
import { isDesktopLayout, subscribeToDesktopLayout } from "@/lib/desktopLayout";
import { FALLBACK_LANG } from "@/lib/i18n";

export default function QTLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isReadingPage = path === "/qt" || path === "/qt/record";
  const [wideDesktop, setWideDesktop] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    const update = () => setWideDesktop(isDesktopLayout());
    update();
    return subscribeToDesktopLayout(update);
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
