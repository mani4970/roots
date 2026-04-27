"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/useLang";


const COPY = {
  ko: {
    title: "이용약관",
    sub: "Roots를 사용하기 전에 확인해 주세요.",
    updated: "최종 수정일: 2026년 4월 27일",
    sections: [
      ["1. 서비스 목적", "Roots는 말씀 묵상, QT 기록, 기도 제목 관리, 신앙 루틴 형성을 돕기 위한 크리스천 앱입니다."],
      ["2. 사용자 책임", "사용자는 본인이 입력한 QT 기록, 기도 제목, 커뮤니티 공유 내용에 대한 책임을 집니다. 공개 공유 전에는 민감한 개인정보가 포함되지 않았는지 확인해 주세요."],
      ["3. 신앙 콘텐츠", "오늘의 말씀은 사용자가 선택한 감정/상태에 맞춰 미리 정리된 성경 구절을 성경 API로 불러오는 방식으로 제공됩니다. 앱의 콘텐츠는 목회 상담, 의료 상담, 법률 상담을 대체하지 않습니다."],
      ["4. 커뮤니티", "서로를 존중하는 언어를 사용해 주세요. 비방, 혐오, 스팸, 타인의 개인정보 노출은 제한될 수 있습니다."],
      ["5. 계정 및 데이터", "사용자는 프로필에서 계정을 삭제할 수 있습니다. 계정 삭제 시 QT 기록, 기도 제목, 체크인 기록 등 계정과 연결된 데이터가 삭제될 수 있습니다."],
      ["6. 문의", "서비스 이용 관련 문의는 지원 페이지를 통해 연락해 주세요."],
    ],
    back: "돌아가기",
  },
  de: {
    title: "Nutzungsbedingungen",
    sub: "Bitte lesen Sie diese Hinweise vor der Nutzung von Roots.",
    updated: "Zuletzt aktualisiert: 27. April 2026",
    sections: [
      ["1. Zweck des Dienstes", "Roots ist eine christliche App für Bibelmeditation, QT-Notizen, Gebetsanliegen und tägliche Glaubensroutinen."],
      ["2. Verantwortung der Nutzer", "Nutzer sind für eigene QT-Notizen, Gebetsanliegen und geteilte Inhalte verantwortlich. Bitte prüfen Sie vor dem Teilen, ob sensible persönliche Daten enthalten sind."],
      ["3. Glaubensinhalte", "Der Tagesvers wird aus vorab kuratierten Bibelstellen passend zur gewählten Stimmung ausgewählt und über eine Bibel-API geladen. Die App ersetzt keine seelsorgerliche, medizinische oder rechtliche Beratung."],
      ["4. Community", "Bitte verwenden Sie eine respektvolle Sprache. Beleidigungen, Hass, Spam oder das Offenlegen fremder personenbezogener Daten können eingeschränkt werden."],
      ["5. Konto und Daten", "Sie können Ihr Konto im Profil löschen. Dabei können QT-Notizen, Gebetsanliegen und Check-in-Daten entfernt werden."],
      ["6. Kontakt", "Für Fragen nutzen Sie bitte die Support-Seite."],
    ],
    back: "Zurück",
  },
  en: {
    title: "Terms of Use",
    sub: "Please read these terms before using Roots.",
    updated: "Last updated: April 27, 2026",
    sections: [
      ["1. Purpose", "Roots is a Christian app for Scripture meditation, QT records, prayer requests, and daily faith routines."],
      ["2. User responsibility", "You are responsible for the QT records, prayer requests, and community content you enter or share. Please avoid sharing sensitive personal information publicly."],
      ["3. Faith content", "The daily verse is selected from pre-curated Scripture references based on the emotion or state you choose, then loaded through a Bible API. Roots does not replace pastoral, medical, legal, or emergency support."],
      ["4. Community", "Use respectful language. Abuse, hate, spam, or exposing another person’s private information may be restricted."],
      ["5. Account and data", "You may delete your account from the Profile page. Deletion may remove QT records, prayer requests, and check-in data linked to your account."],
      ["6. Contact", "For help, please use the Support page."],
    ],
    back: "Back",
  },
  fr: {
    title: "Conditions d’utilisation",
    sub: "Veuillez lire ces informations avant d’utiliser Roots.",
    updated: "Dernière mise à jour : 27 avril 2026",
    sections: [
      ["1. Objet du service", "Roots est une application chrétienne pour la méditation biblique, les notes de QT, les sujets de prière et les routines de foi quotidiennes."],
      ["2. Responsabilité de l’utilisateur", "Vous êtes responsable des notes, prières et contenus que vous saisissez ou partagez. Évitez de publier des données personnelles sensibles."],
      ["3. Contenu spirituel", "Le verset du jour est choisi parmi des références bibliques préparées selon l’émotion ou l’état sélectionné, puis chargé via une API biblique. Roots ne remplace pas un accompagnement pastoral, médical, juridique ou d’urgence."],
      ["4. Communauté", "Utilisez un langage respectueux. Les abus, discours haineux, spams ou divulgations de données personnelles peuvent être limités."],
      ["5. Compte et données", "Vous pouvez supprimer votre compte depuis le profil. Les notes de QT, prières et check-ins liés au compte peuvent être supprimés."],
      ["6. Contact", "Pour obtenir de l’aide, utilisez la page d’assistance."],
    ],
    back: "Retour",
  },
} as const;

export default function TermsPage() {
  const router = useRouter();
  const lang = useLang();
  const c = COPY[lang] ?? COPY.ko;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "56px 24px 60px" }}>
      <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{c.back}</span>
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{c.title}</h1>
      <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, marginBottom: 4 }}>{c.sub}</p>
      <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 28 }}>{c.updated}</p>
      {c.sections.map(([title, body]) => (
        <section key={title} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>{body}</p>
        </section>
      ))}
    </div>
  );
}
