import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";

export interface DeleteGoalDTO {
  /** Owner of the goal — used to enforce that callers only delete their own data. */
  userId: string;
  goalId: string;
}

/**
 * Use Case: delete a goal (and, via the DB cascade, its session and logs).
 * Ownership is enforced here: a caller can only ever delete their own goals.
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
