import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { EditGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { GoalCostRecomputeService } from "../services/GoalCostRecomputeService";

/**
 * Use Case: rename a goal or change its weekly frequency target. Difficulty
 * is not editable — see Goal.edit's docstring. Ownership is enforced here.
 *
 * Changing the target recomputes the lock cost immediately: the commitment
 * multiplier changes AND past misses are re-judged against the new target
 * (docs/lock-formula.md §3.4) — this is the deliberate escape valve for
 * over-ambitious goals: keep 7×/week and pay its price, or lower the target
 * and watch the locks drop.
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
