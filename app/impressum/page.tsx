"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function ImpressumPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "56px 24px 60px" }}>
      <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>돌아가기</span>
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>Impressum</h1>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 28 }}>Angaben gemäß § 5 TMG</p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Verantwortlicher</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          Chungman Jeong<br />
          Hauptstraße 11<br />
          65812 Bad Soden am Taunus<br />
          Deutschland
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Kontakt</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          E-Mail: cookiko313@gmail.com
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Haftungsausschluss</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den
          allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
          verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
          zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder
          Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Datenschutz</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          Die Nutzung unserer App ist in der Regel ohne Angabe personenbezogener Daten möglich.
          Soweit personenbezogene Daten erhoben werden, erfolgt dies auf freiwilliger Basis.
          Diese Daten werden ohne Ihre ausdrückliche Zustimmung nicht an Dritte weitergegeben.
          Wir weisen darauf hin, dass die Datenübertragung im Internet Sicherheitslücken aufweisen kann.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Streitschlichtung</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
          https://ec.europa.eu/consumers/odr. Wir sind nicht bereit oder verpflichtet,
          an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>English / Legal Notice</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, marginBottom: 12 }}>
          Responsible for the content of this app pursuant to § 5 TMG (German Telemedia Act):
        </p>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, marginBottom: 12 }}>
          Chungman Jeong<br />
          Hauptstraße 11, 65812 Bad Soden am Taunus, Germany<br />
          Email: cookiko313@gmail.com
        </p>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          Despite careful content control, we assume no liability for the content of external links.
          The operators of linked pages are solely responsible for their content.
        </p>
      </div>
    </div>
  );
}
