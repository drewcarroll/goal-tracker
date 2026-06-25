"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

/** Signs the user out via Auth.js and returns them to the sign-in screen. */
export function SignOutButton({ className = "" }: { className?: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut({ callbackUrl: "/sign-in" });
      }}
      className={`rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 ${className}`.trim()}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
