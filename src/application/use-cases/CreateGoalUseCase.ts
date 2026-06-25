import { Goal } from "@/domain/entities/Goal";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CreateGoalDTO, GoalDTO } from "../dtos/GoalDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { IdGenerator } from "../ports/IdGenerator";

/**
 * Use Case: create a new goal.
 * Single responsibility, single public `execute` method.
 * Dependencies injected via constructor (DI).
 */
export class CreateGoalUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(dto: CreateGoalDTO): Promise<GoalDTO> {
    const goal = Goal.create({
      id: this.idGenerator.generate(),
      userId: dto.userId,
      title: dto.title,
      description: dto.description ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });

    await this.goalRepository.save(goal);

    return GoalMapper.toDTO(goal);
  }
}
