import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://bible.asher.design/api/v1/translations.php", {
      next: { revalidate: 86400 * 30 }, // 30일 캐시
    });
    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    // API 실패 시 기본 번역본 목록 반환
    return NextResponse.json({
      ok: true,
      data: [
        { id: 92, name: "개역개정", language: "ko" },
        { id: 1, name: "개역한글", language: "ko" },
      ]
    });
  }
}
