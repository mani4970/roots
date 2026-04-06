import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { emotions } = await req.json();
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `당신은 크리스천의 신앙 성장을 돕는 영적 가이드입니다.
사용자의 오늘 감정 상태: ${emotions.join(", ")}
위 감정에 맞는 성경 말씀 1개와 오늘의 미션을 JSON 형식으로만 답하세요. 다른 텍스트 없이 JSON만 출력하세요:
{"verse":"말씀 내용 (한국어 개역개정)","reference":"성경 책명 장:절","message":"이 말씀이 오늘 당신에게 주는 의미 (2-3문장, 따뜻한 톤)","mission":"오늘 하루 구체적으로 실천할 수 있는 미션 1가지 (1-2문장)"}`
      }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    return NextResponse.json(JSON.parse(text.replace(/```json|```/g, "").trim()));
  } catch (e) {
    return NextResponse.json({ verse: "여호와는 나의 목자시니 내게 부족함이 없으리로다", reference: "시편 23:1", message: "주님이 오늘도 당신의 목자가 되어 이끌어 주십니다.", mission: "오늘 하루 한 가지 감사한 일을 찾아 적어보세요." });
  }
}
