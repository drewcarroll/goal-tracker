"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GoalStatsDTO } from "@/application/dtos/GoalStatsDTO";
import { ChartTooltip } from "./ChartTooltip";
import { CHART_COLORS } from "./theme";

/** "2026-01-15" -> "Jan 15". */
function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * A goal's gamified progress card: this week's completed-vs-target pips,
 * the lock-cost trajectory (distance to "formed" — reversed on purpose,
 * trending DOWN is the good direction here), and the 30-day pass rate.
 */
export function GoalTrajectoryChart({ stats }: { stats: GoalStatsDTO }) {
  const { trajectory, last30, thisWeek } = stats;
  const formed = trajectory.length > 0 && trajectory[trajectory.length - 1]!.cost <= 1;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{stats.label}</h3>
          {formed && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              ✓ Formed
            </span>
          )}
        </div>
        <WeekPips completed={thisWeek.completed} target={thisWeek.target} />
      </div>

      <p className="mb-3 text-sm text-gray-500">
        {last30.passRate === null ? (
          "No check-ins yet"
        ) : (
          <>
            <span className="font-medium text-gray-900">{last30.passRate}%</span> pass rate · last
            30 days
          </>
        )}
      </p>

      {trajectory.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          No check-ins yet — trajectory appears after your first one.
        </p>
      ) : (
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trajectory.map((p) => ({ date: formatDate(p.date), cost: p.cost }))}
              margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
            >
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.axisLine }}
              />
              <YAxis
                domain={[1, 50]}
                reversed
                tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<ChartTooltip unit="locks" />} />
              <Line
                type="monotone"
                dataKey="cost"
                name="Lock cost"
                stroke={CHART_COLORS.brand}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** This week's completed-vs-target as a row of filled/empty pips — the "gamified" bit. */
function WeekPips({ completed, target }: { completed: number; target: number }) {
  const hit = completed >= target;
  return (
    <div className="flex items-center gap-1.5" title={`${completed} of ${target} this week`}>
      <div className="flex gap-1">
        {Array.from({ length: target }, (_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full ${
              i < completed ? (hit ? "bg-emerald-500" : "bg-brand") : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${hit ? "text-emerald-600" : "text-gray-500"}`}>
        {completed}/{target}
      </span>
    </div>
  );
}
