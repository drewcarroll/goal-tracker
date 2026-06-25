import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";

export interface ListGoalsDTO {
  userId: string;
}

/**
 * Use Case: list all goals belonging to a user.
 */
export class ListGoalsUseCase {
  constructor(private readonly goalRepository: GoalRepository) {}

  async execute(dto: ListGoalsDTO): Promise<GoalDTO[]> {
    const goals = await this.goalRepository.findByUserId(dto.userId);
    return GoalMapper.toDTOList(goals);
  }
}
