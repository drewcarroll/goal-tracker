import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { TabNavigation } from "@/interfaces/web/components/navigation/TabNavigation";
import { USER_COOKIE } from "@/interfaces/web/http/session";

// Every tab reads live data per request, so this whole segment must never be
// statically prerendered (the data only exists at runtime, behind the gate).
export const dynamic = "force-dynamic";

/**
 * Shell shared by the primary tabs. Renders the navigation (bottom bar on
 * mobile, side rail on desktop) alongside the page content. The root landing
 * page ("/") sits outside this group.
 *
 * Access is gated by the username middleware; this layout is just the
 * presentational shell. It surfaces the signed-in username and a "Switch user"
 * link (clears the cookie via /api/logout).
 */
export default function AppShellLayout({ children }: { children: ReactNode }) {
  const username = cookies().get(USER_COOKIE)?.value ?? "";

  return (
    <div className="lg:flex">
      <TabNavigation />
      {/* `pb-24` clears the fixed mobile tab bar (h-16 + safe area); removed at lg. */}
      <main className="min-h-dvh flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
        <div className="mx-auto mb-4 flex w-full max-w-3xl items-center justify-end gap-3 text-sm text-gray-500">
          <span>
            Signed in as <span className="font-medium text-gray-700">{username}</span>
          </span>
          <a href="/journal" className="font-medium text-brand hover:underline">
            🔒 Journal
          </a>
          <a href="/api/logout" className="font-medium text-brand hover:underline">
            Switch user
          </a>
        </div>
        {children}
      </main>
    </div>
  );
}
