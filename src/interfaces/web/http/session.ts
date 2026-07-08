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

/**
 * Name of the cookie holding the signed-in user's IANA timezone (e.g.
 * "America/Los_Angeles"), captured client-side at login. Goal day
 * boundaries are always this timezone's local day, never server UTC.
 */
export const TIMEZONE_COOKIE = "gt_tz";

/** Fallback when no timezone cookie is present (JS-disabled login, or a
 * session predating this feature). */
export const DEFAULT_TIMEZONE = "UTC";

/** Canonical form of a username: trimmed and lowercased. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Whether `tz` is a timezone the Intl API recognizes (e.g. "Europe/Paris"). */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
