"use client";

import Link from "next/link";
import LegalDocumentPage from "@/components/LegalDocumentPage";
import { useLang } from "@/lib/useLang";

const SUPPORT_EMAIL = "support@christian-roots.com";

const COPY = {
  ko: {
    back: "돌아가기",
    title: "고객지원",
    subtitle: "Roots 이용 중 문제가 있거나 도움이 필요하면 연락해 주세요.",
    subject: "Roots 고객지원 문의",
    mail: "지원 이메일 보내기",
    privacy: "개인정보처리방침",
    deletion: "계정 삭제 안내",
    sections: [
      { title: "문의 이메일", paragraphs: [SUPPORT_EMAIL] },
      { title: "빠른 확인을 위해", paragraphs: ["계정 이메일, 기기 종류, 운영체제와 앱 버전, 문제가 발생한 화면과 재현 방법을 보내주시면 확인에 도움이 됩니다. 오류 화면은 개인정보를 가린 뒤 첨부해 주세요."] },
      { title: "보내지 말아야 할 정보", paragraphs: ["비밀번호, 로그인 코드, API 키, 결제 정보 또는 문의 해결에 필요하지 않은 묵상·기도 전문을 이메일로 보내지 마세요."] },
      { title: "계정과 개인정보 요청", paragraphs: ["앱에 로그인할 수 있다면 프로필의 계정 관리에서 직접 계정을 삭제할 수 있습니다. 열람, 정정, 삭제, 이동과 그 밖의 개인정보 요청은 이메일로 접수할 수 있으며 계정 보호를 위해 본인 확인을 요청할 수 있습니다."] },
    ],
  },
  de: {
    back: "Zurück",
    title: "Support",
    subtitle: "Kontaktieren Sie uns, wenn Sie Hilfe mit Roots benötigen oder ein Problem melden möchten.",
    subject: "Roots Supportanfrage",
    mail: "Support-E-Mail senden",
    privacy: "Datenschutzerklärung",
    deletion: "Kontolöschung",
    sections: [
      { title: "Support-E-Mail", paragraphs: [SUPPORT_EMAIL] },
      { title: "Für eine schnelle Prüfung", paragraphs: ["Hilfreich sind Ihre Konto-E-Mail, Gerätetyp, Betriebssystem und App-Version sowie der betroffene Bildschirm und Schritte zur Wiederholung. Bitte verdecken Sie personenbezogene Daten auf Screenshots."] },
      { title: "Nicht per E-Mail senden", paragraphs: ["Senden Sie keine Passwörter, Anmeldecodes, API-Schlüssel, Zahlungsdaten oder vollständigen Einträge zur Stillen Zeit und Gebete, die für die Bearbeitung nicht erforderlich sind."] },
      { title: "Konto- und Datenschutzanfragen", paragraphs: ["Wenn Sie sich anmelden können, löschen Sie Ihr Konto direkt in der Kontoverwaltung des Profils. Auskunft, Berichtigung, Löschung, Übertragung und andere Datenschutzanfragen können per E-Mail gestellt werden. Zum Schutz des Kontos kann ein Identitätsnachweis erforderlich sein."] },
    ],
  },
  en: {
    back: "Back",
    title: "Support",
    subtitle: "Contact us if you need help with Roots or want to report a problem.",
    subject: "Roots support request",
    mail: "Send support email",
    privacy: "Privacy Policy",
    deletion: "Account deletion",
    sections: [
      { title: "Support email", paragraphs: [SUPPORT_EMAIL] },
      { title: "Help us investigate", paragraphs: ["Include your account email, device type, operating system and app version, the affected screen, and steps to reproduce the issue. Please hide personal information in screenshots."] },
      { title: "Do not send", paragraphs: ["Do not email passwords, sign-in codes, API keys, payment details, or full reflection and prayer content that is not necessary to resolve the request."] },
      { title: "Account and privacy requests", paragraphs: ["If you can sign in, delete the account directly from Profile account management. Access, correction, deletion, portability, and other privacy requests may be sent by email. We may verify identity to protect the account."] },
    ],
  },
  fr: {
    back: "Retour",
    title: "Assistance",
    subtitle: "Contactez-nous si vous avez besoin d’aide avec Roots ou souhaitez signaler un problème.",
    subject: "Demande d’assistance Roots",
    mail: "Envoyer un e-mail",
    privacy: "Politique de confidentialité",
    deletion: "Suppression du compte",
    sections: [
      { title: "E-mail d’assistance", paragraphs: [SUPPORT_EMAIL] },
      { title: "Pour faciliter la vérification", paragraphs: ["Indiquez l’e-mail du compte, le type d’appareil, le système et la version de l’app, l’écran concerné et les étapes permettant de reproduire le problème. Masquez les données personnelles sur les captures."] },
      { title: "Informations à ne pas envoyer", paragraphs: ["N’envoyez pas de mots de passe, codes de connexion, clés API, données de paiement ni le texte complet de méditations ou prières sans rapport avec la demande."] },
      { title: "Compte et demandes de confidentialité", paragraphs: ["Si vous pouvez vous connecter, supprimez directement le compte dans la gestion du profil. Les demandes d’accès, rectification, suppression, portabilité ou autres demandes peuvent être envoyées par e-mail. Une vérification d’identité peut être demandée."] },
    ],
  },
} as const;

export default function SupportPage() {
  const lang = useLang();
  const copy = COPY[lang] ?? COPY.ko;
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(copy.subject)}`;

  return (
    <LegalDocumentPage
      backLabel={copy.back}
      title={copy.title}
      subtitle={copy.subtitle}
      sections={copy.sections}
      topAction={(
        <a href={mailto} style={{ display: "inline-flex", minHeight: 44, alignItems: "center", justifyContent: "center", marginBottom: 26, padding: "0 18px", borderRadius: 14, background: "var(--sage)", color: "var(--bg)", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
          {copy.mail}
        </a>
      )}
      bottomAction={(
        <nav aria-label={copy.title} style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 8 }}>
          <Link href="/privacy" style={{ display: "flex", minHeight: 44, alignItems: "center", justifyContent: "center", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 14, color: "var(--sage-dark)", fontSize: 12, fontWeight: 800, textAlign: "center", textDecoration: "none" }}>{copy.privacy}</Link>
          <Link href="/account-deletion" style={{ display: "flex", minHeight: 44, alignItems: "center", justifyContent: "center", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 14, color: "var(--sage-dark)", fontSize: 12, fontWeight: 800, textAlign: "center", textDecoration: "none" }}>{copy.deletion}</Link>
        </nav>
      )}
    />
  );
}
