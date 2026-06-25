import type { DefaultSession } from "next-auth";

/**
 * Augment the Auth.js session so `session.user.id` (set in the `session`
 * callback) is typed throughout the app.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
