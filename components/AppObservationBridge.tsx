"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { flushObservations, observationVisibilityChanged, reportObservationClientError, setObservationUser } from "@/lib/appObservation";

export default function AppObservationBridge() {
  useEffect(() => {
    let disposed = false;
    let authVersion = 0;
    let unsubscribe: (() => void) | undefined;
    const onError = (event: ErrorEvent) => reportObservationClientError("unhandled_error", event.error);
    const onRejection = (event: PromiseRejectionEvent) => reportObservationClientError("unhandled_rejection", event.reason);
    const onOnline = () => { void flushObservations(); };
    const onPageHide = () => { void flushObservations(true); };
    try {
      const supabase = createClient();
      const initialVersion = authVersion;
      void supabase.auth.getSession().then(({ data }) => {
        if (!disposed && authVersion === initialVersion) setObservationUser(data.session?.user.id ?? null);
      }).catch(() => {});
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        authVersion += 1;
        if (!disposed) setObservationUser(session?.user.id ?? null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      window.addEventListener("error", onError);
      window.addEventListener("unhandledrejection", onRejection);
      window.addEventListener("online", onOnline);
      window.addEventListener("pagehide", onPageHide);
      document.addEventListener("visibilitychange", observationVisibilityChanged);
    } catch { /* Failure to initialize monitoring must not break the app. */ }
    return () => {
      disposed = true;
      try { unsubscribe?.(); } catch { /* Observation cleanup is best-effort. */ }
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", observationVisibilityChanged);
    };
  }, []);
  return null;
}
