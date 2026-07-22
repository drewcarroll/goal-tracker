import { Goal } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import { LockCostService } from "@/domain/services/LockCostService";
import { CreateGoalsFromOnboardingDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: bulk-create goals from onboarding's selections. Each selection
 * becomes its own goal at the current formula config's uniform starting lock
 * cost — no difficulty guess. Goals are always creatable with no capacity
 * limit — the key budget only gates SCHEDULING, in `CreateDailyPlanUseCase`
 * (2026-07-21, user decision).
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

    const goals = dto.selections.map((selection) =>
      Goal.create({
        id: this.idGenerator.generate(),
        userId: dto.userId,
        name: selection.name,
        weeklyFrequencyTarget: selection.weeklyFrequencyTarget,
        initialLockCost: lockCostService.initialCostFor(selection.weeklyFrequencyTarget),
        now,
      }),
    );

    for (const goal of goals) {
      await this.goalRepository.save(goal);
    }

    return GoalMapper.toDTOList(goals);
  }
}
