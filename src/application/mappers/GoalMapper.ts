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
      title: goal.title,
      description: goal.description,
      status: goal.status.toString(),
      progress: goal.progress.value(),
      dueDate: goal.dueDate ? goal.dueDate.toISOString() : null,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }

  static toDTOList(goals: Goal[]): GoalDTO[] {
    return goals.map((g) => GoalMapper.toDTO(g));
  }
}
