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
 *
 * No difficulty tier (removed 2026-07-16): C0 = 20 uniformly. Because
 * minStrength = -1 (the floor), the negative branch's base cost can never
 * exceed 2·C0 − 1 = 39 at defaults — the 50 cap literally cannot bind unless
 * a dev-mode override widens minStrength. That's a real, intentional
 * consequence of a lower, uniform C0: the forced-focus ceiling is gentler
 * than the old per-difficulty tiers (up to 89 for a fresh "hard" goal).
 */
describe("LockCostService", () => {
  const service = new LockCostService();
  const fresh: HabitState = { strength: 0, plannedDays: 0, consecutiveFails: 0 };

  describe("initialCostFor / initialState", () => {
    it("uses the config's uniform initial cost, scaled by weekly commitment", () => {
      expect(service.initialCostFor(7)).toBe(20); // φ(7) = 1
      expect(service.initialCostFor(4)).toBe(15); // φ(4) = 0.75 → 15
      expect(service.initialCostFor(1)).toBe(10); // φ(1) = 0.5 → 10
    });

    it("starts at strength 0 with no history", () => {
      expect(service.initialState()).toEqual(fresh);
    });
  });

  describe("step — PASS", () => {
    it("applies the calibration-boosted gain on the first planned day", () => {
      // κ(0) = 2.5, gain = 0.06·2.5·(1−0) = 0.15
      const next = service.step(fresh, true);
      expect(next.strength).toBeCloseTo(0.15, 10);
      expect(next.plannedDays).toBe(1);
      expect(next.consecutiveFails).toBe(0);
      expect(service.costFor(next, 7)).toBe(17); // 1 + 19·0.85 = 17.15 → 17
    });

    it("resets the consecutive-fail counter", () => {
      const failed: HabitState = { strength: -0.3, plannedDays: 3, consecutiveFails: 3 };
      expect(service.step(failed, true).consecutiveFails).toBe(0);
    });

    it("gains less as the habit approaches formation (fragility term)", () => {
      const early = service.step({ ...fresh, plannedDays: 20 }, true);
      const late = service.step({ strength: 0.9, plannedDays: 20, consecutiveFails: 0 }, true);
      expect(early.strength - 0).toBeGreaterThan(late.strength - 0.9);
    });

    it("caps strength at 1", () => {
      let state: HabitState = { strength: 0.9999, plannedDays: 99, consecutiveFails: 0 };
      for (let i = 0; i < 100; i++) state = service.step(state, true);
      expect(state.strength).toBeLessThanOrEqual(1);
    });
  });

  describe("step — FAIL", () => {
    it("first-day fail on a fresh goal: 20 → 26 (docs §6.2)", () => {
      // loss = 0.06·2.0·2.5·1.7⁰·(1−0) = 0.30 → H = −0.30 → cost 20 + 19·0.30 = 25.7 → 26
      const next = service.step(fresh, false);
      expect(next.strength).toBeCloseTo(-0.3, 10);
      expect(next.consecutiveFails).toBe(1);
      expect(service.costFor(next, 7)).toBe(26);
    });

    it("a lighter weekly commitment prices the same miss cheaper (φ), never erasing it", () => {
      const missed = service.step(fresh, false);
      expect(service.costFor(missed, 7)).toBe(26); // base 25.7 · φ(7)=1
      expect(service.costFor(missed, 3)).toBe(17); // base 25.7 · φ(3)=0.6667 → 17.13 → 17
    });

    it("two consecutive fails out of the gate — escalation visibly compounds (docs §6.3)", () => {
      const afterOne = service.step(fresh, false);
      const afterTwo = service.step(afterOne, false);
      // loss = 0.06·2.0·2.35·1.7¹·(1.30) ≈ 0.6232 → H ≈ −0.9232
      expect(afterTwo.strength).toBeCloseTo(-0.92322, 4);
      expect(afterTwo.consecutiveFails).toBe(2);
      // base = 20 + 19·0.92322 = 37.54 → 38 — well short of the 50 cap at C0=20.
      expect(service.costFor(afterTwo, 7)).toBe(38);
    });

    it("recovery from an early double-fail is earned, one pass at a time", () => {
      const afterTwo = service.step(service.step(fresh, false), false);
      const pass1 = service.step(afterTwo, true);
      const pass2 = service.step(pass1, true);
      // Strength climbs every pass, and cost falls every pass — no cap to
      // "surface from" at C0=20, just steady, earned recovery.
      expect(pass1.strength).toBeGreaterThan(afterTwo.strength);
      expect(pass2.strength).toBeGreaterThan(pass1.strength);
      expect(service.costFor(pass2, 7)).toBeLessThan(service.costFor(pass1, 7));
      expect(service.costFor(pass1, 7)).toBeLessThan(service.costFor(afterTwo, 7));
    });

    it("a lapse in a well-formed habit is nearly (sometimes exactly) free (docs §6.4, Lally)", () => {
      const formedish: HabitState = { strength: 0.95, plannedDays: 30, consecutiveFails: 0 };
      const before = service.costFor(formedish, 7);
      const lapsed = service.step(formedish, false);
      const after = service.costFor(lapsed, 7);
      expect(lapsed.strength).toBeLessThan(formedish.strength);
      expect(after - before).toBeLessThanOrEqual(1); // rounds away to nothing, or at most 1 key
    });

    it("mid-journey: a pass and a fail move the cost by about one key each way (docs §6.5)", () => {
      const mid: HabitState = { strength: 0.5, plannedDays: 30, consecutiveFails: 0 };
      expect(service.costFor(mid, 7)).toBe(11); // 1 + 19·0.5 = 10.5 → 11
      const passed = service.step(mid, true);
      const failed = service.step(mid, false);
      expect(service.costFor(passed, 7)).toBe(10);
      expect(service.costFor(failed, 7)).toBe(12);
    });

    it("escalation stops growing at maxEscalationCount", () => {
      const deepFail: HabitState = { strength: 0.5, plannedDays: 30, consecutiveFails: 10 };
      const atCap: HabitState = { strength: 0.5, plannedDays: 30, consecutiveFails: 4 };
      expect(service.step(deepFail, false).strength).toBeCloseTo(
        service.step(atCap, false).strength,
        10,
      );
    });

    it("floors strength at minStrength — cost saturates at 2·C0−1, never reaching the 50 cap", () => {
      let state = fresh;
      for (let i = 0; i < 20; i++) state = service.step(state, false);
      expect(state.strength).toBe(-1);
      expect(service.costFor(state, 7)).toBe(39); // 20 + 19·1 = 39
    });
  });

  describe("costFor mapping", () => {
    it("interpolates 1 … C0 for positive strength", () => {
      expect(service.costFor({ strength: 1, plannedDays: 0, consecutiveFails: 0 }, 7)).toBe(1);
      expect(service.costFor(fresh, 7)).toBe(20);
      expect(service.costFor({ strength: 0.5, plannedDays: 0, consecutiveFails: 0 }, 7)).toBe(11);
    });

    it("continues past C0 on the same slope for negative strength", () => {
      expect(service.costFor({ strength: -0.25, plannedDays: 0, consecutiveFails: 0 }, 7)).toBe(
        25,
      ); // 20 + 19·0.25 = 24.75 → 25
      expect(service.costFor({ strength: -1, plannedDays: 0, consecutiveFails: 0 }, 7)).toBe(39); // the floor, 2·C0−1
    });

    it("the 50 cap still clamps if a dev-mode override widens minStrength", () => {
      const config: LockFormulaConfig = { ...DEFAULT_LOCK_FORMULA_CONFIG, minStrength: -3 };
      const widened = new LockCostService(config);
      // base = 20 + 19·3 = 77 → clamped to 50.
      expect(widened.costFor({ strength: -3, plannedDays: 0, consecutiveFails: 0 }, 7)).toBe(50);
    });

    it("scales with the weekly commitment: 7× full price, lighter targets cheaper (φ)", () => {
      // φ(T) = 1 − 0.5·(7−T)/6 at defaults.
      expect(service.initialCostFor(7)).toBe(20); // φ = 1
      expect(service.initialCostFor(4)).toBe(15); // φ = 0.75 → 15
      expect(service.initialCostFor(1)).toBe(10); // φ = 0.5 → 10
    });

    it("frequencyWeight 0 disables commitment pricing", () => {
      const config: LockFormulaConfig = { ...DEFAULT_LOCK_FORMULA_CONFIG, frequencyWeight: 0 };
      const flat = new LockCostService(config);
      expect(flat.initialCostFor(1)).toBe(20);
    });
  });

  describe("isFormed", () => {
    it("is true only at cost 1", () => {
      expect(service.isFormed(1)).toBe(true);
      expect(service.isFormed(2)).toBe(false);
    });
  });

  describe("formation-time simulation (docs §6.1)", () => {
    function daysToFormed(): number {
      let state = service.initialState();
      for (let day = 1; day <= 365; day++) {
        state = service.step(state, true);
        if (service.isFormed(service.costFor(state, 7))) return day;
      }
      return Infinity;
    }

    it("all-pass forms in ~50 days — a bit faster than the old per-difficulty C0=35 medium case (~60)", () => {
      // Cost only ROUNDS to the "formed" value of 1 once (C0−1)(1−H) ≤ 0.5.
      // A lower, uniform C0=20 means fewer cost ticks between 1 and C0, so
      // that last-mile rounding threshold (1−H ≤ 0.5/19 ≈ 0.026) is crossed
      // sooner than the old medium tier's (0.5/34 ≈ 0.015) — a real,
      // intentional side effect of dropping the difficulty tiers, still
      // consistent with Lally's range (18–254 days, median 66).
      const days = daysToFormed();
      expect(days).toBeGreaterThanOrEqual(45);
      expect(days).toBeLessThanOrEqual(55);
    });
  });

  describe("decay (disuse, docs §3.6)", () => {
    it("drifts a formed-ish (positive) strength DOWN toward neutral, not up toward the floor", () => {
      const strong: HabitState = { strength: 0.5, plannedDays: 30, consecutiveFails: 0 };
      const decayed = service.decay(strong, 10);
      // (1 - 0.03)^10 ≈ 0.7374
      expect(decayed.strength).toBeCloseTo(0.5 * Math.pow(0.97, 10), 10);
      expect(decayed.strength).toBeLessThan(strong.strength);
      expect(decayed.strength).toBeGreaterThan(0);
    });

    it("drifts a dug-in-a-hole (negative) strength UP toward neutral — partial forgiveness", () => {
      const struggling: HabitState = { strength: -0.5, plannedDays: 30, consecutiveFails: 3 };
      const decayed = service.decay(struggling, 10);
      expect(decayed.strength).toBeCloseTo(-0.5 * Math.pow(0.97, 10), 10);
      expect(decayed.strength).toBeGreaterThan(struggling.strength);
      expect(decayed.strength).toBeLessThan(0);
    });

    it("resets the consecutive-fail streak but never advances plannedDays", () => {
      const state: HabitState = { strength: -0.3, plannedDays: 12, consecutiveFails: 3 };
      const decayed = service.decay(state, 5);
      expect(decayed.consecutiveFails).toBe(0);
      expect(decayed.plannedDays).toBe(12);
    });

    it("is a no-op for zero or negative days", () => {
      const state: HabitState = { strength: 0.4, plannedDays: 5, consecutiveFails: 1 };
      expect(service.decay(state, 0)).toEqual(state);
      expect(service.decay(state, -3)).toEqual(state);
    });

    it("leaves exactly-neutral strength at neutral (nothing to decay toward)", () => {
      const neutral: HabitState = { strength: 0, plannedDays: 0, consecutiveFails: 0 };
      expect(service.decay(neutral, 30).strength).toBe(0);
    });

    it("decayRate 0 disables decay entirely", () => {
      const config: LockFormulaConfig = { ...DEFAULT_LOCK_FORMULA_CONFIG, decayRate: 0 };
      const flat = new LockCostService(config);
      const state: HabitState = { strength: 0.5, plannedDays: 10, consecutiveFails: 0 };
      expect(flat.decay(state, 30).strength).toBe(0.5);
    });
  });

  describe("configurability", () => {
    it("calibrationDays 0 disables the boost without dividing by zero", () => {
      const config: LockFormulaConfig = { ...DEFAULT_LOCK_FORMULA_CONFIG, calibrationDays: 0 };
      const flat = new LockCostService(config);
      expect(flat.step(fresh, true).strength).toBeCloseTo(0.06, 10);
    });

    it("uses the injected constants (gainRate)", () => {
      const config: LockFormulaConfig = { ...DEFAULT_LOCK_FORMULA_CONFIG, gainRate: 0.12 };
      const doubled = new LockCostService(config);
      expect(doubled.step(fresh, true).strength).toBeCloseTo(0.3, 10);
    });

    it("failEscalation 1 makes consecutive fails non-escalating", () => {
      const config: LockFormulaConfig = { ...DEFAULT_LOCK_FORMULA_CONFIG, failEscalation: 1 };
      const gentle = new LockCostService(config);
      const s1 = gentle.step({ strength: 0.5, plannedDays: 20, consecutiveFails: 0 }, false);
      const s2 = gentle.step({ strength: 0.5, plannedDays: 20, consecutiveFails: 5 }, false);
      expect(s1.strength).toBeCloseTo(s2.strength, 10);
    });
  });
});
