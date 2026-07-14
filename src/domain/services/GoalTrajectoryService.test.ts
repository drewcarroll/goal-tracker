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

  describe("weekly slack rule (docs/lock-formula.md §3.4)", () => {
    // 2026-01-05 is a Monday.
    it("a miss is NEUTRAL while the weekly target is still reachable", () => {
      // 5×/week goal, missed Monday: 0 passes + 6 days left ≥ 5 → recoverable.
      const checkIns = [checkIn("2026-01-05", [{ goalId: "h1", passed: false }])];

      const trajectory = service.trajectoryFor("h1", "medium", 5, checkIns);

      // Initial cost at target 5: 35·φ(5)=35·0.8333 ≈ 29. Unchanged by the miss.
      expect(trajectory.points).toEqual([{ date: "2026-01-05", cost: 29 }]);
      expect(trajectory.finalState.strength).toBe(0);
      expect(trajectory.finalState.consecutiveFails).toBe(0);
      expect(trajectory.finalState.plannedDays).toBe(1); // the day still happened
    });

    it("the same Monday miss on a 7×/week goal breaks the week and costs fully", () => {
      const checkIns = [checkIn("2026-01-05", [{ goalId: "h1", passed: false }])];

      const trajectory = service.trajectoryFor("h1", "medium", 7, checkIns);

      expect(trajectory.points[0]!.cost).toBe(40); // full first-day fail (docs §6.2)
      expect(trajectory.finalState.consecutiveFails).toBe(1);
    });

    it("misses start counting once they sink the week", () => {
      // 5×/week: Mon + Tue misses are recoverable (6 and 5 days left),
      // Wednesday's third miss leaves only 4 days for 5 passes → breaking.
      const checkIns = [
        checkIn("2026-01-05", [{ goalId: "h1", passed: false }]),
        checkIn("2026-01-06", [{ goalId: "h1", passed: false }]),
        checkIn("2026-01-07", [{ goalId: "h1", passed: false }]),
      ];

      const trajectory = service.trajectoryFor("h1", "medium", 5, checkIns);

      expect(trajectory.points[0]!.cost).toBe(29); // neutral
      expect(trajectory.points[1]!.cost).toBe(29); // neutral
      expect(trajectory.points[2]!.cost).toBeGreaterThan(29); // the week just died
      expect(trajectory.finalState.consecutiveFails).toBe(1); // only the breaking miss counts
    });

    it("weekly pass counting resets each Mon-Sun week", () => {
      // 5×/week: five passes Mon-Fri, then a Saturday miss is recoverable
      // (target already met). Next week's Thursday miss after zero passes is
      // still recoverable (0 + 3 remaining... 0+3 < 5 → breaking!).
      const week1 = ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08", "2026-01-09"].map(
        (d) => checkIn(d, [{ goalId: "h1", passed: true }]),
      );
      const satMiss = checkIn("2026-01-10", [{ goalId: "h1", passed: false }]);
      const nextThuMiss = checkIn("2026-01-15", [{ goalId: "h1", passed: false }]);

      const afterSat = service.trajectoryFor("h1", "medium", 5, [...week1, satMiss]);
      const satCost = afterSat.points[afterSat.points.length - 1]!.cost;
      expect(satCost).toBe(afterSat.points[afterSat.points.length - 2]!.cost); // neutral

      const afterThu = service.trajectoryFor("h1", "medium", 5, [...week1, satMiss, nextThuMiss]);
      const thuCost = afterThu.points[afterThu.points.length - 1]!.cost;
      expect(thuCost).toBeGreaterThan(satCost); // new week, 0 passes, 3 days left < 5
    });
  });

  it("lowering the target retroactively forgives now-recoverable misses AND discounts cost", () => {
    // One Monday miss. At 7×/week it's a break; at 4×/week it was harmless.
    const checkIns = [checkIn("2026-01-05", [{ goalId: "h1", passed: false }])];

    const ambitious = service.trajectoryFor("h1", "medium", 7, checkIns);
    const humble = service.trajectoryFor("h1", "medium", 4, checkIns);

    expect(ambitious.finalCost).toBe(40);
    expect(humble.finalCost).toBe(26); // 35·φ(4)=26.25→26, miss forgiven entirely
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
