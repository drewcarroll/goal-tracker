import { describe, it, expect } from "vitest";
import { HabitTrajectoryService } from "./HabitTrajectoryService";
import { CheckIn } from "../entities/CheckIn";
import { LocalDate } from "../value-objects/LocalDate";

const service = new HabitTrajectoryService();

function checkIn(date: string, marks: { habitId: string; passed: boolean }[]) {
  return CheckIn.create({ id: `c-${date}`, userId: "user-1", date: LocalDate.create(date), marks });
}

describe("HabitTrajectoryService", () => {
  it("replays PASS/FAIL results in date order from the difficulty's starting cost", () => {
    const checkIns = [
      // Deliberately out of order to prove it sorts by date, not input order.
      checkIn("2026-01-03", [{ habitId: "h1", passed: true }]),
      checkIn("2026-01-01", [{ habitId: "h1", passed: true }]),
      checkIn("2026-01-02", [{ habitId: "h1", passed: false }]),
    ];

    const trajectory = service.trajectoryFor("h1", "medium", checkIns);

    expect(trajectory).toEqual([
      { date: "2026-01-01", cost: 34 }, // 35 - 1
      { date: "2026-01-02", cost: 37 }, // 34 * 1.1 = 37.4 -> 37
      { date: "2026-01-03", cost: 36 }, // 37 - 1
    ]);
  });

  it("ignores check-ins that don't include this habit", () => {
    const checkIns = [
      checkIn("2026-01-01", [{ habitId: "h1", passed: true }]),
      checkIn("2026-01-02", [{ habitId: "other-habit", passed: true }]),
    ];

    const trajectory = service.trajectoryFor("h1", "easy", checkIns);

    expect(trajectory).toEqual([{ date: "2026-01-01", cost: 24 }]);
  });

  it("returns an empty trajectory when the habit has no check-ins yet", () => {
    expect(service.trajectoryFor("h1", "hard", [])).toEqual([]);
  });

  it("applies the day's overall result even when this habit was individually passed", () => {
    // The habit itself passed, but the day still FAILs because another
    // scheduled habit missed — the whole-day rule applies uniformly.
    const checkIns = [
      checkIn("2026-01-01", [
        { habitId: "h1", passed: true },
        { habitId: "h2", passed: false },
      ]),
    ];

    const trajectory = service.trajectoryFor("h1", "easy", checkIns);

    expect(trajectory).toEqual([{ date: "2026-01-01", cost: 28 }]); // 25 * 1.1 = 27.5 -> 28
  });
});
