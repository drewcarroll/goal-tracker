import type {
  AuthService,
  AuthUser,
  SignInResult,
  SignUpResult,
} from "@/application/ports/AuthService";
import { createSupabaseServerClient } from "./supabaseServerClient";

/**
 * Supabase-backed implementation of the AuthService port.
 *
 * Identity is read from the request's verified session via a cookie-bound
 * client (anon key, NOT the service-role key) so the SDK acts on behalf of the
 * signed-in user. Each method binds to the current request's cookies lazily,
 * which lets a single instance live in the (singleton) composition root while
 * still being request-scoped at call time.
 */
export class SupabaseAuthService implements AuthService {
  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = await createSupabaseServerClient();
    // getUser() revalidates the token with the Auth server (vs. getSession()).
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }
    return { id: user.id, email: user.email ?? null };
  }

  async getCurrentUserId(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?.id ?? null;
  }

  async signInWithPassword(email: string, password: string): Promise<SignInResult> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: error.message, needsConfirmation: false };
    }
    // When email confirmation is enabled, signUp returns no active session.
    return { error: null, needsConfirmation: !data.session };
  }

  async signOut(): Promise<void> {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
}
