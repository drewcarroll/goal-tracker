"use client";

import { useEffect, useRef } from "react";
import type { BattlePassCalendarDTO } from "@/application/dtos/BattlePassDTO";
import { CoinIcon, CheckCircleIcon, LockIcon } from "@/interfaces/web/components/icons";

type Cell = BattlePassCalendarDTO["cells"][number];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function nodeClasses(cell: Cell): string {
  if (cell.claimed) return "border-emerald-400 bg-emerald-500";
  if (cell.claimable) return "border-brand bg-brand animate-glow-pulse";
  return "border-gray-200 bg-white";
}

/**
 * The battle-pass track — redesigned 2026-07-21 (feedback: too big, doesn't
 * show where you are, generic seasonal theming, an overflowing glow
 * animation on the vertical list). Now a compact horizontal strip
 * auto-scrolled to today, a dynamic "{Month} {Year} Rewards" header (no
 * more literal theme strings like "Independence Day / summer" — `theme`
 * stays in the domain data, just isn't surfaced here), and a "days logged"
 * stat using data the DTO already computed but the prior vertical-list
 * design never rendered (visibleDayCount). Truncated (missed) days simply
 * never appear — the strip just ends, no explicit call-out.
 */
export function BattlePassTrack({
  calendar,
  todayDate,
}: {
  calendar: BattlePassCalendarDTO;
  todayDate: string;
}) {
  const todayRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    todayRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [calendar.year, calendar.month]);

  const claimedCount = calendar.cells.filter((cell) => cell.claimed).length;
  const title = `${MONTH_NAMES[calendar.month - 1]} ${calendar.year} Rewards`;

  return (
    <div className="rounded-2xl border border-gray-900/[0.06] bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold text-gray-900">{title}</h2>
        <span className="shrink-0 text-xs font-medium text-gray-500">
          {claimedCount}/{calendar.visibleDayCount} days logged
        </span>
      </div>

      {calendar.cells.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">Nothing left to claim this month.</p>
      ) : (
        <ul className="-mx-1 mt-3 flex gap-2.5 overflow-x-auto px-1 py-2">
          {calendar.cells.map((cell) => {
            const isToday = cell.date === todayDate;
            const milestone = cell.kind === "trinket";
            return (
              <li
                key={cell.date}
                ref={isToday ? todayRef : undefined}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <div
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 ${nodeClasses(cell)} ${
                    isToday ? "ring-2 ring-brand/50 ring-offset-2" : ""
                  }`}
                >
                  {cell.claimed ? (
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  ) : cell.claimable ? (
                    <span className="font-display text-sm font-bold text-white">{cell.day}</span>
                  ) : (
                    <>
                      <span className="font-display text-xs font-bold text-gray-400">{cell.day}</span>
                      <LockIcon className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white text-gray-300" />
                    </>
                  )}
                </div>
                <span
                  className={`flex h-5 items-center gap-0.5 text-[10px] font-bold ${
                    milestone ? "text-amber-600" : "text-gray-500"
                  }`}
                >
                  {milestone ? (
                    <span className="text-sm leading-none">{cell.trinketEmoji}</span>
                  ) : (
                    <>
                      <CoinIcon className="h-3 w-3 text-amber-500" />
                      {cell.coinAmount}
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
