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
  createdAt: string; // ISO 8601
}

export interface SubmitCheckInDTO {
  userId: string;
  date: string; // YYYY-MM-DD
  marks: GoalMarkDTO[];
}
