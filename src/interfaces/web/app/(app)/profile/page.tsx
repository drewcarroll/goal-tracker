import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getContainer } from "@/infrastructure/container";
import { currentUserId } from "@/interfaces/web/http/currentUser";
import { USER_COOKIE } from "@/interfaces/web/http/session";
import { RankBadge } from "@/interfaces/web/components/profile/RankBadge";
import { rankStyle } from "@/interfaces/web/components/profile/rankColors";
import { WindowSettingsForm } from "@/interfaces/web/components/profile/WindowSettingsForm";
import { DevModePanel } from "@/interfaces/web/components/profile/DevModePanel";
import { isDevModeUnlocked } from "./actions";

export const metadata: Metadata = { title: "Profile · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Profile: the rank progression (fueled purely by on-time nightly logs —
 * docs/progression.md), the check-in window settings, and the password-gated
 * dev-mode constants editor.
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

  const style = rankStyle(rank.rank);
  const progress =
    rank.nextThreshold === null ? 1 : Math.min(1, rank.points / rank.nextThreshold);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <RankBadge rank={rank.rank} size="lg" />
        <div>
          <p className={`text-xl font-bold ${style.text}`}>{username}</p>
          <p className="text-sm text-gray-500">
            Rank {rank.rank} · {style.name}
          </p>
        </div>
        <div className="w-full">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${style.badge}`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-sm text-gray-600">
            <span className="font-medium text-gray-900">{rank.points}</span> nightly{" "}
            {rank.points === 1 ? "log" : "logs"}
            {rank.nextThreshold !== null ? (
              <> · {rank.nextThreshold - rank.points} more to Rank {rank.rank + 1}</>
            ) : (
              <> · top rank!</>
            )}
          </p>
        </div>
        <p className="text-xs text-gray-400">
          Points come from submitting your nightly check-in on time — passing or missing goals
          never changes them. No streaks: a quiet night just earns nothing.
        </p>
      </div>

      <WindowSettingsForm start={settings.checkInWindow.start} end={settings.checkInWindow.end} />

      <DevModePanel unlocked={devUnlocked} configDto={configDto} />
    </section>
  );
}
