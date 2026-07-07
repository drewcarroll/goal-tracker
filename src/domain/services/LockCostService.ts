export type HabitDifficulty = "easy" | "medium" | "hard";

const INITIAL_COST: Record<HabitDifficulty, number> = {
  easy: 25,
  medium: 35,
  hard: 45,
};

const MIN_COST = 1;
const MAX_COST = 50;

/**
 * Domain service owning the lock-cost trajectory: the mechanic that makes a
 * habit "cheaper" (closer to formed) on a passed day and "more expensive"
 * (harder to justify scheduling) on a failed day. Stateless; shared across
 * Habit instances the same way ProjectionService is shared across Goals.
 *
 * No streaks, no punishment beyond cost — see docs/plan.md's non-negotiable
 * design rules.
 */
export class LockCostService {
  /** Starting cost for a newly-created habit, based on its assigned difficulty. */
  initialCostFor(difficulty: HabitDifficulty): number {
    return INITIAL_COST[difficulty];
  }

  /**
   * The next lock cost after a day's result. A pass nudges the habit toward
   * "formed" (cost 1); a fail makes it 10% more expensive, rounded, capped at
   * 50 so no habit becomes unschedulable.
   */
  nextCost(currentCost: number, dayResult: "PASS" | "FAIL"): number {
    if (dayResult === "PASS") {
      return Math.max(MIN_COST, currentCost - 1);
    }
    return Math.min(MAX_COST, Math.round(currentCost * 1.1));
  }

  /** A habit is "formed" once its cost has been driven all the way down to 1. */
  isFormed(cost: number): boolean {
    return cost <= MIN_COST;
  }
}
