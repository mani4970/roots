"use client";

import LegalDocumentPage from "@/components/LegalDocumentPage";
import { useLang } from "@/lib/useLang";

const COPY = {
  ko: {
    back: "돌아가기",
    title: "법적 고지 (Impressum)",
    subtitle: "독일 DDG § 5에 따른 서비스 제공자 정보입니다. 법적 해석의 기준은 독일어 원문입니다.",
    sections: [
      { title: "서비스 제공자", paragraphs: ["Chungman Jeong\nHauptstraße 11\n65812 Bad Soden am Taunus\nDeutschland"] },
      { title: "연락처", paragraphs: ["이메일: support@christian-roots.com"] },
      { title: "사업자 정보", paragraphs: ["운영 주체는 개인입니다. 상업등기 등록과 VAT 식별번호가 없습니다."] },
      { title: "소비자 분쟁조정", paragraphs: ["서비스 제공자는 소비자 분쟁조정기관의 분쟁조정 절차에 참여할 의사가 없으며 참여 의무도 없습니다."] },
      { title: "개인정보", paragraphs: ["개인정보 처리에 관한 자세한 내용은 앱과 웹사이트의 개인정보처리방침에서 확인할 수 있습니다."] },
    ],
  },
  de: {
    back: "Zurück",
    title: "Impressum",
    subtitle: "Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)",
    sections: [
      { title: "Diensteanbieter", paragraphs: ["Chungman Jeong\nHauptstraße 11\n65812 Bad Soden am Taunus\nDeutschland"] },
      { title: "Kontakt", paragraphs: ["E-Mail: support@christian-roots.com"] },
      { title: "Unternehmensangaben", paragraphs: ["Der Dienst wird von einer natürlichen Person betrieben. Es besteht keine Eintragung in ein Handelsregister und keine Umsatzsteuer-Identifikationsnummer."] },
      { title: "Verbraucherstreitbeilegung", paragraphs: ["Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."] },
      { title: "Datenschutz", paragraphs: ["Informationen zur Verarbeitung personenbezogener Daten finden Sie in der Datenschutzerklärung der App und der Website."] },
    ],
  },
  en: {
    back: "Back",
    title: "Legal Notice (Impressum)",
    subtitle: "Provider information under Section 5 of the German Digital Services Act (DDG). The German version is authoritative for legal interpretation.",
    sections: [
      { title: "Service provider", paragraphs: ["Chungman Jeong\nHauptstraße 11\n65812 Bad Soden am Taunus\nGermany"] },
      { title: "Contact", paragraphs: ["Email: support@christian-roots.com"] },
      { title: "Business information", paragraphs: ["The service is operated by an individual. There is no commercial-register entry and no VAT identification number."] },
      { title: "Consumer dispute resolution", paragraphs: ["The provider is neither willing nor obliged to participate in dispute-resolution proceedings before a consumer arbitration board."] },
      { title: "Privacy", paragraphs: ["Details about personal-data processing are available in the Privacy Policy in the app and on the website."] },
    ],
  },
  fr: {
    back: "Retour",
    title: "Mentions légales (Impressum)",
    subtitle: "Informations du fournisseur conformément à l’article 5 de la loi allemande sur les services numériques (DDG). La version allemande fait foi pour l’interprétation juridique.",
    sections: [
      { title: "Fournisseur du service", paragraphs: ["Chungman Jeong\nHauptstraße 11\n65812 Bad Soden am Taunus\nAllemagne"] },
      { title: "Contact", paragraphs: ["E-mail : support@christian-roots.com"] },
      { title: "Informations sur l’activité", paragraphs: ["Le service est exploité par une personne physique. Il n’existe ni inscription au registre du commerce ni numéro d’identification à la TVA."] },
      { title: "Règlement des litiges de consommation", paragraphs: ["Le fournisseur n’est ni disposé ni obligé à participer à une procédure de règlement des litiges devant un organisme de médiation des consommateurs."] },
      { title: "Confidentialité", paragraphs: ["Les informations relatives au traitement des données personnelles figurent dans la Politique de confidentialité de l’app et du site web."] },
    ],
  },
} as const;

export default function ImpressumPage() {
  const lang = useLang();
  const copy = COPY[lang] ?? COPY.ko;

  return (
    <LegalDocumentPage
      backLabel={copy.back}
      title={copy.title}
      subtitle={copy.subtitle}
      sections={copy.sections}
    />
  );
}
