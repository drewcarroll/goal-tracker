"use client";

import type { ReactNode } from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * Client-side session context. Wrapping the app in this makes the session
 * available to Client Components via `useSession()`. The session itself is
 * fetched from the Auth.js `/api/auth/session` endpoint.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
