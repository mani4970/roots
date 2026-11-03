import { redirect } from "next/navigation";

// Keep old bookmarks and installed-client links safe after retiring Today's Word.
export default function RetiredDailyWordPage() {
  redirect("/");
}
