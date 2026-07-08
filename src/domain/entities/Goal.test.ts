import { describe, it, expect } from "vitest";
import { Goal, type GoalProps } from "./Goal";
import { ValidationError } from "../errors/DomainError";

const base = {
  id: "goal-1",
  userId: "user-1",
  name: "Exercise",
  weeklyFrequencyTarget: 3,
  difficulty: "medium" as const,
  now: new Date("2026-01-01T00:00:00.000Z"),
};

describe("Goal", () => {
  it("creates a goal at its difficulty's starting lock cost, active", () => {
    const goal = Goal.create(base);
    expect(goal.name).toBe("Exercise");
    expect(goal.weeklyFrequencyTarget).toBe(3);
    expect(goal.currentLockCost).toBe(35);
    expect(goal.state).toBe("active");
    expect(goal.difficulty).toBe("medium");
  });

  it("trims the name", () => {
    expect(Goal.create({ ...base, name: "  Exercise  " }).name).toBe("Exercise");
  });

  it("rejects an empty name", () => {
    expect(() => Goal.create({ ...base, name: "" })).toThrow(ValidationError);
    expect(() => Goal.create({ ...base, name: "   " })).toThrow(ValidationError);
  });

  it("rejects a name over the length cap", () => {
    expect(() => Goal.create({ ...base, name: "a".repeat(201) })).toThrow(ValidationError);
  });

  it("rejects an out-of-range weekly frequency target", () => {
    expect(() => Goal.create({ ...base, weeklyFrequencyTarget: 0 })).toThrow(ValidationError);
    expect(() => Goal.create({ ...base, weeklyFrequencyTarget: 8 })).toThrow(ValidationError);
    expect(() => Goal.create({ ...base, weeklyFrequencyTarget: 2.5 })).toThrow(ValidationError);
  });

  it("accepts weekly frequency targets at the boundary", () => {
    expect(() => Goal.create({ ...base, weeklyFrequencyTarget: 1 })).not.toThrow();
    expect(() => Goal.create({ ...base, weeklyFrequencyTarget: 7 })).not.toThrow();
  });

  describe("rehydrate", () => {
    const validProps: GoalProps = {
      id: "goal-1",
      userId: "user-1",
      name: "Exercise",
      weeklyFrequencyTarget: 3,
      difficulty: "hard",
      currentLockCost: 20,
      state: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    it("accepts valid stored state", () => {
      expect(() => Goal.rehydrate(validProps)).not.toThrow();
    });

    it("rejects an out-of-range lock cost", () => {
      expect(() => Goal.rehydrate({ ...validProps, currentLockCost: 0 })).toThrow(
        ValidationError,
      );
      expect(() => Goal.rehydrate({ ...validProps, currentLockCost: 51 })).toThrow(
        ValidationError,
      );
    });
  });

  describe("edit", () => {
    it("updates the name and weekly frequency target without touching cost", () => {
      const goal = Goal.create(base);
      goal.edit({ name: "Exercise daily", weeklyFrequencyTarget: 5 });
      expect(goal.name).toBe("Exercise daily");
      expect(goal.weeklyFrequencyTarget).toBe(5);
      expect(goal.currentLockCost).toBe(35);
    });

    it("re-validates invariants", () => {
      const goal = Goal.create(base);
      expect(() => goal.edit({ name: "", weeklyFrequencyTarget: 3 })).toThrow(ValidationError);
      expect(() => goal.edit({ name: "Exercise", weeklyFrequencyTarget: 10 })).toThrow(
        ValidationError,
      );
    });
  });

  describe("applyDayResult", () => {
    it("lowers cost on PASS and transitions to formed once it hits 1", () => {
      const goal = Goal.rehydrate({
        id: "goal-1",
        userId: "user-1",
        name: "Exercise",
        weeklyFrequencyTarget: 3,
        difficulty: "easy",
        currentLockCost: 2,
        state: "active",
        createdAt: base.now,
      });
      goal.applyDayResult("PASS");
      expect(goal.currentLockCost).toBe(1);
      expect(goal.state).toBe("formed");
    });

    it("raises cost on FAIL without changing state", () => {
      const goal = Goal.create(base);
      goal.applyDayResult("FAIL");
      expect(goal.currentLockCost).toBe(39); // 35 * 1.1 = 38.5 -> 39
      expect(goal.state).toBe("active");
    });
  });

  describe("recomputeCost", () => {
    it("overwrites the cost directly", () => {
      const goal = Goal.create(base);
      goal.recomputeCost(10);
      expect(goal.currentLockCost).toBe(10);
    });

    it("transitions active -> formed when the recomputed cost hits the floor", () => {
      const goal = Goal.create(base);
      goal.recomputeCost(1);
      expect(goal.state).toBe("formed");
    });

    it("un-forms a formed goal when a correction pushes cost back above 1", () => {
      const goal = Goal.rehydrate({
        id: "goal-1",
        userId: "user-1",
        name: "Exercise",
        weeklyFrequencyTarget: 3,
        difficulty: "easy",
        currentLockCost: 1,
        state: "formed",
        createdAt: base.now,
      });
      goal.recomputeCost(5);
      expect(goal.state).toBe("active");
    });

    it("leaves a paused goal paused regardless of the recomputed cost", () => {
      const goal = Goal.create(base);
      goal.pause();
      goal.recomputeCost(1);
      expect(goal.state).toBe("paused");
    });

    it("rejects an out-of-range cost", () => {
      const goal = Goal.create(base);
      expect(() => goal.recomputeCost(0)).toThrow(ValidationError);
      expect(() => goal.recomputeCost(51)).toThrow(ValidationError);
    });
  });

  describe("pause / resume", () => {
    it("pauses an active goal", () => {
      const goal = Goal.create(base);
      goal.pause();
      expect(goal.state).toBe("paused");
    });

    it("resumes a paused goal", () => {
      const goal = Goal.create(base);
      goal.pause();
      goal.resume();
      expect(goal.state).toBe("active");
    });

    it("rejects pausing a non-active goal", () => {
      const goal = Goal.create(base);
      goal.pause();
      expect(() => goal.pause()).toThrow(ValidationError);
    });

    it("rejects resuming a non-paused goal", () => {
      const goal = Goal.create(base);
      expect(() => goal.resume()).toThrow(ValidationError);
    });
  });
});
