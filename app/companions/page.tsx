"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CompanionsContent } from "@/components/CompanionWorkspacePanel";

export default function CompanionsPage() {
  return (
    <Suspense
      fallback={
        <main
          className="page-wrap roots-companions-phase2f roots-native-companions-loader"
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loader2
            className="spin"
            size={22}
            style={{ color: "var(--companions-sage-text)" }}
          />
        </main>
      }
    >
      <CompanionsContent />
    </Suspense>
  );
}
