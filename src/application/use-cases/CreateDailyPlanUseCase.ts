import { DailyPlan } from "@/domain/entities/DailyPlan";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { HabitRepository } from "@/domain/repositories/HabitRepository";
import { DailyPlanRepository } from "@/domain/repositories/DailyPlanRepository";
import {
  HabitNotFoundError,
  HabitNotSchedulableError,
  LockBudgetExceededError,
} from "../errors/ApplicationError";
import { CreateDailyPlanDTO, DailyPlanDTO } from "../dtos/DailyPlanDTO";
import { DailyPlanMapper } from "../mappers/DailyPlanMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: build tomorrow's plan from a set of habit ids. The lock cost of
 * each habit is looked up server-side (never trusted from the client) and
 * summed into `locksSpent`, which must not exceed the 100-lock daily budget.
 */
export class CreateDailyPlanUseCase {
  constructor(
    private readonly habitRepository: HabitRepository,
    private readonly dailyPlanRepository: DailyPlanRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: CreateDailyPlanDTO): Promise<DailyPlanDTO> {
    let locksSpent = 0;
    for (const habitId of dto.habitIds) {
      const habit = await this.habitRepository.findById(habitId);
      if (!habit || habit.userId !== dto.userId) {
        throw new HabitNotFoundError(habitId);
      }
      if (habit.state === "paused") {
        throw new HabitNotSchedulableError(habitId);
      }
      locksSpent += habit.currentLockCost;
    }

    if (locksSpent > 100) {
      throw new LockBudgetExceededError(locksSpent);
    }

    const plan = DailyPlan.create({
      id: this.idGenerator.generate(),
      userId: dto.userId,
      date: LocalDate.create(dto.date),
      habitIds: dto.habitIds,
      locksSpent,
      now: this.clock.now(),
    });

    await this.dailyPlanRepository.save(plan);

    return DailyPlanMapper.toDTO(plan);
  }
}
