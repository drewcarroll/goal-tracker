/**
 * XP granted per on-time nightly log. Logs are the only XP source, so this is
 * purely presentation-scale: 1 log = 500 XP keeps numbers satisfying without
 * inventing new earning mechanics.
 */
export const XP_PER_LOG = 500;

/**
 * The rank progression formula (docs/progression.md §2):
 *
 *   c(k) = max(1, round(C − (C − 1) · r^(k−1)))
 *
 * c(k) is how many logs it takes to go from rank k to rank k+1. c(1) = 1, so
 * the very first log ranks a newcomer up (the highest-leverage reward moment).
 * Costs then ramp smoothly (2, 3, 4, 5, 5, 5, 6, ...) and flatten to the
 * steady state C, so the cumulative curve becomes linear: one rank per C logs,
 * forever. No plateau of despair, no infinite exponential.
 */
export const RANK_FORMULA = {
  /** Steady-state logs per rank-up (C). One rank per week at 7. */
  steadyCost: 7,
  /** Ramp smoothness (r, 0..1). Larger = more early rank-ups. */
  ramp: 0.8,
} as const;

export interface RankProgress {
  /** Current rank, 1-based. A brand-new user is Rank 1 with zero logs. */
  rank: number;
  /** Total XP earned (logs × XP_PER_LOG). */
  xp: number;
  /** XP earned toward the current rank-up. */
  xpIntoRank: number;
  /** Total XP the current rank-up requires. */
  xpForRankUp: number;
}

/**
 * Domain service for the rank progression. XP comes from submitting the
 * nightly check-in on time, never from passing goals (that's the locks
 * track). Failure earns nothing and costs nothing here; there are no streaks.
 */
export class RankService {
  /** Logs required to advance FROM `rank` to the next one: c(k) above. */
  costOfRankUp(rank: number): number {
    const { steadyCost, ramp } = RANK_FORMULA;
    return Math.max(1, Math.round(steadyCost - (steadyCost - 1) * Math.pow(ramp, rank - 1)));
  }

  /** Full progression state for a cumulative on-time log count. */
  progressFor(logs: number): RankProgress {
    let rank = 1;
    let remaining = logs;
    while (remaining >= this.costOfRankUp(rank)) {
      remaining -= this.costOfRankUp(rank);
      rank += 1;
    }
    return {
      rank,
      xp: logs * XP_PER_LOG,
      xpIntoRank: remaining * XP_PER_LOG,
      xpForRankUp: this.costOfRankUp(rank) * XP_PER_LOG,
    };
  }
}
