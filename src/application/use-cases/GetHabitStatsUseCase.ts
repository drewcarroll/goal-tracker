import { LocalDate } from "@/domain/value-objects/LocalDate";
import { findCatalogEntry } from "@/domain/value-objects/HabitCatalog";
import { HabitTrajectoryService } from "@/domain/services/HabitTrajectoryService";
import { HabitRepository } from "@/domain/repositories/HabitRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { HabitNotFoundError } from "../errors/ApplicationError";
import { GetHabitStatsDTO, HabitStatsDTO } from "../dtos/HabitStatsDTO";

const WINDOW_DAYS = 30;

/**
 * Use Case: a habit's full lock-cost trajectory plus its pass rate over the
 * last 30 days. There's no cost-history table, so the trajectory is
 * reconstructed by replaying every check-in that included the habit through
 * HabitTrajectoryService — see that service's docstring for why.
 */
export class GetHabitStatsUseCase {
  private static readonly trajectoryService = new HabitTrajectoryService();

  constructor(
    private readonly habitRepository: HabitRepository,
    private readonly checkInRepository: CheckInRepository,
  ) {}

  async execute(dto: GetHabitStatsDTO): Promise<HabitStatsDTO> {
    const habit = await this.habitRepository.findById(dto.habitId);
    if (!habit || habit.userId !== dto.userId) {
      throw new HabitNotFoundError(dto.habitId);
    }

    const allCheckIns = await this.checkInRepository.findByUserId(dto.userId);
    const trajectory = GetHabitStatsUseCase.trajectoryService.trajectoryFor(
      habit.id,
      habit.difficulty,
      allCheckIns,
    );

    const today = LocalDate.create(dto.today);
    const windowStart = today.addDays(-(WINDOW_DAYS - 1)); // inclusive 30-day window
    const windowedCheckIns = allCheckIns.filter(
      (checkIn) =>
        checkIn.markFor(habit.id) !== undefined &&
        !checkIn.date.isBefore(windowStart) &&
        !checkIn.date.isAfter(today),
    );
    const checkedInDays = windowedCheckIns.length;
    const passedDays = windowedCheckIns.filter((c) => c.dayResult === "PASS").length;
    const passRate = checkedInDays === 0 ? null : Math.round((passedDays / checkedInDays) * 100);

    return {
      habitId: habit.id,
      label: findCatalogEntry(habit.catalogId)?.label ?? habit.catalogId,
      trajectory,
      last30: { checkedInDays, passedDays, passRate },
    };
  }
}
