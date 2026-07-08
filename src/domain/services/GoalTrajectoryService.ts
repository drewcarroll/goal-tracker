import { CheckIn } from "../entities/CheckIn";
import { LockCostService, type GoalDifficulty } from "./LockCostService";

export interface TrajectoryPoint {
  date: string; // YYYY-MM-DD
  cost: number;
}

/**
 * Domain service that reconstructs a goal's lock-cost history. There is no
 * cost-history table — `Goal.currentLockCost` only ever holds the latest
 * value — so the trajectory is rebuilt by replaying every check-in that
 * included the goal, oldest first, through LockCostService starting from
 * the goal's difficulty's initial cost. Stateless; shared the same way
 * LockCostService is shared across Goal instances.
 */
export class GoalTrajectoryService {
  private static readonly lockCostService = new LockCostService();

  /**
   * `checkIns` should already be filtered to ones involving `goalId` — this
   * service only orders and replays them, it doesn't know which check-ins
   * exist for a user (that's a repository concern).
   */
  trajectoryFor(
    goalId: string,
    difficulty: GoalDifficulty,
    checkIns: readonly CheckIn[],
  ): TrajectoryPoint[] {
    const ordered = [...checkIns]
      .filter((c) => c.markFor(goalId) !== undefined)
      .sort((a, b) => (a.date.isBefore(b.date) ? -1 : a.date.equals(b.date) ? 0 : 1));

    let cost = GoalTrajectoryService.lockCostService.initialCostFor(difficulty);
    return ordered.map((checkIn) => {
      cost = GoalTrajectoryService.lockCostService.nextCost(cost, checkIn.dayResult);
      return { date: checkIn.date.toString(), cost };
    });
  }
}
