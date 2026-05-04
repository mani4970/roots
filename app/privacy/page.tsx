"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/useLang";

const COPY = {
  ko: { back: "돌아가기", title: "개인정보처리방침", subtitle: "Privacy Policy / Datenschutzerklärung", updated: "최종 수정일: 2026년 4월 14일", sections: [["1. 수집하는 정보", ["이메일 주소 (회원가입 시)", "닉네임 및 프로필 사진 (선택사항)", "큐티 기록 및 기도 제목 (사용자가 직접 입력)", "감정 체크인 데이터", "앱 사용 기록 (streak, 큐티 날짜 등)"]], ["2. 정보 사용 목적", ["서비스 제공 및 개인화", "커뮤니티 기능 제공", "서비스 개선 및 오류 수정"]], ["3. 제3자 서비스", ["Supabase — 데이터베이스 및 인증", "Bible API — 성경 본문 불러오기", "Google OAuth — 구글 계정 로그인 (선택사항)"]], ["4. 데이터 보관 기간", ["사용자 데이터는 계정이 활성 상태인 동안 보관됩니다.", "계정 삭제 시 개인 데이터는 삭제됩니다.", "공유된 커뮤니티 콘텐츠는 삭제 요청 시 별도로 처리될 수 있습니다."]], ["5. GDPR 권리", ["열람권", "정정권", "삭제권", "이동권", "처리 제한권"]], ["6. 아동 보호", ["Roots는 만 16세 이상을 대상으로 합니다. 만 16세 미만은 보호자의 동의 없이 서비스를 이용할 수 없습니다."]], ["7. 문의", ["Chungman Jeong", "cookiko313@gmail.com", "Hauptstraße 11, 65812 Bad Soden am Taunus, Deutschland"]]] },
  de: { back: "Zurück", title: "Datenschutzerklärung", subtitle: "Privacy Policy / 개인정보처리방침", updated: "Zuletzt aktualisiert: 14. April 2026", sections: [["1. Erhobene Daten", ["E-Mail-Adresse bei der Registrierung", "Nickname und Profilbild (optional)", "QT-Einträge und Gebetsanliegen, die Sie eingeben", "Emotionale Check-in-Daten", "Nutzungsdaten wie Streaks und QT-Daten"]], ["2. Zweck der Verarbeitung", ["Bereitstellung und Personalisierung des Dienstes", "Community-Funktionen", "Verbesserung des Dienstes und Fehlerbehebung"]], ["3. Drittanbieter", ["Supabase — Datenbank und Authentifizierung", "Bible API — Abruf von Bibeltexten", "Google OAuth — Anmeldung mit Google (optional)"]], ["4. Speicherdauer", ["Daten werden gespeichert, solange Ihr Konto aktiv ist.", "Bei Kontolöschung werden personenbezogene Daten gelöscht.", "In der Community geteilte Inhalte können auf Anfrage separat behandelt werden."]], ["5. DSGVO-Rechte", ["Auskunft", "Berichtigung", "Löschung", "Datenübertragbarkeit", "Einschränkung der Verarbeitung"]], ["6. Schutz von Kindern", ["Roots richtet sich an Personen ab 16 Jahren. Personen unter 16 Jahren dürfen den Dienst nicht ohne Zustimmung der Erziehungsberechtigten nutzen."]], ["7. Kontakt", ["Chungman Jeong", "cookiko313@gmail.com", "Hauptstraße 11, 65812 Bad Soden am Taunus, Deutschland"]]] },
  en: { back: "Back", title: "Privacy Policy", subtitle: "Datenschutzerklärung / 개인정보처리방침", updated: "Last updated: April 14, 2026", sections: [["1. Information we collect", ["Email address when signing up", "Nickname and profile photo (optional)", "QT records and prayer requests you enter", "Emotion check-in data", "Usage data such as streaks and QT dates"]], ["2. How we use information", ["To provide and personalize the service", "To provide community features", "To improve the service and fix errors"]], ["3. Third-party services", ["Supabase — database and authentication", "Bible API — Bible passage retrieval", "Google OAuth — Google login (optional)"]], ["4. Data retention", ["User data is kept while the account is active.", "When you delete your account, personal data is deleted.", "Community content you shared may be handled separately upon request."]], ["5. GDPR rights", ["Access", "Correction", "Deletion", "Portability", "Restriction of processing"]], ["6. Child protection", ["Roots is intended for users aged 16 and older. Users under 16 may not use the service without guardian consent."]], ["7. Contact", ["Chungman Jeong", "cookiko313@gmail.com", "Hauptstraße 11, 65812 Bad Soden am Taunus, Deutschland"]]] },
  fr: { back: "Retour", title: "Politique de confidentialité", subtitle: "Privacy Policy / Datenschutzerklärung", updated: "Dernière mise à jour : 14 avril 2026", sections: [["1. Informations collectées", ["Adresse e-mail lors de l’inscription", "Pseudo et photo de profil (facultatif)", "Entrées QT et sujets de prière saisis par l’utilisateur", "Données de check-in émotionnel", "Données d’utilisation comme les séries et dates QT"]], ["2. Utilisation des informations", ["Fournir et personnaliser le service", "Fournir les fonctions communautaires", "Améliorer le service et corriger les erreurs"]], ["3. Services tiers", ["Supabase — base de données et authentification", "Bible API — chargement des textes bibliques", "Google OAuth — connexion Google (facultatif)"]], ["4. Durée de conservation", ["Les données sont conservées tant que le compte est actif.", "Lors de la suppression du compte, les données personnelles sont supprimées.", "Les contenus partagés dans la communauté peuvent être traités séparément sur demande."]], ["5. Droits RGPD", ["Accès", "Rectification", "Suppression", "Portabilité", "Limitation du traitement"]], ["6. Protection des enfants", ["Roots s’adresse aux personnes de 16 ans et plus. Les moins de 16 ans ne peuvent pas utiliser le service sans l’accord d’un responsable légal."]], ["7. Contact", ["Chungman Jeong", "cookiko313@gmail.com", "Hauptstraße 11, 65812 Bad Soden am Taunus, Deutschland"]]] },
} as const;

export default function PrivacyPage() {
  const router = useRouter();
  const lang = useLang();
  const copy = COPY[lang] ?? COPY.ko;
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "56px 24px 60px" }}>
      <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>{copy.back}</span>
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{copy.title}</h1>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>{copy.subtitle}</p>
      <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 28 }}>{copy.updated}</p>
      {copy.sections.map(([title, items]) => (
        <section key={title} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{title}</h2>
          <ul style={{ fontSize: 13, color: "var(--text2)", lineHeight: 2, paddingLeft: 20 }}>
            {items.map(item => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
