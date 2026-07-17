import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import {
  USER_COOKIE,
  THEME_COOKIE,
  DEFAULT_COLOR_THEME,
  isValidColorTheme,
} from "@/interfaces/web/http/session";
import { RankBadge } from "@/interfaces/web/components/profile/RankBadge";
import { rankVisual } from "@/interfaces/web/components/profile/rankColors";
import { WindowSettingsForm } from "@/interfaces/web/components/profile/WindowSettingsForm";
import { ThemePicker } from "@/interfaces/web/components/profile/ThemePicker";
import { DevModeGate } from "@/interfaces/web/components/profile/DevModeGate";
import { DevModePanel } from "@/interfaces/web/components/profile/DevModePanel";
import { CheckInHistoryView } from "@/interfaces/web/components/profile/CheckInHistoryView";
import { TrinketCollection } from "@/interfaces/web/components/trinkets/TrinketCollection";
import { ActivityFeed } from "@/interfaces/web/components/trinkets/ActivityFeed";
import { ChevronRightIcon, CalendarIcon } from "@/interfaces/web/components/icons";
import {
  isDevModeUnlocked,
  recomputeAllGoalsPanelAction,
  resetEconomyAction,
  resetLockFormulaAction,
  saveEconomyAction,
  saveLockFormulaAction,
} from "./actions";

export const metadata: Metadata = { title: "Profile · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Profile: the XP/rank progression (fueled purely by on-time nightly logs,
 * docs/progression.md), a history of past check-ins with each day's private
 * journal note shown inline (folded in from the old standalone History/
 * Journal tabs, 2026-07-16 — see docs/plan.md Phase 10), and an Advanced
 * section hiding the check-in window settings and the password-gated dev
 * mode.
 */
export default async function ProfilePage() {
  const {
    getRankUseCase,
    getUserSettingsUseCase,
    getLockFormulaConfigUseCase,
    getEconomyConfigUseCase,
    getCheckInHistoryUseCase,
    getAllGoalsUseCase,
    getJournalHistoryUseCase,
    getTrinketCollectionUseCase,
    getActivityFeedUseCase,
    getPinnedTrinketsUseCase,
    localDateService,
  } = getContainer();
  const userId = currentUserId();
  const username = cookies().get(USER_COOKIE)?.value ?? "";
  const today = localDateService.today(currentTimezone());
  const rawTheme = cookies().get(THEME_COOKIE)?.value ?? "";
  const currentTheme = isValidColorTheme(rawTheme) ? rawTheme : DEFAULT_COLOR_THEME;

  const devUnlocked = await isDevModeUnlocked();
  const [
    rank,
    settings,
    lockFormulaConfigDto,
    economyConfig,
    checkIns,
    goals,
    journalEntries,
    trinkets,
    activityFeed,
    pinnedIds,
  ] = await Promise.all([
    getRankUseCase.execute({ userId }),
    getUserSettingsUseCase.execute({ userId }),
    devUnlocked ? getLockFormulaConfigUseCase.execute() : Promise.resolve(null),
    getEconomyConfigUseCase.execute(),
    getCheckInHistoryUseCase.execute({ userId }),
    getAllGoalsUseCase.execute({ userId }),
    getJournalHistoryUseCase.execute({ userId }),
    getTrinketCollectionUseCase.execute({ userId }),
    getActivityFeedUseCase.execute({ userId }),
    getPinnedTrinketsUseCase.execute({ userId }),
  ]);
  const economyConfigDto = devUnlocked ? economyConfig : null;

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
        href="/trinkets"
        className="flex items-center justify-between gap-3 rounded-2xl border border-gray-900/[0.06] bg-white px-5 py-4 shadow-sm transition-colors active:bg-gray-50"
      >
        <span className="inline-flex items-center gap-2.5 font-display font-semibold text-gray-900">
          <CalendarIcon className="h-5 w-5 text-brand" />
          Rewards calendar
        </span>
        <ChevronRightIcon className="h-4 w-4 text-gray-300" />
      </Link>

      <TrinketCollection
        trinkets={trinkets}
        initialPinnedIds={pinnedIds}
        maxPinned={economyConfig.config.maxPinnedTrinkets}
      />

      <ActivityFeed items={activityFeed} />

      <div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">History</h2>
        <p className="mb-3 -mt-1 text-sm text-gray-500">
          Past check-ins, with that night&apos;s private journal note attached.
        </p>
        {goals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
            No goals yet, so nothing to look back on.
          </p>
        ) : (
          <CheckInHistoryView
            checkIns={checkIns}
            goals={goals}
            journalEntries={journalEntries}
            today={today}
          />
        )}
      </div>

      <details className="group rounded-2xl border border-gray-900/[0.06] bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
          <span className="font-semibold text-gray-900">Advanced</span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-open:rotate-90" />
        </summary>
        <div className="flex flex-col gap-4 border-t border-gray-900/[0.06] p-4">
          <ThemePicker current={currentTheme} />
          <WindowSettingsForm
            start={settings.checkInWindow.start}
            end={settings.checkInWindow.end}
          />
          <DevModeGate unlocked={devUnlocked}>
            <div className="flex flex-col gap-4">
              <DevModePanel
                title="Lock formula"
                hint="The lock formula's constants. See docs/lock-formula.md for what each one does."
                warning="Changing constants rewrites all historical trajectories (costs are replayed from scratch). Stored costs refresh on the next check-in per goal, or press “Recompute all” to refresh them now."
                configDto={lockFormulaConfigDto}
                onSave={saveLockFormulaAction}
                onReset={resetLockFormulaAction}
                extraActions={[
                  {
                    label: "Recompute all goals",
                    successText: "All goals recomputed under the current constants.",
                    onClick: recomputeAllGoalsPanelAction,
                  },
                ]}
              />
              <DevModePanel
                title="Economy"
                hint="Battle-pass coin rewards and shop pricing. See docs/plan.md Phase 11 for what each one does."
                configDto={economyConfigDto}
                onSave={saveEconomyAction}
                onReset={resetEconomyAction}
              />
            </div>
          </DevModeGate>
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
