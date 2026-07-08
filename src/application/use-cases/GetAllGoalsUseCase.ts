import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";

export interface GetAllGoalsDTO {
  userId: string;
}

/**
 * Use Case: list every one of a user's goals, including paused ones — for
 * the goal-management page, where you need to see (and resume) paused goals
 * too. Contrast with GetActiveGoalsUseCase, which excludes paused goals
 * since those shouldn't appear as options when planning a day.
 */
export class GetAllGoalsUseCase {
  constructor(private readonly goalRepository: GoalRepository) {}

  async execute(dto: GetAllGoalsDTO): Promise<GoalDTO[]> {
    const goals = await this.goalRepository.findByUserId(dto.userId);
    return GoalMapper.toDTOList(goals);
  }
}
