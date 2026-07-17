import Link from "next/link";
import type { BattlePassCalendarDTO } from "@/application/dtos/BattlePassDTO";

function cellClasses(cell: BattlePassCalendarDTO["cells"][number]): string {
  if (cell.claimed) return "border-emerald-200 bg-emerald-50";
  if (cell.claimable) return "border-brand bg-brand/10";
  return "border-gray-200 bg-gray-50 opacity-50";
}

/**
 * The non-invasive horizontal day-by-day strip on Home (user requirement,
 * 2026-07-16). Purely a preview — claiming happens automatically as part of
 * the nightly check-in flow, not by tapping a cell here. Tapping anywhere
 * zooms into the full month view at /trinkets. Truncated days (misses eat
 * days off the end of the month, see BattlePassCalendarService) simply
 * aren't in `calendar.cells` — no greyed-out/failed placeholder for them.
 */
export function BattlePassStrip({ calendar }: { calendar: BattlePassCalendarDTO }) {
  return (
    <Link
      href="/trinkets"
      className="block rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm transition-colors active:bg-gray-50"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-900">Battle Pass</h2>
        <span className="truncate text-xs font-medium text-gray-400">{calendar.theme}</span>
      </div>
      {calendar.cells.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing left to claim this month.</p>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {calendar.cells.map((cell) => (
            <div
              key={cell.date}
              className={`flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-lg border text-xs ${cellClasses(cell)}`}
            >
              <span className="text-base leading-none">
                {cell.kind === "trinket" ? cell.trinketEmoji : "🪙"}
              </span>
              <span className="mt-0.5 text-[10px] font-semibold text-gray-500">{cell.day}</span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
