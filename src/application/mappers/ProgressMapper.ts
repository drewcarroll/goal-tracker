import { Goal } from "@/domain/entities/Goal";
import { ProgressChartDTO } from "../dtos/ProgressDTO";

/**
 * Maps a Goal's domain progress chart into the chart-ready DTO, enriching each
 * week with its calendar date range (a presentation concern derived from the
 * goal's timeframe). Domain objects never leak past this boundary.
 */
export class ProgressMapper {
  /** `today` anchors the projection (past vs. current/future weeks). */
  static toDTO(goal: Goal, today: Date): ProgressChartDTO {
    const chart = goal.progressChart(today);
    const timeframe = goal.timeframe;

    const weeks = chart.weeks.map((week) => {
      const range = timeframe.weekRange(week.weekIndex);
      return {
        index: week.weekIndex,
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
        kind: week.kind,
        weeklyActual: week.weeklyActual,
        weeklyTarget: week.weeklyTarget,
        cumulativeTarget: week.cumulativeTarget,
        cumulativeActual: week.cumulativeActual,
        cumulativeProjected: week.cumulativeProjected,
      };
    });

    return {
      goalId: goal.id,
      goalName: goal.name,
      unit: goal.unit,
      targetValue: goal.targetValue,
      weeklyTarget: chart.weeklyTarget,
      totalWeeks: chart.totalWeeks,
      currentWeekIndex: timeframe.weekIndexOn(today),
      projectedTotal: chart.projectedTotal,
      startDate: timeframe.startDate().toISOString(),
      endDate: timeframe.endDate().toISOString(),
      weeks,
    };
  }

  static toDTOList(goals: Goal[], today: Date): ProgressChartDTO[] {
    return goals.map((g) => ProgressMapper.toDTO(g, today));
  }
}
