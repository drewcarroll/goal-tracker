import { CheckIn } from "../entities/CheckIn";
import { LockCostService, type GoalDifficulty, type HabitState } from "./LockCostService";

export interface TrajectoryPoint {
  date: string; // YYYY-MM-DD
  cost: number;
}

export interface GoalTrajectory {
  /** One point per check-in that included the goal, oldest first. */
  points: TrajectoryPoint[];
  /** Formula state after the last point (initial state if there are none). */
  finalState: HabitState;
  /** Cost after the last point (the goal's initial cost if none). */
  finalCost: number;
  /** How many of those check-ins passed this goal ("Times completed"). */
  timesCompleted: number;
  /** What the cost would become if the next planned day passes / fails. */
  nextIfPass: number;
  nextIfFail: number;
}

/**
 * Domain service that reconstructs a goal's lock-cost history. There is no
 * cost-history table — `Goal.currentLockCost` only ever holds the latest
 * value — so the trajectory is rebuilt by replaying every check-in that
 * included the goal, oldest first, through LockCostService from a fresh
 * state. Each step uses the goal's OWN mark (per-goal contingency).
 *
 * Weekly slack rule (docs/lock-formula.md §3.4): a miss only counts as a
 * FAIL when it sinks the week — when the passes already banked this Mon-Sun
 * week plus the days remaining can no longer reach the goal's weekly target.
 * A recoverable miss (5×/week goal, missed Tuesday, five days left) is
 * neutral: shuffling the schedule inside the week is not a failure. For a
 * 7×/week goal every miss is a break, by construction. The replay always
 * uses the goal's CURRENT target, so lowering an over-ambitious target
 * retroactively forgives misses that would have been recoverable under it.
 *
 * The replay also yields the "ghost point" projections shown on /progress;
 * nextIfFail is the worst case (a week-breaking miss).
 */
export class GoalTrajectoryService {
  constructor(private readonly lockCostService: LockCostService) {}

  /**
   * `checkIns` may contain check-ins that don't involve `goalId` — they are
   * filtered out here. Ordering is handled here too; callers just pass what
   * the repository returned.
   */
  trajectoryFor(
    goalId: string,
    difficulty: GoalDifficulty,
    weeklyFrequencyTarget: number,
    checkIns: readonly CheckIn[],
  ): GoalTrajectory {
    const ordered = [...checkIns]
      .filter((c) => c.markFor(goalId) !== undefined)
      .sort((a, b) => (a.date.isBefore(b.date) ? -1 : a.date.equals(b.date) ? 0 : 1));

    let state = this.lockCostService.initialState();
    let timesCompleted = 0;
    let weekStart: string | null = null;
    let passesThisWeek = 0;

    const points = ordered.map((checkIn) => {
      const week = checkIn.date.startOfWeek().toString();
      if (week !== weekStart) {
        weekStart = week;
        passesThisWeek = 0;
      }

      const passed = checkIn.markFor(goalId)!;
      if (passed) {
        timesCompleted += 1;
        passesThisWeek += 1;
        state = this.lockCostService.step(state, true, difficulty);
      } else {
        const daysLeftInWeek = 6 - checkIn.date.dayOfWeekIndex();
        const weekStillAchievable = passesThisWeek + daysLeftInWeek >= weeklyFrequencyTarget;
        state = weekStillAchievable
          ? this.lockCostService.stepRecoverableMiss(state)
          : this.lockCostService.step(state, false, difficulty);
      }
      return {
        date: checkIn.date.toString(),
        cost: this.lockCostService.costFor(state, difficulty, weeklyFrequencyTarget),
      };
    });

    const finalCost =
      points.length > 0
        ? points[points.length - 1]!.cost
        : this.lockCostService.initialCostFor(difficulty, weeklyFrequencyTarget);

    return {
      points,
      finalState: state,
      finalCost,
      timesCompleted,
      nextIfPass: this.lockCostService.costFor(
        this.lockCostService.step(state, true, difficulty),
        difficulty,
        weeklyFrequencyTarget,
      ),
      nextIfFail: this.lockCostService.costFor(
        this.lockCostService.step(state, false, difficulty),
        difficulty,
        weeklyFrequencyTarget,
      ),
    };
  }
}
