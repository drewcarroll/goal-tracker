import { Goal } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CreateGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { Clock } from "../ports/Clock";
import { IdGenerator } from "../ports/IdGenerator";

/**
 * Use Case: create a new goal together with its session window.
 * Single responsibility, single public `execute` method.
 * Dependencies injected via constructor (DI).
 */
export class CreateGoalUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: CreateGoalDTO): Promise<GoalDTO> {
    const goal = Goal.create({
      id: this.idGenerator.generate(),
      sessionId: this.idGenerator.generate(),
      userId: dto.userId,
      name: dto.name,
      targetValue: dto.targetValue,
      unit: dto.unit,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });

    await this.goalRepository.save(goal);

    return GoalMapper.toDTO(goal, this.clock.now());
  }
}
