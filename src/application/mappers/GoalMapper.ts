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
    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      targetValue: goal.targetValue,
      unit: goal.unit,
      weeklyTarget: projection.weeklyTarget,
      totalWeeks: projection.totalWeeks,
      projectedTotal: projection.total,
      startDate: goal.timeframe.startDate().toISOString(),
      endDate: goal.timeframe.endDate().toISOString(),
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }

  static toDTOList(goals: Goal[], today: Date): GoalDTO[] {
    return goals.map((g) => GoalMapper.toDTO(g, today));
  }
}
