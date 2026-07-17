import { CheckIn } from "../entities/CheckIn";
import { LocalDate } from "../value-objects/LocalDate";
import { LockCostService, type HabitState } from "./LockCostService";

export interface TrajectoryPoint {
  date: string; // YYYY-MM-DD
  cost: number;
  /** Normalized habit strength AFTER this day: 1 = formed, 0 = the floor. */
  strength: number;
  /** The goal's own mark that day. */
  passed: boolean;
}

/** How many future days the pass/fail projection curves cover. */
export const PROJECTION_DAYS = 14;

export interface GoalTrajectory {
  /** One point per check-in that included the goal, oldest first. */
  points: TrajectoryPoint[];
  /** Formula state after the last point AND any trailing disuse decay to `today`. */
  finalState: HabitState;
  /** Cost after the last point and any trailing decay (the goal's initial cost if none). */
  finalCost: number;
  /** Normalized strength before any check-in (0.5 at defaults) — the graph's start point. */
  initialStrength: number;
  /** Normalized strength after the last point and any trailing decay. */
  finalStrength: number;
  /** How many of those check-ins passed this goal ("Times completed"). */
  timesCompleted: number;
  /** What the cost would become if the next planned day passes / fails. */
  nextIfPass: number;
  nextIfFail: number;
  /**
   * Normalized strength, day by day, if the next PROJECTION_DAYS planned days
   * all pass / all fail — the green and red future curves on the goal graph.
   * Both start from finalState, so the fail curve carries any current
   * consecutive-miss escalation.
   */
  projectionIfPass: number[];
  projectionIfFail: number[];
}

/**
 * Domain service that reconstructs a goal's lock-cost history. There is no
 * cost-history table — `Goal.currentLockCost` only ever holds the latest
 * value — so the trajectory is rebuilt by replaying every check-in that
 * included the goal, oldest first, through LockCostService from a fresh
 * state. Each step uses the goal's OWN mark (per-goal contingency).
 *
 * A planned-day miss ALWAYS takes the fail step — scheduling a goal for a
 * day is the commitment, and skipping it costs locks regardless of how the
 * rest of the week goes (deliberate design decision, 2026-07-14; an earlier
 * "weekly slack" forgiveness rule was removed the same day because it opened
 * a lower-the-target-to-erase-misses loophole). The weekly target only
 * affects PRICING via φ (docs/lock-formula.md §3.4): the replay uses the
 * goal's CURRENT target, so editing it re-prices the whole trajectory but
 * never rewrites which days counted as misses.
 *
 * Gaps between check-ins (and the gap from the last check-in to `today`)
 * beyond `staleAfterDays` apply DISUSE DECAY (docs/lock-formula.md §3.6) —
 * strength drifts toward neutral, never toward the punishing floor. This is
 * structurally distinct from a miss: nothing was scheduled, so nothing was
 * failed, but a habit still gets rusty from not showing up.
 *
 * The replay also yields the normalized strength curve and the 14-day
 * pass/fail projection curves drawn on the goal graphs (/goals and the
 * per-goal detail page).
 */
export class GoalTrajectoryService {
  constructor(private readonly lockCostService: LockCostService) {}

  /**
   * `checkIns` may contain check-ins that don't involve `goalId` — they are
   * filtered out here. Ordering is handled here too; callers just pass what
   * the repository returned. `today` (YYYY-MM-DD, the caller's local day)
   * anchors trailing decay for a goal that's currently stale.
   */
  trajectoryFor(
    goalId: string,
    weeklyFrequencyTarget: number,
    checkIns: readonly CheckIn[],
    today: string,
  ): GoalTrajectory {
    const ordered = [...checkIns]
      .filter((c) => c.markFor(goalId) !== undefined)
      .sort((a, b) => (a.date.isBefore(b.date) ? -1 : a.date.equals(b.date) ? 0 : 1));

    let state = this.lockCostService.initialState();
    let timesCompleted = 0;
    const points: TrajectoryPoint[] = [];

    for (const checkIn of ordered) {
      const previous = points[points.length - 1];
      if (previous) {
        const unscheduledDays = LocalDate.create(previous.date).daysUntil(checkIn.date) - 1;
        state = this.decayIfStale(state, unscheduledDays);
      }

      const passed = checkIn.markFor(goalId)!;
      if (passed) timesCompleted += 1;
      state = this.lockCostService.step(state, passed);
      points.push({
        date: checkIn.date.toString(),
        cost: this.lockCostService.costFor(state, weeklyFrequencyTarget),
        strength: this.lockCostService.displayStrength(state),
        passed,
      });
    }

    // Trailing decay: if the goal has gone stale since its last check-in,
    // reflect that in the CURRENT state even though no new check-in exists.
    const lastPoint = points[points.length - 1];
    if (lastPoint) {
      const unscheduledDays = LocalDate.create(lastPoint.date).daysUntil(LocalDate.create(today));
      state = this.decayIfStale(state, unscheduledDays);
    }

    const finalCost =
      points.length > 0
        ? this.lockCostService.costFor(state, weeklyFrequencyTarget)
        : this.lockCostService.initialCostFor(weeklyFrequencyTarget);

    return {
      points,
      finalState: state,
      finalCost,
      initialStrength: this.lockCostService.displayStrength(this.lockCostService.initialState()),
      finalStrength: this.lockCostService.displayStrength(state),
      timesCompleted,
      nextIfPass: this.lockCostService.costFor(
        this.lockCostService.step(state, true),
        weeklyFrequencyTarget,
      ),
      nextIfFail: this.lockCostService.costFor(
        this.lockCostService.step(state, false),
        weeklyFrequencyTarget,
      ),
      projectionIfPass: this.project(state, true),
      projectionIfFail: this.project(state, false),
    };
  }

  /** Applies decay only for the days beyond the tolerated stale threshold. */
  private decayIfStale(state: HabitState, unscheduledDays: number): HabitState {
    const decayDays = unscheduledDays - this.lockCostService.staleAfterDays;
    return decayDays > 0 ? this.lockCostService.decay(state, decayDays) : state;
  }

  /** Replay `PROJECTION_DAYS` hypothetical all-pass or all-fail days forward. */
  private project(from: HabitState, passed: boolean): number[] {
    const values: number[] = [];
    let state = from;
    for (let i = 0; i < PROJECTION_DAYS; i++) {
      state = this.lockCostService.step(state, passed);
      values.push(this.lockCostService.displayStrength(state));
    }
    return values;
  }
}
