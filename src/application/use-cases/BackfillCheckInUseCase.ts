import { CheckIn } from "@/domain/entities/CheckIn";
import { LocalDate } from "@/domain/value-objects/LocalDate";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { BackfillCheckInDTO, CheckInDTO } from "../dtos/CheckInDTO";
import { CheckInMapper } from "../mappers/CheckInMapper";
import { GoalCostRecomputeService } from "../services/GoalCostRecomputeService";
import { IdGenerator } from "../ports/IdGenerator";
import { Clock } from "../ports/Clock";

/**
 * Use Case: backfill a check-in for a missed past day via /history. Honesty
 * beats streaks: the day still counts fully for lock-cost trajectories (the
 * replay sorts by date, so it doesn't matter that it arrives late), but it is
 * stamped submittedOnTime = false and therefore never earns a rank point
 * (docs/progression.md §2.1). No window check — the window only gates the
 * nightly submission.
 */
export class BackfillCheckInUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly checkInRepository: CheckInRepository,
    private readonly recomputeService: GoalCostRecomputeService,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(dto: BackfillCheckInDTO): Promise<CheckInDTO> {
    const checkIn = CheckIn.create({
      id: this.idGenerator.generate(),
      userId: dto.userId,
      date: LocalDate.create(dto.date),
      marks: dto.marks,
      submittedOnTime: false,
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
