import { Goal } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import { LockCostService } from "@/domain/services/LockCostService";
import { WEEKLY_LOCK_CAPACITY } from "@/domain/value-objects/LockCapacity";
import { LockCapacityExceededError } from "../errors/ApplicationError";
import { CreateGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: create a single new goal, at the starting lock cost the CURRENT
 * formula config assigns its difficulty (initial costs are dev-tweakable).
 * Blocked when the new goal would overflow the weekly lock capacity — taking
 * on more commitment requires making room first.
 */
export class CreateGoalUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly configRepository: ConfigRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: CreateGoalDTO): Promise<GoalDTO> {
    const config = await this.configRepository.getLockFormulaConfig();
    const initialLockCost = new LockCostService(config).initialCostFor(
      dto.difficulty,
      dto.weeklyFrequencyTarget,
    );

    const existing = await this.goalRepository.findByUserId(dto.userId);
    const activeLocks = existing
      .filter((g) => g.state === "active")
      .reduce((sum, g) => sum + g.currentLockCost, 0);
    if (activeLocks + initialLockCost > WEEKLY_LOCK_CAPACITY) {
      throw new LockCapacityExceededError(activeLocks + initialLockCost, WEEKLY_LOCK_CAPACITY);
    }

    const goal = Goal.create({
      id: this.idGenerator.generate(),
      userId: dto.userId,
      name: dto.name,
      weeklyFrequencyTarget: dto.weeklyFrequencyTarget,
      difficulty: dto.difficulty,
      initialLockCost,
      now: this.clock.now(),
    });

    await this.goalRepository.save(goal);

    return GoalMapper.toDTO(goal);
  }
}
