/**
 * Centralized, validated environment configuration.
 * Environment variables are read ONLY in the infrastructure layer.
 */
function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Auth.js (NextAuth) reads its own variables directly from the environment
// (AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET) — see .env.example.
export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseServiceRoleKey: () =>
    required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  /** Pooled Neon connection string used by the Prisma runtime client. */
  databaseUrl: () => required("DATABASE_URL", process.env.DATABASE_URL),
};
