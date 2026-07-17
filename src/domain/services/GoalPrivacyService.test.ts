import { describe, it, expect } from "vitest";
import { GoalPrivacyService } from "./GoalPrivacyService";
import { Goal } from "../entities/Goal";

function makeGoal(id: string, isPublic: boolean) {
  return Goal.create({
    id,
    userId: "user-1",
    name: "Exercise",
    weeklyFrequencyTarget: 7,
    initialLockCost: 20,
    isPublic,
    now: new Date("2026-01-01T00:00:00.000Z"),
  });
}

describe("GoalPrivacyService", () => {
  const service = new GoalPrivacyService();

  describe("filterPublicGoals", () => {
    it("keeps only public goals", () => {
      const goals = [makeGoal("g1", true), makeGoal("g2", false), makeGoal("g3", true)];
      const result = service.filterPublicGoals(goals);
      expect(result.map((g) => g.id)).toEqual(["g1", "g3"]);
    });

    it("returns an empty array when every goal is private", () => {
      expect(service.filterPublicGoals([makeGoal("g1", false)])).toEqual([]);
    });
  });

  describe("filterPublicMarks", () => {
    it("keeps only marks for public goal ids", () => {
      const marks = [
        { goalId: "g1", passed: true },
        { goalId: "g2", passed: false },
      ];
      const result = service.filterPublicMarks(marks, new Set(["g1"]));
      expect(result).toEqual([{ goalId: "g1", passed: true }]);
    });

    it("returns an empty array — not a redacted placeholder — when nothing is public", () => {
      const marks = [
        { goalId: "g1", passed: true },
        { goalId: "g2", passed: false },
      ];
      const result = service.filterPublicMarks(marks, new Set());
      expect(result).toEqual([]);
    });
  });
});
