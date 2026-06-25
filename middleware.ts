import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, sha256Hex } from "@/interfaces/web/http/password";

/**
 * Shared-password gate for the whole app (single-user).
 *
 * - Page requests without a valid unlock cookie are redirected to /unlock.
 * - API requests without it get a 401 (no HTML redirect for JSON clients).
 *
 * The cookie holds sha256(APP_PASSWORD), set by /api/unlock. Here we recompute
 * that hash from the env var and compare — no database, no accounts. Public
 * paths (landing, the unlock screen + endpoint, and the dev-only demo) are
 * reachable without unlocking.
 */

/** Exact paths that never require the password. */
const PUBLIC_EXACT = new Set<string>(["/"]);
/** Path prefixes that never require the password. */
// `/demo` is a dev-only mock-data preview (it 404s in production).
const PUBLIC_PREFIXES = ["/unlock", "/api/unlock", "/demo"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const password = process.env.APP_PASSWORD ?? "";
  const expected = password ? await sha256Hex(password) : "";
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const unlocked = expected !== "" && token === expected;

  if (!unlocked) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Locked. Unlock the app first." } },
        { status: 401 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/unlock";
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
