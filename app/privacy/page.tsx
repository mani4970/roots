"use client";

import LegalDocumentPage from "@/components/LegalDocumentPage";
import { useLang } from "@/lib/useLang";

const COPY = {
  ko: {
    back: "돌아가기",
    title: "개인정보처리방침",
    subtitle: "Roots가 개인정보를 어떻게 처리하고 보호하는지 안내합니다.",
    updated: "시행 및 최종 수정일: 2026년 7월 17일",
    sections: [
      {
        title: "1. 개인정보 처리 책임자",
        paragraphs: ["책임자: Chungman Jeong\n주소: Hauptstraße 11, 65812 Bad Soden am Taunus, Deutschland\n이메일: support@christian-roots.com"],
      },
      {
        title: "2. 비공개 기본 원칙과 선택적 공유",
        paragraphs: ["묵상, 기도 제목, 사진 묵상은 기본적으로 작성한 사용자 본인만 볼 수 있습니다. Roots가 이를 자동으로 다른 사용자에게 공개하지 않습니다.", "사용자가 전체 커뮤니티, 그룹 또는 동역자 등 공유 대상을 직접 선택한 경우에만 선택한 범위에 공개됩니다. 공유를 해제해도 본인의 원본 기록은 사용자가 별도로 삭제하지 않는 한 유지됩니다."],
      },
      {
        title: "3. 처리하는 정보",
        items: [
          "계정 및 인증 정보: 이메일 주소, 인증 제공자, 내부 사용자 식별자",
          "프로필 정보: 닉네임, 선택한 프로필 사진 또는 Roots 캐릭터, 선호 언어와 성경 번역",
          "신앙 기록: 묵상 내용, 기도 제목과 응답 기록, 감정 체크인, 사진 묵상과 설명",
          "커뮤니티 정보: 사용자가 선택한 공유 범위, 그룹·동역자 관계, 리액션, 함께 기도한 기록, 신고와 숨김 설정",
          "활동 및 보상 정보: 묵상·기도 완료일, 연속 기록, 챌린지, 배지, 사랑 하트 내역과 상점 구매·착용 정보",
          "알림 및 지원 정보: 알림 설정, 푸시 토큰, 사용자가 보낸 피드백과 지원 요청 내용",
          "기기 내 정보: 언어·테마·본문 크기 설정, 알림 예약 정보, 작성 중인 묵상 임시 초안",
        ],
      },
      {
        title: "4. 신앙 관련 민감정보",
        paragraphs: ["사용자가 입력한 묵상과 기도 내용은 종교적 신념을 드러낼 수 있습니다. Roots는 사용자가 직접 입력하거나 저장을 요청한 경우에만 해당 정보를 처리하며, 종교 성향을 추론하거나 광고 목적으로 이용하지 않습니다.", "특별 범주의 개인정보에 명시적 동의가 필요한 경우 해당 동의를 법적 근거로 처리하며, 사용자는 언제든 동의를 철회하거나 관련 기록과 계정을 삭제할 수 있습니다."],
      },
      {
        title: "5. 처리 목적과 법적 근거",
        items: [
          "계정 생성, 로그인, 묵상·기도·커뮤니티·보상 기능 제공: 계약의 이행 또는 사용자의 요청에 따른 조치",
          "선택적 프로필 사진, 공유, 알림 및 특별 범주의 정보 처리: 동의가 필요한 경우 사용자의 동의",
          "오류 대응, 서비스 보안, 부정 이용과 신고 처리: 서비스의 안전한 운영을 위한 정당한 이익",
          "법률상 요구되는 처리: 법적 의무 준수",
        ],
      },
      {
        title: "6. 공유 범위와 공개 정보",
        paragraphs: ["프로필 닉네임·프로필 이미지와 사용자가 직접 공유한 묵상·기도만 선택된 대상에게 표시될 수 있습니다. 비공개 기록은 커뮤니티에 표시되지 않습니다.", "사용자는 공유 전에 기록 안에 본인이나 다른 사람의 민감한 개인정보가 포함되지 않았는지 확인해야 합니다. Roots는 안전한 커뮤니티 운영을 위해 신고·숨김 기능을 제공합니다."],
      },
      {
        title: "7. 서비스 제공업체와 처리 위치",
        items: [
          "Supabase (영국 런던, eu-west-2): 인증, 데이터베이스, 프로필 이미지와 사진 묵상 저장",
          "Vercel (영국 런던, lhr1): 웹 호스팅과 서버 기능. 정적 파일은 글로벌 전송 네트워크를 통해 제공될 수 있음",
          "Google OAuth 및 Apple OAuth: 사용자가 선택한 소셜 로그인",
          "Apple Push Notification service 및 Firebase Cloud Messaging: 사용자가 알림을 허용한 경우 푸시 전달",
          "Bible API: 성경 번역·본문 요청. 묵상이나 기도 내용은 전송하지 않음",
          "jsDelivr: Pretendard 글꼴 스타일 제공 과정에서 IP 주소와 브라우저 정보가 전달될 수 있음",
        ],
        paragraphs: ["Roots는 개인정보를 판매하거나 맞춤형 광고에 사용하지 않습니다. 제공업체가 영국, 미국 또는 그 밖의 국가에서 정보를 처리하는 경우 적용 가능한 계약 및 데이터 보호 장치를 이용합니다."],
      },
      {
        title: "8. 기기 권한과 로컬 저장",
        paragraphs: ["카메라와 사진 보관함 권한은 사용자가 프로필 사진 또는 사진 묵상 기능을 선택할 때만 요청합니다. 알림 권한도 사용자가 알림 기능을 선택할 때 요청합니다.", "언어·테마 설정과 작성 중인 임시 초안 등은 사용자 기기에 저장될 수 있습니다. 계정 삭제가 성공하면 해당 기기의 Roots 로컬 데이터도 삭제됩니다. 다른 기기에 남은 앱 데이터는 해당 기기에서 앱 데이터 삭제 또는 앱 제거를 통해 지울 수 있습니다."],
      },
      {
        title: "9. 보관과 삭제",
        paragraphs: ["계정과 연결된 정보는 계정이 유지되는 동안 보관됩니다. 사용자가 앱에서 계정을 삭제하거나 지원 이메일로 삭제를 요청하면 계정, 묵상, 기도, 사진, 공유, 관계, 알림, 보상 및 상점 기록 등 계정과 연결된 활성 데이터가 삭제됩니다.", "삭제된 데이터는 복구할 수 없습니다. 제한된 백업 사본은 서비스 제공업체의 기술적 백업 주기에 따라 교체될 때까지 남을 수 있으나 일반 서비스 제공에 다시 사용하지 않습니다."],
      },
      {
        title: "10. 이용자의 권리",
        items: ["개인정보 열람과 사본 요청", "부정확한 정보의 정정", "삭제와 처리 제한", "데이터 이동", "동의 철회", "정당한 이익에 근거한 처리에 대한 반대", "관할 개인정보 감독기관에 민원 제기"],
        paragraphs: ["요청은 support@christian-roots.com 으로 보낼 수 있습니다. 계정 보호를 위해 본인 확인을 요청할 수 있습니다. Roots는 법적 효력이 있는 자동화된 의사결정이나 광고 프로파일링을 하지 않습니다."],
      },
      {
        title: "11. 아동과 청소년",
        paragraphs: ["Roots는 특정 연령으로 이용 대상을 제한하지 않습니다. 다만 거주 지역의 법률상 이용자 본인이 개인정보 처리에 유효하게 동의할 수 없는 경우에는 부모 또는 법정대리인의 승인 등 필요한 절차를 거쳐야 합니다.", "부모 또는 법정대리인은 미성년자의 정보 확인이나 삭제를 위해 support@christian-roots.com 으로 연락할 수 있습니다. 미성년자의 기록도 기본적으로 비공개이며 직접 공유를 선택하기 전에는 다른 사용자에게 표시되지 않습니다."],
      },
      {
        title: "12. 보안과 방침 변경",
        paragraphs: ["Roots는 접근 통제, 비공개 저장소, 전송 암호화 및 계정별 권한을 포함한 기술적·관리적 보호 조치를 사용합니다. 다만 인터넷을 통한 전송이나 전자 저장의 절대적인 안전을 보장할 수는 없습니다.", "중요한 처리 방식이 변경되면 이 페이지의 수정일을 갱신하고, 필요한 경우 앱 안에서 별도로 안내합니다."],
      },
      {
        title: "13. 문의와 감독기관",
        paragraphs: ["개인정보 문의: support@christian-roots.com", "독일 헤센주의 관할 감독기관: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Wilhelmstraße 7, 65185 Wiesbaden, Deutschland\n웹사이트: https://datenschutz.hessen.de"],
      },
    ],
  },
  de: {
    back: "Zurück",
    title: "Datenschutzerklärung",
    subtitle: "Diese Erklärung erläutert, wie Roots personenbezogene Daten verarbeitet und schützt.",
    updated: "Gültig und zuletzt aktualisiert am 17. Juli 2026",
    sections: [
      { title: "1. Verantwortlicher", paragraphs: ["Chungman Jeong\nHauptstraße 11, 65812 Bad Soden am Taunus, Deutschland\nE-Mail: support@christian-roots.com"] },
      { title: "2. Privat als Standard und freiwilliges Teilen", paragraphs: ["Einträge zur Stillen Zeit, Gebetsanliegen und Foto-Meditationen sind standardmäßig nur für die Person sichtbar, die sie erstellt hat. Roots veröffentlicht diese Inhalte nicht automatisch für andere Nutzer.", "Nur wenn Sie selbst einen Empfängerkreis wie die gesamte Community, eine Gruppe oder Glaubenspartner auswählen, wird der Inhalt in diesem gewählten Umfang geteilt. Das Beenden einer Freigabe löscht Ihren privaten Originaleintrag nicht automatisch."] },
      { title: "3. Verarbeitete Daten", items: ["Konto und Anmeldung: E-Mail-Adresse, Anmeldeanbieter und interne Nutzer-ID", "Profil: Nickname, optionales Profilfoto oder Roots-Charakter, Sprache und bevorzugte Bibelübersetzung", "Glaubensinhalte: Einträge zur Stillen Zeit, Gebetsanliegen und Gebetserhörungen, emotionale Check-ins, Foto-Meditationen und Bildbeschreibungen", "Community: gewählte Sichtbarkeit, Gruppen und Glaubenspartner, Reaktionen, gemeinsames Beten, Meldungen und ausgeblendete Inhalte", "Aktivität und Belohnungen: Abschlussdaten, Serien, Challenges, Abzeichen, Love-Hearts-Verlauf sowie gekaufte und aktivierte Shop-Artikel", "Benachrichtigung und Support: Einstellungen, Push-Token, Feedback und Supportanfragen", "Lokale Gerätedaten: Sprache, Design, Textgröße, geplante Benachrichtigungen und temporäre Entwürfe"] },
      { title: "4. Sensible Glaubensinhalte", paragraphs: ["Einträge zur Stillen Zeit und Gebete können religiöse Überzeugungen erkennen lassen. Roots verarbeitet sie nur, wenn Sie diese selbst eingeben oder speichern lassen. Wir leiten daraus keine Religionsprofile ab und nutzen sie nicht für Werbung.", "Soweit eine ausdrückliche Einwilligung für besondere Kategorien personenbezogener Daten erforderlich ist, beruht die Verarbeitung auf dieser Einwilligung. Sie können eine Einwilligung widerrufen oder die betreffenden Einträge und Ihr Konto löschen."] },
      { title: "5. Zwecke und Rechtsgrundlagen", items: ["Konto, Anmeldung sowie Funktionen für Stille Zeit, Gebet, Community und Belohnungen: Vertragserfüllung oder vorvertragliche Maßnahmen auf Ihre Anfrage", "Optionale Profilbilder, Freigaben, Benachrichtigungen und besondere Kategorien von Daten: Ihre Einwilligung, soweit erforderlich", "Fehlerbehebung, Sicherheit, Missbrauchs- und Meldungsbearbeitung: berechtigtes Interesse an einem sicheren Dienst", "Gesetzlich vorgeschriebene Verarbeitung: Erfüllung rechtlicher Verpflichtungen"] },
      { title: "6. Sichtbarkeit und Veröffentlichung", paragraphs: ["Profilname, Profilbild sowie von Ihnen ausdrücklich geteilte Einträge können dem gewählten Empfängerkreis angezeigt werden. Private Einträge erscheinen nicht in der Community.", "Bitte prüfen Sie vor dem Teilen, ob ein Eintrag sensible Daten über Sie oder andere Personen enthält. Für eine sichere Community stellt Roots Melde- und Ausblendfunktionen bereit."] },
      { title: "7. Dienstleister und Verarbeitungsorte", items: ["Supabase (London, Vereinigtes Königreich, eu-west-2): Authentifizierung, Datenbank sowie Speicherung von Profilbildern und Foto-Meditationen", "Vercel (London, Vereinigtes Königreich, lhr1): Hosting und Serverfunktionen; statische Dateien können über ein globales Auslieferungsnetz bereitgestellt werden", "Google OAuth und Apple OAuth: optionale Anmeldung mit einem externen Konto", "Apple Push Notification service und Firebase Cloud Messaging: Push-Zustellung nach Ihrer Aktivierung", "Bible API: Abruf von Bibelübersetzungen und Bibeltexten; Einträge zur Stillen Zeit und Gebete werden nicht übermittelt", "jsDelivr: Bereitstellung des Pretendard-Schriftstils; dabei können IP-Adresse und Browserinformationen übertragen werden"], paragraphs: ["Roots verkauft keine personenbezogenen Daten und verwendet sie nicht für personalisierte Werbung. Bei Verarbeitung im Vereinigten Königreich, in den USA oder in anderen Staaten werden die anwendbaren vertraglichen und datenschutzrechtlichen Garantien eingesetzt."] },
      { title: "8. Geräteberechtigungen und lokale Speicherung", paragraphs: ["Kamera- und Fotomediathek-Zugriff werden nur angefragt, wenn Sie ein Profilfoto oder eine Foto-Meditation verwenden. Die Benachrichtigungsberechtigung wird nur für die von Ihnen gewählte Erinnerungsfunktion angefragt.", "Sprache, Design und temporäre Entwürfe können auf Ihrem Gerät gespeichert werden. Nach erfolgreicher Kontolöschung werden die lokalen Roots-Daten auf diesem Gerät gelöscht. Daten auf anderen Geräten können dort durch Löschen der App-Daten oder Entfernen der App gelöscht werden."] },
      { title: "9. Speicherdauer und Löschung", paragraphs: ["Kontobezogene Daten werden gespeichert, solange das Konto besteht. Wenn Sie das Konto in der App löschen oder die Löschung per E-Mail anfordern, werden das Konto und die damit verbundenen aktiven Daten einschließlich Einträgen, Fotos, Freigaben, Beziehungen, Benachrichtigungen, Belohnungen und Shop-Daten gelöscht.", "Gelöschte Daten können nicht wiederhergestellt werden. Begrenzte Sicherungskopien können bis zur regulären Überschreibung im technischen Sicherungszyklus des Dienstleisters verbleiben, werden jedoch nicht erneut für den laufenden Dienst verwendet."] },
      { title: "10. Ihre Rechte", items: ["Auskunft und Kopie", "Berichtigung", "Löschung und Einschränkung", "Datenübertragbarkeit", "Widerruf einer Einwilligung", "Widerspruch gegen Verarbeitung auf Grundlage berechtigter Interessen", "Beschwerde bei einer Datenschutzaufsichtsbehörde"], paragraphs: ["Anfragen können Sie an support@christian-roots.com richten. Zum Schutz des Kontos kann ein Identitätsnachweis erforderlich sein. Roots trifft keine rechtlich wirksamen automatisierten Entscheidungen und erstellt keine Werbeprofile."] },
      { title: "11. Kinder und Jugendliche", paragraphs: ["Roots beschränkt die Nutzung nicht auf ein bestimmtes Alter. Kann eine Person nach dem Recht ihres Wohnorts nicht selbst wirksam in eine Datenverarbeitung einwilligen, ist jedoch eine erforderliche Zustimmung oder Genehmigung der Eltern beziehungsweise gesetzlichen Vertretung einzuholen.", "Eltern oder gesetzliche Vertreter können sich wegen Auskunft oder Löschung an support@christian-roots.com wenden. Auch die Einträge Minderjähriger sind standardmäßig privat und werden erst nach einer aktiven Freigabe angezeigt."] },
      { title: "12. Sicherheit und Änderungen", paragraphs: ["Roots verwendet technische und organisatorische Schutzmaßnahmen wie Zugriffskontrollen, private Speicherbereiche, verschlüsselte Übertragung und kontobezogene Berechtigungen. Eine absolute Sicherheit elektronischer Übertragung oder Speicherung kann dennoch nicht garantiert werden.", "Bei wesentlichen Änderungen aktualisieren wir das Datum auf dieser Seite und informieren, soweit erforderlich, zusätzlich in der App."] },
      { title: "13. Kontakt und Aufsichtsbehörde", paragraphs: ["Datenschutzanfragen: support@christian-roots.com", "Zuständige Aufsichtsbehörde in Hessen: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Wilhelmstraße 7, 65185 Wiesbaden, Deutschland\nWebsite: https://datenschutz.hessen.de"] },
    ],
  },
  en: {
    back: "Back",
    title: "Privacy Policy",
    subtitle: "This policy explains how Roots processes and protects personal data.",
    updated: "Effective and last updated: July 17, 2026",
    sections: [
      { title: "1. Data controller", paragraphs: ["Chungman Jeong\nHauptstraße 11, 65812 Bad Soden am Taunus, Germany\nEmail: support@christian-roots.com"] },
      { title: "2. Private by default and optional sharing", paragraphs: ["Bible Reflection entries, prayer requests, and photo reflections are private by default and visible only to the person who created them. Roots does not automatically publish them to other users.", "Content is shared only when you actively select an audience such as the whole community, a group, or faith partners. Turning off sharing does not automatically delete your private original record."] },
      { title: "3. Data we process", items: ["Account and authentication: email address, sign-in provider, and internal user ID", "Profile: nickname, optional profile photo or Roots character, preferred language and Bible translation", "Faith records: Bible Reflections, prayer requests and answers, emotion check-ins, photo reflections, and captions", "Community: selected visibility, groups and faith partners, reactions, prayer participation, reports, and hidden-content settings", "Activity and rewards: completion dates, streaks, challenges, badges, Love Heart history, purchases, and equipped shop items", "Notifications and support: notification settings, push token, feedback, and support requests", "On-device data: language, theme, text-size settings, scheduled reminders, and temporary reflection drafts"] },
      { title: "4. Sensitive faith information", paragraphs: ["Bible Reflections and prayers may reveal religious beliefs. Roots processes this information only when you actively enter it or ask us to save it. We do not infer a religious profile from it or use it for advertising.", "Where explicit consent is required for special categories of personal data, processing is based on that consent. You may withdraw consent or delete the relevant records and your account."] },
      { title: "5. Purposes and legal bases", items: ["Account, authentication, Bible Reflection, prayer, community, and reward functions: performance of a contract or steps requested by you", "Optional profile images, sharing, notifications, and special-category data: consent where required", "Troubleshooting, service security, abuse prevention, and reports: legitimate interests in operating a safe service", "Processing required by law: compliance with legal obligations"] },
      { title: "6. Visibility and publication", paragraphs: ["Your nickname, profile image, and entries you deliberately share may be shown to the audience you selected. Private entries do not appear in the community.", "Before sharing, please check that a record does not contain sensitive information about you or another person. Roots provides reporting and hiding controls to support a safe community."] },
      { title: "7. Providers and processing locations", items: ["Supabase (London, United Kingdom, eu-west-2): authentication, database, profile images, and photo-reflection storage", "Vercel (London, United Kingdom, lhr1): hosting and server functions; static assets may be delivered through a global network", "Google OAuth and Apple OAuth: optional social sign-in", "Apple Push Notification service and Firebase Cloud Messaging: push delivery after you enable notifications", "Bible API: Bible translation and passage requests; your reflections and prayers are not sent", "jsDelivr: delivery of the Pretendard font style, which may transmit IP address and browser information"], paragraphs: ["Roots does not sell personal data or use it for personalized advertising. Where a provider processes information in the United Kingdom, the United States, or another country, applicable contractual and data-protection safeguards are used."] },
      { title: "8. Device permissions and local storage", paragraphs: ["Camera and photo-library access are requested only when you choose a profile photo or photo reflection. Notification permission is requested only for reminder features you choose to enable.", "Language, theme, and temporary drafts may be stored on your device. After a successful account deletion, local Roots data on that device is cleared. Data remaining on another device can be removed there by clearing app data or uninstalling the app."] },
      { title: "9. Retention and deletion", paragraphs: ["Account-linked information is kept while your account exists. When you delete the account in the app or request deletion by email, the account and its linked active data—including records, photos, shares, relationships, notifications, rewards, and shop data—are deleted.", "Deleted data cannot be restored. Limited backup copies may remain until they are overwritten in a provider's normal technical backup cycle, but they are not returned to active service use."] },
      { title: "10. Your rights", items: ["Access and a copy of your data", "Correction", "Deletion and restriction", "Data portability", "Withdrawal of consent", "Objection to processing based on legitimate interests", "A complaint to a competent data-protection authority"], paragraphs: ["Send requests to support@christian-roots.com. We may verify identity to protect the account. Roots does not make legally significant automated decisions or create advertising profiles."] },
      { title: "11. Children and young people", paragraphs: ["Roots does not limit use to a specific age. If a person cannot validly consent to data processing under the law where they live, any consent or authorization required from a parent or legal guardian must be obtained.", "Parents and guardians may contact support@christian-roots.com to request access or deletion. A minor's records are also private by default and are not shown to others unless sharing is actively selected."] },
      { title: "12. Security and policy changes", paragraphs: ["Roots uses technical and organizational safeguards including access controls, private storage, encrypted transmission, and account-based permissions. No method of electronic transmission or storage can be guaranteed as completely secure.", "If our processing changes materially, we will update the date on this page and provide an in-app notice where required."] },
      { title: "13. Contact and supervisory authority", paragraphs: ["Privacy requests: support@christian-roots.com", "Competent authority in Hesse, Germany: The Hessian Commissioner for Data Protection and Freedom of Information, Wilhelmstraße 7, 65185 Wiesbaden, Germany\nWebsite: https://datenschutz.hessen.de"] },
    ],
  },
  fr: {
    back: "Retour",
    title: "Politique de confidentialité",
    subtitle: "Cette politique explique comment Roots traite et protège les données personnelles.",
    updated: "Entrée en vigueur et dernière mise à jour : 17 juillet 2026",
    sections: [
      { title: "1. Responsable du traitement", paragraphs: ["Chungman Jeong\nHauptstraße 11, 65812 Bad Soden am Taunus, Allemagne\nE-mail : support@christian-roots.com"] },
      { title: "2. Confidentialité par défaut et partage facultatif", paragraphs: ["Les méditations bibliques, sujets de prière et méditations photo sont privés par défaut et visibles uniquement par la personne qui les a créés. Roots ne les publie pas automatiquement auprès d’autres utilisateurs.", "Le contenu n’est partagé que si vous choisissez activement un public, par exemple toute la communauté, un groupe ou des partenaires de foi. Mettre fin au partage ne supprime pas automatiquement votre enregistrement privé d’origine."] },
      { title: "3. Données traitées", items: ["Compte et authentification : adresse e-mail, fournisseur de connexion et identifiant interne", "Profil : pseudo, photo de profil facultative ou personnage Roots, langue et traduction biblique préférées", "Données de foi : méditations bibliques, sujets de prière et réponses, check-ins émotionnels, méditations photo et légendes", "Communauté : visibilité choisie, groupes et partenaires de foi, réactions, participation à la prière, signalements et contenus masqués", "Activité et récompenses : dates d’accomplissement, séries, défis, badges, historique des Love Hearts, achats et objets équipés", "Notifications et assistance : réglages, jeton push, retours et demandes d’assistance", "Données sur l’appareil : langue, thème, taille du texte, rappels programmés et brouillons temporaires"] },
      { title: "4. Informations religieuses sensibles", paragraphs: ["Les méditations et prières peuvent révéler des convictions religieuses. Roots ne les traite que lorsque vous les saisissez ou demandez leur enregistrement. Nous n’en déduisons pas de profil religieux et ne les utilisons pas à des fins publicitaires.", "Lorsqu’un consentement explicite est requis pour des catégories particulières de données, le traitement repose sur ce consentement. Vous pouvez le retirer ou supprimer les données concernées et votre compte."] },
      { title: "5. Finalités et bases juridiques", items: ["Compte, authentification, méditation, prière, communauté et récompenses : exécution du contrat ou mesures demandées par vous", "Photo de profil, partage, notifications et données particulières facultatives : consentement lorsque celui-ci est requis", "Correction d’erreurs, sécurité, prévention des abus et signalements : intérêt légitime à exploiter un service sûr", "Traitements imposés par la loi : respect des obligations légales"] },
      { title: "6. Visibilité et publication", paragraphs: ["Votre pseudo, votre image de profil et les contenus que vous partagez volontairement peuvent être affichés au public choisi. Les entrées privées n’apparaissent pas dans la communauté.", "Avant tout partage, vérifiez que le contenu ne comporte pas d’informations sensibles sur vous ou une autre personne. Roots propose des outils de signalement et de masquage pour protéger la communauté."] },
      { title: "7. Prestataires et lieux de traitement", items: ["Supabase (Londres, Royaume-Uni, eu-west-2) : authentification, base de données et stockage des images", "Vercel (Londres, Royaume-Uni, lhr1) : hébergement et fonctions serveur ; les fichiers statiques peuvent être distribués par un réseau mondial", "Google OAuth et Apple OAuth : connexion sociale facultative", "Apple Push Notification service et Firebase Cloud Messaging : envoi des notifications après activation", "Bible API : demandes de traductions et de textes bibliques ; vos méditations et prières ne sont pas transmises", "jsDelivr : fourniture du style de police Pretendard, pouvant transmettre l’adresse IP et des informations du navigateur"], paragraphs: ["Roots ne vend pas de données personnelles et ne les utilise pas pour de la publicité personnalisée. Lorsqu’un prestataire traite des données au Royaume-Uni, aux États-Unis ou dans un autre pays, les garanties contractuelles et de protection applicables sont utilisées."] },
      { title: "8. Autorisations et stockage local", paragraphs: ["L’accès à l’appareil photo et à la photothèque n’est demandé que si vous choisissez une photo de profil ou une méditation photo. L’autorisation de notification n’est demandée que pour les rappels que vous activez.", "La langue, le thème et les brouillons temporaires peuvent être enregistrés sur l’appareil. Après la suppression réussie du compte, les données locales de Roots sur cet appareil sont effacées. Sur un autre appareil, elles peuvent être supprimées en effaçant les données de l’app ou en la désinstallant."] },
      { title: "9. Conservation et suppression", paragraphs: ["Les informations liées au compte sont conservées tant que celui-ci existe. Lorsque vous supprimez le compte dans l’app ou par e-mail, le compte et ses données actives associées, notamment les enregistrements, photos, partages, relations, notifications, récompenses et données de boutique, sont supprimés.", "Les données supprimées ne peuvent pas être restaurées. Des copies de sauvegarde limitées peuvent subsister jusqu’à leur remplacement dans le cycle technique normal du prestataire, sans être réutilisées dans le service actif."] },
      { title: "10. Vos droits", items: ["Accès et copie", "Rectification", "Effacement et limitation", "Portabilité", "Retrait du consentement", "Opposition au traitement fondé sur l’intérêt légitime", "Réclamation auprès d’une autorité de protection des données"], paragraphs: ["Adressez vos demandes à support@christian-roots.com. Une vérification d’identité peut être demandée pour protéger le compte. Roots ne prend aucune décision automatisée ayant un effet juridique et ne crée pas de profil publicitaire."] },
      { title: "11. Enfants et adolescents", paragraphs: ["Roots ne limite pas son utilisation à un âge précis. Si une personne ne peut pas consentir valablement au traitement selon la loi de son lieu de résidence, l’accord ou l’autorisation nécessaire d’un parent ou représentant légal doit être obtenu.", "Les parents et représentants légaux peuvent contacter support@christian-roots.com pour demander l’accès ou la suppression. Les données d’un mineur sont elles aussi privées par défaut et ne sont visibles qu’après un partage actif."] },
      { title: "12. Sécurité et modifications", paragraphs: ["Roots utilise des mesures techniques et organisationnelles telles que le contrôle d’accès, le stockage privé, le chiffrement des transmissions et des autorisations liées au compte. Aucune transmission ou conservation électronique ne peut toutefois être garantie comme totalement sûre.", "En cas de modification importante, nous mettrons à jour la date de cette page et fournirons une information dans l’app lorsque cela est requis."] },
      { title: "13. Contact et autorité de contrôle", paragraphs: ["Demandes relatives aux données : support@christian-roots.com", "Autorité compétente en Hesse : Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Wilhelmstraße 7, 65185 Wiesbaden, Allemagne\nSite : https://datenschutz.hessen.de"] },
    ],
  },
} as const;

export default function PrivacyPage() {
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
