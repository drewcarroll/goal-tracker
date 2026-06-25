import type { ReactNode } from "react";
import { TabNavigation } from "@/interfaces/web/components/navigation/TabNavigation";

/**
 * Shell shared by the four primary tabs. Renders the navigation (bottom bar on
 * mobile, side rail on desktop) alongside the page content. The root landing
 * page ("/") sits outside this group and is unaffected.
 */
export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex">
      <TabNavigation />
      {/* `pb-24` clears the fixed mobile tab bar (h-16 + safe area); removed at lg. */}
      <main className="min-h-dvh flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
    </div>
  );
}
