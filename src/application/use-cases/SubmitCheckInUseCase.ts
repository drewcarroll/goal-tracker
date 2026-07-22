import { CheckIn } from "@/domain/entities/CheckIn";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { CheckInWindowClosedError, GoalNotFoundError } from "../errors/ApplicationError";
import { SubmitCheckInDTO, CheckInDTO } from "../dtos/CheckInDTO";
import { CheckInMapper } from "../mappers/CheckInMapper";
import { CheckInWindowResolver } from "../services/CheckInWindowResolver";
import { GoalCostRecomputeService } from "../services/GoalCostRecomputeService";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: the nightly "going to sleep?" check-in. The target day is
 * resolved server-side by CheckInWindowResolver from the user's timezone and
 * check-in window — a 1 AM submission reports on yesterday, and outside the
 * window (e.g. 7:01 AM) the submission is rejected with
 * CheckInWindowClosedError. Submitting here is what earns the rank point
 * (submittedOnTime = true); marks affect only each goal's own lock cost.
 * There is no way to submit for a past day you missed — you miss it, you
 * miss it (2026-07-21, user decision); EditCheckInUseCase/DeleteCheckInUseCase
 * only correct an already-logged day, they don't create a new one.
 *
 * Costs are derived via GoalCostRecomputeService's full-history replay
 * rather than incrementing stored values, so ordering never matters.
 *
 * Not a real DB transaction (Supabase's client has no cross-table
 * transaction API here) — the check-in is saved before goal costs are
 * recomputed, so a mid-batch failure leaves the check-in recorded but a
 * goal's cost stale, which self-heals the next time that goal is recomputed.
 */
export class SubmitCheckInUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly checkInRepository: CheckInRepository,
    private readonly windowResolver: CheckInWindowResolver,
    private readonly recomputeService: GoalCostRecomputeService,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: SubmitCheckInDTO): Promise<CheckInDTO> {
    const window = await this.windowResolver.resolve(dto.userId, dto.timezone);
    if (!window.open) {
      throw new CheckInWindowClosedError(window.opensAt);
    }

    const checkIn = CheckIn.create({
      id: this.idGenerator.generate(),
      userId: dto.userId,
      date: LocalDate.create(window.targetDate),
      marks: dto.marks,
      submittedOnTime: true,
      now: this.clock.now(),
    });

    for (const mark of checkIn.marks) {
      const goal = await this.goalRepository.findById(mark.goalId);
      if (!goal || goal.userId !== dto.userId) {
        throw new GoalNotFoundError(mark.goalId);
      }
    }

    await this.checkInRepository.save(checkIn);
    await this.recomputeService.recomputeMany(
      dto.userId,
      checkIn.marks.map((m) => m.goalId),
    );

    return CheckInMapper.toDTO(checkIn);
  }
}
