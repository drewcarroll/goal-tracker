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

    // Target 7 → φ = 1, the plain formula applies. today = the last check-in
    // date, so no disuse decay kicks in (well under staleAfterDays=10).
    const trajectory = service.trajectoryFor("h1", 7, checkIns, "2026-01-03");

    // Hand-computed at defaults (docs/lock-formula.md §3/§4), uniform
    // C0=20 (difficulty tier removed 2026-07-16):
    // day1 pass  κ=2.50: H=0.15    → cost 1+19·0.85=17.15 → 17
    // day2 fail  κ=2.35: H≈−0.0897 → cost 20+19·0.0897=21.70 → 22
    // day3 pass  κ=2.20: H≈0.0541  → cost 1+19·0.9459=18.97 → 19
    expect(trajectory.points.map((p) => ({ date: p.date, cost: p.cost, passed: p.passed }))).toEqual([
      { date: "2026-01-01", cost: 17, passed: true },
      { date: "2026-01-02", cost: 22, passed: false },
      { date: "2026-01-03", cost: 19, passed: true },
    ]);
    expect(trajectory.finalCost).toBe(19);
    expect(trajectory.timesCompleted).toBe(2);
    expect(trajectory.finalState.plannedDays).toBe(3);
    expect(trajectory.finalState.consecutiveFails).toBe(0);
    // Normalized strength: (H − Smin) / (1 − Smin) = (H + 1) / 2 at defaults.
    expect(trajectory.points[0]!.strength).toBeCloseTo(0.575, 10);
    expect(trajectory.points[1]!.strength).toBeCloseTo(0.4551, 3);
    expect(trajectory.points[2]!.strength).toBeCloseTo(0.5271, 3);
    expect(trajectory.initialStrength).toBeCloseTo(0.5, 10); // (0 − (−1)) / 2
    expect(trajectory.finalStrength).toBe(trajectory.points[2]!.strength);
  });

  it("uses the goal's OWN mark, not the day result (per-goal contingency)", () => {
    // h1 passed; h2 failing makes the DAY a FAIL, but h1's cost must still drop.
    const checkIns = [
      checkIn("2026-01-01", [
        { goalId: "h1", passed: true },
        { goalId: "h2", passed: false },
      ]),
    ];

    const h1 = service.trajectoryFor("h1", 7, checkIns, "2026-01-01");
    expect(h1.points[0]).toMatchObject({ date: "2026-01-01", cost: 17, passed: true }); // 20 → 17 (pass)

    const h2 = service.trajectoryFor("h2", 7, checkIns, "2026-01-01");
    expect(h2.points[0]!.cost).toBeGreaterThan(20); // fail pushes h2 up
  });

  describe("weekly target = pricing only (docs/lock-formula.md §3.4)", () => {
    // 2026-01-05 is a Monday.
    it("a planned miss ALWAYS takes the fail step, whatever the target", () => {
      const checkIns = [checkIn("2026-01-05", [{ goalId: "h1", passed: false }])];

      const at7 = service.trajectoryFor("h1", 7, checkIns, "2026-01-05");
      const at5 = service.trajectoryFor("h1", 5, checkIns, "2026-01-05");

      // Same strength damage in both; only the φ pricing differs.
      expect(at7.finalState.strength).toBeCloseTo(-0.3, 10);
      expect(at5.finalState.strength).toBeCloseTo(-0.3, 10);
      expect(at7.finalState.consecutiveFails).toBe(1);
      expect(at5.finalState.consecutiveFails).toBe(1);
      expect(at7.finalCost).toBe(26); // base 20 + 19·0.30 = 25.7 · φ(7)=1
      expect(at5.finalCost).toBe(21); // base 25.7 · φ(5)=0.8333 → 21.42
    });

    it("editing the target re-prices history but never erases a miss", () => {
      const checkIns = [checkIn("2026-01-05", [{ goalId: "h1", passed: false }])];

      const ambitious = service.trajectoryFor("h1", 7, checkIns, "2026-01-05");
      const humble = service.trajectoryFor("h1", 4, checkIns, "2026-01-05");

      expect(ambitious.finalCost).toBe(26);
      expect(humble.finalCost).toBe(19); // base 25.7 · φ(4)=0.75 → 19.275; the miss still counts
      expect(humble.finalState.strength).toBe(ambitious.finalState.strength);
    });
  });

  it("ignores check-ins that don't include this goal", () => {
    const checkIns = [
      checkIn("2026-01-01", [{ goalId: "h1", passed: true }]),
      checkIn("2026-01-02", [{ goalId: "other-goal", passed: true }]),
    ];

    const trajectory = service.trajectoryFor("h1", 7, checkIns, "2026-01-02");

    expect(trajectory.points).toHaveLength(1);
    expect(trajectory.finalState.plannedDays).toBe(1);
  });

  it("returns initial cost and projections when the goal has no check-ins yet", () => {
    const trajectory = service.trajectoryFor("h1", 7, [], "2026-01-01");

    expect(trajectory.points).toEqual([]);
    expect(trajectory.finalCost).toBe(20);
    expect(trajectory.timesCompleted).toBe(0);
    expect(trajectory.nextIfPass).toBe(17); // 20 → 17 on a first-day pass
    expect(trajectory.nextIfFail).toBe(26); // 20 → 26 on a first-day miss
  });

  it("projections match applying one more step to the final state", () => {
    const lockCostService = new LockCostService();
    const checkIns = [
      checkIn("2026-01-01", [{ goalId: "h1", passed: true }]),
      checkIn("2026-01-02", [{ goalId: "h1", passed: false }]),
    ];

    const trajectory = service.trajectoryFor("h1", 7, checkIns, "2026-01-02");

    expect(trajectory.nextIfPass).toBe(
      lockCostService.costFor(lockCostService.step(trajectory.finalState, true), 7),
    );
    expect(trajectory.nextIfFail).toBe(
      lockCostService.costFor(lockCostService.step(trajectory.finalState, false), 7),
    );
    // A second consecutive fail projects worse than the first did (escalation).
    expect(trajectory.nextIfFail).toBeGreaterThan(trajectory.points[1]!.cost);
  });

  describe("disuse decay (docs/lock-formula.md §3.6)", () => {
    it("a gap under staleAfterDays between check-ins has no effect", () => {
      const checkIns = [
        checkIn("2026-01-01", [{ goalId: "h1", passed: true }]),
        // 9 days later — under the default 10-day threshold.
        checkIn("2026-01-10", [{ goalId: "h1", passed: true }]),
      ];
      const trajectory = service.trajectoryFor("h1", 7, checkIns, "2026-01-10");

      // Both a pass from a fresh replay AND this gapped replay land on the
      // same H, since the gap never crossed the stale threshold.
      const undisturbed = service.trajectoryFor(
        "h1",
        7,
        [checkIn("2026-01-01", [{ goalId: "h1", passed: true }])],
        "2026-01-01",
      );
      const secondPassFromFresh = new LockCostService().step(undisturbed.finalState, true);
      expect(trajectory.finalState.strength).toBeCloseTo(secondPassFromFresh.strength, 10);
    });

    it("a gap beyond staleAfterDays decays strength toward neutral before the next check-in lands", () => {
      const checkIns = [
        // First pass drives H well above neutral.
        checkIn("2026-01-01", [{ goalId: "h1", passed: true }]),
        // 25 days later: 24 days between them, 14 of them beyond the 10-day
        // threshold, so 14 days of decay apply BEFORE the second pass steps.
        checkIn("2026-01-26", [{ goalId: "h1", passed: true }]),
      ];
      const trajectory = service.trajectoryFor("h1", 7, checkIns, "2026-01-26");

      const noGap = service.trajectoryFor(
        "h1",
        7,
        [
          checkIn("2026-01-01", [{ goalId: "h1", passed: true }]),
          checkIn("2026-01-02", [{ goalId: "h1", passed: true }]),
        ],
        "2026-01-02",
      );

      // The decayed replay's second pass starts from a LOWER (more neutral)
      // strength than an undisturbed back-to-back pass would, so it lands
      // lower too — decay erased some of the first pass's gain.
      expect(trajectory.points[1]!.strength).toBeLessThan(noGap.points[1]!.strength);
    });

    it("decays a struggling goal's negative strength back UP toward neutral, not further down", () => {
      const checkIns = [checkIn("2026-01-01", [{ goalId: "h1", passed: false }])];
      const afterFail = service.trajectoryFor("h1", 7, checkIns, "2026-01-01");
      expect(afterFail.finalState.strength).toBeLessThan(0);

      // Same fail, but now 30 days pass with no further check-in at all —
      // trailing decay should pull strength back up toward 0.
      const stale = service.trajectoryFor("h1", 7, checkIns, "2026-01-31");
      expect(stale.finalState.strength).toBeGreaterThan(afterFail.finalState.strength);
      expect(stale.finalState.strength).toBeLessThan(0); // forgiven, not erased
    });

    it("trailing decay also resets the consecutive-fail streak", () => {
      const checkIns = [
        checkIn("2026-01-01", [{ goalId: "h1", passed: false }]),
        checkIn("2026-01-02", [{ goalId: "h1", passed: false }]),
      ];
      const fresh = service.trajectoryFor("h1", 7, checkIns, "2026-01-02");
      expect(fresh.finalState.consecutiveFails).toBe(2);

      const stale = service.trajectoryFor("h1", 7, checkIns, "2026-02-05");
      expect(stale.finalState.consecutiveFails).toBe(0);
    });
  });
});
