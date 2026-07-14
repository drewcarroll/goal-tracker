import { CheckIn } from "@/domain/entities/CheckIn";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { CheckInNotFoundError, GoalNotFoundError } from "../errors/ApplicationError";
import { CheckInDTO, GoalMarkDTO } from "../dtos/CheckInDTO";
import { CheckInMapper } from "../mappers/CheckInMapper";
import { GoalCostRecomputeService } from "../services/GoalCostRecomputeService";

export interface EditCheckInDTO {
  userId: string;
  date: string; // YYYY-MM-DD — identifies which existing check-in to correct
  marks: GoalMarkDTO[];
}

/**
 * Use Case: correct an existing day's marks (e.g. you fat-fingered a miss as
 * a pass). Keeps the check-in's id, date, createdAt, and on-time flag (an
 * edit can never mint or revoke a rank point), replaces its marks, then
 * recomputes every affected goal's cost from scratch — both the goals in
 * the corrected marks and any that were in the OLD marks but got removed,
 * since their trajectory changed too.
 */
export class EditCheckInUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly checkInRepository: CheckInRepository,
    private readonly recomputeService: GoalCostRecomputeService,
  ) {}

  async execute(dto: EditCheckInDTO): Promise<CheckInDTO> {
    const date = LocalDate.create(dto.date);
    const existing = await this.checkInRepository.findByUserIdAndDate(dto.userId, date);
    if (!existing) {
      throw new CheckInNotFoundError(dto.date);
    }

    for (const mark of dto.marks) {
      const goal = await this.goalRepository.findById(mark.goalId);
      if (!goal || goal.userId !== dto.userId) {
        throw new GoalNotFoundError(mark.goalId);
      }
    }

    const updated = CheckIn.create({
      id: existing.id,
      userId: dto.userId,
      date,
      marks: dto.marks,
      submittedOnTime: existing.submittedOnTime,
      now: existing.createdAt,
    });
    await this.checkInRepository.save(updated);

    const affectedGoalIds = new Set([
      ...existing.marks.map((m) => m.goalId),
      ...dto.marks.map((m) => m.goalId),
    ]);
    await this.recomputeService.recomputeMany(dto.userId, [...affectedGoalIds]);

    return CheckInMapper.toDTO(updated);
  }
}
