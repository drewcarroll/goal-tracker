import type { GoalState } from "@/domain/entities/Goal";

// Re-exported so interfaces/ never needs to import domain/ directly for these types.
export type { GoalState };

export interface GoalDTO {
  id: string;
  userId: string;
  name: string;
  /** How many days a week you're committing to, e.g. 3 for "3x/week". */
  weeklyFrequencyTarget: number;
  currentLockCost: number;
  state: GoalState;
  /** Whether friends can see this goal at all. Defaults to true (public). */
  isPublic: boolean;
  createdAt: string; // ISO 8601
}

export interface CreateGoalDTO {
  userId: string;
  name: string;
  weeklyFrequencyTarget: number;
  isPublic?: boolean;
}

export interface CreateGoalSelectionDTO {
  name: string;
  weeklyFrequencyTarget: number;
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

/** Name, weekly frequency target, and privacy are all freely editable. */
export interface EditGoalDTO {
  userId: string;
  goalId: string;
  name: string;
  weeklyFrequencyTarget: number;
  isPublic: boolean;
}

export interface DeleteGoalDTO {
  userId: string;
  goalId: string;
}

/** A read-only view of one GOAL_SUGGESTIONS entry, for the "quick add" picker. */
export interface GoalSuggestionDTO {
  label: string;
}
