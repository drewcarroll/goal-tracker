import { CheckIn } from "../entities/CheckIn";
import { LockCostService, type HabitDifficulty } from "./LockCostService";

export interface TrajectoryPoint {
  date: string; // YYYY-MM-DD
  cost: number;
}

/**
 * Domain service that reconstructs a habit's lock-cost history. There is no
 * cost-history table — `Habit.currentLockCost` only ever holds the latest
 * value — so the trajectory is rebuilt by replaying every check-in that
 * included the habit, oldest first, through LockCostService starting from
 * the habit's difficulty's initial cost. Stateless; shared the same way
 * ProjectionService is shared across Goals.
 */
export class HabitTrajectoryService {
  private static readonly lockCostService = new LockCostService();

  /**
   * `checkIns` should already be filtered to ones involving `habitId` — this
   * service only orders and replays them, it doesn't know which check-ins
   * exist for a user (that's a repository concern).
   */
  trajectoryFor(
    habitId: string,
    difficulty: HabitDifficulty,
    checkIns: readonly CheckIn[],
  ): TrajectoryPoint[] {
    const ordered = [...checkIns]
      .filter((c) => c.markFor(habitId) !== undefined)
      .sort((a, b) => (a.date.isBefore(b.date) ? -1 : a.date.equals(b.date) ? 0 : 1));

    let cost = HabitTrajectoryService.lockCostService.initialCostFor(difficulty);
    return ordered.map((checkIn) => {
      cost = HabitTrajectoryService.lockCostService.nextCost(cost, checkIn.dayResult);
      return { date: checkIn.date.toString(), cost };
    });
  }
}
