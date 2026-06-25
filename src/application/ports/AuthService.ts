/**
 * Port: current-caller identity.
 *
 * The application asks "who is calling?" through this abstraction without
 * knowing how sessions are stored or which provider verifies them. The
 * implementation lives in infrastructure and is wired via the composition root.
 *
 * Sign-in / sign-out are OAuth redirect flows owned by the auth framework
 * (Auth.js) and are therefore not part of this port.
 */

export interface AuthUser {
  id: string;
  email: string | null;
  /** Display name from the identity provider (e.g. Google), if available. */
  name: string | null;
  /** Avatar URL from the identity provider (e.g. Google), if available. */
  image: string | null;
}

export interface AuthService {
  /** The authenticated user for the current request, or null if none. */
  getCurrentUser(): Promise<AuthUser | null>;
  /** Convenience accessor for just the authenticated user id, or null. */
  getCurrentUserId(): Promise<string | null>;
}
