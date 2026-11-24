"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavLinks } from "@/components/BottomNav";
import { useCommentNotifications } from "@/components/notifications/CommentNotificationsProvider";
import { useDesktopLayout } from "@/lib/desktopLayout";
import type { Lang } from "@/lib/i18n";
import {
  hasProfileDocumentEntry,
  markProfileDocumentEntry,
  rememberProfileDocumentNavigation,
} from "@/lib/profileDocumentNavigation";
import "./legal-document.css";

const backToProfile: Record<Lang, string> = {
  ko: "프로필로 돌아가기",
  en: "Back to profile",
  de: "Zurück zum Profil",
  fr: "Retour au profil",
  es: "Volver al perfil",
};

export type LegalDocumentSection = {
  title: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
};

type LegalDocumentPageProps = {
  lang: Lang;
  backLabel: string;
  title: string;
  subtitle: string;
  updatedLabel?: string;
  sections: readonly LegalDocumentSection[];
  topAction?: ReactNode;
  relatedLinks?: ReadonlyArray<{ href: string; label: string }>;
};

export default function LegalDocumentPage({
  lang,
  backLabel,
  title,
  subtitle,
  updatedLabel,
  sections,
  topAction,
  relatedLinks,
}: LegalDocumentPageProps) {
  const router = useRouter();
  const desktop = useDesktopLayout();
  const [profileEntry, setProfileEntry] = useState(false);
  const fromProfile = desktop && profileEntry;
  useLayoutEffect(() => {
    // Read after Next commits the new URL on client-side navigation.
    function syncOrigin() {
      setProfileEntry(new URLSearchParams(window.location.search).get("from") === "profile");
    }
    markProfileDocumentEntry();
    syncOrigin();
    window.addEventListener("popstate", syncOrigin);
    return () => window.removeEventListener("popstate", syncOrigin);
  }, []);
  const { unread } = useCommentNotifications();

  function goBack() {
    if (fromProfile && !hasProfileDocumentEntry()) {
      router.replace("/profile#profile-legal-links");
      return;
    }
    router.back();
  }

  return (
    <>
      {fromProfile && <NavLinks lang={lang} path="/profile" unread={unread} />}
      <main className="legal-document" data-profile-sidebar={fromProfile || undefined} style={{ minHeight: "100vh", background: "var(--bg)", padding: "var(--roots-page-top-padding) 24px 60px" }}>
        <div className="legal-document-column" style={{ width: "100%", maxWidth: 720, margin: "0 auto" }}>
          <button
            type="button"
            onClick={goBack}
            style={{ display: "flex", alignItems: "center", gap: 4, minHeight: 40, marginBottom: 16, padding: "0 8px 0 0", background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}
          >
            <ChevronLeft size={18} />
            <span style={{ fontSize: 13 }}>{fromProfile ? backToProfile[lang] : backLabel}</span>
          </button>

          <article className="legal-document-body" aria-labelledby="legal-document-title" tabIndex={desktop ? 0 : undefined}>
            <h1 id="legal-document-title" style={{ fontSize: desktop ? 28 : 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{title}</h1>
            <p style={{ fontSize: desktop ? 15 : 13, color: "var(--text3)", lineHeight: 1.7, marginBottom: updatedLabel ? 4 : 24 }}>{subtitle}</p>
            {updatedLabel && <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 28 }}>{updatedLabel}</p>}

            {topAction}

            {sections.map(section => (
              <section key={section.title} style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: desktop ? 18 : 14, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{section.title}</h2>
                {section.paragraphs?.map(paragraph => (
                  <p key={paragraph} style={{ fontSize: desktop ? 16 : 13, color: "var(--text2)", lineHeight: 1.85, marginBottom: 8, whiteSpace: "pre-line" }}>
                    {paragraph}
                  </p>
                ))}
                {section.items && (
                  <ul style={{ fontSize: desktop ? 16 : 13, color: "var(--text2)", lineHeight: 1.85, paddingLeft: 20 }}>
                    {section.items.map(item => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
                  </ul>
                )}
              </section>
            ))}

            {relatedLinks && (
              <nav aria-label={title} style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 8 }}>
                {relatedLinks.map(({ href, label }) => (
                  <Link key={href} href={fromProfile ? `${href}?from=profile` : href} replace={fromProfile}
                    onNavigate={() => {
                      if (fromProfile && hasProfileDocumentEntry()) rememberProfileDocumentNavigation(href);
                    }}
                    style={{ display: "flex", minHeight: 44, alignItems: "center", justifyContent: "center", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 14, color: "var(--sage-dark)", fontSize: 12, fontWeight: 800, textAlign: "center", textDecoration: "none" }}>
                    {label}
                  </Link>
                ))}
              </nav>
            )}
          </article>
        </div>
      </main>
    </>
  );
}
