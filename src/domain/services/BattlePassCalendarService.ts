import { DeterministicRewardService } from "./DeterministicRewardService";
import type { BattlePassMonthDefinition, BattlePassTrinketDay } from "../value-objects/BattlePassCalendarMap";
import type { EconomyConfig } from "../value-objects/EconomyConfig";

export type BattlePassDayCell =
  | {
      day: number;
      date: string;
      kind: "coins";
      coinAmount: number;
      claimed: boolean;
      claimable: boolean;
    }
  | {
      day: number;
      date: string;
      kind: "trinket";
      trinketId: string;
      claimed: boolean;
      claimable: boolean;
    };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * The battle-pass calendar's core math: which days are even shown, and what
 * each one rewards. Two rules drive everything here:
 *
 * 1. Truncation (user's own literal wording, 2026-07-16): a month has ~30-31
 *    reward days. Each day with no ON-TIME check-in permanently truncates
 *    ONE day off the END of that month's calendar — "no reason to show it,
 *    that'll just make you sad". visibleDayCount = max(0, daysInMonth - misses).
 *    Truncated days are never rendered (no greyed-out/failed state).
 * 2. Reward rolls are deterministic per (userId, date) via
 *    DeterministicRewardService, so the same day always rewards the same
 *    amount without needing to persist "what was rolled" ahead of a claim.
 */
export class BattlePassCalendarService {
  constructor(private readonly rewardService: DeterministicRewardService) {}

  daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  visibleDayCount(daysInMonth: number, missesSoFar: number): number {
    return Math.max(0, daysInMonth - missesSoFar);
  }

  /**
   * Counts calendar days in (year, month), up through `todayDate` (inclusive),
   * with no on-time check-in. Days after `todayDate` haven't happened yet and
   * can never count as a miss — so a future month always returns 0, and the
   * current month grows by at most 1 per day.
   */
  countMisses(params: {
    year: number;
    month: number;
    todayDate: string;
    onTimeCheckInDates: ReadonlySet<string>;
  }): number {
    const totalDays = this.daysInMonth(params.year, params.month);
    let misses = 0;
    for (let day = 1; day <= totalDays; day++) {
      const date = `${params.year}-${pad(params.month)}-${pad(day)}`;
      if (date > params.todayDate) break;
      if (!params.onTimeCheckInDates.has(date)) misses++;
    }
    return misses;
  }

  buildCalendar(params: {
    year: number;
    month: number;
    missesSoFar: number;
    monthDefinition: BattlePassMonthDefinition;
    claimedDates: ReadonlySet<string>;
    todayDate: string;
    userId: string;
    economyConfig: EconomyConfig;
  }): BattlePassDayCell[] {
    const totalDays = this.daysInMonth(params.year, params.month);
    const visible = this.visibleDayCount(totalDays, params.missesSoFar);
    const cells: BattlePassDayCell[] = [];

    for (let day = 1; day <= visible; day++) {
      const date = `${params.year}-${pad(params.month)}-${pad(day)}`;
      const claimed = params.claimedDates.has(date);
      const claimable = !claimed && date <= params.todayDate;
      const trinket = params.monthDefinition.trinketByDay[day as BattlePassTrinketDay];

      if (trinket) {
        cells.push({ day, date, kind: "trinket", trinketId: trinket.id, claimed, claimable });
      } else {
        const coinAmount = this.rewardService.weightedPick(`bp-coins:${params.userId}:${date}`, [
          {
            value: params.economyConfig.coinsLowAmount,
            weight: 1 - params.economyConfig.coinsHighProbability,
          },
          {
            value: params.economyConfig.coinsHighAmount,
            weight: params.economyConfig.coinsHighProbability,
          },
        ]);
        cells.push({ day, date, kind: "coins", coinAmount, claimed, claimable });
      }
    }

    return cells;
  }
}
