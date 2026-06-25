import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

/**
 * Server-side Supabase client using the service-role key.
 * Lives in infrastructure; never imported by domain/application/interfaces directly.
 */
let cachedClient: SupabaseClient | null = null;

export function getServerSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }
  cachedClient = createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedClient;
}
