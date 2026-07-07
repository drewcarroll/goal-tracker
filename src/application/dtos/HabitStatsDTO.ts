export interface TrajectoryPointDTO {
  date: string; // YYYY-MM-DD
  cost: number;
}

export interface HabitStatsDTO {
  habitId: string;
  label: string;
  /** Full history, oldest first — "distance to habit formed" over time. */
  trajectory: TrajectoryPointDTO[];
  /** Among this habit's check-ins in the last 30 days, the share that PASSed. */
  last30: {
    checkedInDays: number;
    passedDays: number;
    /** 0-100, or null if the habit has no check-ins in the window yet. */
    passRate: number | null;
  };
}

export interface GetHabitStatsDTO {
  userId: string;
  habitId: string;
  /** "Today" in the user's timezone — anchors the last-30-day window. */
  today: string; // YYYY-MM-DD
}
