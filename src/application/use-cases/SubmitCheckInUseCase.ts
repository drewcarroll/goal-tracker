import { CheckIn } from "@/domain/entities/CheckIn";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { HabitRepository } from "@/domain/repositories/HabitRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { HabitNotFoundError } from "../errors/ApplicationError";
import { SubmitCheckInDTO, CheckInDTO } from "../dtos/CheckInDTO";
import { CheckInMapper } from "../mappers/CheckInMapper";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: submit an end-of-day check-in. The day's overall result (PASS
 * only if every marked habit passed) is applied uniformly to every habit in
 * that day's plan — per the lock-cost design, a single missed habit fails
 * the whole day, and every scheduled habit (not just the missed one) gets
 * the FAIL cost bump. See LockCostService / docs/plan.md's non-negotiable
 * design rules.
 *
 * Not a real DB transaction (Supabase's client has no cross-table
 * transaction API here) — habits are saved before the check-in itself so a
 * mid-batch failure leaves habits updated but no check-in recorded, which is
 * safer to retry than the reverse (a recorded check-in whose costs never
 * applied).
 */
export class SubmitCheckInUseCase {
  constructor(
    private readonly habitRepository: HabitRepository,
    private readonly checkInRepository: CheckInRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: SubmitCheckInDTO): Promise<CheckInDTO> {
    const checkIn = CheckIn.create({
      id: this.idGenerator.generate(),
      userId: dto.userId,
      date: LocalDate.create(dto.date),
      marks: dto.marks,
      now: this.clock.now(),
    });

    for (const mark of checkIn.marks) {
      const habit = await this.habitRepository.findById(mark.habitId);
      if (!habit || habit.userId !== dto.userId) {
        throw new HabitNotFoundError(mark.habitId);
      }
      habit.applyDayResult(checkIn.dayResult);
      await this.habitRepository.save(habit);
    }

    await this.checkInRepository.save(checkIn);

    return CheckInMapper.toDTO(checkIn);
  }
}
