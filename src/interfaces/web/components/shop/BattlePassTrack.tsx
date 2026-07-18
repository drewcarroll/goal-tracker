import type { BattlePassCalendarDTO } from "@/application/dtos/BattlePassDTO";
import { CoinIcon, CheckCircleIcon, LockIcon } from "@/interfaces/web/components/icons";

type Cell = BattlePassCalendarDTO["cells"][number];

function nodeClasses(cell: Cell): string {
  if (cell.claimed) return "border-emerald-400 bg-emerald-500";
  if (cell.claimable) return "border-brand bg-brand animate-glow-pulse";
  return "border-gray-200 bg-white";
}

function rowClasses(cell: Cell): string {
  if (cell.claimed) return "border-emerald-200 bg-emerald-50/60";
  if (cell.claimable) return "border-brand/40 bg-brand/5";
  return "border-gray-100 bg-white";
}

/**
 * The battle-pass track: a vertical scrollable list, not a calendar grid —
 * redesigned 2026-07-18 (user feedback: the weekday-grid layout "looks
 * rigid," and the visible-day-count summary text should go). Truncated
 * days (misses eat days off the end of the month) simply never appear —
 * the list just ends, no explicit call-out.
 */
export function BattlePassTrack({ calendar }: { calendar: BattlePassCalendarDTO }) {
  return (
    <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="font-display text-lg font-semibold text-gray-900">{calendar.theme}</h2>

      {calendar.cells.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">Nothing left to claim this month.</p>
      ) : (
        <div className="relative mt-4 max-h-[26rem] overflow-y-auto pr-1">
          <div className="absolute bottom-2 left-[23px] top-2 w-0.5 bg-gray-100" aria-hidden />
          <ul className="relative flex flex-col gap-3">
            {calendar.cells.map((cell) => {
              const milestone = cell.kind === "trinket";
              return (
                <li key={cell.date} className="flex items-center gap-3">
                  <div
                    className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${nodeClasses(cell)}`}
                  >
                    {cell.claimed ? (
                      <CheckCircleIcon className="h-7 w-7 text-white" />
                    ) : cell.claimable ? (
                      <span className="font-display text-base font-bold text-white">{cell.day}</span>
                    ) : (
                      <>
                        <span className="font-display text-sm font-bold text-gray-400">{cell.day}</span>
                        <LockIcon className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white text-gray-300" />
                      </>
                    )}
                  </div>

                  <div
                    className={`flex flex-1 items-center justify-between gap-2 rounded-xl border-2 px-3 py-2.5 ${rowClasses(cell)} ${milestone ? "ring-1 ring-amber-300/60" : ""}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`leading-none ${milestone ? "text-2xl" : "text-xl"}`}>
                        {milestone ? cell.trinketEmoji : <CoinIcon className="h-5 w-5 text-amber-500" />}
                      </span>
                      <span className="min-w-0 truncate text-sm font-semibold text-gray-900">
                        {milestone ? cell.trinketName : `+${cell.coinAmount}`}
                      </span>
                    </span>
                    {milestone && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">
                        Milestone
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
