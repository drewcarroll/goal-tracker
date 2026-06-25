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

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseServiceRoleKey: () =>
    required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  /** Shared password protecting the app (single-user gate). */
  appPassword: () => required("APP_PASSWORD", process.env.APP_PASSWORD),
};
