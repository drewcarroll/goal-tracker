import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { DeleteGoalDTO } from "../dtos/GoalDTO";

/**
 * Use Case: permanently remove a goal. Ownership is enforced here. Past
 * check-ins referencing this goal's id are left as historical record (marks
 * are stored inline on the CheckIn, not a foreign key) — they just stop
 * resolving to a live goal in any UI that looks one up.
 */
export class DeleteGoalUseCase {
  constructor(private readonly goalRepository: GoalRepository) {}

  async execute(dto: DeleteGoalDTO): Promise<void> {
    const goal = await this.goalRepository.findById(dto.goalId);
    if (!goal || goal.userId !== dto.userId) {
      throw new GoalNotFoundError(dto.goalId);
    }

    await this.goalRepository.delete(dto.goalId);
  }
}
