"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type BottomNavSession = {
  hasShownNavigation: boolean;
  markNavigationShown: () => void;
};

const BottomNavSessionContext = createContext<BottomNavSession>({
  hasShownNavigation: false,
  markNavigationShown: () => {},
});

/** Presentation state for this document only; a fresh app load starts hidden. */
export default function BottomNavSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = /^\/(welcome|login|signup|reset-password|auth)(\/|$)/.test(pathname ?? "");
  const [hasShownNavigation, setHasShownNavigation] = useState(false);

  useEffect(() => {
    if (isAuthRoute) setHasShownNavigation(false);
  }, [isAuthRoute]);

  const markNavigationShown = useCallback(() => {
    if (!isAuthRoute) setHasShownNavigation(true);
  }, [isAuthRoute]);

  const value = useMemo(() => ({
    hasShownNavigation: !isAuthRoute && hasShownNavigation,
    markNavigationShown,
  }), [isAuthRoute, hasShownNavigation, markNavigationShown]);

  return <BottomNavSessionContext.Provider value={value}>{children}</BottomNavSessionContext.Provider>;
}

export function useBottomNavSession() {
  return useContext(BottomNavSessionContext);
}
