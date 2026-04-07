"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/", label: "홈",
    icon: <svg viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
  },
  {
    href: "/prayer", label: "기도",
    icon: <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
  },
  {
    href: "/qt", label: "큐티",
    icon: <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
  },
  {
    href: "/community", label: "커뮤니티",
    icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
  },
  {
    href: "/profile", label: "프로필",
    icon: <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav">
      {NAV.map(({ href, icon, label }) => {
        const active = path === href || (href !== "/" && path.startsWith(href));
        return (
          <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
            {icon}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
