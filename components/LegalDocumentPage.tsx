"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export type LegalDocumentSection = {
  title: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
};

type LegalDocumentPageProps = {
  backLabel: string;
  title: string;
  subtitle: string;
  updatedLabel?: string;
  sections: readonly LegalDocumentSection[];
  topAction?: ReactNode;
  bottomAction?: ReactNode;
};

export default function LegalDocumentPage({
  backLabel,
  title,
  subtitle,
  updatedLabel,
  sections,
  topAction,
  bottomAction,
}: LegalDocumentPageProps) {
  const router = useRouter();

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "var(--roots-page-top-padding) 24px 60px" }}>
      <div style={{ width: "100%", maxWidth: 720, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 4, minHeight: 40, marginBottom: 16, padding: "0 8px 0 0", background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}
        >
          <ChevronLeft size={18} />
          <span style={{ fontSize: 13 }}>{backLabel}</span>
        </button>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{title}</h1>
        <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, marginBottom: updatedLabel ? 4 : 24 }}>{subtitle}</p>
        {updatedLabel && <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 28 }}>{updatedLabel}</p>}

        {topAction}

        {sections.map(section => (
          <section key={section.title} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{section.title}</h2>
            {section.paragraphs?.map(paragraph => (
              <p key={paragraph} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.85, marginBottom: 8, whiteSpace: "pre-line" }}>
                {paragraph}
              </p>
            ))}
            {section.items && (
              <ul style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.85, paddingLeft: 20 }}>
                {section.items.map(item => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}

        {bottomAction}
      </div>
    </main>
  );
}
