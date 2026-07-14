import { Goal } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import { LockCostService } from "@/domain/services/LockCostService";
import { CreateGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: create a single new goal, at the starting lock cost the CURRENT
 * formula config assigns its difficulty (initial costs are dev-tweakable).
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
    const goal = Goal.create({
      id: this.idGenerator.generate(),
      userId: dto.userId,
      name: dto.name,
      weeklyFrequencyTarget: dto.weeklyFrequencyTarget,
      difficulty: dto.difficulty,
      initialLockCost: new LockCostService(config).initialCostFor(
        dto.difficulty,
        dto.weeklyFrequencyTarget,
      ),
      now: this.clock.now(),
    });

    await this.goalRepository.save(goal);

    return GoalMapper.toDTO(goal);
  }
}
