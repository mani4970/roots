"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/useLang";


const SUPPORT_EMAIL = "cookiko313@gmail.com";

const COPY = {
  ko: {
    title: "지원",
    sub: "문제가 있거나 도움이 필요하시면 아래 방법으로 연락해 주세요.",
    updated: "보통 문의 시 계정 이메일, 사용 기기, 발생 화면을 함께 보내주시면 더 빠르게 확인할 수 있습니다.",
    sections: [
      ["문의 이메일", SUPPORT_EMAIL],
      ["계정 삭제 요청", "프로필에서 직접 계정을 삭제할 수 있습니다. 앱에 접근할 수 없다면 계정 삭제 안내 페이지를 확인해 주세요."],
      ["데이터/개인정보 문의", "개인정보 열람, 수정, 삭제, 이동 요청은 이메일로 보내주세요."],
    ],
    mail: "이메일 보내기",
    back: "돌아가기",
  },
  de: {
    title: "Support",
    sub: "Wenn Sie Hilfe benötigen oder ein Problem melden möchten, kontaktieren Sie uns bitte.",
    updated: "Hilfreich sind Ihre Konto-E-Mail, das Gerät und der Bildschirm, auf dem das Problem auftritt.",
    sections: [
      ["E-Mail", SUPPORT_EMAIL],
      ["Konto löschen", "Sie können Ihr Konto im Profil löschen. Wenn Sie keinen Zugriff auf die App haben, lesen Sie bitte die Seite zur Kontolöschung."],
      ["Datenschutzanfragen", "Anfragen zu Auskunft, Berichtigung, Löschung oder Datenübertragung können per E-Mail gestellt werden."],
    ],
    mail: "E-Mail senden",
    back: "Zurück",
  },
  en: {
    title: "Support",
    sub: "If you need help or want to report a problem, please contact us.",
    updated: "Including your account email, device, and the screen where the issue happened helps us respond faster.",
    sections: [
      ["Email", SUPPORT_EMAIL],
      ["Account deletion", "You can delete your account from the Profile page. If you cannot access the app, please see the account deletion page."],
      ["Data and privacy requests", "Requests for access, correction, deletion, or portability may be sent by email."],
    ],
    mail: "Send email",
    back: "Back",
  },
  fr: {
    title: "Assistance",
    sub: "Si vous avez besoin d’aide ou souhaitez signaler un problème, contactez-nous.",
    updated: "Indiquer l’e-mail du compte, l’appareil et l’écran concerné nous aide à répondre plus rapidement.",
    sections: [
      ["E-mail", SUPPORT_EMAIL],
      ["Suppression du compte", "Vous pouvez supprimer votre compte depuis le profil. Si vous n’avez pas accès à l’application, consultez la page de suppression du compte."],
      ["Demandes liées aux données", "Les demandes d’accès, correction, suppression ou portabilité peuvent être envoyées par e-mail."],
    ],
    mail: "Envoyer un e-mail",
    back: "Retour",
  },
} as const;

export default function SupportPage() {
  const router = useRouter();
  const lang = useLang();
  const c = COPY[lang] ?? COPY.ko;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "56px 24px 60px" }}>
      <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{c.back}</span>
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{c.title}</h1>
      <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, marginBottom: 12 }}>{c.sub}</p>
      <a href={`mailto:${SUPPORT_EMAIL}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 42, padding: "0 16px", borderRadius: 14, background: "var(--sage)", color: "var(--bg)", fontSize: 13, fontWeight: 800, textDecoration: "none", marginBottom: 24 }}>{c.mail}</a>
      <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, marginBottom: 24 }}>{c.updated}</p>
      {c.sections.map(([title, body]) => (
        <section key={title} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>{body}</p>
        </section>
      ))}
    </div>
  );
}
