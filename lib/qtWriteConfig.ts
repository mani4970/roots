// ─── 6단계 정의 ───
// 진행바: 6칸 (본문요약+붙잡은말씀은 2칸 동시 활성)
// 실제 화면: 5개 (0:들어가는기도 1:본문요약+붙잡은말씀 2:느낌과묵상 3:적용과결단 4:올려드리는기도)
export const STEPS_6 = [
  { barIdx: [0],    title: "들어가는 기도",      subtitle: "말씀 앞에 나아가기 전 기도",  placeholder: "주님, 오늘 말씀 앞에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", hint: "짧아도 괜찮아요. 마음을 열고 주님께 나아가는 기도예요.", id: "opening_prayer" },
  { barIdx: [1, 2], title: "본문 요약 & 붙잡은 말씀", subtitle: "본문을 읽고 마음에 새겨요", placeholder: "", hint: "", id: "passage_step", isPassageStep: true },
  { barIdx: [3],    title: "느낌과 묵상",         subtitle: "이 말씀이 내게 주는 의미",     placeholder: "이 말씀이 오늘 내 삶에 무슨 말씀인가요?\n솔직하게 느낀 것을 써보세요.", hint: "정답이 없어요. 성령님의 이끄심에 맡겨봐요.", id: "meditation" },
  { barIdx: [4],    title: "적용과 결단",          subtitle: "오늘 하루 어떻게 살 건가요?", placeholder: "", hint: "성품은 마음을 정하는 것, 행동은 손과 발로 드러나는 것이에요.", id: "application", isDecision: true },
  { barIdx: [5],    title: "올려드리는 기도",       subtitle: "말씀으로 드리는 기도",         placeholder: "말씀을 붙들고 기도를 올려드려요...", hint: "말씀과 결단을 간결하게 다시 하나님께 올려드려요.", id: "closing_prayer", isLast: true },
];

export const BAR_LABELS_6 = ["들어가는 기도", "본문 요약", "붙잡은 말씀", "느낌과 묵상", "적용과 결단", "올려드리는 기도"];

// ─── 주일예배 단계 (개편) ───
// 0: 설교 정보 + 말씀 선택
// 1: 들어가는 기도
// 2: 말씀 요약
// 3: 깨달음과 결단 (깨달음 + 성품 + 행동들)
// 4: 올려드리는 기도
export const STEPS_SUNDAY = [
  { id: "sermon_info", title: "설교 정보", subtitle: "설교 제목과 본문 말씀을 적어요", isSermonInfo: true },
  { id: "opening_prayer", title: "들어가는 기도", subtitle: "예배 전 마음을 준비해요", placeholder: "주님, 오늘 예배에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", hint: "예배 전 마음을 열고 주님께 나아가는 기도예요." },
  { id: "summary", title: "말씀 요약", subtitle: "설교 말씀을 요약해요", placeholder: "오늘 설교 핵심 내용을 요약해보세요", hint: "목사님이 전한 핵심 메시지를 정리해요" },
  { id: "meditation", title: "깨달음과 결단", subtitle: "말씀이 내게 주는 깨달음과 결단", placeholder: "", hint: "말씀을 통해 깨달은 것, 그리고 삶으로 살아낼 결단을 적어요.", isDecision: true },
  { id: "closing_prayer", title: "올려드리는 기도", subtitle: "예배의 마무리 기도", placeholder: "오늘 받은 은혜와 결단을 하나님께 올려드려요...", hint: "받은 말씀과 결단을 하나님께 올려드려요.", isLast: true },
];
