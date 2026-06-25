import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { LogRepository } from "@/domain/repositories/LogRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { CreateLogDTO, LogProgressResultDTO } from "../dtos/LogDTO";
import { GoalMapper } from "../mappers/GoalMapper";
import { LogMapper } from "../mappers/LogMapper";
import { Clock } from "../ports/Clock";
import { IdGenerator } from "../ports/IdGenerator";

/**
 * Use Case: log a value of progress against an existing goal for the current
 * week. The week is derived by the goal from "now", so the caller only supplies
 * an amount. Ownership is enforced here: a caller can only ever log against
 * their own goals.
 */
export class LogProgressUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly logRepository: LogRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: CreateLogDTO): Promise<LogProgressResultDTO> {
    const goal = await this.goalRepository.findById(dto.goalId);
    if (!goal || goal.userId !== dto.userId) {
      throw new GoalNotFoundError(dto.goalId);
    }

    const now = this.clock.now();
    const log = goal.logProgress({
      id: this.idGenerator.generate(),
      value: dto.value,
      today: now,
      weekIndex: dto.weekIndex,
      now,
    });

    await this.logRepository.add(log);

    // `logProgress` appended the entry in memory, so the re-derived projection
    // already reflects it — including this week's accumulated total.
    const projection = goal.project(now);
    const weekTotal = projection.weeks[log.weekIndex]?.actual ?? log.value;

    return {
      log: LogMapper.toDTO(log),
      goal: GoalMapper.toDTO(goal, now),
      weekTotal,
    };
  }
}
