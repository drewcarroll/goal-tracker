"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProgressChartDTO } from "@/application/dtos/ProgressDTO";
import type { WeekKindDTO } from "@/application/dtos/GoalDTO";
import { ChartTooltip } from "./ChartTooltip";
import { formatNumber } from "./format";
import { CHART_COLORS } from "./theme";

interface WeekBar {
  week: string;
  logged: number;
  target: number;
  kind: WeekKindDTO;
}

/** Bar colour by week phase: current pops in emerald, past in brand, future muted. */
function barColor(kind: WeekKindDTO): string {
  if (kind === "current") return CHART_COLORS.actual;
  if (kind === "future") return CHART_COLORS.track;
  return CHART_COLORS.brand;
}

/**
 * Week-by-week comparison of logged amount (bars) against the weekly target
 * (line) across the goal's whole session. Bars are coloured by week phase so the
 * current week stands out and future weeks recede. Driven entirely by the goal's
 * own `weeks`, so a 2-week and a 26-week goal each render their own scale; the
 * ResponsiveContainer plus auto-thinned ticks keep it on-screen without
 * horizontal scroll on a phone.
 */
export function WeekByWeekChart({ chart }: { chart: ProgressChartDTO }) {
  const data: WeekBar[] = chart.weeks.map((w) => ({
    week: `W${w.index + 1}`,
    logged: w.weeklyActual,
    target: w.weeklyTarget,
    kind: w.kind,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.axisLine }}
            interval="preserveStartEnd"
            minTickGap={6}
          />
          <YAxis
            tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={(v: number) => formatNumber(v)}
          />
          <Tooltip
            content={<ChartTooltip unit={chart.unit} />}
            cursor={{ fill: "rgba(79, 70, 229, 0.06)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
          <Bar dataKey="logged" name="Logged" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.week} fill={barColor(d.kind)} />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="target"
            name="Weekly target"
            stroke={CHART_COLORS.target}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
