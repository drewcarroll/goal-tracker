import { describe, it, expect } from "vitest";
import { GoalTrajectoryService } from "./GoalTrajectoryService";
import { LockCostService } from "./LockCostService";
import { CheckIn } from "../entities/CheckIn";
import { LocalDate } from "../value-objects/LocalDate";

const service = new GoalTrajectoryService(new LockCostService());

function checkIn(date: string, marks: { goalId: string; passed: boolean }[]) {
  return CheckIn.create({
    id: `c-${date}`,
    userId: "user-1",
    date: LocalDate.create(date),
    marks,
    submittedOnTime: true,
  });
}

describe("GoalTrajectoryService", () => {
  it("replays the goal's own marks in date order through the formula", () => {
    const checkIns = [
      // Deliberately out of order to prove it sorts by date, not input order.
      checkIn("2026-01-03", [{ goalId: "h1", passed: true }]),
      checkIn("2026-01-01", [{ goalId: "h1", passed: true }]),
      checkIn("2026-01-02", [{ goalId: "h1", passed: false }]),
    ];

    const trajectory = service.trajectoryFor("h1", "medium", checkIns);

    // Hand-computed at defaults (docs/lock-formula.md §3/§4):
    // day1 pass  κ=2.50: H=0.15    → cost 30
    // day2 fail  κ=2.35: H≈−0.0897 → cost 36
    // day3 pass  κ=2.20: H≈0.0541  → cost 33
    expect(trajectory.points).toEqual([
      { date: "2026-01-01", cost: 30 },
      { date: "2026-01-02", cost: 36 },
      { date: "2026-01-03", cost: 33 },
    ]);
    expect(trajectory.finalCost).toBe(33);
    expect(trajectory.timesCompleted).toBe(2);
    expect(trajectory.finalState.plannedDays).toBe(3);
    expect(trajectory.finalState.consecutiveFails).toBe(0);
  });

  it("uses the goal's OWN mark, not the day result (per-goal contingency)", () => {
    // h1 passed; h2 failing makes the DAY a FAIL, but h1's cost must still drop.
    const checkIns = [
      checkIn("2026-01-01", [
        { goalId: "h1", passed: true },
        { goalId: "h2", passed: false },
      ]),
    ];

    const h1 = service.trajectoryFor("h1", "easy", checkIns);
    expect(h1.points).toEqual([{ date: "2026-01-01", cost: 21 }]); // 25 → 21 (pass)

    const h2 = service.trajectoryFor("h2", "easy", checkIns);
    expect(h2.points[0]!.cost).toBeGreaterThan(25); // fail pushes h2 up
  });

  it("ignores check-ins that don't include this goal", () => {
    const checkIns = [
      checkIn("2026-01-01", [{ goalId: "h1", passed: true }]),
      checkIn("2026-01-02", [{ goalId: "other-goal", passed: true }]),
    ];

    const trajectory = service.trajectoryFor("h1", "easy", checkIns);

    expect(trajectory.points).toHaveLength(1);
    expect(trajectory.finalState.plannedDays).toBe(1);
  });

  it("returns initial cost and projections when the goal has no check-ins yet", () => {
    const trajectory = service.trajectoryFor("h1", "hard", []);

    expect(trajectory.points).toEqual([]);
    expect(trajectory.finalCost).toBe(45);
    expect(trajectory.timesCompleted).toBe(0);
    expect(trajectory.nextIfPass).toBe(39); // 45 → 39 on a first-day pass
    expect(trajectory.nextIfFail).toBe(47); // 45 → 47 on a first-day fail
  });

  it("projections match applying one more step to the final state", () => {
    const lockCostService = new LockCostService();
    const checkIns = [
      checkIn("2026-01-01", [{ goalId: "h1", passed: true }]),
      checkIn("2026-01-02", [{ goalId: "h1", passed: false }]),
    ];

    const trajectory = service.trajectoryFor("h1", "medium", checkIns);

    expect(trajectory.nextIfPass).toBe(
      lockCostService.costFor(lockCostService.step(trajectory.finalState, true, "medium"), "medium"),
    );
    expect(trajectory.nextIfFail).toBe(
      lockCostService.costFor(
        lockCostService.step(trajectory.finalState, false, "medium"),
        "medium",
      ),
    );
    // A second consecutive fail projects worse than the first did (escalation).
    expect(trajectory.nextIfFail).toBeGreaterThan(trajectory.points[1]!.cost);
  });
});
