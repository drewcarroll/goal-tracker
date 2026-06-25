import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { Clock } from "../ports/Clock";

export interface ListGoalsDTO {
  userId: string;
}

/**
 * Use Case: list all goals belonging to a user.
 */
export class ListGoalsUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly clock: Clock,
  ) {}

  async execute(dto: ListGoalsDTO): Promise<GoalDTO[]> {
    const goals = await this.goalRepository.findByUserId(dto.userId);
    return GoalMapper.toDTOList(goals, this.clock.now());
  }
}
