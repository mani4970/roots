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

export const SUPPORTED_LANGS = ["ko", "de", "en"] as const;
export type Lang = typeof SUPPORTED_LANGS[number];

export const FALLBACK_LANG: Lang = "ko";

// 언어별 메타정보 (LanguagePicker, 홈 언어 스위처에서 사용)
export const LANG_META: Record<Lang, { flag: string; nativeName: string; englishName: string }> = {
  ko: { flag: "🇰🇷", nativeName: "한국어", englishName: "Korean" },
  de: { flag: "🇩🇪", nativeName: "Deutsch", englishName: "German" },
  en: { flag: "🇬🇧", nativeName: "English", englishName: "English" },
};

// 부분 번역 허용: 누락 시 FALLBACK_LANG 사용
// FALLBACK_LANG("ko")만 required, 나머지는 optional → 새 언어 추가해도 TS 에러 없이 점진적 채움 가능
type Translation = Partial<Record<Lang, string>> & { [K in typeof FALLBACK_LANG]: string };

export const T = {
  // ── BottomNav ──
  nav_home:       { ko: "홈",       de: "Startseite", en: "Home" },
  nav_prayer:     { ko: "기도",     de: "Gebet", en: "Prayer" },
  nav_qt:         { ko: "QT",       de: "QT", en: "QT" },
  nav_community:  { ko: "커뮤니티", de: "Gemeinde", en: "Community" },
  nav_profile:    { ko: "프로필",   de: "Profil", en: "Profile" },

  // ── 홈 ──
  home_title:           { ko: "오늘 루틴",                    de: "Heute", en: "Today" },
  home_checkin_btn:     { ko: "오늘의 말씀 받기",              de: "Tagesvers erhalten", en: "Get today's verse" },
  home_checkin_done:    { ko: "오늘의 말씀",                   de: "Tagesvers", en: "Today's verse" },
  home_qt_btn:          { ko: "큐티하기",                     de: "Stille Zeit", en: "Quiet Time" },
  home_qt_done:         { ko: "큐티 완료",                    de: "Stille Zeit ✓", en: "QT done ✓" },
  home_prayer_title:    { ko: "오늘 잠깐이라도 기도하셨나요?",  de: "Haben Sie heute gebetet?", en: "Did you pray today?" },
  home_prayer_yes:      { ko: "네, 기도했어요 🙏",             de: "Ja, ich habe gebetet 🙏", en: "Yes, I prayed 🙏" },
  home_prayer_later:    { ko: "나중에",                       de: "Später", en: "Later" },
  home_prayer_done:     { ko: "기도 완료 🙏",                 de: "Gebetet 🙏", en: "Prayed 🙏" },
  home_decision_title:  { ko: "오늘의 결단",                  de: "Heutiger Vorsatz", en: "Today's resolution" },
  home_decision_done:   { ko: "결단 완료 ✓",                  de: "Erledigt ✓", en: "Done ✓" },
  home_decision_check:  { ko: "결단 실천하기",                 de: "Vorsatz umsetzen", en: "Complete resolution" },
  home_streak:          { ko: "일 연속 기록 중 🔥",            de: "Tage in Folge 🔥", en: "days in a row 🔥" },
  home_routine_complete:{ ko: "오늘 루틴 완료! 정원을 확인해보세요 🌱", de: "Heute erledigt! Garten ansehen 🌱", en: "Today's routine done! Check your garden 🌱" },

  // ── 감정 체크인 ──
  checkin_title:   { ko: "오늘 마음이\n어때요?",   de: "Wie fühlen\nSie sich?", en: "How are you\nfeeling?" },
  checkin_sub:     { ko: "하나를 선택하면 말씀을 드릴게요", de: "Wählen Sie eines aus", en: "Pick one and receive a verse" },
  checkin_cat1:    { ko: "기쁨 & 감사",          de: "Freude & Dankbarkeit", en: "Joy & Gratitude" },
  checkin_cat2:    { ko: "은혜 & 영적 갈망",      de: "Gnade & geistl. Hunger", en: "Grace & Spiritual Hunger" },
  checkin_cat3:    { ko: "힘듦 & 지침",          de: "Erschöpfung & Müdigkeit", en: "Weariness & Exhaustion" },
  checkin_cat4:    { ko: "흔들림 & 메마름",       de: "Zweifel & Trockenheit", en: "Doubt & Dryness" },
  checkin_cat5:    { ko: "오늘의 기도",           de: "Heutiges Gebet", en: "Today's Prayer" },
  checkin_receive: { ko: "말씀 받기 →",           de: "Vers empfangen →", en: "Receive verse →" },

  // 감정 라벨
  emotion_grateful:  { ko: "감사해요",              de: "Dankbar", en: "Grateful" },
  emotion_joyful:    { ko: "기뻐요",                de: "Freudig", en: "Joyful" },
  emotion_peaceful:  { ko: "평안해요",               de: "Friedlich", en: "Peaceful" },
  emotion_excited:   { ko: "설레요",                de: "Aufgeregt", en: "Excited" },
  emotion_full:      { ko: "충만해요",               de: "Erfüllt", en: "Fulfilled" },
  emotion_grace:     { ko: "은혜받았어요",            de: "Gnade erfahren", en: "Graced" },
  emotion_hungry:    { ko: "말씀이 고파요",           de: "Hungrig nach Gottes Wort", en: "Hungry for God's Word" },
  emotion_mission:   { ko: "사명감이 생겨요",         de: "Berufen", en: "Called" },
  emotion_repent:    { ko: "회개해요",               de: "Reue", en: "Repentant" },
  emotion_renew:     { ko: "새로워지고 싶어요",       de: "Erneuerung", en: "Longing for renewal" },
  emotion_tired:     { ko: "힘들어요",               de: "Erschöpft", en: "Tired" },
  emotion_exhausted: { ko: "지쳐요",                de: "Ausgebrannt", en: "Burnt out" },
  emotion_lonely:    { ko: "외로워요",               de: "Einsam", en: "Lonely" },
  emotion_sad:       { ko: "슬퍼요",                de: "Traurig", en: "Sad" },
  emotion_anxious:   { ko: "불안해요",               de: "Ängstlich", en: "Anxious" },
  emotion_doubt:     { ko: "의심돼요",               de: "Zweifelnd", en: "Doubtful" },
  emotion_dry:       { ko: "메말랐어요",              de: "Ausgetrocknet", en: "Dry" },
  emotion_angry:     { ko: "화가나요",               de: "Verärgert", en: "Angry" },
  emotion_far:       { ko: "하나님이 멀게 느껴져요",  de: "Gott fühlt sich fern an", en: "Distant from God" },
  emotion_family:    { ko: "가정을 위해",             de: "Für die Familie", en: "Family" },
  emotion_work:      { ko: "직장·학업을 위해",        de: "Für Arbeit & Studium", en: "Work" },
  emotion_relation:  { ko: "관계를 위해",             de: "Für Beziehungen", en: "Relationships" },
  emotion_health:    { ko: "건강을 위해",             de: "Für die Gesundheit", en: "Health" },
  emotion_future:    { ko: "미래를 위해",             de: "Für die Zukunft", en: "Future" },

  // ── 말씀 결과 ──
  result_loading:   { ko: "마음에 맞는 말씀을 찾고 있어요...", de: "Vers wird gesucht...", en: "Finding your verse..." },
  result_title:     { ko: "오늘의 말씀",             de: "Tagesvers", en: "Today's Verse" },
  result_sub:       { ko: "선택한 마음에 맞는 말씀이에요", de: "Passend zu Ihrer Stimmung", en: "A verse for your heart" },
  result_mission:   { ko: "오늘의 결단 미션",         de: "Heutiger Vorsatz", en: "TODAY'S RESOLUTION" },
  result_home_btn:  { ko: "홈에서 확인하기 →",        de: "Zur Startseite →", en: "Go to Home →" },
  result_home_sub:  { ko: "홈에 말씀과 결단이 저장돼요", de: "Vers und Vorsatz werden gespeichert", en: "Verse and resolution are saved" },
  back:             { ko: "돌아가기",                de: "Zurück", en: "Back" },

  // ── 큐티(QT) 탭 ──
  qt_title:         { ko: "QT",                     de: "QT", en: "QT" },
  qt_sub:           { ko: "말씀과 함께하는 조용한 시간", de: "Stille Zeit mit Gottes Wort", en: "Quiet Time with God's Word" },
  qt_start_btn:     { ko: "오늘 큐티 시작하기",       de: "QT beginnen", en: "Start QT" },
  qt_done:          { ko: "오늘 큐티 완료!",          de: "QT erledigt!", en: "QT done!" },
  qt_done_sub:      { ko: "말씀 앞에 앉은 당신, 수고했어요", de: "Gut gemacht!", en: "Well done!" },
  qt_sunday:        { ko: "🙌 오늘은 주일이에요!",    de: "🙌 Heute ist Sonntag!", en: "🙌 Today is Sunday!" },
  qt_sunday_sub:    { ko: "6단계 큐티 대신 주일예배 큐티를 진행해 주세요.", de: "Bitte Sonntagsgottesdienst-QT durchführen.", en: "Please do a Sunday worship QT." },
  qt_today_passage: { ko: "오늘의 큐티 본문",         de: "Heutiger Abschnitt", en: "Today's passage" },
  qt_records:       { ko: "지난 큐티 기록",           de: "Frühere QTs", en: "Past QTs" },
  qt_no_records:    { ko: "아직 큐티 기록이 없어요.\n오늘 첫 큐티를 시작해보세요! 🌱", de: "Noch keine Aufzeichnungen.\nStarten Sie heute Ihre erste QT! 🌱", en: "No recordings yet.\nStart your first QT today! 🌱" },
  qt_mode_6step:    { ko: "6단계 큐티",              de: "6-Schritte", en: "6-Step" },
  qt_mode_sunday:   { ko: "주일예배 큐티",            de: "Sonntagsgottesdienst", en: "Sunday Worship" },
  qt_mode_free:     { ko: "자유형식 큐티",            de: "Freie Form", en: "Free" },
  qt_mode_select:   { ko: "오늘 큐티 방식을 선택해주세요", de: "Bitte Methode wählen", en: "Choose a method" },
  qt_draft_title:   { ko: "이어서 할까요?",           de: "Weiter machen?", en: "Continue?" },
  qt_draft_sub:     { ko: "작성 중인 큐티가 있어요.\n이어서 하시겠어요?", de: "Es gibt eine unvollständige QT.\nMöchten Sie weitermachen?", en: "There is an incomplete QT.\nWould you like to continue?" },
  qt_draft_continue:{ ko: "이어서 하기",              de: "Fortfahren", en: "Continue" },
  qt_draft_new:     { ko: "처음부터 새로 하기",        de: "Neu beginnen", en: "Start new" },
  qt_draft_later:   { ko: "나중에 할게요",            de: "Später", en: "Later" },

  // ── 큐티 작성 ──
  qt_write_opening: { ko: "들어가는 기도",            de: "Eröffnungsgebet", en: "Opening Prayer" },
  qt_write_summary: { ko: "본문 요약 & 붙잡은 말씀",   de: "Zusammenfassung & Schlüsselvers", en: "Summary & Key Verse" },
  qt_write_meditate:{ ko: "느낌과 묵상",              de: "Empfinden & Meditation", en: "Reflection & Meditation" },
  qt_write_decision:{ ko: "적용과 결단",              de: "Anwendung & Entschluss", en: "Application & Resolution" },
  qt_write_closing: { ko: "올려드리는 기도",           de: "Abschlussgebet", en: "Closing Prayer" },
  qt_write_save:    { ko: "큐티 저장",               de: "Speichern", en: "Save" },
  qt_write_draft:   { ko: "임시저장",                de: "Entwurf", en: "Draft" },
  qt_write_complete:{ ko: "완료",                    de: "Fertig", en: "Done" },
  qt_step_summary:  { ko: "2단계 · 본문 요약",        de: "Schritt 2 · Zusammenfassung", en: "Step 2 · Summary" },
  qt_step_keyverse: { ko: "3단계 · 붙잡은 말씀",      de: "Schritt 3 · Schlüsselvers", en: "Step 3 · Key Verse" },
  qt_step_meditate: { ko: "4단계 · 느낌과 묵상",      de: "Schritt 4 · Meditation", en: "Step 4 · Meditation" },
  qt_step_decision: { ko: "5단계 · 적용과 결단",      de: "Schritt 5 · Entschluss", en: "Step 5 · Resolution" },

  // ── 기도 탭 ──
  prayer_title:       { ko: "기도",                   de: "Gebet", en: "Prayer" },
  prayer_tab_praying: { ko: "기도 중",                de: "Im Gebet", en: "Praying 🙏" },
  prayer_tab_answered:{ ko: "기도 응답",              de: "Erhörtes Gebet", en: "Answered ✨" },
  prayer_add:         { ko: "+ 기도 제목 추가",        de: "+ Gebetsanliegen hinzufügen", en: "+ Add prayer request" },
  prayer_placeholder: { ko: "기도 제목을 입력하세요...", de: "Gebetsanliegen eingeben...", en: "Enter prayer request..." },
  prayer_save:        { ko: "저장",                   de: "Speichern", en: "Save" },
  prayer_together:    { ko: "함께 기도할게요",         de: "Gemeinsam beten", en: "Pray together" },
  prayer_prayed:      { ko: "기도했어요",              de: "Gebetet", en: "Prayed" },
  prayer_answered:    { ko: "기도 응답됨",             de: "Erhört", en: "Answered" },

  // ── 커뮤니티 ──
  community_create_group:{ ko: "그룹 만들기",        de: "Gruppe erstellen", en: "Create group" },
  community_join_group:  { ko: "그룹 참여",          de: "Gruppe beitreten", en: "Join group" },
  community_tab_prayer:  { ko: "기도",               de: "Gebet", en: "Prayer" },
  community_tab_qt:      { ko: "큐티",               de: "QT", en: "QT" },
  community_tab_group:   { ko: "그룹",               de: "Gruppe", en: "Group" },

  // ── 프로필 ──
  profile_faith_journey:{ ko: "신앙 여정",           de: "Glaubensweg", en: "Faith Journey" },
  profile_faith_fruits: { ko: "신앙의 결실",         de: "Glaubensfrüchte", en: "Faith Badges" },
  profile_spirit_fruits:{ ko: "성령의 열매",         de: "Früchte des Geistes", en: "Fruits of the Spirit" },
  profile_qt_calendar:  { ko: "큐티 현황",            de: "QT Kalender", en: "QT Calendar" },
  profile_invite:       { ko: "친구 초대하기",        de: "Freunde einladen", en: "Invite friends" },
  profile_feedback:     { ko: "💬 의견 보내기",       de: "💬 Feedback senden", en: "💬 Send feedback" },
  profile_feedback_placeholder:{ ko: "의견을 입력해 주세요...", de: "Feedback eingeben...", en: "Enter feedback..." },
  profile_feedback_send:{ ko: "보내기",              de: "Senden", en: "Send" },
  profile_feedback_sending:{ ko: "전송 중...",       de: "Wird gesendet...", en: "Sending..." },
  profile_feedback_title:{ ko: "💬 의견 보내기",     de: "💬 Feedback senden", en: "💬 Send feedback" },
  profile_feedback_sub: { ko: "불편한 점, 개선 아이디어, 격려의 말씀 뭐든 환영해요!", de: "Kritik, Ideen oder Ermutigung – alles willkommen!", en: "Criticism, ideas or encouragement — all welcome!" },
  profile_account:  { ko: "계정 관리",               de: "Kontoverwaltung", en: "Account management" },
  profile_delete:   { ko: "계정 탈퇴",               de: "Konto löschen", en: "Delete account" },
  profile_delete_confirm:{ ko: "정말 탈퇴하시겠어요?\n모든 큐티 기록, 기도 제목이 영구 삭제돼요.", de: "Wirklich löschen?\nAlle Daten werden dauerhaft entfernt.", en: "Really delete?\nAll data will be permanently removed." },
  profile_delete_cancel:{ ko: "취소",                de: "Abbrechen", en: "Cancel" },
  profile_delete_confirm_btn:{ ko: "탈퇴하기",       de: "Löschen", en: "Delete" },
  profile_deleting: { ko: "삭제 중...",              de: "Wird gelöscht...", en: "Deleting..." },
  profile_streak:   { ko: "일 연속 기록 중 🔥",       de: "Tage in Folge 🔥", en: "days in a row 🔥" },
  profile_prayer_count:{ ko: "기도 제목",            de: "Gebete", en: "Prayers" },
  profile_prayer_answered_count:{ ko: "기도 응답",   de: "Erhörte Gebete", en: "Answered Prayers" },
  profile_qt_share: { ko: "큐티 나눔",               de: "Geteilte QTs", en: "Shared QTs" },
  profile_impressum:{ ko: "Impressum",              de: "Impressum", en: "Legal notice" },
  profile_privacy:  { ko: "개인정보처리방침",          de: "Datenschutz", en: "Privacy policy" },

  // 프로필 하드코딩 수정용
  profile_default_name: { ko: "성도",       de: "Nutzer", en: "User" },
  profile_badge_earned: { ko: "✓ 획득",     de: "✓ Erhalten", en: "✓ Earned" },
  profile_logout:       { ko: "로그아웃",    de: "Abmelden", en: "Log out" },
  profile_upload_fail:  { ko: "업로드 실패",  de: "Upload fehlgeschlagen", en: "Upload failed" },
  profile_save_fail:    { ko: "사진 저장 실패", de: "Foto speichern fehlgeschlagen", en: "Photo save failed" },
  profile_feedback_ok:  { ko: "소중한 의견 감사해요! 😊", de: "Vielen Dank für Ihr Feedback! 😊", en: "Thank you for your feedback! 😊" },
  profile_feedback_fail:{ ko: "전송에 실패했어요. 다시 시도해 주세요.", de: "Senden fehlgeschlagen. Bitte erneut versuchen.", en: "Send failed. Please try again." },
  profile_delete_error: { ko: "계정 삭제 중 오류가 발생했어요. cookiko313@gmail.com 으로 문의해 주세요.", de: "Fehler beim Löschen. Bitte kontaktieren Sie cookiko313@gmail.com.", en: "Error deleting. Please contact cookiko313@gmail.com." },
  profile_free_qt:      { ko: "자유 묵상",    de: "Freie Meditation", en: "Free Meditation" },
  profile_sunday_qt:    { ko: "주일예배",     de: "Sonntagsgottesdienst", en: "Sunday Worship" },

  // ── 요일 ──
  weekday_sun: { ko: "일", de: "So", en: "Sun" },
  weekday_mon: { ko: "월", de: "Mo", en: "Mon" },
  weekday_tue: { ko: "화", de: "Di", en: "Tue" },
  weekday_wed: { ko: "수", de: "Mi", en: "Wed" },
  weekday_thu: { ko: "목", de: "Do", en: "Thu" },
  weekday_fri: { ko: "금", de: "Fr", en: "Fri" },
  weekday_sat: { ko: "토", de: "Sa", en: "Sat" },

  // ── 뱃지 ──
  badge_thanks:     { ko: "감사해요 🙏",             de: "Danke 🙏", en: "Thank you 🙏" },
  badge_rootsman_title: { ko: "루츠맨",              de: "Rootsman", en: "Rootsman" },
  badge_rootsman_desc:  { ko: "7일 큐티",            de: "7 Tage", en: "7 days" },
  badge_mose_title:     { ko: "모세",                de: "Mose", en: "Moses" },
  badge_mose_desc:      { ko: "40일 큐티",           de: "40 Tage", en: "40 days" },
  badge_rootsman_bible_title:{ ko: "루츠맨 성경",    de: "Rootsman Bibel", en: "Rootsman Bible" },
  badge_rootsman_bible_desc: { ko: "52일 큐티",      de: "52 Tage", en: "52 days" },
  badge_david_title:    { ko: "다윗",                de: "David", en: "David" },
  badge_david_desc:     { ko: "111일 큐티",          de: "111 Tage", en: "111 days" },
  badge_noah_title:     { ko: "노아",                de: "Noah", en: "Noah" },
  badge_noah_desc:      { ko: "첫 기도 응답",         de: "Erstes erhörtes Gebet", en: "First answered prayer" },
  badge_joseph_title:   { ko: "요셉",                de: "Josef", en: "Joseph" },
  badge_joseph_desc:    { ko: "첫 큐티 나눔",         de: "Erste geteilte QT", en: "First shared QT" },
  badge_prayer_warrior_title:{ ko: "기도의 용사",    de: "Gebetskrieger", en: "Prayer Warrior" },
  badge_prayer_warrior_desc: { ko: "중보기도 15회",   de: "15 Fürbitten", en: "15 intercessions" },
  badge_paul_title:     { ko: "바울",                de: "Paulus", en: "Paul" },
  badge_paul_desc:      { ko: "함께기도 30회",        de: "30 gemeinsame Gebete", en: "30 community prayers" },
  badge_peter_title:    { ko: "베드로",              de: "Petrus", en: "Peter" },
  badge_peter_desc:     { ko: "첫 그룹 만들기",       de: "Erste Gruppe erstellt", en: "Rock of faith" },
  badge_qt_bird_title:  { ko: "말씀 배달부",          de: "Wortüberbringer", en: "Word Carrier" },
  badge_qt_bird_desc:   { ko: "큐티 나눔 30회",       de: "30 geteilte QTs", en: "30 QTs shared" },
  badge_angel_title:    { ko: "천사",                de: "Engel", en: "Angel" },
  badge_angel_desc:     { ko: "성령의 열매 9개",      de: "9 Früchte des Geistes", en: "900 days" },

  // 뱃지 팝업 메시지
  badge_rootsman_msg:       { ko: "7일간 말씀과 함께한 당신, Roots의 진짜 시작이에요!", de: "7 Tage mit Gottes Wort – ein echter Anfang bei Roots!", en: "7 days in a row! The farmer is your companion!" },
  badge_mose_msg:           { ko: "광야의 모세처럼, 40일을 걸어온 당신을 하나님이 기억하세요!", de: "Wie Mose in der Wüste – Gott kennt Ihren 40-Tage-Weg!", en: "40 days like Moses on the mountain!" },
  badge_rootsman_bible_msg: { ko: "52일! 오병이어처럼 작은 헌신이 기적을 만들어요!", de: "52 Tage! Wie bei der Brotvermehrung – kleine Hingabe macht Wunder!", en: "52 days — a year of weekly Bible reading!" },
  badge_david_msg:          { ko: "골리앗 앞에 선 다윗처럼, 담대하고 굳건한 믿음의 당신을 축복합니다!", de: "Wie David vor Goliat – mutig und standhaft im Glauben!", en: "111 days! A heart after God's own heart!" },
  badge_noah_msg:           { ko: "노아의 방주처럼, 하나님의 약속은 반드시 이루어져요!", de: "Wie die Arche Noah – Gottes Versprechen wird erfüllt!", en: "Your first prayer was answered! Like Noah's rainbow!" },
  badge_joseph_msg:         { ko: "요셉의 꿈처럼, 당신의 나눔이 누군가에게 소망이 돼요!", de: "Wie Josefs Traum – Ihr Teilen gibt anderen Hoffnung!", en: "You shared your QT for the first time!" },
  badge_prayer_warrior_msg: { ko: "구하고 찾는 자에게 응답하시는 하나님이 반드시 응답하실 거예요!", de: "Gott antwortet denen, die suchen und bitten – er wird antworten!", en: "15 intercession prayers — a true prayer warrior!" },
  badge_paul_msg:           { ko: "바울처럼 공동체를 사랑하고 위해 기도하는 당신을 축복합니다!", de: "Wie Paulus – der die Gemeinde liebt und für sie betet!", en: "30 prayers in the community — like Paul's letters!" },
  badge_peter_msg:          { ko: "베드로처럼 사람을 낚는 어부가 될 당신, 더 큰 열매를 맺을 줄 믿습니다!", de: "Wie Petrus, der Menschenfischer – Sie werden große Frucht tragen!", en: "Steadfast like Peter, the rock!" },
  badge_qt_bird_msg:        { ko: "큐티 나눔을 통해 받은 은혜를 전하는 당신을 축복합니다.", de: "Gesegnet seien Sie, der durch das Teilen Gnade weitergibt.", en: "30 QTs shared! Carrying the Word like a dove!" },
  badge_angel_msg:          { ko: "성령의 열매 9가지를 다 모은 당신을 축복합니다.", de: "Gesegnet, der alle 9 Früchte des Geistes gesammelt hat.", en: "900 days! All 9 fruits of the Spirit!" },

  // 뱃지 획득 팝업 타이틀
  badge_popup_rootsman:        { ko: "루츠맨 배지 획득! 🧑‍🌾",       de: "Rootsman-Abzeichen! 🧑‍🌾", en: "Rootsman Badge! 🧑‍🌾" },
  badge_popup_mose:            { ko: "모세 배지 획득! 🪄",          de: "Mose-Abzeichen! 🪄", en: "Moses Badge! 🪄" },
  badge_popup_rootsman_bible:  { ko: "루츠맨 성경 배지 획득! 📖",     de: "Rootsman Bibel-Abzeichen! 📖", en: "Rootsman Bible Badge! 📖" },
  badge_popup_david:           { ko: "다윗 배지 획득! 🗡️",          de: "David-Abzeichen! 🗡️", en: "David Badge! 🗡️" },
  badge_popup_angel:           { ko: "천사 배지 획득! 👼",           de: "Engel-Abzeichen! 👼", en: "Angel Badge! 👼" },
  badge_popup_joseph:          { ko: "요셉 배지 획득! 🌈",           de: "Josef-Abzeichen! 🌈", en: "Joseph Badge! 🌈" },
  badge_popup_qt_bird:         { ko: "말씀 배달부 배지 획득! 🕊️",    de: "Wortüberbringer-Abzeichen! 🕊️", en: "Word Carrier Badge! 🕊️" },

  // ── 온보딩 ──
  onboarding_title1:  { ko: "Roots에 오신 걸 환영해요",  de: "Willkommen bei Roots", en: "Every morning,\nroots grow deeper" },
  onboarding_desc1:   { ko: "말씀에 뿌리내리고, 함께 자라다.\n매일 3가지 루틴으로 하나님과 깊어지는 시간을 만들어요.", de: "In Gottes Wort verwurzelt, gemeinsam wachsen.\n3 tägliche Routinen für eine tiefere Zeit mit Gott.", en: "Every day: receive a verse,\npray, and set a resolution." },
  onboarding_desc1_sub: { ko: "", de: "", en: "" },
  onboarding_title2:  { ko: "오늘 마음으로 말씀을 받아요", de: "Tagesvers nach Ihrem Herzen", en: "Resolutions —\nnot just thoughts, but actions" },
  onboarding_desc2:   { ko: "오늘 내 감정을 선택하면\nRoots가 딱 맞는 말씀과 오늘의 결단을 건네줘요.", de: "Wählen Sie Ihre Stimmung –\nRoots gibt Ihnen den passenden Vers und Vorsatz.", en: "Not 'please pray' but concrete actions\nyou can do with hands and feet." },
  onboarding_desc2_sub: { ko: "\"기도하세요\"가 아니라\n\"오늘 점심 5분, 핸드폰 내려놓고 주님께 말 걸어보세요\"처럼\n손발로 할 수 있는 것들이에요.", de: "Nicht \"Bitte beten\" – sondern:\n\"Heute mittags 5 Minuten, Handy weglegen und mit Gott reden.\"\nKonkrete Handlungen." },
  onboarding_title3:  { ko: "큐티 6단계로 말씀을 심어요", de: "Gottes Wort in 6 Schritten", en: "Quiet Time\nin 6 steps" },
  onboarding_desc3:   { ko: "① 들어가는 기도\n② 본문 요약\n③ 붙잡은 말씀\n④ 느낌과 묵상\n⑤ 적용과 결단\n⑥ 올려드리는 기도", de: "① Eröffnungsgebet\n② Zusammenfassung\n③ Schlüsselvers\n④ Empfinden & Meditation\n⑤ Anwendung & Entschluss\n⑥ Abschlussgebet", en: "① Opening Prayer\n② Summary\n③ Key Verse\n④ Reflection & Meditation\n⑤ Application & Resolution\n⑥ Closing Prayer" },
  onboarding_desc3_sub: { ko: "처음이어도 괜찮아요.\n각 단계마다 안내가 있어서 혼자서도 충분히 할 수 있어요.", de: "Auch für Anfänger geeignet.\nJeder Schritt wird erklärt.", en: "Suitable for beginners.\nEach step is guided." },
  onboarding_title4:  { ko: "기도 제목을 기록하고 응답을 확인해요", de: "Gebete aufzeichnen und Erhörungen sehen", en: "Prayer\nthat bears fruit" },
  onboarding_desc4:   { ko: "기도 제목을 적고, 응답됐을 때 간증을 남겨요.\n중보기도 요청으로 함께 기도할 수도 있어요.", de: "Gebete aufschreiben und Zeugnisse teilen.\nGemeinsam für einander beten.", en: "Write prayer topics.\nAsk for intercession.\nRecord answered prayers as testimony." },
  onboarding_desc4_sub: { ko: "기도 중 → 기도 응답으로\n하나님의 일하심을 기록해가요.", de: "Im Gebet → Erhörtes Gebet\nGottes Wirken aufzeichnen.", en: "Praying → Answered prayer\nRecord God's work." },
  onboarding_title5:  { ko: "매일 하면 정원이 자라요",    de: "Täglich wächst Ihr Garten", en: "Watch your\ntree grow" },
  onboarding_desc5:   { ko: "큐티 + 기도 + 결단, 3가지를 모두 완료하면\n나무가 자라 100일마다 성령의 열매 배지를 받아요.", de: "Stille Zeit + Gebet + Vorsatz:\nIhr Baum wächst und alle 100 Tage gibt es eine Frucht.", en: "100 days = a spirit fruit.\nWater it daily, and the farmer\ncelebrates with you." },
  onboarding_desc5_sub: { ko: "꾸준히 하는 게 핵심이에요.\n오늘부터 시작해봐요! 🌱", de: "Konsequenz ist das Wichtigste.\nFangen Sie heute an! 🌱", en: "Consistency is key.\nStart today! 🌱" },
  onboarding_next:    { ko: "다음 →",                   de: "Weiter →", en: "Next" },
  onboarding_start:   { ko: "시작하기 🌱",               de: "Loslegen 🌱", en: "Start →" },
  onboarding_skip:    { ko: "건너뛰기",                  de: "Überspringen", en: "Skip" },

  // ── 복귀 팝업 ──
  welcome_back_btn:      { ko: "오늘 루틴 시작하기 🌱",   de: "Routine starten 🌱", en: "Start fresh today" },
  welcome_back_30_title: { ko: "오랜만이에요!",           de: "Lang nicht gesehen!", en: "Long time no see!" },
  welcome_back_30_sub:   { ko: "말씀이 기다리고 있었어요.\n오늘 다시 뿌리를 내려봐요.", de: "Das Wort hat auf Sie gewartet.\nKommen Sie zurück und wachsen Sie wieder.", en: "The Word has been waiting.\nCome back and keep growing!" },
  welcome_back_n_title:  { ko: "{n}일 만이에요!",         de: "{n} Tage später!",         en: "It's been {n} days!" },
  welcome_back_14_sub:   { ko: "괜찮아요, 언제든 돌아오면 돼요.\n오늘부터 다시 함께 자라요!", de: "Kein Problem, Sie können immer zurückkommen.\nFangen wir heute wieder an!", en: "No problem, you can always come back.\nLet's start fresh today!" },
  welcome_back_7_sub:    { ko: "나무가 당신을 기다리고 있었어요.\n오늘 루틴으로 힘내봐요 💪", de: "Ihr Baum hat auf Sie gewartet.\nWeiter geht's mit der Routine 💪", en: "Your tree has been waiting.\nLet's continue with the routine!" },
  welcome_back_1_sub:    { ko: "괜찮아요! 오늘 다시 시작해봐요.\n조금씩 꾸준히가 중요해요 🌱", de: "Kein Problem! Fangen wir heute neu an.\nKleine Schritte zählen 🌱", en: "No problem! Let's start fresh.\nSmall steps count too!" },

  // ── 가든 팝업 ──
  garden_check_btn:   { ko: "정원 확인하러 가기 🌿",     de: "Garten ansehen 🌿", en: "Check garden 🌿" },
  badge_check_btn:    { ko: "배지 확인하기 🌟",          de: "Abzeichen ansehen 🌟", en: "View badge 🌟" },
  spirit_fruit_title: { ko: "성령의 열매 획득! 🎉",      de: "Frucht des Geistes erhalten! 🎉", en: "Fruit of the Spirit received! 🎉" },
  spirit_fruit_sub:   { ko: "100일 동안 말씀에 뿌리내린 당신에게\n하나님이 주시는 열매예요!", de: "100 Tage in Gottes Wort –\ndas ist Ihre Frucht von Gott!", en: "100 days in God's Word –\nthis is your fruit from God!" },
  spirit_fruit_profile:{ ko: "프로필에서 확인할 수 있어요 ✨", de: "Im Profil ansehen ✨", en: "View in profile ✨" },

  garden_badge_title:   { ko: "성령의 열매 획득! 🎉",       de: "Frucht des Geistes erhalten! 🎉", en: "Fruit of the Spirit received! 🎉" },
  garden_badge_100days: { ko: "100일 동안 말씀에 뿌리내린 당신에게\n하나님이 주시는 열매예요!", de: "100 Tage in Gottes Wort verwurzelt –\ndas ist Ihre Frucht von Gott!", en: "100 days rooted in God's Word –\nthis is your fruit from above!" },
  garden_badge_profile: { ko: "프로필에서 확인할 수 있어요 ✨",  de: "Im Profil ansehen ✨", en: "View in profile ✨" },
  garden_updated_day:   { ko: "정원이 업데이트됐어요! {n}일째 🔥", de: "Der Garten wurde aktualisiert! Tag {n} 🔥", en: "The garden has been updated! Day {n} 🔥" },

  // 성령의 열매 이름
  fruit_love:      { ko: "사랑",    de: "Liebe", en: "Love" },
  fruit_peace:     { ko: "화평",    de: "Frieden", en: "Peace" },
  fruit_joy:       { ko: "희락",    de: "Freude", en: "Joy" },
  fruit_goodness:  { ko: "양선",    de: "Güte", en: "Goodness" },
  fruit_kindness:  { ko: "자비",    de: "Freundlichkeit", en: "Kindness" },
  fruit_patience:  { ko: "오래참음", de: "Geduld", en: "Patience" },
  fruit_faithful:  { ko: "충성",    de: "Treue", en: "Faithfulness" },
  fruit_gentle:    { ko: "온유",    de: "Sanftmut", en: "Gentleness" },
  fruit_selfctrl:  { ko: "절제",    de: "Selbstbeherrschung", en: "Self-Control" },

  // 정원 10단계 업데이트 팝업
  garden_stage_1_title: { ko: "씨앗이 뿌려졌어요!",          de: "Ein Samen wurde gesät!", en: "Seed planted! 🌱" },
  garden_stage_1_desc:  { ko: "겨자씨 한 알이 땅에 심겨졌어요.\n말씀이 마음 깊이 뿌리내리기 시작해요.", de: "Ein Senfkorn wurde in die Erde gelegt.\nGottes Wort beginnt, Wurzeln zu schlagen.", en: "A new journey begins with a tiny seed." },
  garden_stage_2_title: { ko: "새싹이 돋아났어요!",          de: "Ein Sprössling wächst!", en: "Sprout appears! 🌿" },
  garden_stage_2_desc:  { ko: "작은 싹이 흙을 뚫고 올라왔어요.\n하나님 앞에 날마다 나아오고 있어요.", de: "Ein kleines Grün durchbricht die Erde.\nSie kommen täglich zu Gott.", en: "Your dedication is showing — a sprout appears!" },
  garden_stage_3_title: { ko: "묘목이 자라고 있어요!",       de: "Der Setzling wächst!", en: "Seedling grows! 🌲" },
  garden_stage_3_desc:  { ko: "뿌리가 단단히 내리고 줄기가 세워졌어요.\n말씀이 삶에 스며들고 있어요.", de: "Die Wurzeln greifen tief, der Stamm steht fest.\nGottes Wort durchdringt Ihr Leben.", en: "Growing day by day with God's Word." },
  garden_stage_4_title: { ko: "가지가 뻗어나갔어요!",        de: "Äste breiten sich aus!", en: "Branches spread! 🌳" },
  garden_stage_4_desc:  { ko: "가지가 사방으로 뻗어나가고 있어요.\n믿음이 삶의 구석구석에 닿고 있어요.", de: "Die Äste strecken sich in alle Richtungen.\nIhr Glaube berührt jeden Bereich Ihres Lebens.", en: "Your faith branches spread wide." },
  garden_stage_5_title: { ko: "나무가 무럭무럭 자라요!",     de: "Der Baum wächst kräftig!", en: "Getting stronger! 🌴" },
  garden_stage_5_desc:  { ko: "든든한 나무로 자라고 있어요.\n폭풍 속에서도 흔들리지 않아요.", de: "Ein starker Baum entsteht.\nAuch im Sturm bleibt er stehen.", en: "Deeply rooted, standing firm." },
  garden_stage_6_title: { ko: "잎이 풍성해졌어요!",          de: "Reichlich Blätter!", en: "Leaves unfold! 🍃" },
  garden_stage_6_desc:  { ko: "무성한 잎으로 그늘을 만들고 있어요.\n당신의 신앙이 주변을 덮기 시작해요.", de: "Üppiges Laub spendet Schatten.\nIhr Glaube beginnt, andere zu umhüllen.", en: "Beautiful leaves of faith unfold." },
  garden_stage_7_title: { ko: "열매를 맺기 시작해요!",       de: "Früchte beginnen zu wachsen!", en: "Blooming! 🌺" },
  garden_stage_7_desc:  { ko: "드디어 열매가 맺히기 시작했어요!\n말씀이 삶의 열매로 나타나고 있어요.", de: "Endlich zeigen sich die ersten Früchte!\nGottes Wort trägt Frucht in Ihrem Leben.", en: "Your garden of faith is blooming." },
  garden_stage_8_title: { ko: "새들이 날아왔어요!",          de: "Vögel kommen!", en: "Bearing fruit! 🍎" },
  garden_stage_8_desc:  { ko: "새들이 날아와 가지에 깃들었어요.\n당신의 정원이 생명으로 가득해요.", de: "Vögel fliegen herbei und nisten in den Ästen.\nIhr Garten ist voller Leben.", en: "The fruit of the Spirit is forming." },
  garden_stage_9_title: { ko: "정원이 거의 완성돼요!",       de: "Der Garten ist fast fertig!", en: "Garden shines! ✨" },
  garden_stage_9_desc:  { ko: "아름다운 정원이 거의 완성됐어요.\n100일을 향해 달려가고 있어요!", de: "Ein wunderschöner Garten entsteht.\n100 Tage sind fast erreicht!", en: "Your garden radiates God's glory." },
  garden_stage_10_title:{ ko: "풍성한 정원 완성!",           de: "Üppiger Garten vollendet!", en: "Garden complete! 🏆" },
  garden_stage_10_desc: { ko: "100일의 여정을 거의 마쳤어요!\n곧 성령의 열매 배지를 받게 돼요.", de: "Die 100-Tage-Reise ist fast abgeschlossen!\nBald erhalten Sie die Frucht des Geistes.", en: "Congratulations! Time for a spirit fruit!" },

  // ── 로그인/회원가입 ──
  login_title:        { ko: "다시 돌아오셨군요!",         de: "Willkommen zurück!", en: "Welcome to Roots 🌱" },
  login_sub:          { ko: "Roots와 함께 오늘도 말씀에 뿌리내려요", de: "Mit Roots täglich in Gottes Wort verwurzeln", en: "Rooted in God's Word, growing together" },
  login_google_btn:   { ko: "Google로 계속하기",          de: "Mit Google fortfahren", en: "Continue with Google" },
  login_or_email:     { ko: "또는 이메일로",             de: "oder per E-Mail", en: "or by email" },
  login_email_label:  { ko: "이메일",                   de: "E-Mail", en: "Email" },
  login_password_label:{ ko: "비밀번호",                de: "Passwort", en: "Password" },
  login_btn:          { ko: "로그인",                   de: "Anmelden", en: "Log in" },
  login_loading:      { ko: "로그인 중...",              de: "Wird angemeldet...", en: "Logging in..." },
  login_error:        { ko: "이메일 또는 비밀번호가 틀렸어요", de: "E-Mail oder Passwort ist falsch", en: "Login failed. Please check your credentials." },
  login_no_account:   { ko: "계정이 없으신가요?",         de: "Noch kein Konto?", en: "No account yet?" },
  login_signup_link:  { ko: "회원가입",                  de: "Registrieren", en: "Sign up" },

  signup_title:       { ko: "시작하기",                 de: "Loslegen", en: "Join Roots 🌱" },
  signup_sub:         { ko: "오늘부터 말씀에 뿌리내려요 🌱", de: "Ab heute in Gottes Wort verwurzeln 🌱", en: "Root yourself in God's Word from today 🌱" },
  signup_nickname:    { ko: "닉네임",                   de: "Nickname", en: "Nickname" },
  signup_nickname_ph: { ko: "사용하실 닉네임을 입력해주세요", de: "Geben Sie einen Nickname ein", en: "Enter a nickname" },
  signup_password:    { ko: "비밀번호 (6자 이상)",        de: "Passwort (mind. 6 Zeichen)", en: "Password (min. 6 characters)" },
  signup_btn:         { ko: "시작하기",                 de: "Loslegen", en: "Sign up" },
  signup_loading:     { ko: "가입 중...",               de: "Wird registriert...", en: "Registering..." },
  signup_error:       { ko: "회원가입에 실패했어요. 다시 시도해주세요.", de: "Registrierung fehlgeschlagen. Bitte erneut versuchen.", en: "Sign-up failed. Please try again." },
  signup_pw_error:    { ko: "비밀번호는 6자 이상이어야 해요", de: "Passwort muss mindestens 6 Zeichen haben", en: "Password must be at least 6 characters" },
  signup_back:        { ko: "로그인으로",               de: "Zurück zur Anmeldung", en: "Back to login" },

  // ── 공통 ──
  save:     { ko: "저장",    de: "Speichern", en: "Save" },
  cancel:   { ko: "취소",    de: "Abbrechen", en: "Cancel" },
  close:    { ko: "닫기",    de: "Schließen", en: "Close" },
  delete:   { ko: "삭제",    de: "Löschen", en: "Delete" },
  edit:     { ko: "수정",    de: "Bearbeiten", en: "Edit" },
  confirm:  { ko: "확인",    de: "Bestätigen", en: "Confirm" },
  loading:  { ko: "로딩 중...", de: "Lädt...", en: "Loading..." },

  // ── 앱 공통 ──
  app_loading_sub: { ko: "말씀에 뿌리내리고, 함께 자라다", de: "In Gottes Wort verwurzelt, gemeinsam wachsen", en: "Rooted in God's Word, growing together" },
  home_loading_sub:{ ko: "말씀에 뿌리내리고, 함께 자라다", de: "In Gottes Wort verwurzelt, gemeinsam wachsen", en: "Rooted in God's Word, growing together" },
  home_badge_thanks:{ ko: "감사해요 🙏",                    de: "Danke 🙏", en: "Thank you 🙏" },

  // ── 홈 화면 하드코딩 수정용 ──
  home_greeting_morning:  { ko: "좋은 아침이에요 ☀️",  de: "Guten Morgen ☀️", en: "Good morning" },
  home_greeting_afternoon:{ ko: "좋은 오후예요 🌤️",    de: "Guten Nachmittag 🌤️", en: "Good afternoon" },
  home_greeting_evening:  { ko: "좋은 저녁이에요 🌅",   de: "Guten Abend 🌅", en: "Good evening" },
  home_greeting_night:    { ko: "좋은 밤이에요 🌙",     de: "Gute Nacht 🌙", en: "Good night 🌙" },
  home_verse_section:     { ko: "오늘의 말씀",          de: "Tagesvers", en: "Today's verse" },
  home_verse_empty:       { ko: "오늘의 감정을 선택하면 맞춤 말씀을 받을 수 있어요 🌿", de: "Wählen Sie Ihre Stimmung und erhalten Sie einen passenden Vers 🌿", en: "Choose your mood and receive a matching verse 🌿" },
  home_verse_btn:         { ko: "오늘의 말씀 받기",     de: "Tagesvers erhalten", en: "Get today's verse" },
  home_recommend_section: { ko: "오늘의 추천 결단",     de: "Empfohlener Vorsatz", en: "Recommended resolution" },
  home_decision_practiced:{ ko: "결단 실천 완료! 🎉",    de: "Vorsatz umgesetzt! 🎉", en: "Resolution practiced! 🎉" },
  home_decision_practice: { ko: "오늘 이 결단을 실천했어요", de: "Ich habe diesen Vorsatz umgesetzt", en: "I practiced this resolution today" },
  home_my_decision:       { ko: "오늘 나의 결단",       de: "Meine heutigen Vorsätze", en: "My resolutions today" },
  home_prayer_section:    { ko: "오늘의 기도",          de: "Heutiges Gebet", en: "Today's Prayer" },
  home_prayer_desc:       { ko: "오늘 잠깐이라도 기도를 통해 하나님과 인격적인 만남을 하셨나요?", de: "Haben Sie heute, wenn auch nur kurz, im Gebet eine persönliche Begegnung mit Gott gehabt?", en: "Did you have a personal encounter with God in prayer today, even briefly?" },
  home_prayer_done_msg:   { ko: "기도 완료! 🙏",        de: "Gebetet! 🙏", en: "Prayed! 🙏" },
  home_prayer_yes_btn:    { ko: "네, 오늘 기도했어요",    de: "Ja, ich habe heute gebetet", en: "Yes, I prayed today" },
  home_routine_section:   { ko: "오늘의 루틴",          de: "Heutige Routine", en: "Today's routine" },
  home_routine_qt:        { ko: "큐티",                 de: "QT", en: "QT" },
  home_routine_prayer:    { ko: "기도",                 de: "Gebet", en: "Prayer" },
  home_routine_decision:  { ko: "결단",                 de: "Vorsatz", en: "Resolution" },
  home_routine_done:      { ko: "완료 ✓",              de: "Erledigt ✓", en: "Done ✓" },
  home_routine_notdone:   { ko: "미완료",               de: "Offen", en: "Open" },
  home_celebration_title: { ko: "오늘 루틴 완료! 🎉",    de: "Routine erledigt! 🎉", en: "Today's routine done! 🎉" },
  home_celebration_sub_prefix: { ko: "오늘 하루 하나님과 더 가까워진 당신을 축복합니다!\n", de: "Gesegnet sei dieser Tag, an dem Sie Gott nähergekommen sind!\n", en: "Blessed is this day on which you have drawn closer to God!\n" },
  home_decision_celeb:    { ko: "결단 실천 완료! ✊",     de: "Vorsatz umgesetzt! ✊", en: "Resolution complete! ✊" },
  home_decision_celeb_sub:{ ko: "말씀을 삶으로 살아내는 당신을 축복해요 🌱", de: "Gesegnet, wer Gottes Wort im Leben umsetzt 🌱", en: "Blessed are those who live by God's Word 🌿" },

  // "{name}의 정원" / "{name}s Garten"
  home_garden_my: { ko: "{name}님의 정원", de: "{name}s Garten", en: "{name}s garden" },

  // ── TreeGrowth 하드코딩 ──
  tree_stage_0:  { ko: "씨앗 심겨졌어요",   de: "Samen gepflanzt", en: "Seed planting" },
  tree_stage_1:  { ko: "씨앗",            de: "Samen", en: "Taking root" },
  tree_stage_2:  { ko: "새싹",            de: "Sprössling", en: "Reaching for light" },
  tree_stage_3:  { ko: "묘목",            de: "Setzling", en: "Sprout appears" },
  tree_stage_4:  { ko: "성장 중",          de: "Wachsend", en: "Growing strong" },
  tree_stage_5:  { ko: "나무",            de: "Baum", en: "Branches spread" },
  tree_stage_6:  { ko: "열매 맺음",        de: "Früchte", en: "Leaves unfold" },
  tree_stage_7:  { ko: "정원 시작",        de: "Gartenstart", en: "Bearing fruit" },
  tree_stage_8:  { ko: "정원 성장",        de: "Garten wächst", en: "Full bloom" },
  tree_stage_9:  { ko: "정원 완성 🏆",     de: "Garten vollendet 🏆", en: "Garden blooming" },
  tree_stage_10: { ko: "풍성한 정원 🌳",    de: "Üppiger Garten 🌳", en: "Garden complete" },
  tree_desc_0:   { ko: "겨자씨가 땅에 심겨졌어요",       de: "Ein Senfkorn wurde gesät", en: "A mustard seed was planted" },
  tree_desc_1:   { ko: "겨자씨가 땅에 심겨졌어요",       de: "Ein Senfkorn wurde gesät", en: "A mustard seed was planted" },
  tree_desc_2:   { ko: "고개를 들고 햇빛을 찾아요",     de: "Es streckt sich zum Licht", en: "Reaching for the light" },
  tree_desc_3:   { ko: "뿌리를 단단히 내리고 있어요",    de: "Die Wurzeln greifen tief", en: "Roots growing deep" },
  tree_desc_4:   { ko: "가지가 뻗어나가고 있어요",      de: "Die Äste breiten sich aus", en: "Branches spreading out" },
  tree_desc_5:   { ko: "든든하게 자라나고 있어요",       de: "Kräftig wächst er heran", en: "Growing strong and tall" },
  tree_desc_6:   { ko: "새들이 날아와 깃들었어요",       de: "Vögel nisten in den Zweigen", en: "Birds nest in the branches" },
  tree_desc_7:   { ko: "새 씨앗이 뿌려졌어요",          de: "Neue Samen wurden gesät", en: "New seeds have been sown" },
  tree_desc_8:   { ko: "이웃 나무가 자라고 있어요",      de: "Nachbarbäume wachsen", en: "Neighboring trees are growing" },
  tree_desc_9:   { ko: "아름다운 정원이 완성됐어요!",    de: "Ein wunderschöner Garten!", en: "A beautiful garden!" },
  tree_desc_10:  { ko: "열매가 가득한 정원이에요!",      de: "Ein Garten voller Früchte!", en: "A garden full of fruit!" },

  // {n} placeholder 사용
  tree_day_count:   { ko: "{n}일째",                de: "Tag {n}",                en: "Day {n}" },
  tree_garden_n:    { ko: "{n}번째 정원",            de: "{n}. Garten",            en: "{n}. Garden" },
  tree_progress:    { ko: "{n} / 10일",             de: "{n} / 10 Tage",             en: "{n} / 10 Days" },
  tree_streak:      { ko: "{n}일 연속 기록 중",       de: "{n} Tage in Folge",       en: "{n} Days in a row" },
  tree_away_msg:    { ko: "{n}일 만이에요! 오늘 루틴으로 다시 뿌리내려봐요 💪", de: "{n} Tage her! Starten Sie die Routine und kommen Sie zurück 💪", en: "It's been {n} days! Start the routine and come back 💪" },

  // TreeGrowth 축하 sub messages
  tree_sub_1:   { ko: "씨앗이 땅속에서 뿌리를 내리기 시작했어요!",  de: "Der Samen beginnt, Wurzeln zu schlagen!", en: "The seed is starting to take root!" },
  tree_sub_14:  { ko: "씨앗이 조금씩 움트고 있어요!",              de: "Der Samen keimt langsam!", en: "The seed is slowly sprouting!" },
  tree_sub_29:  { ko: "새싹이 햇빛을 향해 자라고 있어요!",         de: "Der Sprössling wächst zum Licht!", en: "The sprout is reaching for light!" },
  tree_sub_59:  { ko: "묘목이 점점 단단해지고 있어요!",            de: "Der Setzling wird immer stärker!", en: "The seedling is getting stronger!" },
  tree_sub_79:  { ko: "나무가 무럭무럭 자라고 있어요!",            de: "Der Baum wächst kräftig!", en: "The tree is growing strong!" },
  tree_sub_99:  { ko: "나무가 점점 더 자라고 있어요!",             de: "Der Baum wächst und wächst!", en: "The tree keeps growing!" },
  tree_sub_129: { ko: "열매를 맺은 나무처럼 풍성해지고 있어요!",    de: "Wie ein fruchtbarer Baum – immer üppiger!", en: "Like a fruitful tree — ever more lush!" },
  tree_sub_max: { ko: "아름다운 정원이 완성되어 가고 있어요!",     de: "Ein wunderschöner Garten entsteht!", en: "A beautiful garden is forming!" },

  // ── RootsManPopup ──
  rootsman_title: { ko: "농부가 물을 주고 있어요",     de: "Der Gärtner gießt die Pflanzen", en: "The farmer waters the plants" },
  rootsman_check: { ko: "정원을 확인해보세요 🌱",       de: "Schauen Sie sich den Garten an 🌱", en: "Check the garden 🌱" },
  rootsman_btn:   { ko: "정원 보러 가기",              de: "Zum Garten", en: "Go to garden" },
  rootsman_msg_1: { ko: "씨앗이 땅속에서 뿌리를 내리기 시작했어요.", de: "Der Samen beginnt, Wurzeln zu schlagen.", en: "The farmer waters your seed today! 💧" },
  rootsman_msg_2: { ko: "새싹이 조금씩 고개를 내밀고 있어요.",       de: "Ein kleiner Sprössling zeigt sich.", en: "Your sprout gets love today! 🌱" },
  rootsman_msg_3: { ko: "묘목이 햇빛을 향해 자라고 있어요.",         de: "Der Setzling wächst zum Licht.", en: "Growing well! The farmer is proud! 🌿" },
  rootsman_msg_4: { ko: "가지가 뻗어나가고 뿌리가 깊어지고 있어요.", de: "Die Äste breiten sich aus, die Wurzeln vertiefen sich.", en: "Your tree is getting stronger! 💪" },
  rootsman_msg_5: { ko: "나무가 든든하게 자라나고 있어요.",          de: "Der Baum wächst kräftig heran.", en: "Beautiful growth! Keep going! 🌳" },
  rootsman_msg_6: { ko: "말씀에 점점 더 깊이 뿌리를 내리고 있어요.", de: "Die Verwurzelung in Gottes Wort wird tiefer.", en: "The farmer smiles at your garden! 😊" },
  rootsman_msg_7: { ko: "열매를 맺어가고 있어요. 계속 나아가요!",    de: "Früchte wachsen heran. Weiter so!", en: "Leaves are spreading! 🍃" },
  rootsman_msg_8: { ko: "새들이 날아와 쉬어갈 만큼 자랐어요.",      de: "Der Baum ist groß genug für Vögel.", en: "Fruit is almost ready! 🍎" },
  rootsman_msg_9: { ko: "아름다운 정원이 거의 완성되어 가요!",      de: "Ein wunderschöner Garten entsteht!", en: "Your garden shines! ✨" },
  rootsman_msg_10:{ ko: "풍성한 정원이 완성되어 가고 있어요! 🌳",    de: "Ein üppiger Garten nimmt Gestalt an! 🌳", en: "What an amazing garden! 🏆" },

  // ── QT 페이지 ──
  qt_today_done:        { ko: "오늘 큐티 완료!",                     de: "QT heute erledigt!", en: "QT done today!" },
  qt_today_done_sub:    { ko: "말씀 앞에 앉은 당신, 수고했어요",       de: "Gut gemacht – Sie waren beim Wort Gottes.", en: "Well done — you were with God's Word." },
  qt_today_bible_ref:   { ko: "오늘의 큐티 본문",                     de: "Heutiger Abschnitt", en: "TODAY'S PASSAGE" },
  qt_sunday_title:      { ko: "🙌 오늘은 주일이에요!",                de: "🙌 Heute ist Sonntag!", en: "🙌 Today is Sunday!" },
  qt_sunday_desc:       { ko: "6단계 큐티 대신 주일예배 큐티를 진행해 주세요.", de: "Bitte die Sonntagsgottesdienst-QT durchführen.", en: "Please do a Sunday worship QT." },
  qt_today_start:       { ko: "오늘 큐티 시작하기",                   de: "Heutige QT beginnen", en: "Start today's QT" },
  qt_past_records:      { ko: "지난 큐티 기록",                       de: "Frühere QTs", en: "Recordings" },
  qt_no_records_simple: { ko: "아직 큐티 기록이 없어요",               de: "Noch keine Aufzeichnungen", en: "No recordings yet" },
  qt_how_title:         { ko: "어떻게 큐티할까요?",                    de: "Wie möchten Sie QT machen?", en: "How would you like to do QT?" },
  qt_how_sub:           { ko: "형식을 선택하면 바로 시작돼요",         de: "Wählen Sie ein Format", en: "Choose a format" },
  qt_mode_6step_title:  { ko: "6단계 큐티",                           de: "6-Schritte QT", en: "6-Step QT" },
  qt_mode_6step_desc:   { ko: "들어가는 기도 → 본문 → 붙잡은 말씀\n→ 묵상 → 결단 → 마침 기도", de: "Eröffnungsgebet → Text → Schlüsselvers\n→ Meditation → Entschluss → Abschlussgebet", en: "Opening Prayer → Text → Key Verse\n→ Meditation → Resolution → Closing Prayer" },
  qt_mode_sunday_title: { ko: "주일예배 큐티",                        de: "Sonntagsgottesdienst", en: "Sunday Worship" },
  qt_mode_sunday_desc:  { ko: "설교 요약 + 붙잡은 말씀 + 결단\n일요일에 자동으로 추천돼요", de: "Predigtzusammenfassung + Schlüsselvers + Entschluss\nSonntags automatisch empfohlen", en: "Sermon summary + Key verse + Resolution\nAutomatically recommended on Sundays" },
  qt_mode_free_title:   { ko: "자유 형식",                           de: "Freie Form", en: "Free Form" },
  qt_mode_free_desc:    { ko: "다른 큐티책을 쓰거나 자유롭게\n묵상을 적고 싶을 때", de: "Wenn Sie ein eigenes Andachtsbuch verwenden\noder frei meditieren möchten", en: "When using your own devotional book\nor want to meditate freely" },
  qt_guide_btn:         { ko: "큐티 6단계 가이드 보기",                de: "6-Schritte-Anleitung ansehen", en: "View 6-step guide" },
  qt_guide_step_label:  { ko: "큐티 가이드",                          de: "Anleitung", en: "Guide" },
  qt_guide_example:     { ko: "예시",                                de: "Beispiel", en: "Example" },
  qt_guide_prev:        { ko: "← 이전",                              de: "← Zurück", en: "← Back" },
  qt_guide_next:        { ko: "다음 →",                              de: "Weiter →", en: "Next →" },
  qt_guide_start:       { ko: "시작하기 🌱",                         de: "Loslegen 🌱", en: "Let's go 🌱" },
  qt_year_records:      { ko: "{year}년 · {count}개 기록",            de: "{year} · {count} Aufzeichnungen" },

  // QT 가이드 6단계
  qt_g1_title: { ko: "들어가는 기도",     de: "Eröffnungsgebet", en: "Opening Prayer" },
  qt_g1_desc:  { ko: "하나님께 나아가기 위한 접속 스위치. 스위치 ON 하면 하나님의 빛과 생명 에너지가 우리에게 흘러들어오기 시작!", de: "Der Startschalter, um zu Gott zu kommen. Wenn der Schalter an ist, beginnen Gottes Licht und Lebenskraft in uns zu fließen!", en: "The switch to come before God. When the switch turns on, the radio works. Prayer is that switch." },
  qt_g1_ex:    { ko: "주님, 제 눈을 열어 주님의 말씀을 보게 해 주세요. 제 귀를 열어 듣게 해 주세요. 제 마음을 열어 말씀을 받게 해 주세요. 예수님의 이름으로 기도합니다. 아멘", de: "Herr, öffne meine Augen, damit ich dein Wort sehe. Öffne meine Ohren, damit ich höre. Öffne mein Herz, damit ich dein Wort empfange. Im Namen Jesu, Amen.", en: "Lord, open my eyes to see your Word. Open my ears to hear your voice. Open my heart to receive today's message." },
  qt_g2_title: { ko: "본문 요약",         de: "Textzusammenfassung", en: "Text Summary" },
  qt_g2_desc:  { ko: "두 번 정도 반복해서 읽고 그 내용을 자신의 말로, 자신의 표현으로 요약!", de: "Lesen Sie den Text zweimal und fassen Sie ihn in eigenen Worten zusammen!", en: "Read the text twice and summarize it in your own words. Write briefly what the text is about." },
  qt_g2_ex:    { ko: "예) 바울이 빌립보 교인들에게 어떤 상황에서도 기뻐하라고 권면하며, 걱정 대신 기도로 하나님께 아뢰면 평강이 임한다고 말한다.", de: "z. B. Paulus ermahnt die Philipper, sich in allen Umständen zu freuen, und sagt: Wer statt sich zu sorgen betet, empfängt Gottes Frieden.", en: "e.g. Paul urges the Philippians to rejoice in all circumstances and not to worry but to bring everything to God in prayer." },
  qt_g3_title: { ko: "붙잡은 말씀",       de: "Schlüsselvers", en: "Key verse" },
  qt_g3_desc:  { ko: "말씀을 읽을 때, 말씀이 우리를 스캔합니다. 우리 마음 밭에 뿌려질 말씀의 씨앗이 있는 부분에서 멈춥니다. 그곳을 붙잡으면 됩니다.", de: "Beim Lesen scannt das Wort uns. Es hält dort an, wo der Same für unser Herz liegt. Dort halten wir fest.", en: "As you read, the Word scans us. It stops where the seed of faith needs to fall." },
  qt_g3_ex:    { ko: "예) \"아무것도 염려하지 말고 다만 모든 일에 기도와 간구로... 너희 구할 것을 감사함으로 하나님께 아뢰라\" (빌 4:6)", de: "z. B. \"Sorgt euch um nichts, sondern lasst in allen Dingen eure Bitten in Gebet und Flehen mit Danksagung vor Gott kundwerden.\" (Phil 4,6)" },
  qt_g4_title: { ko: "느낌과 묵상",       de: "Empfinden & Meditation", en: "Reflection & Meditation" },
  qt_g4_desc:  { ko: "말씀은 살아계신 생명의 주로부터 옵니다. 철저하게 개인적으로, 맞춤형으로 옵니다. 물음표가 아닌 느낌표를 두고, 순종의 마음을 품고 성령님의 이끄심에 맡겨봅시다!", de: "Das Wort kommt vom lebendigen Herrn des Lebens. Es kommt ganz persönlich, maßgeschneidert. Setzen Sie Ausrufezeichen statt Fragezeichen, seien Sie gehorsam und lassen Sie sich vom Heiligen Geist leiten!", en: "The Word comes from the living Lord of life. It comes to the very spot where I am today." },
  qt_g4_ex:    { ko: "예) 요즘 취업 걱정에 잠 못 드는데, 주님이 오늘 이 말씀으로 '나한테 가져와'라고 하시는 것 같았다.", de: "z. B. Ich kann vor Jobsorgen nicht schlafen, und heute sagt der Herr mir durch dieses Wort: 'Bring es zu mir.'", en: "e.g. I can't sleep because of job worries, and today the Word says 'Do not be anxious.' The Lord tells me not to worry but to pray and trust Him." },
  qt_g5_title: { ko: "적용과 결단",       de: "Anwendung & Entschluss", en: "Application & Resolution" },
  qt_g5_desc:  { ko: "적용과 결단은 말씀이 나의 성품이 되는 가장 중요한 단계. 성품은 마음을 정하는 것이고, 행동은 손과 발로 하나님의 능력이 드러나게 하는 것입니다.", de: "Anwendung und Entschluss sind der wichtigste Schritt, damit das Wort zu meinem Charakter wird. Charakter ist die Entscheidung des Herzens, Handlung zeigt Gottes Kraft mit Händen und Füßen.", en: "Application and resolution are the most important steps for the Word to take root in daily life." },
  qt_g5_ex:    { ko: "성품: 모든 일에 먼저 기도하고 긍정적으로 생각하겠습니다.\n행동: 주신 말씀 친구들과 나누기 / 자기 전에 기도하기", de: "Charakter: Ich werde bei allem zuerst beten und positiv denken.\nHandlung: Das Wort mit Freunden teilen / Vor dem Schlafen beten", en: "Character: I will pray first and think positively about everything.\nAction: Tonight I will write 3 things I'm grateful for and pray about tomorrow's worries." },
  qt_g6_title: { ko: "올려드리는 기도",    de: "Abschlussgebet", en: "Closing Prayer" },
  qt_g6_desc:  { ko: "주신 말씀과 받은 은혜에 대한 감사와 영광을, 묵상과 결단을 간결하게 다시 하나님께 올려드립니다.", de: "Danken Sie Gott für das empfangene Wort und die Gnade, und bringen Sie Meditation und Entschluss kurz vor Gott.", en: "Thank God for the Word received and ask for grace to live it out today." },
  qt_g6_ex:    { ko: "예) 주님, 오늘 염려를 기도로 바꾸라는 말씀 감사해요. 오늘 하루 말씀대로 살게 도와주세요. 예수님 이름으로 기도합니다. 아멘", de: "z. B. Herr, danke für das Wort, Sorgen in Gebet zu verwandeln. Hilf mir heute, nach deinem Wort zu leben. Im Namen Jesu, Amen.", en: "e.g. Lord, thank you for the Word to turn worries into prayer. Help me lay my job worries at your feet tonight." },

  // ── 언어 선택 화면 ──
  lang_picker_title: { ko: "언어를 선택해주세요",     de: "Sprache wählen", en: "Choose language" },
  lang_picker_sub:   { ko: "Please select your language", de: "Please select your language", en: "Please select your language" },
  lang_continue:     { ko: "계속하기",              de: "Weiter", en: "Next" },

  // ── QT record ──
  qt_record_all:        { ko: "전체 커뮤니티", de: "Gesamte Gemeinde", en: "Entire community" },
  qt_record_copied:     { ko: "복사됨! ✓",    de: "Kopiert! ✓", en: "Copied! ✓" },
  qt_record_copy_all:   { ko: "전체 복사",     de: "Alles kopieren", en: "Copy all" },
  qt_record_public:     { ko: "공개 그룹",     de: "Öffentliche Gruppe", en: "Public group" },
  qt_record_private:    { ko: "비공개 그룹",    de: "Private Gruppe", en: "Private group" },
  qt_record_opening:    { ko: "들어가는 기도",  de: "Eröffnungsgebet", en: "Opening Prayer" },
  qt_record_summary:    { ko: "본문 요약",     de: "Zusammenfassung", en: "Summary" },
  qt_record_keyverse:   { ko: "붙잡은 말씀",   de: "Schlüsselvers", en: "Key verse" },
  qt_record_meditation: { ko: "느낌과 묵상",   de: "Empfinden & Meditation", en: "Reflection & Meditation" },
  qt_record_application:{ ko: "성품 (적용)",   de: "Charakter (Anwendung)", en: "Character (Application)" },
  qt_record_decision:   { ko: "행동 (결단)",   de: "Handlung (Entschluss)", en: "Action (Resolution)" },
  qt_record_closing:    { ko: "올려드리는 기도", de: "Abschlussgebet", en: "Closing Prayer" },

  // ── Join ──
  join_private:         { ko: "비공개 그룹",      de: "Private Gruppe", en: "Private group" },
  join_invite:          { ko: "그룹 초대",        de: "Gruppeneinladung", en: "Group invitation" },
  join_private_invite:  { ko: "🔒 비공개 그룹 초대", de: "🔒 Private Gruppeneinladung", en: "🔒 Private group invitation" },
  join_btn:             { ko: "그룹 참여하기",     de: "Gruppe beitreten", en: "Join group" },

  // ── 성경 번역본 그룹 라벨 ──
  qt_translation_ko: { ko: "한국어",   de: "Koreanisch", en: "Korean" },
  qt_translation_en: { ko: "English",  de: "Englisch"   },
  qt_translation_de: { ko: "Deutsch",  de: "Deutsch", en: "German"    },
  qt_translation_fr: { ko: "Français", de: "Französisch", en: "French"},

  // ── QT Write 페이지 ──
  // 6단계 제목 / 부제목 / placeholder / hint
  qtw_s1_title:    { ko: "들어가는 기도",               de: "Eröffnungsgebet", en: "Opening Prayer" },
  qtw_s1_sub:      { ko: "말씀 앞에 나아가기 전 기도",    de: "Gebet vor dem Wort", en: "Prayer before the Word" },
  qtw_s1_ph:       { ko: "주님, 오늘 말씀 앞에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", de: "Herr, ich komme heute vor dein Wort...\nÖffne meine Augen, Ohren und mein Herz.", en: "Lord, I come before your Word today...\nOpen my eyes, ears and heart." },
  qtw_s1_hint:     { ko: "짧아도 괜찮아요. 마음을 열고 주님께 나아가는 기도예요.", de: "Kurz reicht auch. Ein Gebet mit offenem Herzen.", en: "Short is fine. A prayer with an open heart." },
  qtw_s2_title:    { ko: "본문 요약 & 붙잡은 말씀",      de: "Zusammenfassung & Schlüsselvers", en: "Summary & Key Verse" },
  qtw_s2_sub:      { ko: "본문을 읽고 마음에 새겨요",     de: "Den Text lesen und ins Herz aufnehmen", en: "Read the text and take it to heart" },
  qtw_s3_title:    { ko: "느낌과 묵상",                 de: "Empfinden & Meditation", en: "Reflection & Meditation" },
  qtw_s3_sub:      { ko: "이 말씀이 내게 주는 의미",     de: "Was bedeutet das Wort für mich?", en: "What does this Word mean to me?" },
  qtw_s3_ph:       { ko: "이 말씀이 오늘 내 삶에 무슨 말씀인가요?\n솔직하게 느낀 것을 써보세요.", de: "Was sagt dieses Wort in mein Leben hinein?\nSchreiben Sie ehrlich, was Sie empfinden.", en: "Was sagt dieses Wort in mein Leben hinein?\nSchreiben Sie ehrlich, was Sie empfinden." },
  qtw_s3_hint:     { ko: "정답이 없어요. 성령님의 이끄심에 맡겨봐요.", de: "Es gibt keine richtige Antwort. Lassen Sie sich vom Heiligen Geist leiten.", en: "There's no right answer. Let the Holy Spirit guide you." },
  qtw_s4_title:    { ko: "적용과 결단",                 de: "Anwendung & Entschluss", en: "Application & Resolution" },
  qtw_s4_sub:      { ko: "오늘 하루 어떻게 살 건가요?",   de: "Wie leben Sie heute?", en: "How will you live today?" },
  qtw_s4_hint:     { ko: "성품은 마음을 정하는 것, 행동은 손과 발로 드러나는 것이에요.", de: "Charakter ist die Entscheidung des Herzens, Handlung wird mit Händen und Füßen sichtbar.", en: "Character is the heart's decision, action is shown through hands and feet." },
  qtw_s5_title:    { ko: "올려드리는 기도",              de: "Abschlussgebet", en: "Closing Prayer" },
  qtw_s5_sub:      { ko: "말씀으로 드리는 기도",         de: "Gebet mit dem Wort", en: "Prayer with the Word" },
  qtw_s5_ph:       { ko: "말씀을 붙들고 기도를 올려드려요...", de: "Gebet, das das Wort festhält...", en: "Prayer holding on to the Word..." },
  qtw_s5_hint:     { ko: "말씀과 결단을 간결하게 다시 하나님께 올려드려요.", de: "Wort und Entschluss noch einmal kurz vor Gott bringen.", en: "Bring the Word and resolution before God once more." },

  // 진행바 6칸 라벨
  qtw_bar1: { ko: "들어가는 기도", de: "Eröffnung", en: "Opening" },
  qtw_bar2: { ko: "본문 요약",    de: "Zusammenf.", en: "Summary" },
  qtw_bar3: { ko: "붙잡은 말씀",  de: "Schlüsselvers", en: "Key verse" },
  qtw_bar4: { ko: "느낌과 묵상", de: "Meditation", en: "Meditation" },
  qtw_bar5: { ko: "적용과 결단", de: "Entschluss", en: "Resolution" },
  qtw_bar6: { ko: "올려드리는 기도", de: "Abschluss", en: "Closing" },

  // 주일예배 단계
  qtw_sun_s0_title: { ko: "설교 정보",           de: "Predigt-Info", en: "Sermon info" },
  qtw_sun_s0_sub:   { ko: "설교 제목과 본문 말씀을 적어요", de: "Titel und Bibelstelle der Predigt", en: "Sermon title and passage" },
  qtw_sun_s1_title: { ko: "들어가는 기도",        de: "Eröffnungsgebet", en: "Opening Prayer" },
  qtw_sun_s1_sub:   { ko: "예배 전 마음을 준비해요", de: "Herz vorbereiten vor dem Gottesdienst", en: "Prepare your heart before worship" },
  qtw_sun_s1_ph:    { ko: "주님, 오늘 예배에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", de: "Herr, ich komme heute zum Gottesdienst...\nÖffne meine Augen, Ohren und mein Herz.", en: "Lord, I come to worship today...\nOpen my eyes, ears and heart." },
  qtw_sun_s1_hint:  { ko: "예배 전 마음을 열고 주님께 나아가는 기도예요.", de: "Gebet mit offenem Herzen vor dem Gottesdienst.", en: "A prayer with open heart before worship." },
  qtw_sun_s2_title: { ko: "말씀 요약",           de: "Zusammenfassung", en: "Summary" },
  qtw_sun_s2_sub:   { ko: "설교 말씀을 내 말로 요약해요", de: "Predigt in eigenen Worten zusammenfassen", en: "Summarize the sermon in your own words" },
  qtw_sun_s2_ph:    { ko: "오늘 설교 내용을 요약해보세요", de: "Fassen Sie die Predigt zusammen", en: "Summarize the message" },
  qtw_sun_s2_hint:  { ko: "목사님이 전한 핵심 메시지를 나의 말로 정리해요.", de: "Die Kernbotschaft des Pastors in eigene Worte fassen.", en: "Put the pastor's core message in your own words." },
  qtw_sun_s3_title: { ko: "깨달음과 결단",       de: "Erkenntnis & Entschluss", en: "Insight & Resolution" },
  qtw_sun_s3_sub:   { ko: "말씀이 내게 주는 깨달음과 결단", de: "Erkenntnis und Entschluss aus dem Wort", en: "Insight and resolution from the Word" },
  qtw_sun_s3_hint:  { ko: "말씀을 통해 깨달은 것, 그리고 삶으로 살아낼 결단을 적어요.", de: "Was Sie erkannt haben und wie Sie es leben wollen.", en: "What you realized and how you'll live it out." },
  qtw_sun_s4_title: { ko: "올려드리는 기도",     de: "Abschlussgebet", en: "Closing Prayer" },
  qtw_sun_s4_sub:   { ko: "예배의 마무리 기도",   de: "Abschlussgebet des Gottesdienstes", en: "Closing prayer of worship" },
  qtw_sun_s4_ph:    { ko: "오늘 받은 은혜와 결단을 하나님께 올려드려요...", de: "Die empfangene Gnade und den Entschluss vor Gott bringen...", en: "Bring today's grace and resolution before God..." },
  qtw_sun_s4_hint:  { ko: "받은 말씀과 결단을 하나님께 올려드려요.", de: "Das Wort und den Entschluss Gott darbringen.", en: "Offer the Word and resolution to God." },

  // 말씀 선택
  qtw_find_passage:        { ko: "오늘의 말씀 찾기",              de: "Heutigen Abschnitt suchen", en: "Find today's passage" },
  qtw_find_passage_opt:    { ko: "오늘의 말씀 찾기 (선택)",        de: "Heutigen Abschnitt suchen (optional)", en: "Find today's passage (optional)" },
  qtw_today:               { ko: "오늘",                         de: "Heute", en: "Today" },
  qtw_cross_chapter:       { ko: "장이 넘어가는 말씀 (예: 9장 25절~10장 6절)", de: "Kapitel-übergreifend (z. B. 9,25 – 10,6)", en: "Cross-chapter (e.g. 9:25 – 10:6)" },
  qtw_err_verse_range:     { ko: "끝 절이 시작 절보다 작아요",       de: "Endvers ist kleiner als Startvers", en: "End verse is smaller than start verse" },
  qtw_err_load_passage:    { ko: "본문을 불러오지 못했어요.",       de: "Abschnitt konnte nicht geladen werden.", en: "Could not load the passage." },

  // 저장 / 임시저장
  qtw_draft_saved:         { ko: "임시저장됐어요! 나중에 이어쓸 수 있어요 😊", de: "Als Entwurf gespeichert! Sie können später weitermachen 😊", en: "Saved as draft! Continue later 😊" },
  qtw_draft_failed:        { ko: "임시저장에 실패했어요. 다시 시도해주세요.", de: "Entwurf konnte nicht gespeichert werden. Bitte erneut versuchen.", en: "Draft save failed. Please try again." },
  qtw_save_failed:         { ko: "저장에 실패했어요. 다시 시도해주세요.", de: "Speichern fehlgeschlagen. Bitte erneut versuchen.", en: "Save failed. Please try again." },

  // 자유형식 placeholder
  qtw_free_ph:             { ko: "오늘 읽은 말씀, 느낀 점, 깨달음을 자유롭게 적어보세요...", de: "Schreiben Sie frei über das Wort, Ihre Gedanken und Erkenntnisse...", en: "Write freely about the Word, your thoughts and insights..." },

  // 주일예배 입력 placeholder
  qtw_sermon_title_ph:     { ko: "예: 두려워하지 말라",           de: "z. B. Fürchte dich nicht", en: "e.g. Do not be afraid" },
  qtw_sermon_ref_ph:       { ko: "예: 이사야 41:10 / 요한복음 3:16", de: "z. B. Jesaja 41,10 / Johannes 3,16", en: "e.g. Isaiah 41:10 / John 3:16" },
  qtw_meditation_ph_sun:   { ko: "개인적이고 솔직하게 써보세요...", de: "Persönlich und ehrlich schreiben...", en: "Write personally and honestly..." },
  qtw_app_ph_short:        { ko: "이 말씀 앞에서 어떤 마음을 품기로 결심했나요?", de: "Welche Haltung nehmen Sie vor diesem Wort ein?", en: "What attitude will you take before this Word?" },

  // 주일 단계 라벨들 & 필드
  qtw_sermon_title_label:  { ko: "설교 제목",         de: "Predigttitel", en: "Sermon title" },
  qtw_sermon_ref_label:    { ko: "본문 말씀",         de: "Bibelstelle", en: "Bible passage" },

  // 6단계 본문 요약 입력
  qtw_summary_ph:          { ko: "본문 내용을 자신의 말로 요약해보세요...", de: "Fassen Sie den Text in eigenen Worten zusammen...", en: "Summarize the text in your own words..." },
  qtw_keyverse_ph:         { ko: "마음에 와닿은 구절을 적거나 위에서 선택하세요...", de: "Schreiben Sie den berührenden Vers oder wählen Sie oben...", en: "Write the touching verse or select above..." },
  qtw_application_ph:      { ko: "이 말씀 앞에서 어떤 마음을 품기로 결심했나요?", de: "Welche Haltung nehmen Sie vor diesem Wort ein?", en: "What attitude will you take before this Word?" },

  // 단계 라벨
  qtw_step_label:          { ko: "단계",              de: "Schritt", en: "Step" },
  qtw_character_label:     { ko: "성품",              de: "Charakter", en: "Character" },
  qtw_action_label:        { ko: "행동",              de: "Handlung", en: "Action" },

  // 저장 버튼
  qtw_save_btn:            { ko: "저장하기",          de: "Speichern", en: "Save" },
  qtw_saving:              { ko: "저장 중...",        de: "Wird gespeichert...", en: "Saving..." },
  qtw_save_draft:          { ko: "임시저장",          de: "Als Entwurf", en: "Save as draft" },
  qtw_next_step:           { ko: "다음 단계 →",       de: "Nächster Schritt →", en: "Next step →" },
  qtw_prev_step:           { ko: "← 이전",            de: "← Zurück", en: "← Back" },

  // 주일예배 UI에 있는 기타 요소들 (section label / badge label 등)
  qtw_character_section:   { ko: "성품 (Be) — 마음의 결심", de: "Charakter — Haltung des Herzens", en: "Character — Heart's attitude" },
  qtw_action_section:      { ko: "행동 (Do) — 손과 발",    de: "Handlung — Hände und Füße", en: "Action — Hands and feet" },
  qtw_char_ph:             { ko: "어떤 마음가짐을 가질까요?", de: "Welche Haltung nehmen Sie ein?", en: "What attitude will you take?" },
  qtw_add_action:          { ko: "+ 행동 추가",        de: "+ Handlung hinzufügen", en: "+ Add action" },
  qtw_action_ph:           { ko: "예: 하루 한 번 말씀 묵상", de: "z. B. Einmal am Tag meditieren", en: "e.g. Meditate once a day" },
  qtw_verse_select_hint:   { ko: "마음에 와닿은 구절을 탭하거나 아래에 직접 적으세요", de: "Tippen Sie einen berührenden Vers an oder schreiben Sie unten", en: "Tippen Sie einen berührenden Vers an oder schreiben Sie unten" },
  qtw_passage_loaded:      { ko: "본문이 준비됐어요",    de: "Abschnitt bereit", en: "Passage ready" },

  // 번역본 라벨
  qtw_translation_label:   { ko: "번역본",            de: "Übersetzung", en: "Translation" },
  qtw_change_translation:  { ko: "번역본 변경",        de: "Übersetzung ändern", en: "Change translation" },

  // 요일 (짧은 형태)
  qtw_wd_0: { ko: "일", de: "So", en: "Sun" },
  qtw_wd_1: { ko: "월", de: "Mo", en: "Mon" },
  qtw_wd_2: { ko: "화", de: "Di", en: "Tue" },
  qtw_wd_3: { ko: "수", de: "Mi", en: "Wed" },
  qtw_wd_4: { ko: "목", de: "Do", en: "Thu" },
  qtw_wd_5: { ko: "금", de: "Fr", en: "Fri" },
  qtw_wd_6: { ko: "토", de: "Sa", en: "Sat" },
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
