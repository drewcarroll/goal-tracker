import type { HabitDifficulty } from "@/domain/services/LockCostService";
import type { HabitState } from "@/domain/entities/Habit";
import type { HabitCategory, HabitType } from "@/domain/value-objects/HabitCatalog";

// Re-exported so interfaces/ never needs to import domain/ directly for these types.
export type { HabitDifficulty, HabitState, HabitCategory, HabitType };

export interface HabitDTO {
  id: string;
  userId: string;
  catalogId: string;
  /** Denormalized from the catalog for display convenience. */
  label: string;
  category: HabitCategory;
  type: HabitType;
  minMinutes?: number;
  difficulty: HabitDifficulty;
  currentLockCost: number;
  state: HabitState;
  createdAt: string; // ISO 8601
}

export interface CreateHabitSelectionDTO {
  catalogId: string;
  difficulty: HabitDifficulty;
}

export interface CreateHabitsFromOnboardingDTO {
  userId: string;
  selections: CreateHabitSelectionDTO[];
}

export interface UpdateHabitDTO {
  userId: string;
  habitId: string;
  action: "pause" | "resume";
}

/** A read-only view of one HABIT_CATALOG entry, for onboarding's catalog picker. */
export interface HabitCatalogEntryDTO {
  id: string;
  label: string;
  category: HabitCategory;
  type: HabitType;
  minMinutes?: number;
}
