import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { USER_COOKIE } from "@/interfaces/web/http/session";
import { RankBadge } from "@/interfaces/web/components/profile/RankBadge";
import { rankVisual } from "@/interfaces/web/components/profile/rankColors";
import { WindowSettingsForm } from "@/interfaces/web/components/profile/WindowSettingsForm";
import { DevModePanel } from "@/interfaces/web/components/profile/DevModePanel";
import { ChevronRightIcon, LockIcon } from "@/interfaces/web/components/icons";
import { isDevModeUnlocked } from "./actions";

export const metadata: Metadata = { title: "Profile · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Profile: the XP/rank progression (fueled purely by on-time nightly logs,
 * docs/progression.md), the private journal, and an Advanced section hiding
 * the check-in window settings and the password-gated dev mode.
 */
export default async function ProfilePage() {
  const { getRankUseCase, getUserSettingsUseCase, getLockFormulaConfigUseCase } = getContainer();
  const userId = currentUserId();
  const username = cookies().get(USER_COOKIE)?.value ?? "";

  const devUnlocked = await isDevModeUnlocked();
  const [rank, settings, configDto] = await Promise.all([
    getRankUseCase.execute({ userId }),
    getUserSettingsUseCase.execute({ userId }),
    devUnlocked ? getLockFormulaConfigUseCase.execute() : Promise.resolve(null),
  ]);

  const current = rankVisual(rank.rank);
  const next = rankVisual(rank.nextRank);
  const progress = Math.min(1, rank.xpIntoRank / rank.xpForRankUp);
  const xpToGo = rank.xpForRankUp - rank.xpIntoRank;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      <div className="flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-gray-900/[0.06] bg-white p-6 text-center shadow-sm">
        <RankBadge rank={rank.rank} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-xl font-bold" style={{ color: current.color }}>
            {username}
          </p>
          <p className="text-sm text-gray-500">
            Rank {rank.rank} · {rank.xp.toLocaleString()} XP
          </p>
        </div>

        {/* Current rank on the left, next rank on the right, the climb between. */}
        <div className="flex w-full items-center gap-3">
          <RankBadge rank={rank.rank} size="md" />
          <div className="min-w-0 flex-1">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  background: `linear-gradient(90deg, ${current.from}, ${next.to})`,
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              <span className="font-semibold text-gray-900">{xpToGo.toLocaleString()} XP</span> to
              Rank {rank.nextRank}
            </p>
          </div>
          <RankBadge rank={rank.nextRank} size="md" />
        </div>
      </div>

      <Link
        href="/journal"
        className="flex items-center justify-between gap-3 rounded-2xl border border-gray-900/[0.06] bg-white p-5 shadow-sm transition-transform active:scale-[0.99]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <LockIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">Private journal</p>
            <p className="truncate text-sm text-gray-500">Your nightly notes, for you only.</p>
          </div>
        </div>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-300" />
      </Link>

      <details className="group rounded-2xl border border-gray-900/[0.06] bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
          <span className="font-semibold text-gray-900">Advanced</span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-open:rotate-90" />
        </summary>
        <div className="flex flex-col gap-4 border-t border-gray-900/[0.06] p-4">
          <WindowSettingsForm
            start={settings.checkInWindow.start}
            end={settings.checkInWindow.end}
          />
          <DevModePanel unlocked={devUnlocked} configDto={configDto} />
        </div>
      </details>

      <a
        href="/api/logout"
        className="self-center text-sm font-medium text-gray-400 hover:text-gray-600 hover:underline"
      >
        Switch user
      </a>
    </section>
  );
}
