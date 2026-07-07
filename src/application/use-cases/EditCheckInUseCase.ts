import { CheckIn } from "@/domain/entities/CheckIn";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { HabitRepository } from "@/domain/repositories/HabitRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { CheckInNotFoundError, HabitNotFoundError } from "../errors/ApplicationError";
import { CheckInDTO, HabitMarkDTO } from "../dtos/CheckInDTO";
import { CheckInMapper } from "../mappers/CheckInMapper";
import { HabitCostRecomputeService } from "../services/HabitCostRecomputeService";

export interface EditCheckInDTO {
  userId: string;
  date: string; // YYYY-MM-DD — identifies which existing check-in to correct
  marks: HabitMarkDTO[];
}

/**
 * Use Case: correct an existing day's marks (e.g. you fat-fingered a miss as
 * a pass). Keeps the check-in's id and date, replaces its marks, then
 * recomputes every affected habit's cost from scratch — both the habits in
 * the corrected marks and any that were in the OLD marks but got removed,
 * since their trajectory changed too.
 */
export class EditCheckInUseCase {
  constructor(
    private readonly habitRepository: HabitRepository,
    private readonly checkInRepository: CheckInRepository,
  ) {}

  async execute(dto: EditCheckInDTO): Promise<CheckInDTO> {
    const date = LocalDate.create(dto.date);
    const existing = await this.checkInRepository.findByUserIdAndDate(dto.userId, date);
    if (!existing) {
      throw new CheckInNotFoundError(dto.date);
    }

    for (const mark of dto.marks) {
      const habit = await this.habitRepository.findById(mark.habitId);
      if (!habit || habit.userId !== dto.userId) {
        throw new HabitNotFoundError(mark.habitId);
      }
    }

    const updated = CheckIn.create({
      id: existing.id,
      userId: dto.userId,
      date,
      marks: dto.marks,
      now: existing.createdAt,
    });
    await this.checkInRepository.save(updated);

    const affectedHabitIds = new Set([
      ...existing.marks.map((m) => m.habitId),
      ...dto.marks.map((m) => m.habitId),
    ]);
    const recomputeService = new HabitCostRecomputeService(
      this.habitRepository,
      this.checkInRepository,
    );
    await recomputeService.recomputeMany(dto.userId, [...affectedHabitIds]);

    return CheckInMapper.toDTO(updated);
  }
}
