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

    // Target 7 → every miss breaks the week → the plain formula applies.
    const trajectory = service.trajectoryFor("h1", "medium", 7, checkIns);

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

    const h1 = service.trajectoryFor("h1", "easy", 7, checkIns);
    expect(h1.points).toEqual([{ date: "2026-01-01", cost: 21 }]); // 25 → 21 (pass)

    const h2 = service.trajectoryFor("h2", "easy", 7, checkIns);
    expect(h2.points[0]!.cost).toBeGreaterThan(25); // fail pushes h2 up
  });

  describe("weekly target = pricing only (docs/lock-formula.md §3.4)", () => {
    // 2026-01-05 is a Monday.
    it("a planned miss ALWAYS takes the fail step, whatever the target", () => {
      const checkIns = [checkIn("2026-01-05", [{ goalId: "h1", passed: false }])];

      const at7 = service.trajectoryFor("h1", "medium", 7, checkIns);
      const at5 = service.trajectoryFor("h1", "medium", 5, checkIns);

      // Same strength damage in both; only the φ pricing differs.
      expect(at7.finalState.strength).toBeCloseTo(-0.3, 10);
      expect(at5.finalState.strength).toBeCloseTo(-0.3, 10);
      expect(at7.finalState.consecutiveFails).toBe(1);
      expect(at5.finalState.consecutiveFails).toBe(1);
      expect(at7.finalCost).toBe(40); // base 39.5 · φ(7)=1
      expect(at5.finalCost).toBe(33); // base 39.5 · φ(5)=0.8333 → 32.9
    });

    it("editing the target re-prices history but never erases a miss", () => {
      const checkIns = [checkIn("2026-01-05", [{ goalId: "h1", passed: false }])];

      const ambitious = service.trajectoryFor("h1", "medium", 7, checkIns);
      const humble = service.trajectoryFor("h1", "medium", 4, checkIns);

      expect(ambitious.finalCost).toBe(40);
      expect(humble.finalCost).toBe(30); // base 39.5 · φ(4)=0.75 → 29.6; the miss still counts
      expect(humble.finalState.strength).toBe(ambitious.finalState.strength);
    });
  });

  it("ignores check-ins that don't include this goal", () => {
    const checkIns = [
      checkIn("2026-01-01", [{ goalId: "h1", passed: true }]),
      checkIn("2026-01-02", [{ goalId: "other-goal", passed: true }]),
    ];

    const trajectory = service.trajectoryFor("h1", "easy", 7, checkIns);

    expect(trajectory.points).toHaveLength(1);
    expect(trajectory.finalState.plannedDays).toBe(1);
  });

  it("returns initial cost and projections when the goal has no check-ins yet", () => {
    const trajectory = service.trajectoryFor("h1", "hard", 7, []);

    expect(trajectory.points).toEqual([]);
    expect(trajectory.finalCost).toBe(45);
    expect(trajectory.timesCompleted).toBe(0);
    expect(trajectory.nextIfPass).toBe(39); // 45 → 39 on a first-day pass
    expect(trajectory.nextIfFail).toBe(47); // 45 → 47 on a week-breaking first-day miss
  });

  it("projections match applying one more step to the final state", () => {
    const lockCostService = new LockCostService();
    const checkIns = [
      checkIn("2026-01-01", [{ goalId: "h1", passed: true }]),
      checkIn("2026-01-02", [{ goalId: "h1", passed: false }]),
    ];

    const trajectory = service.trajectoryFor("h1", "medium", 7, checkIns);

    expect(trajectory.nextIfPass).toBe(
      lockCostService.costFor(
        lockCostService.step(trajectory.finalState, true, "medium"),
        "medium",
        7,
      ),
    );
    expect(trajectory.nextIfFail).toBe(
      lockCostService.costFor(
        lockCostService.step(trajectory.finalState, false, "medium"),
        "medium",
        7,
      ),
    );
    // A second consecutive fail projects worse than the first did (escalation).
    expect(trajectory.nextIfFail).toBeGreaterThan(trajectory.points[1]!.cost);
  });
});
