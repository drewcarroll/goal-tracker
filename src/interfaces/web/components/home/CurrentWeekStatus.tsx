"use client";

import type { GoalDTO, GoalWeekDTO } from "@/application/dtos/GoalDTO";

/** Renders a number without noise: integers as-is, otherwise up to 2 decimals. */
function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/** Share of the weekly target met, clamped to [0, 100] for the bar width. */
function percentOfTarget(actual: number, target: number): number {
  if (target <= 0) return actual > 0 ? 100 : 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

/**
 * Compact "this week" snapshot: logged-so-far vs. the weekly target for the
 * current week of each goal. Reads straight off `GoalDTO`, so it re-renders
 * with fresh numbers the moment its `goals` prop changes after a log.
 */
export function CurrentWeekStatus({ goals }: { goals: GoalDTO[] }) {
  if (goals.length === 0) return null;

  return (
    <section aria-labelledby="current-week-heading" className="flex flex-col gap-3">
      <h2 id="current-week-heading" className="text-lg font-semibold text-gray-900">
        This week
      </h2>
      <ul className="flex flex-col gap-2.5">
        {goals.map((goal) => {
          // `currentWeekIndex` is clamped, so use the week's own kind to tell
          // whether the session is actually live this week.
          const current = goal.weeks.find((w) => w.kind === "current");
          return (
            <li key={goal.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              {current ? (
                <GoalWeekRow goal={goal} week={current} />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-medium text-gray-900">{goal.name}</p>
                  <p className="shrink-0 text-xs text-gray-400">Not active this week</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GoalWeekRow({ goal, week }: { goal: GoalDTO; week: GoalWeekDTO }) {
  const target = goal.weeklyTarget;
  const actual = week.actual;
  const pct = percentOfTarget(actual, target);
  const met = target > 0 && actual >= target;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate font-medium text-gray-900">{goal.name}</p>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
          {formatNumber(actual)}
          <span className="font-normal text-gray-400">
            {" / "}
            {formatNumber(target)} {goal.unit}
          </span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${goal.name}: ${formatNumber(actual)} of ${formatNumber(target)} ${goal.unit} logged this week`}
        className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
      >
        <div
          className={`h-full rounded-full transition-all ${met ? "bg-emerald-500" : "bg-brand"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
