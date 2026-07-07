import { describe, it, expect } from "vitest";
import { GetHabitCatalogUseCase } from "./GetHabitCatalogUseCase";

describe("GetHabitCatalogUseCase", () => {
  it("returns the full catalog as DTOs", () => {
    const result = new GetHabitCatalogUseCase().execute();

    expect(result.length).toBeGreaterThan(0);
    expect(result.find((e) => e.id === "exercise")).toMatchObject({
      label: "Exercise",
      category: "physical",
      type: "binary",
    });
    expect(result.find((e) => e.id === "meditate")).toMatchObject({
      minMinutes: 5,
      type: "timed",
    });
  });
});
