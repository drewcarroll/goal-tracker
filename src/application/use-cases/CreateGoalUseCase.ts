import { Goal } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import { LockCostService } from "@/domain/services/LockCostService";
import { CreateGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: create a single new goal, at the CURRENT formula config's
 * uniform starting lock cost (dev-tweakable) — there is no difficulty
 * guess; the goal's own pass/fail history is what differentiates it from
 * here (docs/lock-formula.md §3.1). Goals are always creatable, with no
 * capacity limit — the key budget only gates SCHEDULING, in
 * `CreateDailyPlanUseCase` (2026-07-21, user decision).
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
    const initialLockCost = new LockCostService(config).initialCostFor(dto.weeklyFrequencyTarget);

    const goal = Goal.create({
      id: this.idGenerator.generate(),
      userId: dto.userId,
      name: dto.name,
      weeklyFrequencyTarget: dto.weeklyFrequencyTarget,
      initialLockCost,
      isPublic: dto.isPublic,
      now: this.clock.now(),
    });

    await this.goalRepository.save(goal);

    return GoalMapper.toDTO(goal);
  }
}
