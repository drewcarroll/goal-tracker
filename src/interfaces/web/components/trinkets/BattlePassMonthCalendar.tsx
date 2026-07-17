import type { BattlePassCalendarDTO } from "@/application/dtos/BattlePassDTO";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function cellClasses(cell: BattlePassCalendarDTO["cells"][number]): string {
  if (cell.claimed) return "border-emerald-300 bg-emerald-50";
  if (cell.claimable) return "border-brand bg-brand/10";
  return "border-gray-200 bg-gray-50 opacity-50";
}

/**
 * The full month zoom-in, aligned to weekday columns. Only days
 * 1..visibleDayCount ever appear in `calendar.cells` — a month eaten short
 * by misses just ends early on the grid, with no placeholder for the
 * truncated days (user requirement, 2026-07-16: "no reason to show it,
 * that'll just make you sad").
 */
export function BattlePassMonthCalendar({
  calendar,
  firstWeekdayIndex,
}: {
  calendar: BattlePassCalendarDTO;
  /** Monday = 0 … Sunday = 6, the weekday the 1st of this month falls on. */
  firstWeekdayIndex: number;
}) {
  const cellsByDay = new Map(calendar.cells.map((cell) => [cell.day, cell]));
  const totalCells = firstWeekdayIndex + calendar.daysInMonth;

  return (
    <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{calendar.theme}</h2>
          <p className="text-xs text-gray-500">
            {calendar.visibleDayCount} of {calendar.daysInMonth} days claimable this month
            {calendar.missesSoFar > 0 &&
              ` · ${calendar.missesSoFar} missed day${calendar.missesSoFar === 1 ? "" : "s"} truncated the end`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: totalCells }, (_, index) => {
          const day = index - firstWeekdayIndex + 1;
          if (day < 1) return <div key={`blank-${index}`} />;
          const cell = cellsByDay.get(day);
          if (!cell) return null; // truncated — rendered as nothing, not a failed marker
          return (
            <div
              key={day}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-xs ${cellClasses(cell)}`}
            >
              <span className="text-lg leading-none">
                {cell.kind === "trinket" ? cell.trinketEmoji : "🪙"}
              </span>
              <span className="mt-0.5 text-[10px] font-semibold text-gray-500">{cell.day}</span>
              {cell.kind === "coins" && (
                <span className="text-[9px] text-gray-400">+{cell.coinAmount}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-50" /> Claimed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-brand bg-brand/10" /> Ready
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-gray-200 bg-gray-50 opacity-50" /> Not yet
        </span>
      </div>
    </div>
  );
}
