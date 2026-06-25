import { Goal } from "../entities/Goal";

/**
 * Repository interface (a port). Describes WHAT persistence operations
 * exist, never HOW they are implemented. Implementations live in
 * the infrastructure layer.
 */
export interface GoalRepository {
  findById(id: string): Promise<Goal | null>;
  findByUserId(userId: string): Promise<Goal[]>;
  save(goal: Goal): Promise<void>;
  delete(id: string): Promise<void>;
}
