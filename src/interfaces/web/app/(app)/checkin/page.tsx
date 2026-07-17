import { redirect } from "next/navigation";

/**
 * The nightly log now lives directly on Home (Today's Goals + Finish Day),
 * not a separate route — see DailyFlow.tsx. This redirect keeps any
 * existing bookmarks/links working.
 */
export default function CheckInPage() {
  redirect("/home");
}
