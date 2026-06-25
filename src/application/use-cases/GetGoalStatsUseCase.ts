import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalStatsService } from "@/domain/services/GoalStatsService";
import { GoalStatsDTO } from "../dtos/GoalDTO";

export interface GetGoalStatsDTO {
  userId: string;
}

/**
 * Use Case: compute aggregate statistics for a user's goals.
 * Delegates the calculation to the domain service.
 */
export class GetGoalStatsUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly goalStatsService: GoalStatsService,
  ) {}

  async execute(dto: GetGoalStatsDTO): Promise<GoalStatsDTO> {
    const goals = await this.goalRepository.findByUserId(dto.userId);
    return this.goalStatsService.compute(goals);
  }
}
