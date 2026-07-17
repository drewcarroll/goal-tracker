import { DailyPlan } from "@/domain/entities/DailyPlan";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { DailyPlanRepository } from "@/domain/repositories/DailyPlanRepository";
import { GoalNotFoundError, GoalNotSchedulableError } from "../errors/ApplicationError";
import { CreateDailyPlanDTO, DailyPlanDTO } from "../dtos/DailyPlanDTO";
import { DailyPlanMapper } from "../mappers/DailyPlanMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: build a day's plan from a set of goal ids. No per-day key cap
 * (removed 2026-07-18, user decision: "daily should be uncapped") — every
 * goal can be scheduled on the same day, since no goal can appear more than
 * once per day anyway. `locksSpent` is still recorded (display only) as the
 * sum of each scheduled goal's cost.
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
