import { describe, it, expect } from "vitest";
import { Habit, type HabitProps } from "./Habit";
import { ValidationError } from "../errors/DomainError";

const base = {
  id: "habit-1",
  userId: "user-1",
  catalogId: "exercise",
  difficulty: "medium" as const,
  now: new Date("2026-01-01T00:00:00.000Z"),
};

describe("Habit", () => {
  it("creates a habit at its difficulty's starting lock cost, active", () => {
    const habit = Habit.create(base);
    expect(habit.currentLockCost).toBe(35);
    expect(habit.state).toBe("active");
    expect(habit.difficulty).toBe("medium");
    expect(habit.catalogId).toBe("exercise");
  });

  it("rejects an unrecognized catalog id", () => {
    expect(() => Habit.create({ ...base, catalogId: "not-a-real-habit" })).toThrow(
      ValidationError,
    );
  });

  describe("rehydrate", () => {
    const validProps: HabitProps = {
      id: "habit-1",
      userId: "user-1",
      catalogId: "exercise",
      difficulty: "hard",
      currentLockCost: 20,
      state: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    it("accepts valid stored state", () => {
      expect(() => Habit.rehydrate(validProps)).not.toThrow();
    });

    it("rejects an out-of-range lock cost", () => {
      expect(() => Habit.rehydrate({ ...validProps, currentLockCost: 0 })).toThrow(
        ValidationError,
      );
      expect(() => Habit.rehydrate({ ...validProps, currentLockCost: 51 })).toThrow(
        ValidationError,
      );
      expect(() => Habit.rehydrate({ ...validProps, currentLockCost: 1.5 })).toThrow(
        ValidationError,
      );
    });

    it("rejects an unrecognized catalog id", () => {
      expect(() => Habit.rehydrate({ ...validProps, catalogId: "nope" })).toThrow(
        ValidationError,
      );
    });
  });

  describe("applyDayResult", () => {
    it("lowers cost on PASS and transitions to formed once it hits 1", () => {
      const habit = Habit.rehydrate({
        id: "habit-1",
        userId: "user-1",
        catalogId: "exercise",
        difficulty: "easy",
        currentLockCost: 2,
        state: "active",
        createdAt: base.now,
      });
      habit.applyDayResult("PASS");
      expect(habit.currentLockCost).toBe(1);
      expect(habit.state).toBe("formed");
    });

    it("raises cost on FAIL without changing state", () => {
      const habit = Habit.create(base);
      habit.applyDayResult("FAIL");
      expect(habit.currentLockCost).toBe(39); // 35 * 1.1 = 38.5 -> 39
      expect(habit.state).toBe("active");
    });
  });

  describe("recomputeCost", () => {
    it("overwrites the cost directly", () => {
      const habit = Habit.create(base);
      habit.recomputeCost(10);
      expect(habit.currentLockCost).toBe(10);
    });

    it("transitions active -> formed when the recomputed cost hits the floor", () => {
      const habit = Habit.create(base);
      habit.recomputeCost(1);
      expect(habit.state).toBe("formed");
    });

    it("un-forms a formed habit when a correction pushes cost back above 1", () => {
      const habit = Habit.rehydrate({
        id: "habit-1",
        userId: "user-1",
        catalogId: "exercise",
        difficulty: "easy",
        currentLockCost: 1,
        state: "formed",
        createdAt: base.now,
      });
      habit.recomputeCost(5);
      expect(habit.state).toBe("active");
    });

    it("leaves a paused habit paused regardless of the recomputed cost", () => {
      const habit = Habit.create(base);
      habit.pause();
      habit.recomputeCost(1);
      expect(habit.state).toBe("paused");
    });

    it("rejects an out-of-range cost", () => {
      const habit = Habit.create(base);
      expect(() => habit.recomputeCost(0)).toThrow(ValidationError);
      expect(() => habit.recomputeCost(51)).toThrow(ValidationError);
    });
  });

  describe("pause / resume", () => {
    it("pauses an active habit", () => {
      const habit = Habit.create(base);
      habit.pause();
      expect(habit.state).toBe("paused");
    });

    it("resumes a paused habit", () => {
      const habit = Habit.create(base);
      habit.pause();
      habit.resume();
      expect(habit.state).toBe("active");
    });

    it("rejects pausing a non-active habit", () => {
      const habit = Habit.create(base);
      habit.pause();
      expect(() => habit.pause()).toThrow(ValidationError);
    });

    it("rejects resuming a non-paused habit", () => {
      const habit = Habit.create(base);
      expect(() => habit.resume()).toThrow(ValidationError);
    });
  });
});
