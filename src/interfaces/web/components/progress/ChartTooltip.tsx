"use client";

import { formatNumber } from "./format";

interface TooltipEntry {
  name?: string;
  value?: number | null;
  color?: string;
}

/**
 * Tooltip styled to match the app's cards rather than Recharts' default.
 * Shared across the progress charts. Pass via `content={<ChartTooltip unit=… />}`;
 * Recharts injects `active`, `payload`, and `label` at render time.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
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
