import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";

export interface GetActiveGoalsDTO {
  userId: string;
}

/**
 * Use Case: list a user's schedulable goals — active or already formed, but
 * not paused. Paused goals are excluded since they should not appear as
 * options when building tomorrow's plan.
 */
export class GetActiveGoalsUseCase {
  constructor(private readonly goalRepository: GoalRepository) {}

  async execute(dto: GetActiveGoalsDTO): Promise<GoalDTO[]> {
    const goals = await this.goalRepository.findByUserId(dto.userId);
    const schedulable = goals.filter((goal) => goal.state !== "paused");
    return GoalMapper.toDTOList(schedulable);
  }
}
