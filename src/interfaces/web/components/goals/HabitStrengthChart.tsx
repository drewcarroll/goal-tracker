"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GoalStatsDTO } from "@/application/dtos/GoalStatsDTO";
import { CHART_COLORS } from "@/interfaces/web/components/progress/theme";

const PROJECTION_DAYS = 14;

/** "2026-01-15" -> "Jan 15" (UTC-parsed to avoid a local-timezone shift). */
function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function addDaysUTC(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface ChartRow {
  date: string;
  strength?: number;
  passed?: boolean;
  ifPass?: number;
  ifFail?: number;
}

/**
 * Real history (one point per check-in, oldest first) plus a 14-day
 * projection branching off the last real point (or off today, for a goal
 * with no check-ins yet). The projection's start ("bridge") point repeats
 * the last real value under BOTH ifPass/ifFail keys so the dashed lines
 * visually connect to the solid history line.
 */
function buildChartData(stats: GoalStatsDTO, today: string): ChartRow[] {
  const { trajectory, initialStrength, finalStrength, projectionIfPass, projectionIfFail } = stats;
  const hasHistory = trajectory.length > 0;

  const rows: ChartRow[] = trajectory.map((p) => ({
    date: formatDate(p.date),
    strength: p.strength,
    passed: p.passed,
  }));

  const anchorDate = hasHistory ? trajectory[trajectory.length - 1]!.date : today;
  const anchorStrength = hasHistory ? finalStrength : initialStrength;
  rows.push({
    date: formatDate(anchorDate),
    strength: hasHistory ? anchorStrength : undefined,
    ifPass: anchorStrength,
    ifFail: anchorStrength,
  });

  for (let i = 0; i < PROJECTION_DAYS; i++) {
    rows.push({
      date: formatDate(addDaysUTC(anchorDate, i + 1)),
      ifPass: projectionIfPass[i],
      ifFail: projectionIfFail[i],
    });
  }

  return rows;
}

/** Colors real history points green (passed) / red (missed); hides on projection-only rows. */
function HistoryDot(props: { cx?: number; cy?: number; payload?: ChartRow }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || payload?.passed === undefined) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={payload.passed ? CHART_COLORS.pass : CHART_COLORS.fail}
      stroke="white"
      strokeWidth={1.5}
    />
  );
}

/** No raw numbers — just the date and Passed/Missed for a real history point. */
function HabitTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string; payload?: ChartRow }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload.find((p) => p.dataKey === "strength")?.payload;
  if (!point || point.passed === undefined) return null;
  return (
    <div className="rounded-xl border border-gray-900/[0.06] bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900">{label}</p>
      <p className={`font-medium ${point.passed ? "text-emerald-600" : "text-red-500"}`}>
        {point.passed ? "Passed" : "Missed"}
      </p>
    </div>
  );
}

/**
 * The habit-strength graph: a normalized 0-1 curve (never raw lock numbers,
 * per the "don't use locks as a visible word" request) with "Habit Formed" at
 * the top and "Not Sticking Yet" at the bottom. Past days are marked with a
 * colored dot (green = passed, red = missed) on a smooth (non-linear) curve;
 * a 14-day dashed projection branches off the last point, green if every day
 * from here passes, red if every day misses — loss aversion made visual, not
 * numeric.
 *
 * `compact` renders a small axis-free preview (for the Goals list card);
 * the full mode (goal detail page) adds axes, tooltip, and a legend.
 */
export function HabitStrengthChart({
  stats,
  today,
  compact = false,
}: {
  stats: GoalStatsDTO;
  today: string;
  compact?: boolean;
}) {
  const data = buildChartData(stats, today);
  const hasHistory = stats.trajectory.length > 0;

  return (
    <div>
      <div className="relative" style={{ height: compact ? 96 : 240 }}>
        {!compact && (
          <>
            <span className="pointer-events-none absolute left-0 top-0 text-[11px] font-semibold text-emerald-600">
              Habit Formed
            </span>
            <span className="pointer-events-none absolute bottom-0 left-0 text-[11px] font-semibold text-gray-400">
              Not Sticking Yet
            </span>
          </>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={compact ? { top: 4, right: 4, bottom: 0, left: 4 } : { top: 22, right: 8, bottom: 4, left: 8 }}
          >
            {!compact && <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />}
            <XAxis
              dataKey="date"
              hide={compact}
              tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.axisLine }}
              minTickGap={28}
            />
            <YAxis domain={[0, 1]} hide />
            {!compact && <Tooltip content={<HabitTooltip />} />}
            <Line
              type="natural"
              dataKey="strength"
              stroke={CHART_COLORS.history}
              strokeWidth={compact ? 2 : 2.5}
              dot={hasHistory ? <HistoryDot /> : false}
              isAnimationActive={false}
            />
            <Line
              type="natural"
              dataKey="ifPass"
              stroke={CHART_COLORS.pass}
              strokeWidth={compact ? 1.5 : 2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="natural"
              dataKey="ifFail"
              stroke={CHART_COLORS.fail}
              strokeWidth={compact ? 1.5 : 2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {!compact && (
        <p className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            If you keep it up
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            If you miss
          </span>
        </p>
      )}
    </div>
  );
}
