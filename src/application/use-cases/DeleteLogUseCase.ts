import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { LogRepository } from "@/domain/repositories/LogRepository";
import { GoalNotFoundError, LogNotFoundError } from "../errors/ApplicationError";
import { DeleteLogDTO } from "../dtos/HistoryDTO";

/**
 * Use Case: permanently remove a single log entry — the way a user corrects a
 * mistaken entry from the history view. Ownership is enforced here: a caller can
 * only ever delete a log that belongs to one of their own goals.
 */
export class DeleteLogUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly logRepository: LogRepository,
  ) {}

  async execute(dto: DeleteLogDTO): Promise<void> {
    const goal = await this.goalRepository.findById(dto.goalId);
    if (!goal || goal.userId !== dto.userId) {
      throw new GoalNotFoundError(dto.goalId);
    }

    const log = await this.logRepository.findById(dto.logId);
    if (!log || log.userId !== dto.userId || log.goalId !== dto.goalId) {
      throw new LogNotFoundError(dto.logId);
    }

    await this.logRepository.delete(dto.logId);
  }
}
