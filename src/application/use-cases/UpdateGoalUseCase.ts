import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { WEEKLY_LOCK_CAPACITY } from "@/domain/value-objects/LockCapacity";
import { GoalNotFoundError, LockCapacityExceededError } from "../errors/ApplicationError";
import { UpdateGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";

/**
 * Use Case: pause or resume a goal. Ownership is enforced here: a caller can
 * only ever mutate their own goals. For editing name/frequency, see
 * EditGoalUseCase — kept separate per "one use case per action."
 * Resuming is blocked when the goal no longer fits the weekly capacity.
 */
export class UpdateGoalUseCase {
  constructor(private readonly goalRepository: GoalRepository) {}

  async execute(dto: UpdateGoalDTO): Promise<GoalDTO> {
    const goal = await this.goalRepository.findById(dto.goalId);
    if (!goal || goal.userId !== dto.userId) {
      throw new GoalNotFoundError(dto.goalId);
    }

    if (dto.action === "pause") {
      goal.pause();
    } else {
      const others = await this.goalRepository.findByUserId(dto.userId);
      const activeLocks = others
        .filter((g) => g.state === "active" && g.id !== goal.id)
        .reduce((sum, g) => sum + g.currentLockCost, 0);
      if (activeLocks + goal.currentLockCost > WEEKLY_LOCK_CAPACITY) {
        throw new LockCapacityExceededError(
          activeLocks + goal.currentLockCost,
          WEEKLY_LOCK_CAPACITY,
        );
      }
      goal.resume();
    }

    await this.goalRepository.save(goal);

    return GoalMapper.toDTO(goal);
  }
}
