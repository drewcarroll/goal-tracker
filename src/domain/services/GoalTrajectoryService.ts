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
  /** Cost after the last point (the difficulty's initial cost if none). */
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
 * state. Each step uses the goal's OWN mark (per-goal contingency, Phase 6),
 * not the day's overall result.
 *
 * The replay also yields the "ghost point" projections (nextIfPass /
 * nextIfFail) shown on /progress — see docs/lock-formula.md §6.5.
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
    checkIns: readonly CheckIn[],
  ): GoalTrajectory {
    const ordered = [...checkIns]
      .filter((c) => c.markFor(goalId) !== undefined)
      .sort((a, b) => (a.date.isBefore(b.date) ? -1 : a.date.equals(b.date) ? 0 : 1));

    let state = this.lockCostService.initialState();
    let timesCompleted = 0;
    const points = ordered.map((checkIn) => {
      const passed = checkIn.markFor(goalId)!;
      if (passed) timesCompleted += 1;
      state = this.lockCostService.step(state, passed, difficulty);
      return { date: checkIn.date.toString(), cost: this.lockCostService.costFor(state, difficulty) };
    });

    const finalCost =
      points.length > 0
        ? points[points.length - 1]!.cost
        : this.lockCostService.initialCostFor(difficulty);

    return {
      points,
      finalState: state,
      finalCost,
      timesCompleted,
      nextIfPass: this.lockCostService.costFor(
        this.lockCostService.step(state, true, difficulty),
        difficulty,
      ),
      nextIfFail: this.lockCostService.costFor(
        this.lockCostService.step(state, false, difficulty),
        difficulty,
      ),
    };
  }
}
