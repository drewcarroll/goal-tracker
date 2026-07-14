import { LocalDate } from "@/domain/value-objects/LocalDate";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { CheckInNotFoundError } from "../errors/ApplicationError";
import { GoalCostRecomputeService } from "../services/GoalCostRecomputeService";

export interface DeleteCheckInDTO {
  userId: string;
  date: string; // YYYY-MM-DD
}

/**
 * Use Case: delete a check-in (e.g. it was submitted by mistake). Recomputes
 * every goal that was on it, since removing a day from the history shifts
 * every later day's cost for those goals too.
 */
export class DeleteCheckInUseCase {
  constructor(
    private readonly checkInRepository: CheckInRepository,
    private readonly recomputeService: GoalCostRecomputeService,
  ) {}

  async execute(dto: DeleteCheckInDTO): Promise<void> {
    const date = LocalDate.create(dto.date);
    const existing = await this.checkInRepository.findByUserIdAndDate(dto.userId, date);
    if (!existing) {
      throw new CheckInNotFoundError(dto.date);
    }

    await this.checkInRepository.delete(existing.id);
    await this.recomputeService.recomputeMany(
      dto.userId,
      existing.marks.map((m) => m.goalId),
    );
  }
}
