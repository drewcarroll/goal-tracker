import type { GoalDifficulty } from "@/domain/services/LockCostService";
import type { GoalState } from "@/domain/entities/Goal";

// Re-exported so interfaces/ never needs to import domain/ directly for these types.
export type { GoalDifficulty, GoalState };
export { WEEKLY_LOCK_CAPACITY } from "@/domain/value-objects/LockCapacity";

export interface GoalDTO {
  id: string;
  userId: string;
  name: string;
  /** How many days a week you're committing to, e.g. 3 for "3x/week". */
  weeklyFrequencyTarget: number;
  difficulty: GoalDifficulty;
  currentLockCost: number;
  state: GoalState;
  createdAt: string; // ISO 8601
}

export interface CreateGoalDTO {
  userId: string;
  name: string;
  weeklyFrequencyTarget: number;
  difficulty: GoalDifficulty;
}

export interface CreateGoalSelectionDTO {
  name: string;
  weeklyFrequencyTarget: number;
  difficulty: GoalDifficulty;
}

export interface CreateGoalsFromOnboardingDTO {
  userId: string;
  selections: CreateGoalSelectionDTO[];
}

export interface UpdateGoalDTO {
  userId: string;
  goalId: string;
  action: "pause" | "resume";
}

/**
 * Name/frequency are editable freely; difficulty is not — see Goal.edit's
 * docstring for why (it would retroactively rewrite the cost trajectory).
 */
export interface EditGoalDTO {
  userId: string;
  goalId: string;
  name: string;
  weeklyFrequencyTarget: number;
}

export interface DeleteGoalDTO {
  userId: string;
  goalId: string;
}

/** A read-only view of one GOAL_SUGGESTIONS entry, for the "quick add" picker. */
export interface GoalSuggestionDTO {
  label: string;
}
