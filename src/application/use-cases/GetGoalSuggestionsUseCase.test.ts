import { describe, it, expect } from "vitest";
import { GetGoalSuggestionsUseCase } from "./GetGoalSuggestionsUseCase";

describe("GetGoalSuggestionsUseCase", () => {
  it("returns the flat suggestion list as DTOs", () => {
    const result = new GetGoalSuggestionsUseCase().execute();

    expect(result.length).toBeGreaterThan(0);
    expect(result.map((s) => s.label)).toContain("Gym");
    expect(result.map((s) => s.label)).toContain("No caffeine after 12pm");
  });
});
