import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient } from "../../../generated/prisma/client";
import { getPrismaClient } from "../database/prismaClient";

/**
 * Auth.js (NextAuth v5) configuration — the single source of truth for the app's
 * authentication.
 *
 * - Google as the OAuth provider (credentials read from AUTH_GOOGLE_ID /
 *   AUTH_GOOGLE_SECRET, plus AUTH_SECRET, per Auth.js conventions).
 * - The Prisma adapter persists users, accounts, sessions and verification
 *   tokens to Postgres (Neon, via the Prisma client).
 * - Database session strategy: the session is stored server-side and the cookie
 *   only holds an opaque session token.
 *
 * Lives in infrastructure (an external-provider integration). The framework
 * wiring (route handler, middleware, SessionProvider) consumes these exports.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // The adapter is typed against its own bundled Prisma types; our client is
  // generated to a custom output path, so we assert the structural match.
  adapter: PrismaAdapter(getPrismaClient() as unknown as PrismaClient),
  providers: [Google],
  session: { strategy: "database" },
  // Required when the deployment host isn't auto-detected (e.g. self-hosted).
  trustHost: true,
  callbacks: {
    /**
     * Expose the persisted user's id on the session so the rest of the app can
     * scope data to the current user. With the database strategy, `user` is the
     * adapter-loaded record.
     */
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
