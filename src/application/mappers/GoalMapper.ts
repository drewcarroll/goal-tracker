import { Goal } from "@/domain/entities/Goal";
import { GoalDTO } from "../dtos/GoalDTO";

/**
 * Maps domain entities <-> DTOs so that domain objects never leak out of the
 * application boundary.
 */
export class GoalMapper {
  static toDTO(goal: Goal): GoalDTO {
    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      weeklyFrequencyTarget: goal.weeklyFrequencyTarget,
      difficulty: goal.difficulty,
      currentLockCost: goal.currentLockCost,
      state: goal.state,
      createdAt: goal.createdAt.toISOString(),
    };
  }

  static toDTOList(goals: Goal[]): GoalDTO[] {
    return goals.map((goal) => GoalMapper.toDTO(goal));
  }
}
