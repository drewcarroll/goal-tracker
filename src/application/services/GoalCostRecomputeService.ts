import { GoalTrajectoryService } from "@/domain/services/GoalTrajectoryService";
import { LockCostService } from "@/domain/services/LockCostService";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";

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
 */
export class GoalCostRecomputeService {
  private static readonly trajectoryService = new GoalTrajectoryService();
  private static readonly lockCostService = new LockCostService();

  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly checkInRepository: CheckInRepository,
  ) {}

  /** Recompute and persist one goal's cost from its full check-in history. */
  async recompute(userId: string, goalId: string): Promise<void> {
    const goal = await this.goalRepository.findById(goalId);
    if (!goal) return; // Nothing to recompute if the goal no longer exists.

    const checkIns = await this.checkInRepository.findByUserId(userId);
    const trajectory = GoalCostRecomputeService.trajectoryService.trajectoryFor(
      goalId,
      goal.difficulty,
      checkIns,
    );
    const finalCost =
      trajectory.length > 0
        ? trajectory[trajectory.length - 1]!.cost
        : GoalCostRecomputeService.lockCostService.initialCostFor(goal.difficulty);

    goal.recomputeCost(finalCost);
    await this.goalRepository.save(goal);
  }

  /** Recompute several goals (e.g. every goal a check-in touched). */
  async recomputeMany(userId: string, goalIds: readonly string[]): Promise<void> {
    for (const goalId of new Set(goalIds)) {
      await this.recompute(userId, goalId);
    }
  }
}
