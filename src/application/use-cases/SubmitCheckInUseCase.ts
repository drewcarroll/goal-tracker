import { CheckIn } from "@/domain/entities/CheckIn";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { SubmitCheckInDTO, CheckInDTO } from "../dtos/CheckInDTO";
import { CheckInMapper } from "../mappers/CheckInMapper";
import { GoalCostRecomputeService } from "../services/GoalCostRecomputeService";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: submit a check-in for any day (today, or a backfilled past day
 * via /history). The day's overall result (PASS only if every marked goal
 * passed) is applied uniformly to every goal in that day's plan — per the
 * lock-cost design, a single missed goal fails the whole day, and every
 * scheduled goal (not just the missed one) gets the FAIL cost bump. See
 * LockCostService / docs/plan.md's non-negotiable design rules.
 *
 * Costs are derived via GoalCostRecomputeService's full-history replay
 * rather than incrementing the stored value — that's what makes backfilling
 * a missed past day (or /history's edit/delete) safe: it doesn't matter
 * whether this check-in lands chronologically before or after ones already
 * saved, the replay sorts by date itself.
 *
 * Not a real DB transaction (Supabase's client has no cross-table
 * transaction API here) — the check-in is saved before goal costs are
 * recomputed, so a mid-batch failure leaves the check-in recorded but a
 * goal's cost stale, which self-heals the next time that goal is
 * recomputed (submit, edit, or delete all recompute from scratch).
 */
export class SubmitCheckInUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
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
      const goal = await this.goalRepository.findById(mark.goalId);
      if (!goal || goal.userId !== dto.userId) {
        throw new GoalNotFoundError(mark.goalId);
      }
    }

    await this.checkInRepository.save(checkIn);

    const recomputeService = new GoalCostRecomputeService(
      this.goalRepository,
      this.checkInRepository,
    );
    await recomputeService.recomputeMany(
      dto.userId,
      checkIn.marks.map((m) => m.goalId),
    );

    return CheckInMapper.toDTO(checkIn);
  }
}
