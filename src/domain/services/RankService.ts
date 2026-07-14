/**
 * Cumulative on-time nightly logs needed for each rank. Rank = number of
 * thresholds ≤ points, so 0 points is already Rank 1 (the "day 0 rank up"),
 * 3 points is Rank 2, and so on. Extend the array to add ranks; see
 * docs/progression.md §2.
 */
export const RANK_THRESHOLDS: readonly number[] = [
  0, 3, 7, 12, 20, 30, 40, 50, 65, 80, 100, 120, 145, 170, 200,
];

/**
 * Domain service for the rank progression. Points come from submitting the
 * nightly check-in on time — never from passing goals (that's the locks
 * track). Failure earns nothing and costs nothing here; there are no streaks.
 */
export class RankService {
  /** Rank for a points total (1-based; 0 points → Rank 1). */
  rankFor(points: number): number {
    return RANK_THRESHOLDS.filter((threshold) => threshold <= points).length;
  }

  /** Points needed for the next rank, or null if already at the top rank. */
  nextThreshold(points: number): number | null {
    return RANK_THRESHOLDS.find((threshold) => threshold > points) ?? null;
  }

  get maxRank(): number {
    return RANK_THRESHOLDS.length;
  }
}
