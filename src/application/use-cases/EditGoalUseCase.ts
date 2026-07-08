import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { EditGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";

/**
 * Use Case: rename a goal or change its weekly frequency target. Difficulty
 * is not editable — see Goal.edit's docstring. Ownership is enforced here.
 */
export class EditGoalUseCase {
  constructor(private readonly goalRepository: GoalRepository) {}

  async execute(dto: EditGoalDTO): Promise<GoalDTO> {
    const goal = await this.goalRepository.findById(dto.goalId);
    if (!goal || goal.userId !== dto.userId) {
      throw new GoalNotFoundError(dto.goalId);
    }

    goal.edit({ name: dto.name, weeklyFrequencyTarget: dto.weeklyFrequencyTarget });

    await this.goalRepository.save(goal);

    return GoalMapper.toDTO(goal);
  }
}
