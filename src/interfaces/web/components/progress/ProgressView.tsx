"use client";

import Link from "next/link";
import type { GoalStatsDTO } from "@/application/dtos/GoalStatsDTO";
import type { CheckInDTO } from "@/application/dtos/CheckInDTO";
import { GoalTrajectoryChart } from "./GoalTrajectoryChart";
import { DayResultCalendar } from "./DayResultCalendar";

/**
 * Progress dashboard: a 30-day pass/fail calendar, then one gamified card
 * per goal (this-week pips, lock-cost trajectory, 30-day pass rate).
 */
export function ProgressView({
  goalStats,
  checkIns,
  today,
}: {
  goalStats: GoalStatsDTO[];
  checkIns: CheckInDTO[];
  today: string;
}) {
  if (goalStats.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="font-medium text-gray-900">No goals to chart yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Set up a goal and check in a few times to see your progress here.
        </p>
        <Link
          href="/goals"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          Go to goals
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <DayResultCalendar today={today} checkIns={checkIns} />
      {goalStats.map((stats) => (
        <GoalTrajectoryChart key={stats.goalId} stats={stats} />
      ))}
    </div>
  );
}
