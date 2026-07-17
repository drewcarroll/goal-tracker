import type { ReactNode } from "react";
import { getContainer } from "@/infrastructure/container";
import { TabNavigation } from "@/interfaces/web/components/navigation/TabNavigation";
import { MaintenanceBanner } from "@/interfaces/web/components/MaintenanceBanner";
import { currentTimezone } from "@/interfaces/web/http/currentUser";

// Every tab reads live data per request, so this whole segment must never be
// statically prerendered (the data only exists at runtime, behind the gate).
export const dynamic = "force-dynamic";

/**
 * Shell shared by the primary tabs. Renders the navigation (bottom bar on
 * mobile, side rail on desktop) alongside the page content. The root landing
 * page ("/") sits outside this group.
 *
 * Access is gated by the username middleware; this layout is just the
 * presentational shell. The rank/username chip used to overlay every page's
 * top-right corner — removed 2026-07-18 (user feedback: it only belongs on
 * the Profile page itself, where it already lives as the hero card).
 */
export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const { getMaintenanceStatusUseCase } = getContainer();
  if (getMaintenanceStatusUseCase.execute(currentTimezone()).blocked) {
    return <MaintenanceBanner />;
  }

  return (
    <div className="lg:flex">
      <TabNavigation />
      {/* `pb-24` clears the fixed mobile tab bar (h-16 + safe area); removed at lg. */}
      <main className="relative min-h-dvh flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
    </div>
  );
}
