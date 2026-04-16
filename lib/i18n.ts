// ────────────────────────────────────────────────
// Roots 앱 다국어 번역 (i18n)
// 현재 지원: ko (한국어), de (독일어)
// 확장 예정: en (English), fr (Français)
//
// ─── 확장 방법 ───
// 1. SUPPORTED_LANGS 에 새 언어 코드 추가
// 2. LANG_META 에 메타정보 추가 (국기, 이름)
// 3. T 객체의 각 키에 새 언어 번역 추가
//    → 누락된 번역은 FALLBACK_LANG("ko")로 자동 대체되므로 점진적 추가 가능
// ────────────────────────────────────────────────

export const SUPPORTED_LANGS = ["ko", "de"] as const;
export type Lang = typeof SUPPORTED_LANGS[number];

export const FALLBACK_LANG: Lang = "ko";

// 언어별 메타정보 (LanguagePicker, 홈 언어 스위처에서 사용)
export const LANG_META: Record<Lang, { flag: string; nativeName: string; englishName: string }> = {
  ko: { flag: "🇰🇷", nativeName: "한국어", englishName: "Korean" },
  de: { flag: "🇩🇪", nativeName: "Deutsch", englishName: "German" },
  // 추가 예시 (SUPPORTED_LANGS 에도 추가 필요):
  // en: { flag: "🇺🇸", nativeName: "English",  englishName: "English" },
  // fr: { flag: "🇫🇷", nativeName: "Français", englishName: "French"  },
};

// 부분 번역 허용: 누락 시 FALLBACK_LANG 사용
// FALLBACK_LANG("ko")만 required, 나머지는 optional → 새 언어 추가해도 TS 에러 없이 점진적 채움 가능
type Translation = Partial<Record<Lang, string>> & { [K in typeof FALLBACK_LANG]: string };

