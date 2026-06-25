"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { ProgressChartDTO } from "@/application/dtos/ProgressDTO";
import { formatNumber } from "./format";
import { CHART_COLORS } from "./theme";

/** Share of the weekly target met, clamped to [0, 100]. */
function percentOfTarget(actual: number, target: number): number {
  if (target <= 0) return actual > 0 ? 100 : 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

/**
 * Current-week progress bar (logged vs. target) for a single goal. A horizontal
 * Recharts bar fills toward the weekly target, with a dashed reference marker at
 * the target so over- and under-delivery read at a glance. Axes are hidden — the
 * caption above carries the exact numbers — so it stays legible on a phone.
 */
export function WeeklyProgressBar({ chart }: { chart: ProgressChartDTO }) {
  // `currentWeekIndex` is clamped, so trust the week's own kind to tell whether
  // the session is actually live this week.
  const current = chart.weeks.find((w) => w.kind === "current");

  if (!current) {
    return <p className="text-sm text-gray-400">Not active this week.</p>;
  }

  const logged = current.weeklyActual;
  const target = current.weeklyTarget;
  const met = target > 0 && logged >= target;
  const pct = percentOfTarget(logged, target);
  // Leave headroom past the larger of the two so the target marker is never
  // flush against the right edge.
  const domainMax = Math.max(target, logged) * 1.1 || 1;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-gray-500">Week {current.index + 1} so far</span>
        <span className="text-sm font-semibold tabular-nums text-gray-900">
          {formatNumber(logged)}
          <span className="font-normal text-gray-400">
            {" / "}
            {formatNumber(target)} {chart.unit} · {pct}%
          </span>
        </span>
      </div>
      <div className="h-9 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={[{ name: "week", logged }]}
            margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
            barCategoryGap={0}
          >
            <XAxis type="number" domain={[0, domainMax]} hide />
            <YAxis type="category" dataKey="name" hide />
            <Bar
              dataKey="logged"
              barSize={16}
              radius={[8, 8, 8, 8]}
              background={{ fill: CHART_COLORS.track, radius: 8 }}
              isAnimationActive={false}
            >
              <Cell fill={met ? CHART_COLORS.actual : CHART_COLORS.brand} />
            </Bar>
            <ReferenceLine
              x={target}
              stroke={CHART_COLORS.target}
              strokeDasharray="3 3"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
