import { NextRequest, NextResponse } from "next/server";

// 책 이름 → 책 번호 (bible.asher.design API 기준)
const BOOK_MAP: Record<string, number> = {
  "창세기": 1, "출애굽기": 2, "레위기": 3, "민수기": 4, "신명기": 5,
  "여호수아": 6, "사사기": 7, "룻기": 8, "사무엘상": 9, "사무엘하": 10,
  "열왕기상": 11, "열왕기하": 12, "역대상": 13, "역대하": 14, "에스라": 15,
  "느헤미야": 16, "에스더": 17, "욥기": 18, "시편": 19, "잠언": 20,
  "전도서": 21, "아가": 22, "이사야": 23, "예레미야": 24, "예레미야애가": 25,
  "에스겔": 26, "다니엘": 27, "호세아": 28, "요엘": 29, "아모스": 30,
  "오바댜": 31, "요나": 32, "미가": 33, "나훔": 34, "하박국": 35,
  "스바냐": 36, "학개": 37, "스가랴": 38, "말라기": 39,
  "마태복음": 40, "마가복음": 41, "누가복음": 42, "요한복음": 43,
  "사도행전": 44, "로마서": 45, "고린도전서": 46, "고린도후서": 47,
  "갈라디아서": 48, "에베소서": 49, "빌립보서": 50, "골로새서": 51,
  "데살로니가전서": 52, "데살로니가후서": 53, "디모데전서": 54, "디모데후서": 55,
  "디도서": 56, "빌레몬서": 57, "히브리서": 58, "야고보서": 59,
  "베드로전서": 60, "베드로후서": 61, "요한일서": 62, "요한이서": 63,
  "요한삼서": 64, "유다서": 65, "요한계시록": 66,
};

// 책 번호 약어 (reference 표시용)
const BOOK_SHORT: Record<string, string> = {
  "창세기": "창", "출애굽기": "출", "레위기": "레", "민수기": "민", "신명기": "신",
  "여호수아": "수", "사사기": "삿", "룻기": "룻", "사무엘상": "삼상", "사무엘하": "삼하",
  "열왕기상": "왕상", "열왕기하": "왕하", "역대상": "대상", "역대하": "대하", "에스라": "스",
  "느헤미야": "느", "에스더": "에", "욥기": "욥", "시편": "시", "잠언": "잠",
  "전도서": "전", "아가": "아", "이사야": "사", "예레미야": "렘", "예레미야애가": "애",
  "에스겔": "겔", "다니엘": "단", "호세아": "호", "요엘": "욜", "아모스": "암",
  "오바댜": "옵", "요나": "욘", "미가": "미", "나훔": "나", "하박국": "합",
  "스바냐": "습", "학개": "학", "스가랴": "슥", "말라기": "말",
  "마태복음": "마", "마가복음": "막", "누가복음": "눅", "요한복음": "요",
  "사도행전": "행", "로마서": "롬", "고린도전서": "고전", "고린도후서": "고후",
  "갈라디아서": "갈", "에베소서": "엡", "빌립보서": "빌", "골로새서": "골",
  "데살로니가전서": "살전", "데살로니가후서": "살후", "디모데전서": "딤전", "디모데후서": "딤후",
  "디도서": "딛", "빌레몬서": "몬", "히브리서": "히", "야고보서": "약",
  "베드로전서": "벧전", "베드로후서": "벧후", "요한일서": "요일", "요한이서": "요이",
  "요한삼서": "요삼", "유다서": "유", "요한계시록": "계",
};

const API_BASE = "https://bible.asher.design/api/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const book = searchParams.get("book") ?? "요한복음";
  const chapter = searchParams.get("chapter") ?? "3";
  const startVerse = parseInt(searchParams.get("startVerse") ?? "16");
  const endVerse = parseInt(searchParams.get("endVerse") ?? String(startVerse));
  const translationId = searchParams.get("translation") ?? "92"; // 기본: 개역개정

  const bookNum = BOOK_MAP[book];
  if (!bookNum) {
    return NextResponse.json({ error: `책 이름을 찾을 수 없어요: ${book}` }, { status: 400 });
  }

  try {
    let url = `${API_BASE}/verse.php?translation=${translationId}&book=${bookNum}&chapter=${chapter}&verse=${startVerse}`;
    if (endVerse > startVerse) url += `&verse_to=${endVerse}`;

    const res = await fetch(url, { next: { revalidate: 86400 } });
    const json = await res.json();

    if (!json.ok || !json.data?.gospel) {
      return NextResponse.json({ error: "본문을 불러올 수 없어요." }, { status: 404 });
    }

    const verses = json.data.gospel.map((v: any) => ({
      num: v.verse,
      text: v.text,
    }));

    const short = BOOK_SHORT[book] ?? book;
    const reference = endVerse > startVerse
      ? `${short} ${chapter}:${startVerse}-${endVerse}`
      : `${short} ${chapter}:${startVerse}`;

    const fullText = verses.map((v: any) => `${v.num} ${v.text}`).join("\n");

    return NextResponse.json({ text: fullText, verses, reference, version: translationId });

  } catch (e) {
    return NextResponse.json({ error: "네트워크 오류가 발생했어요" }, { status: 500 });
  }
}
