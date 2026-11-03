import { redirect } from "next/navigation";

// Retired routes must not draw another verse or attempt a legacy badge award.
export default function RetiredDailyWordResultPage() {
  redirect("/");
}
