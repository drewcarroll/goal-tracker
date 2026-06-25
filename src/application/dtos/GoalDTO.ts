/**
 * Data Transfer Objects — the contracts crossing the application boundary.
 * Use cases accept and return DTOs, never domain entities.
 */

export interface GoalDTO {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: "active" | "completed" | "archived";
  progress: number;
  dueDate: string | null; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CreateGoalDTO {
  userId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null; // ISO 8601
}

export interface UpdateProgressDTO {
  /** Owner of the goal — used to enforce that callers only mutate their own data. */
  userId: string;
  goalId: string;
  progress: number;
}

export interface GoalStatsDTO {
  total: number;
  active: number;
  completed: number;
  archived: number;
  averageProgress: number;
  completionRate: number;
}