export const T = {
  // ── BottomNav ──
  nav_home:       { ko: "홈",       de: "Startseite" },
  nav_prayer:     { ko: "기도",     de: "Gebet" },
  nav_qt:         { ko: "QT",       de: "QT" },
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

  // ── 큐티(QT) 탭 ──
  qt_title:         { ko: "QT",                     de: "QT" },
  qt_sub:           { ko: "말씀과 함께하는 조용한 시간", de: "Stille Zeit mit Gottes Wort" },
  qt_start_btn:     { ko: "오늘 큐티 시작하기",       de: "QT beginnen" },
  qt_done:          { ko: "오늘 큐티 완료!",          de: "QT erledigt!" },
  qt_done_sub:      { ko: "말씀 앞에 앉은 당신, 수고했어요", de: "Gut gemacht!" },
  qt_sunday:        { ko: "🙌 오늘은 주일이에요!",    de: "🙌 Heute ist Sonntag!" },
  qt_sunday_sub:    { ko: "6단계 큐티 대신 주일예배 큐티를 진행해 주세요.", de: "Bitte Sonntagsgottesdienst-QT durchführen." },
  qt_today_passage: { ko: "오늘의 큐티 본문",         de: "Heutiger Abschnitt" },
  qt_records:       { ko: "지난 큐티 기록",           de: "Frühere QTs" },
  qt_no_records:    { ko: "아직 큐티 기록이 없어요.\n오늘 첫 큐티를 시작해보세요! 🌱", de: "Noch keine Aufzeichnungen.\nStarten Sie heute Ihre erste QT! 🌱" },
  qt_mode_6step:    { ko: "6단계 큐티",              de: "6-Schritte" },
  qt_mode_sunday:   { ko: "주일예배 큐티",            de: "Sonntagsgottesdienst" },
  qt_mode_free:     { ko: "자유형식 큐티",            de: "Freie Form" },
  qt_mode_select:   { ko: "오늘 큐티 방식을 선택해주세요", de: "Bitte Methode wählen" },
  qt_draft_title:   { ko: "이어서 할까요?",           de: "Weiter machen?" },
  qt_draft_sub:     { ko: "작성 중인 큐티가 있어요.\n이어서 하시겠어요?", de: "Es gibt eine unvollständige QT.\nMöchten Sie weitermachen?" },
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
  prayer_title:       { ko: "기도",                   de: "Gebet" },
  prayer_tab_praying: { ko: "기도 중",                de: "Im Gebet" },
  prayer_tab_answered:{ ko: "기도 응답",              de: "Erhörtes Gebet" },
  prayer_add:         { ko: "+ 기도 제목 추가",        de: "+ Gebetsanliegen hinzufügen" },
  prayer_placeholder: { ko: "기도 제목을 입력하세요...", de: "Gebetsanliegen eingeben..." },
  prayer_save:        { ko: "저장",                   de: "Speichern" },
  prayer_together:    { ko: "함께 기도할게요",         de: "Gemeinsam beten" },
  prayer_prayed:      { ko: "기도했어요",              de: "Gebetet" },
  prayer_answered:    { ko: "기도 응답됨",             de: "Erhört" },

  // ── 커뮤니티 ──
  community_create_group:{ ko: "그룹 만들기",        de: "Gruppe erstellen" },
  community_join_group:  { ko: "그룹 참여",          de: "Gruppe beitreten" },
  community_tab_prayer:  { ko: "기도",               de: "Gebet" },
  community_tab_qt:      { ko: "큐티",               de: "QT" },
  community_tab_group:   { ko: "그룹",               de: "Gruppe" },

  // ── 프로필 ──
  profile_faith_journey:{ ko: "신앙 여정",           de: "Glaubensweg" },
  profile_faith_fruits: { ko: "신앙의 결실",         de: "Glaubensfrüchte" },
  profile_spirit_fruits:{ ko: "성령의 열매",         de: "Früchte des Geistes" },
  profile_qt_calendar:  { ko: "큐티 현황",            de: "QT Kalender" },
  profile_invite:       { ko: "친구 초대하기",        de: "Freunde einladen" },
  profile_feedback:     { ko: "💬 의견 보내기",       de: "💬 Feedback senden" },
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
  profile_qt_share: { ko: "큐티 나눔",               de: "Geteilte QTs" },
  profile_impressum:{ ko: "Impressum",              de: "Impressum" },
  profile_privacy:  { ko: "개인정보처리방침",          de: "Datenschutz" },

  // 프로필 하드코딩 수정용
  profile_default_name: { ko: "성도",       de: "Nutzer" },
  profile_badge_earned: { ko: "✓ 획득",     de: "✓ Erhalten" },
  profile_logout:       { ko: "로그아웃",    de: "Abmelden" },
  profile_upload_fail:  { ko: "업로드 실패",  de: "Upload fehlgeschlagen" },
  profile_save_fail:    { ko: "사진 저장 실패", de: "Foto speichern fehlgeschlagen" },
  profile_feedback_ok:  { ko: "소중한 의견 감사해요! 😊", de: "Vielen Dank für Ihr Feedback! 😊" },
  profile_feedback_fail:{ ko: "전송에 실패했어요. 다시 시도해 주세요.", de: "Senden fehlgeschlagen. Bitte erneut versuchen." },
  profile_delete_error: { ko: "계정 삭제 중 오류가 발생했어요. cookiko313@gmail.com 으로 문의해 주세요.", de: "Fehler beim Löschen. Bitte kontaktieren Sie cookiko313@gmail.com." },
  profile_free_qt:      { ko: "자유 묵상",    de: "Freie Meditation" },
  profile_sunday_qt:    { ko: "주일예배",     de: "Sonntagsgottesdienst" },

  // ── 요일 ──
  weekday_sun: { ko: "일", de: "So" },
  weekday_mon: { ko: "월", de: "Mo" },
  weekday_tue: { ko: "화", de: "Di" },
  weekday_wed: { ko: "수", de: "Mi" },
  weekday_thu: { ko: "목", de: "Do" },
  weekday_fri: { ko: "금", de: "Fr" },
  weekday_sat: { ko: "토", de: "Sa" },

  // ── 뱃지 ──
  badge_thanks:     { ko: "감사해요 🙏",             de: "Danke 🙏" },
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
  badge_joseph_desc:    { ko: "첫 큐티 나눔",         de: "Erste geteilte QT" },
  badge_prayer_warrior_title:{ ko: "기도의 용사",    de: "Gebetskrieger" },
  badge_prayer_warrior_desc: { ko: "중보기도 15회",   de: "15 Fürbitten" },
  badge_paul_title:     { ko: "바울",                de: "Paulus" },
  badge_paul_desc:      { ko: "함께기도 30회",        de: "30 gemeinsame Gebete" },
  badge_peter_title:    { ko: "베드로",              de: "Petrus" },
  badge_peter_desc:     { ko: "첫 그룹 만들기",       de: "Erste Gruppe erstellt" },
  badge_qt_bird_title:  { ko: "말씀 배달부",          de: "Wortüberbringer" },
  badge_qt_bird_desc:   { ko: "큐티 나눔 30회",       de: "30 geteilte QTs" },
  badge_angel_title:    { ko: "천사",                de: "Engel" },
  badge_angel_desc:     { ko: "성령의 열매 9개",      de: "9 Früchte des Geistes" },

  // 뱃지 팝업 메시지
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

  // 뱃지 획득 팝업 타이틀
  badge_popup_rootsman:        { ko: "루츠맨 배지 획득! 🧑‍🌾",       de: "Rootsman-Abzeichen! 🧑‍🌾" },
  badge_popup_mose:            { ko: "모세 배지 획득! 🪄",          de: "Mose-Abzeichen! 🪄" },
  badge_popup_rootsman_bible:  { ko: "루츠맨 성경 배지 획득! 📖",     de: "Rootsman Bibel-Abzeichen! 📖" },
  badge_popup_david:           { ko: "다윗 배지 획득! 🗡️",          de: "David-Abzeichen! 🗡️" },
  badge_popup_angel:           { ko: "천사 배지 획득! 👼",           de: "Engel-Abzeichen! 👼" },
  badge_popup_joseph:          { ko: "요셉 배지 획득! 🌈",           de: "Josef-Abzeichen! 🌈" },
  badge_popup_qt_bird:         { ko: "말씀 배달부 배지 획득! 🕊️",    de: "Wortüberbringer-Abzeichen! 🕊️" },

  // ── 온보딩 ──
  onboarding_title1:  { ko: "Roots에 오신 걸 환영해요",  de: "Willkommen bei Roots" },
  onboarding_desc1:   { ko: "말씀에 뿌리내리고, 함께 자라다.\n매일 3가지 루틴으로 하나님과 깊어지는 시간을 만들어요.", de: "In Gottes Wort verwurzelt, gemeinsam wachsen.\n3 tägliche Routinen für eine tiefere Zeit mit Gott." },
  onboarding_desc1_sub: { ko: "", de: "" },
  onboarding_title2:  { ko: "오늘 마음으로 말씀을 받아요", de: "Tagesvers nach Ihrem Herzen" },
  onboarding_desc2:   { ko: "오늘 내 감정을 선택하면\nRoots가 딱 맞는 말씀과 오늘의 결단을 건네줘요.", de: "Wählen Sie Ihre Stimmung –\nRoots gibt Ihnen den passenden Vers und Vorsatz." },
  onboarding_desc2_sub: { ko: "\"기도하세요\"가 아니라\n\"오늘 점심 5분, 핸드폰 내려놓고 주님께 말 걸어보세요\"처럼\n손발로 할 수 있는 것들이에요.", de: "Nicht \"Bitte beten\" – sondern:\n\"Heute mittags 5 Minuten, Handy weglegen und mit Gott reden.\"\nKonkrete Handlungen." },
  onboarding_title3:  { ko: "큐티 6단계로 말씀을 심어요", de: "Gottes Wort in 6 Schritten" },
  onboarding_desc3:   { ko: "① 들어가는 기도\n② 본문 요약\n③ 붙잡은 말씀\n④ 느낌과 묵상\n⑤ 적용과 결단\n⑥ 올려드리는 기도", de: "① Eröffnungsgebet\n② Zusammenfassung\n③ Schlüsselvers\n④ Empfinden & Meditation\n⑤ Anwendung & Entschluss\n⑥ Abschlussgebet" },
  onboarding_desc3_sub: { ko: "처음이어도 괜찮아요.\n각 단계마다 안내가 있어서 혼자서도 충분히 할 수 있어요.", de: "Auch für Anfänger geeignet.\nJeder Schritt wird erklärt." },
  onboarding_title4:  { ko: "기도 제목을 기록하고 응답을 확인해요", de: "Gebete aufzeichnen und Erhörungen sehen" },
  onboarding_desc4:   { ko: "기도 제목을 적고, 응답됐을 때 간증을 남겨요.\n중보기도 요청으로 함께 기도할 수도 있어요.", de: "Gebete aufschreiben und Zeugnisse teilen.\nGemeinsam für einander beten." },
  onboarding_desc4_sub: { ko: "기도 중 → 기도 응답으로\n하나님의 일하심을 기록해가요.", de: "Im Gebet → Erhörtes Gebet\nGottes Wirken aufzeichnen." },
  onboarding_title5:  { ko: "매일 하면 정원이 자라요",    de: "Täglich wächst Ihr Garten" },
  onboarding_desc5:   { ko: "큐티 + 기도 + 결단, 3가지를 모두 완료하면\n나무가 자라 100일마다 성령의 열매 배지를 받아요.", de: "Stille Zeit + Gebet + Vorsatz:\nIhr Baum wächst und alle 100 Tage gibt es eine Frucht." },
  onboarding_desc5_sub: { ko: "꾸준히 하는 게 핵심이에요.\n오늘부터 시작해봐요! 🌱", de: "Konsequenz ist das Wichtigste.\nFangen Sie heute an! 🌱" },
  onboarding_next:    { ko: "다음 →",                   de: "Weiter →" },
  onboarding_start:   { ko: "시작하기 🌱",               de: "Loslegen 🌱" },
  onboarding_skip:    { ko: "건너뛰기",                  de: "Überspringen" },

  // ── 복귀 팝업 ──
  welcome_back_btn:      { ko: "오늘 루틴 시작하기 🌱",   de: "Routine starten 🌱" },
  welcome_back_30_title: { ko: "오랜만이에요!",           de: "Lang nicht gesehen!" },
  welcome_back_30_sub:   { ko: "말씀이 기다리고 있었어요.\n오늘 다시 뿌리를 내려봐요.", de: "Das Wort hat auf Sie gewartet.\nKommen Sie zurück und wachsen Sie wieder." },
  welcome_back_n_title:  { ko: "{n}일 만이에요!",         de: "{n} Tage später!" },
  welcome_back_14_sub:   { ko: "괜찮아요, 언제든 돌아오면 돼요.\n오늘부터 다시 함께 자라요!", de: "Kein Problem, Sie können immer zurückkommen.\nFangen wir heute wieder an!" },
  welcome_back_7_sub:    { ko: "나무가 당신을 기다리고 있었어요.\n오늘 루틴으로 힘내봐요 💪", de: "Ihr Baum hat auf Sie gewartet.\nWeiter geht's mit der Routine 💪" },
  welcome_back_1_sub:    { ko: "괜찮아요! 오늘 다시 시작해봐요.\n조금씩 꾸준히가 중요해요 🌱", de: "Kein Problem! Fangen wir heute neu an.\nKleine Schritte zählen 🌱" },

  // ── 가든 팝업 ──
  garden_check_btn:   { ko: "정원 확인하러 가기 🌿",     de: "Garten ansehen 🌿" },
  badge_check_btn:    { ko: "배지 확인하기 🌟",          de: "Abzeichen ansehen 🌟" },
  spirit_fruit_title: { ko: "성령의 열매 획득! 🎉",      de: "Frucht des Geistes erhalten! 🎉" },
  spirit_fruit_sub:   { ko: "100일 동안 말씀에 뿌리내린 당신에게\n하나님이 주시는 열매예요!", de: "100 Tage in Gottes Wort –\ndas ist Ihre Frucht von Gott!" },
  spirit_fruit_profile:{ ko: "프로필에서 확인할 수 있어요 ✨", de: "Im Profil ansehen ✨" },

  garden_badge_title:   { ko: "성령의 열매 획득! 🎉",       de: "Frucht des Geistes erhalten! 🎉" },
  garden_badge_100days: { ko: "100일 동안 말씀에 뿌리내린 당신에게\n하나님이 주시는 열매예요!", de: "100 Tage in Gottes Wort verwurzelt –\ndas ist Ihre Frucht von Gott!" },
  garden_badge_profile: { ko: "프로필에서 확인할 수 있어요 ✨",  de: "Im Profil ansehen ✨" },
  garden_updated_day:   { ko: "정원이 업데이트됐어요! {n}일째 🔥", de: "Der Garten wurde aktualisiert! Tag {n} 🔥" },

  // 성령의 열매 이름
  fruit_love:      { ko: "사랑",    de: "Liebe" },
  fruit_peace:     { ko: "화평",    de: "Frieden" },
  fruit_joy:       { ko: "희락",    de: "Freude" },
  fruit_goodness:  { ko: "양선",    de: "Güte" },
  fruit_kindness:  { ko: "자비",    de: "Freundlichkeit" },
  fruit_patience:  { ko: "오래참음", de: "Geduld" },
  fruit_faithful:  { ko: "충성",    de: "Treue" },
  fruit_gentle:    { ko: "온유",    de: "Sanftmut" },
  fruit_selfctrl:  { ko: "절제",    de: "Selbstbeherrschung" },

  // 정원 10단계 업데이트 팝업
  garden_stage_1_title: { ko: "씨앗이 뿌려졌어요!",          de: "Ein Samen wurde gesät!" },
  garden_stage_1_desc:  { ko: "겨자씨 한 알이 땅에 심겨졌어요.\n말씀이 마음 깊이 뿌리내리기 시작해요.", de: "Ein Senfkorn wurde in die Erde gelegt.\nGottes Wort beginnt, Wurzeln zu schlagen." },
  garden_stage_2_title: { ko: "새싹이 돋아났어요!",          de: "Ein Sprössling wächst!" },
  garden_stage_2_desc:  { ko: "작은 싹이 흙을 뚫고 올라왔어요.\n하나님 앞에 날마다 나아오고 있어요.", de: "Ein kleines Grün durchbricht die Erde.\nSie kommen täglich zu Gott." },
  garden_stage_3_title: { ko: "묘목이 자라고 있어요!",       de: "Der Setzling wächst!" },
  garden_stage_3_desc:  { ko: "뿌리가 단단히 내리고 줄기가 세워졌어요.\n말씀이 삶에 스며들고 있어요.", de: "Die Wurzeln greifen tief, der Stamm steht fest.\nGottes Wort durchdringt Ihr Leben." },
  garden_stage_4_title: { ko: "가지가 뻗어나갔어요!",        de: "Äste breiten sich aus!" },
  garden_stage_4_desc:  { ko: "가지가 사방으로 뻗어나가고 있어요.\n믿음이 삶의 구석구석에 닿고 있어요.", de: "Die Äste strecken sich in alle Richtungen.\nIhr Glaube berührt jeden Bereich Ihres Lebens." },
  garden_stage_5_title: { ko: "나무가 무럭무럭 자라요!",     de: "Der Baum wächst kräftig!" },
  garden_stage_5_desc:  { ko: "든든한 나무로 자라고 있어요.\n폭풍 속에서도 흔들리지 않아요.", de: "Ein starker Baum entsteht.\nAuch im Sturm bleibt er stehen." },
  garden_stage_6_title: { ko: "잎이 풍성해졌어요!",          de: "Reichlich Blätter!" },
  garden_stage_6_desc:  { ko: "무성한 잎으로 그늘을 만들고 있어요.\n당신의 신앙이 주변을 덮기 시작해요.", de: "Üppiges Laub spendet Schatten.\nIhr Glaube beginnt, andere zu umhüllen." },
  garden_stage_7_title: { ko: "열매를 맺기 시작해요!",       de: "Früchte beginnen zu wachsen!" },
  garden_stage_7_desc:  { ko: "드디어 열매가 맺히기 시작했어요!\n말씀이 삶의 열매로 나타나고 있어요.", de: "Endlich zeigen sich die ersten Früchte!\nGottes Wort trägt Frucht in Ihrem Leben." },
  garden_stage_8_title: { ko: "새들이 날아왔어요!",          de: "Vögel kommen!" },
  garden_stage_8_desc:  { ko: "새들이 날아와 가지에 깃들었어요.\n당신의 정원이 생명으로 가득해요.", de: "Vögel fliegen herbei und nisten in den Ästen.\nIhr Garten ist voller Leben." },
  garden_stage_9_title: { ko: "정원이 거의 완성돼요!",       de: "Der Garten ist fast fertig!" },
  garden_stage_9_desc:  { ko: "아름다운 정원이 거의 완성됐어요.\n100일을 향해 달려가고 있어요!", de: "Ein wunderschöner Garten entsteht.\n100 Tage sind fast erreicht!" },
  garden_stage_10_title:{ ko: "풍성한 정원 완성!",           de: "Üppiger Garten vollendet!" },
  garden_stage_10_desc: { ko: "100일의 여정을 거의 마쳤어요!\n곧 성령의 열매 배지를 받게 돼요.", de: "Die 100-Tage-Reise ist fast abgeschlossen!\nBald erhalten Sie die Frucht des Geistes." },

  // ── 로그인/회원가입 ──
  login_title:        { ko: "다시 돌아오셨군요!",         de: "Willkommen zurück!" },
  login_sub:          { ko: "Roots와 함께 오늘도 말씀에 뿌리내려요", de: "Mit Roots täglich in Gottes Wort verwurzeln" },
  login_google_btn:   { ko: "Google로 계속하기",          de: "Mit Google fortfahren" },
  login_or_email:     { ko: "또는 이메일로",             de: "oder per E-Mail" },
  login_email_label:  { ko: "이메일",                   de: "E-Mail" },
  login_password_label:{ ko: "비밀번호",                de: "Passwort" },
  login_btn:          { ko: "로그인",                   de: "Anmelden" },
  login_loading:      { ko: "로그인 중...",              de: "Wird angemeldet..." },
  login_error:        { ko: "이메일 또는 비밀번호가 틀렸어요", de: "E-Mail oder Passwort ist falsch" },
  login_no_account:   { ko: "계정이 없으신가요?",         de: "Noch kein Konto?" },
  login_signup_link:  { ko: "회원가입",                  de: "Registrieren" },

  signup_title:       { ko: "시작하기",                 de: "Loslegen" },
  signup_sub:         { ko: "오늘부터 말씀에 뿌리내려요 🌱", de: "Ab heute in Gottes Wort verwurzeln 🌱" },
  signup_nickname:    { ko: "닉네임",                   de: "Nickname" },
  signup_nickname_ph: { ko: "사용하실 닉네임을 입력해주세요", de: "Geben Sie einen Nickname ein" },
  signup_password:    { ko: "비밀번호 (6자 이상)",        de: "Passwort (mind. 6 Zeichen)" },
  signup_btn:         { ko: "시작하기",                 de: "Loslegen" },
  signup_loading:     { ko: "가입 중...",               de: "Wird registriert..." },
  signup_error:       { ko: "회원가입에 실패했어요. 다시 시도해주세요.", de: "Registrierung fehlgeschlagen. Bitte erneut versuchen." },
  signup_pw_error:    { ko: "비밀번호는 6자 이상이어야 해요", de: "Passwort muss mindestens 6 Zeichen haben" },
  signup_back:        { ko: "로그인으로",               de: "Zurück zur Anmeldung" },

  // ── 공통 ──
  save:     { ko: "저장",    de: "Speichern" },
  cancel:   { ko: "취소",    de: "Abbrechen" },
  close:    { ko: "닫기",    de: "Schließen" },
  delete:   { ko: "삭제",    de: "Löschen" },
  edit:     { ko: "수정",    de: "Bearbeiten" },
  confirm:  { ko: "확인",    de: "Bestätigen" },
  loading:  { ko: "로딩 중...", de: "Lädt..." },

  // ── 앱 공통 ──
  app_loading_sub: { ko: "말씀에 뿌리내리고, 함께 자라다", de: "In Gottes Wort verwurzelt, gemeinsam wachsen" },
  home_loading_sub:{ ko: "말씀에 뿌리내리고, 함께 자라다", de: "In Gottes Wort verwurzelt, gemeinsam wachsen" },
  home_badge_thanks:{ ko: "감사해요 🙏",                    de: "Danke 🙏" },

  // ── 홈 화면 하드코딩 수정용 ──
  home_greeting_morning:  { ko: "좋은 아침이에요 ☀️",  de: "Guten Morgen ☀️" },
  home_greeting_afternoon:{ ko: "좋은 오후예요 🌤️",    de: "Guten Nachmittag 🌤️" },
  home_greeting_evening:  { ko: "좋은 저녁이에요 🌅",   de: "Guten Abend 🌅" },
  home_greeting_night:    { ko: "좋은 밤이에요 🌙",     de: "Gute Nacht 🌙" },
  home_verse_section:     { ko: "오늘의 말씀",          de: "Tagesvers" },
  home_verse_empty:       { ko: "오늘의 감정을 선택하면 맞춤 말씀을 받을 수 있어요 🌿", de: "Wählen Sie Ihre Stimmung und erhalten Sie einen passenden Vers 🌿" },
  home_verse_btn:         { ko: "오늘의 말씀 받기",     de: "Tagesvers erhalten" },
  home_recommend_section: { ko: "오늘의 추천 결단",     de: "Empfohlener Vorsatz" },
  home_decision_practiced:{ ko: "결단 실천 완료! 🎉",    de: "Vorsatz umgesetzt! 🎉" },
  home_decision_practice: { ko: "오늘 이 결단을 실천했어요", de: "Ich habe diesen Vorsatz umgesetzt" },
  home_my_decision:       { ko: "오늘 나의 결단",       de: "Meine heutigen Vorsätze" },
  home_prayer_section:    { ko: "오늘의 기도",          de: "Heutiges Gebet" },
  home_prayer_desc:       { ko: "오늘 잠깐이라도 기도를 통해 하나님과 인격적인 만남을 하셨나요?", de: "Haben Sie heute, wenn auch nur kurz, im Gebet eine persönliche Begegnung mit Gott gehabt?" },
  home_prayer_done_msg:   { ko: "기도 완료! 🙏",        de: "Gebetet! 🙏" },
  home_prayer_yes_btn:    { ko: "네, 오늘 기도했어요",    de: "Ja, ich habe heute gebetet" },
  home_routine_section:   { ko: "오늘의 루틴",          de: "Heutige Routine" },
  home_routine_qt:        { ko: "큐티",                 de: "QT" },
  home_routine_prayer:    { ko: "기도",                 de: "Gebet" },
  home_routine_decision:  { ko: "결단",                 de: "Vorsatz" },
  home_routine_done:      { ko: "완료 ✓",              de: "Erledigt ✓" },
  home_routine_notdone:   { ko: "미완료",               de: "Offen" },
  home_celebration_title: { ko: "오늘 루틴 완료! 🎉",    de: "Routine erledigt! 🎉" },
  home_celebration_sub_prefix: { ko: "오늘 하루 하나님과 더 가까워진 당신을 축복합니다!\n", de: "Gesegnet sei dieser Tag, an dem Sie Gott nähergekommen sind!\n" },
  home_decision_celeb:    { ko: "결단 실천 완료! ✊",     de: "Vorsatz umgesetzt! ✊" },
  home_decision_celeb_sub:{ ko: "말씀을 삶으로 살아내는 당신을 축복해요 🌱", de: "Gesegnet, wer Gottes Wort im Leben umsetzt 🌱" },

  // "{name}의 정원" / "{name}s Garten"
  home_garden_my: { ko: "{name}님의 정원", de: "{name}s Garten" },

  // ── TreeGrowth 하드코딩 ──
  tree_stage_0:  { ko: "씨앗 심겨졌어요",   de: "Samen gepflanzt" },
  tree_stage_1:  { ko: "씨앗",            de: "Samen" },
  tree_stage_2:  { ko: "새싹",            de: "Sprössling" },
  tree_stage_3:  { ko: "묘목",            de: "Setzling" },
  tree_stage_4:  { ko: "성장 중",          de: "Wachsend" },
  tree_stage_5:  { ko: "나무",            de: "Baum" },
  tree_stage_6:  { ko: "열매 맺음",        de: "Früchte" },
  tree_stage_7:  { ko: "정원 시작",        de: "Gartenstart" },
  tree_stage_8:  { ko: "정원 성장",        de: "Garten wächst" },
  tree_stage_9:  { ko: "정원 완성 🏆",     de: "Garten vollendet 🏆" },
  tree_stage_10: { ko: "풍성한 정원 🌳",    de: "Üppiger Garten 🌳" },
  tree_desc_0:   { ko: "겨자씨가 땅에 심겨졌어요",       de: "Ein Senfkorn wurde gesät" },
  tree_desc_1:   { ko: "겨자씨가 땅에 심겨졌어요",       de: "Ein Senfkorn wurde gesät" },
  tree_desc_2:   { ko: "고개를 들고 햇빛을 찾아요",     de: "Es streckt sich zum Licht" },
  tree_desc_3:   { ko: "뿌리를 단단히 내리고 있어요",    de: "Die Wurzeln greifen tief" },
  tree_desc_4:   { ko: "가지가 뻗어나가고 있어요",      de: "Die Äste breiten sich aus" },
  tree_desc_5:   { ko: "든든하게 자라나고 있어요",       de: "Kräftig wächst er heran" },
  tree_desc_6:   { ko: "새들이 날아와 깃들었어요",       de: "Vögel nisten in den Zweigen" },
  tree_desc_7:   { ko: "새 씨앗이 뿌려졌어요",          de: "Neue Samen wurden gesät" },
  tree_desc_8:   { ko: "이웃 나무가 자라고 있어요",      de: "Nachbarbäume wachsen" },
  tree_desc_9:   { ko: "아름다운 정원이 완성됐어요!",    de: "Ein wunderschöner Garten!" },
  tree_desc_10:  { ko: "열매가 가득한 정원이에요!",      de: "Ein Garten voller Früchte!" },

  // {n} placeholder 사용
  tree_day_count:   { ko: "{n}일째",                de: "Tag {n}" },
  tree_garden_n:    { ko: "{n}번째 정원",            de: "{n}. Garten" },
  tree_progress:    { ko: "{n} / 10일",             de: "{n} / 10 Tage" },
  tree_streak:      { ko: "{n}일 연속 기록 중",       de: "{n} Tage in Folge" },
  tree_away_msg:    { ko: "{n}일 만이에요! 오늘 루틴으로 다시 뿌리내려봐요 💪", de: "{n} Tage her! Starten Sie die Routine und kommen Sie zurück 💪" },

  // TreeGrowth 축하 sub messages
  tree_sub_1:   { ko: "씨앗이 땅속에서 뿌리를 내리기 시작했어요!",  de: "Der Samen beginnt, Wurzeln zu schlagen!" },
  tree_sub_14:  { ko: "씨앗이 조금씩 움트고 있어요!",              de: "Der Samen keimt langsam!" },
  tree_sub_29:  { ko: "새싹이 햇빛을 향해 자라고 있어요!",         de: "Der Sprössling wächst zum Licht!" },
  tree_sub_59:  { ko: "묘목이 점점 단단해지고 있어요!",            de: "Der Setzling wird immer stärker!" },
  tree_sub_79:  { ko: "나무가 무럭무럭 자라고 있어요!",            de: "Der Baum wächst kräftig!" },
  tree_sub_99:  { ko: "나무가 점점 더 자라고 있어요!",             de: "Der Baum wächst und wächst!" },
  tree_sub_129: { ko: "열매를 맺은 나무처럼 풍성해지고 있어요!",    de: "Wie ein fruchtbarer Baum – immer üppiger!" },
  tree_sub_max: { ko: "아름다운 정원이 완성되어 가고 있어요!",     de: "Ein wunderschöner Garten entsteht!" },

  // ── RootsManPopup ──
  rootsman_title: { ko: "농부가 물을 주고 있어요",     de: "Der Gärtner gießt die Pflanzen" },
  rootsman_check: { ko: "정원을 확인해보세요 🌱",       de: "Schauen Sie sich den Garten an 🌱" },
  rootsman_btn:   { ko: "정원 보러 가기",              de: "Zum Garten" },
  rootsman_msg_1: { ko: "씨앗이 땅속에서 뿌리를 내리기 시작했어요.", de: "Der Samen beginnt, Wurzeln zu schlagen." },
  rootsman_msg_2: { ko: "새싹이 조금씩 고개를 내밀고 있어요.",       de: "Ein kleiner Sprössling zeigt sich." },
  rootsman_msg_3: { ko: "묘목이 햇빛을 향해 자라고 있어요.",         de: "Der Setzling wächst zum Licht." },
  rootsman_msg_4: { ko: "가지가 뻗어나가고 뿌리가 깊어지고 있어요.", de: "Die Äste breiten sich aus, die Wurzeln vertiefen sich." },
  rootsman_msg_5: { ko: "나무가 든든하게 자라나고 있어요.",          de: "Der Baum wächst kräftig heran." },
  rootsman_msg_6: { ko: "말씀에 점점 더 깊이 뿌리를 내리고 있어요.", de: "Die Verwurzelung in Gottes Wort wird tiefer." },
  rootsman_msg_7: { ko: "열매를 맺어가고 있어요. 계속 나아가요!",    de: "Früchte wachsen heran. Weiter so!" },
  rootsman_msg_8: { ko: "새들이 날아와 쉬어갈 만큼 자랐어요.",      de: "Der Baum ist groß genug für Vögel." },
  rootsman_msg_9: { ko: "아름다운 정원이 거의 완성되어 가요!",      de: "Ein wunderschöner Garten entsteht!" },
  rootsman_msg_10:{ ko: "풍성한 정원이 완성되어 가고 있어요! 🌳",    de: "Ein üppiger Garten nimmt Gestalt an! 🌳" },

  // ── QT 페이지 ──
  qt_today_done:        { ko: "오늘 큐티 완료!",                     de: "QT heute erledigt!" },
  qt_today_done_sub:    { ko: "말씀 앞에 앉은 당신, 수고했어요",       de: "Gut gemacht – Sie waren beim Wort Gottes." },
  qt_today_bible_ref:   { ko: "오늘의 큐티 본문",                     de: "Heutiger Abschnitt" },
  qt_sunday_title:      { ko: "🙌 오늘은 주일이에요!",                de: "🙌 Heute ist Sonntag!" },
  qt_sunday_desc:       { ko: "6단계 큐티 대신 주일예배 큐티를 진행해 주세요.", de: "Bitte die Sonntagsgottesdienst-QT durchführen." },
  qt_today_start:       { ko: "오늘 큐티 시작하기",                   de: "Heutige QT beginnen" },
  qt_past_records:      { ko: "지난 큐티 기록",                       de: "Frühere QTs" },
  qt_no_records_simple: { ko: "아직 큐티 기록이 없어요",               de: "Noch keine Aufzeichnungen" },
  qt_how_title:         { ko: "어떻게 큐티할까요?",                    de: "Wie möchten Sie QT machen?" },
  qt_how_sub:           { ko: "형식을 선택하면 바로 시작돼요",         de: "Wählen Sie ein Format" },
  qt_mode_6step_title:  { ko: "6단계 큐티",                           de: "6-Schritte QT" },
  qt_mode_6step_desc:   { ko: "들어가는 기도 → 본문 → 붙잡은 말씀\n→ 묵상 → 결단 → 마침 기도", de: "Eröffnungsgebet → Text → Schlüsselvers\n→ Meditation → Entschluss → Abschlussgebet" },
  qt_mode_sunday_title: { ko: "주일예배 큐티",                        de: "Sonntagsgottesdienst" },
  qt_mode_sunday_desc:  { ko: "설교 요약 + 붙잡은 말씀 + 결단\n일요일에 자동으로 추천돼요", de: "Predigtzusammenfassung + Schlüsselvers + Entschluss\nSonntags automatisch empfohlen" },
  qt_mode_free_title:   { ko: "자유 형식",                           de: "Freie Form" },
  qt_mode_free_desc:    { ko: "다른 큐티책을 쓰거나 자유롭게\n묵상을 적고 싶을 때", de: "Wenn Sie ein eigenes Andachtsbuch verwenden\noder frei meditieren möchten" },
  qt_guide_btn:         { ko: "큐티 6단계 가이드 보기",                de: "6-Schritte-Anleitung ansehen" },
  qt_guide_step_label:  { ko: "큐티 가이드",                          de: "Anleitung" },
  qt_guide_example:     { ko: "예시",                                de: "Beispiel" },
  qt_guide_prev:        { ko: "← 이전",                              de: "← Zurück" },
  qt_guide_next:        { ko: "다음 →",                              de: "Weiter →" },
  qt_guide_start:       { ko: "시작하기 🌱",                         de: "Loslegen 🌱" },
  qt_year_records:      { ko: "{year}년 · {count}개 기록",            de: "{year} · {count} Aufzeichnungen" },

  // QT 가이드 6단계
  qt_g1_title: { ko: "들어가는 기도",     de: "Eröffnungsgebet" },
  qt_g1_desc:  { ko: "하나님께 나아가기 위한 접속 스위치. 스위치 ON 하면 하나님의 빛과 생명 에너지가 우리에게 흘러들어오기 시작!", de: "Der Startschalter, um zu Gott zu kommen. Wenn der Schalter an ist, beginnen Gottes Licht und Lebenskraft in uns zu fließen!" },
  qt_g1_ex:    { ko: "주님, 제 눈을 열어 주님의 말씀을 보게 해 주세요. 제 귀를 열어 듣게 해 주세요. 제 마음을 열어 말씀을 받게 해 주세요. 예수님의 이름으로 기도합니다. 아멘", de: "Herr, öffne meine Augen, damit ich dein Wort sehe. Öffne meine Ohren, damit ich höre. Öffne mein Herz, damit ich dein Wort empfange. Im Namen Jesu, Amen." },
  qt_g2_title: { ko: "본문 요약",         de: "Textzusammenfassung" },
  qt_g2_desc:  { ko: "두 번 정도 반복해서 읽고 그 내용을 자신의 말로, 자신의 표현으로 요약!", de: "Lesen Sie den Text zweimal und fassen Sie ihn in eigenen Worten zusammen!" },
  qt_g2_ex:    { ko: "예) 바울이 빌립보 교인들에게 어떤 상황에서도 기뻐하라고 권면하며, 걱정 대신 기도로 하나님께 아뢰면 평강이 임한다고 말한다.", de: "z. B. Paulus ermahnt die Philipper, sich in allen Umständen zu freuen, und sagt: Wer statt sich zu sorgen betet, empfängt Gottes Frieden." },
  qt_g3_title: { ko: "붙잡은 말씀",       de: "Schlüsselvers" },
  qt_g3_desc:  { ko: "말씀을 읽을 때, 말씀이 우리를 스캔합니다. 우리 마음 밭에 뿌려질 말씀의 씨앗이 있는 부분에서 멈춥니다. 그곳을 붙잡으면 됩니다.", de: "Beim Lesen scannt das Wort uns. Es hält dort an, wo der Same für unser Herz liegt. Dort halten wir fest." },
  qt_g3_ex:    { ko: "예) \"아무것도 염려하지 말고 다만 모든 일에 기도와 간구로... 너희 구할 것을 감사함으로 하나님께 아뢰라\" (빌 4:6)", de: "z. B. \"Sorgt euch um nichts, sondern lasst in allen Dingen eure Bitten in Gebet und Flehen mit Danksagung vor Gott kundwerden.\" (Phil 4,6)" },
  qt_g4_title: { ko: "느낌과 묵상",       de: "Empfinden & Meditation" },
  qt_g4_desc:  { ko: "말씀은 살아계신 생명의 주로부터 옵니다. 철저하게 개인적으로, 맞춤형으로 옵니다. 물음표가 아닌 느낌표를 두고, 순종의 마음을 품고 성령님의 이끄심에 맡겨봅시다!", de: "Das Wort kommt vom lebendigen Herrn des Lebens. Es kommt ganz persönlich, maßgeschneidert. Setzen Sie Ausrufezeichen statt Fragezeichen, seien Sie gehorsam und lassen Sie sich vom Heiligen Geist leiten!" },
  qt_g4_ex:    { ko: "예) 요즘 취업 걱정에 잠 못 드는데, 주님이 오늘 이 말씀으로 '나한테 가져와'라고 하시는 것 같았다.", de: "z. B. Ich kann vor Jobsorgen nicht schlafen, und heute sagt der Herr mir durch dieses Wort: 'Bring es zu mir.'" },
  qt_g5_title: { ko: "적용과 결단",       de: "Anwendung & Entschluss" },
  qt_g5_desc:  { ko: "적용과 결단은 말씀이 나의 성품이 되는 가장 중요한 단계. 성품은 마음을 정하는 것이고, 행동은 손과 발로 하나님의 능력이 드러나게 하는 것입니다.", de: "Anwendung und Entschluss sind der wichtigste Schritt, damit das Wort zu meinem Charakter wird. Charakter ist die Entscheidung des Herzens, Handlung zeigt Gottes Kraft mit Händen und Füßen." },
  qt_g5_ex:    { ko: "성품: 모든 일에 먼저 기도하고 긍정적으로 생각하겠습니다.\n행동: 주신 말씀 친구들과 나누기 / 자기 전에 기도하기", de: "Charakter: Ich werde bei allem zuerst beten und positiv denken.\nHandlung: Das Wort mit Freunden teilen / Vor dem Schlafen beten" },
  qt_g6_title: { ko: "올려드리는 기도",    de: "Abschlussgebet" },
  qt_g6_desc:  { ko: "주신 말씀과 받은 은혜에 대한 감사와 영광을, 묵상과 결단을 간결하게 다시 하나님께 올려드립니다.", de: "Danken Sie Gott für das empfangene Wort und die Gnade, und bringen Sie Meditation und Entschluss kurz vor Gott." },
  qt_g6_ex:    { ko: "예) 주님, 오늘 염려를 기도로 바꾸라는 말씀 감사해요. 오늘 하루 말씀대로 살게 도와주세요. 예수님 이름으로 기도합니다. 아멘", de: "z. B. Herr, danke für das Wort, Sorgen in Gebet zu verwandeln. Hilf mir heute, nach deinem Wort zu leben. Im Namen Jesu, Amen." },

  // ── 언어 선택 화면 ──
  lang_picker_title: { ko: "언어를 선택해주세요",     de: "Sprache wählen" },
  lang_picker_sub:   { ko: "Please select your language", de: "Please select your language" },
  lang_continue:     { ko: "계속하기",              de: "Weiter" },

  // ── QT record ──
  qt_record_all:        { ko: "전체 커뮤니티", de: "Gesamte Gemeinde" },
  qt_record_copied:     { ko: "복사됨! ✓",    de: "Kopiert! ✓" },
  qt_record_copy_all:   { ko: "전체 복사",     de: "Alles kopieren" },
  qt_record_public:     { ko: "공개 그룹",     de: "Öffentliche Gruppe" },
  qt_record_private:    { ko: "비공개 그룹",    de: "Private Gruppe" },
  qt_record_opening:    { ko: "들어가는 기도",  de: "Eröffnungsgebet" },
  qt_record_summary:    { ko: "본문 요약",     de: "Zusammenfassung" },
  qt_record_keyverse:   { ko: "붙잡은 말씀",   de: "Schlüsselvers" },
  qt_record_meditation: { ko: "느낌과 묵상",   de: "Empfinden & Meditation" },
  qt_record_application:{ ko: "성품 (적용)",   de: "Charakter (Anwendung)" },
  qt_record_decision:   { ko: "행동 (결단)",   de: "Handlung (Entschluss)" },
  qt_record_closing:    { ko: "올려드리는 기도", de: "Abschlussgebet" },

  // ── Join ──
  join_private:         { ko: "비공개 그룹",      de: "Private Gruppe" },
  join_invite:          { ko: "그룹 초대",        de: "Gruppeneinladung" },
  join_private_invite:  { ko: "🔒 비공개 그룹 초대", de: "🔒 Private Gruppeneinladung" },
  join_btn:             { ko: "그룹 참여하기",     de: "Gruppe beitreten" },

  // ── 성경 번역본 그룹 라벨 ──
  qt_translation_ko: { ko: "한국어",   de: "Koreanisch" },
  qt_translation_en: { ko: "English",  de: "Englisch"   },
  qt_translation_de: { ko: "Deutsch",  de: "Deutsch"    },
  qt_translation_fr: { ko: "Français", de: "Französisch"},

  // ── QT Write 페이지 ──
  // 6단계 제목 / 부제목 / placeholder / hint
  qtw_s1_title:    { ko: "들어가는 기도",               de: "Eröffnungsgebet" },
  qtw_s1_sub:      { ko: "말씀 앞에 나아가기 전 기도",    de: "Gebet vor dem Wort" },
  qtw_s1_ph:       { ko: "주님, 오늘 말씀 앞에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", de: "Herr, ich komme heute vor dein Wort...\nÖffne meine Augen, Ohren und mein Herz." },
  qtw_s1_hint:     { ko: "짧아도 괜찮아요. 마음을 열고 주님께 나아가는 기도예요.", de: "Kurz reicht auch. Ein Gebet mit offenem Herzen." },
  qtw_s2_title:    { ko: "본문 요약 & 붙잡은 말씀",      de: "Zusammenfassung & Schlüsselvers" },
  qtw_s2_sub:      { ko: "본문을 읽고 마음에 새겨요",     de: "Den Text lesen und ins Herz aufnehmen" },
  qtw_s3_title:    { ko: "느낌과 묵상",                 de: "Empfinden & Meditation" },
  qtw_s3_sub:      { ko: "이 말씀이 내게 주는 의미",     de: "Was bedeutet das Wort für mich?" },
  qtw_s3_ph:       { ko: "이 말씀이 오늘 내 삶에 무슨 말씀인가요?\n솔직하게 느낀 것을 써보세요.", de: "Was sagt dieses Wort in mein Leben hinein?\nSchreiben Sie ehrlich, was Sie empfinden." },
  qtw_s3_hint:     { ko: "정답이 없어요. 성령님의 이끄심에 맡겨봐요.", de: "Es gibt keine richtige Antwort. Lassen Sie sich vom Heiligen Geist leiten." },
  qtw_s4_title:    { ko: "적용과 결단",                 de: "Anwendung & Entschluss" },
  qtw_s4_sub:      { ko: "오늘 하루 어떻게 살 건가요?",   de: "Wie leben Sie heute?" },
  qtw_s4_hint:     { ko: "성품은 마음을 정하는 것, 행동은 손과 발로 드러나는 것이에요.", de: "Charakter ist die Entscheidung des Herzens, Handlung wird mit Händen und Füßen sichtbar." },
  qtw_s5_title:    { ko: "올려드리는 기도",              de: "Abschlussgebet" },
  qtw_s5_sub:      { ko: "말씀으로 드리는 기도",         de: "Gebet mit dem Wort" },
  qtw_s5_ph:       { ko: "말씀을 붙들고 기도를 올려드려요...", de: "Gebet, das das Wort festhält..." },
  qtw_s5_hint:     { ko: "말씀과 결단을 간결하게 다시 하나님께 올려드려요.", de: "Wort und Entschluss noch einmal kurz vor Gott bringen." },

  // 진행바 6칸 라벨
  qtw_bar1: { ko: "들어가는 기도", de: "Eröffnung" },
  qtw_bar2: { ko: "본문 요약",    de: "Zusammenf." },
  qtw_bar3: { ko: "붙잡은 말씀",  de: "Schlüsselvers" },
  qtw_bar4: { ko: "느낌과 묵상", de: "Meditation" },
  qtw_bar5: { ko: "적용과 결단", de: "Entschluss" },
  qtw_bar6: { ko: "올려드리는 기도", de: "Abschluss" },

  // 주일예배 단계
  qtw_sun_s0_title: { ko: "설교 정보",           de: "Predigt-Info" },
  qtw_sun_s0_sub:   { ko: "설교 제목과 본문 말씀을 적어요", de: "Titel und Bibelstelle der Predigt" },
  qtw_sun_s1_title: { ko: "들어가는 기도",        de: "Eröffnungsgebet" },
  qtw_sun_s1_sub:   { ko: "예배 전 마음을 준비해요", de: "Herz vorbereiten vor dem Gottesdienst" },
  qtw_sun_s1_ph:    { ko: "주님, 오늘 예배에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", de: "Herr, ich komme heute zum Gottesdienst...\nÖffne meine Augen, Ohren und mein Herz." },
  qtw_sun_s1_hint:  { ko: "예배 전 마음을 열고 주님께 나아가는 기도예요.", de: "Gebet mit offenem Herzen vor dem Gottesdienst." },
  qtw_sun_s2_title: { ko: "말씀 요약",           de: "Zusammenfassung" },
  qtw_sun_s2_sub:   { ko: "설교 말씀을 내 말로 요약해요", de: "Predigt in eigenen Worten zusammenfassen" },
  qtw_sun_s2_ph:    { ko: "오늘 설교 핵심 내용을 자신의 말로 요약해보세요...", de: "Fassen Sie die Kernbotschaft der Predigt in eigenen Worten zusammen..." },
  qtw_sun_s2_hint:  { ko: "설교자가 전한 핵심 메시지를 나의 말로 정리해요.", de: "Die Kernbotschaft des Predigers in eigene Worte fassen." },
  qtw_sun_s3_title: { ko: "깨달음과 결단",       de: "Erkenntnis & Entschluss" },
  qtw_sun_s3_sub:   { ko: "말씀이 내게 주는 깨달음과 결단", de: "Erkenntnis und Entschluss aus dem Wort" },
  qtw_sun_s3_hint:  { ko: "말씀을 통해 깨달은 것, 그리고 삶으로 살아낼 결단을 적어요.", de: "Was Sie erkannt haben und wie Sie es leben wollen." },
  qtw_sun_s4_title: { ko: "올려드리는 기도",     de: "Abschlussgebet" },
  qtw_sun_s4_sub:   { ko: "예배의 마무리 기도",   de: "Abschlussgebet des Gottesdienstes" },
  qtw_sun_s4_ph:    { ko: "오늘 받은 은혜와 결단을 하나님께 올려드려요...", de: "Die empfangene Gnade und den Entschluss vor Gott bringen..." },
  qtw_sun_s4_hint:  { ko: "받은 말씀과 결단을 하나님께 올려드려요.", de: "Das Wort und den Entschluss Gott darbringen." },

  // 말씀 선택
  qtw_find_passage:        { ko: "오늘의 말씀 찾기",              de: "Heutigen Abschnitt suchen" },
  qtw_find_passage_opt:    { ko: "오늘의 말씀 찾기 (선택)",        de: "Heutigen Abschnitt suchen (optional)" },
  qtw_today:               { ko: "오늘",                         de: "Heute" },
  qtw_cross_chapter:       { ko: "장이 넘어가는 말씀 (예: 9장 25절~10장 6절)", de: "Kapitel-übergreifend (z. B. 9,25 – 10,6)" },
  qtw_err_verse_range:     { ko: "끝 절이 시작 절보다 작아요",       de: "Endvers ist kleiner als Startvers" },
  qtw_err_load_passage:    { ko: "본문을 불러오지 못했어요.",       de: "Abschnitt konnte nicht geladen werden." },

  // 저장 / 임시저장
  qtw_draft_saved:         { ko: "임시저장됐어요! 나중에 이어쓸 수 있어요 😊", de: "Als Entwurf gespeichert! Sie können später weitermachen 😊" },
  qtw_draft_failed:        { ko: "임시저장에 실패했어요. 다시 시도해주세요.", de: "Entwurf konnte nicht gespeichert werden. Bitte erneut versuchen." },
  qtw_save_failed:         { ko: "저장에 실패했어요. 다시 시도해주세요.", de: "Speichern fehlgeschlagen. Bitte erneut versuchen." },

  // 자유형식 placeholder
  qtw_free_ph:             { ko: "오늘 읽은 말씀, 느낀 점, 깨달음을 자유롭게 적어보세요...", de: "Schreiben Sie frei über das Wort, Ihre Gedanken und Erkenntnisse..." },

  // 주일예배 입력 placeholder
  qtw_sermon_title_ph:     { ko: "예: 두려워하지 말라",           de: "z. B. Fürchte dich nicht" },
  qtw_sermon_ref_ph:       { ko: "예: 이사야 41:10 / 요한복음 3:16", de: "z. B. Jesaja 41,10 / Johannes 3,16" },
  qtw_meditation_ph_sun:   { ko: "개인적이고 솔직하게 써보세요...", de: "Persönlich und ehrlich schreiben..." },
  qtw_app_ph_short:        { ko: "이 말씀 앞에서 어떤 마음을 품기로 결심했나요?", de: "Welche Haltung nehmen Sie vor diesem Wort ein?" },

  // 주일 단계 라벨들 & 필드
  qtw_sermon_title_label:  { ko: "설교 제목",         de: "Predigttitel" },
  qtw_sermon_ref_label:    { ko: "본문 말씀",         de: "Bibelstelle" },

  // 6단계 본문 요약 입력
  qtw_summary_ph:          { ko: "본문 내용을 자신의 말로 요약해보세요...", de: "Fassen Sie den Text in eigenen Worten zusammen..." },
  qtw_keyverse_ph:         { ko: "마음에 와닿은 구절을 적거나 위에서 선택하세요...", de: "Schreiben Sie den berührenden Vers oder wählen Sie oben..." },
  qtw_application_ph:      { ko: "이 말씀 앞에서 어떤 마음을 품기로 결심했나요?", de: "Welche Haltung nehmen Sie vor diesem Wort ein?" },

  // 단계 라벨
  qtw_step_label:          { ko: "단계",              de: "Schritt" },
  qtw_character_label:     { ko: "성품",              de: "Charakter" },
  qtw_action_label:        { ko: "행동",              de: "Handlung" },

  // 저장 버튼
  qtw_save_btn:            { ko: "저장하기",          de: "Speichern" },
  qtw_saving:              { ko: "저장 중...",        de: "Wird gespeichert..." },
  qtw_save_draft:          { ko: "임시저장",          de: "Als Entwurf" },
  qtw_next_step:           { ko: "다음 단계 →",       de: "Nächster Schritt →" },
  qtw_prev_step:           { ko: "← 이전",            de: "← Zurück" },

  // 주일예배 UI에 있는 기타 요소들 (section label / badge label 등)
  qtw_character_section:   { ko: "성품 (Be) — 마음의 결심", de: "Charakter — Haltung des Herzens" },
  qtw_action_section:      { ko: "행동 (Do) — 손과 발",    de: "Handlung — Hände und Füße" },
  qtw_char_ph:             { ko: "어떤 마음가짐을 가질까요?", de: "Welche Haltung nehmen Sie ein?" },
  qtw_add_action:          { ko: "+ 행동 추가",        de: "+ Handlung hinzufügen" },
  qtw_action_ph:           { ko: "예: 하루 한 번 말씀 묵상", de: "z. B. Einmal am Tag meditieren" },
  qtw_verse_select_hint:   { ko: "마음에 와닿은 구절을 탭하거나 아래에 직접 적으세요", de: "Tippen Sie einen berührenden Vers an oder schreiben Sie unten" },
  qtw_passage_loaded:      { ko: "본문이 준비됐어요",    de: "Abschnitt bereit" },

  // 번역본 라벨
  qtw_translation_label:   { ko: "번역본",            de: "Übersetzung" },
  qtw_change_translation:  { ko: "번역본 변경",        de: "Übersetzung ändern" },

  // 요일 (짧은 형태)
  qtw_wd_0: { ko: "일", de: "So" },
  qtw_wd_1: { ko: "월", de: "Mo" },
  qtw_wd_2: { ko: "화", de: "Di" },
  qtw_wd_3: { ko: "수", de: "Mi" },
  qtw_wd_4: { ko: "목", de: "Do" },
  qtw_wd_5: { ko: "금", de: "Fr" },
  qtw_wd_6: { ko: "토", de: "Sa" },
} as const satisfies Record<string, Translation>;

