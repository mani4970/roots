// ────────────────────────────────────────────────
// Roots 앱 다국어 번역 (i18n)
// 지원 언어: ko (한국어), de (독일어)
// profiles.preferred_language 로 저장/불러옴
// ────────────────────────────────────────────────

export type Lang = "ko" | "de";

export const T = {
  // ── BottomNav ──
  nav_home:       { ko: "홈",       de: "Startseite" },
  nav_prayer:     { ko: "기도",     de: "Gebet" },
  nav_qt:         { ko: "큐티",     de: "Stille Zeit" },
  nav_community:  { ko: "커뮤니티", de: "Gemeinde" },
  nav_profile:    { ko: "프로필",   de: "Profil" },

  // ── 홈 ──
  home_title:           { ko: "오늘 루틴",                    de: "Heute" },
  home_checkin_btn:     { ko: "오늘의 말씀 받기",              de: "Tagesvers erhalten" },
  home_checkin_done:    { ko: "오늘의 말씀",                   de: "Tagesvers" },
  home_qt_btn:          { ko: "큐티하기",                     de: "Stille Zeit" },
  home_qt_done:         { ko: "큐티 완료",                    de: "Stille Zeit ✓" },
  home_prayer_title:    { ko: "오늘 잠깐이라도 기도하셨나요?",  de: "Haben Sie heute gebetet?" },
  home_prayer_yes:      { ko: "네, 기도했어요 🙏",             de: "Ja, ich habe gebetet 🙏" },
  home_prayer_later:    { ko: "나중에",                       de: "Später" },
  home_prayer_done:     { ko: "기도 완료 🙏",                 de: "Gebetet 🙏" },
  home_decision_title:  { ko: "오늘의 결단",                  de: "Heutiger Vorsatz" },
  home_decision_done:   { ko: "결단 완료 ✓",                  de: "Erledigt ✓" },
  home_decision_check:  { ko: "결단 실천하기",                 de: "Vorsatz umsetzen" },
  home_streak:          { ko: "일 연속 기록 중 🔥",            de: "Tage in Folge 🔥" },
  home_routine_complete:{ ko: "오늘 루틴 완료! 정원을 확인해보세요 🌱", de: "Heute erledigt! Garten ansehen 🌱" },

  // ── 감정 체크인 ──
  checkin_title:   { ko: "오늘 마음이\n어때요?",   de: "Wie fühlen\nSie sich?" },
  checkin_sub:     { ko: "하나를 선택하면 말씀을 드릴게요", de: "Wählen Sie eines aus" },
  checkin_cat1:    { ko: "기쁨 & 감사",          de: "Freude & Dankbarkeit" },
  checkin_cat2:    { ko: "은혜 & 영적 갈망",      de: "Gnade & geistl. Hunger" },
  checkin_cat3:    { ko: "힘듦 & 지침",          de: "Erschöpfung & Müdigkeit" },
  checkin_cat4:    { ko: "흔들림 & 메마름",       de: "Zweifel & Trockenheit" },
  checkin_cat5:    { ko: "오늘의 기도",           de: "Heutiges Gebet" },
  checkin_receive: { ko: "말씀 받기 →",           de: "Vers empfangen →" },

  // 감정 라벨
  emotion_grateful:  { ko: "감사해요",              de: "Dankbar" },
  emotion_joyful:    { ko: "기뻐요",                de: "Freudig" },
  emotion_peaceful:  { ko: "평안해요",               de: "Friedlich" },
  emotion_excited:   { ko: "설레요",                de: "Aufgeregt" },
  emotion_full:      { ko: "충만해요",               de: "Erfüllt" },
  emotion_grace:     { ko: "은혜받았어요",            de: "Gnade erfahren" },
  emotion_hungry:    { ko: "말씀이 고파요",           de: "Hungrig nach Gottes Wort" },
  emotion_mission:   { ko: "사명감이 생겨요",         de: "Berufen" },
  emotion_repent:    { ko: "회개해요",               de: "Reue" },
  emotion_renew:     { ko: "새로워지고 싶어요",       de: "Erneuerung" },
  emotion_tired:     { ko: "힘들어요",               de: "Erschöpft" },
  emotion_exhausted: { ko: "지쳐요",                de: "Ausgebrannt" },
  emotion_lonely:    { ko: "외로워요",               de: "Einsam" },
  emotion_sad:       { ko: "슬퍼요",                de: "Traurig" },
  emotion_anxious:   { ko: "불안해요",               de: "Ängstlich" },
  emotion_doubt:     { ko: "의심돼요",               de: "Zweifelnd" },
  emotion_dry:       { ko: "메말랐어요",              de: "Ausgetrocknet" },
  emotion_angry:     { ko: "화가나요",               de: "Verärgert" },
  emotion_far:       { ko: "하나님이 멀게 느껴져요",  de: "Gott fühlt sich fern an" },
  emotion_family:    { ko: "가정을 위해",             de: "Für die Familie" },
  emotion_work:      { ko: "직장·학업을 위해",        de: "Für Arbeit & Studium" },
  emotion_relation:  { ko: "관계를 위해",             de: "Für Beziehungen" },
  emotion_health:    { ko: "건강을 위해",             de: "Für die Gesundheit" },
  emotion_future:    { ko: "미래를 위해",             de: "Für die Zukunft" },

  // ── 말씀 결과 ──
  result_loading:   { ko: "마음에 맞는 말씀을 찾고 있어요...", de: "Vers wird gesucht..." },
  result_title:     { ko: "오늘의 말씀",             de: "Tagesvers" },
  result_sub:       { ko: "선택한 마음에 맞는 말씀이에요", de: "Passend zu Ihrer Stimmung" },
  result_mission:   { ko: "오늘의 결단 미션",         de: "Heutiger Vorsatz" },
  result_home_btn:  { ko: "홈에서 확인하기 →",        de: "Zur Startseite →" },
  result_home_sub:  { ko: "홈에 말씀과 결단이 저장돼요", de: "Vers und Vorsatz werden gespeichert" },
  back:             { ko: "돌아가기",                de: "Zurück" },

  // ── 큐티 탭 ──
  qt_title:         { ko: "큐티",                   de: "Stille Zeit" },
  qt_sub:           { ko: "말씀과 함께하는 조용한 시간", de: "Stille Zeit mit Gottes Wort" },
  qt_start_btn:     { ko: "오늘 큐티 시작하기",       de: "Stille Zeit beginnen" },
  qt_done:          { ko: "오늘 큐티 완료!",          de: "Stille Zeit erledigt!" },
  qt_done_sub:      { ko: "말씀 앞에 앉은 당신, 수고했어요", de: "Gut gemacht!" },
  qt_sunday:        { ko: "🙌 오늘은 주일이에요!",    de: "🙌 Heute ist Sonntag!" },
  qt_sunday_sub:    { ko: "6단계 큐티 대신 주일예배 큐티를 진행해 주세요.", de: "Bitte Sonntagsgottesdienst-Stille Zeit durchführen." },
  qt_today_passage: { ko: "오늘의 큐티 본문",         de: "Heutiger Abschnitt" },
  qt_records:       { ko: "지난 큐티 기록",           de: "Frühere Stille Zeiten" },
  qt_no_records:    { ko: "아직 큐티 기록이 없어요.\n오늘 첫 큐티를 시작해보세요! 🌱", de: "Noch keine Aufzeichnungen.\nStarte heute deine erste Stille Zeit! 🌱" },
  qt_mode_6step:    { ko: "6단계 큐티",              de: "6-Schritte" },
  qt_mode_sunday:   { ko: "주일예배 큐티",            de: "Sonntagsgottesdienst" },
  qt_mode_free:     { ko: "자유형식 큐티",            de: "Freie Form" },
  qt_mode_select:   { ko: "오늘 큐티 방식을 선택해주세요", de: "Bitte Methode wählen" },
  qt_draft_title:   { ko: "이어서 할까요?",           de: "Weiter machen?" },
  qt_draft_sub:     { ko: "작성 중인 큐티가 있어요.\n이어서 하시겠어요?", de: "Es gibt eine unvollständige Stille Zeit.\nMöchten Sie weitermachen?" },
  qt_draft_continue:{ ko: "이어서 하기",              de: "Fortfahren" },
  qt_draft_new:     { ko: "처음부터 새로 하기",        de: "Neu beginnen" },
  qt_draft_later:   { ko: "나중에 할게요",            de: "Später" },

  // ── 큐티 작성 ──
  qt_write_opening: { ko: "들어가는 기도",            de: "Eröffnungsgebet" },
  qt_write_summary: { ko: "본문 요약 & 붙잡은 말씀",   de: "Zusammenfassung & Schlüsselvers" },
  qt_write_meditate:{ ko: "느낌과 묵상",              de: "Empfinden & Meditation" },
  qt_write_decision:{ ko: "적용과 결단",              de: "Anwendung & Entschluss" },
  qt_write_closing: { ko: "올려드리는 기도",           de: "Abschlussgebet" },
  qt_write_save:    { ko: "큐티 저장",               de: "Speichern" },
  qt_write_draft:   { ko: "임시저장",                de: "Entwurf" },
  qt_write_complete:{ ko: "완료",                    de: "Fertig" },
  qt_step_summary:  { ko: "2단계 · 본문 요약",        de: "Schritt 2 · Zusammenfassung" },
  qt_step_keyverse: { ko: "3단계 · 붙잡은 말씀",      de: "Schritt 3 · Schlüsselvers" },
  qt_step_meditate: { ko: "4단계 · 느낌과 묵상",      de: "Schritt 4 · Meditation" },
  qt_step_decision: { ko: "5단계 · 적용과 결단",      de: "Schritt 5 · Entschluss" },

  // ── 기도 탭 ──
  prayer_title:     { ko: "기도",                   de: "Gebet" },
  prayer_tab_praying:{ ko: "기도 중",               de: "Im Gebet" },
  prayer_tab_answered:{ ko: "기도 응답",             de: "Erhörtes Gebet" },
  prayer_add:       { ko: "+ 기도 제목 추가",         de: "+ Gebetsanliegen hinzufügen" },
  prayer_placeholder:{ ko: "기도 제목을 입력하세요...", de: "Gebetsanliegen eingeben..." },
  prayer_save:      { ko: "저장",                   de: "Speichern" },
  prayer_together:  { ko: "함께 기도할게요",          de: "Gemeinsam beten" },
  prayer_prayed:    { ko: "기도했어요",              de: "Gebetet" },
  prayer_answered:  { ko: "기도 응답됨",             de: "Erhört" },
  prayer_share:     { ko: "중보 요청",               de: "Fürbitte" },
  prayer_no_items:  { ko: "기도 제목을 추가해보세요 🙏", de: "Gebetsanliegen hinzufügen 🙏" },
  prayer_no_answered:{ ko: "아직 기도 응답이 없어요.\n하나님이 반드시 응답하세요!", de: "Noch keine erhörten Gebete.\nGott antwortet!" },

  // ── 커뮤니티 탭 ──
  community_title:  { ko: "커뮤니티",               de: "Gemeinde" },
  community_tab_prayer:{ ko: "중보기도",             de: "Fürbitte" },
  community_tab_qt: { ko: "큐티 나눔",              de: "Stille Zeit teilen" },
  community_tab_group:{ ko: "그룹",                 de: "Gruppe" },
  community_pray_together:{ ko: "함께 기도할게요",   de: "Gemeinsam beten" },
  community_prayed: { ko: "기도했어요",              de: "Gebetet" },
  community_create_group:{ ko: "그룹 만들기",        de: "Gruppe erstellen" },
  community_join_group:{ ko: "그룹 참여",            de: "Gruppe beitreten" },

  // ── 프로필 탭 ──
  profile_faith_journey:{ ko: "신앙 여정",           de: "Glaubensweg" },
  profile_faith_fruits: { ko: "신앙의 결실",         de: "Glaubensfrüchte" },
  profile_spirit_fruits:{ ko: "성령의 열매",         de: "Früchte des Geistes" },
  profile_qt_calendar: { ko: "큐티 현황",            de: "Stille Zeit Kalender" },
  profile_invite:   { ko: "친구 초대하기",           de: "Freunde einladen" },
  profile_feedback: { ko: "💬 의견 보내기",          de: "💬 Feedback senden" },
  profile_feedback_placeholder:{ ko: "의견을 입력해 주세요...", de: "Feedback eingeben..." },
  profile_feedback_send:{ ko: "보내기",              de: "Senden" },
  profile_feedback_sending:{ ko: "전송 중...",       de: "Wird gesendet..." },
  profile_feedback_title:{ ko: "💬 의견 보내기",     de: "💬 Feedback senden" },
  profile_feedback_sub: { ko: "불편한 점, 개선 아이디어, 격려의 말씀 뭐든 환영해요!", de: "Kritik, Ideen oder Ermutigung – alles willkommen!" },
  profile_account:  { ko: "계정 관리",               de: "Kontoverwaltung" },
  profile_delete:   { ko: "계정 탈퇴",               de: "Konto löschen" },
  profile_delete_confirm:{ ko: "정말 탈퇴하시겠어요?\n모든 큐티 기록, 기도 제목이 영구 삭제돼요.", de: "Wirklich löschen?\nAlle Daten werden dauerhaft entfernt." },
  profile_delete_cancel:{ ko: "취소",                de: "Abbrechen" },
  profile_delete_confirm_btn:{ ko: "탈퇴하기",       de: "Löschen" },
  profile_deleting: { ko: "삭제 중...",              de: "Wird gelöscht..." },
  profile_streak:   { ko: "일 연속 기록 중 🔥",       de: "Tage in Folge 🔥" },
  profile_prayer_count:{ ko: "기도 제목",            de: "Gebete" },
  profile_prayer_answered_count:{ ko: "기도 응답",   de: "Erhörte Gebete" },
  profile_qt_share: { ko: "큐티 나눔",               de: "Geteilte Stillen Zeiten" },
  profile_impressum:{ ko: "Impressum",              de: "Impressum" },
  profile_privacy:  { ko: "개인정보처리방침",          de: "Datenschutz" },

  // ── 뱃지 팝업 공통 ──
  badge_thanks:     { ko: "감사해요 🙏",             de: "Danke 🙏" },

  // ── 신앙의 결실 뱃지 이름/조건 ──
  badge_rootsman_title: { ko: "루츠맨",              de: "Rootsman" },
  badge_rootsman_desc:  { ko: "7일 큐티",            de: "7 Tage" },
  badge_mose_title:     { ko: "모세",                de: "Mose" },
  badge_mose_desc:      { ko: "40일 큐티",           de: "40 Tage" },
  badge_rootsman_bible_title:{ ko: "루츠맨 성경",    de: "Rootsman Bibel" },
  badge_rootsman_bible_desc: { ko: "52일 큐티",      de: "52 Tage" },
  badge_david_title:    { ko: "다윗",                de: "David" },
  badge_david_desc:     { ko: "111일 큐티",          de: "111 Tage" },
  badge_noah_title:     { ko: "노아",                de: "Noah" },
  badge_noah_desc:      { ko: "첫 기도 응답",         de: "Erstes erhörtes Gebet" },
  badge_joseph_title:   { ko: "요셉",                de: "Josef" },
  badge_joseph_desc:    { ko: "첫 큐티 나눔",         de: "Erste geteilte Stille Zeit" },
  badge_prayer_warrior_title:{ ko: "기도의 용사",    de: "Gebetskrieger" },
  badge_prayer_warrior_desc: { ko: "중보기도 15회",   de: "15 Fürbitten" },
  badge_paul_title:     { ko: "바울",                de: "Paulus" },
  badge_paul_desc:      { ko: "함께기도 30회",        de: "30 gemeinsame Gebete" },
  badge_peter_title:    { ko: "베드로",              de: "Petrus" },
  badge_peter_desc:     { ko: "첫 그룹 만들기",       de: "Erste Gruppe erstellt" },
  badge_qt_bird_title:  { ko: "말씀 배달부",          de: "Wortüberbringer" },
  badge_qt_bird_desc:   { ko: "큐티 나눔 30회",       de: "30 geteilte Stillen Zeiten" },
  badge_angel_title:    { ko: "천사",                de: "Engel" },
  badge_angel_desc:     { ko: "성령의 열매 9개",      de: "9 Früchte des Geistes" },

  // ── 뱃지 팝업 메시지 ──
  badge_rootsman_msg:       { ko: "7일간 말씀과 함께한 당신, Roots의 진짜 시작이에요!", de: "7 Tage mit Gottes Wort – ein echter Anfang bei Roots!" },
  badge_mose_msg:           { ko: "광야의 모세처럼, 40일을 걸어온 당신을 하나님이 기억하세요!", de: "Wie Mose in der Wüste – Gott kennt Ihren 40-Tage-Weg!" },
  badge_rootsman_bible_msg: { ko: "52일! 오병이어처럼 작은 헌신이 기적을 만들어요!", de: "52 Tage! Wie bei der Brotvermehrung – kleine Hingabe macht Wunder!" },
  badge_david_msg:          { ko: "골리앗 앞에 선 다윗처럼, 담대하고 굳건한 믿음의 당신을 축복합니다!", de: "Wie David vor Goliat – mutig und standhaft im Glauben!" },
  badge_noah_msg:           { ko: "노아의 방주처럼, 하나님의 약속은 반드시 이루어져요!", de: "Wie die Arche Noah – Gottes Versprechen wird erfüllt!" },
  badge_joseph_msg:         { ko: "요셉의 꿈처럼, 당신의 나눔이 누군가에게 소망이 돼요!", de: "Wie Josefs Traum – Ihr Teilen gibt anderen Hoffnung!" },
  badge_prayer_warrior_msg: { ko: "구하고 찾는 자에게 응답하시는 하나님이 반드시 응답하실 거예요!", de: "Gott antwortet denen, die suchen und bitten – er wird antworten!" },
  badge_paul_msg:           { ko: "바울처럼 공동체를 사랑하고 위해 기도하는 당신을 축복합니다!", de: "Wie Paulus – der die Gemeinde liebt und für sie betet!" },
  badge_peter_msg:          { ko: "베드로처럼 사람을 낚는 어부가 될 당신, 더 큰 열매를 맺을 줄 믿습니다!", de: "Wie Petrus, der Menschenfischer – Sie werden große Frucht tragen!" },
  badge_qt_bird_msg:        { ko: "큐티 나눔을 통해 받은 은혜를 전하는 당신을 축복합니다.", de: "Gesegnet seien Sie, der durch das Teilen Gnade weitergibt." },
  badge_angel_msg:          { ko: "성령의 열매 9가지를 다 모은 당신을 축복합니다.", de: "Gesegnet, der alle 9 Früchte des Geistes gesammelt hat." },

  // ── 온보딩 ──
  onboarding_title1:  { ko: "Roots에 오신 걸 환영해요",  de: "Willkommen bei Roots" },
  onboarding_desc1:   { ko: "말씀에 뿌리내리고, 함께 자라다.\n매일 3가지 루틴으로 하나님과 깊어지는 시간을 만들어요.", de: "In Gottes Wort verwurzelt, gemeinsam wachsen.\n3 tägliche Routinen für eine tiefere Zeit mit Gott." },
  onboarding_title2:  { ko: "오늘 마음으로 말씀을 받아요", de: "Tagesvers nach Ihrem Herzen" },
  onboarding_desc2:   { ko: "오늘 내 감정을 선택하면\nRoots가 딱 맞는 말씀과 오늘의 결단을 건네줘요.", de: "Wählen Sie Ihre Stimmung –\nRoots gibt Ihnen den passenden Vers und Vorsatz." },
  onboarding_title3:  { ko: "큐티 6단계로 말씀을 심어요", de: "Gottes Wort in 6 Schritten" },
  onboarding_title4:  { ko: "기도 제목을 기록하고 응답을 확인해요", de: "Gebete aufzeichnen und Erhörungen sehen" },
  onboarding_desc4:   { ko: "기도 제목을 적고, 응답됐을 때 간증을 남겨요.\n중보기도 요청으로 함께 기도할 수도 있어요.", de: "Gebete aufschreiben und Zeugnisse teilen.\nGemeinsam für einander beten." },
  onboarding_title5:  { ko: "매일 하면 정원이 자라요",    de: "Täglich wächst Ihr Garten" },
  onboarding_desc5:   { ko: "큐티 + 기도 + 결단, 3가지를 모두 완료하면\n나무가 자라 100일마다 성령의 열매 배지를 받아요.", de: "Stille Zeit + Gebet + Vorsatz:\nIhr Baum wächst und alle 100 Tage gibt es eine Frucht." },
  onboarding_next:    { ko: "다음 →",                   de: "Weiter →" },
  onboarding_start:   { ko: "시작하기 🌱",               de: "Loslegen 🌱" },
  onboarding_skip:    { ko: "건너뛰기",                  de: "Überspringen" },

  // ── 복귀 팝업 ──
  welcome_back_btn:   { ko: "오늘 루틴 시작하기 🌱",     de: "Routine starten 🌱" },

  // ── 가든 팝업 ──
  garden_check_btn:   { ko: "정원 확인하러 가기 🌿",     de: "Garten ansehen 🌿" },
  badge_check_btn:    { ko: "배지 확인하기 🌟",          de: "Abzeichen ansehen 🌟" },
  garden_streak:      { ko: "일째 🔥",                  de: "Tag 🔥" },
  spirit_fruit_title: { ko: "성령의 열매 획득! 🎉",      de: "Frucht des Geistes erhalten! 🎉" },
  spirit_fruit_sub:   { ko: "100일 동안 말씀에 뿌리내린 당신에게\n하나님이 주시는 열매예요!", de: "100 Tage in Gottes Wort –\ndas ist Ihre Frucht von Gott!" },
  spirit_fruit_profile:{ ko: "프로필에서 확인할 수 있어요 ✨", de: "Im Profil ansehen ✨" },

  // ── 로그인/회원가입 ──
  login_title:        { ko: "다시 돌아오셨군요!",         de: "Willkommen zurück!" },
  login_sub:          { ko: "Roots와 함께 오늘도 말씀에 뿌리내려요", de: "Mit Roots täglich in Gottes Wort verwurzeln" },
  login_google:       { ko: "구글로 계속하기",            de: "Mit Google fortfahren" },
  login_email:        { ko: "이메일로 로그인",            de: "Mit E-Mail anmelden" },
  login_no_account:   { ko: "계정이 없으신가요?",         de: "Kein Konto?" },
  login_signup:       { ko: "회원가입",                  de: "Registrieren" },

  // ── 공통 ──
  save:     { ko: "저장",    de: "Speichern" },
  cancel:   { ko: "취소",    de: "Abbrechen" },
  close:    { ko: "닫기",    de: "Schließen" },
  delete:   { ko: "삭제",    de: "Löschen" },
  edit:     { ko: "수정",    de: "Bearbeiten" },
  confirm:  { ko: "확인",    de: "Bestätigen" },
  loading:  { ko: "로딩 중...", de: "Lädt..." },
} as const;

export type TKey = keyof typeof T;

/**
 * 번역 함수
 * @param key - 번역 키
 * @param lang - 언어 코드 (ko | de)
 */
export function t(key: TKey, lang: Lang = "ko"): string {
  return T[key][lang] ?? T[key]["ko"];
}
