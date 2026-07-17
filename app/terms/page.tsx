"use client";

import LegalDocumentPage from "@/components/LegalDocumentPage";
import { useLang } from "@/lib/useLang";

const COPY = {
  ko: {
    back: "돌아가기",
    title: "이용약관",
    subtitle: "Roots를 이용하기 전에 아래 내용을 확인해 주세요.",
    updated: "시행 및 최종 수정일: 2026년 7월 17일",
    sections: [
      { title: "1. 서비스와 약관", paragraphs: ["Roots는 말씀 묵상, 기도 기록, 신앙 루틴, 커뮤니티, 그룹·동역자, 챌린지와 캐릭터 꾸미기 기능을 제공하는 크리스천 서비스입니다.", "본 약관은 Roots 앱과 웹 서비스 이용에 적용됩니다. 서비스를 이용하면 본 약관과 개인정보처리방침의 적용을 받습니다."] },
      { title: "2. 계정과 이용 자격", paragraphs: ["사용자는 정확한 정보를 제공하고 계정과 로그인 수단을 안전하게 관리해야 합니다. 다른 사람의 계정을 사용하거나 로그인 정보를 공유해서는 안 됩니다.", "Roots는 특정 연령으로 이용을 제한하지 않지만, 거주 지역 법률상 필요한 경우 부모 또는 법정대리인의 승인 아래 서비스를 이용해야 합니다."] },
      { title: "3. 비공개 기록과 선택적 공유", paragraphs: ["묵상, 기도 제목과 사진 묵상은 기본적으로 본인만 보는 비공개 기록입니다. Roots가 자동으로 공개하지 않습니다.", "공유는 사용자가 전체 커뮤니티, 그룹 또는 동역자 등 대상을 직접 선택한 경우에만 이루어집니다. 사용자는 언제든 공유를 해제할 수 있으며, 공유를 해제해도 본인의 원본 기록은 별도로 삭제하기 전까지 유지됩니다."] },
      { title: "4. 사용자 콘텐츠", paragraphs: ["사용자는 본인이 작성하거나 업로드한 묵상, 기도, 사진, 프로필 및 커뮤니티 콘텐츠에 대한 권리를 유지합니다.", "사용자가 공유를 선택하면 Roots가 선택된 대상에게 콘텐츠를 저장·표시·전송하는 데 필요한 범위에서만 비독점적 이용을 허용한 것으로 봅니다. 이 허용은 공유 해제 또는 콘텐츠 삭제 시 서비스 운영에 필요한 기술적 처리 기간 후 종료됩니다.", "사용자는 본인에게 권리가 있는 내용만 올려야 하며, 다른 사람의 개인정보나 저작권을 침해해서는 안 됩니다."] },
      { title: "5. 커뮤니티 이용 규칙", items: ["타인을 모욕·위협·괴롭히거나 혐오를 조장하는 콘텐츠", "스팸, 사기, 불법 행위 또는 악성 링크", "본인이나 타인의 민감한 개인정보를 동의 없이 공개하는 행위", "저작권, 초상권 또는 그 밖의 권리를 침해하는 콘텐츠", "서비스 보안이나 정상적인 운영을 방해하는 행위"], paragraphs: ["위 행위는 허용되지 않습니다. Roots는 신고된 콘텐츠를 확인하고 필요한 경우 노출 제한, 공유 해제, 콘텐츠 삭제 또는 계정 이용 제한 조치를 할 수 있습니다."] },
      { title: "6. 사랑 하트와 상점 아이템", paragraphs: ["사랑 하트는 Roots 안에서 활동 보상과 디지털 꾸미기 아이템 이용을 위해 제공되는 서비스 내 포인트입니다. 현금이나 전자화폐가 아니며 금전적 가치가 없고, 환전·양도·판매할 수 없습니다.", "구매한 맵·캐릭터 아이템은 Roots 안에서만 사용할 수 있습니다. 서비스의 균형, 보안 또는 운영상 필요한 경우 아이템의 표시 방식이나 제공 조건이 변경될 수 있습니다. 사용자의 정상적인 획득·구매 기록은 합리적인 범위에서 보호합니다."] },
      { title: "7. 성경 본문과 지식재산권", paragraphs: ["Roots의 이름, 로고, 캐릭터, 배지, 지도, 디자인과 소프트웨어는 Roots 또는 정당한 권리자의 보호 대상입니다. 개인적인 앱 이용 외의 복제·배포·판매·수정은 허용되지 않습니다.", "성경 본문은 각 번역본의 저작권과 이용 허락 조건에 따라 제공됩니다. 적용되는 번역본별 저작권 고지는 앱의 성경 저작권 안내에 별도로 표시됩니다."] },
      { title: "8. 신앙·건강·법률 관련 안내", paragraphs: ["Roots는 신앙생활과 기록을 돕는 도구이며 목회 상담, 의료·정신건강 진단이나 치료, 법률 자문 또는 긴급 구조 서비스를 대체하지 않습니다. 긴급한 위험이 있는 경우 거주 지역의 응급기관이나 신뢰할 수 있는 전문가에게 연락해야 합니다."] },
      { title: "9. 서비스 변경과 가용성", paragraphs: ["Roots는 서비스 개선, 보안, 법률 또는 기술적 필요에 따라 기능을 추가·변경·중단할 수 있습니다. 가능한 경우 중요한 변경을 미리 안내합니다.", "안정적인 제공을 위해 노력하지만 점검, 장애, 네트워크 또는 외부 서비스 문제로 일시적으로 이용하지 못할 수 있습니다."] },
      { title: "10. 계정 종료와 삭제", paragraphs: ["사용자는 프로필의 계정 관리에서 언제든 계정을 삭제할 수 있습니다. 삭제가 완료되면 계정과 연결된 데이터는 영구적으로 삭제되며 복구할 수 없습니다.", "중대한 약관 위반, 불법 행위 또는 서비스와 사용자의 안전을 해치는 행위가 확인되면 Roots는 필요한 범위에서 콘텐츠 또는 계정 이용을 제한할 수 있습니다."] },
      { title: "11. 준거법, 변경과 문의", paragraphs: ["독일 법률이 적용됩니다. 다만 사용자가 거주하는 국가의 강행적인 소비자 보호 권리는 영향을 받지 않습니다. Roots는 소비자 분쟁조정기관의 절차에 참여할 의사가 없으며 참여 의무도 없습니다.", "약관이 중요하게 변경되는 경우 시행일을 갱신하고 필요한 경우 앱 안에서 안내합니다. 문의: support@christian-roots.com"] },
    ],
  },
  de: {
    back: "Zurück",
    title: "Nutzungsbedingungen",
    subtitle: "Bitte lesen Sie diese Bedingungen vor der Nutzung von Roots.",
    updated: "Gültig und zuletzt aktualisiert am 17. Juli 2026",
    sections: [
      { title: "1. Dienst und Geltungsbereich", paragraphs: ["Roots ist ein christlicher Dienst für Stille Zeit, Gebetsaufzeichnungen, Glaubensroutinen, Community, Gruppen und Glaubenspartner, Challenges sowie Charaktergestaltung.", "Diese Bedingungen gelten für die Roots-App und den Webdienst. Bei der Nutzung gelten diese Bedingungen und die Datenschutzerklärung."] },
      { title: "2. Konto und Nutzungsberechtigung", paragraphs: ["Sie müssen richtige Angaben machen und Ihr Konto sowie Ihre Anmeldemethode schützen. Konten anderer Personen dürfen nicht genutzt und Zugangsdaten nicht weitergegeben werden.", "Roots beschränkt die Nutzung nicht auf ein bestimmtes Alter. Soweit das Recht am Wohnort dies verlangt, darf der Dienst jedoch nur mit Zustimmung der Eltern oder gesetzlichen Vertretung genutzt werden."] },
      { title: "3. Private Einträge und freiwilliges Teilen", paragraphs: ["Einträge zur Stillen Zeit, Gebetsanliegen und Foto-Meditationen sind standardmäßig privat. Roots veröffentlicht sie nicht automatisch.", "Eine Freigabe erfolgt nur, wenn Sie selbst einen Empfängerkreis wie die Community, eine Gruppe oder Glaubenspartner wählen. Sie können die Freigabe jederzeit beenden; der private Originaleintrag bleibt bestehen, bis Sie ihn löschen."] },
      { title: "4. Inhalte der Nutzer", paragraphs: ["Sie behalten die Rechte an den von Ihnen erstellten oder hochgeladenen Einträgen, Gebeten, Fotos, Profil- und Community-Inhalten.", "Wenn Sie Inhalte teilen, erlauben Sie Roots lediglich in dem Umfang eine nicht ausschließliche Nutzung, der für Speicherung, Anzeige und Übermittlung an den gewählten Empfängerkreis erforderlich ist. Diese Erlaubnis endet nach Freigabestopp oder Löschung, sobald die technisch notwendige Verarbeitung abgeschlossen ist.", "Sie dürfen nur Inhalte einstellen, an denen Sie die erforderlichen Rechte haben, und keine Rechte oder personenbezogenen Daten anderer verletzen."] },
      { title: "5. Regeln für die Community", items: ["Beleidigungen, Drohungen, Belästigung oder Hass", "Spam, Betrug, rechtswidrige Handlungen oder schädliche Links", "Offenlegung sensibler Daten ohne Zustimmung", "Verletzung von Urheber-, Bild- oder sonstigen Rechten", "Beeinträchtigung der Sicherheit oder des normalen Betriebs"], paragraphs: ["Diese Handlungen sind nicht erlaubt. Roots kann gemeldete Inhalte prüfen und erforderlichenfalls deren Sichtbarkeit einschränken, Freigaben beenden, Inhalte entfernen oder Konten beschränken."] },
      { title: "6. Love Hearts und Shop-Artikel", paragraphs: ["Love Hearts sind interne Punkte für Aktivitätsbelohnungen und digitale Gestaltungsartikel. Sie sind weder Geld noch E-Geld, haben keinen Geldwert und können nicht ausgezahlt, übertragen oder verkauft werden.", "Karten- und Charakterartikel können nur innerhalb von Roots genutzt werden. Darstellung oder Bedingungen können aus Gründen des Gleichgewichts, der Sicherheit oder des Betriebs angepasst werden. Ordnungsgemäß erworbene Einträge werden dabei in angemessenem Umfang geschützt."] },
      { title: "7. Bibeltexte und geistiges Eigentum", paragraphs: ["Name, Logo, Charaktere, Abzeichen, Karten, Design und Software von Roots sind geschützt. Eine Vervielfältigung, Verbreitung, Veräußerung oder Änderung außerhalb der persönlichen App-Nutzung ist nicht erlaubt.", "Bibeltexte werden nach den Urheber- und Lizenzbedingungen der jeweiligen Übersetzung bereitgestellt. Die konkreten Hinweise werden in der Bibel- und Urheberrechtsinformation der App ausgewiesen."] },
      { title: "8. Hinweis zu Glauben, Gesundheit und Recht", paragraphs: ["Roots unterstützt Glaubenspraxis und persönliche Aufzeichnungen, ersetzt aber keine Seelsorge, medizinische oder psychologische Diagnose oder Behandlung, Rechtsberatung oder Notfallhilfe. Bei akuter Gefahr wenden Sie sich an örtliche Notfalldienste oder geeignete Fachpersonen."] },
      { title: "9. Änderungen und Verfügbarkeit", paragraphs: ["Roots kann Funktionen aus Verbesserungs-, Sicherheits-, rechtlichen oder technischen Gründen ergänzen, ändern oder einstellen. Wesentliche Änderungen werden nach Möglichkeit vorab angekündigt.", "Wir bemühen uns um einen stabilen Dienst, können aber eine ununterbrochene Verfügbarkeit bei Wartung, Störungen, Netzwerk- oder Drittanbieterproblemen nicht garantieren."] },
      { title: "10. Beendigung und Kontolöschung", paragraphs: ["Sie können Ihr Konto jederzeit in der Kontoverwaltung des Profils löschen. Nach Abschluss werden die kontobezogenen Daten dauerhaft gelöscht und können nicht wiederhergestellt werden.", "Bei erheblichen Verstößen, rechtswidrigen Handlungen oder Gefährdung des Dienstes oder anderer Nutzer kann Roots Inhalte oder Konten im erforderlichen Umfang beschränken."] },
      { title: "11. Recht, Änderungen und Kontakt", paragraphs: ["Es gilt deutsches Recht. Zwingende Verbraucherschutzrechte des Staates, in dem Sie wohnen, bleiben unberührt. Roots ist weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.", "Bei wesentlichen Änderungen aktualisieren wir das Datum und informieren, soweit erforderlich, in der App. Kontakt: support@christian-roots.com"] },
    ],
  },
  en: {
    back: "Back",
    title: "Terms of Use",
    subtitle: "Please review these terms before using Roots.",
    updated: "Effective and last updated: July 17, 2026",
    sections: [
      { title: "1. Service and scope", paragraphs: ["Roots is a Christian service for Bible Reflection, prayer records, faith routines, community, groups and faith partners, challenges, and character customization.", "These terms apply to the Roots app and web service. Your use is also subject to the Privacy Policy."] },
      { title: "2. Account and eligibility", paragraphs: ["You must provide accurate information and keep your account and sign-in method secure. Do not use another person's account or share access credentials.", "Roots does not limit use to a specific age. Where the law where you live requires it, the service must be used with authorization from a parent or legal guardian."] },
      { title: "3. Private records and optional sharing", paragraphs: ["Bible Reflections, prayer requests, and photo reflections are private by default. Roots does not publish them automatically.", "Sharing occurs only when you actively select an audience such as the community, a group, or faith partners. You may stop sharing at any time; your private original remains until you delete it."] },
      { title: "4. User content", paragraphs: ["You retain your rights in reflections, prayers, photos, profile information, and community content you create or upload.", "When you choose to share, you grant Roots only the limited, non-exclusive permission needed to store, display, and transmit the content to your selected audience. That permission ends after sharing is stopped or the content is deleted, subject to necessary technical processing time.", "You may upload only content you have the right to use and must not violate another person's privacy, copyright, image rights, or other rights."] },
      { title: "5. Community rules", items: ["Harassment, threats, abuse, or hate", "Spam, fraud, unlawful activity, or harmful links", "Disclosure of sensitive personal data without permission", "Infringement of copyright, image rights, or other rights", "Interference with service security or normal operation"], paragraphs: ["These activities are not allowed. Roots may review reports and, where necessary, limit visibility, stop sharing, remove content, or restrict an account."] },
      { title: "6. Love Hearts and shop items", paragraphs: ["Love Hearts are in-service points used for activity rewards and digital customization items. They are not money or electronic money, have no cash value, and cannot be redeemed, transferred, or sold.", "Map and character items may be used only within Roots. Their presentation or availability may change for balance, security, or operational reasons. Legitimately earned and purchased records will be protected to a reasonable extent."] },
      { title: "7. Bible text and intellectual property", paragraphs: ["The Roots name, logo, characters, badges, maps, design, and software are protected by Roots or their respective rights holders. Copying, distributing, selling, or modifying them outside personal app use is not permitted.", "Bible text is provided subject to the copyright and licence terms of each translation. Translation-specific notices will appear in the app's Bible copyright information."] },
      { title: "8. Faith, health, and legal notice", paragraphs: ["Roots supports faith practice and personal records. It is not a substitute for pastoral care, medical or mental-health diagnosis or treatment, legal advice, or emergency services. If there is immediate danger, contact local emergency services or a qualified professional."] },
      { title: "9. Changes and availability", paragraphs: ["Roots may add, change, or discontinue features for improvement, security, legal, or technical reasons. We will give advance notice of significant changes where reasonably possible.", "We work to provide a stable service but cannot guarantee uninterrupted availability during maintenance, outages, network failures, or third-party service issues."] },
      { title: "10. Termination and deletion", paragraphs: ["You may delete your account at any time from Profile account management. Once deletion completes, account-linked data is permanently deleted and cannot be restored.", "Roots may restrict content or an account where necessary in response to serious terms violations, unlawful activity, or threats to the service or other users."] },
      { title: "11. Law, changes, and contact", paragraphs: ["German law applies, without limiting mandatory consumer-protection rights in the country where you live. Roots is neither willing nor obliged to participate in dispute-resolution proceedings before a consumer arbitration board.", "For material changes, we will update the effective date and provide an in-app notice where required. Contact: support@christian-roots.com"] },
    ],
  },
  fr: {
    back: "Retour",
    title: "Conditions d’utilisation",
    subtitle: "Veuillez lire ces conditions avant d’utiliser Roots.",
    updated: "Entrée en vigueur et dernière mise à jour : 17 juillet 2026",
    sections: [
      { title: "1. Service et champ d’application", paragraphs: ["Roots est un service chrétien de méditation biblique, prière, routines de foi, communauté, groupes et partenaires de foi, défis et personnalisation de personnages.", "Ces conditions s’appliquent à l’app et au service web Roots. L’utilisation est également soumise à la Politique de confidentialité."] },
      { title: "2. Compte et conditions d’accès", paragraphs: ["Vous devez fournir des informations exactes et protéger votre compte et votre méthode de connexion. N’utilisez pas le compte d’une autre personne et ne partagez pas vos identifiants.", "Roots ne limite pas l’utilisation à un âge précis. Lorsque la loi de votre lieu de résidence l’exige, le service doit être utilisé avec l’autorisation d’un parent ou représentant légal."] },
      { title: "3. Données privées et partage facultatif", paragraphs: ["Les méditations bibliques, sujets de prière et méditations photo sont privés par défaut. Roots ne les publie pas automatiquement.", "Le partage n’a lieu que si vous choisissez un public, par exemple la communauté, un groupe ou des partenaires de foi. Vous pouvez l’arrêter à tout moment ; votre original privé reste enregistré jusqu’à sa suppression."] },
      { title: "4. Contenu des utilisateurs", paragraphs: ["Vous conservez vos droits sur les méditations, prières, photos, informations de profil et contenus communautaires que vous créez ou téléversez.", "Lorsque vous partagez, vous accordez uniquement à Roots l’autorisation non exclusive nécessaire pour stocker, afficher et transmettre le contenu au public choisi. Elle prend fin après l’arrêt du partage ou la suppression, sous réserve du délai technique nécessaire.", "Vous ne pouvez publier que des contenus que vous avez le droit d’utiliser et ne devez pas porter atteinte à la vie privée, aux droits d’auteur, au droit à l’image ou aux autres droits d’autrui."] },
      { title: "5. Règles communautaires", items: ["Harcèlement, menaces, insultes ou haine", "Spam, fraude, activité illicite ou liens nuisibles", "Divulgation de données sensibles sans autorisation", "Atteinte aux droits d’auteur, à l’image ou à d’autres droits", "Atteinte à la sécurité ou au fonctionnement normal du service"], paragraphs: ["Ces comportements sont interdits. Roots peut examiner les signalements et, si nécessaire, limiter la visibilité, arrêter un partage, retirer un contenu ou restreindre un compte."] },
      { title: "6. Love Hearts et objets de boutique", paragraphs: ["Les Love Hearts sont des points internes destinés aux récompenses d’activité et aux objets numériques. Ils ne constituent ni de l’argent ni de la monnaie électronique, n’ont aucune valeur monétaire et ne peuvent être remboursés, transférés ou vendus.", "Les objets de carte et de personnage s’utilisent uniquement dans Roots. Leur présentation ou disponibilité peut évoluer pour des raisons d’équilibre, de sécurité ou d’exploitation. Les acquisitions régulières seront protégées dans une mesure raisonnable."] },
      { title: "7. Textes bibliques et propriété intellectuelle", paragraphs: ["Le nom, le logo, les personnages, badges, cartes, graphismes et logiciels de Roots sont protégés par Roots ou leurs titulaires. Leur copie, distribution, vente ou modification en dehors de l’usage personnel de l’app est interdite.", "Les textes bibliques sont fournis selon les droits d’auteur et licences de chaque traduction. Les mentions propres à chaque traduction figureront dans les informations bibliques et juridiques de l’app."] },
      { title: "8. Foi, santé et droit", paragraphs: ["Roots aide à la pratique de la foi et à la tenue de notes personnelles. Il ne remplace pas l’accompagnement pastoral, un diagnostic ou traitement médical ou psychologique, un conseil juridique ou les secours d’urgence. En cas de danger immédiat, contactez les services d’urgence locaux ou un professionnel qualifié."] },
      { title: "9. Modifications et disponibilité", paragraphs: ["Roots peut ajouter, modifier ou interrompre des fonctions pour des raisons d’amélioration, de sécurité, juridiques ou techniques. Un préavis sera donné pour les changements importants lorsque cela est raisonnablement possible.", "Nous cherchons à assurer un service stable, sans pouvoir garantir une disponibilité continue lors des maintenances, pannes, problèmes réseau ou défaillances de prestataires."] },
      { title: "10. Résiliation et suppression", paragraphs: ["Vous pouvez supprimer votre compte à tout moment dans la gestion du compte du profil. Une fois la suppression terminée, les données liées au compte sont définitivement supprimées et irrécupérables.", "Roots peut limiter un contenu ou un compte lorsque cela est nécessaire à la suite d’une violation grave, d’une activité illicite ou d’un risque pour le service ou les utilisateurs."] },
      { title: "11. Droit applicable, modifications et contact", paragraphs: ["Le droit allemand s’applique, sans limiter les droits impératifs de protection des consommateurs de votre pays de résidence. Roots n’est ni disposé ni obligé à participer à une procédure de règlement devant un organisme de médiation des consommateurs.", "En cas de modification importante, nous mettrons à jour la date et fournirons une information dans l’app lorsque cela est requis. Contact : support@christian-roots.com"] },
    ],
  },
} as const;

export default function TermsPage() {
  const lang = useLang();
  const copy = COPY[lang] ?? COPY.ko;

  return (
    <LegalDocumentPage
      backLabel={copy.back}
      title={copy.title}
      subtitle={copy.subtitle}
      updatedLabel={copy.updated}
      sections={copy.sections}
    />
  );
}
