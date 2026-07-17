import { GoalTrajectoryService } from "@/domain/services/GoalTrajectoryService";
import { LockCostService } from "@/domain/services/LockCostService";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import { Clock } from "../ports/Clock";

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
 * goal (docs/lock-formula.md §5). `clock` anchors disuse decay (§3.6) — there
 * is no proactive daily job, so a stale goal's stored cost only catches up
 * to its decayed value the next time ANY of the user's check-ins triggers a
 * recompute; a plain UTC date is precise enough for a ~10-day-threshold
 * mechanic, so no per-user timezone is needed here.
 */
export class GoalCostRecomputeService {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly checkInRepository: CheckInRepository,
    private readonly configRepository: ConfigRepository,
    private readonly clock: Clock,
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
    const today = this.clock.now().toISOString().slice(0, 10);

    for (const goalId of uniqueIds) {
      const goal = await this.goalRepository.findById(goalId);
      if (!goal) continue; // Nothing to recompute if the goal no longer exists.

      const trajectory = trajectoryService.trajectoryFor(
        goalId,
        goal.weeklyFrequencyTarget,
        checkIns,
        today,
      );
      goal.recomputeCost(trajectory.finalCost);
      await this.goalRepository.save(goal);
    }
  }
}
