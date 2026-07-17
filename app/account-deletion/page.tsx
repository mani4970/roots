"use client";

import Link from "next/link";
import LegalDocumentPage from "@/components/LegalDocumentPage";
import { useLang } from "@/lib/useLang";

const SUPPORT_EMAIL = "support@christian-roots.com";

const COPY = {
  ko: {
    back: "돌아가기",
    title: "계정 삭제 안내",
    subtitle: "Roots 계정과 계정에 연결된 데이터를 영구 삭제하는 방법입니다.",
    privacy: "개인정보처리방침",
    support: "고객지원",
    sections: [
      { title: "앱에서 직접 삭제", paragraphs: ["프로필 → 계정 관리 → 계정 탈퇴를 선택하고 삭제를 확인하세요. 삭제가 완료되면 로그아웃되며 계정은 복구할 수 없습니다."] },
      { title: "삭제되는 데이터", items: ["로그인 계정, 이메일 식별 정보와 프로필", "묵상, 기도, 체크인, 사진 묵상과 업로드 이미지", "커뮤니티 공유, 그룹·동역자 관계, 리액션, 함께 기도, 신고와 숨김 기록", "알림 설정과 푸시 토큰", "묵상·기도 진행 기록, 챌린지, 배지와 사랑 하트 내역", "사랑 상점 구매와 현재 꾸미기 정보", "피드백을 포함한 계정과 연결된 그 밖의 활성 데이터"], paragraphs: ["삭제가 성공하면 해당 기기에 저장된 Roots 설정과 임시 묵상 초안도 함께 삭제됩니다."] },
      { title: "앱에 접근할 수 없는 경우", paragraphs: [`계정에 사용한 이메일 주소를 포함하여 ${SUPPORT_EMAIL} 로 삭제 요청을 보내세요. 계정을 보호하기 위해 소유 여부 확인을 요청할 수 있습니다.`] },
      { title: "처리와 복구", paragraphs: ["확인이 완료되면 계정과 연결된 활성 데이터를 삭제하고 결과를 안내합니다. Roots는 삭제 완료 후 계정 데이터를 의도적으로 계속 보관하지 않습니다.", "삭제된 데이터는 복구할 수 없습니다. 서비스 제공업체의 제한된 기술적 백업 사본은 정상적인 백업 교체 주기까지 남을 수 있으나 일반 서비스로 복원하거나 다시 이용하지 않습니다."] },
    ],
  },
  de: {
    back: "Zurück",
    title: "Konto löschen",
    subtitle: "So löschen Sie Ihr Roots-Konto und die damit verbundenen Daten dauerhaft.",
    privacy: "Datenschutzerklärung",
    support: "Support",
    sections: [
      { title: "Direkt in der App", paragraphs: ["Öffnen Sie Profil → Kontoverwaltung → Konto löschen und bestätigen Sie die Löschung. Nach Abschluss werden Sie abgemeldet; das Konto kann nicht wiederhergestellt werden."] },
      { title: "Gelöschte Daten", items: ["Anmeldekonto, E-Mail-Kennung und Profil", "Einträge zur Stillen Zeit, Gebete, Check-ins, Foto-Meditationen und hochgeladene Bilder", "Freigaben, Gruppen- und Glaubenspartnerbeziehungen, Reaktionen, gemeinsames Beten, Meldungen und ausgeblendete Inhalte", "Benachrichtigungseinstellungen und Push-Token", "Fortschritt, Challenges, Abzeichen und Love-Hearts-Verlauf", "Shop-Käufe und aktuelle Charaktergestaltung", "Feedback und sonstige aktive kontobezogene Daten"], paragraphs: ["Nach erfolgreicher Löschung werden auch lokale Roots-Einstellungen und temporäre Entwürfe auf diesem Gerät entfernt."] },
      { title: "Kein Zugriff auf die App", paragraphs: [`Senden Sie eine Anfrage mit der für das Konto verwendeten E-Mail-Adresse an ${SUPPORT_EMAIL}. Zum Schutz des Kontos kann ein Nachweis der Inhaberschaft verlangt werden.`] },
      { title: "Bearbeitung und Wiederherstellung", paragraphs: ["Nach der Prüfung löschen wir die aktiven kontobezogenen Daten und informieren über den Abschluss. Roots bewahrt Kontodaten nach abgeschlossener Löschung nicht absichtlich weiter auf.", "Gelöschte Daten können nicht wiederhergestellt werden. Begrenzte technische Sicherungskopien eines Dienstleisters können bis zum regulären Austausch im Sicherungszyklus verbleiben, werden aber nicht in den aktiven Dienst zurückgespielt oder erneut verwendet."] },
    ],
  },
  en: {
    back: "Back",
    title: "Account deletion",
    subtitle: "How to permanently delete your Roots account and linked data.",
    privacy: "Privacy Policy",
    support: "Support",
    sections: [
      { title: "Delete in the app", paragraphs: ["Open Profile → Account management → Delete account and confirm. When deletion completes, you are signed out and the account cannot be restored."] },
      { title: "Data that is deleted", items: ["Sign-in account, email identifier, and profile", "Bible Reflections, prayers, check-ins, photo reflections, and uploaded images", "Community shares, groups and faith partners, reactions, prayer participation, reports, and hidden-content records", "Notification settings and push tokens", "Progress, challenges, badges, and Love Heart history", "Shop purchases and current customization", "Feedback and other active data linked to the account"], paragraphs: ["After successful deletion, Roots settings and temporary reflection drafts stored on that device are also cleared."] },
      { title: "If you cannot access the app", paragraphs: [`Email ${SUPPORT_EMAIL} from or with the address used for the account. We may verify ownership to protect the account.`] },
      { title: "Processing and recovery", paragraphs: ["After verification, we delete the active data linked to the account and confirm completion. Roots does not intentionally retain account data after deletion is complete.", "Deleted data cannot be restored. Limited technical backup copies held by a provider may remain until replaced during its normal backup cycle, but they are not restored to active service or reused."] },
    ],
  },
  fr: {
    back: "Retour",
    title: "Suppression du compte",
    subtitle: "Comment supprimer définitivement votre compte Roots et les données associées.",
    privacy: "Politique de confidentialité",
    support: "Assistance",
    sections: [
      { title: "Suppression dans l’app", paragraphs: ["Ouvrez Profil → Gestion du compte → Supprimer le compte et confirmez. Une fois l’opération terminée, vous êtes déconnecté(e) et le compte ne peut pas être restauré."] },
      { title: "Données supprimées", items: ["Compte de connexion, identifiant e-mail et profil", "Méditations bibliques, prières, check-ins, méditations photo et images téléversées", "Partages, groupes et partenaires de foi, réactions, participation à la prière, signalements et contenus masqués", "Réglages de notification et jetons push", "Progression, défis, badges et historique des Love Hearts", "Achats de boutique et personnalisation actuelle", "Retours et autres données actives liées au compte"], paragraphs: ["Après la suppression réussie, les réglages Roots et brouillons temporaires stockés sur cet appareil sont également effacés."] },
      { title: "Si vous n’avez pas accès à l’app", paragraphs: [`Envoyez une demande à ${SUPPORT_EMAIL} en indiquant l’adresse utilisée pour le compte. Une vérification de propriété peut être demandée pour protéger le compte.`] },
      { title: "Traitement et récupération", paragraphs: ["Après vérification, nous supprimons les données actives liées au compte et confirmons l’opération. Roots ne conserve pas volontairement les données du compte après la suppression.", "Les données supprimées ne peuvent pas être restaurées. Des copies de sauvegarde techniques limitées peuvent rester jusqu’à leur remplacement dans le cycle normal du prestataire, sans être restaurées dans le service actif ni réutilisées."] },
    ],
  },
} as const;

export default function AccountDeletionPage() {
  const lang = useLang();
  const copy = COPY[lang] ?? COPY.ko;

  return (
    <LegalDocumentPage
      backLabel={copy.back}
      title={copy.title}
      subtitle={copy.subtitle}
      sections={copy.sections}
      bottomAction={(
        <nav aria-label={copy.title} style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 8 }}>
          <Link href="/privacy" style={{ display: "flex", minHeight: 44, alignItems: "center", justifyContent: "center", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 14, color: "var(--sage-dark)", fontSize: 12, fontWeight: 800, textAlign: "center", textDecoration: "none" }}>{copy.privacy}</Link>
          <Link href="/support" style={{ display: "flex", minHeight: 44, alignItems: "center", justifyContent: "center", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 14, color: "var(--sage-dark)", fontSize: 12, fontWeight: 800, textAlign: "center", textDecoration: "none" }}>{copy.support}</Link>
        </nav>
      )}
    />
  );
}
