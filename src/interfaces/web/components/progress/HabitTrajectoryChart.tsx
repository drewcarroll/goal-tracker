"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HabitStatsDTO } from "@/application/dtos/HabitStatsDTO";
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
 * A habit's lock-cost trajectory: distance to "formed" (cost 1) over time.
 * Reversed-feeling on purpose — the line trending DOWN is the good direction,
 * unlike the goal charts where up is progress.
 */
export function HabitTrajectoryChart({ stats }: { stats: HabitStatsDTO }) {
  const { trajectory, last30 } = stats;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-semibold text-gray-900">{stats.label}</h3>
        <p className="text-sm text-gray-500">
          {last30.passRate === null ? (
            "No check-ins yet"
          ) : (
            <>
              <span className="font-medium text-gray-900">{last30.passRate}%</span> pass rate ·
              last 30 days
            </>
          )}
        </p>
      </div>

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
