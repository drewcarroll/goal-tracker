export interface DailyPlanDTO {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  habitIds: string[];
  locksSpent: number;
  createdAt: string; // ISO 8601
}

export interface CreateDailyPlanDTO {
  userId: string;
  date: string; // YYYY-MM-DD, the user-local day being planned
  habitIds: string[];
}

export interface GetTodayPlanDTO {
  userId: string;
  date: string; // YYYY-MM-DD
}
