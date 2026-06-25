"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

/**
 * Signs the user out via Auth.js and returns them to the sign-in screen.
 *
 * Also reads the client-side session (`useSession`) to label the button with
 * the signed-in account, demonstrating the session is available client-side.
 */
export function SignOutButton() {
  const { data: session, status } = useSession();
  const [pending, setPending] = useState(false);

  const label =
    status === "authenticated" && session?.user?.email
      ? `Sign out (${session.user.email})`
      : "Sign out";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut({ callbackUrl: "/sign-in" });
      }}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
    >
      {pending ? "Signing out…" : label}
    </button>
  );
}
