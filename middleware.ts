import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth gate for the whole app.
 *
 * - Redirects page requests without a session to the sign-in screen.
 * - Returns 401 for unauthenticated API requests (no HTML redirect for JSON
 *   clients).
 *
 * Auth.js uses the database session strategy, whose session token can only be
 * validated with a DB lookup — not available in the Edge middleware runtime.
 * So this is a lightweight *presence* check on the session cookie for redirect
 * UX only; the authoritative check runs server-side via `auth()` in the
 * protected layout, pages, and route handlers.
 *
 * Public paths (landing page, sign-in screen, and all Auth.js endpoints under
 * /api/auth) are reachable without a session.
 */

/** Exact paths that never require authentication. */
const PUBLIC_EXACT = new Set<string>(["/"]);
/** Path prefixes that never require authentication. */
const PUBLIC_PREFIXES = ["/sign-in", "/api/auth"];

/** Auth.js v5 database-session cookie names (insecure dev + secure prod). */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) {
    return true;
  }
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  const isApi = pathname.startsWith("/api");

  if (!hasSession && !isPublic(pathname)) {
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
  if (hasSession && pathname === "/sign-in") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/home";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next.js internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
