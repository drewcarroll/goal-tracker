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
 * times completed, the lock-cost trajectory (reversed on purpose — trending
 * DOWN is the good direction), and two ghost points projecting the next
 * planned day: green if you pass, red if you fail. The red point reflects
 * consecutive-miss escalation, so after a miss it visibly jumps further —
 * one relapse isn't as bad as several (docs/lock-formula.md §6.5).
 */
export function GoalTrajectoryChart({ stats }: { stats: GoalStatsDTO }) {
  const { trajectory, last30, thisWeek, timesCompleted, nextIfPass, nextIfFail } = stats;
  const formed = trajectory.length > 0 && trajectory[trajectory.length - 1]!.cost <= 1;

  // Real history plus one "next" slot carrying both projections. The last
  // real point also carries them so the dashed ghost lines connect to it.
  const chartData: {
    date: string;
    cost?: number;
    ifPass?: number;
    ifFail?: number;
  }[] = trajectory.map((p, i) => ({
    date: formatDate(p.date),
    cost: p.cost,
    ...(i === trajectory.length - 1 ? { ifPass: p.cost, ifFail: p.cost } : {}),
  }));
  if (trajectory.length > 0) {
    chartData.push({ date: "next", ifPass: nextIfPass, ifFail: nextIfFail });
  }

  return (
    <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate font-semibold text-gray-900">{stats.label}</h3>
          {formed && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              ✓ Formed
            </span>
          )}
        </div>
        <WeekPips completed={thisWeek.completed} target={thisWeek.target} />
      </div>

      <p className="mb-3 text-sm text-gray-500">
        Times completed: <span className="font-medium text-gray-900">{timesCompleted}</span>
        {last30.passRate !== null && (
          <>
            {" · "}
            <span className="font-medium text-gray-900">{last30.passRate}%</span> pass rate, last
            30 days
          </>
        )}
      </p>

      {trajectory.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          No check-ins yet. First one: <span className="font-medium text-emerald-600">✓ →
          {" "}{nextIfPass} locks</span> ·{" "}
          <span className="font-medium text-red-500">✗ → {nextIfFail} locks</span>
        </p>
      ) : (
        <>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
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
                <Line
                  type="monotone"
                  dataKey="ifPass"
                  name="If you pass"
                  stroke={CHART_COLORS.pass}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: CHART_COLORS.pass, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="ifFail"
                  name="If you miss"
                  stroke={CHART_COLORS.fail}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: CHART_COLORS.fail, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Next check-in: <span className="font-medium text-emerald-600">✓ → {nextIfPass}</span>
            {" · "}
            <span className="font-medium text-red-500">✗ → {nextIfFail}</span> locks
          </p>
        </>
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
