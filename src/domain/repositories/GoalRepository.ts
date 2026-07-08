import { Goal } from "../entities/Goal";

export interface GoalRepository {
  findById(id: string): Promise<Goal | null>;
  findByUserId(userId: string): Promise<Goal[]>;
  save(goal: Goal): Promise<void>;
  delete(id: string): Promise<void>;
}