export type TKey = keyof typeof T;

/**
 * 번역 함수 — 플레이스홀더 `{name}` 치환 지원
 *
 * Fallback 전략:
 * 1. 요청한 언어 번역이 있으면 사용
 * 2. 없으면 FALLBACK_LANG ("ko") 사용 → 새 언어 점진적 추가 가능
 * 3. 그것도 없으면 키 자체 반환 (개발 중 누락 발견용)
 *
 * @example
 *   t("home_greeting_morning", "de")              // "Guten Morgen ☀️"
 *   t("home_garden_my", "de", { name: "Anna" })   // "Annas Garten"
 *   t("tree_streak", "ko", { n: 7 })              // "7일 연속 기록 중"
 */
export function t(key: TKey, lang: Lang = FALLBACK_LANG, vars?: Record<string, string | number>): string {
  const entry = T[key] as Translation;
  let str = entry[lang] ?? entry[FALLBACK_LANG] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

/** 타입 가드: 주어진 값이 지원되는 언어인지 확인 (DB/localStorage 값 검증용) */
export function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (SUPPORTED_LANGS as readonly string[]).includes(x);
}

/** 지원 언어 목록을 UI 선택지 형태로 반환 */
export function getLanguageOptions() {
  return SUPPORTED_LANGS.map(code => ({ code, ...LANG_META[code] }));
}
