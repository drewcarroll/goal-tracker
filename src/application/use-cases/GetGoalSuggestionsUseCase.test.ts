import { describe, it, expect } from "vitest";
import { GetGoalSuggestionsUseCase } from "./GetGoalSuggestionsUseCase";

describe("GetGoalSuggestionsUseCase", () => {
  it("returns the suggestion list as DTOs", () => {
    const result = new GetGoalSuggestionsUseCase().execute();

    expect(result.length).toBeGreaterThan(0);
    expect(result.find((s) => s.label === "Exercise")).toMatchObject({ category: "physical" });
    expect(result.find((s) => s.label === "Meditate")).toMatchObject({ category: "mind" });
  });
});
