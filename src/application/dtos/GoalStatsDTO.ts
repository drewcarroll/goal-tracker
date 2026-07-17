export interface TrajectoryPointDTO {
  date: string; // YYYY-MM-DD
  cost: number;
  /** Normalized habit strength after this day: 1 = formed, 0 = the floor. */
  strength: number;
  /** This goal's own mark that day. */
  passed: boolean;
}

export interface GoalStatsDTO {
  goalId: string;
  label: string;
  weeklyFrequencyTarget: number;
  /** Full history, oldest first — the goal detail graph's real (non-projected) points. */
  trajectory: TrajectoryPointDTO[];
  /** Normalized strength before any check-in (0.5 at defaults) — the graph's start point. */
  initialStrength: number;
  /** Normalized strength after the most recent check-in (= initialStrength if none). */
  finalStrength: number;
  /** All-time count of days this goal's own mark was a pass. */
  timesCompleted: number;
  /**
   * Ghost-point projections for the chart: what the lock cost becomes if the
   * next planned day passes vs fails. The fail projection reflects the
   * current consecutive-miss escalation (docs/lock-formula.md §6.5).
   */
  nextIfPass: number;
  nextIfFail: number;
  /**
   * Normalized strength, day by day, if the next 14 planned days all pass /
   * all fail — the green and red future curves on the goal graph. Both
   * start from the goal's current state.
   */
  projectionIfPass: number[];
  projectionIfFail: number[];
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
