import { Goal } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import { LockCostService } from "@/domain/services/LockCostService";
import { WEEKLY_LOCK_CAPACITY } from "@/domain/value-objects/LockCapacity";
import { LockCapacityExceededError } from "../errors/ApplicationError";
import { CreateGoalsFromOnboardingDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: bulk-create goals from onboarding's selections. Each selection
 * becomes its own goal at the starting lock cost the current formula config
 * assigns its difficulty. The whole batch must fit the weekly lock capacity
 * alongside anything already active — over-ambition is caught before any
 * goal is created, not halfway through the batch.
 */
export class CreateGoalsFromOnboardingUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly configRepository: ConfigRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: CreateGoalsFromOnboardingDTO): Promise<GoalDTO[]> {
    const now = this.clock.now();
    const config = await this.configRepository.getLockFormulaConfig();
    const lockCostService = new LockCostService(config);

    const existing = await this.goalRepository.findByUserId(dto.userId);
    const activeLocks = existing
      .filter((g) => g.state === "active")
      .reduce((sum, g) => sum + g.currentLockCost, 0);
    const newLocks = dto.selections.reduce(
      (sum, selection) =>
        sum + lockCostService.initialCostFor(selection.difficulty, selection.weeklyFrequencyTarget),
      0,
    );
    if (activeLocks + newLocks > WEEKLY_LOCK_CAPACITY) {
      throw new LockCapacityExceededError(activeLocks + newLocks, WEEKLY_LOCK_CAPACITY);
    }

    const goals = dto.selections.map((selection) =>
      Goal.create({
        id: this.idGenerator.generate(),
        userId: dto.userId,
        name: selection.name,
        weeklyFrequencyTarget: selection.weeklyFrequencyTarget,
        difficulty: selection.difficulty,
        initialLockCost: lockCostService.initialCostFor(
          selection.difficulty,
          selection.weeklyFrequencyTarget,
        ),
        now,
      }),
    );

    for (const goal of goals) {
      await this.goalRepository.save(goal);
    }

    return GoalMapper.toDTOList(goals);
  }
}
