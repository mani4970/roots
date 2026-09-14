"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import PrayerExperience from "@/components/PrayerExperience";

export default function PrayerPage() {
  return (
    <Suspense fallback={<div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>}>
      <PrayerExperience />
    </Suspense>
  );
}
