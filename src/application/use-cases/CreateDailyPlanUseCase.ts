import { DailyPlan } from "@/domain/entities/DailyPlan";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { DailyPlanRepository } from "@/domain/repositories/DailyPlanRepository";
import {
  GoalNotFoundError,
  GoalNotSchedulableError,
  LockBudgetExceededError,
} from "../errors/ApplicationError";
import { CreateDailyPlanDTO, DailyPlanDTO } from "../dtos/DailyPlanDTO";
import { DailyPlanMapper } from "../mappers/DailyPlanMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: build tomorrow's plan from a set of goal ids. The lock cost of
 * each goal is looked up server-side (never trusted from the client) and
 * summed into `locksSpent`, which must not exceed the 100-lock daily budget.
 */
export class CreateDailyPlanUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly dailyPlanRepository: DailyPlanRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: CreateDailyPlanDTO): Promise<DailyPlanDTO> {
    let locksSpent = 0;
    for (const goalId of dto.goalIds) {
      const goal = await this.goalRepository.findById(goalId);
      if (!goal || goal.userId !== dto.userId) {
        throw new GoalNotFoundError(goalId);
      }
      if (goal.state === "paused") {
        throw new GoalNotSchedulableError(goalId);
      }
      locksSpent += goal.currentLockCost;
    }

    if (locksSpent > 100) {
      throw new LockBudgetExceededError(locksSpent);
    }

    const plan = DailyPlan.create({
      id: this.idGenerator.generate(),
      userId: dto.userId,
      date: LocalDate.create(dto.date),
      goalIds: dto.goalIds,
      locksSpent,
      now: this.clock.now(),
    });

    await this.dailyPlanRepository.save(plan);

    return DailyPlanMapper.toDTO(plan);
  }
}
