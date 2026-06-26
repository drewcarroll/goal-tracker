import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { UpdateGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { Clock } from "../ports/Clock";

/**
 * Use Case: edit an existing goal (name, target, unit, and session window).
 * Ownership is enforced here: a caller can only ever mutate their own goals.
 */
export class UpdateGoalUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly clock: Clock,
  ) {}

  async execute(dto: UpdateGoalDTO): Promise<GoalDTO> {
    const goal = await this.goalRepository.findById(dto.goalId);
    if (!goal || goal.userId !== dto.userId) {
      throw new GoalNotFoundError(dto.goalId);
    }

    goal.edit({
      name: dto.name,
      weeklyTarget: dto.weeklyTarget,
      unit: dto.unit,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });

    await this.goalRepository.save(goal);

    return GoalMapper.toDTO(goal, this.clock.now());
  }
}
