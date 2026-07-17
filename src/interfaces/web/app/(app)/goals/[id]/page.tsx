import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContainer } from "@/infrastructure/container";
import { currentUserId, currentTimezone } from "@/interfaces/web/http/currentUser";
import { GoalNotFoundError } from "@/application/errors/ApplicationError";
import { HabitStrengthChart } from "@/interfaces/web/components/goals/HabitStrengthChart";
import { GoalDetailActions } from "@/interfaces/web/components/goals/GoalDetailActions";
import { ChevronRightIcon } from "@/interfaces/web/components/icons";

export const metadata: Metadata = { title: "Goal · Goal Tracker" };

// Reads live data per request, so it must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * One goal's full habit-strength history: every real check-in as a colored
 * point on a smooth curve, plus the 14-day green/red projection. This is the
 * "click into a goal" detail view linked from its compact card on /goals.
 */
export default async function GoalDetailPage({ params }: { params: { id: string } }) {
  const { getAllGoalsUseCase, getGoalStatsUseCase, localDateService } = getContainer();
  const userId = currentUserId();
  const today = localDateService.today(currentTimezone());

  let stats;
  try {
    stats = await getGoalStatsUseCase.execute({ userId, goalId: params.id, today });
  } catch (error) {
    if (error instanceof GoalNotFoundError) notFound();
    throw error;
  }

  const goals = await getAllGoalsUseCase.execute({ userId });
  const goal = goals.find((g) => g.id === params.id);
  if (!goal) notFound();

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <Link
        href="/goals"
        className="inline-flex items-center gap-1 self-start text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180" />
        Goals
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display min-w-0 truncate text-2xl font-bold tracking-tight">
            {goal.name}
          </h1>
          {goal.state === "formed" && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              Formed
            </span>
          )}
          {!goal.isPublic && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
              Private
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {goal.weeklyFrequencyTarget}×/week · {goal.currentLockCost} keys to schedule
        </p>
      </div>

      <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm sm:p-5">
        <HabitStrengthChart stats={stats} today={today} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{stats.timesCompleted}</p>
          <p className="mt-1 text-xs text-gray-500">Times completed</p>
        </div>
        <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            {stats.last30.passRate !== null ? `${stats.last30.passRate}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-gray-500">Pass rate, last 30 days</p>
        </div>
      </div>

      <GoalDetailActions goal={goal} />
    </section>
  );
}
