import { NextResponse, type NextRequest } from "next/server";
import { USER_COOKIE } from "@/interfaces/web/http/session";

/**
 * Username gate for the whole app.
 *
 * - Page requests without a username cookie are redirected to /login.
 * - API requests without it get a 401 (no HTML redirect for JSON clients).
 *
 * There is no password: /login just stores whichever username is submitted, and
 * all data is scoped to an id derived from it (see http/currentUser.ts). Public
 * paths (landing, the login screen + endpoint, and the dev-only demo) are
 * reachable without signing in.
 */

/** Exact paths that never require a username. */
const PUBLIC_EXACT = new Set<string>(["/"]);
/** Path prefixes that never require a username. */
// `/demo` is a dev-only mock-data preview (it 404s in production).
const PUBLIC_PREFIXES = ["/login", "/api/login", "/demo"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const username = request.cookies.get(USER_COOKIE)?.value ?? "";
  const signedIn = username.trim().length > 0;

  if (!signedIn) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in first." } },
        { status: 401 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next.js internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
