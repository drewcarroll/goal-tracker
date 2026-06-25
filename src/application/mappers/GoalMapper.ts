import { Goal } from "@/domain/entities/Goal";
import { GoalDTO } from "../dtos/GoalDTO";

/**
 * Maps domain entities <-> DTOs so that domain objects never leak
 * out of the application boundary.
 */
export class GoalMapper {
  /** `today` anchors the projection (past vs. current/future weeks). */
  static toDTO(goal: Goal, today: Date): GoalDTO {
    const projection = goal.project(today);
    const timeframe = goal.timeframe;
    const weeks = projection.weeks.map((week) => {
      const range = timeframe.weekRange(week.weekIndex);
      return {
        index: week.weekIndex,
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
        kind: week.kind,
        actual: week.actual,
      };
    });
    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      targetValue: goal.targetValue,
      unit: goal.unit,
      weeklyTarget: projection.weeklyTarget,
      totalWeeks: projection.totalWeeks,
      currentWeekIndex: timeframe.weekIndexOn(today),
      weeks,
      projectedTotal: projection.total,
      startDate: timeframe.startDate().toISOString(),
      endDate: timeframe.endDate().toISOString(),
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }

  static toDTOList(goals: Goal[], today: Date): GoalDTO[] {
    return goals.map((g) => GoalMapper.toDTO(g, today));
  }
}
