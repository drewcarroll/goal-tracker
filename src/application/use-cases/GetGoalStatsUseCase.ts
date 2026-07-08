import { LocalDate } from "@/domain/value-objects/LocalDate";
import { GoalTrajectoryService } from "@/domain/services/GoalTrajectoryService";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { GetGoalStatsDTO, GoalStatsDTO } from "../dtos/GoalStatsDTO";

const WINDOW_DAYS = 30;

/**
 * Use Case: a goal's full lock-cost trajectory, its pass rate over the last
 * 30 days, and this week's completed-vs-target count. There's no
 * cost-history table, so the trajectory is reconstructed by replaying every
 * check-in that included the goal through GoalTrajectoryService — see that
 * service's docstring for why.
 */
export class GetGoalStatsUseCase {
  private static readonly trajectoryService = new GoalTrajectoryService();

  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly checkInRepository: CheckInRepository,
  ) {}

  async execute(dto: GetGoalStatsDTO): Promise<GoalStatsDTO> {
    const goal = await this.goalRepository.findById(dto.goalId);
    if (!goal || goal.userId !== dto.userId) {
      throw new GoalNotFoundError(dto.goalId);
    }

    const allCheckIns = await this.checkInRepository.findByUserId(dto.userId);
    const trajectory = GetGoalStatsUseCase.trajectoryService.trajectoryFor(
      goal.id,
      goal.difficulty,
      allCheckIns,
    );

    const goalCheckIns = allCheckIns.filter((checkIn) => checkIn.markFor(goal.id) !== undefined);

    const today = LocalDate.create(dto.today);
    const windowStart = today.addDays(-(WINDOW_DAYS - 1)); // inclusive 30-day window
    const windowedCheckIns = goalCheckIns.filter(
      (checkIn) => !checkIn.date.isBefore(windowStart) && !checkIn.date.isAfter(today),
    );
    const checkedInDays = windowedCheckIns.length;
    const passedDays = windowedCheckIns.filter((c) => c.dayResult === "PASS").length;
    const passRate = checkedInDays === 0 ? null : Math.round((passedDays / checkedInDays) * 100);

    const weekStart = today.startOfWeek();
    const thisWeekCompleted = goalCheckIns.filter(
      (checkIn) =>
        !checkIn.date.isBefore(weekStart) &&
        !checkIn.date.isAfter(today) &&
        checkIn.dayResult === "PASS",
    ).length;

    return {
      goalId: goal.id,
      label: goal.name,
      weeklyFrequencyTarget: goal.weeklyFrequencyTarget,
      trajectory,
      last30: { checkedInDays, passedDays, passRate },
      thisWeek: { completed: thisWeekCompleted, target: goal.weeklyFrequencyTarget },
    };
  }
}
