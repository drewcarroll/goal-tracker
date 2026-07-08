export interface TrajectoryPointDTO {
  date: string; // YYYY-MM-DD
  cost: number;
}

export interface GoalStatsDTO {
  goalId: string;
  label: string;
  weeklyFrequencyTarget: number;
  /** Full history, oldest first — "distance to formed" over time. */
  trajectory: TrajectoryPointDTO[];
  /** Among this goal's check-ins in the last 30 days, the share that PASSed. */
  last30: {
    checkedInDays: number;
    passedDays: number;
    /** 0-100, or null if the goal has no check-ins in the window yet. */
    passRate: number | null;
  };
  /** Completed check-ins (PASS) for this goal within the current Mon-Sun week. */
  thisWeek: {
    completed: number;
    target: number;
  };
}

export interface GetGoalStatsDTO {
  userId: string;
  goalId: string;
  /** "Today" in the user's timezone — anchors the last-30-day/this-week windows. */
  today: string; // YYYY-MM-DD
}
