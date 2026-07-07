import Link from "next/link";
import type { HabitDTO } from "@/application/dtos/HabitDTO";
import type { DailyPlanDTO } from "@/application/dtos/DailyPlanDTO";

/**
 * Today's scheduled habits from last night's plan, alongside the
 * measurable-goal quick-log. Read-only for now — checking them off arrives
 * with the end-of-day check-in flow (Phase 3).
 *
 * Grace path: if today has no plan at all (missed planning last night, or a
 * brand new user), this prompts to plan now instead of just showing nothing.
 */
export function TodayHabits({
  habits,
  todayPlan,
}: {
  habits: HabitDTO[];
  todayPlan: DailyPlanDTO | null;
}) {
  if (habits.length === 0) {
    // No habits at all yet — onboarding hasn't happened. Measurable goals
    // still work fine without habits, so this is a soft nudge, not a gate.
    return (
      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center">
        <p className="text-gray-600">Want to build some habits too?</p>
        <Link
          href="/onboarding"
          className="mt-3 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Set up habits
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

  const byId = new Map(habits.map((h) => [h.id, h]));

  return (
    <section aria-labelledby="today-habits-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="today-habits-heading" className="text-lg font-semibold text-gray-900">
          Today
        </h2>
        <span className="text-sm text-gray-500">{todayPlan.locksSpent} locks</span>
      </div>
      <ul className="flex flex-col gap-2">
        {todayPlan.habitIds.map((habitId) => {
          const habit = byId.get(habitId);
          return (
            <li
              key={habitId}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <span className="truncate font-medium text-gray-900">
                {habit?.label ?? "Habit"}
              </span>
              {habit && <span className="shrink-0 text-xs text-gray-400">{habit.currentLockCost} locks</span>}
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
