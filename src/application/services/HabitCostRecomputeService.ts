import { HabitTrajectoryService } from "@/domain/services/HabitTrajectoryService";
import { LockCostService } from "@/domain/services/LockCostService";
import { HabitRepository } from "@/domain/repositories/HabitRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";

/**
 * Application Service: the single source of truth for keeping
 * `Habit.currentLockCost` consistent with a user's check-in history.
 *
 * Rather than a fragile "apply one incremental step, assume check-ins always
 * arrive in date order" approach, this always replays a habit's ENTIRE
 * check-in history from scratch (via HabitTrajectoryService) and overwrites
 * the stored cost with the result. That makes it correct regardless of
 * whether a check-in was just submitted for today, backfilled for a missed
 * past day, edited, or deleted — every one of those is "the check-in history
 * changed, recompute this habit's cost," the same operation.
 */
export class HabitCostRecomputeService {
  private static readonly trajectoryService = new HabitTrajectoryService();
  private static readonly lockCostService = new LockCostService();

  constructor(
    private readonly habitRepository: HabitRepository,
    private readonly checkInRepository: CheckInRepository,
  ) {}

  /** Recompute and persist one habit's cost from its full check-in history. */
  async recompute(userId: string, habitId: string): Promise<void> {
    const habit = await this.habitRepository.findById(habitId);
    if (!habit) return; // Nothing to recompute if the habit no longer exists.

    const checkIns = await this.checkInRepository.findByUserId(userId);
    const trajectory = HabitCostRecomputeService.trajectoryService.trajectoryFor(
      habitId,
      habit.difficulty,
      checkIns,
    );
    const finalCost =
      trajectory.length > 0
        ? trajectory[trajectory.length - 1]!.cost
        : HabitCostRecomputeService.lockCostService.initialCostFor(habit.difficulty);

    habit.recomputeCost(finalCost);
    await this.habitRepository.save(habit);
  }

  /** Recompute several habits (e.g. every habit a check-in touched). */
  async recomputeMany(userId: string, habitIds: readonly string[]): Promise<void> {
    for (const habitId of new Set(habitIds)) {
      await this.recompute(userId, habitId);
    }
  }
}
