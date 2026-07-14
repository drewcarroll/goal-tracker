import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { GoalCostRecomputeService } from "../services/GoalCostRecomputeService";

/**
 * Use Case: force-refresh every one of the user's goals against the current
 * formula config — the dev panel's "Recompute all goals" button after tuning
 * constants. (Without this, a stored cost only refreshes the next time that
 * goal's check-in history changes.) Config is global but goals are per-user;
 * in this single-user app that's the whole world.
 */
export class RecomputeAllGoalsUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly recomputeService: GoalCostRecomputeService,
  ) {}

  async execute(dto: { userId: string }): Promise<{ recomputed: number }> {
    const goals = await this.goalRepository.findByUserId(dto.userId);
    await this.recomputeService.recomputeMany(
      dto.userId,
      goals.map((goal) => goal.id),
    );
    return { recomputed: goals.length };
  }
}
