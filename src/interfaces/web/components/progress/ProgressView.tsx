"use client";

import Link from "next/link";
import type { ProgressChartDTO } from "@/application/dtos/ProgressDTO";
import type { HabitStatsDTO } from "@/application/dtos/HabitStatsDTO";
import type { CheckInDTO } from "@/application/dtos/CheckInDTO";
import { GoalProgressCard } from "./GoalProgressCard";
import { HabitTrajectoryChart } from "./HabitTrajectoryChart";
import { DayResultCalendar } from "./DayResultCalendar";

/**
 * Progress dashboard: habit lock-cost trajectories + a 30-day pass/fail
 * calendar above, one card per goal (session-completion donut + cumulative
 * actual-vs-projected chart) below. Each section shows its own empty state
 * independently — having no goals yet doesn't hide habit stats and vice
 * versa.
 */
export function ProgressView({
  charts,
  habitStats,
  checkIns,
  today,
}: {
  charts: ProgressChartDTO[];
  habitStats: HabitStatsDTO[];
  checkIns: CheckInDTO[];
  today: string;
}) {
  return (
    <div className="flex flex-col gap-8">
      {habitStats.length > 0 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold text-gray-900">Habits</h2>
          <DayResultCalendar today={today} checkIns={checkIns} />
          {habitStats.map((stats) => (
            <HabitTrajectoryChart key={stats.habitId} stats={stats} />
          ))}
        </div>
      )}

      {charts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="font-medium text-gray-900">No goals to chart yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Create a goal and log some progress to see your charts here.
          </p>
          <Link
            href="/goals"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            Go to goals
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {habitStats.length > 0 && <h2 className="text-lg font-semibold text-gray-900">Goals</h2>}
          {charts.map((chart) => (
            <GoalProgressCard key={chart.goalId} chart={chart} />
          ))}
        </div>
      )}
    </div>
  );
}
