import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone, usernameToUserId } from "@/interfaces/web/http/currentUser";
import { NotFriendsError } from "@/application/errors/ApplicationError";
import { HabitStrengthChart } from "@/interfaces/web/components/goals/HabitStrengthChart";
import { ChevronRightIcon } from "@/interfaces/web/components/icons";
import type { GoalStatsDTO } from "@/application/dtos/GoalStatsDTO";

export const metadata: Metadata = { title: "Friend · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/** "2026-01-15" -> "Jan 15" (UTC-parsed to avoid a local-timezone shift). */
function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * A friend's public-only view: their public goals (each with the same
 * habit-strength graph you see for your own), and their day-by-day check-in
 * log with every private goal's mark already stripped server-side (see
 * GetFriendCheckInLogUseCase — nothing private ever reaches this page).
 */
export default async function FriendDetailPage({ params }: { params: { username: string } }) {
  const { getFriendPublicGoalsUseCase, getFriendGoalStatsUseCase, getFriendCheckInLogUseCase, localDateService } =
    getContainer();
  const userId = currentUserId();
  const friendUserId = usernameToUserId(params.username);
  const today = localDateService.today(currentTimezone());

  let goals;
  let checkIns;
  try {
    [goals, checkIns] = await Promise.all([
      getFriendPublicGoalsUseCase.execute({ userId, friendUserId }),
      getFriendCheckInLogUseCase.execute({ userId, friendUserId }),
    ]);
  } catch (error) {
    if (error instanceof NotFriendsError) notFound();
    throw error;
  }

  const stats: GoalStatsDTO[] = await Promise.all(
    goals.map((goal) =>
      getFriendGoalStatsUseCase.execute({ userId, friendUserId, goalId: goal.id, today }),
    ),
  );
  const statsByGoalId = Object.fromEntries(stats.map((s) => [s.goalId, s]));
  const goalsById = new Map(goals.map((g) => [g.id, g]));

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <Link
        href="/friends"
        className="inline-flex items-center gap-1 self-start text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180" />
        Friends
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">{params.username}</h1>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Goals
        </h2>
        {goals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
            No public goals yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {goals.map((goal) => {
              const goalStats = statsByGoalId[goal.id];
              return (
                <li
                  key={goal.id}
                  className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-medium text-gray-900">{goal.name}</p>
                    {goal.state === "formed" && (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Formed
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">{goal.weeklyFrequencyTarget}×/week</p>
                  {goalStats && (
                    <div className="mt-3">
                      <HabitStrengthChart stats={goalStats} today={today} compact />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Daily log
        </h2>
        {checkIns.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
            No public check-ins yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...checkIns]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((checkIn) => (
                <li
                  key={checkIn.id}
                  className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm"
                >
                  <p className="mb-2 text-sm font-semibold text-gray-900">
                    {formatDate(checkIn.date)}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {checkIn.marks.map((mark) => (
                      <li
                        key={mark.goalId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-700">
                          {goalsById.get(mark.goalId)?.name ?? "Goal"}
                        </span>
                        <span className={mark.passed ? "text-emerald-600" : "text-gray-400"}>
                          {mark.passed ? "✓" : "✗"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  );
}
