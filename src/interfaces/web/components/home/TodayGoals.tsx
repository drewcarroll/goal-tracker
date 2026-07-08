import Link from "next/link";
import type { GoalDTO } from "@/application/dtos/GoalDTO";
import type { DailyPlanDTO } from "@/application/dtos/DailyPlanDTO";

/**
 * Today's scheduled goals from last night's plan. Read-only here — checking
 * them off happens on /checkin.
 *
 * Grace path: if today has no plan at all (missed planning last night, or a
 * brand new user), this prompts to plan now instead of just showing nothing.
 */
export function TodayGoals({
  goals,
  todayPlan,
}: {
  goals: GoalDTO[];
  todayPlan: DailyPlanDTO | null;
}) {
  if (goals.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center">
        <p className="text-gray-600">No goals yet — let&apos;s set some up.</p>
        <Link
          href="/goals"
          className="mt-3 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Set up goals
        </Link>
      </section>
    );
  }

  if (!todayPlan) {
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h2 className="text-lg font-semibold text-gray-900">Today isn&apos;t planned</h2>
        <p className="mt-1 text-sm text-gray-700">
          If you missed planning last night, that&apos;s okay — plan now instead.
        </p>
        <Link
          href="/plan?for=today"
          className="mt-3 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Plan today
        </Link>
      </section>
    );
  }

  const byId = new Map(goals.map((g) => [g.id, g]));

  return (
    <section aria-labelledby="today-goals-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="today-goals-heading" className="text-lg font-semibold text-gray-900">
          Today
        </h2>
        <span className="text-sm text-gray-500">{todayPlan.locksSpent} locks</span>
      </div>
      <ul className="flex flex-col gap-2">
        {todayPlan.goalIds.map((goalId) => {
          const goal = byId.get(goalId);
          return (
            <li
              key={goalId}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <span className="truncate font-medium text-gray-900">{goal?.name ?? "Goal"}</span>
              {goal && <span className="shrink-0 text-xs text-gray-400">{goal.currentLockCost} locks</span>}
            </li>
          );
        })}
      </ul>
      <Link
        href="/checkin"
        className="rounded-xl bg-brand px-5 py-3 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
      >
        Check in
      </Link>
      <Link href="/plan" className="self-start text-sm font-medium text-brand hover:underline">
        Plan tomorrow →
      </Link>
    </section>
  );
}
