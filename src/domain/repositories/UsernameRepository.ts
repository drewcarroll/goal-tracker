import { Username } from "../value-objects/Username";

/**
 * The username registry — the only record anywhere of which usernames have
 * ever logged in, and the only way to go from a userId back to a display
 * name. See Username.ts and docs/plan.md Phase 11 for why this exists: this
 * app derives userId as a one-way hash of the username, so without a
 * registry there is no way to validate a friend-request target exists or
 * to display anyone's name but your own.
 */
export interface UsernameRepository {
  /** Upsert — called once per login. A username always maps to one userId. */
  register(userId: string, username: Username): Promise<void>;
  findUserIdByUsername(username: Username): Promise<string | null>;
  findUsernameByUserId(userId: string): Promise<Username | null>;
  findUsernamesByUserIds(userIds: readonly string[]): Promise<Map<string, Username>>;
}
