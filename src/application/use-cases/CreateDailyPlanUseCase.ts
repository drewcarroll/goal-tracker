import { DailyPlan } from "@/domain/entities/DailyPlan";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { DAILY_LOCK_BUDGET } from "@/domain/value-objects/LockCapacity";
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
 * Use Case: build a day's plan from a set of goal ids. The combined key cost
 * of everything scheduled for this one day must fit `DAILY_LOCK_BUDGET`
 * (100) — this is the only place the key budget is enforced; goal
 * creation/resume is always allowed (2026-07-21, user decision: "I should be
 * able to add every goal I ever want, but I can only actually SCHEDULE them
 * unless I have budget for it").
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

    if (locksSpent > DAILY_LOCK_BUDGET) {
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
