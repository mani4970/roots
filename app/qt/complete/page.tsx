"use client";

import { useRouter } from "next/navigation";
import QTCompletionScreen from "@/components/QTCompletionScreen";
import { useLang } from "@/lib/useLang";

export default function QTCompletePage() {
  const router = useRouter();
  const lang = useLang();

  return <QTCompletionScreen lang={lang} onConfirm={() => router.replace("/")} />;
}
