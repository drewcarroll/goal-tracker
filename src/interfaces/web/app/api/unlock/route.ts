import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/infrastructure/container";
import { AUTH_COOKIE, sha256Hex } from "../../../http/password";

/**
 * Verifies the shared password (from the /unlock form). On success, sets an
 * httpOnly cookie holding sha256(password) and redirects to /home; on failure,
 * redirects back to /unlock with an error flag. No accounts, no database.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { appPassword } = getContainer();
  const form = await request.formData();
  const submitted = String(form.get("password") ?? "");

  if (!appPassword || submitted !== appPassword) {
    return NextResponse.redirect(new URL("/unlock?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/home", request.url), 303);
  response.cookies.set(AUTH_COOKIE, await sha256Hex(appPassword), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return response;
}
