import { describe, it, expect } from "vitest";
import { GOAL_SUGGESTIONS } from "./GoalSuggestions";

describe("GOAL_SUGGESTIONS", () => {
  it("has no duplicate labels", () => {
    const labels = GOAL_SUGGESTIONS.map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("is non-empty", () => {
    expect(GOAL_SUGGESTIONS.length).toBeGreaterThan(0);
  });
});
