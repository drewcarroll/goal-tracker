import type { Projection, WeekKind } from "./ProjectionService";

/** One week of chart-ready progress data for a goal, oldest first. */
export interface WeekProgressPoint {
  weekIndex: number;
  kind: WeekKind;
  /** Sum of all values logged against this week (0 if nothing logged). */
  weeklyActual: number;
  /** The per-week target reference (targetValue split evenly across weeks). */
  weeklyTarget: number;
  /**
   * The target line as a cumulative series: weeklyTarget × (weekIndex + 1).
   * Reaches targetValue exactly at the final week.
   */
  cumulativeTarget: number;
  /**
   * Running sum of actual logged values through this week. `null` for weeks
   * that have not happened yet (future weeks), so a chart's actual line stops
   * at the current week instead of flat-lining into the future.
   */
  cumulativeActual: number | null;
  /**
   * Running sum of the projection's per-week contributions through this week:
   * actual totals for elapsed weeks, on-target (with over-delivery kept) for the
   * current and future weeks. Ends at the projected end-of-session total.
   */
  cumulativeProjected: number;
}

/** The full chart-ready progress series for a single goal. */
export interface ProgressChart {
  /** targetValue split evenly across the session's weeks (per-week rate). */
  weeklyTarget: number;
  totalWeeks: number;
  /** The goal's overall target (the cumulative target line's end value). */
  targetTotal: number;
  /** The projected end-of-session total (the projected line's end value). */
  projectedTotal: number;
  weeks: WeekProgressPoint[];
}

/**
 * Domain Service — turns a {@link Projection} into chart-ready progress series.
 *
 * Pure; no I/O. Derives three weekly series a progress chart needs:
 *   - the cumulative target line (a straight line to the goal's target),
 *   - cumulative actuals (running logged totals, only through the current week),
 *   - cumulative projected (running projection totals across the whole session).
 *
 * All week-level facts (actual, contribution, kind, weeklyTarget) come straight
 * from the projection, so the chart stays consistent with the projection shown
 * elsewhere and recalculates whenever the goal's target or timeframe changes.
 */
export class ProgressChartService {
  build(projection: Projection): ProgressChart {
    const { weeklyTarget, totalWeeks, total, weeks } = projection;

    let cumulativeActual = 0;
    let cumulativeProjected = 0;

    const points: WeekProgressPoint[] = weeks.map((week) => {
      cumulativeProjected += week.contribution;

      // Actuals only accrue for weeks that have started; future weeks have no
      // data yet, so their cumulative actual is null (the line stops at "now").
      const isFuture = week.kind === "future";
      if (!isFuture) {
        cumulativeActual += week.actual;
      }

      return {
        weekIndex: week.weekIndex,
        kind: week.kind,
        weeklyActual: week.actual,
        weeklyTarget,
        cumulativeTarget: weeklyTarget * (week.weekIndex + 1),
        cumulativeActual: isFuture ? null : cumulativeActual,
        cumulativeProjected,
      };
    });

    return {
      weeklyTarget,
      totalWeeks,
      targetTotal: weeklyTarget * totalWeeks,
      projectedTotal: total,
      weeks: points,
    };
  }
}
