import { describe, it, expect } from "vitest";
import { GOAL_SUGGESTIONS } from "./GoalSuggestions";

describe("GOAL_SUGGESTIONS", () => {
  it("has no duplicate labels", () => {
    expect(new Set(GOAL_SUGGESTIONS).size).toBe(GOAL_SUGGESTIONS.length);
  });

  it("is non-empty", () => {
    expect(GOAL_SUGGESTIONS.length).toBeGreaterThan(0);
  });
});
