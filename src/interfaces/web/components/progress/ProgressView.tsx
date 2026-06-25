"use client";

import Link from "next/link";
import type { ProgressChartDTO } from "@/application/dtos/ProgressDTO";
import { GoalProgressCard } from "./GoalProgressCard";

/**
 * Progress dashboard: one card per goal with a session-completion donut and a
 * cumulative actual-vs-projected line chart. Shows a friendly prompt when the
 * user has no goals yet.
 */
export function ProgressView({ charts }: { charts: ProgressChartDTO[] }) {
  if (charts.length === 0) {
    return (
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
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {charts.map((chart) => (
        <GoalProgressCard key={chart.goalId} chart={chart} />
      ))}
    </div>
  );
}
