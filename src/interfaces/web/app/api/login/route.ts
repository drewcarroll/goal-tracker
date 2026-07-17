import { NextRequest, NextResponse } from "next/server";
import {
  USER_COOKIE,
  TIMEZONE_COOKIE,
  DEFAULT_TIMEZONE,
  normalizeUsername,
  isValidTimezone,
} from "../../../http/session";
import { usernameToUserId } from "../../../http/currentUser";
import { getContainer } from "@/infrastructure/container";

/**
 * Stores the submitted username in an httpOnly cookie and redirects to /home.
 * There is no password — the username alone selects which data you see. An empty
 * username bounces back to /login with an error flag.
 *
 * Also captures the browser's IANA timezone (sent via a hidden field the login
 * page's inline script fills in — see login/page.tsx) so goal day boundaries
 * can use the user's local day instead of server UTC. Falls back to UTC if
 * absent or unrecognized (e.g. JS disabled).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const username = normalizeUsername(String(form.get("username") ?? ""));

  if (!username) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const submittedTimezone = String(form.get("timezone") ?? "");
  const timezone = isValidTimezone(submittedTimezone) ? submittedTimezone : DEFAULT_TIMEZONE;

  const response = NextResponse.redirect(new URL("/home", request.url), 303);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  };
  response.cookies.set(USER_COOKIE, username, cookieOptions);
  response.cookies.set(TIMEZONE_COOKIE, timezone, cookieOptions);

  // Best-effort: a registry failure should never block login itself (the
  // app worked without one before this feature existed). A user who isn't
  // registered just won't be findable by a friend request yet — they'll be
  // registered on their next login attempt.
  try {
    await getContainer().registerUsernameUseCase.execute({
      userId: usernameToUserId(username),
      username,
    });
  } catch {
    // Swallowed deliberately — see comment above.
  }

  return response;
}
