import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE, normalizeUsername } from "../../../http/session";

/**
 * Stores the submitted username in an httpOnly cookie and redirects to /home.
 * There is no password — the username alone selects which data you see. An empty
 * username bounces back to /login with an error flag.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const username = normalizeUsername(String(form.get("username") ?? ""));

  if (!username) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/home", request.url), 303);
  response.cookies.set(USER_COOKIE, username, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return response;
}
