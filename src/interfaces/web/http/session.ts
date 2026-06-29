/**
 * Username session helper (single-field "log in").
 *
 * This app has no passwords and no accounts table. A visitor types a username,
 * and that username is stored in an httpOnly cookie. Every goal/log is scoped to
 * a `user_id` derived deterministically from the username (see currentUser.ts),
 * so the same username always maps to the same data.
 *
 * This module is intentionally pure and edge-safe (no Node APIs, no next/headers)
 * so the middleware can import it. The username -> id derivation lives in the
 * Node-only currentUser.ts.
 */

/** Name of the cookie holding the active username. */
export const USER_COOKIE = "gt_user";

/** Canonical form of a username: trimmed and lowercased. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}
