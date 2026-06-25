"use server";

import { getContainer } from "@/infrastructure/container";
import type { SignInResult, SignUpResult } from "@/application/ports/AuthService";

/**
 * Server Actions for authentication.
 *
 * Running on the server lets the auth provider set the session cookies on the
 * response, and keeps the provider SDK out of the client bundle. Client
 * components call these and then navigate; the middleware picks up the new
 * session on the next request.
 */

export async function signInAction(email: string, password: string): Promise<SignInResult> {
  const { authService } = getContainer();
  return authService.signInWithPassword(email, password);
}

export async function signUpAction(email: string, password: string): Promise<SignUpResult> {
  const { authService } = getContainer();
  return authService.signUp(email, password);
}

export async function signOutAction(): Promise<void> {
  const { authService } = getContainer();
  await authService.signOut();
}
