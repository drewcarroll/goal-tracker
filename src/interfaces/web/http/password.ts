/**
 * Shared-password gate helper.
 *
 * Pure and Edge-safe (uses the Web Crypto API, available in both the Edge
 * middleware runtime and Node route handlers). The unlock route stores
 * `sha256Hex(APP_PASSWORD)` in an httpOnly cookie; the middleware recomputes the
 * same hash from the env var and compares — so the raw password is never kept in
 * the cookie and no database is needed to validate a session.
 */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Name of the cookie holding the unlock token. */
export const AUTH_COOKIE = "gt_auth";
