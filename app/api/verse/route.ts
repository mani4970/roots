import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 감정별 관련 성경 영역 힌트 (더 정확한 말씀 선택 유도)
const EMOTION_HINTS: Record<string, string> = {
  tired: "시편 23편, 마태복음 11:28-30, 이사야 40:31",
  anxious: "빌립보서 4:6-7, 시편 56:3, 마태복음 6:25-34",
  lonely: "시편 139편, 히브리서 13:5, 요한복음 14:18",
  sad: "시편 34:18, 고린도후서 1:3-4, 요한복음 11:35",
  angry: "에베소서 4:26, 야고보서 1:19-20, 잠언 15:1",
  exhausted: "이사야 40:28-31, 시편 62:1, 마태복음 11:28",
  grateful: "시편 100편, 데살로니가전서 5:16-18, 골로새서 3:17",
  joyful: "빌립보서 4:4, 시편 16:11, 느헤미야 8:10",
  peaceful: "요한복음 14:27, 빌립보서 4:7, 이사야 26:3",
  grace: "에베소서 2:8-9, 로마서 8:38-39, 시편 103:1-5",
  repent: "요한일서 1:9, 시편 51편, 이사야 1:18",
  doubt: "마가복음 9:24, 야고보서 1:5-6, 히브리서 11:1",
  dry: "이사야 44:3, 요한복음 7:37-38, 시편 42편",
  hungry: "마태복음 5:6, 시편 119:103, 요한복음 6:35",
  mission: "마태복음 28:19-20, 에베소서 2:10, 예레미야 29:11",
  family: "여호수아 24:15, 골로새서 3:18-21, 시편 127편",
  work: "골로새서 3:23-24, 잠언 16:3, 데살로니가전서 4:11",
  relation: "에베소서 4:32, 골로새서 3:13, 마태복음 5:44",
  health: "시편 103:1-5, 야고보서 5:14-15, 고린도전서 6:19-20",
  money: "빌립보서 4:19, 마태복음 6:33, 잠언 3:9-10",
  future: "예레미야 29:11, 시편 37:4-5, 잠언 3:5-6",
  sick: "시편 41:3, 야고보서 5:14-15, 이사야 41:10",
};

export async function POST(req: NextRequest) {
  try {
    const { emotions } = await req.json();

    const hints = emotions
      .map((e: string) => EMOTION_HINTS[e])
      .filter(Boolean)
      .join(", ");

    const prompt = `당신은 크리스천의 신앙 성장을 돕는 영적 가이드입니다.

사용자의 오늘 감정 상태: ${emotions.join(", ")}
관련 성경 본문 참고: ${hints || "시편, 잠언, 복음서"}

다음 지침을 반드시 따르세요:

1. **말씀 선택**: 감정에 정확히 공명하는 성경 구절 1개. 위로이든 도전이든 오늘 이 감정에 살아있는 말씀이어야 합니다. 개역개정 기준으로 정확하게 인용하세요.

2. **말씀 해설(message)**: 이 말씀이 오늘 이 감정을 가진 사람에게 구체적으로 무슨 의미인지 2-3문장. 따뜻하되 피상적이지 않게.

3. **오늘의 결단(mission)**: 반드시 오늘 하루 실제로 손발로 할 수 있는 구체적인 행동 1가지.
   - ❌ 나쁜 예: "하나님을 신뢰해보세요", "감사한 마음을 가지세요", "기도하세요" (너무 추상적)
   - ✅ 좋은 예: "오늘 점심시간에 5분, 핸드폰을 내려놓고 눈을 감고 '주님, 저 여기 있어요'라고 세 번 말해보세요"
   - ✅ 좋은 예: "오늘 퇴근길에 하나님께 감사한 일 3가지를 소리내어 말해보세요"
   - ✅ 좋은 예: "오늘 힘든 그 사람에게 문자 한 줄 보내세요: '기도하고 있어요'"
   - ✅ 좋은 예: "자기 전에 오늘 하루 있었던 일 중 하나님의 흔적을 노트에 한 줄만 적어보세요"
   언제, 어디서, 어떻게를 구체적으로 담아 1-2문장으로.

JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"verse":"말씀 내용","reference":"책명 장:절","message":"말씀 해설","mission":"오늘의 구체적 결단 행동"}`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    // 필수 필드 검증
    if (!parsed.verse || !parsed.reference || !parsed.message || !parsed.mission) {
      throw new Error("불완전한 응답");
    }

    return NextResponse.json(parsed);

  } catch (e) {
    console.error("Verse API error:", e);
    // 감정별 fallback 말씀
    return NextResponse.json({
      verse: "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라",
      reference: "마태복음 11:28",
      message: "오늘 하루 어떤 짐을 지고 있든, 주님이 함께 짊어지길 원하십니다. 혼자 다 감당하려 하지 않아도 괜찮아요.",
      mission: "오늘 저녁 잠들기 전, 핸드폰을 내려놓고 딱 2분만 눈을 감고 '주님, 오늘 하루 감사합니다. 내일도 함께해 주세요'라고 소리내어 말해보세요.",
    });
  }
}
