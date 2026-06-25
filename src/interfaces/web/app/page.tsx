import { redirect } from "next/navigation";

/**
 * The app is single-user; the landing just forwards to Home. The password gate
 * in middleware sends unauthenticated visitors to /unlock first if needed.
 */
export default function RootPage() {
  redirect("/home");
}
