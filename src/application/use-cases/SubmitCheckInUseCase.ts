import { CheckIn } from "@/domain/entities/CheckIn";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { HabitRepository } from "@/domain/repositories/HabitRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { HabitNotFoundError } from "../errors/ApplicationError";
import { SubmitCheckInDTO, CheckInDTO } from "../dtos/CheckInDTO";
import { CheckInMapper } from "../mappers/CheckInMapper";
import { HabitCostRecomputeService } from "../services/HabitCostRecomputeService";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: submit a check-in for any day (today, or a backfilled past day
 * via /history). The day's overall result (PASS only if every marked habit
 * passed) is applied uniformly to every habit in that day's plan — per the
 * lock-cost design, a single missed habit fails the whole day, and every
 * scheduled habit (not just the missed one) gets the FAIL cost bump. See
 * LockCostService / docs/plan.md's non-negotiable design rules.
 *
 * Costs are derived via HabitCostRecomputeService's full-history replay
 * rather than incrementing the stored value — that's what makes backfilling
 * a missed past day (or /history's edit/delete) safe: it doesn't matter
 * whether this check-in lands chronologically before or after ones already
 * saved, the replay sorts by date itself.
 *
 * Not a real DB transaction (Supabase's client has no cross-table
 * transaction API here) — the check-in is saved before habit costs are
 * recomputed, so a mid-batch failure leaves the check-in recorded but a
 * habit's cost stale, which self-heals the next time that habit is
 * recomputed (submit, edit, or delete all recompute from scratch).
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
    }

    await this.checkInRepository.save(checkIn);

    const recomputeService = new HabitCostRecomputeService(
      this.habitRepository,
      this.checkInRepository,
    );
    await recomputeService.recomputeMany(
      dto.userId,
      checkIn.marks.map((m) => m.habitId),
    );

    return CheckInMapper.toDTO(checkIn);
  }
}
