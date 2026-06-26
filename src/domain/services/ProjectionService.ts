import { ValidationError } from "../errors/DomainError";
import { SessionTimeframe } from "../value-objects/SessionTimeframe";

/** A single logged value against a goal, attributed to a week of its session. */
export interface WeeklyLogEntry {
  weekIndex: number;
  value: number;
}

/** Whether a week has fully elapsed, is in progress, or is yet to come. */
export type WeekKind = "past" | "current" | "future";

/** Per-week breakdown of how the projection total is composed. */
export interface WeekProjection {
  weekIndex: number;
  /** Sum of all logged values attributed to this week. */
  actual: number;
  /** Amount this week contributes to the projection total. */
  contribution: number;
  kind: WeekKind;
}

/** The full "what you'll accomplish" projection for a goal. */
export interface Projection {
  /** Σ contributions across every week of the session. */
  total: number;
  /** The per-week rate the user committed to (the goal's weekly target). */
  weeklyTarget: number;
  totalWeeks: number;
  weeks: WeekProjection[];
}

/**
 * Domain Service — computes the "what you'll accomplish" projection for a goal.
 *
 * Every week that has already started — past weeks AND the current, in-progress
 * one — counts its actual logged total, so the projection reflects what has
 * really been accomplished so far (over-delivery is kept, under-delivery is not
 * padded up). Only weeks that are still entirely ahead are assumed to reach the
 * weekly target.
 *
 *   total = Σ(actual for weeks already started, incl. the current one)
 *         + Σ(weeklyTarget for weeks still ahead)
 *
 * Before the session starts no week has begun, so every week is projected at the
 * weekly target (total === targetValue). After it ends every week has elapsed,
 * so the total is exactly the actual logged sum.
 *
 * Pure; no I/O. Re-deriving everything from the supplied target and timeframe on
 * each call means the projection recalculates correctly whenever a goal's target
 * or timeframe is edited.
 */
export class ProjectionService {
  project(params: {
    timeframe: SessionTimeframe;
    weeklyTarget: number;
    today: Date;
    logs: ReadonlyArray<WeeklyLogEntry>;
  }): Projection {
    const { timeframe, weeklyTarget, today, logs } = params;

    if (!Number.isFinite(weeklyTarget) || weeklyTarget < 0) {
      throw new ValidationError("Goal weekly target must be a non-negative number.");
    }

    const totalWeeks = timeframe.totalWeeks();
    const phase = timeframe.phaseOn(today);

    // The last week that has already started as of `today`. Weeks through here
    // (past + the current one) count their actual logged amounts; weeks still
    // ahead are projected at the weekly target. Before the session no week has
    // begun (-1 → everything projected); after it ends every week has.
    const lastStartedWeek =
      phase === "before" ? -1 : phase === "after" ? totalWeeks - 1 : timeframe.weekIndexOn(today);

    // The week `today` falls in, used only to label past/current/future. Before
    // the session this clamps to 0 and after it to the final week.
    const currentWeekIndex = phase === "after" ? totalWeeks : timeframe.weekIndexOn(today);

    const actualByWeek = this.aggregateByWeek(logs);

    const weeks: WeekProjection[] = [];
    let total = 0;

    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
      const actual = actualByWeek.get(weekIndex) ?? 0;
      const hasStarted = weekIndex <= lastStartedWeek;

      // Started weeks (past + current) contribute what was actually logged; weeks
      // still ahead are projected at the weekly target.
      const contribution = hasStarted ? actual : weeklyTarget;
      total += contribution;

      weeks.push({
        weekIndex,
        actual,
        contribution,
        kind:
          weekIndex < currentWeekIndex
            ? "past"
            : weekIndex === currentWeekIndex
              ? "current"
              : "future",
      });
    }

    return { total, weeklyTarget, totalWeeks, weeks };
  }

  /**
   * Sum logged values per week. Multiple logs in the same week accumulate.
   * Logs outside the session's week range are ignored (e.g. left over after a
   * timeframe is shortened).
   */
  private aggregateByWeek(logs: ReadonlyArray<WeeklyLogEntry>): Map<number, number> {
    const byWeek = new Map<number, number>();
    for (const { weekIndex, value } of logs) {
      byWeek.set(weekIndex, (byWeek.get(weekIndex) ?? 0) + value);
    }
    return byWeek;
  }
}
