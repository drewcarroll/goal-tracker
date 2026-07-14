export interface GoalMarkDTO {
  goalId: string;
  passed: boolean;
}

export interface CheckInDTO {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  marks: GoalMarkDTO[];
  dayResult: "PASS" | "FAIL";
  /** True only for check-ins originally submitted within the nightly window. */
  submittedOnTime: boolean;
  createdAt: string; // ISO 8601
}

/**
 * The nightly check-in. No date: the target day is resolved server-side from
 * the user's timezone and check-in window (docs/progression.md §3) — a
 * submission at 1 AM belongs to yesterday, and outside the window it is
 * rejected outright.
 */
export interface SubmitCheckInDTO {
  userId: string;
  /** IANA timezone, e.g. "America/Denver". */
  timezone: string;
  marks: GoalMarkDTO[];
}

/** Backfilling a missed past day via /history — never earns a rank point. */
export interface BackfillCheckInDTO {
  userId: string;
  date: string; // YYYY-MM-DD
  marks: GoalMarkDTO[];
}
