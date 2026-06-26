import { describe, it, expect } from "vitest";
import { Goal } from "./Goal";
import { ValidationError } from "../errors/DomainError";

// A 5-week session anchored on a Monday: Jan 5 -> Feb 9 (UTC), exclusive end.
function makeGoal() {
  return Goal.create({
    id: "goal-1",
    userId: "user-1",
    sessionId: "session-1",
    name: "Read books",
    weeklyTarget: 10, // 10/week × 5 weeks = 50 total
    unit: "books",
    startDate: new Date("2026-01-05T00:00:00.000Z"),
    endDate: new Date("2026-02-09T00:00:00.000Z"),
    now: new Date("2026-01-05T00:00:00.000Z"),
  });
}

// Jan 20 sits in week index 2 (the third week).
const inWeek3 = new Date("2026-01-20T00:00:00.000Z");

describe("Goal.logProgress", () => {
  it("attributes the log to the week containing `today`", () => {
    const goal = makeGoal();
    const entry = goal.logProgress({ id: "log-1", value: 4, today: inWeek3 });

    expect(entry.goalId).toBe("goal-1");
    expect(entry.userId).toBe("user-1");
    expect(entry.weekIndex).toBe(2);
    expect(entry.value).toBe(4);
  });

  it("accumulates multiple logs in the same week into the projection", () => {
    const goal = makeGoal();
    goal.logProgress({ id: "log-1", value: 4, today: inWeek3 });
    goal.logProgress({ id: "log-2", value: 7, today: inWeek3 });

    const projection = goal.project(inWeek3);
    // weeklyTarget is 50/5 = 10; the current week now has 11 logged, kept as bonus.
    expect(projection.weeks[2]).toMatchObject({ actual: 11, contribution: 11 });
  });

  it("rejects a non-positive amount", () => {
    const goal = makeGoal();
    expect(() => goal.logProgress({ id: "log-1", value: 0, today: inWeek3 })).toThrow();
  });

  describe("backfill (explicit weekIndex)", () => {
    it("records the entry against the chosen past week", () => {
      const goal = makeGoal();
      const entry = goal.logProgress({ id: "log-1", value: 5, today: inWeek3, weekIndex: 0 });

      expect(entry.weekIndex).toBe(0);
      expect(goal.project(inWeek3).weeks[0]).toMatchObject({ actual: 5 });
    });

    it("allows backfilling the current week explicitly", () => {
      const goal = makeGoal();
      const entry = goal.logProgress({ id: "log-1", value: 5, today: inWeek3, weekIndex: 2 });
      expect(entry.weekIndex).toBe(2);
    });

    it("rejects a week outside the session", () => {
      const goal = makeGoal(); // 5-week session -> valid indexes 0..4
      expect(() =>
        goal.logProgress({ id: "log-1", value: 5, today: inWeek3, weekIndex: 5 }),
      ).toThrow(ValidationError);
      expect(() =>
        goal.logProgress({ id: "log-1", value: 5, today: inWeek3, weekIndex: -1 }),
      ).toThrow(ValidationError);
    });

    it("rejects a week that has not started yet", () => {
      const goal = makeGoal(); // today is week index 2; week 3 is still future
      expect(() =>
        goal.logProgress({ id: "log-1", value: 5, today: inWeek3, weekIndex: 3 }),
      ).toThrow(ValidationError);
    });

    it("allows backfilling any week once the session has ended", () => {
      const goal = makeGoal();
      const afterEnd = new Date("2026-03-05T00:00:00.000Z");
      const entry = goal.logProgress({ id: "log-1", value: 5, today: afterEnd, weekIndex: 4 });
      expect(entry.weekIndex).toBe(4);
    });
  });
});
