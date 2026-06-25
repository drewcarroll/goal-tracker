import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

/**
 * Supabase client bound to the incoming request's cookies, for use in Server
 * Components, Route Handlers, and Server Actions.
 *
 * Uses the public anon key (NOT the service-role key) so that the client acts
 * on behalf of the signed-in user. The session is read from the auth cookies
 * that `@supabase/ssr` manages.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` was called from a Server Component, where cookies are
          // read-only. Token refresh is handled by the middleware instead, so
          // this can be safely ignored.
        }
      },
    },
  });
}
