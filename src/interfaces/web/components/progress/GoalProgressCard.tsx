"use client";

import type { ReactNode } from "react";
import type { ProgressChartDTO } from "@/application/dtos/ProgressDTO";
import { SessionCompletionDonut } from "./SessionCompletionDonut";
import { CumulativeProgressChart } from "./CumulativeProgressChart";
import { WeeklyProgressBar } from "./WeeklyProgressBar";
import { WeekByWeekChart } from "./WeekByWeekChart";
import { formatNumber } from "./format";

/** Small status pill: on track when the projection meets the goal's target. */
function StatusPill({ chart }: { chart: ProgressChartDTO }) {
  const onTrack = chart.projectedTotal >= chart.targetValue;
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
        onTrack ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {onTrack ? "On track" : "Behind pace"}
    </span>
  );
}

/** Small uppercase section label used to separate a card's charts. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{children}</h3>
  );
}

/**
 * One goal's progress: this-week bar, a session-completion donut beside the
 * cumulative actual-vs-projected line, and a week-by-week logged-vs-target
 * chart. Sections stack on mobile; the session pair sits side-by-side from `sm`.
 */
export function GoalProgressCard({ chart }: { chart: ProgressChartDTO }) {
  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-gray-900">{chart.goalName}</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Target {formatNumber(chart.targetValue)} {chart.unit} · projected{" "}
            <span className="font-medium text-gray-700">
              {formatNumber(chart.projectedTotal)} {chart.unit}
            </span>{" "}
            over {chart.totalWeeks} {chart.totalWeeks === 1 ? "week" : "weeks"}
          </p>
        </div>
        <StatusPill chart={chart} />
      </header>

      <section className="flex flex-col gap-2">
        <SectionLabel>This week</SectionLabel>
        <WeeklyProgressBar chart={chart} />
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Session</SectionLabel>
        <div className="grid items-center gap-4 sm:grid-cols-[11rem_1fr] sm:gap-5">
          <SessionCompletionDonut chart={chart} />
          <CumulativeProgressChart chart={chart} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Week by week</SectionLabel>
        <WeekByWeekChart chart={chart} />
      </section>
    </article>
  );
}
