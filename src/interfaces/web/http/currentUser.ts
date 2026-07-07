import { cookies } from "next/headers";
import { createHash } from "crypto";
import { USER_COOKIE, TIMEZONE_COOKIE, DEFAULT_TIMEZONE, normalizeUsername } from "./session";

/**
 * Resolves the active user for the current request (server-only).
 *
 * The middleware guarantees a username cookie is present on every gated route,
 * so pages, server actions and route handlers call `currentUserId()` to get the
 * id every goal/log is scoped to — the same role `OWNER_ID` played when the app
 * was single-user.
 */

/**
 * Maps a username to a stable UUID. The DB stores `user_id` as a uuid, so we
 * hash the (normalized) username and format the first 128 bits as a UUID. The
 * mapping is deterministic: a username always resolves to the same id, which is
 * what links a person to their data — no accounts table required.
 */
export function usernameToUserId(username: string): string {
  const norm = normalizeUsername(username);
  const hex = createHash("sha256").update(`goal-tracker:user:${norm}`).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/** The id every use case scopes to, derived from the signed-in username. */
export function currentUserId(): string {
  const username = cookies().get(USER_COOKIE)?.value;
  if (!username) {
    // The username gate (middleware) should redirect before any gated code runs.
    throw new Error("No active user session.");
  }
  return usernameToUserId(username);
}

/**
 * The signed-in user's IANA timezone, captured client-side at login (see
 * TIMEZONE_COOKIE). Falls back to UTC for sessions predating this feature or
 * where JS was disabled at login — better a wrong-but-valid timezone than a
 * thrown error on every request.
 */
export function currentTimezone(): string {
  return cookies().get(TIMEZONE_COOKIE)?.value || DEFAULT_TIMEZONE;
}
