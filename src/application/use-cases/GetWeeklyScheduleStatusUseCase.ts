import { LocalDate } from "@/domain/value-objects/LocalDate";
import { GoalRepository } from "@/domain/repositories/GoalRepository";
import { CheckInRepository } from "@/domain/repositories/CheckInRepository";

export interface WeeklyGoalStatusDTO {
  goalId: string;
  completedThisWeek: number;
  weeklyFrequencyTarget: number;
  /** Calendar days left in the Mon-Sun week, from tomorrow through Sunday inclusive. */
  daysRemainingInWeek: number;
  /** False when even scheduling every remaining day couldn't reach the target. */
  onTrack: boolean;
}

export interface GetWeeklyScheduleStatusDTO {
  userId: string;
  /** "Today", so the week and days-remaining are anchored correctly — never the server's own clock. */
  todayDate: string;
}

/**
 * Use Case: per-goal "are you still on pace to hit your weekly target?"
 * status, for the schedule-tomorrow warning (weekly key budget rework,
 * user decision 2026-07-18: no per-day cap, but warn — don't block — when
 * under-scheduling would miss a goal's own weekly frequency target).
 * onTrack is deliberately optimistic: it only checks whether hitting the
 * target is still ARITHMETICALLY possible, not whether tomorrow's specific
 * plan includes the goal.
 */
export class GetWeeklyScheduleStatusUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly checkInRepository: CheckInRepository,
  ) {}

  async execute(dto: GetWeeklyScheduleStatusDTO): Promise<WeeklyGoalStatusDTO[]> {
    const today = LocalDate.create(dto.todayDate);
    const weekStart = today.startOfWeek();
    const daysRemainingInWeek = 6 - today.dayOfWeekIndex();

    const [goals, checkIns] = await Promise.all([
      this.goalRepository.findByUserId(dto.userId),
      this.checkInRepository.findByUserId(dto.userId),
    ]);

    return goals
      .filter((goal) => goal.state !== "paused")
      .map((goal) => {
        const completedThisWeek = checkIns.filter(
          (checkIn) =>
            !checkIn.date.isBefore(weekStart) &&
            !checkIn.date.isAfter(today) &&
            checkIn.markFor(goal.id) === true,
        ).length;
        const target = goal.weeklyFrequencyTarget;
        return {
          goalId: goal.id,
          completedThisWeek,
          weeklyFrequencyTarget: target,
          daysRemainingInWeek,
          onTrack: completedThisWeek + daysRemainingInWeek >= target,
        };
      });
  }
}
