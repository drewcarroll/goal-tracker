import { redirect } from "next/navigation";

/**
 * The battle-pass calendar now lives inside the Shop tab (consolidated
 * 2026-07-18, user feedback) — this redirect keeps any existing
 * bookmarks/links working.
 */
export default function TrinketsPage() {
  redirect("/shop");
}
