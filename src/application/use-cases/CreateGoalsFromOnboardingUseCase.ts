import { Goal } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CreateGoalsFromOnboardingDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: bulk-create goals from onboarding's selections. Each selection
 * becomes its own goal at that difficulty's starting lock cost.
 */
export class CreateGoalsFromOnboardingUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: CreateGoalsFromOnboardingDTO): Promise<GoalDTO[]> {
    const now = this.clock.now();
    const goals = dto.selections.map((selection) =>
      Goal.create({
        id: this.idGenerator.generate(),
        userId: dto.userId,
        name: selection.name,
        weeklyFrequencyTarget: selection.weeklyFrequencyTarget,
        difficulty: selection.difficulty,
        now,
      }),
    );

    for (const goal of goals) {
      await this.goalRepository.save(goal);
    }

    return GoalMapper.toDTOList(goals);
  }
}
