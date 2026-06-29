import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE } from "../../../http/session";

/**
 * Clears the username cookie and returns to /login, so a different person (or
 * the same person under a different username) can sign in. "Switch user".
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(USER_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
