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
  /** targetValue split evenly across the session's weeks. */
  weeklyTarget: number;
  totalWeeks: number;
  weeks: WeekProjection[];
}

/**
 * Domain Service — computes the "what you'll accomplish" projection for a goal.
 *
 * Past completed weeks count their actual logged totals (under-delivery is real
 * and is not padded up). The current week and all future weeks are assumed to
 * reach at least the weekly target, while any over-delivery is kept on top as a
 * bonus — it adds to the total and never subtracts.
 *
 *   total = Σ(actual_past_weeks) + Σ(max(weeklyTarget, actual) for current + future weeks)
 *
 * Pure; no I/O. Re-deriving everything from the supplied target and timeframe on
 * each call means the projection recalculates correctly whenever a goal's target
 * or timeframe is edited.
 */
export class ProjectionService {
  project(params: {
    timeframe: SessionTimeframe;
    targetValue: number;
    today: Date;
    logs: ReadonlyArray<WeeklyLogEntry>;
  }): Projection {
    const { timeframe, targetValue, today, logs } = params;

    if (!Number.isFinite(targetValue) || targetValue < 0) {
      throw new ValidationError("Goal target value must be a non-negative number.");
    }

    const totalWeeks = timeframe.totalWeeks();
    const weeklyTarget = targetValue / totalWeeks;

    // First week that is still current or in the future. Before the session
    // every week is projected; after it ends every week is in the past.
    const firstProjectedWeek =
      timeframe.phaseOn(today) === "after" ? totalWeeks : timeframe.weekIndexOn(today);

    const actualByWeek = this.aggregateByWeek(logs);

    const weeks: WeekProjection[] = [];
    let total = 0;

    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
      const actual = actualByWeek.get(weekIndex) ?? 0;
      const isPast = weekIndex < firstProjectedWeek;

      // Past weeks contribute their actual total; current/future weeks contribute
      // at least the weekly target, with over-delivery kept as bonus.
      const contribution = isPast ? actual : Math.max(weeklyTarget, actual);
      total += contribution;

      weeks.push({
        weekIndex,
        actual,
        contribution,
        kind: isPast ? "past" : weekIndex === firstProjectedWeek ? "current" : "future",
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
