import { LocalDate } from "@/domain/value-objects/LocalDate";
import { GoalTrajectoryService } from "@/domain/services/GoalTrajectoryService";
import { LockCostService } from "@/domain/services/LockCostService";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { GetGoalStatsDTO, GoalStatsDTO } from "../dtos/GoalStatsDTO";

const WINDOW_DAYS = 30;

/**
 * Use Case: a goal's full lock-cost trajectory, pass/fail ghost-point
 * projections, times completed, pass rate over the last 30 days, and this
 * week's completed-vs-target count. There's no cost-history table, so
 * everything is reconstructed by replaying the goal's check-ins through
 * GoalTrajectoryService using the goal's OWN marks (per-goal contingency) and
 * the current lock-formula config — dev-mode constant changes redraw history
 * here automatically.
 */
export class GetGoalStatsUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly checkInRepository: CheckInRepository,
    private readonly configRepository: ConfigRepository,
  ) {}

  async execute(dto: GetGoalStatsDTO): Promise<GoalStatsDTO> {
    const goal = await this.goalRepository.findById(dto.goalId);
    if (!goal || goal.userId !== dto.userId) {
      throw new GoalNotFoundError(dto.goalId);
    }

    const config = await this.configRepository.getLockFormulaConfig();
    const trajectoryService = new GoalTrajectoryService(new LockCostService(config));

    const allCheckIns = await this.checkInRepository.findByUserId(dto.userId);
    const trajectory = trajectoryService.trajectoryFor(
      goal.id,
      goal.weeklyFrequencyTarget,
      allCheckIns,
      dto.today,
    );

    const goalCheckIns = allCheckIns.filter((checkIn) => checkIn.markFor(goal.id) !== undefined);

    const today = LocalDate.create(dto.today);
    const windowStart = today.addDays(-(WINDOW_DAYS - 1)); // inclusive 30-day window
    const windowedCheckIns = goalCheckIns.filter(
      (checkIn) => !checkIn.date.isBefore(windowStart) && !checkIn.date.isAfter(today),
    );
    const checkedInDays = windowedCheckIns.length;
    const passedDays = windowedCheckIns.filter((c) => c.markFor(goal.id) === true).length;
    const passRate = checkedInDays === 0 ? null : Math.round((passedDays / checkedInDays) * 100);

    const weekStart = today.startOfWeek();
    const thisWeekCompleted = goalCheckIns.filter(
      (checkIn) =>
        !checkIn.date.isBefore(weekStart) &&
        !checkIn.date.isAfter(today) &&
        checkIn.markFor(goal.id) === true,
    ).length;

    return {
      goalId: goal.id,
      label: goal.name,
      weeklyFrequencyTarget: goal.weeklyFrequencyTarget,
      trajectory: trajectory.points,
      initialStrength: trajectory.initialStrength,
      finalStrength: trajectory.finalStrength,
      timesCompleted: trajectory.timesCompleted,
      nextIfPass: trajectory.nextIfPass,
      nextIfFail: trajectory.nextIfFail,
      projectionIfPass: trajectory.projectionIfPass,
      projectionIfFail: trajectory.projectionIfFail,
      last30: { checkedInDays, passedDays, passRate },
      thisWeek: { completed: thisWeekCompleted, target: goal.weeklyFrequencyTarget },
    };
  }
}
