import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { UpdateGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";

/**
 * Use Case: pause or resume a goal. Ownership is enforced here: a caller can
 * only ever mutate their own goals. For editing name/frequency, see
 * EditGoalUseCase — kept separate per "one use case per action."
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
      goal.resume();
    }

    await this.goalRepository.save(goal);

    return GoalMapper.toDTO(goal);
  }
}
