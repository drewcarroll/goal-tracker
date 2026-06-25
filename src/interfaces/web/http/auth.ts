import { NextResponse } from "next/server";

/**
 * Standard 401 response for API routes hit without a valid session.
 *
 * The middleware already blocks unauthenticated requests, but route handlers
 * re-check the session and use this as defence-in-depth so identity is always
 * verified at the point data is accessed.
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
    { status: 401 },
  );
}
