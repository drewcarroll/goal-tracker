import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { EditGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { GoalCostRecomputeService } from "../services/GoalCostRecomputeService";

/**
 * Use Case: rename a goal or change its weekly frequency target. Difficulty
 * is not editable — see Goal.edit's docstring. Ownership is enforced here.
 *
 * Changing the target recomputes the lock cost immediately via the
 * commitment multiplier φ (docs/lock-formula.md §3.4): lower the target and
 * the goal gets cheaper to hold, raise it and it costs more. Editing is
 * always allowed, even mid-week, because it can never erase a miss — misses
 * always take the fail step regardless of target, so there is nothing to
 * cheat by editing at the last minute.
 */
export class EditGoalUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly recomputeService: GoalCostRecomputeService,
  ) {}

  async execute(dto: EditGoalDTO): Promise<GoalDTO> {
    const goal = await this.goalRepository.findById(dto.goalId);
    if (!goal || goal.userId !== dto.userId) {
      throw new GoalNotFoundError(dto.goalId);
    }

    const targetChanged = goal.weeklyFrequencyTarget !== dto.weeklyFrequencyTarget;
    goal.edit({ name: dto.name, weeklyFrequencyTarget: dto.weeklyFrequencyTarget });
    await this.goalRepository.save(goal);

    if (targetChanged) {
      await this.recomputeService.recompute(dto.userId, goal.id);
      const recomputed = await this.goalRepository.findById(goal.id);
      return GoalMapper.toDTO(recomputed ?? goal);
    }
    return GoalMapper.toDTO(goal);
  }
}
