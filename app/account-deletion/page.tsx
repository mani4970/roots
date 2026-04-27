"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/useLang";


const SUPPORT_EMAIL = "cookiko313@gmail.com";

const COPY = {
  ko: {
    title: "계정 삭제 안내",
    sub: "Roots 계정과 연결된 데이터를 삭제하는 방법입니다.",
    sections: [
      ["앱에서 직접 삭제", "프로필 → 계정 관리 → 계정 탈퇴에서 계정을 삭제할 수 있습니다. 삭제 시 QT 기록, 기도 제목, 체크인 기록 등 계정과 연결된 데이터가 삭제됩니다."],
      ["앱에 접근할 수 없는 경우", `계정 이메일을 포함하여 ${SUPPORT_EMAIL} 로 삭제 요청을 보내주세요.`],
      ["처리 안내", "삭제 요청 확인을 위해 계정 소유 여부를 확인할 수 있습니다. 법적 보관 의무가 있는 정보는 필요한 기간 동안 보관될 수 있습니다."],
    ],
    mail: "삭제 요청 이메일 보내기",
    back: "돌아가기",
  },
  de: {
    title: "Konto löschen",
    sub: "So können Sie Ihr Roots-Konto und verbundene Daten löschen.",
    sections: [
      ["Direkt in der App", "Öffnen Sie Profil → Kontoverwaltung → Konto löschen. Dabei werden mit dem Konto verbundene Daten wie QT-Notizen, Gebetsanliegen und Check-ins gelöscht."],
      ["Wenn Sie keinen Zugriff auf die App haben", `Senden Sie eine Löschanfrage mit Ihrer Konto-E-Mail an ${SUPPORT_EMAIL}.`],
      ["Hinweis zur Bearbeitung", "Zur Bestätigung kann eine Prüfung der Kontoinhaberschaft erforderlich sein. Daten mit gesetzlichen Aufbewahrungspflichten können für die erforderliche Dauer gespeichert bleiben."],
    ],
    mail: "Löschanfrage per E-Mail",
    back: "Zurück",
  },
  en: {
    title: "Account deletion",
    sub: "How to delete your Roots account and related data.",
    sections: [
      ["Delete in the app", "Open Profile → Account management → Delete account. This deletes data linked to your account, including QT records, prayer requests, and check-ins."],
      ["If you cannot access the app", `Send a deletion request with your account email to ${SUPPORT_EMAIL}.`],
      ["Processing note", "We may verify account ownership before processing a request. Data that must be retained for legal reasons may be kept for the required period."],
    ],
    mail: "Send deletion request",
    back: "Back",
  },
  fr: {
    title: "Suppression du compte",
    sub: "Comment supprimer votre compte Roots et les données associées.",
    sections: [
      ["Suppression dans l’application", "Ouvrez Profil → Gestion du compte → Supprimer le compte. Les données liées au compte, comme les notes de QT, prières et check-ins, seront supprimées."],
      ["Si vous n’avez pas accès à l’application", `Envoyez une demande avec l’e-mail du compte à ${SUPPORT_EMAIL}.`],
      ["Traitement", "Nous pouvons vérifier que vous êtes bien le titulaire du compte. Certaines données peuvent être conservées si la loi l’exige."],
    ],
    mail: "Envoyer une demande",
    back: "Retour",
  },
} as const;

export default function AccountDeletionPage() {
  const router = useRouter();
  const lang = useLang();
  const c = COPY[lang] ?? COPY.ko;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "56px 24px 60px" }}>
      <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{c.back}</span>
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{c.title}</h1>
      <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, marginBottom: 22 }}>{c.sub}</p>
      {c.sections.map(([title, body]) => (
        <section key={title} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>{body}</p>
        </section>
      ))}
      <a href={`mailto:${SUPPORT_EMAIL}?subject=Roots account deletion request`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 42, padding: "0 16px", borderRadius: 14, background: "var(--sage)", color: "var(--bg)", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>{c.mail}</a>
    </div>
  );
}
