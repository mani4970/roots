"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, BookOpen, BookMarked, User } from "lucide-react";

const NAV = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/prayer", icon: Heart, label: "기도" },
  { href: "/qt", icon: BookOpen, label: "큐티" },
  { href: "/journal", icon: BookMarked, label: "기록" },
  { href: "/profile", icon: User, label: "프로필" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav">
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = path === href;
        return (
          <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span>{label}</span>
            {active && <span className="nav-dot" />}
          </Link>
        );
      })}
    </nav>
  );
}
