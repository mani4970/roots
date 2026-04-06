import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roots — 영적 루틴 앱",
  description: "말씀에 뿌리내리고, 함께 자라다",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
