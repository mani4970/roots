"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/useLang";
import { t, type Lang } from "@/lib/i18n";
import { useCommentNotifications } from "@/components/notifications/CommentNotificationsProvider";
import { getCommentNotificationText } from "@/lib/notifications/commentNotificationText";

function BottomNavContent({ lang }: { lang: Lang }) {
  const path = usePathname();
  const { unread } = useCommentNotifications();

  const NAV = [
    {
      href: "/", label: t("nav_home", lang),
      icon: <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fillRule="evenodd" clipRule="evenodd" d="M11.35 2.55a1 1 0 0 1 1.3 0l9 7.5a1 1 0 0 1-.65 1.77H20v8.43A1.75 1.75 0 0 1 18.25 22H5.75A1.75 1.75 0 0 1 4 20.25v-8.43H3a1 1 0 0 1-.65-1.77l9-7.5ZM9.25 21h5.5v-7.25h-5.5V21Z"/></svg>
    },
    {
      href: "/prayer", label: t("nav_prayer", lang),
      icon: <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></svg>
    },
    {
      href: "/qt", label: t("nav_qt", lang),
      icon: <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fillRule="evenodd" clipRule="evenodd" d="M6.5 2H20v20H6.5A3.5 3.5 0 0 1 3 18.5v-13A3.5 3.5 0 0 1 6.5 2Zm0 15.5a1.5 1.5 0 0 0 0 3H18v-3H6.5Z"/></svg>
    },
    {
      href: "/community", label: t("nav_community", lang),
      icon: <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="8.5" cy="6.5" r="3.5"/><circle cx="17.5" cy="7" r="2.75"/><path d="M2 19a6.5 6.5 0 0 1 13 0v1.25A1.75 1.75 0 0 1 13.25 22h-9.5A1.75 1.75 0 0 1 2 20.25V19Zm15.5-7a5 5 0 0 1 5 5v3.5A1.5 1.5 0 0 1 21 22h-4v-3c0-2.4-.85-4.6-2.25-6.3.8-.45 1.75-.7 2.75-.7Z"/></svg>
    },
    {
      href: "/profile", label: t("nav_profile", lang),
      icon: <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="6.5" r="4"/><path d="M4 20a8 7 0 0 1 16 0v.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5V20Z"/></svg>
    },
  ];

  return (
    <nav className="bottom-nav">
      {NAV.map(({ href, icon, label }) => {
        const active = path === href || (href !== "/" && path.startsWith(href));
        return (
          <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}
            aria-label={href === "/community" && unread > 0 ? `${label}, ${getCommentNotificationText(lang).unread}` : undefined}>
            {href === "/community" ? <span style={{ position: "relative", display: "flex" }}>{icon}
              {unread > 0 && <span aria-hidden="true" style={{ position: "absolute", top: -2, right: -4, width: 7, height: 7, borderRadius: "50%", background: "var(--terra)", border: "1px solid var(--bg)" }} />}
            </span> : icon}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function LocalizedBottomNav() {
  const lang = useLang();
  return <BottomNavContent lang={lang} />;
}

/** Reuse the page language when it is already loaded, including its auth sync. */
export default function BottomNav({ lang }: { lang?: Lang }) {
  return lang ? <BottomNavContent lang={lang} /> : <LocalizedBottomNav />;
}
