import { describe, it, expect } from "vitest";
import { GetMaintenanceStatusUseCase } from "./GetMaintenanceStatusUseCase";
import { Clock } from "../ports/Clock";

class FixedClock implements Clock {
  constructor(private readonly date: Date) {}
  now() {
    return this.date;
  }
}

describe("GetMaintenanceStatusUseCase", () => {
  it("is not blocked within the 12-month battle-pass map", () => {
    const useCase = new GetMaintenanceStatusUseCase(new FixedClock(new Date("2026-09-15T12:00:00Z")));
    expect(useCase.execute("UTC").blocked).toBe(false);
  });

  it("is blocked once the current month falls outside the map", () => {
    const useCase = new GetMaintenanceStatusUseCase(new FixedClock(new Date("2027-08-01T12:00:00Z")));
    expect(useCase.execute("UTC").blocked).toBe(true);
  });
});
