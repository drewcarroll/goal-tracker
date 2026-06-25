import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../../../generated/prisma/client";
import { env } from "../config/env";

/**
 * Prisma client singleton.
 *
 * On serverless platforms (Vercel) each function instance reuses this module
 * across warm invocations, and the Next.js dev server re-executes the module
 * on every hot reload. Caching the client on `globalThis` ensures a single
 * connection pool is reused instead of opening a new one each time — which is
 * what exhausts Postgres connection limits in serverless environments.
 *
 * The Neon serverless driver adapter connects to Neon's *pooled* endpoint
 * (DATABASE_URL) over WebSockets, which is built for short-lived functions.
 * Migrations use the *direct* endpoint (DIRECT_URL) — see prisma.config.ts.
 *
 * Lives in the infrastructure layer; never imported by domain/application/
 * interfaces directly (only through the composition root).
 */
const globalForPrisma = globalThis as unknown as {
  prismaClient?: PrismaClient;
};

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prismaClient) {
    const adapter = new PrismaNeon({ connectionString: env.databaseUrl() });
    globalForPrisma.prismaClient = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalForPrisma.prismaClient;
}
