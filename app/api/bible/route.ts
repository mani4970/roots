import { NextRequest, NextResponse } from "next/server";

// ibibles.net 버전 코드
const VERSION_MAP: Record<string, string> = {
  "개역한글": "kor",
  "개역개정": "kor_rev",
  "쉬운성경": "kor_easy",
  "KJV": "eng",
  "NIV": "eng_niv",
};

// 성경 책 코드 (ibibles.net 영어 약어)
const BOOK_MAP: Record<string, string> = {
  "창세기": "gen", "출애굽기": "exo", "레위기": "lev", "민수기": "num",
  "신명기": "deu", "여호수아": "jos", "사사기": "jdg", "룻기": "rut",
  "사무엘상": "1sa", "사무엘하": "2sa", "열왕기상": "1ki", "열왕기하": "2ki",
  "역대상": "1ch", "역대하": "2ch", "에스라": "ezr", "느헤미야": "neh",
  "에스더": "est", "욥기": "job", "시편": "psa", "잠언": "pro",
  "전도서": "ecc", "아가": "sng", "이사야": "isa", "예레미야": "jer",
  "예레미야애가": "lam", "에스겔": "eze", "다니엘": "dan", "호세아": "hos",
  "요엘": "joe", "아모스": "amo", "오바댜": "oba", "요나": "jon",
  "미가": "mic", "나훔": "nah", "하박국": "hab", "스바냐": "zep",
  "학개": "hag", "스가랴": "zec", "말라기": "mal",
  "마태복음": "mat", "마가복음": "mar", "누가복음": "luk", "요한복음": "joh",
  "사도행전": "act", "로마서": "rom", "고린도전서": "1co", "고린도후서": "2co",
  "갈라디아서": "gal", "에베소서": "eph", "빌립보서": "phi", "골로새서": "col",
  "데살로니가전서": "1th", "데살로니가후서": "2th", "디모데전서": "1ti",
  "디모데후서": "2ti", "디도서": "tit", "빌레몬서": "phile", "히브리서": "heb",
  "야고보서": "jam", "베드로전서": "1pe", "베드로후서": "2pe",
  "요한일서": "1jo", "요한이서": "2jo", "요한삼서": "3jo", "유다서": "jud",
  "요한계시록": "rev",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version") ?? "개역한글";
  const book = searchParams.get("book") ?? "요한복음";
  const chapter = searchParams.get("chapter") ?? "3";
  const startVerse = searchParams.get("startVerse") ?? "16";
  const endVerse = searchParams.get("endVerse") ?? startVerse;

  const vCode = VERSION_MAP[version] ?? "kor";
  const bCode = BOOK_MAP[book] ?? "joh";

  // ibibles.net URL 형식: quote.php?kor-joh/3:16-3:18
  const url = `https://ibibles.net/quote.php?${vCode}-${bCode}/${chapter}:${startVerse}-${chapter}:${endVerse}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Roots Bible App)" },
      next: { revalidate: 86400 }, // 하루 캐시
    });

    if (!res.ok) {
      return NextResponse.json({ error: "성경 서버 연결 실패" }, { status: 502 });
    }

    const html = await res.text();

    // HTML에서 텍스트 추출
    // ibibles.net은 <small>절번호</small> 텍스트 형식
    let text = html
      .replace(/<small[^>]*>.*?<\/small>/gi, "") // 절 번호 제거
      .replace(/<br\s*\/?>/gi, "\n") // br을 줄바꿈으로
      .replace(/<[^>]+>/g, "") // 나머지 태그 제거
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();

    // 빈 줄 정리
    text = text.split("\n").map(l => l.trim()).filter(l => l.length > 0).join("\n");

    if (!text || text.includes("Bad Request") || text.includes("Host not allowed")) {
      return NextResponse.json({ error: "본문을 불러올 수 없어요. 개역한글 버전을 사용해보세요." }, { status: 404 });
    }

    const reference = `${book} ${chapter}:${startVerse}${endVerse !== startVerse ? `-${endVerse}` : ""}`;
    return NextResponse.json({ text, reference, version });

  } catch (e) {
    return NextResponse.json({ error: "네트워크 오류가 발생했어요" }, { status: 500 });
  }
}
