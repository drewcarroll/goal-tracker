import { Progress } from "@/domain/value-objects/Progress";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalDTO, UpdateProgressDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { GoalNotFoundError } from "../errors/ApplicationError";

/**
 * Use Case: update a goal's progress. Business rules (e.g. auto-completion
 * when reaching 100%, rejecting already-completed goals) live in the entity.
 */
export class UpdateGoalProgressUseCase {
  constructor(private readonly goalRepository: GoalRepository) {}

  async execute(dto: UpdateProgressDTO): Promise<GoalDTO> {
    const goal = await this.goalRepository.findById(dto.goalId);
    // Treat "not owned by the caller" the same as "not found" so we never
    // disclose the existence of another user's goal.
    if (!goal || goal.userId !== dto.userId) {
      throw new GoalNotFoundError(dto.goalId);
    }

    goal.updateProgress(Progress.fromPercent(dto.progress));
    await this.goalRepository.save(goal);

    return GoalMapper.toDTO(goal);
  }
}
