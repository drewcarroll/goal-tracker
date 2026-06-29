import { redirect } from "next/navigation";

// Force-dynamic so the redirect is issued per request (with a proper Location
// header) rather than baked into a statically cached response.
export const dynamic = "force-dynamic";

/**
 * The landing just forwards to Home. The username gate in middleware sends
 * signed-out visitors to /login first if needed.
 */
export default function RootPage() {
  redirect("/home");
}
