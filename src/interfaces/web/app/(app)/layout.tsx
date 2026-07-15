import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getContainer } from "@/infrastructure/container";
import { TabNavigation } from "@/interfaces/web/components/navigation/TabNavigation";
import { RankBadge } from "@/interfaces/web/components/profile/RankBadge";
import { rankVisual } from "@/interfaces/web/components/profile/rankColors";
import { USER_COOKIE } from "@/interfaces/web/http/session";
import { currentUserId } from "@/interfaces/web/http/currentUser";

// Every tab reads live data per request, so this whole segment must never be
// statically prerendered (the data only exists at runtime, behind the gate).
export const dynamic = "force-dynamic";

/**
 * Shell shared by the primary tabs. Renders the navigation (bottom bar on
 * mobile, side rail on desktop) alongside the page content. The root landing
 * page ("/") sits outside this group.
 *
 * Access is gated by the username middleware; this layout is just the
 * presentational shell. The header is the profile section: the username in
 * its rank color plus the rank badge, both linking to /profile
 * (docs/progression.md §2.3).
 */
export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const username = cookies().get(USER_COOKIE)?.value ?? "";
  const { getRankUseCase } = getContainer();
  const rank = await getRankUseCase.execute({ userId: currentUserId() });

  return (
    <div className="lg:flex">
      <TabNavigation />
      {/* `pb-24` clears the fixed mobile tab bar (h-16 + safe area); removed at lg. */}
      <main className="relative min-h-dvh flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
        {/* Profile chip overlays the top-right, inline with each page's title,
            so it never pushes the page content down. */}
        <Link
          href="/profile"
          title="Profile"
          className="absolute right-4 top-6 z-30 inline-flex max-w-[45vw] items-center gap-1.5 rounded-full border border-gray-900/10 bg-white/70 py-1 pl-1.5 pr-3 text-sm shadow-sm backdrop-blur transition-transform active:scale-95 lg:right-8"
        >
          <RankBadge rank={rank.rank} />
          <span className="truncate font-semibold" style={{ color: rankVisual(rank.rank).color }}>
            {username}
          </span>
        </Link>
        {children}
      </main>
    </div>
  );
}
