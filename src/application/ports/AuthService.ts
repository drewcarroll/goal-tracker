/**
 * Port: authentication / current-caller identity.
 *
 * The application asks "who is calling?" through this abstraction without
 * knowing how sessions are stored or which provider verifies them. The
 * implementation lives in infrastructure and is wired via the composition root.
 */

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface SignInResult {
  error: string | null;
}

export interface SignUpResult {
  error: string | null;
  /** True when the account was created but a confirmation step is required. */
  needsConfirmation: boolean;
}

export interface AuthService {
  /** The authenticated user for the current request, or null if none. */
  getCurrentUser(): Promise<AuthUser | null>;
  /** Convenience accessor for just the authenticated user id, or null. */
  getCurrentUserId(): Promise<string | null>;
  signInWithPassword(email: string, password: string): Promise<SignInResult>;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signOut(): Promise<void>;
}
