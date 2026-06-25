"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProgressChartDTO } from "@/application/dtos/ProgressDTO";
import { formatNumber } from "./format";

const PROJECTED_COLOR = "#4f46e5"; // brand
const ACTUAL_COLOR = "#10b981"; // emerald-500
const TARGET_COLOR = "#9ca3af"; // gray-400

interface ChartPoint {
  week: string;
  actual: number | null;
  projected: number;
  target: number;
}

/** Tooltip styled to match the app's cards rather than Recharts' default. */
function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | null; color?: string }>;
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-gray-900">{label}</p>
      <ul className="flex flex-col gap-0.5">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center gap-1.5 tabular-nums text-gray-600">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-500">{entry.name}:</span>
            <span className="font-medium text-gray-900">
              {entry.value === null || entry.value === undefined
                ? "—"
                : `${formatNumber(entry.value)} ${unit}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Line chart of cumulative actuals vs. cumulative projection across the
 * session's weeks. The actual line stops at the current week (future weeks have
 * no data yet); the projection runs the full session, with a faint dashed
 * target line as the even-pace reference.
 */
export function CumulativeProgressChart({ chart }: { chart: ProgressChartDTO }) {
  const data: ChartPoint[] = chart.weeks.map((w) => ({
    week: `W${w.index + 1}`,
    actual: w.cumulativeActual,
    projected: w.cumulativeProjected,
    target: w.cumulativeTarget,
  }));

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={(v: number) => formatNumber(v)}
          />
          <Tooltip
            content={<ChartTooltip unit={chart.unit} />}
            cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
          />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
          <Line
            type="monotone"
            dataKey="target"
            name="Target pace"
            stroke={TARGET_COLOR}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            name="Projected"
            stroke={PROJECTED_COLOR}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke={ACTUAL_COLOR}
            strokeWidth={2.5}
            dot={{ r: 3, fill: ACTUAL_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
