import { LocalDate } from "@/domain/value-objects/LocalDate";
import { HabitRepository } from "@/domain/repositories/HabitRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { CheckInNotFoundError } from "../errors/ApplicationError";
import { HabitCostRecomputeService } from "../services/HabitCostRecomputeService";

export interface DeleteCheckInDTO {
  userId: string;
  date: string; // YYYY-MM-DD
}

/**
 * Use Case: delete a check-in (e.g. it was submitted by mistake). Recomputes
 * every habit that was on it, since removing a day from the history shifts
 * every later day's cost for those habits too.
 */
export class DeleteCheckInUseCase {
  constructor(
    private readonly habitRepository: HabitRepository,
    private readonly checkInRepository: CheckInRepository,
  ) {}

  async execute(dto: DeleteCheckInDTO): Promise<void> {
    const date = LocalDate.create(dto.date);
    const existing = await this.checkInRepository.findByUserIdAndDate(dto.userId, date);
    if (!existing) {
      throw new CheckInNotFoundError(dto.date);
    }

    await this.checkInRepository.delete(existing.id);

    const recomputeService = new HabitCostRecomputeService(
      this.habitRepository,
      this.checkInRepository,
    );
    await recomputeService.recomputeMany(
      dto.userId,
      existing.marks.map((m) => m.habitId),
    );
  }
}
