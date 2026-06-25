import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/infrastructure/auth/updateSession";

/**
 * Auth gate for the whole app.
 *
 * - Refreshes the Supabase session on every request (keeps tokens fresh).
 * - Redirects unauthenticated page requests to the sign-in screen.
 * - Returns 401 for unauthenticated API requests (no HTML redirect for JSON
 *   clients).
 *
 * Public paths (the landing page, the sign-in screen, and Supabase auth
 * callbacks) are reachable without a session; everything else requires one.
 */

/** Exact paths that never require authentication. */
const PUBLIC_EXACT = new Set<string>(["/"]);
/** Path prefixes that never require authentication. */
const PUBLIC_PREFIXES = ["/sign-in", "/auth"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) {
    return true;
  }
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api");

  if (!user && !isPublic(pathname)) {
    if (isApi) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
        { status: 401 },
      );
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Already signed in but heading to the sign-in screen → send to the app.
  if (user && pathname === "/sign-in") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/home";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  // Run on everything except Next.js internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
