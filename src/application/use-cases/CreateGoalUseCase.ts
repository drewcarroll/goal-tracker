import { Goal } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CreateGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/** Use Case: create a single new goal. */
export class CreateGoalUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: CreateGoalDTO): Promise<GoalDTO> {
    const goal = Goal.create({
      id: this.idGenerator.generate(),
      userId: dto.userId,
      name: dto.name,
      weeklyFrequencyTarget: dto.weeklyFrequencyTarget,
      difficulty: dto.difficulty,
      now: this.clock.now(),
    });

    await this.goalRepository.save(goal);

    return GoalMapper.toDTO(goal);
  }
}
