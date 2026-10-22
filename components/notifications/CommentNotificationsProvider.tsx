"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase";
import {
  COMMENT_NOTIFICATION_CHANGED,
  COMMENT_NOTIFICATION_INTENT,
  commentNotificationLink,
  isCommentNotificationId,
} from "@/lib/notifications/commentNotifications";
import { usePathname, useRouter } from "next/navigation";

const Context = createContext({ unread: 0, refresh: () => {} });
export const useCommentNotifications = () => useContext(Context);

export default function CommentNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [unread, setUnread] = useState(0);
  const [account, setAccount] = useState<string | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  const router = useRouter();
  const pathname = usePathname();
  const refresh = useCallback(() => refreshRef.current(), []);
  useEffect(() => {
    const client = createClient();
    let active = true,
      userId: string | null = null,
      epoch = 0,
      inFlight = false,
      again = false;
    let startTimer: number | undefined;
    const reload = () => {
      if (!active || !userId || document.visibilityState === "hidden") return;
      if (inFlight) {
        again = true;
        return;
      }
      inFlight = true;
      const requestEpoch = epoch;
      void Promise.resolve(
        client.rpc("get_qt_comment_notification_unread_count"),
      )
        .then(({ data, error }) => {
          if (active && requestEpoch === epoch && !error)
            setUnread(Math.max(0, Number(data) || 0));
        })
        .catch(() => {})
        .finally(() => {
          inFlight = false;
          if (again) {
            again = false;
            reload();
          }
        });
    };
    refreshRef.current = reload;
    const acceptUser = (id: string | null) => {
      if (!active || id === userId) return;
      userId = id;
      epoch++;
      setAccount(id);
      setUnread(0);
      if (startTimer !== undefined) window.clearTimeout(startTimer);
      // Never make the home/feed's first render wait for a notification count.
      if (id) startTimer = window.setTimeout(reload, 800);
    };
    let authEventSeen = false;
    void client.auth
      .getSession()
      .then(({ data }) => {
        if (!authEventSeen) acceptUser(data.session?.user.id ?? null);
      })
      .catch(() => {});
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      authEventSeen = true;
      acceptUser(session?.user.id ?? null);
    });
    window.addEventListener("focus", reload);
    window.addEventListener(COMMENT_NOTIFICATION_CHANGED, reload);
    document.addEventListener("visibilitychange", reload);
    const timer = window.setInterval(reload, 30000);
    return () => {
      active = false;
      epoch++;
      refreshRef.current = () => {};
      subscription.unsubscribe();
      window.clearInterval(timer);
      if (startTimer !== undefined) window.clearTimeout(startTimer);
      window.removeEventListener("focus", reload);
      window.removeEventListener(COMMENT_NOTIFICATION_CHANGED, reload);
      document.removeEventListener("visibilitychange", reload);
    };
  }, [router]);
  useEffect(() => {
    // Let the existing sign-in/onboarding navigation finish first. The community
    // screen clears this intent only after it has an authenticated account.
    if (
      !account ||
      !pathname ||
      /^\/(login|signup|auth|reset-password|welcome)(\/|$)/.test(pathname)
    )
      return;
    try {
      const id = sessionStorage.getItem(COMMENT_NOTIFICATION_INTENT);
      if (isCommentNotificationId(id))
        router.replace(commentNotificationLink(id));
    } catch {}
  }, [account, pathname, router]);
  return (
    <Context.Provider value={{ unread, refresh }}>{children}</Context.Provider>
  );
}
