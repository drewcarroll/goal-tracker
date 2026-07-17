import { LocalDate } from "@/domain/value-objects/LocalDate";
import { GoalTrajectoryService } from "@/domain/services/GoalTrajectoryService";
import { LockCostService } from "@/domain/services/LockCostService";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";
import { ConfigRepository } from "@/domain/repositories/ConfigRepository";
import { FriendshipRepository } from "@/domain/repositories/FriendshipRepository";
import { GoalNotFoundError } from "../errors/ApplicationError";
import { GoalStatsDTO } from "../dtos/GoalStatsDTO";

const WINDOW_DAYS = 30;

export interface GetFriendGoalStatsDTO {
  userId: string;
  friendUserId: string;
  goalId: string;
  today: string;
}

/**
 * Use Case: the same stats/graph GetGoalStatsUseCase produces, but for a
 * FRIEND's goal — gated on an accepted friendship AND the goal being
 * public. Both a private goal and a nonexistent one throw the identical
 * GoalNotFoundError, so a probe can't tell "this goal is private" from
 * "this goal doesn't exist" (docs/plan.md Phase 11).
 */
export class GetFriendGoalStatsUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly checkInRepository: CheckInRepository,
    private readonly configRepository: ConfigRepository,
    private readonly friendshipRepository: FriendshipRepository,
  ) {}

  async execute(dto: GetFriendGoalStatsDTO): Promise<GoalStatsDTO> {
    const friendship = await this.friendshipRepository.findBetween(dto.userId, dto.friendUserId);
    if (!friendship || friendship.status !== "accepted") {
      throw new GoalNotFoundError(dto.goalId);
    }

    const goal = await this.goalRepository.findById(dto.goalId);
    if (!goal || goal.userId !== dto.friendUserId || !goal.isPublic) {
      throw new GoalNotFoundError(dto.goalId);
    }

    const config = await this.configRepository.getLockFormulaConfig();
    const trajectoryService = new GoalTrajectoryService(new LockCostService(config));

    const allCheckIns = await this.checkInRepository.findByUserId(dto.friendUserId);
    const trajectory = trajectoryService.trajectoryFor(
      goal.id,
      goal.weeklyFrequencyTarget,
      allCheckIns,
      dto.today,
    );

    const goalCheckIns = allCheckIns.filter((checkIn) => checkIn.markFor(goal.id) !== undefined);

    const today = LocalDate.create(dto.today);
    const windowStart = today.addDays(-(WINDOW_DAYS - 1));
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
