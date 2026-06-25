"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { ProgressChartDTO } from "@/application/dtos/ProgressDTO";
import { actualToDate, completionPercent, formatNumber } from "./format";

const COMPLETED_COLOR = "#4f46e5"; // brand
const TRACK_COLOR = "#e5e7eb"; // gray-200

/**
 * Donut showing how far the goal has progressed toward its *projected* end-of-
 * session total: the logged-to-date amount as a share of the projection. The
 * arc fills with the brand colour over a neutral track, with the percentage and
 * raw amounts called out in the centre.
 */
export function SessionCompletionDonut({ chart }: { chart: ProgressChartDTO }) {
  const actual = actualToDate(chart.weeks.map((w) => w.cumulativeActual));
  const projected = chart.projectedTotal;
  const pct = completionPercent(actual, projected);

  const completed = Math.min(actual, projected);
  const remaining = Math.max(projected - actual, 0);
  // Guard the degenerate all-zero case so the ring still renders as an empty track.
  const data =
    completed === 0 && remaining === 0
      ? [{ name: "Remaining", value: 1 }]
      : [
          { name: "Completed", value: completed },
          { name: "Remaining", value: remaining },
        ];

  return (
    <div className="relative h-44 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="68%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            paddingAngle={data.length > 1 ? 2 : 0}
            cornerRadius={6}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((slice) => (
              <Cell
                key={slice.name}
                fill={slice.name === "Completed" ? COMPLETED_COLOR : TRACK_COLOR}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Centred readout, overlaid on the donut hole. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tabular-nums text-gray-900">{pct}%</span>
        <span className="mt-0.5 text-xs font-medium text-gray-500">of projected</span>
        <span className="mt-1 text-xs tabular-nums text-gray-400">
          {formatNumber(actual)} / {formatNumber(projected)} {chart.unit}
        </span>
      </div>
    </div>
  );
}
