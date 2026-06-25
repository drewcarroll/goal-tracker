import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { TabNavigation } from "@/interfaces/web/components/navigation/TabNavigation";
import { SessionProvider } from "@/interfaces/web/components/providers/SessionProvider";

// Depends on the per-request session, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Shell shared by the four primary tabs. Renders the navigation (bottom bar on
 * mobile, side rail on desktop) alongside the page content. The root landing
 * page ("/") sits outside this group and is unaffected.
 *
 * Authoritatively gates the authenticated area server-side (the middleware only
 * does a lightweight cookie check) and provides the client-side session context.
 */
export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const { authService } = getContainer();
  const userId = await authService.getCurrentUserId();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <SessionProvider>
      <div className="lg:flex">
        <TabNavigation />
        {/* `pb-24` clears the fixed mobile tab bar (h-16 + safe area); removed at lg. */}
        <main className="min-h-dvh flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
    </SessionProvider>
  );
}
