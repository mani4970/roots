"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/useLang";

const COPY = {
  ko: {
    back: "돌아가기",
    title: "Impressum",
    sub: "독일 법률에 따른 서비스 제공자 정보입니다.",
    legalNote: "아래 법적 고지의 기준 언어는 독일어입니다.",
    responsible: "책임자",
    contact: "연락처",
    disclaimer: "면책 고지",
    privacy: "개인정보",
    dispute: "분쟁 해결",
    englishNotice: "영문 법적 안내",
    disclaimerBody:
      "서비스 제공자는 독일 TMG § 7 Abs.1에 따라 본 앱의 자체 콘텐츠에 대해 일반 법률에 따른 책임을 집니다. TMG §§ 8–10에 따라 전송되거나 저장된 외부 정보를 감시하거나 위법 행위를 나타내는 정황을 조사할 일반적인 의무는 없습니다. 일반 법률에 따른 정보 삭제 또는 차단 의무는 영향을 받지 않습니다.",
    privacyBody:
      "앱 이용 과정에서 필요한 범위의 개인정보가 처리될 수 있습니다. 자세한 내용은 개인정보처리방침을 확인해 주세요. 인터넷을 통한 데이터 전송에는 보안상 한계가 있을 수 있습니다.",
    disputeBody:
      "유럽연합 집행위원회는 온라인 분쟁 해결 플랫폼을 제공합니다: https://ec.europa.eu/consumers/odr. 당사는 소비자 분쟁 조정 절차에 참여할 의무가 없으며 참여할 의사가 없습니다.",
    englishBody:
      "Responsible for the content of this app pursuant to § 5 TMG (German Telemedia Act):",
    externalBody:
      "Despite careful content control, we assume no liability for the content of external links. The operators of linked pages are solely responsible for their content.",
  },
  de: {
    back: "Zurück",
    title: "Impressum",
    sub: "Angaben gemäß § 5 TMG",
    legalNote: "Diese Seite enthält die rechtlich relevanten Anbieterinformationen.",
    responsible: "Verantwortlicher",
    contact: "Kontakt",
    disclaimer: "Haftungsausschluss",
    privacy: "Datenschutz",
    dispute: "Streitschlichtung",
    englishNotice: "English / Legal Notice",
    disclaimerBody:
      "Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.",
    privacyBody:
      "Soweit personenbezogene Daten im Rahmen der App-Nutzung verarbeitet werden, erfolgt dies im erforderlichen Umfang. Weitere Informationen finden Sie in unserer Datenschutzerklärung. Wir weisen darauf hin, dass die Datenübertragung im Internet Sicherheitslücken aufweisen kann.",
    disputeBody:
      "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
    englishBody:
      "Responsible for the content of this app pursuant to § 5 TMG (German Telemedia Act):",
    externalBody:
      "Despite careful content control, we assume no liability for the content of external links. The operators of linked pages are solely responsible for their content.",
  },
  en: {
    back: "Back",
    title: "Impressum",
    sub: "Provider information required under German law.",
    legalNote: "The German legal notice is the authoritative version of this page.",
    responsible: "Responsible party",
    contact: "Contact",
    disclaimer: "Disclaimer",
    privacy: "Privacy",
    dispute: "Dispute resolution",
    englishNotice: "Legal notice",
    disclaimerBody:
      "As a service provider, we are responsible for our own content in accordance with § 7(1) TMG and general German law. Under §§ 8–10 TMG, we are not obliged to monitor transmitted or stored third-party information or investigate circumstances indicating unlawful activity. Obligations to remove or block the use of information under general law remain unaffected.",
    privacyBody:
      "Personal data may be processed where necessary for the use of the app. Please see our privacy policy for details. Data transmission over the internet may have security limitations.",
    disputeBody:
      "The European Commission provides an online dispute resolution platform: https://ec.europa.eu/consumers/odr. We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.",
    englishBody:
      "Responsible for the content of this app pursuant to § 5 TMG (German Telemedia Act):",
    externalBody:
      "Despite careful content control, we assume no liability for the content of external links. The operators of linked pages are solely responsible for their content.",
  },
  fr: {
    back: "Retour",
    title: "Impressum",
    sub: "Informations du fournisseur requises par le droit allemand.",
    legalNote: "La version juridique de référence de cette page est l’allemand.",
    responsible: "Responsable",
    contact: "Contact",
    disclaimer: "Clause de non-responsabilité",
    privacy: "Confidentialité",
    dispute: "Règlement des litiges",
    englishNotice: "Notice légale",
    disclaimerBody:
      "En tant que fournisseur de services, nous sommes responsables de nos propres contenus conformément au § 7(1) TMG et au droit allemand général. Selon les §§ 8–10 TMG, nous ne sommes pas tenus de surveiller les informations de tiers transmises ou stockées ni de rechercher des circonstances indiquant une activité illicite. Les obligations de retrait ou de blocage prévues par la loi demeurent inchangées.",
    privacyBody:
      "Des données personnelles peuvent être traitées lorsque cela est nécessaire à l’utilisation de l’application. Veuillez consulter notre politique de confidentialité pour plus de détails. La transmission de données sur Internet peut présenter des limites de sécurité.",
    disputeBody:
      "La Commission européenne met à disposition une plateforme de règlement en ligne des litiges : https://ec.europa.eu/consumers/odr. Nous ne sommes ni disposés ni obligés à participer à une procédure de règlement des litiges devant un organisme de médiation des consommateurs.",
    englishBody:
      "Responsible for the content of this app pursuant to § 5 TMG (German Telemedia Act):",
    externalBody:
      "Despite careful content control, we assume no liability for the content of external links. The operators of linked pages are solely responsible for their content.",
  },
} as const;

export default function ImpressumPage() {
  const router = useRouter();
  const lang = useLang();
  const c = COPY[lang] ?? COPY.ko;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "56px 24px 60px" }}>
      <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{c.back}</span>
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{c.title}</h1>
      <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, marginBottom: 6 }}>{c.sub}</p>
      <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.7, marginBottom: 28 }}>{c.legalNote}</p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{c.responsible}</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          Chungman Jeong<br />
          Hauptstraße 11<br />
          65812 Bad Soden am Taunus<br />
          Deutschland
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{c.contact}</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
          E-Mail: cookiko313@gmail.com
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{c.disclaimer}</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>{c.disclaimerBody}</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{c.privacy}</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>{c.privacyBody}</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{c.dispute}</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>{c.disputeBody}</p>
      </section>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{c.englishNotice}</h2>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, marginBottom: 12 }}>{c.englishBody}</p>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, marginBottom: 12 }}>
          Chungman Jeong<br />
          Hauptstraße 11, 65812 Bad Soden am Taunus, Germany<br />
          Email: cookiko313@gmail.com
        </p>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>{c.externalBody}</p>
      </div>
    </div>
  );
}
