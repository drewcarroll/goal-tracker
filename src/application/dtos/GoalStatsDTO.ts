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
  /** All-time count of days this goal's own mark was a pass. */
  timesCompleted: number;
  /**
   * Ghost-point projections for the chart: what the lock cost becomes if the
   * next planned day passes vs fails. The fail projection reflects the
   * current consecutive-miss escalation (docs/lock-formula.md §6.5).
   */
  nextIfPass: number;
  nextIfFail: number;
  /** Among this goal's check-ins in the last 30 days, the share where ITS OWN mark passed. */
  last30: {
    checkedInDays: number;
    passedDays: number;
    /** 0-100, or null if the goal has no check-ins in the window yet. */
    passRate: number | null;
  };
  /** Days this goal's own mark passed within the current Mon-Sun week. */
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
