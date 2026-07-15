import { describe, expect, it } from "vitest";
import { LockCostService, type HabitState } from "./LockCostService";
import {
  DEFAULT_LOCK_FORMULA_CONFIG,
  type LockFormulaConfig,
} from "../value-objects/LockFormulaConfig";

/**
 * Expected values here are hand-computed from the worked examples in
 * docs/lock-formula.md §6 — if a test fails, either the implementation or
 * that document is wrong; fix whichever it is, never just the test.
 */
describe("LockCostService", () => {
  const service = new LockCostService();
  const fresh: HabitState = { strength: 0, plannedDays: 0, consecutiveFails: 0 };

  describe("initialCostFor / initialState", () => {
    it("uses the config's per-difficulty initial costs", () => {
      expect(service.initialCostFor("easy", 7)).toBe(25);
      expect(service.initialCostFor("medium", 7)).toBe(35);
      expect(service.initialCostFor("hard", 7)).toBe(45);
    });

    it("starts at strength 0 with no history", () => {
      expect(service.initialState()).toEqual(fresh);
    });
  });

  describe("step — PASS", () => {
    it("applies the calibration-boosted gain on the first planned day", () => {
      // κ(0) = 2.5, gain = 0.06·1.0·2.5·(1−0) = 0.15
      const next = service.step(fresh, true, "medium");
      expect(next.strength).toBeCloseTo(0.15, 10);
      expect(next.plannedDays).toBe(1);
      expect(next.consecutiveFails).toBe(0);
      expect(service.costFor(next, "medium", 7)).toBe(30); // 1 + 34·0.85 = 29.9
    });

    it("resets the consecutive-fail counter", () => {
      const failed: HabitState = { strength: -0.3, plannedDays: 3, consecutiveFails: 3 };
      expect(service.step(failed, true, "medium").consecutiveFails).toBe(0);
    });

    it("gains less as the habit approaches formation (fragility term)", () => {
      const early = service.step({ ...fresh, plannedDays: 20 }, true, "medium");
      const late = service.step(
        { strength: 0.9, plannedDays: 20, consecutiveFails: 0 },
        true,
        "medium",
      );
      expect(early.strength - 0).toBeGreaterThan(late.strength - 0.9);
    });

    it("caps strength at 1", () => {
      let state: HabitState = { strength: 0.9999, plannedDays: 99, consecutiveFails: 0 };
      for (let i = 0; i < 100; i++) state = service.step(state, true, "easy");
      expect(state.strength).toBeLessThanOrEqual(1);
    });

    it("easy goals gain faster than hard ones (difficulty multiplier)", () => {
      const easy = service.step(fresh, true, "easy");
      const hard = service.step(fresh, true, "hard");
      expect(easy.strength).toBeCloseTo(0.18, 10); // 0.06·1.2·2.5
      expect(hard.strength).toBeCloseTo(0.1275, 10); // 0.06·0.85·2.5
    });
  });

  describe("step — FAIL", () => {
    it("first-day fail on a fresh medium goal: 35 → 40 (docs §6.2)", () => {
      // loss = 0.06·2.0·2.5·1.7⁰·(1−0) = 0.30 → H = −0.30 → cost 35 + 15·0.30 = 39.5 → 40
      const next = service.step(fresh, false, "medium");
      expect(next.strength).toBeCloseTo(-0.3, 10);
      expect(next.consecutiveFails).toBe(1);
      expect(service.costFor(next, "medium", 7)).toBe(40);
    });

    it("two consecutive fails out of the gate ≈ cost 49 (docs §6.3)", () => {
      const afterOne = service.step(fresh, false, "medium");
      const afterTwo = service.step(afterOne, false, "medium");
      // loss = 0.06·2.0·2.35·1.7¹·(1.30) ≈ 0.6232 → H ≈ −0.9232
      expect(afterTwo.strength).toBeCloseTo(-0.92322, 4);
      expect(afterTwo.consecutiveFails).toBe(2);
      expect(service.costFor(afterTwo, "medium", 7)).toBe(49);
    });

    it("a pass after the early double-fail recovers to ≈45 (docs §6.3)", () => {
      const afterTwo = service.step(service.step(fresh, false, "medium"), false, "medium");
      const recovered = service.step(afterTwo, true, "medium");
      expect(service.costFor(recovered, "medium", 7)).toBe(45);
    });

    it("single lapse in a nearly-formed habit costs ~1 lock (docs §6.4, Lally)", () => {
      const formedish: HabitState = { strength: 0.9, plannedDays: 30, consecutiveFails: 0 };
      expect(service.costFor(formedish, "medium", 7)).toBe(4);
      const lapsed = service.step(formedish, false, "medium");
      expect(lapsed.strength).toBeCloseTo(0.888, 10);
      expect(service.costFor(lapsed, "medium", 7)).toBe(5);
    });

    it("escalation stops growing at maxEscalationCount", () => {
      const deepFail: HabitState = { strength: 0.5, plannedDays: 30, consecutiveFails: 10 };
      const atCap: HabitState = { strength: 0.5, plannedDays: 30, consecutiveFails: 4 };
      expect(service.step(deepFail, false, "medium").strength).toBeCloseTo(
        service.step(atCap, false, "medium").strength,
        10,
      );
    });

    it("floors strength at minStrength → cost caps at 50", () => {
      let state = fresh;
      for (let i = 0; i < 20; i++) state = service.step(state, false, "medium");
      expect(state.strength).toBe(-1);
      expect(service.costFor(state, "medium", 7)).toBe(50);
    });
  });

  describe("costFor mapping", () => {
    it("interpolates 1 … C0 for positive strength", () => {
      expect(
        service.costFor({ strength: 1, plannedDays: 0, consecutiveFails: 0 }, "medium", 7),
      ).toBe(1);
      expect(service.costFor(fresh, "medium", 7)).toBe(35);
      expect(
        service.costFor({ strength: 0.5, plannedDays: 0, consecutiveFails: 0 }, "medium", 7),
      ).toBe(18); // 1 + 34·0.5
    });

    it("interpolates C0 … 50 for negative strength", () => {
      expect(
        service.costFor({ strength: -0.5, plannedDays: 0, consecutiveFails: 0 }, "medium", 7),
      ).toBe(43); // 35 + 15·0.5 = 42.5 → 43
      expect(
        service.costFor({ strength: -1, plannedDays: 0, consecutiveFails: 0 }, "easy", 7),
      ).toBe(50);
    });

    it("scales with the weekly commitment: 7× full price, lighter targets cheaper (φ)", () => {
      // φ(T) = 1 − 0.5·(7−T)/6 at defaults.
      expect(service.initialCostFor("medium", 7)).toBe(35); // φ = 1
      expect(service.initialCostFor("medium", 4)).toBe(26); // φ = 0.75 → 26.25 → 26
      expect(service.initialCostFor("medium", 1)).toBe(18); // φ = 0.5 → 17.5 → 18
      expect(service.initialCostFor("easy", 1)).toBe(13); // 25·0.5 = 12.5 → 13
    });

    it("frequencyWeight 0 disables commitment pricing", () => {
      const config: LockFormulaConfig = { ...DEFAULT_LOCK_FORMULA_CONFIG, frequencyWeight: 0 };
      const flat = new LockCostService(config);
      expect(flat.initialCostFor("medium", 1)).toBe(35);
    });
  });


  describe("isFormed", () => {
    it("is true only at cost 1", () => {
      expect(service.isFormed(1)).toBe(true);
      expect(service.isFormed(2)).toBe(false);
    });
  });

  describe("formation-time simulation (docs §6.1)", () => {
    function daysToFormed(difficulty: "easy" | "medium" | "hard"): number {
      let state = service.initialState();
      for (let day = 1; day <= 365; day++) {
        state = service.step(state, true, difficulty);
        if (service.isFormed(service.costFor(state, difficulty, 7))) return day;
      }
      return Infinity;
    }

    it("medium all-pass forms in ~60 days (Lally median 66)", () => {
      const days = daysToFormed("medium");
      expect(days).toBeGreaterThanOrEqual(55);
      expect(days).toBeLessThanOrEqual(70);
    });

    it("easy forms in weeks, hard in months (Buyalskaya ordering)", () => {
      const easy = daysToFormed("easy");
      const medium = daysToFormed("medium");
      const hard = daysToFormed("hard");
      expect(easy).toBeLessThan(medium);
      expect(medium).toBeLessThan(hard);
      expect(easy).toBeGreaterThanOrEqual(30);
      expect(hard).toBeLessThanOrEqual(100);
    });
  });

  describe("configurability", () => {
    it("calibrationDays 0 disables the boost without dividing by zero", () => {
      const config: LockFormulaConfig = { ...DEFAULT_LOCK_FORMULA_CONFIG, calibrationDays: 0 };
      const flat = new LockCostService(config);
      expect(flat.step(fresh, true, "medium").strength).toBeCloseTo(0.06, 10);
    });

    it("uses the injected constants (gainRate)", () => {
      const config: LockFormulaConfig = { ...DEFAULT_LOCK_FORMULA_CONFIG, gainRate: 0.12 };
      const doubled = new LockCostService(config);
      expect(doubled.step(fresh, true, "medium").strength).toBeCloseTo(0.3, 10);
    });

    it("failEscalation 1 makes consecutive fails non-escalating", () => {
      const config: LockFormulaConfig = { ...DEFAULT_LOCK_FORMULA_CONFIG, failEscalation: 1 };
      const gentle = new LockCostService(config);
      const s1 = gentle.step(
        { strength: 0.5, plannedDays: 20, consecutiveFails: 0 },
        false,
        "medium",
      );
      const s2 = gentle.step(
        { strength: 0.5, plannedDays: 20, consecutiveFails: 5 },
        false,
        "medium",
      );
      expect(s1.strength).toBeCloseTo(s2.strength, 10);
    });
  });
});
