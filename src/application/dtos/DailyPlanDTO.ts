// Re-exported so interfaces/ never needs to import domain/ directly for this.
export { DAILY_LOCK_BUDGET } from "@/domain/value-objects/LockCapacity";

export interface DailyPlanDTO {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  goalIds: string[];
  locksSpent: number;
  createdAt: string; // ISO 8601
}

export interface CreateDailyPlanDTO {
  userId: string;
  date: string; // YYYY-MM-DD, the user-local day being planned
  goalIds: string[];
}

export interface GetTodayPlanDTO {
  userId: string;
  date: string; // YYYY-MM-DD
}
