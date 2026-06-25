import type { AuthService, AuthUser } from "@/application/ports/AuthService";
import { auth } from "./authConfig";

/**
 * Auth.js-backed implementation of the AuthService port.
 *
 * Reads the current request's session via Auth.js `auth()` (which validates the
 * session against the database adapter) and exposes only the identity the rest
 * of the app needs. This is the single source of truth for "who is calling" —
 * identity is never taken from client-supplied input.
 */
export class NextAuthAuthService implements AuthService {
  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) {
      return null;
    }
    return {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      image: user.image ?? null,
    };
  }

  async getCurrentUserId(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?.id ?? null;
  }
}
