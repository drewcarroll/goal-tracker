import { describe, it, expect } from "vitest";
import { DailyPlan, type DailyPlanProps } from "./DailyPlan";
import { LocalDate } from "../value-objects/LocalDate";
import { ValidationError } from "../errors/DomainError";

const base = {
  id: "plan-1",
  userId: "user-1",
  date: LocalDate.create("2026-07-06"),
  goalIds: ["goal-1", "goal-2"],
  locksSpent: 60,
  now: new Date("2026-07-05T22:00:00.000Z"),
};

describe("DailyPlan", () => {
  it("creates a valid plan and exposes it", () => {
    const plan = DailyPlan.create(base);
    expect(plan.goalIds).toEqual(["goal-1", "goal-2"]);
    expect(plan.locksSpent).toBe(60);
    expect(plan.date.equals(base.date)).toBe(true);
  });

  it("rejects an empty goal list", () => {
    expect(() => DailyPlan.create({ ...base, goalIds: [] })).toThrow(ValidationError);
  });

  it("rejects duplicate goal ids", () => {
    expect(() => DailyPlan.create({ ...base, goalIds: ["goal-1", "goal-1"] })).toThrow(
      ValidationError,
    );
  });

  it("rejects locksSpent over the 100 budget", () => {
    expect(() => DailyPlan.create({ ...base, locksSpent: 101 })).toThrow(ValidationError);
  });

  it("accepts locksSpent exactly at the 100 budget", () => {
    expect(() => DailyPlan.create({ ...base, locksSpent: 100 })).not.toThrow();
  });

  it("rejects negative locksSpent", () => {
    expect(() => DailyPlan.create({ ...base, locksSpent: -1 })).toThrow(ValidationError);
  });

  describe("rehydrate", () => {
    const validProps: DailyPlanProps = {
      id: "plan-1",
      userId: "user-1",
      date: LocalDate.create("2026-07-06"),
      goalIds: ["goal-1"],
      locksSpent: 25,
      createdAt: new Date("2026-07-05T22:00:00.000Z"),
    };

    it("accepts valid stored state", () => {
      expect(() => DailyPlan.rehydrate(validProps)).not.toThrow();
    });

    it("re-validates invariants on rehydrate", () => {
      expect(() => DailyPlan.rehydrate({ ...validProps, locksSpent: 200 })).toThrow(
        ValidationError,
      );
    });
  });
});
