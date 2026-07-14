import { GoalTrajectoryService } from "@/domain/services/GoalTrajectoryService";
import { LockCostService } from "@/domain/services/LockCostService";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { ConfigRepository } from "@/domain/repositories/ConfigRepository";

/**
 * Application Service: the single source of truth for keeping
 * `Goal.currentLockCost` consistent with a user's check-in history.
 *
 * Rather than a fragile "apply one incremental step, assume check-ins always
 * arrive in date order" approach, this always replays a goal's ENTIRE
 * check-in history from scratch (via GoalTrajectoryService) and overwrites
 * the stored cost with the result. That makes it correct regardless of
 * whether a check-in was just submitted for today, backfilled for a missed
 * past day, edited, or deleted — every one of those is "the check-in history
 * changed, recompute this goal's cost," the same operation.
 *
 * The lock-formula constants are fetched from ConfigRepository at recompute
 * time, so dev-mode tweaks apply retroactively on the next recompute of each
 * goal (docs/lock-formula.md §5).
 */
export class GoalCostRecomputeService {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly checkInRepository: CheckInRepository,
    private readonly configRepository: ConfigRepository,
  ) {}

  /** Recompute and persist one goal's cost from its full check-in history. */
  async recompute(userId: string, goalId: string): Promise<void> {
    await this.recomputeMany(userId, [goalId]);
  }

  /** Recompute several goals (e.g. every goal a check-in touched). */
  async recomputeMany(userId: string, goalIds: readonly string[]): Promise<void> {
    const uniqueIds = [...new Set(goalIds)];
    if (uniqueIds.length === 0) return;

    const config = await this.configRepository.getLockFormulaConfig();
    const trajectoryService = new GoalTrajectoryService(new LockCostService(config));
    const checkIns = await this.checkInRepository.findByUserId(userId);

    for (const goalId of uniqueIds) {
      const goal = await this.goalRepository.findById(goalId);
      if (!goal) continue; // Nothing to recompute if the goal no longer exists.

      const trajectory = trajectoryService.trajectoryFor(goalId, goal.difficulty, checkIns);
      goal.recomputeCost(trajectory.finalCost);
      await this.goalRepository.save(goal);
    }
  }
}
