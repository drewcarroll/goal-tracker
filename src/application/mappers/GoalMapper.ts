import { Goal } from "@/domain/entities/Goal";
import { GoalDTO } from "../dtos/GoalDTO";

/**
 * Maps domain entities <-> DTOs so that domain objects never leak
 * out of the application boundary.
 */
export class GoalMapper {
  static toDTO(goal: Goal): GoalDTO {
    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      targetValue: goal.targetValue,
      unit: goal.unit,
      startDate: goal.timeframe.startDate().toISOString(),
      endDate: goal.timeframe.endDate().toISOString(),
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }

  static toDTOList(goals: Goal[]): GoalDTO[] {
    return goals.map((g) => GoalMapper.toDTO(g));
  }
}
